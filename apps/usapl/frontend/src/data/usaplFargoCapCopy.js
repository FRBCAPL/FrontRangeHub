import { USAPL_DEFAULT_FARGO_CAP } from './usaplDivisions.js';

export function usaplFargoCapValue(division) {
  const cap = Number(division?.combinedFargoCap);
  return Number.isFinite(cap) && cap > 0 ? cap : USAPL_DEFAULT_FARGO_CAP;
}

export function usaplFargoCapLines(cap) {
  const n = Number(cap) || USAPL_DEFAULT_FARGO_CAP;
  return [
    `If a team goes over the ${n} combined FargoRate cap, they are not disqualified.`,
    'They may still play, but penalty points are assessed.',
    'Weekly play: 1 penalty point for each 1 point over the cap.',
    'USAPL National Tournament play: 2 points for each 1 point over the cap.',
  ];
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
