export function parseUsaplDivisionIds(value) {
  if (Array.isArray(value)) return value.map((id) => String(id).trim()).filter(Boolean);
  return String(value || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

export function joinUsaplDivisionIds(ids) {
  return parseUsaplDivisionIds(ids).join(',');
}

export function labelUsaplDivisions(value, divisions = []) {
  const ids = parseUsaplDivisionIds(value);
  if (!ids.length) return '';
  const names = Object.fromEntries(
    divisions.map((division) => [division.id, division.shortName || division.name || division.id])
  );
  return ids.map((id) => names[id] || id).join(', ');
}
