import { JsonldValidator } from './validators/jsonld.mjs';
import { LinksValidator } from './validators/links.mjs';
import { MetaValidator } from './validators/meta.mjs';

/**
 * Coordinates all available validators and prints optional summaries.
 */
export class HtmlValidator {
  /**
   * Builds a validator coordinator with directory, per-validator config, and output mode.
   */
  constructor({ dirPath, config = {}, print = true } = {}) {
    this.dirPath = dirPath;

    this.validators = {
      jsonld: new JsonldValidator(config.jsonld),
      links: new LinksValidator(config.links),
      meta: new MetaValidator(config.meta),
    };

    this.print = print;
  }

  /**
   * Resolves a selector string into a unique list of validator names.
   */
  _selectValidators(selector = 'all') {
    const clean = selector.trim().toLowerCase();

    if (clean === 'all') return Object.keys(this.validators);

    const selected = clean
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const invalid = selected.filter((name) => !this.validators[name]);
    if (invalid.length > 0) {
      throw new Error(
        `Unknown validators: ${invalid.join(', ')}. ` +
          `Valid options: all, ${Object.keys(this.validators).join(', ')}`
      );
    }

    return [...new Set(selected)];
  }

  /**
   * Prints a consistent summary for one validator result.
   */
  _printResultSummary(result) {
    console.log(`\n=== ${result.label} ===`);
    console.log(`Checked ${result.checkedPages} HTML pages.`);

    if (result.warnings.length === 0) {
      console.log('✅ No warnings.');
      return;
    }

    console.log(`⚠️  Warnings found: ${result.warnings.length}`);
    for (const warning of result.warnings) console.log(warning);
  }

  /**
   * Runs one validator by name.
   */
  async runValidator(name) {
    const validator = this.validators[name];
    const result = await validator.validate(this.dirPath);
    if (this.print) this._printResultSummary(result);
    return result;
  }

  /**
   * Runs selected validators sequentially.
   */
  async run({ selector = 'all' } = {}) {
    const results = [];
    const selectedNames = this._selectValidators(selector);

    for (const name of selectedNames) {
      const result = await this.runValidator(name);
      results.push(result);
    }

    return results;
  }
}

export { HtmlValidator as Validator };
export default HtmlValidator;