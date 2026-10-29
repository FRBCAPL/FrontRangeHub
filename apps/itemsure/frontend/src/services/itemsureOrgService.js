import itemsure from './itemsureClient.js';
import { assertOk, readableDatabaseError } from '../utils/itemsureErrors.js';
import { requiredText, slugify, suffixedSlug } from '../utils/itemsureText.js';
import { ROLE_LABELS } from '../data/itemsureConstants.js';
import { ALL_FEATURES_ON, FEATURES, readFeatures } from '../utils/itemsureFeatures.js';

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

  const memberships = (memberRows.data || [])
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

  const preferred = readActiveOrg(userId);
  const active = memberships.find((m) => m.organizationId === preferred) || memberships[0] || null;

  let permissions = [];
  let industryName = '';
  let features = ALL_FEATURES_ON;
  let featuresSaved = false;
  if (active) {
    const [grants, industry, featureRow] = await Promise.all([
      itemsure.from('role_permissions').select('permission_code').eq('role_code', active.roleCode),
      itemsure.from('industry_types').select('name').eq('code', active.industryType).maybeSingle(),
      // Kept separate so a database without the features column still loads.
      itemsure.from('organizations').select('features').eq('id', active.organizationId).maybeSingle(),
    ]);
    permissions = (grants.data || []).map((g) => g.permission_code);
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
    organization: active
      ? { ...active, id: active.organizationId, name: active.organizationName, industryName, features, featuresSaved }
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

/** Saves all four switches at once. Needs organization.update (owner or administrator). */
export async function saveFeatures(organizationId, features) {
  const clean = Object.fromEntries(FEATURES.map(({ key }) => [key, features[key] === true]));
  const data = assertOk(
    await itemsure.from('organizations').update({ features: clean }).eq('id', organizationId).select('id'),
    'save settings',
  );
  if (!data?.length) throw new Error('Only the owner or an administrator can change these settings.');
}

export async function updateProfileName(userId, fullName) {
  const name = String(fullName || '').trim();
  if (name.length > 120) throw new Error('Keep your name under 120 characters.');
  assertOk(await itemsure.from('profiles').update({ full_name: name }).eq('id', userId), 'update profile');
}
