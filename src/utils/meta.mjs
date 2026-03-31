import { parse } from 'parse5';

function parseHtmlDocument(html = '') {
  if (!html) return null;
  return parse(html, { sourceCodeLocationInfo: false });
}

function getAttrValue(node, attrName) {
  if (!Array.isArray(node?.attrs)) return '';
  const attr = node.attrs.find((item) => item?.name?.toLowerCase() === attrName.toLowerCase());
  return attr?.value?.trim() ?? '';
}

function findFirstNode(root, predicate) {
  if (!root) return null;

  const queue = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) continue;
    if (predicate(node)) return node;

    if (node.content) queue.push(node.content);
    if (Array.isArray(node.childNodes) && node.childNodes.length > 0) {
      queue.push(...node.childNodes);
    }
  }

  return null;
}

function getNodeText(node) {
  if (!node) return '';

  let text = '';
  const queue = [node];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    if (current.nodeName === '#text' && typeof current.value === 'string') {
      text += current.value;
    }

    if (current.content) queue.push(current.content);
    if (Array.isArray(current.childNodes) && current.childNodes.length > 0) {
      queue.push(...current.childNodes);
    }
  }

  return text.replace(/\s+/g, ' ').trim();
}

function getMetaNode(document, name, isProperty = false) {
  const attrName = isProperty ? 'property' : 'name';
  const normalizedExpected = String(name).trim().toLowerCase();

  return findFirstNode(document, (node) => {
    if (node?.tagName !== 'meta') return false;
    const key = getAttrValue(node, attrName).toLowerCase();
    return key === normalizedExpected;
  });
}

function getStringLength(value) {
  return Array.from(value.normalize('NFC')).length;
}

// Core metadata tags expected on every page.
export const REQUIRED_META_CHECKS = [
  { label: 'meta title', check: getTitleContent },
  { label: 'meta description', check: (html) => hasMeta(html, 'description') },
  { label: 'canonical', check: hasCanonical },
  { label: 'meta robots', check: (html) => hasMeta(html, 'robots') },
  { label: 'og:title', check: (html) => hasMeta(html, 'og:title', true) },
  { label: 'og:description', check: (html) => hasMeta(html, 'og:description', true) },
  { label: 'og:url', check: (html) => hasMeta(html, 'og:url', true) },
  { label: 'og:type', check: (html) => hasMeta(html, 'og:type', true) },
];

/**
 * Returns whether a meta tag exists with the expected key and non-empty content.
 */
export function hasMeta(html, name, isProperty = false) {
  return !!getMetaContent(html, name, isProperty);
}

/**
 * Returns the `content` value for a meta tag by name/property.
 */
export function getMetaContent(html, name, isProperty = false) {
  const document = parseHtmlDocument(html);
  const node = getMetaNode(document, name, isProperty);
  return getAttrValue(node, 'content');
}

/**
 * Checks that a canonical link tag exists with a non-empty href.
 */
export function hasCanonical(html) {
  const document = parseHtmlDocument(html);

  return !!findFirstNode(document, (node) => {
    if (node?.tagName !== 'link') return false;
    const rel = getAttrValue(node, 'rel').toLowerCase();
    if (rel !== 'canonical') return false;
    return !!getAttrValue(node, 'href');
  });
}

/**
 * Extracts the document title text.
 */
export function getTitleContent(html) {
  const document = parseHtmlDocument(html);
  const titleNode = findFirstNode(document, (node) => node?.tagName === 'title');
  return getNodeText(titleNode);
}

/**
 * Validates optional length ranges for title/description fields.
 */
export function validateLengthRange({ value, min = 1, max = Infinity, fieldLabel }) {
  if (!value) return;

  const length = getStringLength(value);
  if (length >= min && length <= max) return;
  return `Recommended ${fieldLabel} length is ${min}-${max}. Current: ${length}.`;
}

/**
 * Evaluates all mandatory metadata checks for a page.
 */
export function validateRequiredMeta(html) {
  const warnings = [];

  for (const item of REQUIRED_META_CHECKS) {
    if (!item.check(html)) {
      warnings.push(`Missing ${item.label}.`);
    }
  }

  return warnings;
}

/**
 * Runs required and optional SEO metadata checks for one HTML string.
 */
export function validateHtmlMeta(
  html,
  {
    metaTitleMinLength,
    metaTitleMaxLength,
    metaDescriptionMinLength,
    metaDescriptionMaxLength,
  } = {}
) {
  const warnings = [];

  warnings.push(...validateRequiredMeta(html));

  warnings.push(
    validateLengthRange({
      value: getTitleContent(html),
      min: metaTitleMinLength,
      max: metaTitleMaxLength,
      fieldLabel: 'meta title',
    })
  );

  warnings.push(
    validateLengthRange({
      value: getMetaContent(html, 'description'),
      min: metaDescriptionMinLength,
      max: metaDescriptionMaxLength,
      fieldLabel: 'meta description',
    })
  );

  return warnings.filter(Boolean);
}
