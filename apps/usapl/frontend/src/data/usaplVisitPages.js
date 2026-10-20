const PAGE_LABELS = [
  { test: (path) => path === '/usapl' || path === '/usapl/', label: 'Home' },
  { test: (path) => path.startsWith('/usapl/signup'), label: 'Sign up' },
  { test: (path) => path.startsWith('/usapl/roster'), label: 'Team roster' },
  { test: (path) => path.startsWith('/usapl/past-divisions'), label: 'Past divisions' },
  { test: (path) => path.startsWith('/usapl/vegas-cup'), label: 'Vegas Cup' },
  { test: (path) => path.startsWith('/usapl/rules'), label: 'Rules' },
  { test: (path) => path.startsWith('/usapl/bylaws'), label: 'By-laws' },
  { test: (path) => path.startsWith('/usapl/dues'), label: 'Dues' },
  { test: (path) => path.startsWith('/usapl/admin'), label: 'Admin' },
];

export function usaplVisitPath(pathname, search = '') {
  const raw = `${pathname || ''}${search || ''}`.split('#')[0].trim() || '/usapl';
  return raw.slice(0, 200);
}

export function usaplVisitIsPublic(path) {
  const base = String(path || '').split('?')[0];
  if (!base.startsWith('/usapl')) return false;
  return !base.startsWith('/usapl/admin');
}

export function usaplVisitPageLabel(path, divisions = []) {
  const base = String(path || '').split('?')[0];
  const named = PAGE_LABELS.find((row) => row.test(base));
  if (named) return named.label;
  const match = base.match(/^\/usapl\/divisions\/([^/]+)/);
  if (match) {
    const id = decodeURIComponent(match[1]);
    const division = divisions.find((row) => row.id === id);
    return division?.shortName || division?.name || `Division · ${id}`;
  }
  if (base === '/usapl/divisions' || base.startsWith('/usapl/divisions?')) return 'Divisions';
  return base;
}
