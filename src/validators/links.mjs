import { Validator } from '../validator.mjs';
import { extractInternalUrls, internalUrlExists } from '../utils/links.mjs';

/**
 * Reports broken internal links for each generated HTML page.
 */
export class LinksValidator extends Validator {
  /**
   * Initializes link validator configuration (reserved for future rules).
   */
  constructor({
    absoluteUrlPrefixes = [],
  } = {}) {
    super({
      name: 'links',
      label: 'Internal links',
      config: {
        absoluteUrlPrefixes,
      },
    });
  }

  /**
   * Validates internal link targets for one HTML page.
   */
  async validatePage({ html, dirPath }) {
    const pageWarnings = [];
    const urls = extractInternalUrls(html, {
      absoluteUrlPrefixes: this.config.absoluteUrlPrefixes,
    });

    for (const url of urls) {
      const exists = await internalUrlExists(dirPath, url);
      if (!exists) pageWarnings.push(`Internal link not found: ${url}`);
    }

    return pageWarnings;
  }
}

export default LinksValidator