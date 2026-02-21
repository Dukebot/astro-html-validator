import { getAttr } from './common.mjs';

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
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  return tags.some((tag) => {
    const key = isProperty ? getAttr(tag, 'property') : getAttr(tag, 'name');
    if (!key || key !== name) return false;
    const content = getAttr(tag, 'content');
    return !!content;
  });
}

/**
 * Returns the `content` value for a meta tag by name/property.
 */
export function getMetaContent(html, name, isProperty = false) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const key = isProperty ? getAttr(tag, 'property') : getAttr(tag, 'name');
    if (!key || key !== name) continue;
    const content = getAttr(tag, 'content');
    if (content) return content;
  }
  return '';
}

/**
 * Checks that a canonical link tag exists with a non-empty href.
 */
export function hasCanonical(html) {
  const links = html.match(/<link\b[^>]*>/gi) || [];
  return links.some((tag) => {
    const rel = getAttr(tag, 'rel');
    if (!rel || rel.toLowerCase() !== 'canonical') return false;
    const href = getAttr(tag, 'href');
    return !!href;
  });
}

/**
 * Extracts the document title text.
 */
export function getTitleContent(html) {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match?.[1]?.trim() ?? '';
}

/**
 * Validates optional length ranges for title/description fields.
 */
export function validateLengthRange({ value, min = 1, max = Infinity, fieldLabel }) {
  if (!value) return;
  if (value.length >= min && value.length <= max) return;
  return `Recommended ${fieldLabel} length is ${min}-${max}. Current: ${value.length}.`;
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
