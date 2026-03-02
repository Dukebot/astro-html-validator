import test from 'node:test';
import assert from 'node:assert/strict';

import { extractInternalUrls } from '../src/utils/links.mjs';

test('extractInternalUrls ignora enlaces dentro de comentarios HTML', () => {
  const html = `
    <!-- <a href="/comentado">No contar</a> -->
    <a href="/real">Contar</a>
  `;

  const result = extractInternalUrls(html);
  assert.deepEqual(result, ['/real']);
});

test('extractInternalUrls convierte URLs absolutas internas usando prefijos', () => {
  const html = `
    <a href="https://example.com/about">About</a>
    <a href="https://www.example.com/contact?utm=1#team">Contact</a>
    <a href="https://other.com/out">External</a>
  `;

  const result = extractInternalUrls(html, {
    absoluteUrlPrefixes: ['https://example.com', 'https://www.example.com'],
  });

  assert.deepEqual(result, ['/about', '/contact']);
});

test('extractInternalUrls ignora protocolos no navegables y anchors', () => {
  const html = `
    <a href="#section">Anchor</a>
    <a href="mailto:test@example.com">Mail</a>
    <a href="tel:+34123456789">Phone</a>
    <a href="javascript:void(0)">JS</a>
    <img src="data:image/png;base64,AAAA" />
    <a href="/ok">OK</a>
  `;

  const result = extractInternalUrls(html);
  assert.deepEqual(result, ['/ok']);
});

test('extractInternalUrls elimina query/hash y evita duplicados', () => {
  const html = `
    <a href="/blog/post-1?utm=ad#intro">Post 1</a>
    <a href="/blog/post-1#comments">Post 1 duplicate</a>
    <img src="/assets/logo.png?v=2" />
  `;

  const result = extractInternalUrls(html);
  assert.deepEqual(result, ['/blog/post-1', '/assets/logo.png']);
});
