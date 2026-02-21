import { validateJsonld } from './validators/jsonld.mjs';
import { validateLinks } from './validators/links.mjs';
import { validateMeta } from './validators/meta.mjs';

/**
 * Coordinates all available validators and prints optional summaries.
 */
export class Validator {
  constructor({ dirPath, config = {}, print = true } = {}) {
    this.dirPath = dirPath;

    this.validators = {
      jsonld: {
        label: 'JSON-LD',
        run: validateJsonld,
        config: config.jsonld,
      },
      links: {
        label: 'Internal links',
        run: validateLinks,
        config: config.links,
      },
      meta: {
        label: 'SEO metadata',
        run: validateMeta,
        config: config.meta,
      },
    };

    this.print = print;
  }

  /**
   * Resolves a selector string into a unique list of validator names.
   */
  selectValidators(selector = 'all') {
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
  printResultSummary(result) {
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
    const result = await validator.run(this.dirPath, validator.config);
    result.label = validator.label;
    if (this.print) this.printResultSummary(result);
    return result;
  }

  /**
   * Runs selected validators sequentially.
   */
  async run({ selector = 'all' } = {}) {
    const results = [];
    const selectedNames = this.selectValidators(selector);

    for (const name of selectedNames) {
      const result = await this.runValidator(name);
      results.push(result);
    }

    return results;
  }
}
