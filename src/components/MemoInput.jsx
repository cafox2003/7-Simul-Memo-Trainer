import React from 'react';

export default function MemoInput({
  letterMap,
  memo,
  onLetter,
  onCheck,
  onScramble,
  onDelete,
  onCopyScramble,
  showButtons,
  executionMode,
  timer,
  timerEnabled,
  onRotate,
}) {
  // Rotate labels: shift first element to last (so "L" appears after K)
  const rotatedLabels = [...letterMap.slice(1), letterMap[0]];

  const columns = executionMode ? 'two-columns' : 'six-columns';
  const maxWidth = executionMode ? '300px' : '400px';
  const gap = executionMode ? '10px 50px' : '10px';

  const letterButtons = rotatedLabels.map((letter, i) => (
    <button key={i} onClick={() => onLetter(letter)}>
      {letter}
    </button>
  ));

  const rotationButtons = (
    <div className="rotation-controls" aria-label="Clock rotation controls">
      <button type="button" aria-label="Rotate z prime" onClick={() => onRotate("z'")}>← <small>z′</small></button>
      <button type="button" aria-label="Rotate y2" onClick={() => onRotate('y2')}>↓ <small>y2</small></button>
      <button type="button" aria-label="Rotate x2" onClick={() => onRotate('x2')}>↑ <small>x2</small></button>
      <button type="button" aria-label="Rotate z" onClick={() => onRotate('z')}>→ <small>z</small></button>
    </div>
  );

  if (executionMode) {
    return (
      <div
        id="letterButtons"
        className={columns}
        style={{ display: showButtons ? 'grid' : 'none', maxWidth, gap }}
      >
        <button onClick={onScramble}>🔀</button>
        {rotationButtons}
        {!showButtons && timerEnabled && (
          <p id="timer" style={{ display: 'block', gridColumn: '2' }}>
            {timer}
          </p>
        )}
        {!showButtons && <button onClick={onCopyScramble}>📋</button>}
      </div>
    );
  }

  return (
    <div
      id="letterButtons"
      className={columns}
      style={{ display: showButtons ? 'grid' : 'none', maxWidth, gap }}
    >
      {letterButtons}
      <button onClick={onCheck}>✓</button>
      <button onClick={onScramble}>🔀</button>
      <button onClick={onDelete}>⌫</button>
      <button onClick={onCopyScramble}>📋</button>
      {timerEnabled && (
        <p id="timer" style={{ display: 'block', gridColumn: '5 / span 2' }}>
          {timer}
        </p>
      )}
      {rotationButtons}
    </div>
  );
}
