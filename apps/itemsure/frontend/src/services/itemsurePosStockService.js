import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';
import { mergeTakeResults, takeWindows } from '../utils/itemsurePosStock.js';
import { syncCloverSales } from './itemsurePosService.js';

// Taking Clover sales off stock. The database does the math and the stock changes
// (itemsure.take_pos_sales), so tapping twice or on two phones never takes sales twice.

const missingFunction = (error) => error && (error.code === 'PGRST202' || /could not find the function/i.test(error.message || ''));

/** { missing } until the database update is applied, else { connected, on, location_id, location_name, stock_through, last_run }. */
export async function getPosStockStatus(organizationId) {
  const { data, error } = await itemsure.rpc('pos_stock_status', { p_organization: organizationId });
  if (missingFunction(error)) return { missing: true };
  return assertOk({ data, error }, 'sales to stock') || { connected: false, on: false };
}

export async function setPosStock(organizationId, on) {
  return assertOk(await itemsure.rpc('set_pos_stock', { p_organization: organizationId, p_on: on }), 'change sales to stock');
}

/** Spot ids in the order sales are taken from (first = where drinks are served from). */
export async function listSalesSpots(locationId) {
  const rows = assertOk(
    await itemsure.from('pos_sales_spots').select('storage_area_id, position').eq('location_id', locationId).order('position'),
    'spot order',
  ) || [];
  return rows.map((r) => r.storage_area_id);
}

export async function setSalesSpots(locationId, areaIds) {
  assertOk(await itemsure.rpc('set_pos_sales_spots', { p_location: locationId, p_areas: areaIds }), 'save the spot order');
}

/**
 * Brings in new Clover sales, then takes every finished hour off stock, window by window.
 * Returns { taken, counted, notSetUp, short: [...], missing: [...], to, nothing }.
 */
export async function takeSalesOffStock(organizationId) {
  const status = await getPosStockStatus(organizationId);
  if (status.missing) throw new Error('Taking sales off stock needs a database update first.');
  if (!status.on) throw new Error('Taking sales off stock is switched off.');
  const windows = takeWindows(status.stock_through);
  if (!windows.length) return { ...mergeTakeResults([]), nothing: true, next: status.stock_through };
  const results = [];
  for (const [from, to] of windows) {
    await syncCloverSales(organizationId, from, to);
    results.push(assertOk(await itemsure.rpc('take_pos_sales', { p_organization: organizationId, p_through: to }), 'take sales off stock'));
  }
  return { ...mergeTakeResults(results), nothing: results.every((r) => r?.nothing) };
}
