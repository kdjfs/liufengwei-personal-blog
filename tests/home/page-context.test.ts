import assert from 'node:assert/strict';
import test from 'node:test';
import { getPageChrome } from '../../src/utils/page-context.ts';

test('getPageChrome enables the immersive cover only on the homepage', () => {
  assert.deepEqual(getPageChrome('/'), {
    bodyClass: 'page-home',
    headerVariant: 'cover',
  });

  assert.deepEqual(getPageChrome('/blog'), {
    bodyClass: 'page-default',
    headerVariant: 'default',
  });
});

test('getPageChrome keeps a trailing-slash non-home route in the default mode', () => {
  assert.deepEqual(getPageChrome('/about/'), {
    bodyClass: 'page-default',
    headerVariant: 'default',
  });
});
