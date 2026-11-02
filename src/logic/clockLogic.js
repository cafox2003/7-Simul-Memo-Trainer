import matricesData from './matrices.json';
import pinOrdersData from './pinOrders.json';

export const matrices = matricesData;
export const pinOrders = pinOrdersData;

export function checkPinOrder(input) {
  const sortedInput = input.split(' ').slice().sort();
  for (const i of pinOrders) {
    const sortedOrder = i.split(' ').slice().sort();
    if (sortedOrder.every((el, idx) => el === sortedInput[idx])) {
      return [input, i, pinOrders.indexOf(i)];
    }
  }
  return false;
}

export function formatScramble(num) {
  if (num < 0) return Math.abs(num) + '-';
  return num + '+';
}

export function generateScrambleText() {
  return (
    `UR${formatScramble(Math.floor(Math.random() * 12) - 5)} ` +
    `DR${formatScramble(Math.floor(Math.random() * 12) - 5)} ` +
    `DL${formatScramble(Math.floor(Math.random() * 12) - 5)} ` +
    `UL${formatScramble(Math.floor(Math.random() * 12) - 5)} ` +
    `U${formatScramble(Math.floor(Math.random() * 12) - 5)} ` +
    `R${formatScramble(Math.floor(Math.random() * 12) - 5)} ` +
    `D${formatScramble(Math.floor(Math.random() * 12) - 5)} ` +
    `L${formatScramble(Math.floor(Math.random() * 12) - 5)} ` +
    `ALL${formatScramble(Math.floor(Math.random() * 12) - 5)} y2 ` +
    `U${formatScramble(Math.floor(Math.random() * 12) - 5)} ` +
    `R${formatScramble(Math.floor(Math.random() * 12) - 5)} ` +
    `D${formatScramble(Math.floor(Math.random() * 12) - 5)} ` +
    `L${formatScramble(Math.floor(Math.random() * 12) - 5)} ` +
    `ALL${formatScramble(Math.floor(Math.random() * 12) - 5)}`
  );
}

function parseOpDelta(opStr) {
  // opStr is like "5+" or "3-" (digit then sign); reverse gives "+5" or "-3"
  return parseInt(opStr.split('').reverse().join(''), 10);
}

function applyMove(n, indices, opStr) {
  const delta = parseOpDelta(opStr);
  for (const idx of indices) n[idx] += delta;
}

function applyMoveInverse(n, indices, opStr) {
  const delta = parseOpDelta(opStr);
  for (const idx of indices) n[idx] -= delta;
}

export function scrambleconvert(s) {
  const n = [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12];
  const parts = s.split('y2');
  const afterY2 = parts[1];
  const beforeY2 = parts[0];

  for (const i of afterY2.split(' ')) {
    if (i.length === 2) continue;
    if (i.includes('ALL')) {
      applyMove(n, [0,1,2,3,4,5,6,7,8], i.split('ALL')[1]);
    } else if (i.includes('UL')) {
      applyMove(n, [0,1,3,4], i.split('UL')[1]);
    } else if (i.includes('UR')) {
      applyMove(n, [1,2,4,5], i.split('UR')[1]);
    } else if (i.includes('DL')) {
      applyMove(n, [3,4,6,7], i.split('DL')[1]);
    } else if (i.includes('DR')) {
      applyMove(n, [4,5,7,8], i.split('DR')[1]);
    } else if (i.includes('U')) {
      applyMove(n, [0,1,2,3,4,5], i.split('U')[1]);
    } else if (i.includes('L')) {
      applyMove(n, [0,1,3,4,6,7], i.split('L')[1]);
    } else if (i.includes('R')) {
      applyMove(n, [1,2,4,5,7,8], i.split('R')[1]);
    } else if (i.includes('D')) {
      applyMove(n, [3,4,5,6,7,8], i.split('D')[1]);
    }
  }

  for (const i of beforeY2.split(' ')) {
    if (i.includes('ALL')) {
      applyMove(n, [9,10,11,12,13], i.split('ALL')[1]);
      applyMoveInverse(n, [0,2,6,8], i.split('ALL')[1]);
    } else if (i.includes('UL')) {
      applyMove(n, [11,12,13], i.split('UL')[1]);
      applyMoveInverse(n, [2], i.split('UL')[1]);
    } else if (i.includes('UR')) {
      applyMove(n, [10,11,13], i.split('UR')[1]);
      applyMoveInverse(n, [0], i.split('UR')[1]);
    } else if (i.includes('DL')) {
      applyMove(n, [9,11,12], i.split('DL')[1]);
      applyMoveInverse(n, [8], i.split('DL')[1]);
    } else if (i.includes('DR')) {
      applyMove(n, [9,10,11], i.split('DR')[1]);
      applyMoveInverse(n, [6], i.split('DR')[1]);
    } else if (i.includes('U')) {
      applyMove(n, [10,11,12,13], i.split('U')[1]);
      applyMoveInverse(n, [0,2], i.split('U')[1]);
    } else if (i.includes('L')) {
      applyMove(n, [9,11,12,13], i.split('L')[1]);
      applyMoveInverse(n, [2,8], i.split('L')[1]);
    } else if (i.includes('R')) {
      applyMove(n, [9,10,11,13], i.split('R')[1]);
      applyMoveInverse(n, [0,6], i.split('R')[1]);
    } else if (i.includes('D')) {
      applyMove(n, [9,10,11,12], i.split('D')[1]);
      applyMoveInverse(n, [6,8], i.split('D')[1]);
    }
  }

  return n.map(num => (num + 144) % 12);
}

export function convertToBPaulIfNeeded(realMemo, simultype) {
  if (simultype === 'BPaul') {
    realMemo = realMemo[1] + realMemo[0] + realMemo.slice(2);
    realMemo = realMemo.slice(0, 4) + realMemo.slice(5);
    realMemo = realMemo.slice(0, 8) + realMemo.slice(9);
    realMemo = realMemo.replace(/\s/g, '');
    realMemo = realMemo.match(/.{1,2}/g).join(' ');
    realMemo = realMemo + ' ';
    return realMemo;
  }
  return realMemo;
}

export function swapSides(state, flipType = 'x2') {
  const s = [...state];
  const r = [...state];
  const inv = v => (12 - v) % 12;
  if (flipType === 'y2') {
    // Y2: left-right corner swap with inversion
    r[0] = inv(s[2]); r[2] = inv(s[0]);
    r[6] = inv(s[8]); r[8] = inv(s[6]);
    // Centers: [1,3,4,5,7] ↔ pins [13,12,11,10,9]
    r[1] = s[13]; r[3] = s[12]; r[4] = s[11]; r[5] = s[10]; r[7] = s[9];
    r[9] = s[7];  r[10] = s[5]; r[11] = s[4]; r[12] = s[3]; r[13] = s[1];
  } else {
    // X2: top-bottom corner swap with inversion
    r[0] = inv(s[6]); r[2] = inv(s[8]);
    r[6] = inv(s[0]); r[8] = inv(s[2]);
    // Centers: [1,3,4,5,7] ↔ pins [9,10,11,12,13]
    r[1] = s[9];  r[3] = s[10]; r[4] = s[11]; r[5] = s[12]; r[7] = s[13];
    r[9] = s[1];  r[10] = s[3]; r[11] = s[4]; r[12] = s[5]; r[13] = s[7];
  }
  return r;
}

// Rotate the clock state clockwise as viewed from the front. The five back
// dials are stored in top/left/center/right/bottom order.
export function rotateClockState(state, turns = 1) {
  let result = [...state];
  for (let turn = 0; turn < ((turns % 4) + 4) % 4; turn++) {
    const next = [...result];
    [0, 1, 2, 3, 4, 5, 6, 7, 8].forEach((to, i) => {
      next[to] = result[[6, 3, 0, 7, 4, 1, 8, 5, 2][i]];
    });
    [9, 10, 11, 12, 13].forEach((to, i) => {
      next[to] = result[[12, 9, 11, 13, 10][i]];
    });
    result = next;
  }
  return result;
}

export function computeMemoForPairs(random, order, simultype, letterMap, checkedPairs, umoveLeft, dmoveLeft) {
  let realMemo = '';
  for (const i of order[0]) {
    if (!checkedPairs.includes(i)) continue;
    let c = 0;
    let c2 = 0;
    for (let z = 0; z < 14; z++) {
      c += random[z] * Number(matrices[order[2]][order[1].indexOf(i) * 2][z]);
      c2 += random[z] * Number(matrices[order[2]][order[1].indexOf(i) * 2 + 1][z]);
    }
    const reverseLetters = ['ur', 'dr', 'UL', 'DL', 'L', '\\'].includes(i) ||
      (i === 'U' && umoveLeft) ||
      (i === 'D' && dmoveLeft);
    if (reverseLetters) {
      realMemo += letterMap[(c + 144) % 12] + letterMap[(c2 + 144) % 12] + ' ';
    } else {
      realMemo += letterMap[(c2 + 144) % 12] + letterMap[(c + 144) % 12] + ' ';
    }
  }
  return convertToBPaulIfNeeded(realMemo, simultype);
}

export const LETTER_MAPS = {
  letters: ['L', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'],
  ryan:    ['0', '1', '2', '3', '4', '5', '6', 'E', 'D', 'C', 'B', 'A'],
  tommy:   ['O', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'],
};

export const DEFAULT_PIN_ORDERS = {
  BPaul: 'dl R DR ur L UL \\',
  Tommy: 'dl R DR \\ UL L ur',
};
