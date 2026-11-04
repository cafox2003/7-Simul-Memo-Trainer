import React, { useState, useEffect, useMemo, useRef } from 'react';
import Clock from './components/Clock';
import MemoInput from './components/MemoInput';
import Stats from './components/Stats';
import Toast from './components/Toast';
import {
  checkPinOrder, generateScrambleText, scrambleconvert,
  computeMemoForPairs, swapSides, LETTER_MAPS, DEFAULT_PIN_ORDERS,
} from './logic/clockLogic';
import {
  IDENTITY_ORIENTATION, applyOrientation, composeOrientations,
  deriveCommittedOrientation, orientationGenerator, zTurnsOf,
} from './logic/orientation';
import { celebrate } from './logic/celebration';
import {
  loadStats, addStatRow, deleteStatAt, clearStats, computeInstantStats,
  exportStatsCsv, isPracticeMode, setPracticeMode, isTrainerMode, setTrainerMode,
  getActiveSession, setActiveSession, NUM_STAT_SESSIONS,
  getInputLetterType, setInputLetterType, getCustomChars, setCustomChars, getTimerPref, setTimerPref,
  getHideHourIndicators, setHideHourIndicators,
  getCustomPinOrder, setCustomPinOrder, getSavedCheckedPairs, setSavedCheckedPairs,
  getSwapM3M4, setSwapM3M4Pref,
} from './logic/storage';
import './App.css';

function getSimulTypeFromURL() {
  const params = new URLSearchParams(window.location.search);
  const type = (params.get('type') || 'tommy').toLowerCase();
  if (type === 'custom') return 'Custom';
  return type === 'bpaul' ? 'BPaul' : 'Tommy';
}

function getFlipTypeForSimul(simultype) {
  return simultype === 'BPaul' ? 'y2' : 'x2';
}

function getPinOrderStrForSimultype(simultype) {
  if (simultype === 'BPaul') return DEFAULT_PIN_ORDERS.BPaul;
  if (simultype === 'Custom') return getCustomPinOrder() || DEFAULT_PIN_ORDERS.Tommy;
  return DEFAULT_PIN_ORDERS.Tommy;
}

function getDefaultCheckedPairs(pinOrderStr, simultype) {
  const items = pinOrderStr.split(' ');
  if (simultype === 'Tommy') {
    return items.filter(item => ['dl', 'R', '\\'].includes(item));
  }
  return items.filter(item => ['dl', 'R', 'ur', 'L'].includes(item));
}

const ZERO_RANDOM = [0,0,0,0,0,0,0,0,0,0,0,0,0,0];

function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="help-wrapper" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} style={{ position: 'relative', top: '-1px' }}>
      <button className="help-btn" tabIndex={-1} style={{ width: '1.1rem', height: '1.1rem', fontSize: '0.7rem' }}>?</button>
      {open && <div className="help-popup" style={{ fontSize: '0.8rem', width: '1250px', right: 'auto', left: 0 }}>{text}</div>}
    </span>
  );
}

function HelpPopup() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <span className="help-wrapper" ref={ref}>
      <button className="help-btn" onClick={() => setOpen(v => !v)} aria-label="Help">?</button>
      {open && (
        <div className="help-popup">
          <b>How to use</b>
          Scramble the clock and enter your memo starting from the face shown, flipping the puzzle as needed. Open <strong style={{ display: 'inline' }}>Settings</strong> to customise your memo input characters and more. Your solve history is in the <strong style={{ display: 'inline' }}>Stats Settings</strong>, where you can switch between multiple sessions to track different practice sets.
          <b>Controls</b>
          <span><strong style={{ display: 'inline' }}>Space / Click Clock:</strong> Commit before memo; view afterward</span><br />
          <span><strong style={{ display: 'inline' }}>↑ / ↓:</strong> x2 / y2</span><br />
          <span><strong style={{ display: 'inline' }}>← / →:</strong> z / z′</span><br />
          <span>Arrow rotations commit before memo entry and view after typing starts.</span><br />
          <span><strong style={{ display: 'inline' }}>Enter / ✓:</strong> Check Memo</span><br />
          <span><strong style={{ display: 'inline' }}>S / 🔀:</strong> Scramble</span><br />
          <span><strong style={{ display: 'inline' }}>Backspace / ⌫:</strong> Delete</span><br />
          <span><strong style={{ display: 'inline' }}>📋 / Click Scramble:</strong> Copy</span>
        </div>
      )}
    </span>
  );
}

export default function App() {
  const isMobile = /android|iphone|kindle|ipad/i.test(navigator.userAgent);

  const initSimultype = getSimulTypeFromURL();
  const initPinOrderStr = getPinOrderStrForSimultype(initSimultype);
  const initPinOutput = checkPinOrder(initPinOrderStr);
  const initOrder = initPinOutput
    ? [initPinOutput[0].split(' '), initPinOutput[1].split(' '), initPinOutput[2]]
    : null;

  const [simultype, setSimultype] = useState(initSimultype);
  const [inputType, setInputType] = useState(() => getInputLetterType());
  const [customChars, setCustomCharsState] = useState(() => getCustomChars());
  const [executionMode, setExecutionMode] = useState(() => isTrainerMode());
  const timerEnabled = true;
  const [hideHourIndicatorsState, setHideHourIndicatorsState] = useState(() => getHideHourIndicators());
  const [swapM3M4, setSwapM3M4] = useState(() => getSwapM3M4());
  const [practiceMode, setPracticeModeState] = useState(() => isPracticeMode());
  const [flipType, setFlipType] = useState(() => getFlipTypeForSimul(initSimultype));

  const [totalOrientation, setTotalOrientation] = useState(IDENTITY_ORIENTATION);
  const [viewOrientation, setViewOrientation] = useState(IDENTITY_ORIENTATION);
  const [random, setRandom] = useState(ZERO_RANDOM);
  const [scrambletext, setScrambletext] = useState('');
  const previousScrambleRef = useRef('');
  const hasCheckedRef = useRef(false);
  const [memo, setMemo] = useState('');
  const [checkResult, setCheckResult] = useState({ text: 'Enter Memo', color: 'white' });
  const [memoDisplay, setMemoDisplay] = useState('Memo: ');
  const [memoColorData, setMemoColorData] = useState(null); // { userMemo, realMemo } | null

  const [pinOrderStr, setPinOrderStr] = useState(initPinOrderStr);
  const [order, setOrder] = useState(initOrder);
  const [checkedPairs, setCheckedPairs] = useState(() => {
    if (initSimultype === 'Custom') return getSavedCheckedPairs() ?? getDefaultCheckedPairs(initPinOrderStr, initSimultype);
    return getDefaultCheckedPairs(initPinOrderStr, initSimultype);
  });
  const [umoveLeft, setUmoveLeft] = useState(false);
  const [dmoveLeft, setDmoveLeft] = useState(false);
  const [showCustomPin, setShowCustomPin] = useState(initSimultype === 'Custom');

  const [toastMsg, setToastMsg] = useState('');
  function toast(msg) { setToastMsg(msg); }

  const [showInputButtons, setShowInputButtons] = useState(isMobile);
  const [showMoreSettings, setShowMoreSettings] = useState(false);
  const [showStatSettings, setShowStatSettings] = useState(false);
  const settingsBodyRef = useRef(null);
  const statSettingsBodyRef = useRef(null);

  useEffect(() => {
    if (showMoreSettings && settingsBodyRef.current) {
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 125);
    }
  }, [showMoreSettings]);

  useEffect(() => {
    if (showStatSettings && statSettingsBodyRef.current) {
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 125);
    }
  }, [showStatSettings]);

  const [activeSession, setActiveSessionState] = useState(() => getActiveSession());
  const [stats, setStats] = useState(() => computeInstantStats());
  const [statRows, setStatRows] = useState(() => loadStats());

  const [timerDisplay, setTimerDisplay] = useState('0.00');
  const timerRef = useRef({ isRunning: false, startTime: 0, raf: null, seconds: 0 });

  function timerFrame() {
    if (!timerRef.current.isRunning) return;
    const elapsed = (performance.now() - timerRef.current.startTime) / 1000;
    timerRef.current.seconds = Math.min(elapsed, 999.99);
    setTimerDisplay(timerRef.current.seconds.toFixed(2));
    if (timerRef.current.seconds < 999.99) {
      timerRef.current.raf = requestAnimationFrame(timerFrame);
    }
  }

  function startTimer() {
    if (timerRef.current.isRunning) return;
    timerRef.current.isRunning = true;
    timerRef.current.startTime = performance.now() - timerRef.current.seconds * 1000;
    timerRef.current.raf = requestAnimationFrame(timerFrame);
  }

  function stopTimer() {
    if (!timerRef.current.isRunning) return;
    cancelAnimationFrame(timerRef.current.raf);
    timerRef.current.isRunning = false;
  }

  function resetTimer() {
    cancelAnimationFrame(timerRef.current.raf);
    timerRef.current.isRunning = false;
    timerRef.current.seconds = 0;
    setTimerDisplay('0.00');
  }

  function restartTimer(delay = 0) {
    resetTimer();
    if (delay > 0) {
      setTimeout(startTimer, delay);
    } else {
      startTimer();
    }
  }

  const effectiveChars = customChars.length >= 12 ? customChars : 'ABCDEFGHIJKL';
  const letterMap = useMemo(() => {
    const chars = effectiveChars.padEnd(12, ' ').slice(0, 12).split('');
    return [chars[11], ...chars.slice(0, 11)];
  }, [effectiveChars]);

  // rnd is the scramble as seen on screen (already oriented); Tommy/Custom then read it from the back.
  function getMemo(rnd, ord, sim, lm, pairs, uL, dL, swap = swapM3M4) {
    if (!ord || pairs.length === 0) return '';
    const state = sim === 'BPaul' ? rnd : swapSides(rnd);
    let memo = computeMemoForPairs(state, ord, sim, lm, pairs, uL, dL);
    if (swap && sim !== 'BPaul' && memo.length >= 5) {
      const chars = memo.replace(/ /g, '');
      const swapped = chars.slice(0, 2) + chars[3] + chars[2] + chars.slice(4);
      memo = swapped.match(/.{1,2}/g).join(' ') + ' ';
    }
    return memo;
  }

  function resetOrientation() {
    stateRef.current.totalOrientation = IDENTITY_ORIENTATION;
    stateRef.current.viewOrientation = IDENTITY_ORIENTATION;
    stateRef.current.committedOrientation = IDENTITY_ORIENTATION;
    setTotalOrientation(IDENTITY_ORIENTATION);
    setViewOrientation(IDENTITY_ORIENTATION);
  }

  function rotate({ rotation, commit = !stateRef.current.memo.length || hasCheckedRef.current }) {
    const actionTransform = orientationGenerator(rotation);
    const nextTotalOrientation = composeOrientations(actionTransform, stateRef.current.totalOrientation);
    const nextViewOrientation = commit
      ? stateRef.current.viewOrientation
      : composeOrientations(actionTransform, stateRef.current.viewOrientation);
    const nextCommittedOrientation = deriveCommittedOrientation(nextTotalOrientation, nextViewOrientation);
    stateRef.current.totalOrientation = nextTotalOrientation;
    stateRef.current.viewOrientation = nextViewOrientation;
    stateRef.current.committedOrientation = nextCommittedOrientation;
    setTotalOrientation(nextTotalOrientation);
    if (!commit) setViewOrientation(nextViewOrientation);

    if (stateRef.current.executionMode) {
      const currentMemo = getMemo(
        applyOrientation(stateRef.current.random, nextCommittedOrientation),
        stateRef.current.order,
        stateRef.current.simultype,
        stateRef.current.letterMap,
        stateRef.current.checkedPairs,
        stateRef.current.umoveLeft,
        stateRef.current.dmoveLeft,
        stateRef.current.swapM3M4,
      );
      setMemoDisplay('Memo: ' + currentMemo);
    }
  }

  // The clock is drawn from the true orientation: the white face turned, or the
  // back (x2 view) turned. The marker shows the memo's up edge, so it follows the view only.
  const side = zTurnsOf(totalOrientation) === undefined ? 'black' : 'white';
  const clockTurns = zTurnsOf(totalOrientation, side === 'black' ? orientationGenerator('x2') : undefined);
  const markerTurns = zTurnsOf(viewOrientation);

  const stateRef = useRef({});
  stateRef.current = {
    executionMode, memo, random, order, simultype, letterMap, checkedPairs,
    umoveLeft, dmoveLeft, scrambletext, timerEnabled, flipType, side, customChars, swapM3M4,
    totalOrientation, viewOrientation,
    committedOrientation: deriveCommittedOrientation(totalOrientation, viewOrientation),
  };

  function doScramble(rnd, sctext, execMode, ord, sim, lm, pairs, uL, dL, timerOn) {
    hasCheckedRef.current = false;
    setCheckResult({ text: execMode ? 'Execution Trainer Mode' : 'Enter Memo', color: 'white' });
    setMemoColorData(null);
    setMemo('');
    resetOrientation();
    setScrambletext(sctext);
    setRandom(rnd);
    if (!execMode) {
      setMemoDisplay('Memo: ');
    } else {
      const m = getMemo(rnd, ord, sim, lm, pairs, uL, dL);
      setMemoDisplay('Memo: ' + m);
    }
    if (timerOn) restartTimer(800);
  }

  function scramble() {
    const s = stateRef.current;
    if (s.customChars.length < 12) {
      const defaultChars = 'ABCDEFGHIJKL';
      setCustomCharsState(defaultChars);
      setCustomChars(defaultChars);
    }
    const sctext = generateScrambleText();
    const rnd = scrambleconvert(sctext);
    doScramble(rnd, sctext, s.executionMode, s.order, s.simultype, s.letterMap, s.checkedPairs, s.umoveLeft, s.dmoveLeft, s.timerEnabled);
  }

  function enterScramble() {
    const entered = prompt('Enter Scramble:');
    if (!entered) return;
    hasCheckedRef.current = false;
    const rnd = scrambleconvert(entered);
    const s = stateRef.current;
    setRandom(rnd);
    resetOrientation();
    setScrambletext(entered);
    if (!s.executionMode) {
      setMemoDisplay('Memo: ');
    } else {
      const m = getMemo(rnd, s.order, s.simultype, s.letterMap, s.checkedPairs, s.umoveLeft, s.dmoveLeft);
      setMemoDisplay('Memo: ' + m);
    }
    restartTimer(800);
  }

  function checkMemo() {
    const s = stateRef.current;
    if (!s.memo || hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    const realMemo = getMemo(applyOrientation(s.random, s.committedOrientation), s.order, s.simultype, s.letterMap, s.checkedPairs, s.umoveLeft, s.dmoveLeft, s.swapM3M4);
    const isCorrect = s.memo === realMemo;

    if (isCorrect) {
      setCheckResult({ text: 'Correct!', color: 'green' });
      setMemoColorData(null);
      celebrate();
    } else {
      setCheckResult({ text: `Correct memo: ${realMemo}`, color: 'white' });
      setMemoColorData({ userMemo: s.memo, realMemo });
    }

    if (previousScrambleRef.current !== s.scrambletext && !isPracticeMode()) {
      addStatRow({
        timestamp: new Date().toLocaleString(),
        pinorder: s.simultype === 'Custom' ? pinOrderStr : s.simultype,
        time_seconds: s.timerEnabled ? Number(timerRef.current.seconds.toFixed(2)) : '',
        correct_memo: realMemo.trim(),
        input_memo: (s.memo || '').trim(),
        is_correct: isCorrect,
        scramble: s.scrambletext,
      });
      refreshStats();
      previousScrambleRef.current = s.scrambletext;
    }
    stopTimer();
  }

  function appendLetter(letter) {
    if (hasCheckedRef.current) return;
    setMemoColorData(null);
    setMemo(prev => {
      const maxLen = stateRef.current.checkedPairs.length * 3;
      let m = prev;
      if (m.length >= maxLen) return m;
      m += letter;
      // Add space after every completed pair (every 2nd letter)
      if (m.replace(/ /g, '').length % 2 === 0) m += ' ';
      setMemoDisplay('Memo: ' + m);
      return m;
    });
  }

  function deleteLetter() {
    if (hasCheckedRef.current) return;
    setMemo(prev => {
      let m = prev.endsWith(' ') ? prev.slice(0, -2) : prev.slice(0, -1);
      setMemoDisplay('Memo: ' + m);
      return m;
    });
  }

  async function copyScramble() {
    const text = stateRef.current.scrambletext;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied scramble to clipboard!');
    } catch {
      // Fallback for non-secure HTTP contexts (e.g. local network)
      const el = document.createElement('textarea');
      el.value = text;
      el.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(el);
      el.focus();
      el.select();
      try {
        document.execCommand('copy');
        toast('Copied scramble to clipboard!');
      } catch {
        toast('Could not copy scramble.');
      }
      document.body.removeChild(el);
    }
  }

  function applyPinOrder(pinStr, simType, isChange) {
    const out = checkPinOrder(pinStr);
    if (!out) {
      if (isChange) toast("That's not a pin order! Please try again.");
      return false;
    }
    const newOrder = [out[0].split(' '), out[1].split(' '), out[2]];
    const newPinStr = out[0];
    const defaultPairs = getDefaultCheckedPairs(newPinStr, simType);
    setPinOrderStr(newPinStr);
    setOrder(newOrder);
    setCheckedPairs(defaultPairs);
    if (simType === 'Custom') {
      setCustomPinOrder(newPinStr);
      setSavedCheckedPairs(defaultPairs);
    }
    return { newOrder, defaultPairs };
  }

  function changeSimultype(newType) {
    const newFlipType = getFlipTypeForSimul(newType);
    setSimultype(newType);
    setFlipType(newFlipType);
    setShowCustomPin(newType === 'Custom');

    const pinStr = getPinOrderStrForSimultype(newType === 'Custom' ? 'Tommy' : newType);
    applyPinOrder(pinStr, newType, false);

    const params = new URLSearchParams(window.location.search);
    params.set('type', newType.toLowerCase());
    window.history.replaceState({}, '', '?' + params.toString());

    resetOrientation();
    if (!stateRef.current.executionMode) setMemoDisplay('Memo: ');
  }

  function handleChangePinOrder() {
    const input = prompt('enter pin order, for example: dl R DR \\ UL L ur');
    if (!input) return;
    const result = applyPinOrder(input, simultype, true);
    if (result && executionMode) {
      const m = getMemo(random, result.newOrder, simultype, letterMap, result.defaultPairs, umoveLeft, dmoveLeft);
      setMemoDisplay('Memo: ' + m);
    }
  }

  function toggleExecutionMode(checked) {
    setTrainerMode(checked);
    setExecutionMode(checked);
    if (checked) {
      setCheckResult({ text: 'Execution Trainer Mode', color: 'white' });
      resetTimer();
    } else {
      setMemoDisplay('Memo: ');
      setCheckResult({ text: 'Enter Memo', color: 'white' });
    }
    const sctext = generateScrambleText();
    const rnd = scrambleconvert(sctext);
    setRandom(rnd);
    setScrambletext(sctext);
    setMemo('');
    resetOrientation();
    if (checked) {
      const m = getMemo(rnd, order, simultype, letterMap, checkedPairs, umoveLeft, dmoveLeft);
      setMemoDisplay('Memo: ' + m);
    } else {
      setMemoDisplay('Memo: ');
      restartTimer();
    }
  }

  useEffect(() => {
    if (executionMode && order) {
      const m = getMemo(random, order, simultype, letterMap, checkedPairs, umoveLeft, dmoveLeft);
      setMemoDisplay('Memo: ' + m);
    }
  }, [executionMode, random, order, simultype, letterMap, checkedPairs, umoveLeft, dmoveLeft]);

  useEffect(() => {
    function onKeyDown(e) {
      if (document.activeElement?.matches('input, select, textarea')) return;
      const s = stateRef.current;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
        if (e.repeat) return;
        const moves = { ArrowUp: 'x2', ArrowDown: 'y2', ArrowLeft: "z'", ArrowRight: 'z' };
        rotate({ rotation: moves[e.code] });
      } else if (e.code === 'Space') {
        e.preventDefault();
        rotate({ rotation: stateRef.current.flipType, commit: false });
      } else if (e.key === 's' || e.key === 'S') {
        scramble();
      } else if (e.key === 'Backspace' && !s.executionMode) {
        deleteLetter();
      } else if (e.key === 'Enter' && !s.executionMode) {
        checkMemo();
      } else if (
        !s.executionMode &&
        e.key.length === 1 &&
        (
          (e.key >= 'a' && e.key <= 'l') ||
          (e.key >= 'A' && e.key <= 'L') ||
          (e.key >= '0' && e.key <= '9') ||
          e.key === 'o' || e.key === 'O'
        )
      ) {
        appendLetter(e.key.toUpperCase());
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function refreshStats() {
    setStats(computeInstantStats());
    setStatRows(loadStats());
  }

  function handleSwitchSession(n) {
    setActiveSession(n);
    setActiveSessionState(n);
    setStats(computeInstantStats(n));
    setStatRows(loadStats(n));
  }

  function handleExportStats() { exportStatsCsv(); }

  function handleDeleteStatAt(index) {
    if (!confirm(`Delete attempt #${index + 1}?`)) return;
    deleteStatAt(index);
    refreshStats();
  }

  function handleClearStats() {
    const s = loadStats();
    if (!s || s.length === 0) { toast('No stats to clear.'); return; }
    const ok = prompt('Type "DELETE" to clear all stats.') === 'DELETE';
    if (!ok) { toast('Clearing stats aborted.'); return; }
    clearStats();
    refreshStats();
    toast('Stats cleared.');
  }

  function handlePracticeModeChange(checked) {
    setPracticeMode(checked);
    setPracticeModeState(checked);
  }

  function handleTimerChange(checked) {
    setTimerPref(checked);
    setTimerEnabled(checked);
    if (checked) { scramble(); }
    else { resetTimer(); }
  }

  function handleHourIndicatorsChange(checked) {
    setHideHourIndicators(checked);
    setHideHourIndicatorsState(checked);
  }

  function handleInputTypeChange(type) {
    setInputLetterType(type);
    setInputType(type);
  }

  function handleCustomCharsChange(e) {
    const unique = [...e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()]
      .filter((ch, i, arr) => arr.indexOf(ch) === i)
      .join('').slice(0, 12);
    setCustomCharsState(unique);
    setCustomChars(unique);
  }

  function handleFlipTypeChange(newFlipType) {
    setFlipType(newFlipType);
    toast(`Flip type changed to ${newFlipType}`);
  }

  function handleCheckedPairToggle(pairName, checked) {
    setCheckedPairs(prev => {
      const next = checked ? [...prev, pairName] : prev.filter(p => p !== pairName);
      if (simultype === 'Custom') setSavedCheckedPairs(next);
      if (executionMode && order) {
        const m = getMemo(random, order, simultype, letterMap, next, umoveLeft, dmoveLeft);
        setMemoDisplay('Memo: ' + m);
      }
      return next;
    });
  }

  const pinItems = pinOrderStr.split(' ');

  return (
    <div className="app-container">
      <Toast message={toastMsg} onDismiss={() => setToastMsg('')} />

      {/* ── Header ── */}
      <header className="app-header">
        <h1>7 Simul Memo Trainer</h1>
        <HelpPopup />
      </header>

      {/* ── Main two-column layout ── */}
      <div className="main-layout">

        {/* ── Left: Clock ── */}
        <div className="clock-panel">
          <Clock
            random={random}
            side={side}
            flipType="x2"
            hideHourIndicators={hideHourIndicatorsState}
            rotation={clockTurns * 90}
            markerRotation={(markerTurns ?? 0) * 90}
            markerVisible={markerTurns !== undefined}
            onFlip={() => rotate({ rotation: stateRef.current.flipType, commit: false })}
          />
        </div>

        {/* ── Right: Controls ── */}
        <div className="controls-panel">

          {/* Memo status */}
          <div className="card memo-status">
            <h2 style={{ color: checkResult.color, margin: '0 0 0.2rem' }}>{checkResult.text}</h2>
            <h2 style={{ margin: 0 }}>
              {'Memo: '}
              {executionMode
                ? memoDisplay.slice(6)
                : memoColorData
                  ? memoColorData.userMemo.split('').map((ch, i) =>
                      ch === ' '
                        ? <span key={i}> </span>
                        : <span key={i} style={{ color: memoColorData.realMemo[i] === ch ? '#22c55e' : 'red' }}>{ch}</span>
                    )
                  : memo
              }
            </h2>
            {timerEnabled && !executionMode && !showInputButtons && (
              <p className="timer-display">{timerDisplay}</p>
            )}
          </div>

          {/* Memo input buttons */}
          <MemoInput
            letterMap={letterMap}
            memo={memo}
            onLetter={appendLetter}
            onCheck={checkMemo}
            onScramble={scramble}
            onDelete={deleteLetter}
            onCopyScramble={copyScramble}
            showButtons={showInputButtons}
            executionMode={executionMode}
            timer={timerDisplay}
            timerEnabled={timerEnabled}
            onRotate={rotation => rotate({ rotation })}
            flipType={flipType}
          />

          {/* Scramble bar */}
          <div className="card scramble-bar">
            <span className="scramble-text" onClick={copyScramble} title="Click to copy">
              {scrambletext || (showInputButtons ? 'Press S or 🔀 to scramble' : 'Press S to scramble')}
            </span>
            <button className="action-btn" onClick={copyScramble} title="Copy scramble">📋</button>
          </div>

          {/* Simul type + enter scramble */}
          <div className="card row">
            <label htmlFor="simultype">Type:</label>
            <select
              id="simultype"
              value={simultype}
              onChange={e => changeSimultype(e.target.value)}
            >
              <option value="BPaul">BPaul</option>
              <option value="Tommy">Tommy</option>
              <option value="Custom">Custom</option>
            </select>
            <button className="action-btn" onClick={enterScramble}>Enter Scramble</button>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={showInputButtons}
                onChange={e => setShowInputButtons(e.target.checked)}
              />
              Show input buttons <InfoTooltip text="Shows on-screen buttons for entering memo characters on mobile devices." />
            </label>
          </div>

          {/* Custom pin order */}
          {showCustomPin && (
            <div className="card custom-pin-card">
              <div className="row">
                <span>Pin order: <b>{pinOrderStr}</b></span>
                <button className="action-btn" onClick={handleChangePinOrder}>Change</button>
              </div>
              <div className="row">
                {pinItems.includes('U') && (
                  <label>
                    U move hand:{' '}
                    <select value={umoveLeft ? 'left' : 'right'} onChange={e => setUmoveLeft(e.target.value === 'left')}>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </label>
                )}
                {pinItems.includes('D') && (
                  <label>
                    D move hand:{' '}
                    <select value={dmoveLeft ? 'left' : 'right'} onChange={e => setDmoveLeft(e.target.value === 'left')}>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </label>
                )}
              </div>
              <div>
                <span style={{ fontSize: '0.85rem' }}>Memo pairs: </span>
                <div className="pairs-row">
                  {pinItems.map(item => (
                    <label key={item}>
                      <input
                        type="checkbox"
                        checked={checkedPairs.includes(item)}
                        onChange={e => handleCheckedPairToggle(item, e.target.checked)}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          {!executionMode && (
            <Stats stats={stats} practiceMode={practiceMode} activeSession={activeSession} />
          )}

          {/* Settings accordion */}
          <div>
            <button
              className={`accordion-btn${showMoreSettings ? ' open' : ''}`}
              onClick={() => setShowMoreSettings(v => !v)}
            >
              {showMoreSettings ? '▾' : '▸'} Settings
            </button>
            <div ref={settingsBodyRef} className={`accordion-body${showMoreSettings ? ' open' : ''}`}>
              <div className="accordion-body-inner">
                <div>
                  <b style={{ fontSize: '0.85rem' }}>Memo Input Characters</b> <InfoTooltip text="Only letters A–Z and digits 0–9 are accepted." />
                  <div className="setting-row" style={{ marginTop: '0.3rem' }}>
                    <input
                      type="text"
                      value={customChars}
                      onChange={handleCustomCharsChange}
                      maxLength={12}
                      placeholder="ABCDEFGHIJKL"
                      style={{ fontFamily: 'monospace', width: '9rem', letterSpacing: '0.05em' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: customChars.length < 12 ? 'red' : '#aaa' }}>{customChars.length}/12</span>
                  </div>
                </div>
                <label className="setting-row">
                  <input type="checkbox" checked={executionMode} onChange={e => toggleExecutionMode(e.target.checked)} />
                  <span><b>Execution trainer mode</b> <InfoTooltip text="Memo is shown automatically for execution practice." /></span>
                </label>
                {simultype !== 'BPaul' && (
                  <label className="setting-row">
                    <input type="checkbox" checked={swapM3M4} onChange={e => { setSwapM3M4(e.target.checked); setSwapM3M4Pref(e.target.checked); }} />
                    <span><b>Swap M3 and M4</b> <InfoTooltip text="Swaps the 3rd and 4th memo if you use the memo in Tommy's video." /></span>
                  </label>
                )}
                <label className="setting-row">
                  <input type="checkbox" checked={hideHourIndicatorsState} onChange={e => handleHourIndicatorsChange(e.target.checked)} />
                  <span><b>Hide hour indicators</b> <InfoTooltip text="Hides the hour marker dots, training you to judge dial distances rather than counting each dial." /></span>
                </label>
                <div className="setting-row">
                  <label htmlFor="flipType"><b>Flip type:</b></label>
                  <select id="flipType" value={flipType} onChange={e => handleFlipTypeChange(e.target.value)}>
                    <option value="x2">x2</option>
                    <option value="y2">y2</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Stats settings accordion */}
          <div>
            <button
              className={`accordion-btn${showStatSettings ? ' open' : ''}`}
              onClick={() => setShowStatSettings(v => !v)}
            >
              {showStatSettings ? '▾' : '▸'} Stats Settings
            </button>
            <div ref={statSettingsBodyRef} className={`accordion-body${showStatSettings ? ' open' : ''}`}>
              <div className="accordion-body-inner">
                <label className="setting-row">
                  <input type="checkbox" checked={practiceMode} onChange={e => handlePracticeModeChange(e.target.checked)} />
                  <span><b>Practice mode</b> <InfoTooltip text="Attempts will not count towards your stats." /></span>
                </label>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '0.3rem' }}>Session</div>
                  <div className="session-tabs">
                    {Array.from({ length: NUM_STAT_SESSIONS }, (_, i) => i + 1).map(n => (
                      <button
                        key={n}
                        className={`session-tab${activeSession === n ? ' active' : ''}`}
                        onClick={() => handleSwitchSession(n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="row" style={{ flexWrap: 'wrap', gap: '0.4rem' }}>
                  <button className="stat-action-btn" onClick={handleExportStats}>Export CSV</button>
                  <button className="stat-action-btn" onClick={handleClearStats}>Clear all</button>
                </div>
                {statRows.length === 0 ? (
                  <p style={{ margin: '0.5rem 0 0', color: '#aaa', fontSize: '0.82rem' }}>No attempts recorded yet.</p>
                ) : (
                  <div className="stats-table-wrapper">
                    <table className="stats-table">
                      <thead>
                        <tr>
                          <th></th>
                          <th>#</th>
                          <th>Time</th>
                          <th>Type</th>
                          <th>Secs</th>
                          <th>Correct</th>
                          <th>Yours</th>
                          <th>✓</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...statRows].reverse().map((row, i) => {
                          const originalIndex = statRows.length - 1 - i;
                          return (
                          <tr key={originalIndex} style={{ color: row.is_correct ? '#22c55e' : '#f87171' }}>
                            <td>
                              <button className="row-delete-btn" onClick={() => handleDeleteStatAt(originalIndex)} title="Remove">✕</button>
                            </td>
                            <td style={{ color: '#aaa' }}>{originalIndex + 1}</td>
                            <td style={{ color: '#ccc' }}>{row.timestamp}</td>
                            <td style={{ color: '#ccc' }}>{row.pinorder}</td>
                            <td>{row.time_seconds !== '' ? row.time_seconds : '—'}</td>
                            <td>{row.correct_memo}</td>
                            <td>{row.input_memo}</td>
                            <td>{row.is_correct ? '✓' : '✗'}</td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
      <footer style={{ textAlign: 'center', padding: '1rem 0 0.75rem', color: '#666', fontSize: '0.75rem' }}>
        Clock design based on <a href="https://sanya.sweetduet.info/cube/7simul_trainer/" target="_blank" rel="noopener noreferrer" style={{ color: '#888' }}>Kusano</a>
        {' · '}
        Logic adapted from <a href="https://joshm2.github.io/7-Simul/" target="_blank" rel="noopener noreferrer" style={{ color: '#888' }}>JoshM2</a> and <a href="https://github.com/cafox12503" target="_blank" rel="noopener noreferrer" style={{ color: '#888' }}>Caleb Fox</a>
      </footer>
    </div>
  );
}
