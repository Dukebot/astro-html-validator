import path from 'node:path';
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
 * Removes non-rendered sections to avoid false positives when extracting links.
 */
function sanitizeHtmlForLinkExtraction(html = '') {
  if (!html) return '';

  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '');
}

/**
 * Extracts local (root-relative) URLs from href/src attributes.
 */
export function extractInternalUrls(html, { absoluteUrlPrefixes = [] } = {}) {
  const urls = new Set();
  const tagRegex = /<[^>]+>/g;
  const attrRegex = /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  const absolutePrefixes = normalizeAbsolutePrefixes(absoluteUrlPrefixes);
  const safeHtml = sanitizeHtmlForLinkExtraction(html);

  let tagMatch;
  while ((tagMatch = tagRegex.exec(safeHtml)) !== null) {
    const tag = tagMatch[0];
    if (!tag || tag.startsWith('</')) continue;

    let attrMatch;
    while ((attrMatch = attrRegex.exec(tag)) !== null) {
      const raw = attrMatch[1]?.trim();
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

    attrRegex.lastIndex = 0;
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
