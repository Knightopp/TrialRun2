import React, { useState, useEffect, useRef } from 'react';
import TechText from './TechText';
import InfiniteSpiral from './components/InfiniteSpiral';
import FlowingMenu from './components/FlowingMenu';
import LatticeLoader from './components/LatticeLoader';
import PixelSwap from './components/PixelSwap';
import RippleDistortion from './components/RippleDistortion';
import CursorGrid from './components/CursorGrid';
import Dock from './components/Dock';
import StaggeredMenu from './components/StaggeredMenu';
import DodgeField from './components/DodgeField';
import Masonry from './components/Masonry';
import BorderGlow from './components/BorderGlow';
import GradientText from './components/GradientText';
import SplitText from './components/SplitText';
import { FiHome, FiCalendar, FiActivity, FiUserPlus } from 'react-icons/fi';
import './App.css';

const FEST_EVENTS = [
  { id: 'tracebot', label: 'TRACE BOT', category: 'ROBOTICS', image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=900&auto=format&fit=crop', details: 'Build an autonomous line-following robot to race the tracks.' },
  { id: 'treasurehunt', label: 'TREASURE HUNT', category: 'FUN', image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=900&auto=format&fit=crop', details: 'Solve cryptic clues to find the hidden technical treasures.' },
  { id: 'codingdebugging', label: 'CODING & DEBUGGING', category: 'DEV', image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=900&auto=format&fit=crop', details: 'Test your algorithmic logic and debugging skills against time.' },
  { id: 'aiwebsitemaking', label: 'AI WEBSITE MAKING', category: 'DEV', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=900&auto=format&fit=crop', details: 'Use AI tools to rapidly prototype and design stunning websites.' },
  { id: 'blindcoding', label: 'BLIND CODING', category: 'DEV', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=900&auto=format&fit=crop', details: 'Code with your monitor off! Test your syntax muscle memory.' },
  { id: 'ideathon', label: 'IDEATHON', category: 'INNOVATION', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=900&auto=format&fit=crop', details: 'Pitch your groundbreaking tech startup ideas to the jury.' },
  { id: 'waltz', label: 'WALTZ (DANCE)', category: 'CULTURE', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=900&auto=format&fit=crop', details: 'A spectacular dance competition combining grace and rhythm.' },
  { id: 'mindgame', label: 'MINDGAME', category: 'PUZZLE', image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=900&auto=format&fit=crop', details: 'A series of logic puzzles and lateral thinking challenges.' },
  { id: 'itquiz', label: 'IT QUIZ', category: 'KNOWLEDGE', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=900&auto=format&fit=crop', details: 'Test your knowledge of the latest in tech, IT history, and trivia.' },
  { id: 'facepainting', label: 'FACE PAINTING', category: 'ART', image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=900&auto=format&fit=crop', details: 'Express your creativity on a human canvas with vibrant colors.' },
  { id: 'hackathon', label: 'HACKATHON', category: 'DEV', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=900&auto=format&fit=crop', details: 'A 48-hour coding marathon to build innovative solutions.' }
];

const SPIRAL_MOMENTS = [
  'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=500&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=500&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=500&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=500&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=500&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=500&auto=format&fit=crop'
];

const GALLERY_ITEMS = [
  { id: 1, img: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600&auto=format&fit=crop', height: 400 },
  { id: 2, img: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600&auto=format&fit=crop', height: 250 },
  { id: 3, img: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=600&auto=format&fit=crop', height: 600 },
  { id: 4, img: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=600&auto=format&fit=crop', height: 350 },
  { id: 5, img: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=600&auto=format&fit=crop', height: 450 },
  { id: 6, img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop', height: 300 },
  { id: 7, img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop', height: 500 },
  { id: 8, img: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=600&auto=format&fit=crop', height: 350 },
  { id: 9, img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=600&auto=format&fit=crop', height: 550 },
  { id: 10, img: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=600&auto=format&fit=crop', height: 400 },
];


export default function App() {
  const [currentPage, setCurrentPage] = useState('main'); // 'main' (single page) | 'register' (separate page)
  const [activeSection, setActiveSection] = useState('home');
  const [selectedEventTrack, setSelectedEventTrack] = useState('HACKATHON');
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);

  // Initial loader states
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [loaderStatus, setLoaderStatus] = useState('working');

  // Registration form states
  const [formName, setFormName] = useState('');
  const [formCollege, setFormCollege] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTeamSize, setFormTeamSize] = useState('Squad of 4');
  const [formStatus, setFormStatus] = useState('idle');
  const [isRegistered, setIsRegistered] = useState(false);

  // PixelSwap transition states between Single Page and Registration Page
  const [pixelActive, setPixelActive] = useState(false);

  const navigateTo = (page, targetSection) => {
    if (page === 'register') {
      if (currentPage !== 'register') {
        setCurrentPage('register');
        setPixelActive(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      if (currentPage === 'register') {
        setCurrentPage('main');
        setPixelActive(false);
        setTimeout(() => {
          if (targetSection) {
            const el = document.getElementById(targetSection);
            el?.scrollIntoView({ behavior: 'smooth' });
            setActiveSection(targetSection);
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setActiveSection('home');
          }
        }, 100);
      } else {
        if (targetSection) {
          const el = document.getElementById(targetSection);
          el?.scrollIntoView({ behavior: 'smooth' });
          setActiveSection(targetSection);
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setActiveSection('home');
        }
      }
    }
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;
    setFormStatus('working');
    setTimeout(() => {
      setFormStatus('done');
      setIsRegistered(true);
    }, 1000);
  };

  useEffect(() => {
    // Initial artificial loading sequence
    const loaderTimer = setTimeout(() => {
      setLoaderStatus('done');
      // Wait for done animation to finish, then hide loader
      setTimeout(() => {
        setIsAppLoading(false);
      }, 1000); // Wait 1s for "done" state animation to show
    }, 2500); // 2.5s of "working" phase

    return () => clearTimeout(loaderTimer);
  }, []);

  // Main Single-Page Content
  const mainSinglePageContent = (
    <div style={{ width: '100%' }}>
      {/* 1. HERO SECTION (Pixel-matched to Reference Image) */}
      <section id="home" className="hero-viewport">
        {/* Background Kathakali artwork & flowing fabric */}
        <div className="hero-art-layer">
          <img
            src="/assets/kathakali-hero.jpg"
            alt="Kathakali Cultural Tech Hero"
            className="hero-art-img"
          />
        </div>

        {/* Top left corner CAD bracket */}
        <div className="hero-top-left-bracket"></div>
        <div className="hero-top-right-bracket"></div>

        {/* Left top festival metadata */}
        <div className="hero-meta-left">
          <span className="meta-sub-tag">
            NATIONAL LEVEL<br />TECH-CULTURAL FESTIVAL
          </span>
          <div className="meta-line"></div>
          <div className="meta-pillars">
            <span>INNOVATION</span>
            <span>CULTURE</span>
            <span>COMMUNITY</span>
          </div>
          <div className="meta-line" style={{ width: '20px' }}></div>
        </div>

        {/* Right side futuristic target aim badge */}
        <div className="hero-aim-right">
          <div className="target-circle">
            <div className="target-dot"></div>
          </div>
          <div className="target-word-stack">
            <span>ART</span>
            <span>TECH</span>
            <span>PEOPLE</span>
            <span>BEYOND</span>
          </div>
        </div>

        {/* Center Main Title */}
        <div className="hero-center-typography">
          {/* TechText interactive canvas with Akira Expanded font & outline physics */}
          <div className="hero-techt-box">
            <TechText
              text="SRISHTI"
              fontFamily="'Akira Expanded', sans-serif"
              fontWeight={900}
              fontSize={145}
              letterSpacing={0.02}
              color="#ffffff"
              accentColor="#38bdf8"
              reveal="letter"
              dashLength={4}
              dashGap={2}
              specks={18}
              draggable={true}
              sweep={true}
              speed={0.8}
            />
          </div>

          {/* Subtitle bar matching reference: WHERE IDEAS MEET CULTURE — 2.7 */}
          <div className="hero-tagline-bar">
            <span>WHERE IDEAS MEET CULTURE —</span>
            <span className="hero-tagline-edition">2.7</span>
          </div>

          {/* Date & Venue matching reference: JAN 2027 | ST THOMAS COLLEGE THRISSUR */}
          <div className="hero-date-venue">
            <div className="date-box">
              <span className="date-month">JAN</span>
              <span className="date-year">2027</span>
            </div>
            <div className="date-venue-divider"></div>
            <div className="venue-box">
              <span className="venue-name">ST THOMAS COLLEGE</span>
              <span className="venue-city">THRISSUR</span>
            </div>
          </div>
        </div>

        {/* Bottom Stats HUD bar matching reference */}
        <div className="hero-stats-hud">
          <div className="stats-glass-frame">
            <div className="hud-corner tl"></div>
            <div className="hud-corner tr"></div>
            <div className="hud-corner bl"></div>
            <div className="hud-corner br"></div>

            {/* Stat 1: 48 HRS */}
            <div className="stat-item">
              <div className="stat-icon-box">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a6 6 0 0 0-6 6c0 2.5 1.5 4.5 3 6v2h6v-2c1.5-1.5 3-3.5 3-6a6 6 0 0 0-6-6z" />
                  <path d="M9 18h6" />
                  <path d="M10 21h4" />
                </svg>
              </div>
              <div className="stat-info">
                <span className="stat-value">48 HRS</span>
                <span className="stat-desc">CONTINUOUS INNOVATION &amp; HACK</span>
              </div>
            </div>

            {/* Stat 2: ₹5.0L+ */}
            <div className="stat-item">
              <div className="stat-icon-box">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
                  <path d="M18 9h3a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3" />
                  <path d="M6 3h12v7a6 6 0 0 1-12 0V3z" />
                  <path d="M12 16v5" />
                  <path d="M8 21h8" />
                </svg>
              </div>
              <div className="stat-info">
                <span className="stat-value">₹5.0L+</span>
                <span className="stat-desc">PRIZE BOUNTY &amp; GRANTS</span>
              </div>
            </div>

            {/* Stat 3: 32+ */}
            <div className="stat-item">
              <div className="stat-icon-box">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="stat-info">
                <span className="stat-value">32+</span>
                <span className="stat-desc">TECHNICAL &amp; CULTURAL ARENAS</span>
              </div>
            </div>

            {/* Stat 4: 5000+ */}
            <div className="stat-item">
              <div className="stat-icon-box">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div className="stat-info">
                <span className="stat-value">5000+</span>
                <span className="stat-desc">NATIONWIDE DELEGATES</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll hint indicator matching reference */}
        <div className="scroll-indicator-wrap" onClick={() => navigateTo('main', 'events')}>
          <div className="mouse-pill">
            <div className="mouse-dot"></div>
          </div>
          <span className="scroll-label">SCROLL TO EXPLORE</span>
          <div className="scroll-trailing-line"></div>
        </div>
      </section>

      {/* 2. EVENTS SECTION — FlowingMenu */}
      <section id="events" className="events-flowing-section">
        <FlowingMenu
          items={FEST_EVENTS.map(ev => ({
            link: '#',
            text: ev.label,
            image: ev.image,
            tabId: ev.id
          }))}
          speed={12}
          textColor="#ffffff"
          bgColor="transparent"
          marqueeBgColor="#ffffff"
          marqueeTextColor="#0a0a0a"
          borderColor="rgba(255, 255, 255, 0.08)"
          onSelect={(tabId) => {
            const ev = FEST_EVENTS.find(e => e.id === tabId);
            if (ev) setSelectedEventDetails(ev);
          }}
        />
      </section>

      {/* Fun DodgeField Section */}
      <section style={{ padding: '8rem 0 10rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
        <h3 style={{ color: '#555', marginBottom: '1.5rem', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '2px', fontFamily: '"Inter", sans-serif' }}>
          Bonus Challenge
        </h3>
        <BorderGlow
          className="dodge-glow-wrapper"
          edgeSensitivity={30}
          glowColor="40 80 80"
          backgroundColor="#120F17"
          borderRadius={28}
          glowRadius={40}
          glowIntensity={1.0}
          coneSpread={25}
          animated={true}
          colors={['#c084fc', '#f472b6', '#38bdf8']}
        >
          <div style={{ padding: '2em', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <DodgeField
              inkColor="#f5f5f5"
              contrastColor="#18181b"
              fieldHeight={240}
              reach={120}
              radius={200}
              falloff={2}
              fleeDuration={300}
              returnDuration={620}
              returnBounce={0.1}
              axis="both"
              wall="clamp"
              patience={9999}
              taunts={['Catch me']}
              onCatch={() => alert('Caught it!')}
            />
          </div>
        </BorderGlow>
      </section>

      {/* 3. GALLERY SECTION — Masonry */}
      <section id="gallery" style={{ padding: '6rem 0', background: '#0a0a0a', width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 className="section-heading" style={{ marginBottom: '4rem', color: '#fff' }}>Moments of Srishti</h2>
        <div style={{ width: '90%', maxWidth: '1400px', height: '800px', position: 'relative' }}>
          <Masonry
            items={GALLERY_ITEMS}
            ease="power3.out"
            duration={0.6}
            stagger={0.05}
            animateFrom="bottom"
            scaleOnHover={true}
            hoverScale={0.95}
            blurToFocus={true}
            colorShiftOnHover={true}
          />
        </div>
      </section>

      {/* Selected Event Details Modal - StaggeredMenu Side Panel */}
      {/* Selected Event Details Modal - StaggeredMenu Side Panel */}
      <StaggeredMenu
        position="right"
        isOpen={!!selectedEventDetails}
        onClose={() => setSelectedEventDetails(null)}
        items={selectedEventDetails ? [
          { 
            isNonInteractive: true,
            label: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: 'clamp(200px, 100%, 350px)' }}>
                <img 
                  src={selectedEventDetails.image} 
                  alt={selectedEventDetails.label}
                  style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: '12px', pointerEvents: 'none' }} 
                />
                <GradientText
                  colors={['#ff4081', '#7c4dff', '#18ffff', '#ff4081']}
                  animationSpeed={4}
                  showBorder={false}
                  className="staggered-event-title"
                >
                  <span style={{ 
                    fontSize: '2.5rem', 
                    lineHeight: '1.05', 
                    textTransform: 'uppercase', 
                    display: 'block', 
                    textAlign: 'left',
                    fontWeight: '900',
                    fontFamily: '"Montserrat", "Inter", sans-serif',
                    letterSpacing: '-1px'
                  }}>
                    {selectedEventDetails.label}
                  </span>
                </GradientText>
              </div>
            )
          },
          { 
            label: 'Register Now', 
            ariaLabel: 'Register', 
            onClick: (e) => {
              e.preventDefault();
              setSelectedEventTrack(selectedEventDetails.label);
              setSelectedEventDetails(null);
              navigateTo('register');
            }
          }
        ] : []}
        socialItems={selectedEventDetails ? [
          { label: (
              <div style={{ 
                background: '#38bdf8', 
                color: '#fff', 
                padding: '0.75rem 1.5rem', 
                borderRadius: '8px', 
                fontWeight: '600', 
                fontSize: '1.1rem',
                display: 'inline-block',
                marginTop: '0.5rem',
                boxShadow: '0 4px 14px rgba(56, 189, 248, 0.4)'
              }}>
                View Poster & Rules
              </div>
            ), link: '#' },
          { label: <span style={{ display: 'block', marginTop: '1.5rem', color: '#888', fontSize: '0.9rem', textTransform: 'uppercase' }}>Coordinators</span>, link: '#' },
          { label: 'Alex Johnson: +91 98765 43210', link: 'tel:+919876543210' },
          { label: 'Sarah Williams: +91 98765 43211', link: 'tel:+919876543211' }
        ] : []}
        colors={['#1e1e22', '#38bdf8']}
        menuButtonColor="#fff"
        openMenuButtonColor="#000"
        accentColor="#38bdf8"
        isFixed={true}
      />
    </div>
  );

  // Dedicated Registration Page Content
  const separateRegisterPageContent = (
    <div className="register-page-container">
      <div className="section-head-bar">
        <div>
          <div className="section-eyebrow">OFFICIAL PORTAL // EDITION 2.7</div>
          <h2 className="section-heading">DELEGATE REGISTRATION</h2>
        </div>
        <button
          type="button"
          className="register-nav-btn"
          onClick={() => navigateTo('main', 'home')}
        >
          ← BACK TO HOME
        </button>
      </div>

      <div className="reg-split-layout">
        <BorderGlow
          borderRadius={16}
          glowRadius={28}
          backgroundColor="#080808"
          glowColor="0 0 100"
          glowIntensity={1.2}
        >
          <form className="form-inner-pad" onSubmit={handleRegisterSubmit}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-akira)', fontSize: '1rem', color: '#ffffff' }}>
                REGISTRATION FORM
              </h3>
              {formStatus !== 'idle' && (
                <LatticeLoader
                  status={formStatus === 'done' ? 'done' : 'working'}
                  label="VERIFYING"
                  doneLabel="CONFIRMED IN"
                  color="#ffffff"
                  doneColor="#ffffff"
                  shape="square"
                  grid={3}
                />
              )}
            </div>

            <div className="reg-form-fields">
              <div className="form-group-item">
                <label className="field-caption">Full Name</label>
                <input
                  type="text"
                  required
                  className="app-input"
                  placeholder="e.g. Alex Morgan"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className="form-group-item">
                <label className="field-caption">College / Institute</label>
                <input
                  type="text"
                  required
                  className="app-input"
                  placeholder="e.g. St Thomas College"
                  value={formCollege}
                  onChange={(e) => setFormCollege(e.target.value)}
                />
              </div>

              <div className="form-group-item">
                <label className="field-caption">Email Address</label>
                <input
                  type="email"
                  required
                  className="app-input"
                  placeholder="alex@domain.edu"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>

              <div className="form-group-item">
                <label className="field-caption">Event Track</label>
                <select
                  className="app-select"
                  value={selectedEventTrack}
                  onChange={(e) => {
                    const label = e.target.value;
                    setSelectedEventTrack(label);
                  }}
                >
                  {FEST_EVENTS.map(ev => (
                    <option key={ev.id} value={ev.label}>
                      {ev.label} ({ev.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group-item">
                <label className="field-caption">Participation Type</label>
                <select
                  className="app-select"
                  value={formTeamSize}
                  onChange={(e) => setFormTeamSize(e.target.value)}
                >
                  <option value="Solo Delegate">Solo Delegate</option>
                  <option value="Team of 2">Team of 2</option>
                  <option value="Squad of 4">Squad of 4</option>
                </select>
              </div>

              <div className="form-group-item">
                <label className="field-caption">Roll / Register ID</label>
                <input
                  type="text"
                  className="app-input"
                  placeholder="e.g. 2024CS1044"
                />
              </div>

              <div className="form-group-item span-2" style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="submit"
                  className="btn-confirm-reg"
                  disabled={formStatus === 'working'}
                >
                  {isRegistered ? 'PASS ISSUED' : 'COMPLETE REGISTRATION'}
                </button>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#64748b' }}>
                  FREE BADGE • JAN 2027
                </span>
              </div>
            </div>
          </form>
        </BorderGlow>

        {/* Digital Pass Preview */}
        <BorderGlow
          borderRadius={16}
          glowRadius={24}
          backgroundColor="#080808"
          glowColor="0 0 100"
          glowIntensity={0.8}
        >
          <div className="pass-card-wrap">
            <div className="pass-top">
              <div className="pass-code-tag">ENTRY PASS // SRISHTI 2.7</div>
              <div className="pass-title-lg">OFFICIAL DELEGATE</div>
            </div>

            <div className="pass-detail-row">
              <span className="pass-detail-label">DELEGATE</span>
              <span className="pass-detail-val">{formName || 'CANDIDATE'}</span>
            </div>

            <div className="pass-detail-row">
              <span className="pass-detail-label">INSTITUTE</span>
              <span className="pass-detail-val">{formCollege || 'AFFILIATED CAMPUS'}</span>
            </div>

            <div className="pass-detail-row">
              <span className="pass-detail-label">TRACK</span>
              <span className="pass-detail-val">{selectedEventTrack}</span>
            </div>

            <div className="pass-detail-row">
              <span className="pass-detail-label">VENUE</span>
              <span className="pass-detail-val">ST THOMAS COLLEGE</span>
            </div>

            <div className="pass-detail-row">
              <span className="pass-detail-label">STATUS</span>
              <span className="pass-detail-val" style={{ color: isRegistered ? '#ffffff' : '#64748b' }}>
                {isRegistered ? 'VERIFIED // ACTIVE' : 'PENDING SUBMISSION'}
              </span>
            </div>

            <div className="pass-barcode"></div>
          </div>
        </BorderGlow>
      </div>


    </div>
  );

  return (
    <>
      {/* INITIAL LOAD OVERLAY */}
      <div 
        className="initial-loader" 
        style={{
          position: 'fixed',
          inset: 0,
          background: '#0a0a0a',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isAppLoading ? 1 : 0,
          pointerEvents: isAppLoading ? 'auto' : 'none',
          transition: 'opacity 0.6s ease-out',
        }}
      >
        <SplitText
          text="SRISHTI"
          className="srishti-loader-title"
          delay={100}
          duration={0.8}
          ease="power4.out"
          splitType="chars"
          from={{ opacity: 0, y: 30, scale: 0.9 }}
          to={{ opacity: 1, y: 0, scale: 1 }}
        />
        <div style={{ marginTop: '3rem' }}>
          <LatticeLoader
            status={loaderStatus}
            label="Booting Systems"
            doneLabel="Ready"
            errorLabel="Failed"
            pattern="orbit"
            grid={3}
            shape="square"
            color="#fff"
            doneColor="#38bdf8"
            cellSize={10}
            gap={4}
            fontSize={16}
            step={120}
            idleOpacity={0.15}
            glow={true}
            glowColor="#c084fc"
            showTimer={false}
          />
        </div>
      </div>

      {/* Fixed full-screen CursorGrid background */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <div style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}>
          <CursorGrid
            cellSize={70}
            color="#38bdf8"
            radius={160}
            falloff="smooth"
            holdTime={350}
            fadeDuration={900}
            lineWidth={1}
            maxOpacity={0.7}
            fillOpacity={0.04}
            gridOpacity={0.04}
            cellRadius={0}
            clickPulse
            pulseSpeed={650}
          />
        </div>
      </div>

      {/* Bottom Floating Nav (Dock) */}
      <div style={{ position: 'fixed', bottom: '1rem', left: '0', right: '0', zIndex: 100, pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto' }}>
          <Dock 
            items={[
              { icon: <FiHome size={20} />, label: 'Home', onClick: () => navigateTo('main', 'home') },
              { icon: <FiCalendar size={20} />, label: 'Events', onClick: () => navigateTo('main', 'events') },
              { icon: <FiActivity size={20} />, label: 'Experience', onClick: () => navigateTo('main', 'experience') },
              { icon: <FiUserPlus size={20} />, label: 'Register', onClick: () => navigateTo('register') },
            ]}
            panelHeight={68}
            baseItemSize={50}
            magnification={95}
          />
        </div>
      </div>

      {/* Main Single Page and Separate Registration Page transitioned via PixelSwap */}
      <PixelSwap
        firstContent={mainSinglePageContent}
        secondContent={separateRegisterPageContent}
        active={pixelActive}
        pixelSize={64}
        duration={420}
        pattern="random"
      />
    </>
  );
}
