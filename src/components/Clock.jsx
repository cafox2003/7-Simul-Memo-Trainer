import React, { useMemo, useRef, useState, useEffect } from 'react';

const POSITIONS = ['ul', 'u', 'ur', 'l', 'c', 'r', 'dl', 'd', 'dr'];
const HOUR_NAMES = ['one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve'];

function getDialRotation(random, index, side, flipType) {
  if (side === 'white') {
    return (random[index] * 30) + 'deg';
  }
  const centerIndices = [1, 3, 4, 5, 7];
  const centerOrder = [13, 12, 11, 10, 9];
  const centerOrderX2 = [9, 10, 11, 12, 13];

  const centerPos = centerIndices.indexOf(index);
  if (centerPos !== -1) {
    if (flipType === 'y2') {
      return (random[centerOrder[centerPos]] * 30) + 'deg';
    } else {
      return ((random[centerOrderX2[centerPos]] + 6) * 30) + 'deg';
    }
  }

  if (flipType === 'y2') {
    const cornerMap = { 0: 2, 2: 0, 6: 8, 8: 6 };
    return (random[cornerMap[index]] * -30) + 'deg';
  } else {
    const cornerMapX2 = { 0: 6, 2: 8, 6: 0, 8: 2 };
    return ((random[cornerMapX2[index]] + 6) * -30) + 'deg';
  }
}

function getHourColor(hourIdx, side, flipType) {
  if (side === 'white') {
    return hourIdx === 11 ? 'red' : 'white';
  } else {
    if (flipType === 'x2') {
      return hourIdx === 5 ? 'red' : 'black';
    } else {
      return hourIdx === 11 ? 'red' : 'black';
    }
  }
}

function shouldShowHour(hourIdx, side, flipType, hideHourIndicators) {
  if (hideHourIndicators) {
    if (side === 'white' && hourIdx === 11) return true;
    if (side === 'black') {
      if (flipType === 'x2' && hourIdx === 5) return true;
      if (flipType === 'y2' && hourIdx === 11) return true;
    }
    return false;
  }
  return true;
}

export default function Clock({ random, side, flipType, hideHourIndicators, rotation = 0, markerRotation = 0, markerVisible = true, onFlip }) {
  const isFirstRenderRef = useRef(true);
  const prevRandomRef = useRef(random);
  const [whiteDials, setWhiteDials] = useState(() => random.slice(0, 9).map(v => v * 30));
  const [shouldAnimate, setShouldAnimate] = useState(false);

  // Single effect watching both random and side — animate only when random changes
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      prevRandomRef.current = random;
      return;
    }

    const randomChanged = random !== prevRandomRef.current;
    prevRandomRef.current = random;

    if (randomChanged) {
      setShouldAnimate(true);
      setWhiteDials(prev =>
        prev.map((current, i) => {
          const target = random[i] * 30;
          const currentMod = ((current % 360) + 360) % 360;
          const delta = ((target - currentMod) + 540) % 360 - 180;
          return current + delta;
        })
      );
    } else {
      setShouldAnimate(false);
    }
  }, [random, side]);

  const dialTransition = shouldAnimate && side === 'white'
    ? 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    : 'none';

  const dialRotations = useMemo(() => {
    return POSITIONS.map((_, i) => {
      if (side === 'white') return whiteDials[i] + 'deg';
      return getDialRotation(random, i, side, flipType);
    });
  }, [whiteDials, random, side, flipType]);

  const circleColor = side === 'white' ? 'white' : 'black';
  const dialColor = side === 'white' ? 'black' : 'white';

  return (
    <div className="clock-stage">
      {markerVisible && <span className="rotation-orbit" style={{ transform: `rotate(${markerRotation}deg)` }}><span className="rotation-marker" /></span>}
      <div className="clock-body" onClick={onFlip} style={{ background: side === 'black' ? 'white' : '#2a2a2a', transform: `rotate(${rotation}deg)` }}>
        <div id="clock">
        {POSITIONS.map((pos, i) => (
          <div key={`circle-${pos}`} className={`circle ${pos}`} style={{ backgroundColor: side === 'black' ? 'white' : '#1a1a1a', outline: side === 'black' ? '1px solid #bbb' : 'none' }}>
            <div className="circle-face" style={{ backgroundColor: circleColor }} />
          </div>
        ))}
        {POSITIONS.map((pos, i) => {
          const isCenterDial = [1, 3, 4, 5, 7].includes(i);
          return (
            <React.Fragment key={`dial-${pos}`}>
              <div
                className={`dial ${pos}${isCenterDial ? ' center' : ''}`}
                style={{ '--rot': dialRotations[i], backgroundColor: dialColor, transition: dialTransition }}
              />
              <div
                className={`dial-base ${pos}`}
                style={{ backgroundColor: dialColor }}
              />
            </React.Fragment>
          );
        })}
        {POSITIONS.map((pos) =>
          HOUR_NAMES.map((hour, hi) => {
            const isX2Black = side === 'black' && flipType === 'x2';
            const extraClass = isX2Black && hi === 11 ? ' single-marker'
                             : isX2Black && hi === 5  ? ' double-marker'
                             : '';
            return (
              <div
                key={`${hour}-${pos}`}
                className={`${hour} ${pos}${extraClass}`}
                style={{
                  backgroundColor: getHourColor(hi, side, flipType),
                  display: shouldShowHour(hi, side, flipType, hideHourIndicators) ? 'block' : 'none',
                }}
              />
            );
          })
        )}
        <div className="pin-dot pin-ul" style={{ backgroundColor: side === 'black' ? 'black' : 'white' }} />
        <div className="pin-dot pin-ur" style={{ backgroundColor: side === 'black' ? 'black' : 'white' }} />
        <div className="pin-dot pin-dl" style={{ backgroundColor: side === 'black' ? 'black' : 'white' }} />
        <div className="pin-dot pin-dr" style={{ backgroundColor: side === 'black' ? 'black' : 'white' }} />
        </div>
      </div>
    </div>
  );
}
