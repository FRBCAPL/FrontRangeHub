import itemsure from './itemsureClient.js';
import { assertOk, readableDatabaseError } from '../utils/itemsureErrors.js';
import { optionalText, requiredText, slugify, suffixedSlug } from '../utils/itemsureText.js';
import { ROLE_LABELS } from '../data/itemsureConstants.js';
import { ALL_FEATURES_ON, FEATURES, readFeatures } from '../utils/itemsureFeatures.js';
import { effectivePermissions } from '../utils/itemsureRolePermissions.js';

const ACTIVE_ORG_KEY = 'itemsure-active-organization';

function readActiveOrg(userId) {
  try {
    return window.localStorage.getItem(`${ACTIVE_ORG_KEY}:${userId}`) || '';
  } catch {
    return '';
  }
}

export function rememberActiveOrg(userId, organizationId) {
  try {
    window.localStorage.setItem(`${ACTIVE_ORG_KEY}:${userId}`, organizationId);
  } catch {
    // storage unavailable; the first membership is used instead
  }
}

function one(value) {
  return Array.isArray(value) ? value[0] || null : value || null;
}

/** Ids of archived businesses among `ids`, or null when the database has no archive column yet. */
async function loadArchivedIds(ids) {
  if (!ids.length) return new Set();
  const { data, error } = await itemsure.from('organizations').select('id, archived_at').in('id', ids);
  if (error) return null;
  return new Set((data || []).filter((row) => row.archived_at).map((row) => row.id));
}

/**
 * Everything the shell needs for a signed-in person: profile, memberships, the
 * active organization, and that membership's permissions. RLS decides what is
 * visible; the active organization choice is only a preference.
 */
export async function loadWorkspace(user) {
  const userId = user.id;
  let profile = await itemsure.from('profiles').select('full_name, email').eq('id', userId).maybeSingle();
  if (!profile.error && !profile.data) {
    // Logins are shared with other apps in this project.
    await itemsure.rpc('ensure_profile');
    profile = await itemsure.from('profiles').select('full_name, email').eq('id', userId).maybeSingle();
  }

  const memberRows = await itemsure
    .from('organization_memberships')
    .select('organization_id, role_code, location_scope, organizations(id, name, slug, industry_type)')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (memberRows.error) {
    return { databaseMessage: readableDatabaseError(memberRows.error), memberships: [], organization: null, permissions: [] };
  }

  const allMemberships = (memberRows.data || [])
    .map((row) => {
      const org = one(row.organizations);
      if (!org) return null;
      return {
        organizationId: row.organization_id,
        organizationName: org.name,
        slug: org.slug,
        industryType: org.industry_type,
        roleCode: row.role_code,
        roleName: ROLE_LABELS[row.role_code] || row.role_code,
        locationScope: row.location_scope === 'restricted' ? 'restricted' : 'all',
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.organizationName.localeCompare(b.organizationName));

  // Kept separate so a database without archived_at still loads (nothing archived).
  const archivedIds = await loadArchivedIds(allMemberships.map((m) => m.organizationId));
  const archiveAvailable = archivedIds !== null;
  const memberships = allMemberships.filter((m) => !archivedIds?.has(m.organizationId));
  // Only the owner can restore, so only owners see their archived businesses.
  const archived = allMemberships.filter((m) => archivedIds?.has(m.organizationId) && m.roleCode === 'owner');

  const preferred = readActiveOrg(userId);
  const active = memberships.find((m) => m.organizationId === preferred) || memberships[0] || null;

  let permissions = [];
  let industryName = '';
  let features = ALL_FEATURES_ON;
  let featuresSaved = false;
  let variantLabel = '';
  let detailsAvailable = false;
  if (active) {
    const [grants, choices, industry, featureRow, labelRow] = await Promise.all([
      itemsure.from('role_permissions').select('permission_code').eq('role_code', active.roleCode),
      // This business's role settings; missing on older databases, which means defaults.
      itemsure
        .from('organization_role_permissions')
        .select('permission_code, granted')
        .eq('organization_id', active.organizationId)
        .eq('role_code', active.roleCode),
      itemsure.from('industry_types').select('name').eq('code', active.industryType).maybeSingle(),
      // Kept separate so a database without the features column still loads.
      itemsure.from('organizations').select('features').eq('id', active.organizationId).maybeSingle(),
      // Brand and details: missing until that database update is applied.
      itemsure.from('organizations').select('variant_label').eq('id', active.organizationId).maybeSingle(),
    ]);
    if (!labelRow.error && labelRow.data) {
      detailsAvailable = true;
      variantLabel = labelRow.data.variant_label || '';
    }
    permissions = effectivePermissions(
      (grants.data || []).map((g) => g.permission_code),
      choices.error ? [] : choices.data || [],
    );
    industryName = industry.data?.name || active.industryType;
    if (!featureRow.error && featureRow.data) {
      features = readFeatures(featureRow.data.features);
      featuresSaved = true;
    }
  }

  return {
    databaseMessage: null,
    fullName: profile.data?.full_name || '',
    email: profile.data?.email || user.email || '',
    memberships,
    archived,
    archiveAvailable,
    organization: active
      ? { ...active, id: active.organizationId, name: active.organizationName, industryName, features, featuresSaved, variantLabel, detailsAvailable }
      : null,
    permissions,
  };
}

export async function listIndustries() {
  return assertOk(
    await itemsure.from('industry_types').select('code, name, description').order('sort_order'),
    'industries',
  ) || [];
}

export async function createOrganization(userId, { name, industryType }) {
  const cleanName = requiredText(name, 'business name', 120);
  if (!industryType) throw new Error('Choose an industry.');
  await itemsure.rpc('ensure_profile');

  const base = slugify(cleanName);
  let lastError = null;
  for (const slug of [base, suffixedSlug(base)]) {
    // The id is chosen here because the creator cannot read the row back until
    // the owner membership trigger has committed.
    const id = crypto.randomUUID();
    const { error } = await itemsure.from('organizations').insert({ id, name: cleanName, slug, industry_type: industryType });
    if (!error) {
      rememberActiveOrg(userId, id);
      return id;
    }
    lastError = error;
    if (error.code !== '23505') break;
  }
  console.error('[itemsure] create organization', lastError);
  throw new Error(readableDatabaseError(lastError));
}

export async function renameOrganization(organizationId, name) {
  const cleanName = requiredText(name, 'business name', 120);
  const data = assertOk(
    await itemsure.from('organizations').update({ name: cleanName }).eq('id', organizationId).select('id'),
    'rename organization',
  );
  if (!data?.length) throw new Error('You do not have permission to rename this organization.');
}

/** Archive hides the business for everyone in it; restore brings it back. Owner only; no data is removed. */
export async function setOrganizationArchived(organizationId, archived) {
  const data = assertOk(
    await itemsure
      .from('organizations')
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq('id', organizationId)
      .select('id'),
    archived ? 'archive business' : 'restore business',
  );
  if (!data?.length) throw new Error('Only the owner can archive or restore this business.');
}

/** Saves the given switches (default: all) at once. Needs organization.update (owner or administrator). */
export async function saveFeatures(organizationId, features, list = FEATURES) {
  const clean = Object.fromEntries(list.map(({ key }) => [key, features[key] === true]));
  const data = assertOk(
    await itemsure.from('organizations').update({ features: clean }).eq('id', organizationId).select('id'),
    'save settings',
  );
  if (!data?.length) throw new Error('Only the owner or an administrator can change these settings.');
}

/** What the business calls the second item detail; blank goes back to the industry default. */
export async function saveVariantLabel(organizationId, label) {
  const clean = optionalText(label, 'name', 30);
  const data = assertOk(
    await itemsure.from('organizations').update({ variant_label: clean }).eq('id', organizationId).select('id'),
    'save detail name',
  );
  if (!data?.length) throw new Error('Only the owner or an administrator can change these settings.');
}

export async function updateProfileName(userId, fullName) {
  const name = String(fullName || '').trim();
  if (name.length > 120) throw new Error('Keep your name under 120 characters.');
  assertOk(await itemsure.from('profiles').update({ full_name: name }).eq('id', userId), 'update profile');
}
