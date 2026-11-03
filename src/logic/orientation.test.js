import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  checkPinOrder, computeMemoForPairs, DEFAULT_PIN_ORDERS, LETTER_MAPS, scrambleconvert,
} from './clockLogic.js';
import {
  IDENTITY_ORIENTATION, applyOrientation, composeOrientations,
  deriveCommittedOrientation, invertOrientation, orientationGenerator,
} from './orientation.js';

const scrambleText = 'UR3- DR5+ DL4+ UL2- U6+ R2+ D2- L4+ ALL5- y2 U6+ R5- D3+ L6+ ALL3-';
const scrambleState = scrambleconvert(scrambleText);
const pinOrder = checkPinOrder(DEFAULT_PIN_ORDERS.Tommy);
const order = [pinOrder[0].split(' '), pinOrder[1].split(' '), pinOrder[2]];
const checkedPairs = ['dl', 'R', String.fromCharCode(92)];
const letterMap = LETTER_MAPS.letters;

function composeSequence(moves) {
  return moves.reduce(
    (orientation, move) => composeOrientations(orientationGenerator(move), orientation),
    IDENTITY_ORIENTATION,
  );
}

function memoForTommy(moves) {
  const baseState = applyOrientation(
    // Tommy's fixed memo base is the side-swapped state.
    scrambleState,
    orientationGenerator('x2'),
  );
  const orientedState = applyOrientation(baseState, composeSequence(moves));
  const memo = computeMemoForPairs(orientedState, order, 'Tommy', letterMap, checkedPairs, false, false);
  const chars = memo.replaceAll(' ', '');
  const withDefaultM3M4Swap = chars.slice(0, 2) + chars[3] + chars[2] + chars.slice(4);
  return withDefaultM3M4Swap.match(/.{1,2}/g).join('-');
}

test('orientation generators reproduce the reference Tommy memos', () => {
  assert.equal(memoForTommy([]), 'FJ-GL-IA');
  assert.equal(memoForTommy(['z']), 'FL-CI-EE');
  assert.equal(memoForTommy(['z', 'z']), 'CF-CD-IA');
  assert.equal(memoForTommy(["z'"]), 'GF-KK-EE');
  assert.equal(memoForTommy(['x2']), 'GD-HI-KC');
  assert.equal(memoForTommy(['x2', 'z']), 'DG-CI-GG');
  assert.equal(memoForTommy(['x2', 'z', 'z']), 'AC-LE-KC');
  assert.equal(memoForTommy(['x2', "z'"]), 'FL-AA-GG');
});

test('flip conjugates z direction in the orientation group', () => {
  const x2zx2 = composeSequence(['x2', 'z', 'x2']);
  assert.deepEqual(x2zx2, orientationGenerator("z'"));
});

test('a view-only flip leaves a previously committed z unchanged', () => {
  const total = composeOrientations(orientationGenerator('x2'), orientationGenerator('z'));
  const view = orientationGenerator('x2');
  assert.deepEqual(deriveCommittedOrientation(total, view), orientationGenerator('z'));
});

test('a committed z after a view-only flip is conjugated into screen coordinates', () => {
  const view = orientationGenerator('x2');
  const total = composeOrientations(orientationGenerator('z'), view);
  assert.deepEqual(deriveCommittedOrientation(total, view), orientationGenerator("z'"));
});

test('orientation inverses undo the full transform', () => {
  const moves = ['x2', 'z', 'y2', "z'"];
  const orientation = composeSequence(moves);
  const restored = composeOrientations(invertOrientation(orientation), orientation);
  assert.deepEqual(restored, IDENTITY_ORIENTATION);
});
