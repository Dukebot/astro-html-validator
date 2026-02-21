import { runHtmlValidation } from './utils/common.mjs';

/**
 * Base validator with shared execution flow for HTML page-by-page checks.
 */
export class Validator {
  /**
   * Initializes shared validator metadata and config.
   */
  constructor({ name, label, config = {} } = {}) {
    if (!name) throw new Error('Validator name is required.');
    if (!label) throw new Error('Validator label is required.');

    this.name = name;
    this.label = label;
    this.config = config;
  }

  /**
   * Runs full validation over all HTML pages.
   */
  async validate(dirPath) {
    const { checkedPages, warnings } = await runHtmlValidation({
      dirPath,
      validatePage: (pageContext) => this.validatePage({ ...pageContext, dirPath }),
    });

    return {
      name: this.name,
      label: this.label,
      checkedPages,
      warnings,
    };
  }

  /**
   * Validates one page. Child classes must override this.
   */
  async validatePage() {
    throw new Error('validatePage() must be implemented by child validators.');
  }
}

export default Validator;
