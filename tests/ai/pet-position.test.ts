import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampPetPosition,
  normalizePetY,
  restorePetPosition,
  snapPetEdge,
} from '../../src/components/ai/pet-position.ts';

test('pet movement clamps into the header and bottom-control safe area', () => {
  assert.deepEqual(clampPetPosition({ x: -40, y: 999 }, { width: 390, height: 844, petSize: 82 }), {
    x: 20,
    y: 660,
  });
});

test('pet snaps to the nearest edge and stores normalized vertical position', () => {
  assert.equal(snapPetEdge(40, 390, 82), 'left');
  assert.equal(snapPetEdge(300, 390, 82), 'right');
  assert.equal(normalizePetY(378, { width: 390, height: 844, petSize: 82 }), 0.5);
});

test('stored pet position restores responsively on another viewport', () => {
  assert.deepEqual(
    restorePetPosition(
      { edge: 'left', normalizedY: 0.5 },
      { width: 1200, height: 900, petSize: 82 },
    ),
    { edge: 'left', x: 20, y: 406 },
  );
});
