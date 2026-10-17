/** Test-only: compiles a Showdown JSX component with esbuild and renders it to static HTML. */
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../../../../..');
const outDir = path.join(root, 'node_modules', '.cache', 'showdown-render');
const cache = new Map();

/** Screens are rendered without Supabase: the real cloud module is swapped for one with no clients. */
const cloudStub = {
  name: 'showdown-cloud-stub',
  setup(b) {
    b.onResolve({ filter: /showdownCloud\.js$/ }, () => ({ path: path.join(here, 'showdownCloudTestStub.js') }));
  },
};

export async function loadComponent(file) {
  if (cache.has(file)) return cache.get(file);
  const outfile = path.join(outDir, `${path.basename(file, '.jsx')}-${process.pid}.mjs`);
  await build({
    entryPoints: [path.join(here, file)],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    jsx: 'automatic',
    loader: { '.css': 'empty' },
    external: ['react', 'react-dom', 'react/jsx-runtime', 'react-router-dom'],
    plugins: [cloudStub],
    logLevel: 'silent',
  });
  const mod = await import(pathToFileURL(outfile).href);
  cache.set(file, mod);
  return mod;
}

export async function render(file, props = {}) {
  const [{ default: Component }, React, server] = await Promise.all([
    loadComponent(file),
    import('react'),
    import('react-dom/server'),
  ]);
  return server.renderToStaticMarkup(React.createElement(Component, props));
}

/** Minimal localStorage so ShowdownApp can load a saved event under Node. */
export function fakeLocalStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  globalThis.localStorage = {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
  return data;
}
