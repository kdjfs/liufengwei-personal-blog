import assert from 'node:assert/strict';
import test from 'node:test';
import { isAllowedLocalOrigin } from '../../scripts/ai-local-server.ts';

test('local AI gateway CORS only permits the two Astro loopback origins', () => {
  assert.equal(isAllowedLocalOrigin('http://localhost:4321'), true);
  assert.equal(isAllowedLocalOrigin('http://127.0.0.1:4321'), true);
  assert.equal(isAllowedLocalOrigin('https://localhost:4321'), false);
  assert.equal(isAllowedLocalOrigin('http://localhost:3000'), false);
  assert.equal(isAllowedLocalOrigin('https://attacker.invalid'), false);
  assert.equal(isAllowedLocalOrigin(undefined), false);
});
