import { Validator } from '../validator.mjs';
import {
  collectInLanguageValues,
  extractHtmlLang,
  getGraphNodes,
  getJsonLdBlocks,
  hasEmptyInLanguage,
  hasHtmlLang,
} from '../utils/jsonld.mjs';

export class JsonldValidator extends Validator {
  /**
   * Stores JSON-LD language consistency options for this validator instance.
   */
  constructor({
    requireHtmlLang = false,
    requireInLanguage = false,
    disallowEmptyInLanguage = false,
    requireLangMatch = false,
  } = {}) {
    super({
      name: 'jsonld',
      label: 'JSON-LD',
      config: {
        requireHtmlLang,
        requireInLanguage,
        disallowEmptyInLanguage,
        requireLangMatch,
      },
    });
  }

  /**
   * Applies language-related JSON-LD checks for one parsed HTML page.
   */
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

  /**
   * Validates JSON-LD structure and optional language consistency for one page.
   */
  validatePage({ html }) {
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
}

export default JsonldValidator