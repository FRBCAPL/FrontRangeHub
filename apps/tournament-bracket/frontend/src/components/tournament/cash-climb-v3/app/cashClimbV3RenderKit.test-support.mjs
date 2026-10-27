/** Test support only: compiles a Cash Climb (V3) JSX component with esbuild and renders it to static HTML. */
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../../../../..');
const outDir = path.join(root, 'node_modules', '.cache', 'cash-climb-v3-render');
const cache = new Map();

async function loadComponent(file) {
  if (cache.has(file)) return cache.get(file);
  const outfile = path.join(outDir, `${path.basename(file, '.jsx')}-${process.pid}.mjs`);
  await build({
    entryPoints: [path.resolve(here, file)],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    jsx: 'automatic',
    loader: { '.css': 'empty' },
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    logLevel: 'silent',
  });
  const mod = await import(pathToFileURL(outfile).href);
  cache.set(file, mod);
  return mod;
}

export async function render(file, props = {}) {
  const [mod, React, server] = await Promise.all([loadComponent(file), import('react'), import('react-dom/server')]);
  return server.renderToStaticMarkup(React.createElement(mod.default, props)).replace(/<!-- -->/g, '');
}
