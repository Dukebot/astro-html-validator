#!/usr/bin/env node

import path from 'node:path';
import { Validator } from '../src/index.mjs';

/**
 * Prints CLI usage information.
 */
function printHelp() {
  console.log(`
astro-html-validator

Usage:
  astro-html-validator [selector] [options]

Selector:
  all | jsonld | links | meta | jsonld,links,meta

Options:
  --dir <path>      Path to the dist directory (default: ./dist)
  --quiet           Disable printed summary output
  --help            Show help

Examples:
  astro-html-validator
  astro-html-validator meta
  astro-html-validator links --dir ./dist
  astro-html-validator jsonld,meta
`);
}

/**
 * Parses CLI arguments into validator runtime options.
 */
function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    selector: 'all',
    dirPath: path.resolve(process.cwd(), 'dist'),
    print: true,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg) continue;

    if (!arg.startsWith('-') && options.selector === 'all') {
      options.selector = arg;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--quiet') {
      options.print = false;
      continue;
    }

    if (arg === '--dir') {
      const next = argv[index + 1];
      if (!next) throw new Error('Missing value for --dir');
      options.dirPath = path.resolve(process.cwd(), next);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

/**
 * CLI entry point.
 */
async function main() {
  const parsed = parseArgs();

  if (parsed.help) {
    printHelp();
    process.exit(0);
  }

  console.log('\n=== Dist validation started ===');

  const validator = new Validator({
    dirPath: parsed.dirPath,
    config: {},
    print: parsed.print,
  });

  await validator.run({ selector: parsed.selector });

  console.log('\n=== Dist validation completed ===');
  process.exit(0);
}

main().catch((error) => {
  console.error('[ERROR] Dist validation failed:', error.message ?? error);
  process.exit(1);
});
