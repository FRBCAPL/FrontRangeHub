import { parseUsaplFormat } from './usaplFormat.js';

export const USAPL_FARGO_LEAGUE_ID = 'af6f5e01-113d-4453-aded-b117017af2dd';

const UUID = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

export const USAPL_FARGO_DIVISION_IDS = {
  'nay-nays': 'acf783b3-6e91-47c2-93b7-b3d501825058,81f787f9-0437-4055-bc50-b3d501845b9c',
  'wed-13861-13061': '2aef836f-8ce3-4218-9f61-b49f017bdf93,a225944f-82ca-4d85-b193-b4a1012e25ca',
};

function extractUuid(value) {
  const match = String(value || '').match(UUID);
  return match ? match[0] : '';
}

export function parseUsaplFargoIds(value) {
  const raw = String(value || '').trim();
  if (!raw) return [];

  if (/divisionId=/i.test(raw) || /^https?:/i.test(raw)) {
    try {
      const href = raw.startsWith('http') ? raw : `https://lms.fargorate.com/?${raw.replace(/^[?&]/, '')}`;
      const url = new URL(href);
      const fromQuery = extractUuid(url.searchParams.get('divisionId') || '');
      if (fromQuery) return [fromQuery];
    } catch {
      const fallback = extractUuid(raw);
      return fallback ? [fallback] : [];
    }
  }

  return raw
    .split(/[,;\n]+/)
    .map((part) => extractUuid(part))
    .filter(Boolean);
}

export function joinUsaplFargoIds(values) {
  const ids = [];
  (Array.isArray(values) ? values : [values]).forEach((value) => {
    parseUsaplFargoIds(value).forEach((id) => {
      if (!ids.includes(id)) ids.push(id);
    });
  });
  return ids.join(',');
}

export function usaplFargoDivisionIds(division) {
  const custom = parseUsaplFargoIds(division?.fargoDivisionId);
  if (custom.length) return custom;
  return parseUsaplFargoIds(USAPL_FARGO_DIVISION_IDS[division?.id]);
}

export function usaplPublicReportUrlForId(divisionId) {
  const id = extractUuid(divisionId);
  if (!id) return '';
  return `https://lms.fargorate.com/PublicReport/LeagueReports?leagueId=${USAPL_FARGO_LEAGUE_ID}&divisionId=${id}`;
}

export function usaplPublicReportEntries(division) {
  const ids = usaplFargoDivisionIds(division);
  if (!ids.length) return [];
  const parsed = parseUsaplFormat(division?.format);
  const labels = parsed.playType === 'double'
    ? [
      parsed.formatA === 'Other' ? (parsed.formatOtherA || 'Format 1') : parsed.formatA,
      parsed.formatB === 'Other' ? (parsed.formatOtherB || 'Format 2') : parsed.formatB,
    ]
    : ['Standings'];
  return ids.map((id, index) => ({
    id,
    label: labels[index] || `Report ${index + 1}`,
    src: usaplPublicReportUrlForId(id),
  }));
}

export function usaplPublicReportUrl(division) {
  return usaplPublicReportEntries(division)[0]?.src || '';
}

export const USAPL_REPORT_HEADING = 'Team & individual stats';
export const USAPL_REPORT_BLURB = 'Standings, player stats, and weekly results.';

export function usaplReportHeading(division) {
  return String(division?.reportHeading || '').trim() || USAPL_REPORT_HEADING;
}

export function usaplReportBlurb(division) {
  const custom = String(division?.reportBlurb || '').trim();
  if (custom) return custom;
  return USAPL_REPORT_BLURB;
}

export function usaplScheduleImageUrl(division) {
  return String(division?.scheduleImageUrl || '').trim();
}
