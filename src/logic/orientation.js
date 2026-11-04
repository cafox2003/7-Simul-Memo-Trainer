export function swapSides(state, flipType = 'x2') {
  const s = [...state];
  const r = [...state];
  const inv = v => (12 - v) % 12;
  if (flipType === 'y2') {
    r[0] = inv(s[2]); r[2] = inv(s[0]);
    r[6] = inv(s[8]); r[8] = inv(s[6]);
    r[1] = s[13]; r[3] = s[12]; r[4] = s[11]; r[5] = s[10]; r[7] = s[9];
    r[9] = s[7]; r[10] = s[5]; r[11] = s[4]; r[12] = s[3]; r[13] = s[1];
  } else {
    r[0] = inv(s[6]); r[2] = inv(s[8]);
    r[6] = inv(s[0]); r[8] = inv(s[2]);
    r[1] = s[9]; r[3] = s[10]; r[4] = s[11]; r[5] = s[12]; r[7] = s[13];
    r[9] = s[1]; r[10] = s[3]; r[11] = s[4]; r[12] = s[5]; r[13] = s[7];
  }
  return r;
}

// Apply counter-clockwise quarter turns as viewed from the front (so z is
// turns = -1). The five back dials are stored in top/left/center/right/bottom order.
export function rotateClockState(state, turns = 1) {
  let result = [...state];
  for (let turn = 0; turn < ((turns % 4) + 4) % 4; turn++) {
    const next = [...result];
    [0, 1, 2, 3, 4, 5, 6, 7, 8].forEach((to, i) => {
      next[to] = result[[2, 5, 8, 1, 4, 7, 0, 3, 6][i]];
    });
    [9, 10, 11, 12, 13].forEach((to, i) => {
      next[to] = result[[10, 13, 11, 9, 12][i]];
    });
    result = next;
  }
  return result;
}

function transformFromFunction(apply) {
  const sources = Array(14);
  const signs = Array(14);
  for (let source = 0; source < 14; source++) {
    const probe = Array(14).fill(0);
    probe[source] = 1;
    const output = apply(probe);
    const target = output.findIndex(value => value !== 0);
    sources[target] = source;
    signs[target] = output[target] === 1 ? 1 : -1;
  }
  return { sources, signs };
}

export const IDENTITY_ORIENTATION = Object.freeze({
  sources: Object.freeze(Array.from({ length: 14 }, (_, i) => i)),
  signs: Object.freeze(Array(14).fill(1)),
});

const ORIENTATION_GENERATORS = {
  x2: transformFromFunction(state => swapSides(state, 'x2')),
  y2: transformFromFunction(state => swapSides(state, 'y2')),
  // Screen-frame moves; z is clockwise as seen from the front (WCA).
  z: transformFromFunction(state => rotateClockState(state, -1)),
  "z'": transformFromFunction(state => rotateClockState(state)),
};

export function orientationGenerator(move) {
  const generator = ORIENTATION_GENERATORS[move];
  if (!generator) throw new Error(`Unknown orientation move: ${move}`);
  return generator;
}

// Returns left ∘ right: apply right first, then left.
export function composeOrientations(left, right) {
  const sources = Array(14);
  const signs = Array(14);
  for (let i = 0; i < 14; i++) {
    const intermediate = left.sources[i];
    sources[i] = right.sources[intermediate];
    signs[i] = left.signs[i] * right.signs[intermediate];
  }
  return { sources, signs };
}

export function invertOrientation(orientation) {
  const sources = Array(14);
  const signs = Array(14);
  for (let output = 0; output < 14; output++) {
    const input = orientation.sources[output];
    sources[input] = output;
    signs[input] = orientation.signs[output];
  }
  return { sources, signs };
}

export function deriveCommittedOrientation(totalOrientation, viewOrientation) {
  return composeOrientations(invertOrientation(viewOrientation), totalOrientation);
}

export function applyOrientation(state, orientation) {
  return orientation.sources.map((source, i) =>
    ((orientation.signs[i] * state[source]) % 12 + 12) % 12,
  );
}

const sameOrientation = (a, b) =>
  a.sources.every((source, i) => source === b.sources[i] && a.signs[i] === b.signs[i]);

// Clockwise quarter turns t with orientation = z^t ∘ base, or undefined if none.
export function zTurnsOf(orientation, base = IDENTITY_ORIENTATION) {
  let candidate = base;
  for (let t = 0; t < 4; t++) {
    if (sameOrientation(candidate, orientation)) return t;
    candidate = composeOrientations(ORIENTATION_GENERATORS.z, candidate);
  }
  return undefined;
}
