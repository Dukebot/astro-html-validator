# astro-html-validator

Validate Astro-generated HTML output (`dist`) to catch common technical SEO issues:

- broken internal links,
- missing or invalid JSON-LD blocks,
- missing SEO metadata (`title`, `description`, `og:*`, etc.).

You can use it as:

1. a **CLI** (great for CI/CD),
2. a **reusable Node library** shared across projects.

---

## Installation

```bash
npm install -D @dukebot/astro-html-validator
```

---

## CLI usage

### Default command

```bash
npx astro-html-validator
```

By default it validates `./dist` and runs all validators.

### Run specific validators

```bash
npx astro-html-validator meta
npx astro-html-validator links
npx astro-html-validator jsonld,meta
```

### CLI options

```bash
astro-html-validator [selector] [options]

Options:
  --dir <path>      Path to the dist directory (default: <cwd>/dist)
  --quiet           Disable summary output
  --help            Show help
```

---

## Programmatic usage (Node)

```js
import path from 'node:path';
import { Validator } from '@dukebot/astro-html-validator';

const validator = new Validator({
  dirPath: path.resolve(process.cwd(), 'dist'),
  config: {
    jsonld: {
      requireHtmlLang: true,
      requireInLanguage: true,
      disallowEmptyInLanguage: true,
      requireLangMatch: true,
    },
    links: {},
    meta: {
      metaTitleMinLength: 30,
      metaTitleMaxLength: 60,
      metaDescriptionMinLength: 70,
      metaDescriptionMaxLength: 140,
    },
  },
  print: true,
});

const results = await validator.run({ selector: 'all' });
console.log(results);
```

### JSON-LD language consistency options

`config.jsonld` now supports optional checks to validate language consistency between `<html lang="...">` and JSON-LD `inLanguage` values:

- `requireHtmlLang` (default: `false`)
- `requireInLanguage` (default: `false`)
- `disallowEmptyInLanguage` (default: `false`)
- `requireLangMatch` (default: `false`)

When enabled, warnings are reported through the normal validator output (`[WARN] /route -> ...`) so existing integrations remain backward-compatible.

---

## Suggested scripts for your Astro project

```json
{
  "scripts": {
    "build": "astro build",
    "validate:dist": "astro-html-validator",
    "ci:seo": "npm run build && npm run validate:dist"
  }
}
```

---

## Publish to npm

Quick steps:

1. Update `name`, `author`, and `version` in `package.json`.
2. Sign in:

   ```bash
   npm login
   ```

3. Publish:

   ```bash
   npm publish --access public
   ```






