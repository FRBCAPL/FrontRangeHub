import { USAPL_DEFAULT_FARGO_CAP } from './usaplDivisions.js';

export function usaplFargoCapValue(division) {
  const cap = Number(division?.combinedFargoCap);
  return Number.isFinite(cap) && cap > 0 ? cap : USAPL_DEFAULT_FARGO_CAP;
}

export function usaplFargoCapSummary(cap) {
  const n = Number(cap) || USAPL_DEFAULT_FARGO_CAP;
  return `Over ${n} combined, teams still play. Weekly: 1 penalty point per point over. Nationals: 2 per point over.`;
}

export function isUsaplFargoCapNote(line) {
  const text = String(line || '').trim().toLowerCase();
  if (!text) return false;
  return (
    /combined fargorate cap/.test(text)
    || /penalty points are assessed/.test(text)
    || /penalty point for each/.test(text)
    || /national tournament play/.test(text)
  );
}

export function stripUsaplFargoCapNotes(notes) {
  const lines = Array.isArray(notes) ? notes : String(notes || '').split('\n');
  return lines.map((line) => String(line || '').trim()).filter((line) => line && !isUsaplFargoCapNote(line));
}
