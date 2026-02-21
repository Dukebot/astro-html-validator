/**
 * Extracts the language code declared on the <html> element.
 */
export function extractHtmlLang(html) {
  const match = html.match(/<html[^>]*\blang=["']([^"']+)["']/i);
  return match?.[1]?.trim() ?? '';
}

/**
 * Recursively collects all inLanguage values from a JSON-LD node tree.
 */
export function collectInLanguageValues(node, out = []) {
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

/**
 * Checks whether any inLanguage value is empty, null, or undefined.
 */
export function hasEmptyInLanguage(values) {
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

/**
 * Returns true when at least one inLanguage value matches the HTML lang.
 */
export function hasHtmlLang(values, htmlLang) {
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
export function getJsonLdBlocks(html) {
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
export function getGraphNodes(blocks) {
  const nodes = [];
  for (const block of blocks) {
    if (block.__parseError) continue;
    if (Array.isArray(block['@graph'])) nodes.push(...block['@graph']);
    else nodes.push(block);
  }
  return nodes;
}
