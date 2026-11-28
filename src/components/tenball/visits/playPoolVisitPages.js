function basePath(path) {
  return String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
}

function queryView(path) {
  try {
    const q = String(path || '').split('?')[1] || '';
    return new URLSearchParams(q).get('view') || '';
  } catch {
    return '';
  }
}

export function playPoolVisitPath(pathname, search = '') {
  const raw = `${pathname || ''}${search || ''}`.split('#')[0].trim() || '/play-pool';
  return raw.slice(0, 200);
}

/** Admin is never counted. Legacy /tenball-tutorial still recognized for old rows. */
export function playPoolVisitIsPublic(path) {
  const base = basePath(path);
  return base === '/play-pool' || base === '/tenball-tutorial' || base === '/simple-pool';
}

const VIEW_LABELS = {
  menu: 'Play Pool menu',
  'eightball-tutorial': '8-Ball · Tutorial',
  'eightball-play': '8-Ball · Match',
  'nineball-tutorial': '9-Ball · Tutorial',
  'nineball-play': '9-Ball · Match',
  'tenball-tutorial': '10-Ball · Tutorial',
  'tenball-play': '10-Ball · Match',
  'onepocket-tutorial': 'One Pocket · Tutorial',
  'onepocket-play': 'One Pocket · Match',
  simple: 'Simple pool'
};

export function playPoolVisitPageLabel(path) {
  const base = basePath(path);
  if (base === '/simple-pool') return 'Simple pool';
  const view = queryView(path);
  if (view && VIEW_LABELS[view]) return VIEW_LABELS[view];
  if (base === '/play-pool' || base === '/tenball-tutorial') return 'Play Pool menu';
  return base;
}

/** Build a trackable path for menu vs in-session views. */
export function playPoolSessionPath(view = 'menu') {
  const key = String(view || 'menu').slice(0, 40);
  if (key === 'simple') return '/simple-pool?view=simple';
  return `/play-pool?view=${encodeURIComponent(key)}`;
}

export function playPoolSessionView({ gameType, lessonOn, mode = 'game' }) {
  if (mode === 'menu') return 'menu';
  const kind = lessonOn ? 'tutorial' : 'play';
  return `${gameType || 'tenball'}-${kind}`;
}
