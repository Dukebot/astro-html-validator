import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { promises as fs } from 'node:fs';

import { HtmlValidator } from '../src/index.mjs';
import {
  getMetaContent,
  getTitleContent,
  hasMeta,
  validateHtmlMeta,
} from '../src/utils/meta.mjs';

test('extrae title y metadata SEO con acentos, apostrofos y umlauts', () => {
  const html = `
    <!doctype html>
    <html lang="ca">
      <head>
        <title>Reset setmanal | l'opci\u00F3 m\u00E9s \u00FAtil per al dia a dia</title>
        <meta
          name="description"
          content="Una guia m\u00E9s clara per a l'opci\u00F3 d'entrada i t'hi acompanya cada dia."
        />
        <meta property="og:title" content="F\u00EDsica, m\u00E9s energia i f\u00FCr Umlauts" />
        <meta
          property="og:description"
          content="D'entrada, l'opci\u00F3 bona per al dia i per a m\u00E9s calma."
        />
        <meta name="robots" content="index,follow" />
        <meta property="og:url" content="https://example.com/reset" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://example.com/reset" />
      </head>
      <body></body>
    </html>
  `;

  assert.equal(getTitleContent(html), "Reset setmanal | l'opci\u00F3 m\u00E9s \u00FAtil per al dia a dia");
  assert.equal(
    getMetaContent(html, 'description'),
    "Una guia m\u00E9s clara per a l'opci\u00F3 d'entrada i t'hi acompanya cada dia."
  );
  assert.equal(
    getMetaContent(html, 'og:title', true),
    'F\u00EDsica, m\u00E9s energia i f\u00FCr Umlauts'
  );
  assert.equal(
    getMetaContent(html, 'og:description', true),
    "D'entrada, l'opci\u00F3 bona per al dia i per a m\u00E9s calma."
  );
  assert.equal(hasMeta(html, 'description'), true);
  assert.equal(hasMeta(html, 'og:title', true), true);
});

test('mide longitudes sobre el valor parseado final y no sobre texto roto', () => {
  const html = `
    <!doctype html>
    <html>
      <head>
        <title>M\u00E1s d\u00EDa f\u00EDsica</title>
        <meta name="description" content="l'opci\u00F3 d'entrada amb f\u00FCr calma" />
        <meta name="robots" content="index,follow" />
        <meta property="og:title" content="M\u00E1s d\u00EDa f\u00EDsica" />
        <meta property="og:description" content="l'opci\u00F3 d'entrada amb f\u00FCr calma" />
        <meta property="og:url" content="https://example.com/" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://example.com/" />
      </head>
    </html>
  `;

  const warnings = validateHtmlMeta(html, {
    metaTitleMinLength: 20,
    metaTitleMaxLength: 60,
    metaDescriptionMinLength: 40,
    metaDescriptionMaxLength: 140,
  });

  assert.deepEqual(warnings, [
    'Recommended meta title length is 20-60. Current: 14.',
    'Recommended meta description length is 40-140. Current: 31.',
  ]);
});

test('lee siempre el HTML actual del dist despues de cambiar el archivo', async () => {
  const tempRoot = await fs.mkdtemp(path.join(process.cwd(), 'tests-meta-'));

  try {
    const distDir = path.join(tempRoot, 'dist');
    await fs.mkdir(distDir, { recursive: true });

    const initialHtml = `
      <!doctype html>
      <html>
        <head>
          <title>Titulo extremadamente largo para comprobar que ya no se reutiliza</title>
          <meta
            name="description"
            content="Descripcion extremadamente larga para comprobar que ya no se reutiliza despues de actualizar el archivo."
          />
          <meta name="robots" content="index,follow" />
          <meta property="og:title" content="Titulo OG largo inicial" />
          <meta property="og:description" content="Descripcion OG larga inicial" />
          <meta property="og:url" content="https://example.com/reset" />
          <meta property="og:type" content="website" />
          <link rel="canonical" href="https://example.com/reset" />
        </head>
        <body></body>
      </html>
    `;

    const updatedHtml = `
      <!doctype html>
      <html>
        <head>
          <title>Reset semanal | Habituae</title>
          <meta
            name="description"
            content="Newsletter semanal para parar, revisar la semana y volver a enfocarte."
          />
          <meta name="robots" content="index,follow" />
          <meta property="og:title" content="Reset semanal | Habituae" />
          <meta
            property="og:description"
            content="Newsletter semanal para parar, revisar la semana y volver a enfocarte."
          />
          <meta property="og:url" content="https://example.com/reset" />
          <meta property="og:type" content="website" />
          <link rel="canonical" href="https://example.com/reset" />
        </head>
        <body></body>
      </html>
    `;

    const filePath = path.join(distDir, 'index.html');
    await fs.writeFile(filePath, initialHtml, 'utf8');

    const validator = new HtmlValidator({
      dirPath: distDir,
      config: {
        meta: {
          metaTitleMinLength: 10,
          metaTitleMaxLength: 30,
          metaDescriptionMinLength: 10,
          metaDescriptionMaxLength: 80,
        },
      },
      print: false,
    });

    const [firstResult] = await validator.run({ selector: 'meta' });
    assert.deepEqual(firstResult.warnings, [
      '[WARN] / -> Recommended meta title length is 10-30. Current: 65.',
      '[WARN] / -> Recommended meta description length is 10-80. Current: 104.',
    ]);

    await fs.writeFile(filePath, updatedHtml, 'utf8');

    const [secondResult] = await validator.run({ selector: 'meta' });
    assert.deepEqual(secondResult.warnings, []);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
