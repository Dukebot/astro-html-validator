import { getAttr, runHtmlValidation } from '../utils.mjs';

// Core metadata tags expected on every page.
const REQUIRED_META_CHECKS = [
  { label: 'meta title', check: getTitleContent },
  { label: 'meta description', check: (html) => hasMeta(html, 'description') },
  { label: 'canonical', check: hasCanonical },
  { label: 'meta robots', check: (html) => hasMeta(html, 'robots') },
  { label: 'og:title', check: (html) => hasMeta(html, 'og:title', true) },
  { label: 'og:description', check: (html) => hasMeta(html, 'og:description', true) },
  { label: 'og:url', check: (html) => hasMeta(html, 'og:url', true) },
  { label: 'og:type', check: (html) => hasMeta(html, 'og:type', true) },
];

function hasMeta(html, name, isProperty = false) {
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
function getMetaContent(html, name, isProperty = false) {
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
function hasCanonical(html) {
  const links = html.match(/<link\b[^>]*>/gi) || [];
  return links.some((tag) => {
    const rel = getAttr(tag, 'rel');
    if (!rel || rel.toLowerCase() !== 'canonical') return false;
    const href = getAttr(tag, 'href');
    return !!href;
  });
}

function getTitleContent(html) {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match?.[1]?.trim() ?? '';
}

/**
 * Validates optional length ranges for title/description fields.
 */
function validateLengthRange({ value, min = 1, max = Infinity, fieldLabel }) {
  if (!value) return;
  if (value.length >= min && value.length <= max) return;
  return `Recommended ${fieldLabel} length is ${min}-${max}. Current: ${value.length}.`;
}

function validateRequiredMeta(html) {
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
function validateHtmlMeta(
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

export class MetaValidator {
  constructor({
    metaTitleMinLength,
    metaTitleMaxLength,
    metaDescriptionMinLength,
    metaDescriptionMaxLength,
  } = {}) {
    this.config = {
      metaTitleMinLength,
      metaTitleMaxLength,
      metaDescriptionMinLength,
      metaDescriptionMaxLength,
    };
  }

  validatePage(html) {
    return validateHtmlMeta(html, this.config);
  }

  /**
   * Validates SEO metadata for every HTML page in dist.
   */
  async validate(dirPath) {
    const { checkedPages, warnings } = await runHtmlValidation({
      dirPath,
      validatePage: ({ html }) => this.validatePage(html),
    });

    return {
      name: 'meta',
      label: 'SEO metadata',
      checkedPages,
      warnings,
    };
  }
}

/**
 * Backward-compatible function wrapper for existing integrations.
 */
export async function validateMeta(dirPath, options = {}) {
  const validator = new MetaValidator(options);
  return validator.validate(dirPath);
}
