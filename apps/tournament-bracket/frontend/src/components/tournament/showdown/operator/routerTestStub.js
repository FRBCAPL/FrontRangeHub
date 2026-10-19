/** Test-only stand-in for react-router-dom. Set `globalThis.__showdownTestUrl` to choose the location. */
function split() {
  const url = String(globalThis.__showdownTestUrl || '/');
  const i = url.indexOf('?');
  return i < 0 ? [url, ''] : [url.slice(0, i), url.slice(i + 1)];
}

export function useNavigate() {
  return () => {};
}

export function useSearchParams() {
  return [new URLSearchParams(split()[1]), () => {}];
}

export function useLocation() {
  const [pathname, search] = split();
  return { pathname, search: search ? `?${search}` : '', hash: '' };
}
