import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';
import { optionalText, requiredText } from '../utils/itemsureText.js';
import { TIMEZONES } from '../data/itemsureConstants.js';
import { site } from '../data/itemsureTerms.js';

export async function listLocations(organizationId) {
  const [locations, areas] = await Promise.all([
    itemsure
      .from('locations')
      .select('id, name, address_line1, address_line2, city, region, postal_code, country, timezone, is_active')
      .eq('organization_id', organizationId)
      .order('name'),
    itemsure
      .from('inventory_storage_areas')
      .select('id, location_id, name, description, is_active, sort_order')
      .eq('organization_id', organizationId)
      .order('sort_order')
      .order('name'),
  ]);
  const locationRows = assertOk(locations, 'locations') || [];
  const areaRows = assertOk(areas, 'storage areas') || [];
  return locationRows.map((location) => ({
    ...location,
    storageAreas: areaRows.filter((area) => area.location_id === location.id),
  }));
}

function locationFields(form, keepTimezone) {
  const timezone = TIMEZONES.includes(form.timezone) || form.timezone === keepTimezone ? form.timezone : 'UTC';
  return {
    name: requiredText(form.name, `${site} name`, 120),
    address_line1: optionalText(form.address_line1, 'address', 160) || '',
    address_line2: optionalText(form.address_line2, 'address line 2', 160) || '',
    city: optionalText(form.city, 'city', 80) || '',
    region: optionalText(form.region, 'state or region', 80) || '',
    postal_code: optionalText(form.postal_code, 'postal code', 20) || '',
    country: optionalText(form.country, 'country', 80) || '',
    timezone,
  };
}

export async function createLocation(organizationId, form) {
  const row = { organization_id: organizationId, ...locationFields(form) };
  assertOk(await itemsure.from('locations').insert(row), 'create location');
}

export async function updateLocation(organizationId, location, form) {
  const data = assertOk(
    await itemsure
      .from('locations')
      .update(locationFields(form, location.timezone))
      .eq('id', location.id)
      .eq('organization_id', organizationId)
      .select('id'),
    'update location',
  );
  if (!data?.length) throw new Error(`You do not have permission to change this ${site}.`);
}

export async function setLocationActive(organizationId, locationId, isActive) {
  const data = assertOk(
    await itemsure.from('locations').update({ is_active: isActive }).eq('id', locationId).eq('organization_id', organizationId).select('id'),
    'update location',
  );
  if (!data?.length) throw new Error(`You do not have permission to change this ${site}.`);
}

function areaFields(form) {
  return {
    name: requiredText(form.name, 'spot name', 120),
    description: optionalText(form.description, 'description', 400) || '',
  };
}

export async function createStorageArea(organizationId, locationId, form) {
  const row = { organization_id: organizationId, location_id: locationId, ...areaFields(form) };
  assertOk(await itemsure.from('inventory_storage_areas').insert(row), 'create storage area');
}

export async function updateStorageArea(organizationId, areaId, form) {
  const data = assertOk(
    await itemsure
      .from('inventory_storage_areas')
      .update(areaFields(form))
      .eq('id', areaId)
      .eq('organization_id', organizationId)
      .select('id'),
    'update storage area',
  );
  if (!data?.length) throw new Error('You do not have permission to change this spot.');
}

export async function setStorageAreaActive(organizationId, areaId, isActive) {
  const data = assertOk(
    await itemsure
      .from('inventory_storage_areas')
      .update({ is_active: isActive })
      .eq('id', areaId)
      .eq('organization_id', organizationId)
      .select('id'),
    'update storage area',
  );
  if (!data?.length) throw new Error('You do not have permission to change this spot.');
}
