'use client';

import React, { useCallback, useLayoutEffect, useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import './StaggeredMenu.css';

export const StaggeredMenu = ({
  position = 'right',
  colors = ['#B497CF', '#5227FF'],
  items = [],
  socialItems = [],
  displaySocials = true,
  displayItemNumbering = true,
  className,
  logoUrl = '',
  menuButtonColor = '#fff',
  openMenuButtonColor = '#fff',
  accentColor = '#5227FF',
  changeMenuColorOnOpen = true,
  isFixed = false,
  closeOnClickAway = true,
  hideToggleButton = false,
  onMenuOpen,
  onMenuClose,
  // Extended props for controlled mode
  isOpen,
  onClose,
  refreshTrigger
}) => {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);

  // Cache items/socialItems so they persist visually during close animation
  const [cachedItems, setCachedItems] = useState(items);
  const [cachedSocialItems, setCachedSocialItems] = useState(socialItems);
  const pendingCloseRef = useRef(null);  // stores onClose callback to call after animation
  const panelRef = useRef(null);
  const preLayersRef = useRef(null);
  const preLayerElsRef = useRef([]);
  const plusHRef = useRef(null);
  const plusVRef = useRef(null);
  const iconRef = useRef(null);
  const textInnerRef = useRef(null);
  const textWrapRef = useRef(null);
  const [textLines, setTextLines] = useState(['Menu', 'Close']);

  const openTlRef = useRef(null);
  const closeTweenRef = useRef(null);
  const spinTweenRef = useRef(null);
  const textCycleAnimRef = useRef(null);
  const colorTweenRef = useRef(null);
  const toggleBtnRef = useRef(null);
  const busyRef = useRef(false);
  const itemEntranceTweenRef = useRef(null);

  // ── INIT: position everything offscreen ──
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const panel = panelRef.current;
      const preContainer = preLayersRef.current;
      const plusH = plusHRef.current;
      const plusV = plusVRef.current;
      const icon = iconRef.current;
      const textInner = textInnerRef.current;

      if (!panel) return;

      let preLayers = [];
      if (preContainer) {
        preLayers = Array.from(preContainer.querySelectorAll('.sm-prelayer'));
      }
      preLayerElsRef.current = preLayers;

      const offscreen = position === 'left' ? -100 : 100;
      gsap.set([panel, ...preLayers], { xPercent: offscreen, opacity: 1 });
      if (preContainer) {
        gsap.set(preContainer, { xPercent: 0, opacity: 1 });
      }

      // Header refs are null when hideToggleButton is true — guard each one
      if (plusH) gsap.set(plusH, { transformOrigin: '50% 50%', rotate: 0 });
      if (plusV) gsap.set(plusV, { transformOrigin: '50% 50%', rotate: 90 });
      if (icon) gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
      if (textInner) gsap.set(textInner, { yPercent: 0 });
      if (toggleBtnRef.current) gsap.set(toggleBtnRef.current, { color: menuButtonColor });
    });
    return () => ctx.revert();
  }, [menuButtonColor, position]);

  // ── BUILD the staggered open timeline ──
  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return null;

    openTlRef.current?.kill();
    if (closeTweenRef.current) {
      closeTweenRef.current.kill();
      closeTweenRef.current = null;
    }
    itemEntranceTweenRef.current?.kill();

    // Separate regular menu-item labels from non-interactive rich-content labels
    const regularItemEls = Array.from(panel.querySelectorAll('.sm-panel-item:not(.non-interactive) .sm-panel-itemLabel'));
    const richItemEls = Array.from(panel.querySelectorAll('.sm-panel-item.non-interactive .sm-panel-itemLabel'));
    const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
    const socialTitle = panel.querySelector('.sm-socials-title');
    const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));

    const offscreen = position === 'left' ? -100 : 100;
    const layerStates = layers.map(el => ({ el, start: offscreen }));
    const panelStart = offscreen;

    // Regular items: split text into individual characters for letter-by-letter fade
    regularItemEls.forEach(el => {
      // Only split if not already split
      if (!el.dataset.charSplit) {
        const text = el.textContent;
        el.innerHTML = '';
        text.split('').forEach(char => {
          const span = document.createElement('span');
          span.textContent = char === ' ' ? '\u00A0' : char;
          span.style.display = 'inline-block';
          span.style.opacity = '0';
          span.style.transform = 'translateY(20px)';
          span.className = 'sm-char';
          el.appendChild(span);
        });
        el.dataset.charSplit = 'true';
      } else {
        // Reset existing char spans
        const chars = el.querySelectorAll('.sm-char');
        gsap.set(chars, { opacity: 0, y: 20 });
      }
    });
    // Rich content items: gentle fade — no rotation
    if (richItemEls.length) gsap.set(richItemEls, { y: 40, opacity: 0 });
    if (numberEls.length) gsap.set(numberEls, { '--sm-num-opacity': 0 });
    if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
    if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });

    const tl = gsap.timeline({ paused: true });

    layerStates.forEach((ls, i) => {
      tl.fromTo(ls.el, { xPercent: ls.start }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07);
    });
    const lastTime = layerStates.length ? (layerStates.length - 1) * 0.07 : 0;
    const panelInsertTime = lastTime + (layerStates.length ? 0.08 : 0);
    const panelDuration = 0.65;
    tl.fromTo(
      panel,
      { xPercent: panelStart },
      { xPercent: 0, duration: panelDuration, ease: 'power4.out' },
      panelInsertTime
    );

    const itemsStartRatio = 0.15;
    const itemsStart = panelInsertTime + panelDuration * itemsStartRatio;

    // Animate rich content: smooth fade-in + slide up (no rotation)
    if (richItemEls.length) {
      tl.to(richItemEls, {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: 'power3.out',
        stagger: { each: 0.08, from: 'start' }
      }, itemsStart);
    }

    // Animate regular items: letter-by-letter fade in
    regularItemEls.forEach((el, elIdx) => {
      const chars = el.querySelectorAll('.sm-char');
      if (chars.length) {
        tl.to(chars, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power3.out',
          stagger: { each: 0.03, from: 'start' }
        }, itemsStart + 0.1 + elIdx * 0.12);
      }
    });
    if (numberEls.length) {
      tl.to(numberEls, {
        duration: 0.6,
        ease: 'power2.out',
        '--sm-num-opacity': 1,
        stagger: { each: 0.08, from: 'start' }
      }, itemsStart + 0.2);
    }

    if (socialTitle || socialLinks.length) {
      const socialsStart = panelInsertTime + panelDuration * 0.4;
      if (socialTitle) {
        tl.to(socialTitle, { opacity: 1, duration: 0.5, ease: 'power2.out' }, socialsStart);
      }
      if (socialLinks.length) {
        tl.to(socialLinks, {
          y: 0,
          opacity: 1,
          duration: 0.55,
          ease: 'power3.out',
          stagger: { each: 0.08, from: 'start' },
          onComplete: () => gsap.set(socialLinks, { clearProps: 'opacity' })
        }, socialsStart + 0.04);
      }
    }

    openTlRef.current = tl;
    return tl;
  }, [position]);

  // ── PLAY open ──
  const playOpen = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    const tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback('onComplete', () => { busyRef.current = false; });
      tl.play(0);
    } else {
      busyRef.current = false;
    }
  }, [buildOpenTimeline]);

  // ── PLAY close ──
  const playClose = useCallback(() => {
    openTlRef.current?.kill();
    openTlRef.current = null;
    itemEntranceTweenRef.current?.kill();

    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return;

    const all = [...layers, panel];
    closeTweenRef.current?.kill();
    const offscreen = position === 'left' ? -100 : 100;
    closeTweenRef.current = gsap.to(all, {
      xPercent: offscreen,
      duration: 0.32,
      ease: 'power3.in',
      overwrite: 'auto',
      onComplete: () => {
        const regularItemEls = Array.from(panel.querySelectorAll('.sm-panel-item:not(.non-interactive) .sm-panel-itemLabel'));
        const richItemEls = Array.from(panel.querySelectorAll('.sm-panel-item.non-interactive .sm-panel-itemLabel'));
        // Reset char spans for regular items
        regularItemEls.forEach(el => {
          const chars = el.querySelectorAll('.sm-char');
          if (chars.length) gsap.set(chars, { opacity: 0, y: 20 });
        });
        if (richItemEls.length) gsap.set(richItemEls, { y: 40, opacity: 0 });
        const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
        if (numberEls.length) gsap.set(numberEls, { '--sm-num-opacity': 0 });
        const socialTitle = panel.querySelector('.sm-socials-title');
        const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));
        if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
        if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });
        busyRef.current = false;
      }
    });
  }, [position]);

  // ── Icon spin ──
  const animateIcon = useCallback(opening => {
    const icon = iconRef.current;
    if (!icon) return;
    spinTweenRef.current?.kill();
    if (opening) {
      spinTweenRef.current = gsap.to(icon, { rotate: 225, duration: 0.8, ease: 'power4.out', overwrite: 'auto' });
    } else {
      spinTweenRef.current = gsap.to(icon, { rotate: 0, duration: 0.35, ease: 'power3.inOut', overwrite: 'auto' });
    }
  }, []);

  // ── Button colour ──
  const animateColor = useCallback(opening => {
    const btn = toggleBtnRef.current;
    if (!btn) return;
    colorTweenRef.current?.kill();
    if (changeMenuColorOnOpen) {
      const targetColor = opening ? openMenuButtonColor : menuButtonColor;
      colorTweenRef.current = gsap.to(btn, { color: targetColor, delay: 0.18, duration: 0.3, ease: 'power2.out' });
    } else {
      gsap.set(btn, { color: menuButtonColor });
    }
  }, [openMenuButtonColor, menuButtonColor, changeMenuColorOnOpen]);

  // keep button color in sync if props change while menu is static
  React.useEffect(() => {
    if (toggleBtnRef.current) {
      const targetColor = openRef.current && changeMenuColorOnOpen ? openMenuButtonColor : menuButtonColor;
      gsap.set(toggleBtnRef.current, { color: targetColor });
    }
  }, [changeMenuColorOnOpen, menuButtonColor, openMenuButtonColor]);

  // ── Text cycle ──
  const animateText = useCallback(opening => {
    const inner = textInnerRef.current;
    if (!inner) return;
    textCycleAnimRef.current?.kill();

    const currentLabel = opening ? 'Menu' : 'Close';
    const targetLabel = opening ? 'Close' : 'Menu';
    const cycles = 3;
    const seq = [currentLabel];
    let last = currentLabel;
    for (let i = 0; i < cycles; i++) {
      last = last === 'Menu' ? 'Close' : 'Menu';
      seq.push(last);
    }
    if (last !== targetLabel) seq.push(targetLabel);
    seq.push(targetLabel);
    setTextLines(seq);

    gsap.set(inner, { yPercent: 0 });
    const lineCount = seq.length;
    const finalShift = ((lineCount - 1) / lineCount) * 100;
    textCycleAnimRef.current = gsap.to(inner, {
      yPercent: -finalShift,
      duration: 0.5 + lineCount * 0.07,
      ease: 'power4.out'
    });
  }, []);

  // ── Toggle (uncontrolled or dispatches to parent) ──
  const toggleMenu = useCallback(() => {
    const target = !openRef.current;
    // Controlled mode: just notify parent
    if (isOpen !== undefined) {
      if (target && onMenuOpen) onMenuOpen();
      if (!target && onClose) onClose();
      return;
    }
    // Uncontrolled mode
    openRef.current = target;
    setOpen(target);
    if (target) { onMenuOpen?.(); playOpen(); }
    else        { onMenuClose?.(); playClose(); }
    animateIcon(target);
    animateColor(target);
    animateText(target);
  }, [playOpen, playClose, animateIcon, animateColor, animateText, onMenuOpen, onMenuClose, isOpen, onClose]);

  // ── Close helper ──
  const closeMenu = useCallback(() => {
    if (!openRef.current) return;
    if (isOpen !== undefined && onClose) {
      // Controlled mode: play close animation first, then notify parent after it finishes
      openRef.current = false;
      setOpen(false);
      animateIcon(false);
      animateColor(false);
      animateText(false);
      // Play close, and call onClose when animation is done
      openTlRef.current?.kill();
      openTlRef.current = null;
      itemEntranceTweenRef.current?.kill();
      const panel = panelRef.current;
      const layers = preLayerElsRef.current;
      if (!panel) { onClose(); return; }
      const all = [...layers, panel];
      closeTweenRef.current?.kill();
      const offscreen = position === 'left' ? -100 : 100;
      closeTweenRef.current = gsap.to(all, {
        xPercent: offscreen,
        duration: 0.32,
        ease: 'power3.in',
        overwrite: 'auto',
        onComplete: () => {
          busyRef.current = false;
          onClose();
        }
      });
      return;
    }
    // Uncontrolled mode
    openRef.current = false;
    setOpen(false);
    onMenuClose?.();
    playClose();
    animateIcon(false);
    animateColor(false);
    animateText(false);
  }, [playClose, animateIcon, animateColor, animateText, onMenuClose, isOpen, onClose, position]);

  // Update cached items whenever new items arrive (but NOT when they go empty during close)
  useEffect(() => {
    if (items && items.length > 0) setCachedItems(items);
  }, [items]);
  useEffect(() => {
    if (socialItems && socialItems.length > 0) setCachedSocialItems(socialItems);
  }, [socialItems]);

  // ── Sync controlled isOpen → internal state ──
  useEffect(() => {
    if (isOpen === undefined || isOpen === openRef.current) return;
    const target = isOpen;
    openRef.current = target;
    setOpen(target);
    if (target) {
      onMenuOpen?.();
      // Wait one frame so React has rendered updated items into the DOM
      requestAnimationFrame(() => playOpen());
    } else {
      onMenuClose?.();
      playClose();
    }
    animateIcon(target);
    animateColor(target);
    animateText(target);
  }, [isOpen, playOpen, playClose, animateIcon, animateColor, animateText, onMenuOpen, onMenuClose]);

  // ── Replay animation when refreshTrigger changes (e.g. different event selected) ──
  useEffect(() => {
    if (!openRef.current || refreshTrigger === undefined) return;
    busyRef.current = false;               // force-clear so playOpen doesn't bail
    requestAnimationFrame(() => playOpen());
  }, [refreshTrigger, playOpen]);

  // ── Click-away ──
  React.useEffect(() => {
    if (!closeOnClickAway || !open) return;
    const handleClickOutside = event => {
      const clickedInsidePanel = panelRef.current && panelRef.current.contains(event.target);
      const clickedInsideToggle = toggleBtnRef.current && toggleBtnRef.current.contains(event.target);
      if (!clickedInsidePanel && !clickedInsideToggle) closeMenu();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeOnClickAway, open, closeMenu]);

  // ──────────── RENDER ────────────
  return (
    <div
      className={(className ? className + ' ' : '') + 'staggered-menu-wrapper' + (isFixed ? ' fixed-wrapper' : '')}
      style={accentColor ? { '--sm-accent': accentColor } : undefined}
      data-position={position}
      data-open={open || undefined}
    >
      {/* Staggered colour underlays */}
      <div ref={preLayersRef} className="sm-prelayers" aria-hidden="true">
        {(() => {
          const raw = colors && colors.length ? colors.slice(0, 4) : ['#1e1e22', '#35353c'];
          let arr = [...raw];
          if (arr.length >= 3) {
            const mid = Math.floor(arr.length / 2);
            arr.splice(mid, 1);
          }
          return arr.map((c, i) => <div key={i} className="sm-prelayer" style={{ background: c }} />);
        })()}
      </div>

      {/* Header with toggle button (hidden in controlled modal mode) */}
      {!hideToggleButton && (
        <header className="staggered-menu-header" aria-label="Main navigation header">
          <div className="sm-logo" aria-label="Logo">
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo"
                className="sm-logo-img"
                draggable={false}
                width={110}
                height={24}
              />
            )}
          </div>
          <button
            ref={toggleBtnRef}
            className="sm-toggle"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="staggered-menu-panel"
            onClick={toggleMenu}
            type="button"
          >
            <span ref={textWrapRef} className="sm-toggle-textWrap" aria-hidden="true">
              <span ref={textInnerRef} className="sm-toggle-textInner">
                {textLines.map((l, i) => (
                  <span className="sm-toggle-line" key={i}>{l}</span>
                ))}
              </span>
            </span>
            <span ref={iconRef} className="sm-icon" aria-hidden="true">
              <span ref={plusHRef} className="sm-icon-line" />
              <span ref={plusVRef} className="sm-icon-line sm-icon-line-v" />
            </span>
          </button>
        </header>
      )}

      {/* Panel */}
      <aside id="staggered-menu-panel" ref={panelRef} className="staggered-menu-panel" aria-hidden={!open}>
        <div className="sm-panel-inner">

          {/* Close button when toggle header is hidden */}
          {hideToggleButton && (
            <button
              onClick={closeMenu}
              className="sm-close-btn"
              aria-label="Close panel"
            >
              ×
            </button>
          )}

          <ul className="sm-panel-list" role="list" data-numbering={displayItemNumbering || undefined}>
            {(cachedItems || []).map((it, idx) => (
              <li className="sm-panel-itemWrap" key={idx} style={it.isNonInteractive ? { overflow: 'visible' } : undefined}>
                {it.isNonInteractive ? (
                  <div className="sm-panel-item non-interactive" aria-label={it.ariaLabel} data-index={idx + 1} style={{ cursor: 'default', overflow: 'visible' }}>
                    <span className="sm-panel-itemLabel">{it.label}</span>
                  </div>
                ) : (
                  <a className="sm-panel-item" href={it.link || '#'} onClick={it.onClick} aria-label={it.ariaLabel} data-index={idx + 1}>
                    <span className="sm-panel-itemLabel">{it.label}</span>
                  </a>
                )}
              </li>
            ))}
          </ul>

          {displaySocials && cachedSocialItems && cachedSocialItems.length > 0 && (
            <div className="sm-socials" aria-label="Social links">
              <h3 className="sm-socials-title">Socials</h3>
              <ul className="sm-socials-list" role="list">
                {cachedSocialItems.map((s, i) => (
                  <li key={i} className="sm-socials-item">
                    <a href={s.link} target="_blank" rel="noopener noreferrer" className="sm-socials-link">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default StaggeredMenu;
