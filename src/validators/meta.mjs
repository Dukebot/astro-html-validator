import { Validator } from '../validator.mjs';
import { validateHtmlMeta } from '../utils/meta.mjs';

/**
 * Validates required SEO metadata and optional length recommendations.
 */
export class MetaValidator extends Validator {
  /**
   * Stores metadata validation thresholds for this validator instance.
   */
  constructor({
    metaTitleMinLength,
    metaTitleMaxLength,
    metaDescriptionMinLength,
    metaDescriptionMaxLength,
  } = {}) {
    super({
      name: 'meta',
      label: 'SEO metadata',
      config: {
        metaTitleMinLength,
        metaTitleMaxLength,
        metaDescriptionMinLength,
        metaDescriptionMaxLength,
      },
    });
  }

  /**
   * Validates metadata rules for one HTML page.
   */
  validatePage({ html }) {
    return validateHtmlMeta(html, this.config);
  }
}

export default MetaValidator