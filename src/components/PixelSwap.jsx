import { useCallback, useEffect, useRef, useState } from 'react';
import './PixelSwap.css';

const PATTERNS = {
  random: () => Math.random(),
  center: (x, y) => Math.hypot(x - 0.5, y - 0.5) / Math.SQRT1_2,
  edges: (x, y) => Math.min(x, 1 - x, y, 1 - y) * 2,
  'left-to-right': x => x,
  'right-to-left': x => 1 - x,
  'top-to-bottom': (_x, y) => y,
  'bottom-to-top': (_x, y) => 1 - y,
  diagonal: (x, y) => (x + y) / 2
};

function PixelSwap({
  firstContent,
  secondContent,
  pixelSize = 64,
  duration = 480,
  pattern = 'random',
  initialActive = false,
  active,
  onActiveChange,
  onComplete,
  className = '',
  style
}) {
  const [internalActive, setInternalActive] = useState(initialActive);
  const [shownActive, setShownActive] = useState(active ?? initialActive);
  const [transitionState, setTransitionState] = useState(null); // null | 'in' | 'out'
  const [tiles, setTiles] = useState([]);
  const [gridDim, setGridDim] = useState({ cols: 0, rows: 0, size: 64 });

  const desiredActive = active ?? internalActive;
  const isTransitioningRef = useRef(false);
  const timersRef = useRef([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(id => clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  // When desiredActive changes and differs from shownActive, trigger lightweight GPU pixel wipe
  useEffect(() => {
    if (desiredActive === shownActive || isTransitioningRef.current) return;

    isTransitioningRef.current = true;
    clearTimers();

    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

    // Calculate optimal grid (between 40 and 96 tiles max for silky 60fps performance)
    const targetSize = Math.max(50, Math.min(100, Math.round(pixelSize)));
    const cols = Math.max(4, Math.ceil(vw / targetSize));
    const rows = Math.max(3, Math.ceil(vh / targetSize));
    const orderFunc = PATTERNS[pattern] ?? PATTERNS.random;

    const newTiles = [];
    const inHalfMs = Math.round(duration * 0.44);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = cols <= 1 ? 0.5 : c / (cols - 1);
        const y = rows <= 1 ? 0.5 : r / (rows - 1);
        const factor = orderFunc(x, y);
        const delay = Math.round(factor * (inHalfMs * 0.5));

        newTiles.push({
          id: `${r}-${c}`,
          delay,
          delayOut: Math.round((1 - factor) * (inHalfMs * 0.4))
        });
      }
    }

    setGridDim({ cols, rows, size: targetSize });
    setTiles(newTiles);
    setTransitionState('in');

    // Midpoint: switch content
    const midTimer = setTimeout(() => {
      setShownActive(desiredActive);
      onActiveChange?.(desiredActive);
      setTransitionState('out');

      // End of transition
      const endTimer = setTimeout(() => {
        setTransitionState(null);
        isTransitioningRef.current = false;
        onComplete?.(desiredActive);
      }, inHalfMs + 60);

      timersRef.current.push(endTimer);
    }, inHalfMs + 40);

    timersRef.current.push(midTimer);
  }, [desiredActive, shownActive, pixelSize, duration, pattern, onActiveChange, onComplete, clearTimers]);

  return (
    <div
      className={`pixel-swap ${className}`.trim()}
      style={style}
      data-active={shownActive}
      data-transitioning={!!transitionState}
    >
      <div className="pixel-swap__layer" data-visible={!shownActive ? 'true' : 'false'}>
        {firstContent}
      </div>

      <div className="pixel-swap__layer" data-visible={shownActive ? 'true' : 'false'}>
        {secondContent}
      </div>

      {transitionState && (
        <div
          className="pixel-swap__viewport-overlay"
          style={{
            gridTemplateColumns: `repeat(${gridDim.cols}, 1fr)`,
            gridTemplateRows: `repeat(${gridDim.rows}, 1fr)`
          }}
          aria-hidden="true"
        >
          {tiles.map(tile => {
            const isIn = transitionState === 'in';
            return (
              <div
                key={tile.id}
                className="pixel-swap__tile"
                style={{
                  transition: isIn
                    ? `transform 180ms cubic-bezier(0.2, 0.9, 0.3, 1) ${tile.delay}ms, opacity 140ms ease ${tile.delay}ms`
                    : `transform 180ms cubic-bezier(0.4, 0, 0.8, 0.2) ${tile.delayOut}ms, opacity 140ms ease ${tile.delayOut}ms`,
                  transform: isIn ? 'scale(1.05)' : 'scale(0)',
                  opacity: isIn ? 1 : 0
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PixelSwap;
