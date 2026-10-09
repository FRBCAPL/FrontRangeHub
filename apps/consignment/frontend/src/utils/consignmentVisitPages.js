import { CONSIGNMENT_PATH } from '../data/consignmentConstants.js';

const PAGE_LABELS = [
  { test: (p) => p === CONSIGNMENT_PATH, label: 'Shop' },
  { test: (p) => p === `${CONSIGNMENT_PATH}/home`, label: 'Home' },
  { test: (p) => p.startsWith(`${CONSIGNMENT_PATH}/sell`), label: 'Sell an item' },
  { test: (p) => p.startsWith(`${CONSIGNMENT_PATH}/my-items`), label: 'My items' },
];

function basePath(path) {
  return String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
}

export function consignmentVisitPath(pathname, search = '') {
  const raw = `${pathname || ''}${search || ''}`.split('#')[0].trim() || CONSIGNMENT_PATH;
  return raw.slice(0, 200);
}

/** Admin pages and print tags are never counted. */
export function consignmentVisitIsPublic(path) {
  const base = basePath(path);
  if (base !== CONSIGNMENT_PATH && !base.startsWith(`${CONSIGNMENT_PATH}/`)) return false;
  return !base.startsWith(`${CONSIGNMENT_PATH}/admin`) && !base.startsWith(`${CONSIGNMENT_PATH}/tag/`);
}

export function consignmentVisitPageLabel(path) {
  const base = basePath(path);
  const named = PAGE_LABELS.find((row) => row.test(base));
  if (named) return named.label;
  const item = base.match(/\/item\/([^/]+)/);
  if (item) return `Item ${decodeURIComponent(item[1])}`;
  return base;
}
