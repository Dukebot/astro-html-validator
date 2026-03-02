import path from 'node:path';
import { parse } from 'parse5';
import { pathExists } from './common.mjs';

/**
 * Normalizes configured absolute URL prefixes.
 */
function normalizeAbsolutePrefixes(absoluteUrlPrefixes = []) {
  if (!absoluteUrlPrefixes) return [];

  const values = Array.isArray(absoluteUrlPrefixes)
    ? absoluteUrlPrefixes
    : String(absoluteUrlPrefixes)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

  return [...new Set(values.map((value) => value.replace(/\/+$/, '')))];
}

/**
 * Converts a matching absolute URL into a local root-relative URL.
 */
function toLocalPathFromAbsolute(rawUrl, absolutePrefixes) {
  for (const prefix of absolutePrefixes) {
    if (rawUrl === prefix) return '/';
    if (rawUrl.startsWith(`${prefix}/`)) return rawUrl.slice(prefix.length);
  }

  return null;
}

/**
 * Collects href/src attribute values from parsed HTML element nodes.
 */
function collectHtmlLinkAttributes(html = '') {
  if (!html) return [];

  const urls = [];
  const document = parse(html, { sourceCodeLocationInfo: false });
  const queue = [document];

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) continue;

    if (Array.isArray(node.attrs)) {
      for (const attr of node.attrs) {
        if (!attr?.name || !attr?.value) continue;
        if (attr.name !== 'href' && attr.name !== 'src') continue;
        urls.push(attr.value);
      }
    }

    if (node.content) queue.push(node.content);
    if (Array.isArray(node.childNodes) && node.childNodes.length > 0) {
      queue.push(...node.childNodes);
    }
  }

  return urls;
}

/**
 * Extracts local (root-relative) URLs from href/src attributes.
 */
export function extractInternalUrls(html, { absoluteUrlPrefixes = [] } = {}) {
  const urls = new Set();
  const absolutePrefixes = normalizeAbsolutePrefixes(absoluteUrlPrefixes);

  for (const value of collectHtmlLinkAttributes(html)) {
    const raw = value?.trim();
    if (!raw) continue;

    if (
      raw.startsWith('//') ||
      raw.startsWith('#') ||
      raw.startsWith('mailto:') ||
      raw.startsWith('tel:') ||
      raw.startsWith('javascript:') ||
      raw.startsWith('data:')
    ) {
      continue;
    }

    const clean = raw.split(/[?#]/)[0];
    if (!clean) continue;

    if (clean.startsWith('/')) {
      urls.add(clean);
      continue;
    }

    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      const localPath = toLocalPathFromAbsolute(clean, absolutePrefixes);
      if (localPath) urls.add(localPath);
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
