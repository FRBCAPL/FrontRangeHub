/**
 * Splits place options for a picker: `loose` are shown as they are (no group, e.g. a site
 * without spots); `groups` are [{ name, options }] in their original order, with the
 * "no specific spot" option last in each group.
 */
export function groupPlaceOptions(options) {
  const loose = [];
  const byName = new Map();
  for (const o of options) {
    if (!o.group) {
      loose.push(o);
      continue;
    }
    if (!byName.has(o.group)) byName.set(o.group, []);
    byName.get(o.group).push(o);
  }
  const groups = [...byName].map(([name, list]) => ({
    name,
    options: [...list.filter((o) => !o.loose), ...list.filter((o) => o.loose)],
  }));
  return { loose, groups };
}
