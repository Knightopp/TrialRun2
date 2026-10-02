import React, { useCallback, useEffect, useRef, useState } from 'react';
import './ClickExpand.css';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};

const ClickExpand = ({
  src = '',
  mediaType = 'image',
  poster = '',
  alt = '',
  title = '',
  clickHint = 'CLICK TO EXPAND',
  startWidth = 42,
  startHeight = 58,
  startRadius = 24,
  endRadius = 0,
  mediaZoom = 1.35,
  overlayScrim = 0.85,
  children,
  className = '',
  style,
  onClose,
  ...rest
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const frameRef = useRef(null);
  const mediaRef = useRef(null);
  const titleRef = useRef(null);
  const overlayRef = useRef(null);
  const scrimRef = useRef(null);
  const hintRef = useRef(null);
  const progressRef = useRef(0);
  const rafRef = useRef(0);

  const applyProgress = useCallback(p => {
    const frame = frameRef.current;
    const media = mediaRef.current;
    if (!frame || !media) return;

    const e = smoothstep(0, 1, p);

    const w = startWidth + (100 - startWidth) * e;
    const h = startHeight + (100 - startHeight) * e;
    const ix = Math.max(0, (100 - w) / 2);
    const iy = Math.max(0, (100 - h) / 2);
    const r = startRadius + (endRadius - startRadius) * e;
    frame.style.clipPath = `inset(${iy}% ${ix}% ${iy}% ${ix}% round ${r}px)`;

    media.style.transform = `scale(${mediaZoom + (1 - mediaZoom) * e})`;

    if (scrimRef.current) scrimRef.current.style.opacity = `${overlayScrim * e}`;

    if (titleRef.current) {
      const out = smoothstep(0.1, 0.5, p);
      titleRef.current.style.opacity = `${1 - out}`;
      titleRef.current.style.transform = `translate3d(0, ${-28 * out}px, 0) scale(${1 + 0.06 * out})`;
    }

    if (hintRef.current) {
      const gone = smoothstep(0, 0.12, p);
      hintRef.current.style.opacity = `${1 - gone}`;
      hintRef.current.style.transform = `translate3d(0, ${8 * gone}px, 0)`;
    }

    if (overlayRef.current) {
      const inn = smoothstep(0.6, 1, p);
      overlayRef.current.style.opacity = `${inn}`;
      overlayRef.current.style.transform = `translate3d(0, ${18 * (1 - inn)}px, 0)`;
      overlayRef.current.style.pointerEvents = inn > 0.9 ? 'auto' : 'none';
    }
  }, [startWidth, startHeight, startRadius, endRadius, mediaZoom, overlayScrim]);

  useEffect(() => {
    let startTime = null;
    const duration = 700; // ms
    const startProgress = progressRef.current;
    const targetProgress = isExpanded ? 1 : 0;

    if (startProgress === targetProgress) return;

    const animate = (time) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      const t = clamp(elapsed / duration, 0, 1);
      
      const ease = 1 - Math.pow(1 - t, 4); // Quartic ease out
      
      progressRef.current = startProgress + (targetProgress - startProgress) * ease;
      applyProgress(progressRef.current);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafRef.current);
  }, [isExpanded, applyProgress]);

  // Initial setup
  useEffect(() => {
    applyProgress(0);
  }, [applyProgress]);

  const toggle = () => {
    setIsExpanded(prev => !prev);
  };

  const media = mediaType === 'video' ? (
    <video ref={mediaRef} className="click-expand__media" src={src} poster={poster} autoPlay muted loop playsInline />
  ) : (
    <img ref={mediaRef} className="click-expand__media" src={src} alt={alt} draggable={false} />
  );

  return (
    <div className={`click-expand ${className}`.trim()} style={style} {...rest}>
      <div className="click-expand__stage">
        {/* Close Button for Collapsed State */}
        {!isExpanded && onClose && (
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); }} 
            style={{
              position: 'absolute', top: '2rem', right: '2rem', zIndex: 100,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', borderRadius: '50%', width: '40px', height: '40px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              backdropFilter: 'blur(10px)', fontSize: '1.2rem',
              transition: 'opacity 0.3s ease'
            }}
            aria-label="Back"
          >
            ✕
          </button>
        )}
        <div 
          ref={frameRef} 
          className="click-expand__frame" 
          onClick={!isExpanded ? toggle : undefined}
          style={{ cursor: isExpanded ? 'default' : 'pointer' }}
        >
          {media}
          <div ref={scrimRef} className="click-expand__scrim" />
          {children ? (
            <div ref={overlayRef} className="click-expand__overlay">
              {isExpanded && (
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggle(); }} 
                  style={{
                    position: 'absolute', top: '2rem', right: '2rem', zIndex: 100,
                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff', borderRadius: '50%', width: '40px', height: '40px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    backdropFilter: 'blur(10px)', fontSize: '1.2rem'
                  }}
                  aria-label="Close form"
                >
                  ✕
                </button>
              )}
              {children}
            </div>
          ) : null}
        </div>
        {title ? (
          <div ref={titleRef} className="click-expand__title" style={{ pointerEvents: 'none' }}>
            {title}
          </div>
        ) : null}
        {clickHint ? (
          <div ref={hintRef} className="click-expand__hint" style={{ pointerEvents: 'none' }}>
            {clickHint}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ClickExpand;
