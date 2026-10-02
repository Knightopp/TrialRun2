import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import TechText from './TechText';
import InfiniteSpiral from './components/InfiniteSpiral';
import FlowingMenu from './components/FlowingMenu';
import LatticeLoader from './components/LatticeLoader';
import PixelSwap from './components/PixelSwap';
import RippleDistortion from './components/RippleDistortion';
import CursorGrid from './components/CursorGrid';
import Dock from './components/Dock';
import StaggeredMenu from './components/StaggeredMenu';
import ClickExpand from './components/ClickExpand';
import MorphSlider from './components/MorphSlider';
import Stepper, { Step } from './components/Stepper';
import DodgeField from './components/DodgeField';
import Masonry from './components/Masonry';
import BorderGlow from './components/BorderGlow';
import GradientText from './components/GradientText';
import SplitText from './components/SplitText';
import Silk from './components/Silk';
import PatternWaves from './components/PatternWaves';
import { FiHome, FiCalendar, FiActivity, FiUserPlus } from 'react-icons/fi';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import ColorBends from './components/ColorBends';
import GlareHover from './components/GlareHover';
import { supabase } from './supabaseClient';
import './App.css';

const FEST_EVENTS = [
  { id: 'tracebot', label: 'TRACE BOT', category: 'ROBOTICS', group: 'Team Events', image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=900&auto=format&fit=crop', details: 'Build an autonomous line-following robot to race the tracks.' },
  { id: 'treasurehunt', label: 'TREASURE HUNT', category: 'FUN', group: 'Popular', image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=900&auto=format&fit=crop', details: 'Solve cryptic clues to find the hidden technical treasures.' },
  { id: 'codingdebugging', label: 'CODING & DEBUGGING', category: 'DEV', group: 'Solo Events', image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=900&auto=format&fit=crop', details: 'Test your algorithmic logic and debugging skills against time.' },
  { id: 'aiwebsitemaking', label: 'AI WEBSITE MAKING', category: 'DEV', group: 'Popular', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=900&auto=format&fit=crop', details: 'Use AI tools to rapidly prototype and design stunning websites.' },
  { id: 'blindcoding', label: 'BLIND CODING', category: 'DEV', group: 'Solo Events', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=900&auto=format&fit=crop', details: 'Code with your monitor off! Test your syntax muscle memory.' },
  { id: 'ideathon', label: 'IDEATHON', category: 'INNOVATION', group: 'Team Events', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=900&auto=format&fit=crop', details: 'Pitch your groundbreaking tech startup ideas to the jury.' },
  { id: 'waltz', label: 'WALTZ (DANCE)', category: 'CULTURE', group: 'Team Events', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=900&auto=format&fit=crop', details: 'A spectacular dance competition combining grace and rhythm.' },
  { id: 'mindgame', label: 'MINDGAME', category: 'PUZZLE', group: 'Solo Events', image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=900&auto=format&fit=crop', details: 'A series of logic puzzles and lateral thinking challenges.' },
  { id: 'itquiz', label: 'IT QUIZ', category: 'KNOWLEDGE', group: 'Solo Events', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=900&auto=format&fit=crop', details: 'Test your knowledge of the latest in tech, IT history, and trivia.' },
  { id: 'facepainting', label: 'FACE PAINTING', category: 'ART', group: 'Solo Events', image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=900&auto=format&fit=crop', details: 'Express your creativity on a human canvas with vibrant colors.' },
  { id: 'hackathon', label: 'HACKATHON', category: 'DEV', group: 'Popular', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=900&auto=format&fit=crop', details: 'A 48-hour coding marathon to build innovative solutions.' }
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
  const navigate = useNavigate();
  const location = useLocation();

  const isRegisterPage = location.pathname.startsWith('/register');

  const matchEventRoute = location.pathname.match(/^\/register\/([a-zA-Z0-9-]+)$/);
  const activeEventData = matchEventRoute ? FEST_EVENTS.find(e => e.id === matchEventRoute[1]) : null;

  const sliderItems = React.useMemo(() => {
    if (!activeEventData) return [];
    return [
      { image: activeEventData.image, caption: 'Poster' },
      { image: 'https://images.unsplash.com/photo-1516222338250-863216ce01ea?q=80&w=1600&auto=format&fit=crop', caption: 'Rules' }
    ];
  }, [activeEventData]);

  const [activeSection, setActiveSection] = useState('home');
  const [selectedEventTrack, setSelectedEventTrack] = useState('');
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);

  // Initial loader states
  const [isAppLoading, setIsAppLoading] = useState(true);

  // Registration form states
  const [formName, setFormName] = useState('');
  const [formCollege, setFormCollege] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRoll, setFormRoll] = useState('');
  const [formTeamSize, setFormTeamSize] = useState(1);
  const [formStatus, setFormStatus] = useState('idle');
  const [isRegistered, setIsRegistered] = useState(false);
  const [isFormMenuOpen, setIsFormMenuOpen] = useState(false);

  const [activeStep, setActiveStep] = useState(1);
  
  const [teamMembers, setTeamMembers] = useState({
    2: { name: '', email: '', phone: '', roll: '' },
    3: { name: '', email: '', phone: '', roll: '' },
    4: { name: '', email: '', phone: '', roll: '' },
    5: { name: '', email: '', phone: '', roll: '' },
  });

  const updateTeamMember = (id, field, value) => {
    setTeamMembers(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const [paymentVerified, setPaymentVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [utrNumber, setUtrNumber] = useState('');

  useEffect(() => {
    if (activeEventData) {
      if (activeEventData.id === 'hackathon') {
        setFormTeamSize(3);
      } else if (activeEventData.group === 'Solo Events') {
        setFormTeamSize(1);
      } else {
        setFormTeamSize(2);
      }
    }
  }, [activeEventData]);

  const verifyPayment = async () => {
    if (!utrNumber || utrNumber.length < 12) {
      setPaymentError('Please enter a valid 12-digit UTR number.');
      return;
    }
    
    setIsVerifying(true);
    setPaymentError(null);
    try {
      const expectedAmount = formTeamSize * 10; // Example: 10 per person
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: expectedAmount, utr: utrNumber })
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        setPaymentVerified(true);
      } else {
        setPaymentError(data.message || 'Payment not found. Try again in a minute.');
      }
    } catch (err) {
      setPaymentError('Network error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const isStepValid = (step) => {
    if (step === 1) return true;
    if (step === 2) return formName.trim() !== '' && formCollege.trim() !== '' && formEmail.trim() !== '' && formPhone.trim() !== '';
    
    if (step > 2 && step <= formTeamSize + 1) {
       const memberIndex = step - 1;
       const member = teamMembers[memberIndex];
       if (!member) return false;
       return member.name.trim() !== '' && member.email.trim() !== '' && member.phone.trim() !== '';
    }
    
    if (step === formTeamSize + 2) return paymentVerified;
    
    return true;
  };

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(
        typeof window !== 'undefined' &&
        (window.innerWidth <= 768 || window.matchMedia('(pointer: coarse)').matches)
      );
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navigateTo = (page, targetSection) => {
    const isMob = typeof window !== 'undefined' && window.innerWidth <= 768;
    const scrollOpt = isMob ? { top: 0, behavior: 'auto' } : { top: 0, behavior: 'smooth' };
    const scrollIntoOpt = isMob ? { behavior: 'auto' } : { behavior: 'smooth' };

    const getTargetEl = (id) => {
      if (!id) return null;
      return document.getElementById(id) || (id === 'experience' ? document.getElementById('gallery') : null);
    };

    if (page === 'register') {
      if (!isRegisterPage) {
        navigate('/register');
        window.scrollTo(scrollOpt);
      }
    } else {
      if (isRegisterPage) {
        navigate('/');
        setTimeout(() => {
          if (targetSection) {
            const el = getTargetEl(targetSection);
            el?.scrollIntoView(scrollIntoOpt);
            setActiveSection(targetSection);
          } else {
            window.scrollTo(scrollOpt);
            setActiveSection('home');
          }
        }, 100);
      } else {
        if (targetSection) {
          const el = getTargetEl(targetSection);
          el?.scrollIntoView(scrollIntoOpt);
          setActiveSection(targetSection);
        } else {
          window.scrollTo(scrollOpt);
          setActiveSection('home');
        }
      }
    }
  };

  const handleRegisterSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;
    setFormStatus('working');
    
    // Prepare members array
    const members = [];
    for (let i = 2; i <= formTeamSize; i++) {
      if (teamMembers[i]) {
        members.push({
          member_index: i,
          name: teamMembers[i].name,
          email: teamMembers[i].email,
          phone: teamMembers[i].phone,
          roll: teamMembers[i].roll
        });
      }
    }

    try {
      const { error } = await supabase
        .from('registrations')
        .insert([
          {
            event_id: activeEventData.id,
            event_name: activeEventData.label,
            team_size: formTeamSize,
            lead_name: formName,
            lead_college: formCollege,
            lead_email: formEmail,
            lead_phone: formPhone,
            lead_roll: formRoll,
            team_members: members,
            payment_status: 'verified' // By Option A logic, it only hits here if paymentVerified is true
          }
        ]);

      if (error) throw error;
      
      setFormStatus('done');
      setIsRegistered(true);
    } catch (error) {
      console.error('Error saving registration:', error);
      alert('There was an error saving your registration to the database. Please contact support.');
      setFormStatus('idle'); // Let them try again
    }
  };

  useEffect(() => {
    // Lock scroll to top initially and prevent browser scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    document.body.style.overflow = 'hidden';

    // Initial artificial loading sequence
    const loaderTimer = setTimeout(() => {
      setIsAppLoading(false);
      document.body.style.overflow = 'auto';
      
      // Force scroll to top again just in case browser tried to snap to a hash
      window.scrollTo(0, 0);
      
      // Refresh ScrollTrigger after the slide-up animation finishes (0.9s)
      setTimeout(() => {
        import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
          ScrollTrigger.refresh();
          // GSAP sometimes tries to restore scroll position after refresh.
          // Force scroll to top immediately after to override it.
          window.scrollTo(0, 0);
        });
      }, 950);
    }, 2100);

    return () => {
      clearTimeout(loaderTimer);
      document.body.style.overflow = 'auto';
    };
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

        {/* Top left corner brand lockup */}
        <div className="hero-brand-badge-top" onClick={() => navigateTo('main', 'home')}>
          <img 
            src="/assets/logo.png" 
            alt="Srishti Logo" 
            className="brand-logo-img" 
          />
          <span className="brand-logo-text">SRISHTI</span>
          <span className="brand-edition-pill">2.7</span>
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

      {/* Fun DodgeField Section - Hidden on mobile per user request */}
      {!isMobile && (
        <section className="dodge-challenge-section" style={{ padding: '8rem 0 10rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
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
      )}

      {/* 3. GALLERY SECTION — Moments of Srishti with PatternWaves Background */}
      <section 
        id="gallery" 
        className="moments-gallery-section"
        style={{ 
          padding: '6rem 0', 
          background: '#0a0a0a', 
          width: '100%', 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Animated fluid PatternWaves canvas background */}
        <div 
          className="moments-waves-bg"
          style={{ 
            position: 'absolute', 
            inset: 0, 
            width: '100%', 
            height: '100%', 
            zIndex: 0, 
            pointerEvents: 'none',
            opacity: 0.75
          }}
        >
          <PatternWaves
            preset="silk"
            color="#38bdf8"
            backgroundColor="#0a0a0a"
            fade="edges"
            fadeSize={0.4}
            interactive={!isMobile}
            cursorSize={50}
            cursorStrength={0.5}
            opacity={0.85}
          />
        </div>

        <h2 
          className="section-heading" 
          style={{ 
            marginBottom: '4rem', 
            color: '#fff',
            position: 'relative',
            zIndex: 2,
            textShadow: '0 4px 24px rgba(0,0,0,0.9)'
          }}
        >
          Moments of Srishti
        </h2>
        <div 
          className="moments-masonry-wrapper"
          style={{ 
            width: '90%', 
            maxWidth: '1400px', 
            position: 'relative',
            zIndex: 2,
            minHeight: '600px'
          }}
        >
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

      {/* Supreme Srishti Footer with Logo & Credentials */}
      <footer className="srishti-footer">
        <div className="footer-brand-side">
          <div className="footer-logo-lockup" onClick={() => navigateTo('main', 'home')}>
            <img src="/assets/logo.png" alt="Srishti Logo" className="footer-logo-img" />
            <div className="footer-brand-text">
              <span className="footer-title">SRISHTI 2.7</span>
              <span className="footer-subtitle">NATIONAL TECH-CULTURAL FESTIVAL</span>
            </div>
          </div>
          <p className="footer-host">
            ST. THOMAS COLLEGE (AUTONOMOUS), THRISSUR<br />
            DEPARTMENT OF COMPUTER APPLICATIONS
          </p>
        </div>
        <div className="footer-meta-side">
          <span className="footer-edition">EDITION 2.7 • JAN 2027</span>
          <span className="footer-copy">© 2027 SRISHTI. ALL RIGHTS RESERVED.</span>
        </div>
      </footer>

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

      {['Popular', 'Solo Events', 'Team Events'].map(groupName => (
        <div key={groupName} style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontFamily: 'var(--font-akira)', fontSize: '0.9rem', color: '#94a3b8', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
            {groupName.toUpperCase()}
          </h3>
          <div className="reg-events-carousel">
            {FEST_EVENTS.filter(ev => ev.group === groupName).map((ev) => (
              <div 
                key={ev.id} 
                className={`reg-event-card ${selectedEventTrack === ev.label ? 'active' : ''}`}
                onClick={() => {
                  setSelectedEventTrack(ev.label);
                  navigate(`/register/${ev.id}`);
                }}
                style={{ flexShrink: 0, scrollSnapAlign: 'start' }}
              >
                <GlareHover
                  width="240px"
                  height="340px"
                  glareColor="#ffffff"
                  glareOpacity={0.2}
                  glareAngle={-30}
                  glareSize={200}
                  borderRadius="12px"
                  borderColor={selectedEventTrack === ev.label ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}
                >
                  <div className="reg-event-card-inner">
                    <img src={ev.image} alt={ev.label} className="reg-event-card-bg" />
                    <div className="reg-event-card-overlay"></div>
                    <div className="reg-event-card-content">
                      <div className="reg-event-card-title">{ev.label}</div>
                      <div className="reg-event-card-category">{ev.category}</div>
                      <div className="reg-event-card-active-line"></div>
                    </div>
                  </div>
                </GlareHover>
              </div>
            ))}
            {/* Cross-browser bulletproof DOM spacer to force scroll space */}
            <div style={{ flexShrink: 0, width: '1.5rem', height: '1px', pointerEvents: 'none' }} aria-hidden="true" />
          </div>
        </div>
      ))}
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
          pointerEvents: isAppLoading ? 'auto' : 'none',
          transition: 'transform 0.9s cubic-bezier(0.77, 0, 0.175, 1)',
          transform: isAppLoading ? 'translateY(0)' : 'translateY(-100%)',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        <div className="loader-logo-wrap" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <img 
            src="/assets/logo.png" 
            alt="Srishti Logo" 
            style={{ 
              width: '80px', 
              height: '80px', 
              objectFit: 'contain',
              background: 'transparent',
              filter: 'drop-shadow(0 0 30px rgba(56, 189, 248, 0.75))'
            }} 
          />
        </div>
        <SplitText
          text="SRISHTI"
          className="srishti-loader-title"
          delay={70}
          duration={0.65}
          ease="power3.out"
          splitType="chars"
          from={{ opacity: 0, y: 25 }}
          to={{ opacity: 1, y: 0 }}
          useScrollTrigger={false}
        />
        <div style={{ marginTop: '3rem' }}>
          <LatticeLoader
            status="working"
            label=""
            doneLabel=""
            errorLabel=""
            pattern="orbit"
            grid={3}
            shape="round"
            color="#ffffff"
            doneColor="#ffffff"
            cellSize={10}
            gap={4}
            fontSize={16}
            step={120}
            idleOpacity={0.15}
            glow={true}
            glowColor="#0036ff"
            showTimer={false}
          />
        </div>
      </div>

      {/* Main App Content that slides up */}
      <div
        style={{
          transition: 'transform 0.8s cubic-bezier(0.77, 0, 0.175, 1)',
          transform: isAppLoading ? 'translateY(100vh)' : 'translateY(0)',
          minHeight: '100vh',
          width: '100%',
        }}
      >
        {/* Main Single Page and Separate Registration Page routing */}
        <Routes>
          <Route path="/" element={
            <>
              {/* Fixed full-screen CursorGrid background for Home Page */}
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
              {mainSinglePageContent}
            </>
          } />
          <Route path="/register" element={
            <>
              {/* ColorBends Background for Registration Page (Disabled on mobile to prevent lag) */}
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, background: '#020617' }}>
                {!isMobile && (
                  <ColorBends
                    colors={["#0036ff", "#38bdf8", "#0ea5e9"]}
                    rotation={90}
                    speed={0.2}
                    scale={1}
                    frequency={1}
                    warpStrength={1}
                    mouseInfluence={1}
                    noise={0.15}
                    parallax={0.5}
                    iterations={1}
                    intensity={1.5}
                    bandWidth={6}
                    transparent={true}
                  />
                )}
              </div>
              {separateRegisterPageContent}
            </>
          } />
          <Route path="/register/:eventId" element={
            activeEventData ? (() => {
              const eventContent = (
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', width: '100%', height: isMobile ? 'auto' : '100%', minHeight: '100%', padding: isMobile ? '4.5rem 1.25rem 2rem' : '4rem 6rem', gap: isMobile ? '2.5rem' : '4rem', boxSizing: 'border-box', overflowY: isMobile ? 'visible' : 'hidden', overflowX: 'hidden' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'center' }}>
                    <div className="form-inner-pad" style={{ width: '100%', maxWidth: '520px', background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(24px)', borderRadius: '24px', padding: '2rem 1.25rem', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', padding: '0 1rem' }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.15em', color: '#38bdf8' }}>REGISTRATION</div>
                          <h3 style={{ fontFamily: 'var(--font-akira)', fontSize: '1.25rem', color: '#ffffff', lineHeight: 1.2 }}>
                            {activeEventData.label}
                          </h3>
                          {formStatus !== 'idle' && (
                            <div style={{ marginTop: '1rem' }}>
                              <LatticeLoader
                                status={formStatus === 'done' ? 'done' : 'working'}
                                label="VERIFYING"
                                doneLabel="CONFIRMED"
                                color="#ffffff"
                                doneColor="#ffffff"
                                shape="square"
                                grid={3}
                              />
                            </div>
                          )}
                        </div>
                        
                        {formStatus === 'idle' ? (
                          <Stepper
                            initialStep={1}
                            onStepChange={setActiveStep}
                            onFinalStepCompleted={handleRegisterSubmit}
                            backButtonText="Previous"
                            nextButtonText="Continue"
                            nextButtonProps={{ disabled: !isStepValid(activeStep) }}
                            disableStepIndicators={true}
                          >
                            <Step>
                              <div className="form-group-item">
                                <label className="field-caption" style={{ color: '#cbd5e1' }}>Participation Type</label>
                                <select className="app-select" value={formTeamSize} onChange={(e) => setFormTeamSize(Number(e.target.value))}>
                                  {activeEventData?.id === 'hackathon' ? (
                                    <>
                                      <option value={3}>Team of 3</option>
                                      <option value={4}>Team of 4</option>
                                      <option value={5}>Team of 5</option>
                                    </>
                                  ) : activeEventData?.group === 'Solo Events' ? (
                                    <option value={1}>Solo Delegate</option>
                                  ) : (
                                    <>
                                      <option value={2}>Team of 2</option>
                                      <option value={3}>Team of 3</option>
                                      <option value={4}>Team of 4</option>
                                      <option value={5}>Team of 5</option>
                                    </>
                                  )}
                                </select>
                              </div>
                            </Step>

                            <Step>
                              <div style={{ maxHeight: isMobile ? 'none' : '55vh', overflowY: 'auto', paddingRight: '0.5rem' }} className="reg-form-fields">
                                <div className="form-group-item">
                                  <label className="field-caption" style={{ color: '#cbd5e1' }}>Primary Contact (Team Lead)</label>
                                  <input type="text" required className="app-input" placeholder="e.g. Alex Morgan" value={formName} onChange={(e) => setFormName(e.target.value)} />
                                </div>
                                <div className="form-group-item" style={{ marginTop: '1.25rem' }}>
                                  <label className="field-caption" style={{ color: '#cbd5e1' }}>College / Institute</label>
                                  <input type="text" required className="app-input" placeholder="e.g. St Thomas College" value={formCollege} onChange={(e) => setFormCollege(e.target.value)} />
                                </div>
                                <div className="form-group-item" style={{ marginTop: '1.25rem' }}>
                                  <label className="field-caption" style={{ color: '#cbd5e1' }}>Email Address</label>
                                  <input type="email" required className="app-input" placeholder="alex@domain.edu" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
                                </div>
                                <div className="form-group-item" style={{ marginTop: '1.25rem' }}>
                                  <label className="field-caption" style={{ color: '#cbd5e1' }}>Phone Number</label>
                                  <input type="tel" required className="app-input" placeholder="+1 (555) 000-0000" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
                                </div>
                                <div className="form-group-item" style={{ marginTop: '1.25rem' }}>
                                  <label className="field-caption" style={{ color: '#cbd5e1' }}>Roll / Register ID (Optional)</label>
                                  <input type="text" className="app-input" placeholder="e.g. 2024CS1044" value={formRoll} onChange={(e) => setFormRoll(e.target.value)} />
                                </div>
                              </div>
                            </Step>

                            {formTeamSize >= 2 && (
                              <Step>
                                <div style={{ maxHeight: isMobile ? 'none' : '55vh', overflowY: 'auto', paddingRight: '0.5rem' }} className="reg-form-fields">
                                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#38bdf8', marginBottom: '1rem' }}>TEAM MEMBER 2</div>
                                  <div className="form-group-item">
                                    <label className="field-caption" style={{ color: '#cbd5e1' }}>Full Name</label>
                                    <input type="text" required className="app-input" placeholder="Full Name" value={teamMembers[2].name} onChange={(e) => updateTeamMember(2, 'name', e.target.value)} />
                                  </div>
                                  <div className="form-group-item" style={{ marginTop: '1.25rem' }}>
                                    <label className="field-caption" style={{ color: '#cbd5e1' }}>Email Address</label>
                                    <input type="email" required className="app-input" placeholder="Email Address" value={teamMembers[2].email} onChange={(e) => updateTeamMember(2, 'email', e.target.value)} />
                                  </div>
                                  <div className="form-group-item" style={{ marginTop: '1.25rem' }}>
                                    <label className="field-caption" style={{ color: '#cbd5e1' }}>Phone Number</label>
                                    <input type="tel" required className="app-input" placeholder="Phone Number" value={teamMembers[2].phone} onChange={(e) => updateTeamMember(2, 'phone', e.target.value)} />
                                  </div>
                                  <div className="form-group-item" style={{ marginTop: '1.25rem' }}>
                                    <label className="field-caption" style={{ color: '#cbd5e1' }}>Roll / Register ID</label>
                                    <input type="text" className="app-input" placeholder="Roll / Register ID" value={teamMembers[2].roll} onChange={(e) => updateTeamMember(2, 'roll', e.target.value)} />
                                  </div>
                                </div>
                              </Step>
                            )}

                            {formTeamSize >= 3 && (
                              <Step>
                                <div style={{ maxHeight: isMobile ? 'none' : '55vh', overflowY: 'auto', paddingRight: '0.5rem' }} className="reg-form-fields">
                                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#38bdf8', marginBottom: '1rem' }}>TEAM MEMBER 3</div>
                                  <div className="form-group-item">
                                    <label className="field-caption" style={{ color: '#cbd5e1' }}>Full Name</label>
                                    <input type="text" required className="app-input" placeholder="Full Name" value={teamMembers[3].name} onChange={(e) => updateTeamMember(3, 'name', e.target.value)} />
                                  </div>
                                  <div className="form-group-item" style={{ marginTop: '1.25rem' }}>
                                    <label className="field-caption" style={{ color: '#cbd5e1' }}>Email Address</label>
                                    <input type="email" required className="app-input" placeholder="Email Address" value={teamMembers[3].email} onChange={(e) => updateTeamMember(3, 'email', e.target.value)} />
                                  </div>
                                  <div className="form-group-item" style={{ marginTop: '1.25rem' }}>
                                    <label className="field-caption" style={{ color: '#cbd5e1' }}>Phone Number</label>
                                    <input type="tel" required className="app-input" placeholder="Phone Number" value={teamMembers[3].phone} onChange={(e) => updateTeamMember(3, 'phone', e.target.value)} />
                                  </div>
                                  <div className="form-group-item" style={{ marginTop: '1.25rem' }}>
                                    <label className="field-caption" style={{ color: '#cbd5e1' }}>Roll / Register ID</label>
                                    <input type="text" className="app-input" placeholder="Roll / Register ID" value={teamMembers[3].roll} onChange={(e) => updateTeamMember(3, 'roll', e.target.value)} />
                                  </div>
                                </div>
                              </Step>
                            )}

                            {formTeamSize >= 4 && (
                              <Step>
                                <div style={{ maxHeight: isMobile ? 'none' : '55vh', overflowY: 'auto', paddingRight: '0.5rem' }} className="reg-form-fields">
                                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#38bdf8', marginBottom: '1rem' }}>TEAM MEMBER 4</div>
                                  <div className="form-group-item">
                                    <label className="field-caption" style={{ color: '#cbd5e1' }}>Full Name</label>
                                    <input type="text" required className="app-input" placeholder="Full Name" value={teamMembers[4].name} onChange={(e) => updateTeamMember(4, 'name', e.target.value)} />
                                  </div>
                                  <div className="form-group-item" style={{ marginTop: '1.25rem' }}>
                                    <label className="field-caption" style={{ color: '#cbd5e1' }}>Email Address</label>
                                    <input type="email" required className="app-input" placeholder="Email Address" value={teamMembers[4].email} onChange={(e) => updateTeamMember(4, 'email', e.target.value)} />
                                  </div>
                                  <div className="form-group-item" style={{ marginTop: '1.25rem' }}>
                                    <label className="field-caption" style={{ color: '#cbd5e1' }}>Phone Number</label>
                                    <input type="tel" required className="app-input" placeholder="Phone Number" value={teamMembers[4].phone} onChange={(e) => updateTeamMember(4, 'phone', e.target.value)} />
                                  </div>
                                  <div className="form-group-item" style={{ marginTop: '1.25rem' }}>
                                    <label className="field-caption" style={{ color: '#cbd5e1' }}>Roll / Register ID</label>
                                    <input type="text" className="app-input" placeholder="Roll / Register ID" value={teamMembers[4].roll} onChange={(e) => updateTeamMember(4, 'roll', e.target.value)} />
                                  </div>
                                </div>
                              </Step>
                            )}
                            
                            {formTeamSize >= 5 && (
                              <Step>
                                <div style={{ maxHeight: isMobile ? 'none' : '55vh', overflowY: 'auto', paddingRight: '0.5rem' }} className="reg-form-fields">
                                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#38bdf8', marginBottom: '1rem' }}>TEAM MEMBER 5</div>
                                  <div className="form-group-item">
                                    <label className="field-caption" style={{ color: '#cbd5e1' }}>Full Name</label>
                                    <input type="text" required className="app-input" placeholder="Full Name" value={teamMembers[5].name} onChange={(e) => updateTeamMember(5, 'name', e.target.value)} />
                                  </div>
                                  <div className="form-group-item" style={{ marginTop: '1.25rem' }}>
                                    <label className="field-caption" style={{ color: '#cbd5e1' }}>Email Address</label>
                                    <input type="email" required className="app-input" placeholder="Email Address" value={teamMembers[5].email} onChange={(e) => updateTeamMember(5, 'email', e.target.value)} />
                                  </div>
                                  <div className="form-group-item" style={{ marginTop: '1.25rem' }}>
                                    <label className="field-caption" style={{ color: '#cbd5e1' }}>Phone Number</label>
                                    <input type="tel" required className="app-input" placeholder="Phone Number" value={teamMembers[5].phone} onChange={(e) => updateTeamMember(5, 'phone', e.target.value)} />
                                  </div>
                                  <div className="form-group-item" style={{ marginTop: '1.25rem' }}>
                                    <label className="field-caption" style={{ color: '#cbd5e1' }}>Roll / Register ID</label>
                                    <input type="text" className="app-input" placeholder="Roll / Register ID" value={teamMembers[5].roll} onChange={(e) => updateTeamMember(5, 'roll', e.target.value)} />
                                  </div>
                                </div>
                              </Step>
                            )}

                            <Step>
                              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                                <h4 style={{ fontFamily: 'var(--font-akira)', color: '#fff', fontSize: '1.5rem', marginBottom: '1rem' }}>Payment Verification</h4>
                                <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>Please scan the QR code to send ₹{formTeamSize * 10} via FamPay, then enter your UTR number below.</p>
                                
                                {paymentVerified ? (
                                  <div style={{ color: '#10b981', padding: '1rem', border: '1px solid #10b981', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)' }}>
                                    Payment Verified successfully! You can now complete registration.
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                                    
                                    <div style={{ background: '#fff', padding: '1rem', borderRadius: '12px', display: 'inline-block' }}>
                                      {(() => {
                                        const amount = formTeamSize * 10;
                                        const upiId = import.meta.env.VITE_UPI_ID || '9188811692@fam';
                                        
                                        // Clean the strings so they are safe for the URI
                                        const safeEventName = activeEventData?.label?.substring(0, 20) || 'Event';
                                        const safeLeadName = formName?.substring(0, 15) || 'Team';
                                        const transactionNote = encodeURIComponent(`Knightopp: ${safeEventName} - ${safeLeadName}`);
                                        
                                        const upiString = `upi://pay?pa=${upiId}&pn=Event Registration&tn=${transactionNote}&am=${amount}&cu=INR`;
                                        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`;
                                        return (
                                          <img src={qrUrl} alt="Payment QR" style={{ width: '200px', height: '200px', display: 'block' }} />
                                        );
                                      })()}
                                    </div>

                                    <div className="form-group-item" style={{ width: '100%', maxWidth: '300px' }}>
                                      <input 
                                        type="text" 
                                        className="app-input" 
                                        placeholder="12-Digit UTR Number" 
                                        value={utrNumber} 
                                        onChange={(e) => setUtrNumber(e.target.value)} 
                                        style={{ textAlign: 'center', letterSpacing: '0.1em' }}
                                        maxLength={12}
                                      />
                                    </div>
                                    <button 
                                      type="button" 
                                      onClick={verifyPayment} 
                                      disabled={isVerifying}
                                      style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: 'bold', cursor: isVerifying ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-mono)' }}
                                    >
                                      {isVerifying ? 'VERIFYING...' : 'VERIFY FAMPAY PAYMENT'}
                                    </button>
                                    {paymentError && <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{paymentError}</p>}
                                  </div>
                                )}
                              </div>
                            </Step>
                          </Stepper>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                            <h4 style={{ fontFamily: 'var(--font-akira)', color: '#38bdf8', fontSize: '1.5rem', marginBottom: '1rem' }}>{isRegistered ? 'PASS ISSUED' : 'PROCESSING...'}</h4>
                            <p style={{ color: '#94a3b8' }}>{isRegistered ? 'Check your email for your digital badge.' : 'Hold on tight.'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: isMobile ? '280px' : 'auto' }}>
                      <div style={{ width: '100%', maxWidth: '750px', height: isMobile ? '100%' : '85vh', maxHeight: '850px', position: 'relative' }}>
                        <MorphSlider
                          items={sliderItems}
                          transition="melt"
                          intensity={0.55}
                          aberration={0.35}
                          drift={0.4}
                          autoplay={false}
                        />
                      </div>
                    </div>
                  </div>
              );

              return (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100000, background: '#0a0a0a', overflowY: isMobile ? 'auto' : 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
                    <Silk 
                      dpr={isMobile ? [1, 1] : [1, 2]} 
                      speed={isMobile ? 3 : 5} 
                      scale={1.2}
                      noiseIntensity={1.0}
                      color="#0a192f"
                    />
                  </div>
                  <button 
                    onClick={() => navigate('/register')}
                    style={{ position: 'fixed', top: '1.25rem', right: '1.25rem', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '44px', height: '44px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200000, cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
                    ✕
                  </button>
                  {eventContent}
                </div>
              );
            })() : null
          } />
        </Routes>
      </div>

      {/* Selected Event Details Modal - StaggeredMenu Side Panel */}
      <StaggeredMenu
        position="right"
        isFixed={true}
        hideToggleButton={true}
        isOpen={!!selectedEventDetails}
        onClose={() => setSelectedEventDetails(null)}
        refreshTrigger={selectedEventDetails?.id}
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
              const eventId = selectedEventDetails.id;
              setSelectedEventTrack(selectedEventDetails.label);
              setSelectedEventDetails(null);
              navigate(`/register/${eventId}`);
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
        logoUrl="/assets/logo.png"
        isFixed={true}
      />

      {/* Supreme Global Floating Nav (Dock) */}
      <div 
        className="dock-wrapper-fixed"
        style={{ 
          position: 'fixed', 
          bottom: '1rem', 
          left: '0', 
          right: '0', 
          zIndex: 999999, 
          pointerEvents: 'none',
          opacity: isAppLoading ? 0 : 1,
          transition: 'opacity 0.8s ease-in-out',
        }}
      >
        <div style={{ pointerEvents: 'auto', display: 'flex', justifyContent: 'center', width: '100%' }}>
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
    </>
  );
}
