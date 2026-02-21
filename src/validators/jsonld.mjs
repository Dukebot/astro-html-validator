import { runHtmlValidation } from '../utils.mjs';

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

/**
 * Validates JSON-LD presence/basic parseability for each HTML page.
 */
export async function validateJsonld(dirPath) {
  const { checkedPages, warnings } = await runHtmlValidation({
    dirPath,
    validatePage: ({ html }) => {
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

      return pageWarnings;
    },
  });

  return {
    name: 'jsonld',
    label: 'JSON-LD',
    checkedPages,
    warnings,
  };
}
