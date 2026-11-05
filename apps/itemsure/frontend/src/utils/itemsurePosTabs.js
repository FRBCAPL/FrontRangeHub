// Settings → Point of sale tabs, in the order people set things up. Links elsewhere use
// posTabPath('pours') etc. so they land on the right tab.

export const POS_SETTINGS_PATH = '/settings/pos';

export const POS_TABS = [
  { key: 'left', label: "What's left" },
  { key: 'buttons', label: '1. Clover buttons' },
  { key: 'pours', label: '2. Pour sizes' },
  { key: 'addons', label: '3. Add-ons' },
  { key: 'stock', label: '4. Stock' },
  { key: 'connection', label: 'Connection' },
];

/** Path under the ItemSure base for one tab, e.g. posTabPath('/itemsure', 'pours'). */
export function posTabPath(base, tab) {
  return `${base}${POS_SETTINGS_PATH}${tab ? `?tab=${tab}` : ''}`;
}

/** The tab to show: the asked-for one when it's offered, else the first offered. */
export function pickPosTab(asked, offered) {
  return offered.includes(asked) ? asked : offered[0];
}
