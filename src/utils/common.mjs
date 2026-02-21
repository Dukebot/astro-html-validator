import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Throws if the given directory cannot be accessed.
 */
export async function ensureDirExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    throw new Error(`Directory does not exist: ${dirPath}`);
  }
}

/**
 * Returns whether a file or directory exists.
 */
export async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts an HTML file path into a route-like URL.
 */
export function toRoute(filePath, rootDir) {
  const rel = path.relative(rootDir, filePath).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.replace(/\/index\.html$/, '');
  return '/' + rel.replace(/\.html$/, '');
}

/**
 * Normalized warning message format used by all validators.
 */
export function formatWarning(route, message) {
  return `[WARN] ${route} -> ${message}`;
}

/**
 * Reads an attribute value from an HTML tag string.
 */
export function getAttr(tag, attrName) {
  const match = tag.match(new RegExp(`${attrName}=["']([^"']+)["']`, 'i'));
  return match?.[1]?.trim();
}

/**
 * Recursively collects all HTML files from a directory.
 */
export async function walkHtmlFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) files.push(...(await walkHtmlFiles(fullPath)));
    if (entry.isFile() && entry.name.endsWith('.html')) files.push(fullPath);
  }

  return files;
}

/**
 * Shared runner for validators that operate page-by-page over HTML files.
 */
export async function runHtmlValidation({ dirPath, validatePage }) {
  await ensureDirExists(dirPath);
  const htmlFiles = await walkHtmlFiles(dirPath);
  const warnings = [];

  for (const filePath of htmlFiles) {
    const route = toRoute(filePath, dirPath);
    if (route.startsWith('/decapcms')) continue;

    const html = await fs.readFile(filePath, 'utf8');
    const pageWarnings = (await validatePage({ html, route, filePath })) ?? [];

    for (const warning of pageWarnings) {
      warnings.push(formatWarning(route, warning));
    }
  }

  return {
    checkedPages: htmlFiles.length,
    warnings,
  };
}
