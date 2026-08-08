import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const heroPath = new URL('../../src/components/home/Hero.astro', import.meta.url);
const coverStylesPath = new URL('../../src/styles/home-cover.css', import.meta.url);

test('the homepage cover renders two independently animated wave layers', async () => {
  const [hero, styles] = await Promise.all([
    readFile(heroPath, 'utf8'),
    readFile(coverStylesPath, 'utf8'),
  ]);

  assert.match(hero, /class="home-cover-wave-layer home-cover-wave-back"/);
  assert.match(hero, /class="home-cover-wave-layer home-cover-wave-front"/);
  assert.match(styles, /\.home-cover-wave-back\s*\{[^}]*animation:/s);
  assert.match(styles, /\.home-cover-wave-front\s*\{[^}]*animation:/s);
  assert.match(styles, /@keyframes home-cover-wave-drift-back/);
  assert.match(styles, /@keyframes home-cover-wave-drift-front/);
});

test('the homepage cover stops both wave animations for reduced-motion users', async () => {
  const styles = await readFile(coverStylesPath, 'utf8');

  assert.match(
    styles,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.home-cover-wave-back[\s\S]*\.home-cover-wave-front[\s\S]*animation: none/,
  );
});
