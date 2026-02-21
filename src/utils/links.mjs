import path from 'node:path';
import { pathExists } from './common.mjs';

/**
 * Extracts local (root-relative) URLs from href/src attributes.
 */
export function extractInternalUrls(html) {
  const urls = new Set();
  const regex = /(?:href|src)=["']([^"']+)["']/gi;

  let match;
  while ((match = regex.exec(html)) !== null) {
    const raw = match[1]?.trim();
    if (!raw) continue;

    if (
      raw.startsWith('http://') ||
      raw.startsWith('https://') ||
      raw.startsWith('//') ||
      raw.startsWith('#') ||
      raw.startsWith('mailto:') ||
      raw.startsWith('tel:') ||
      raw.startsWith('javascript:') ||
      raw.startsWith('data:')
    ) {
      continue;
    }

    if (raw.startsWith('/')) {
      const clean = raw.split('#')[0].split('?')[0];
      if (clean) urls.add(clean);
    }
  }

  return [...urls];
}

/**
 * Checks whether an internal URL resolves to an HTML file in dist.
 */
export async function internalUrlExists(dirPath, urlPath) {
  if (urlPath === '/') return pathExists(path.join(dirPath, 'index.html'));

  const asFile = path.join(dirPath, urlPath.replace(/^\//, ''));
  if (await pathExists(asFile)) return true;

  const asIndex = path.join(dirPath, urlPath.replace(/^\//, ''), 'index.html');
  if (await pathExists(asIndex)) return true;

  const asHtml = path.join(dirPath, `${urlPath.replace(/^\//, '')}.html`);
  if (await pathExists(asHtml)) return true;

  return false;
}
