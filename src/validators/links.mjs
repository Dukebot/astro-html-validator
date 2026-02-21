import path from 'node:path';
import { pathExists, runHtmlValidation } from '../utils.mjs';

/**
 * Extracts local (root-relative) URLs from href/src attributes.
 */
function extractInternalUrls(html) {
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
async function internalUrlExists(dirPath, urlPath) {
  if (urlPath === '/') return pathExists(path.join(dirPath, 'index.html'));

  const asFile = path.join(dirPath, urlPath.replace(/^\//, ''));
  if (await pathExists(asFile)) return true;

  const asIndex = path.join(dirPath, urlPath.replace(/^\//, ''), 'index.html');
  if (await pathExists(asIndex)) return true;

  const asHtml = path.join(dirPath, `${urlPath.replace(/^\//, '')}.html`);
  if (await pathExists(asHtml)) return true;

  return false;
}

/**
 * Reports broken internal links for each generated HTML page.
 */
export class LinksValidator {
  constructor({
    // Reserved for future options.
  } = {}) {
    this.config = {
      // Reserved for future options.
    };
  }

  async validatePage({ html, dirPath }) {
    const pageWarnings = [];
    const urls = extractInternalUrls(html);

    for (const url of urls) {
      const exists = await internalUrlExists(dirPath, url);
      if (!exists) pageWarnings.push(`Internal link not found: ${url}`);
    }

    return pageWarnings;
  }

  async validate(dirPath) {
    const { checkedPages, warnings } = await runHtmlValidation({
      dirPath,
      validatePage: ({ html }) => this.validatePage({ html, dirPath }),
    });

    return {
      name: 'links',
      label: 'Internal links',
      checkedPages,
      warnings,
    };
  }
}

/**
 * Backward-compatible function wrapper for existing integrations.
 */
export async function validateLinks(dirPath, options = {}) {
  const validator = new LinksValidator(options);
  return validator.validate(dirPath);
}
