import { runHtmlValidation } from '../utils.mjs';

function extractHtmlLang(html) {
  const match = html.match(/<html[^>]*\blang=["']([^"']+)["']/i);
  return match?.[1]?.trim() ?? '';
}

function collectInLanguageValues(node, out = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectInLanguageValues(item, out);
    return out;
  }

  if (!node || typeof node !== 'object') return out;

  if (Object.hasOwn(node, 'inLanguage')) {
    out.push(node.inLanguage);
  }

  for (const value of Object.values(node)) {
    collectInLanguageValues(value, out);
  }

  return out;
}

function hasEmptyInLanguage(values) {
  return values.some((value) => {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) {
      return value.some((item) => {
        if (item == null) return true;
        if (typeof item !== 'string') return false;
        return item.trim().length === 0;
      });
    }
    return false;
  });
}

function hasHtmlLang(values, htmlLang) {
  const normalizedHtmlLang = htmlLang.trim().toLowerCase();

  return values.some((value) => {
    if (typeof value === 'string') {
      return value.trim().toLowerCase() === normalizedHtmlLang;
    }

    if (Array.isArray(value)) {
      return value.some(
        (item) => typeof item === 'string' && item.trim().toLowerCase() === normalizedHtmlLang
      );
    }

    return false;
  });
}

/**
 * Extracts and parses JSON-LD script blocks from a page.
 */
function getJsonLdBlocks(html) {
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const blocks = [];
  let match;

  while ((match = regex.exec(html)) !== null) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      blocks.push({ __parseError: true, __raw: raw });
    }
  }

  return blocks;
}

/**
 * Flattens top-level JSON-LD nodes and @graph nodes into one list.
 */
function getGraphNodes(blocks) {
  const nodes = [];
  for (const block of blocks) {
    if (block.__parseError) continue;
    if (Array.isArray(block['@graph'])) nodes.push(...block['@graph']);
    else nodes.push(block);
  }
  return nodes;
}

export class JsonldValidator {
  constructor({
    requireHtmlLang = false,
    requireInLanguage = false,
    disallowEmptyInLanguage = false,
    requireLangMatch = false,
  } = {}) {
    this.config = {
      requireHtmlLang,
      requireInLanguage,
      disallowEmptyInLanguage,
      requireLangMatch,
    };
  }

  validateJsonLdLanguage({ html, nodes }) {
    const warnings = [];
    const htmlLang = extractHtmlLang(html);
    const inLanguageValues = collectInLanguageValues(nodes);

    if (this.config.requireHtmlLang && !htmlLang) {
      warnings.push('Missing <html lang="..."> value to validate JSON-LD language consistency.');
      return warnings;
    }

    if (this.config.requireInLanguage && inLanguageValues.length === 0) {
      warnings.push('No inLanguage property was found in JSON-LD.');
      return warnings;
    }

    if (this.config.disallowEmptyInLanguage && hasEmptyInLanguage(inLanguageValues)) {
      warnings.push('Found empty or null inLanguage value(s) in JSON-LD.');
    }

    if (this.config.requireLangMatch && htmlLang && !hasHtmlLang(inLanguageValues, htmlLang)) {
      warnings.push(`No JSON-LD inLanguage matches <html lang="${htmlLang}">.`);
    }

    return warnings;
  }

  validatePage(html) {
    const pageWarnings = [];
    const blocks = getJsonLdBlocks(html);

    if (blocks.length === 0) {
      pageWarnings.push('No JSON-LD block was found.');
      return pageWarnings;
    }

    if (blocks.some((b) => b.__parseError)) {
      pageWarnings.push('At least one JSON-LD block has invalid JSON.');
      return pageWarnings;
    }

    const nodes = getGraphNodes(blocks);

    if (nodes.length === 0) {
      pageWarnings.push('JSON-LD exists but has no nodes in @graph.');
      return pageWarnings;
    }

    pageWarnings.push(...this.validateJsonLdLanguage({ html, nodes }));
    return pageWarnings;
  }

  /**
   * Validates JSON-LD presence/basic parseability for each HTML page.
   */
  async validate(dirPath) {
    const { checkedPages, warnings } = await runHtmlValidation({
      dirPath,
      validatePage: ({ html }) => this.validatePage(html),
    });

    return {
      name: 'jsonld',
      label: 'JSON-LD',
      checkedPages,
      warnings,
    };
  }
}

/**
 * Backward-compatible function wrapper for existing integrations.
 */
export async function validateJsonld(dirPath, options = {}) {
  const validator = new JsonldValidator(options);
  return validator.validate(dirPath);
}
