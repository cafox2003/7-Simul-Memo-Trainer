import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  checkPinOrder, computeMemoForPairs, DEFAULT_PIN_ORDERS, LETTER_MAPS, scrambleconvert,
} from './clockLogic.js';
import {
  IDENTITY_ORIENTATION, applyOrientation, composeOrientations,
  deriveCommittedOrientation, invertOrientation, orientationGenerator, swapSides, zTurnsOf,
} from './orientation.js';

const scrambleText = 'UR3- DR5+ DL4+ UL2- U6+ R2+ D2- L4+ ALL5- y2 U6+ R5- D3+ L6+ ALL3-';
const scrambleState = scrambleconvert(scrambleText);
const letterMap = LETTER_MAPS.letters;

function composeSequence(moves) {
  return moves.reduce(
    (orientation, move) => composeOrientations(orientationGenerator(move), orientation),
    IDENTITY_ORIENTATION,
  );
}

// Same steps as App.getMemo: orient the scramble as shown on screen, then
// Tommy reads it from the back while BPaul reads the front.
function memoFor(sim, moves) {
  const pinOrder = checkPinOrder(DEFAULT_PIN_ORDERS[sim]);
  const order = [pinOrder[0].split(' '), pinOrder[1].split(' '), pinOrder[2]];
  const pairs = sim === 'Tommy' ? ['dl', 'R', String.fromCharCode(92)] : order[0];
  const shown = applyOrientation(scrambleState, composeSequence(moves));
  const memo = computeMemoForPairs(sim === 'BPaul' ? shown : swapSides(shown), order, sim, letterMap, pairs, false, false);
  let chars = memo.replaceAll(' ', '');
  if (sim === 'Tommy') chars = chars.slice(0, 2) + chars[3] + chars[2] + chars.slice(4);
  return chars.match(/.{1,2}/g).join('-');
}
const memoForTommy = moves => memoFor('Tommy', moves);

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

test('z is a clockwise screen turn', () => {
  // Top-right dial value moves to the bottom-right position.
  const state = Array.from({ length: 14 }, (_, i) => i);
  assert.equal(applyOrientation(state, orientationGenerator('z'))[8], 2);
});

test('sequences that reach the same orientation give the same memo in both methods', () => {
  const pairs = [
    [['x2', 'z', 'x2'], ["z'"]],
    [['z', 'x2'], ['x2', "z'"]],
    [['z', 'y2'], ['x2', "z'", 'z', 'z']],
    [['y2'], ['x2', 'z', 'z']],
    [["z'", 'y2', 'z', 'x2'], []],
  ];
  for (const sim of ['Tommy', 'BPaul']) {
    for (const [a, b] of pairs) assert.equal(memoFor(sim, a), memoFor(sim, b), `${sim}: ${a} vs ${b}`);
  }
  // A z turn must change the memo in the same direction for both methods.
  assert.notEqual(memoFor('BPaul', ['z']), memoFor('BPaul', ["z'"]));
});

test('every orientation can be drawn as a turned front or turned x2 back', () => {
  const x2 = orientationGenerator('x2');
  for (const moves of [[], ['z'], ['x2', 'z', 'x2'], ['z', 'y2'], ['y2', "z'", 'x2', 'z'], ['x2', 'z', 'y2']]) {
    const total = composeSequence(moves);
    const turns = zTurnsOf(total) ?? zTurnsOf(total, x2);
    assert.notEqual(turns, undefined, String(moves));
  }
  // x2 z x2 is z': the front must be drawn turned counter-clockwise, not clockwise.
  assert.equal(zTurnsOf(composeSequence(['x2', 'z', 'x2'])), 3);
  assert.equal(zTurnsOf(orientationGenerator('x2')), undefined);
});
