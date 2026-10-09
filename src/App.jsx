import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { QRCodeSVG } from 'qrcode.react';
import { createPortal } from 'react-dom';
import TechText from './TechText';
import InfiniteSpiral from './components/InfiniteSpiral';
import FlowingMenu from './components/FlowingMenu';
import TearTicket from './components/TearTicket';
import LatticeLoader from './components/LatticeLoader';
import PixelSwap from './components/PixelSwap';
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
import SafeVisual from './components/SafeVisual';
import { FiHome, FiCalendar, FiActivity, FiUserPlus, FiBookmark, FiCheckCircle, FiAlertCircle, FiLock } from 'react-icons/fi';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import ColorBends from './components/ColorBends';
import GlareHover from './components/GlareHover';
import ProfilePage from './components/ProfilePage';
import AdminDashboard from './components/AdminDashboard';
import { generateEntryPassEmailHtml } from './utils/entryPassEmail';
import { generateCardImagePng } from './utils/cardImageGenerator';
import { supabase } from './supabaseClient';
import './App.css';

// Official SRISHTI 2.7 Database Events Catalog
let FEST_EVENTS = [
  { 
    id: 'SRI27-TREASURE', 
    event_code: 'SRI27-TREASURE',
    label: 'TREASURE HUNT', 
    category: 'FUN', 
    group: 'Team Events', 
    type: 'team',
    maxTeamSize: 4,
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=900&auto=format&fit=crop', 
    details: 'Unravel cryptic campus riddles and hidden technical challenges in squads of 4.', 
    venue: 'College Campus',
    date: 'Dec 10, 2026', 
    time: '10:00 AM - 12:00 PM',
    fee: 0
  },
  { 
    id: 'SRI27-WALTZ', 
    event_code: 'SRI27-WALTZ',
    label: 'WALTZ (DANCE)', 
    category: 'CULTURAL', 
    group: 'Team Events', 
    type: 'team',
    maxTeamSize: 8,
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=900&auto=format&fit=crop', 
    details: 'Electrifying inter-college choreography and dance group competition.', 
    venue: 'Main Auditorium',
    date: 'Dec 10, 2026', 
    time: '02:00 PM - 04:00 PM',
    fee: 0
  },
  { 
    id: 'SRI27-QUIZ', 
    event_code: 'SRI27-QUIZ',
    label: 'IT QUIZ', 
    category: 'TECHNICAL', 
    group: 'Team Events', 
    type: 'team',
    maxTeamSize: 2,
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=900&auto=format&fit=crop', 
    details: 'Premier IT & General Tech Quiz battle of sharpest minds (Duo / Squad of 2).', 
    venue: 'Seminar Hall',
    date: 'Dec 10, 2026', 
    time: '10:00 AM - 12:00 PM',
    fee: 150
  },
  { 
    id: 'SRI27-CODE', 
    event_code: 'SRI27-CODE',
    label: 'CODING & DEBUGGING', 
    category: 'TECHNICAL', 
    group: 'Solo Events', 
    type: 'individual',
    maxTeamSize: 1,
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=900&auto=format&fit=crop', 
    details: 'Solo algorithmic logic and error debugging challenge against the clock.', 
    venue: 'Computer Lab',
    date: 'Dec 11, 2026', 
    time: '10:00 AM - 12:00 PM',
    fee: 0
  },
  { 
    id: 'SRI27-TRACEBOT', 
    event_code: 'SRI27-TRACEBOT',
    label: 'TRACE BOT', 
    category: 'TECHNICAL', 
    group: 'Team Events', 
    type: 'team',
    maxTeamSize: 4,
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=900&auto=format&fit=crop', 
    details: 'Autonomous line-following robotics race on intricate tracks (Teams up to 4).', 
    venue: 'CS Lab',
    date: 'Dec 11, 2026', 
    time: '01:00 PM - 03:00 PM',
    fee: 0
  },
  { 
    id: 'SRI27-RELAY', 
    event_code: 'SRI27-RELAY',
    label: 'RELAY CODING', 
    category: 'TECHNICAL', 
    group: 'Team Events', 
    type: 'team',
    maxTeamSize: 4,
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=900&auto=format&fit=crop', 
    details: 'Fast-paced team tag-team programming relay challenge.', 
    venue: 'Computer Lab',
    date: 'Dec 11, 2026', 
    time: '10:00 AM - 12:00 PM',
    fee: 0
  },
  { 
    id: 'TEST-EV-02', 
    event_code: 'TEST-EV-02',
    label: 'HACKAI 24H HACKATHON', 
    category: 'TECHNICAL', 
    group: 'Team Events', 
    type: 'team',
    maxTeamSize: 4,
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=900&auto=format&fit=crop', 
    details: '24-hour flagship team hackathon building real-world AI solutions.', 
    venue: 'Main Auditorium',
    date: 'Dec 10, 2026', 
    time: '10:00 AM - 10:00 AM',
    fee: 150
  },
  { 
    id: 'TEST-EV-01', 
    event_code: 'TEST-EV-01',
    label: 'CODE SPRINT (SPEED CODING)', 
    category: 'TECHNICAL', 
    group: 'Solo Events', 
    type: 'individual',
    maxTeamSize: 1,
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=900&auto=format&fit=crop', 
    details: 'Individual speed competitive programming showdown on algorithmic tracks.', 
    venue: 'CS Lab 3',
    date: 'Dec 11, 2026', 
    time: '10:00 AM - 12:00 PM',
    fee: 0
  },
  { 
    id: 'SRI27-BOMB', 
    event_code: 'SRI27-BOMB',
    label: 'BOMB SQUAD', 
    category: 'TECHNICAL', 
    group: 'Team Events', 
    type: 'team',
    maxTeamSize: 4,
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=900&auto=format&fit=crop', 
    details: 'Multi-chamber logic locks, code defusal and collaborative escape challenge.', 
    venue: 'Campus Venue',
    date: 'Dec 10, 2026', 
    time: '10:00 AM - 12:00 PM',
    fee: 0
  }
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
  const isProfilePage = location.pathname.startsWith('/profile');
  const isAdminPage = location.pathname.startsWith('/admin');

  // Dynamic event loading directly from Supabase events table
  const [liveEvents, setLiveEvents] = useState(FEST_EVENTS);

  useEffect(() => {
    const fetchLiveEvents = async () => {
      try {
        const { supabase } = await import('./supabaseClient');
        const { data: dbEvents, error } = await supabase
          .from('events')
          .select('*')
          .in('status', ['upcoming', 'ongoing']);

        if (!error && dbEvents && dbEvents.length > 0) {
          const merged = dbEvents.map(ev => {
            const fallback = FEST_EVENTS.find(d => 
              d.id.toLowerCase() === ev.event_code?.toLowerCase() ||
              `sri27-${d.id.toLowerCase()}` === ev.event_code?.toLowerCase() ||
              d.id === ev.id ||
              d.event_code?.toLowerCase() === ev.event_code?.toLowerCase()
            );
            const isTeam = ev.registration_type === 'team' || (ev.max_team_size && Number(ev.max_team_size) > 1) || fallback?.type === 'team' || fallback?.group === 'Team Events';
            return {
              id: ev.event_code || ev.id,
              dbId: ev.id,
              event_code: ev.event_code,
              label: ev.name,
              category: ev.category || fallback?.category || 'TECHNICAL',
              group: isTeam ? 'Team Events' : 'Solo Events',
              image: fallback?.image || 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=900&auto=format&fit=crop',
              details: ev.venue ? `Venue: ${ev.venue}. Fee: ₹${ev.registration_fee || 0}` : (fallback?.details || 'Festival event'),
              date: ev.date || fallback?.date || 'Dec 10, 2026',
              time: ev.start_time ? (ev.end_time ? `${ev.start_time.substring(0, 5)} - ${ev.end_time.substring(0, 5)}` : ev.start_time.substring(0, 5)) : (fallback?.time || '10:00 AM'),
              fee: ev.registration_fee || 0,
              type: isTeam ? 'team' : 'individual',
              maxTeamSize: ev.max_team_size || (isTeam ? (fallback?.maxTeamSize || 4) : 1)
            };
          });
          setLiveEvents(merged);
        }
      } catch (err) {
        console.warn('Could not sync dynamic events from Supabase:', err);
      }
    };
    fetchLiveEvents();
  }, []);

  const matchEventRoute = location.pathname.match(/^\/register\/([a-zA-Z0-9-_]+)$/);
  const routeParam = matchEventRoute ? matchEventRoute[1].toLowerCase() : '';
  const activeEventData = matchEventRoute ? liveEvents.find(e => {
    const eId = (e.id || '').toLowerCase();
    const eCode = (e.event_code || '').toLowerCase();
    const eLabel = (e.label || '').toLowerCase();
    return eId === routeParam || 
           eCode === routeParam ||
           `sri27-${routeParam}` === eCode ||
           `sri27-${routeParam}` === eId ||
           eId.includes(routeParam) ||
           routeParam.includes(eId.replace('sri27-', '')) ||
           eLabel.includes(routeParam);
  }) : null;
  const eventRegistrationFee = Math.max(0, Number(activeEventData?.fee) || 0);
  const requiresPayment = eventRegistrationFee > 0;

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
  const [eventsLoaded, setEventsLoaded] = useState(false);

  // Registration form states with robust instant localStorage initializers
  const getInitialEmail = () => {
    try {
      return (localStorage.getItem('srishti_session') || '').replace(/['"]+/g, '').trim();
    } catch (_) { return ''; }
  };

  const getInitialProfileField = (field, fallbackKey) => {
    try {
      const email = (localStorage.getItem('srishti_session') || '').replace(/['"]+/g, '').trim().toLowerCase();
      if (email) {
        const cachedRaw = localStorage.getItem(`srishti_profile_${email}`);
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw);
          if (parsed && parsed[field]) return parsed[field];
        }
      }
      if (fallbackKey) {
        const fb = localStorage.getItem(fallbackKey);
        if (fb) return fb;
      }
      return '';
    } catch (_) { return ''; }
  };

  const [formEmail, setFormEmail] = useState(getInitialEmail);
  const [formName, setFormName] = useState(() => getInitialProfileField('name', 'srishti_user_name'));
  const [formCollege, setFormCollege] = useState(() => getInitialProfileField('college', 'srishti_user_college'));
  const [formPhone, setFormPhone] = useState(() => getInitialProfileField('phone', 'srishti_user_phone'));
  const [formRoll, setFormRoll] = useState(() => getInitialProfileField('department', 'srishti_user_roll'));
  const [formTeamSize, setFormTeamSize] = useState(1);
  const [formStatus, setFormStatus] = useState('idle');
  const [isRegistered, setIsRegistered] = useState(false);
  const [isFormMenuOpen, setIsFormMenuOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [participantCode, setParticipantCode] = useState('');
  const [regPortalStatus, setRegPortalStatus] = useState(() => {
    try {
      return localStorage.getItem('srishti_reg_portal_status') || 'open';
    } catch (_) {
      return 'open';
    }
  });

  useEffect(() => {
    const handlePortalStatusSync = () => {
      try {
        const current = localStorage.getItem('srishti_reg_portal_status') || 'open';
        setRegPortalStatus(current);
      } catch (_) {}
    };
    window.addEventListener('storage', handlePortalStatusSync);
    window.addEventListener('srishti_reg_portal_update', handlePortalStatusSync);
    return () => {
      window.removeEventListener('storage', handlePortalStatusSync);
      window.removeEventListener('srishti_reg_portal_update', handlePortalStatusSync);
    };
  }, []);

  const isPortalClosed = regPortalStatus === 'closed';

  // Track all events registered by the current user session
  const [userRegistrations, setUserRegistrations] = useState(() => {
    try {
      const email = (localStorage.getItem('srishti_session') || '').replace(/['"]+/g, '').trim().toLowerCase();
      if (email) {
        const cached = localStorage.getItem(`srishti_user_registrations_${email}`);
        if (cached) return JSON.parse(cached);
      }
    } catch (_) {}
    return [];
  });

  const fetchUserRegistrations = async (emailToFetch) => {
    const cleanEmail = (emailToFetch || formEmail || localStorage.getItem('srishti_session') || '').replace(/['"]+/g, '').trim().toLowerCase();
    if (!cleanEmail) return [];
    try {
      const cached = JSON.parse(localStorage.getItem(`srishti_user_registrations_${cleanEmail}`) || '[]');
      const regs = Array.isArray(cached) ? cached : [];
      setUserRegistrations(regs);
      return regs;
    } catch (_) {
      setUserRegistrations([]);
      return [];
    }
  };
  const isEventAlreadyRegistered = (ev) => {
    if (!ev || !userRegistrations || userRegistrations.length === 0) return false;
    const evId = String(ev.id || '').toLowerCase();
    const evCode = String(ev.event_code || ev.code || '').toLowerCase();
    const evName = String(ev.name || ev.label || '').toLowerCase().trim();

    return userRegistrations.some(r => {
      const rId = String(r.event_id || r.events?.id || '').toLowerCase();
      const rCode = String(r.event_code || r.events?.event_code || '').toLowerCase();
      const rName = String(r.event_name || r.events?.name || '').toLowerCase().trim();

      if (evId && (evId === rId || evId === rCode)) return true;
      if (evCode && (evCode === rCode || evCode === rId)) return true;
      if (evName && rName && (evName === rName || evName.includes(rName) || rName.includes(evName))) return true;
      return false;
    });
  };

  // Helper to keep local profile cache in sync with user edits
  const updateCachedProfile = (field, value) => {
    try {
      const email = (formEmail || localStorage.getItem('srishti_session') || '').replace(/['"]+/g, '').trim().toLowerCase();
      if (email) {
        const pKey = `srishti_profile_${email}`;
        const existing = JSON.parse(localStorage.getItem(pKey) || '{}');
        localStorage.setItem(pKey, JSON.stringify({ ...existing, [field]: value }));
      }
    } catch (_) {}
  };

  const handleNameChange = (val) => {
    setFormName(val);
    localStorage.setItem('srishti_user_name', val);
    updateCachedProfile('name', val);
  };

  const handleCollegeChange = (val) => {
    setFormCollege(val);
    localStorage.setItem('srishti_user_college', val);
    updateCachedProfile('college', val);
  };

  const handlePhoneChange = (val) => {
    setFormPhone(val);
    localStorage.setItem('srishti_user_phone', val);
    updateCachedProfile('phone', val);
  };

  const handleRollChange = (val) => {
    setFormRoll(val);
    localStorage.setItem('srishti_user_roll', val);
    updateCachedProfile('department', val);
  };

  const handleEmailChange = async (val) => {
    setFormEmail(val);
    setOtpVerified(false);
    setOtpSent(false);
    setOtpCode('');
    setOtpError(null);
    setOtpMessage(null);
    const cleanEmail = val.replace(/['"]+/g, '').trim().toLowerCase();
    if (!cleanEmail) return;

    try {
      const cachedRaw = localStorage.getItem(`srishti_profile_${cleanEmail}`);
      if (cachedRaw) {
        const profile = JSON.parse(cachedRaw);
        if (profile.name && !formName) setFormName(profile.name);
        if (profile.college && !formCollege) setFormCollege(profile.college);
        if (profile.phone && !formPhone) setFormPhone(profile.phone);
        if (profile.department && profile.department !== 'N/A' && !formRoll) setFormRoll(profile.department);
      }
    } catch (_) {}

    if (cleanEmail.includes('@') && cleanEmail.includes('.')) {
      await fetchUserRegistrations(cleanEmail);
    }
  };
  // Auto-fill form whenever route or active event opens
  useEffect(() => {
    const fetchSessionData = async () => {
      const email = (localStorage.getItem('srishti_session') || '').replace(/['"]+/g, '').trim();
      const cleanEmail = email.toLowerCase();
      if (!cleanEmail || isRegistered) return;

      setFormEmail(cleanEmail);

      // 1. Immediately read local profile cache for instant zero-latency fill
      let cachedProfile = null;
      try {
        const cachedRaw = localStorage.getItem(`srishti_profile_${cleanEmail}`);
        if (cachedRaw) cachedProfile = JSON.parse(cachedRaw);
      } catch (_) {}

      const localName = cachedProfile?.name || localStorage.getItem('srishti_user_name') || '';
      const localCollege = cachedProfile?.college || localStorage.getItem('srishti_user_college') || '';
      const localPhone = cachedProfile?.phone || localStorage.getItem('srishti_user_phone') || '';
      const localRoll = cachedProfile?.roll || cachedProfile?.department || localStorage.getItem('srishti_user_roll') || '';

      if (localName) setFormName(localName);
      if (localCollege) setFormCollege(localCollege);
      if (localPhone) setFormPhone(localPhone);
      if (localRoll && localRoll !== 'N/A' && localRoll !== 'General') setFormRoll(localRoll);

      await fetchUserRegistrations(cleanEmail);
    };

    fetchSessionData();
  }, [location.pathname, activeEventData, isRegistered]);

  const [activeStep, setActiveStep] = useState(1);
  
  const [teamMembers, setTeamMembers] = useState({
    2: { name: '', email: '', phone: '', roll: '' },
    3: { name: '', email: '', phone: '', roll: '' },
    4: { name: '', email: '', phone: '', roll: '' },
    5: { name: '', email: '', phone: '', roll: '' },
  });

  const updateTeamMember = (id, field, value) => {
    setTeamMembers(prev => ({
      ...prev,
      [id]: { name: '', email: '', phone: '', roll: '', ...(prev[id] || {}), [field]: value }
    }));
  };

  const [paymentFraction, setPaymentFraction] = useState(0);
  const expectedPaymentAmount = Number((eventRegistrationFee + paymentFraction).toFixed(2));

  // Manual payment reference / UTR state
  const [utrNumber, setUtrNumber] = useState('');
  const [isPaymentPending, setIsPaymentPending] = useState(false);

  // Participant OTP verification state
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const [otpMessage, setOtpMessage] = useState(null);
  const [otpCooldown, setOtpCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (otpCooldown > 0) {
      timer = setTimeout(() => setOtpCooldown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  // Check if caller already has a verified session matching formEmail
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const sessionEmail = session?.user?.email?.trim().toLowerCase();
        const currentEmail = formEmail.trim().toLowerCase();
        if (sessionEmail && currentEmail && sessionEmail === currentEmail) {
          setOtpVerified(true);
        }
      } catch (_) {}
    };
    if (formEmail) checkActiveSession();
  }, [formEmail]);

  useEffect(() => {
    setPaymentFraction(0);
    setUtrNumber('');
    setIsPaymentPending(false);
    setTeamMembers({
      2: { name: '', email: '', phone: '', roll: '' },
      3: { name: '', email: '', phone: '', roll: '' },
      4: { name: '', email: '', phone: '', roll: '' },
      5: { name: '', email: '', phone: '', roll: '' },
    });
  }, [activeEventData?.dbId]);

  useEffect(() => {
    if (activeEventData) {
      if (activeEventData.type === 'individual' || activeEventData.group === 'Solo Events' || activeEventData.maxTeamSize === 1) {
        setFormTeamSize(1);
      } else if (activeEventData.id?.toLowerCase().includes('hackathon')) {
        setFormTeamSize(3);
      } else {
        setFormTeamSize(Math.min(2, activeEventData.maxTeamSize || 2));
      }
    }
  }, [activeEventData]);

  // Generate a stable random fraction between 0.01 and 0.49 for manual payment reconciliation when arriving at payment step
  useEffect(() => {
    const paymentStepIndex = formTeamSize + 3;
    if (requiresPayment && activeStep === paymentStepIndex && paymentFraction === 0) {
       const randomCents = Math.floor(Math.random() * 49) + 1;
       setPaymentFraction(randomCents / 100);
    }
  }, [activeStep, formTeamSize, paymentFraction, requiresPayment]);

  const handleSendOtp = useCallback(async () => {
    const cleanEmail = formEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setOtpError('Please enter a valid email address first.');
      return;
    }
    if (otpCooldown > 0 || isSendingOtp) return;

    setIsSendingOtp(true);
    setOtpError(null);
    setOtpMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('participant-profile', {
        body: {
          action: 'send-otp',
          email: cleanEmail,
          purpose: 'registration',
          name: formName.trim() || 'Participant'
        }
      });

      if (error || !data?.success) {
        if (data?.cooldown_remaining) {
          setOtpCooldown(data.cooldown_remaining);
        }
        setOtpError(data?.error || error?.message || 'Failed to send verification code. Please try again.');
      } else {
        setOtpSent(true);
        setOtpMessage(`Verification code sent to ${cleanEmail}`);
        setOtpCooldown(60);
      }
    } catch (err) {
      setOtpError(err.message || 'Network error while sending OTP.');
    } finally {
      setIsSendingOtp(false);
    }
  }, [formEmail, formName, otpCooldown, isSendingOtp]);

  const handleVerifyOtp = async (codeToVerify) => {
    const code = (codeToVerify || otpCode || '').trim();
    if (!code || code.length !== 6) {
      setOtpError('Please enter the complete 6-digit verification code.');
      return;
    }
    const cleanEmail = formEmail.trim().toLowerCase();
    setIsVerifyingOtp(true);
    setOtpError(null);
    setOtpMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('participant-profile', {
        body: {
          action: 'verify-otp',
          email: cleanEmail,
          otp: code
        }
      });

      if (error || !data?.success) {
        setOtpError(data?.error || error?.message || 'Incorrect verification code. Please try again.');
      } else {
        if (data.token_hash) {
          try {
            await supabase.auth.verifyOtp({
              token_hash: data.token_hash,
              type: 'email'
            });
          } catch (_) {}
        }
        setOtpVerified(true);
        setOtpMessage('Email verified successfully! You can now continue.');
        localStorage.setItem('srishti_session', cleanEmail);
      }
    } catch (err) {
      setOtpError(err.message || 'Error verifying code. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Automatically trigger OTP dispatch when arriving at the OTP step
  useEffect(() => {
    const otpStepIndex = formTeamSize + 2;
    if (activeStep === otpStepIndex && !otpSent && !otpVerified && formEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(formEmail.trim())) {
        handleSendOtp();
      }
    }
  }, [activeStep, formTeamSize, otpSent, otpVerified, formEmail, handleSendOtp]);

  const isStepValid = (step) => {
    if (activeEventData && isEventAlreadyRegistered(activeEventData)) return false;
    if (step === 1) return true;
    if (step === 2) {
      if (activeEventData && isEventAlreadyRegistered(activeEventData)) return false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return formName.trim() !== '' && formCollege.trim() !== '' && emailRegex.test(formEmail.trim()) && formPhone.trim() !== '';
    }
    
    if (step > 2 && step <= formTeamSize + 1) {
       const memberIndex = step - 1;
       const member = teamMembers[memberIndex];
       if (!member) return false;
       return member.name.trim() !== '' && member.email.trim() !== '' && member.phone.trim() !== '';
    }
    
    // OTP verification step
    if (step === formTeamSize + 2) {
      return otpVerified;
    }

    // Payment step (for paid events only)
    if (requiresPayment && step === formTeamSize + 3) {
      return utrNumber.trim().length >= 6;
    }
    
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

    if (activeEventData && isEventAlreadyRegistered(activeEventData)) {
      setIsRegistering(false);
      setFormStatus('idle');
      alert(`You are already registered for ${activeEventData.label}! Duplicate registrations for the same event are not permitted.`);
      return;
    }

    if (requiresPayment && (!utrNumber.trim() || utrNumber.trim().length < 6)) {
      alert('Please enter a valid UTR / Transaction Reference ID before submitting.');
      setFormStatus('idle');
      return;
    }

    if (!otpVerified) {
      alert('Please verify your email with the 6-digit OTP before submitting registration.');
      setFormStatus('idle');
      return;
    }

    try {
      const cleanEmail = formEmail.trim().toLowerCase();
      let participantPassCode = '';
      let pData = null;

      // Public registration must go through the server-controlled function.
      // The browser must not read or write participant/registration tables.
      const edgePayload = {
        name: formName.trim(),
        email: cleanEmail,
        phone: formPhone.trim(),
        college: formCollege.trim(),
        department: formRoll.trim() || 'General',
        year: '2026',
        event_id: activeEventData?.dbId || undefined,
        event_code: activeEventData.id.startsWith('SRI27-')
          ? activeEventData.id
          : `SRI27-${activeEventData.id.toUpperCase()}`,
        team_members: members,
        payment_method: requiresPayment ? 'upi' : 'waived',
        payment_reference: requiresPayment ? utrNumber.trim() : null,
        otp: otpCode.trim() || undefined
      };

      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('web-register', {
        body: edgePayload
      });

      if (edgeError || !edgeData?.success || !edgeData?.data?.participant) {
        const message = edgeData?.error || edgeError?.message || 'Registration could not be completed.';
        if (edgeData?.code === 'DUPLICATE_REGISTRATION') {
          alert(`You are already registered for ${activeEventData.label}! Duplicate registrations are not permitted.`);
          setIsRegistering(false);
          setFormStatus('idle');
          return;
        }
        throw new Error(message);
      }

      pData = {
        ...edgeData.data.participant
      };
      participantPassCode = pData.participant_code;
      const resolvedEventId = edgeData.data.event?.id || activeEventData?.dbId || null;
      const paymentStatus = edgeData.data.payment_status;
      const isVerified = paymentStatus === 'verified';
      const registrationStatus = isVerified ? 'VERIFIED' : 'PAYMENT PENDING';

      // Save user profile locally
      if (pData) {
        localStorage.setItem(`srishti_profile_${cleanEmail}`, JSON.stringify(pData));
        if (pData.name) localStorage.setItem('srishti_user_name', pData.name);
        if (pData.college) localStorage.setItem('srishti_user_college', pData.college);
        if (pData.phone) localStorage.setItem('srishti_user_phone', pData.phone);
        if (pData.department) localStorage.setItem('srishti_user_roll', pData.department);
        localStorage.setItem('srishti_session', cleanEmail);
      }

      // Keep this device's ticket cache in sync. Private registration rows are read by
      // authenticated users or admins, never by an anonymous email lookup.
      let userAllRegs = [];
      try {
        const cached = JSON.parse(localStorage.getItem(`srishti_user_registrations_${cleanEmail}`) || '[]');
        if (Array.isArray(cached)) userAllRegs = cached;
      } catch (_) {}

      const addedReg = {
        event_id: resolvedEventId,
        event_code: activeEventData.id,
        event_name: activeEventData.label,
        status: 'registered',
        payment_status: paymentStatus,
        payment_reference: requiresPayment ? utrNumber.trim() : null,
        events: {
          name: activeEventData.label,
          event_code: activeEventData.id,
          venue: activeEventData.venue || 'Campus Venue',
          date: activeEventData.date || 'Dec 10, 2026',
          start_time: activeEventData.time || '10:00 AM'
        }
      };
      userAllRegs = [...userAllRegs.filter(r => r.event_id !== resolvedEventId), addedReg];
      setUserRegistrations(userAllRegs);

      try {
        localStorage.setItem(`srishti_user_registrations_${cleanEmail}`, JSON.stringify(userAllRegs));
      } catch (_) {}

      setParticipantCode(participantPassCode);

      // ONLY FOR VERIFIED / FREE EVENTS:
      // Generate confirmed entry pass, generate card PNG, send pass email
      if (isVerified) {
        let allEventsList = [activeEventData.label];
        const mapped = userAllRegs.map(r => r.events?.name || r.event_name).filter(Boolean);
        allEventsList = [...new Set([...mapped, ...allEventsList])];

        let qrCodeString = participantPassCode;
        try {
          const { generatePassPayload } = await import('./utils/cryptoSecurity');
          qrCodeString = generatePassPayload(participantPassCode, pData?.pass_token || '', formName.trim());
        } catch (_) {}

        const qrDataUrl = await QRCode.toDataURL(qrCodeString, {
           width: 320,
           margin: 2,
           errorCorrectionLevel: 'H',
           color: { dark: '#020617', light: '#ffffff' }
        });
        setQrCodeDataUrl(qrDataUrl);

        let cardPng = null;
        try {
          cardPng = await generateCardImagePng({
            attendeeName: formName,
            college: formCollege,
            passCode: participantPassCode,
            passToken: pData?.pass_token || '',
            events: allEventsList,
            isVerified: true,
            statusText: 'VERIFIED'
          });
        } catch (pngErr) {
          console.warn('PNG card generation notice:', pngErr);
        }

        const ticketHtml = generateEntryPassEmailHtml({
          attendeeName: formName,
          college: formCollege,
          passCode: participantPassCode,
          eventName: activeEventData.label,
          status: 'VERIFIED'
        });

        try {
          await supabase.functions.invoke('participant-profile', {
            body: {
              action: 'send-registration-pass',
              to: formEmail,
              subject: `Your Srishti 2.7 Digital Entry Pass — ${formName}`,
              html: ticketHtml,
              image: cardPng
            }
          });
        } catch (emailErr) {
          console.error('Failed to send registration pass email:', emailErr);
        }

        // Automatic 24/7 WhatsApp Pass Dispatch to Participant
        if (formPhone.trim()) {
          try {
            const defaultRegTemplate = 
`🎟️ *SRISHTI 2.7 | OFFICIAL DELEGATE PASS*

Hello *{name}*, your registration is confirmed!

🆔 *Delegate ID:* {participantCode}  
🏆 *Event:* {eventName}  
🏛️ *College:* {college}

📱 *Your Digital Pass & QR Code:*  
{passUrl}

Please present your QR code and college ID at the entrance.

See you at *SRISHTI 2.7*! 🚀`;

            const customMsg = localStorage.getItem('srishti_wa_custom_template') || defaultRegTemplate;
            fetch('https://trialrun2.onrender.com/send-pass', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phone: formPhone.trim(),
                name: formName.trim(),
                participantCode: participantPassCode,
                eventName: activeEventData.label,
                college: formCollege.trim(),
                passUrl: 'https://srishti2-7.vercel.app/profile',
                imageBase64: cardPng,
                customMessage: customMsg
              })
            }).catch(waErr => console.warn('WhatsApp auto-dispatch notice:', waErr));
          } catch (_) {}
        }

        setIsPaymentPending(false);
      } else {
        // FOR PAID / PENDING EVENT:
        // Do NOT generate entry pass QR or card PNG.
        // Do NOT send verified entry pass email.
        setQrCodeDataUrl('');
        setIsPaymentPending(true);
      }

      setFormStatus('done');
      setIsRegistered(true);
    } catch (error) {
      console.error('Error saving registration:', error);
      alert(error.message || 'There was an error saving your registration to the database. Please contact support.');
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

    // Use hardcoded FEST_EVENTS for the carousel since the DB lacks image and group columns
    setEventsLoaded(true);

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

          {/* Date & Venue matching reference: DEC 6 & 7 | ST THOMAS COLLEGE THRISSUR */}
          <div className="hero-date-venue">
            <div className="date-box">
              <span className="date-month" style={{ fontSize: '1.2rem', color: '#38bdf8' }}>DEC</span>
              <span className="date-year" style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>6 & 7</span>
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

            {/* Stat 2: ₹80K+ */}
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
                <span className="stat-value">₹80K+</span>
                <span className="stat-desc">TOTAL PRIZE POOL</span>
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

            {/* Stat 4: 500+ */}
            <div className="stat-item">
              <div className="stat-icon-box">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div className="stat-info">
                <span className="stat-value">500+</span>
                <span className="stat-desc">PARTICIPANTS &amp; DELEGATES</span>
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
          items={liveEvents.map(ev => ({
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
            const ev = liveEvents.find(e => e.id === tabId);
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
          <SafeVisual>
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
          </SafeVisual>
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
            DEPARTMENT OF COMPUTER SCIENCE
          </p>
        </div>
        <div className="footer-meta-side">
          <span className="footer-edition">EDITION 2.7 • DEC 6 & 7</span>
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

      {isPortalClosed && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
          flexWrap: 'wrap',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.1)',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f87171',
              flexShrink: 0
            }}>
              <FiLock size={20} />
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                letterSpacing: '0.12em',
                color: '#f87171',
                textTransform: 'uppercase',
                fontWeight: '700',
                marginBottom: '0.2rem'
              }}>
                PORTAL NOTICE • REGISTRATIONS CLOSED
              </div>
              <div style={{ color: '#e4e4e7', fontSize: '0.88rem', lineHeight: '1.4' }}>
                Online and spot registrations for all SRISHTI 2.7 events are officially closed. Registered participants can access their official Delegate Pass in Profile.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            style={{
              padding: '0.65rem 1.25rem',
              background: '#ffffff',
              color: '#000000',
              fontWeight: '700',
              fontSize: '0.85rem',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 14px rgba(255, 255, 255, 0.2)'
            }}
          >
            Go to My Profile →
          </button>
        </div>
      )}

      {['Solo Events', 'Team Events'].map(groupName => {
        const filteredGroupEvents = liveEvents.filter(ev => ev.group === groupName);
        if (filteredGroupEvents.length === 0) return null;
        return (
          <div key={groupName} style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <h3 style={{ fontFamily: 'var(--font-akira)', fontSize: '0.95rem', color: '#f8fafc', letterSpacing: '0.05em' }}>
                {groupName.toUpperCase()}
              </h3>
              <span style={{ 
                fontFamily: 'var(--font-mono)', 
                fontSize: '0.72rem', 
                padding: '0.15rem 0.5rem', 
                borderRadius: '12px', 
                background: groupName === 'Solo Events' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                color: groupName === 'Solo Events' ? '#c084fc' : '#38bdf8',
                border: groupName === 'Solo Events' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(56, 189, 248, 0.4)'
              }}>
                {filteredGroupEvents.length} {filteredGroupEvents.length === 1 ? 'EVENT' : 'EVENTS'}
              </span>
            </div>
            <div className="reg-events-carousel">
              {filteredGroupEvents.map((ev) => {
                const isAlreadyEnrolled = isEventAlreadyRegistered(ev);
                return (
                <div 
                  key={ev.id} 
                  className={`reg-event-card ${selectedEventTrack === ev.label ? 'active' : ''} ${isAlreadyEnrolled ? 'already-registered' : ''}`}
                  onClick={() => {
                    if (isAlreadyEnrolled) {
                      alert(`Already Registered: You are already registered for ${ev.label}! You cannot register for the same event again.`);
                      return;
                    }
                    if (isPortalClosed) {
                      alert(`Registrations for ${ev.label} are currently closed by festival administration. Registered participants can access their Delegate Pass in Profile.`);
                      return;
                    }
                    setSelectedEventTrack(ev.label);
                    navigate(`/register/${ev.id}`);
                  }}
                  style={{ flexShrink: 0, scrollSnapAlign: 'start', position: 'relative' }}
                >
                  <GlareHover
                    width="240px"
                    height="340px"
                    glareColor="#ffffff"
                    glareOpacity={0.2}
                    glareAngle={-30}
                    glareSize={200}
                    borderRadius="12px"
                    borderColor={isAlreadyEnrolled ? '#10b981' : (selectedEventTrack === ev.label ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)')}
                  >
                    <div className="reg-event-card-inner">
                      <img src={ev.image} alt={ev.label} className="reg-event-card-bg" />
                      <div className="reg-event-card-overlay"></div>
                      {isAlreadyEnrolled ? (
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          zIndex: 10,
                          background: 'rgba(16, 185, 129, 0.95)',
                          color: '#ffffff',
                          fontSize: '0.68rem',
                          fontWeight: '800',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '20px',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          backdropFilter: 'blur(4px)'
                        }}>
                          <FiCheckCircle size={12} /> Already Registered
                        </div>
                      ) : isPortalClosed ? (
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          zIndex: 10,
                          background: 'rgba(239, 68, 68, 0.9)',
                          color: '#ffffff',
                          fontSize: '0.68rem',
                          fontWeight: '800',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '20px',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          backdropFilter: 'blur(4px)'
                        }}>
                          <FiLock size={11} /> Closed
                        </div>
                      ) : null}
                      <div className="reg-event-card-content">
                        <div className="reg-event-card-title">{ev.label}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                          <span className="reg-event-card-category">{ev.category}</span>
                          <span style={{
                            fontSize: '0.65rem',
                            fontWeight: '700',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            background: ev.type === 'team' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(168, 85, 247, 0.25)',
                            color: ev.type === 'team' ? '#38bdf8' : '#c084fc',
                            border: ev.type === 'team' ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(168, 85, 247, 0.5)'
                          }}>
                            {ev.type === 'team' ? `TEAM (UP TO ${ev.maxTeamSize})` : 'SOLO'}
                          </span>
                        </div>
                        <div className="reg-event-card-active-line"></div>
                      </div>
                    </div>
                  </GlareHover>
                </div>
              );
            })}
              {/* Cross-browser bulletproof DOM spacer to force scroll space */}
              <div style={{ flexShrink: 0, width: '1.5rem', height: '1px', pointerEvents: 'none' }} aria-hidden="true" />
            </div>
          </div>
        );
      })}
    </div>
  );

  if (isProfilePage) {
    return <ProfilePage />;
  }

  if (isAdminPage) {
    return <AdminDashboard />;
  }

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
              background: 'transparent'
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
                  <SafeVisual>
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
                  </SafeVisual>
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
                          isEventAlreadyRegistered(activeEventData) ? (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center',
                              padding: '2.5rem 1.5rem',
                              gap: '1.25rem'
                            }}>
                              <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#10b981'
                              }}>
                                <FiCheckCircle size={32} />
                              </div>
                              <div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.15em', color: '#10b981', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                                  CONFIRMED REGISTRATION
                                </div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                                  Already Registered
                                </h3>
                                <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginTop: '0.75rem', lineHeight: '1.5', maxWidth: '380px' }}>
                                  You have already registered for <strong style={{ color: '#ffffff' }}>{activeEventData.label}</strong>. Each participant is allowed only one registration per competition.
                                </p>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: '320px', marginTop: '0.5rem' }}>
                                <button
                                  type="button"
                                  onClick={() => navigate('/profile')}
                                  style={{
                                    padding: '0.85rem 1.5rem',
                                    background: '#ffffff',
                                    color: '#000000',
                                    fontWeight: '700',
                                    fontSize: '0.9rem',
                                    borderRadius: '12px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    boxShadow: '0 4px 14px rgba(255, 255, 255, 0.2)'
                                  }}
                                >
                                  <FiCheckCircle size={16} /> View in My Profile & Pass
                                </button>
                                <button
                                  type="button"
                                  onClick={() => navigate('/register')}
                                  style={{
                                    padding: '0.85rem 1.5rem',
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    color: '#e4e4e7',
                                    fontWeight: '600',
                                    fontSize: '0.9rem',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Browse Other Events
                                </button>
                              </div>
                            </div>
                          ) : isPortalClosed ? (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center',
                              padding: '2.5rem 1.25rem',
                              gap: '1.25rem'
                            }}>
                              <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#f87171'
                              }}>
                                <FiLock size={30} />
                              </div>
                              <div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.15em', color: '#f87171', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                                  REGISTRATIONS CLOSED
                                </div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
                                  Event Registration Closed
                                </h3>
                                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.75rem', lineHeight: '1.5', maxWidth: '380px' }}>
                                  Online and spot registrations for <strong style={{ color: '#ffffff' }}>{activeEventData.label}</strong> are officially closed. No new registrations are being accepted.
                                </p>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: '320px', marginTop: '0.5rem' }}>
                                <button
                                  type="button"
                                  onClick={() => navigate('/profile')}
                                  style={{
                                    padding: '0.85rem 1.5rem',
                                    background: '#ffffff',
                                    color: '#000000',
                                    fontWeight: '700',
                                    fontSize: '0.9rem',
                                    borderRadius: '12px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    boxShadow: '0 4px 14px rgba(255, 255, 255, 0.2)'
                                  }}
                                >
                                  Claim / Access Delegate Pass →
                                </button>
                                <button
                                  type="button"
                                  onClick={() => navigate('/register')}
                                  style={{
                                    padding: '0.85rem 1.5rem',
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    color: '#e4e4e7',
                                    fontWeight: '600',
                                    fontSize: '0.9rem',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Browse All Events
                                </button>
                              </div>
                            </div>
                          ) : (
                          <Stepper
                            key={activeEventData?.dbId || activeEventData?.id}
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
                                  {activeEventData?.type === 'individual' || activeEventData?.group === 'Solo Events' || activeEventData?.maxTeamSize === 1 ? (
                                    <option value={1}>Solo Delegate (1 Person)</option>
                                  ) : (
                                    <>
                                      {Array.from(
                                        { length: Math.max(1, (activeEventData?.maxTeamSize || 4) - 1) }, 
                                        (_, i) => i + 2
                                      ).map(size => (
                                        <option key={size} value={size}>Team of {size}</option>
                                      ))}
                                    </>
                                  )}
                                </select>
                              </div>
                            </Step>

                            <Step>
                              <div style={{ maxHeight: isMobile ? 'none' : '55vh', overflowY: 'auto', paddingRight: '0.5rem' }} className="reg-form-fields">
                                {(formEmail && (formName || formCollege || formPhone)) && (
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginBottom: '1rem',
                                    padding: '0.6rem 0.85rem',
                                    background: 'rgba(56, 189, 248, 0.08)',
                                    border: '1px solid rgba(56, 189, 248, 0.25)',
                                    borderRadius: '8px',
                                    fontSize: '0.78rem',
                                    color: '#38bdf8'
                                  }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                    <span>Details autofilled from your profile. Modify below if needed.</span>
                                  </div>
                                )}
                                <div className="form-group-item">
                                  <label className="field-caption" style={{ color: '#cbd5e1' }}>Primary Contact (Team Lead)</label>
                                  <input type="text" required className="app-input" placeholder="e.g. Alex Morgan" value={formName} onChange={(e) => handleNameChange(e.target.value)} />
                                </div>
                                <div className="form-group-item" style={{ marginTop: '1.25rem' }}>
                                  <label className="field-caption" style={{ color: '#cbd5e1' }}>College / Institute</label>
                                  <input type="text" required className="app-input" placeholder="e.g. St Thomas College" value={formCollege} onChange={(e) => handleCollegeChange(e.target.value)} />
                                </div>
                                <div className="form-group-item" style={{ marginTop: '1.25rem' }}>
                                  <label className="field-caption" style={{ color: '#cbd5e1' }}>Email Address</label>
                                  <input type="email" required className="app-input" placeholder="alex@domain.edu" value={formEmail} onChange={(e) => handleEmailChange(e.target.value)} />
                                </div>
                                {isEventAlreadyRegistered(activeEventData) && (
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginTop: '0.85rem',
                                    padding: '0.75rem 1rem',
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.35)',
                                    borderRadius: '8px',
                                    fontSize: '0.82rem',
                                    color: '#f87171'
                                  }}>
                                    <FiCheckCircle size={16} />
                                    <span>This email is already registered for this event. Duplicate registration is not permitted.</span>
                                  </div>
                                )}
                                <div className="form-group-item" style={{ marginTop: '1.25rem' }}>
                                  <label className="field-caption" style={{ color: '#cbd5e1' }}>Phone Number</label>
                                  <input type="tel" required className="app-input" placeholder="+1 (555) 000-0000" value={formPhone} onChange={(e) => handlePhoneChange(e.target.value)} />
                                </div>
                                <div className="form-group-item" style={{ marginTop: '1.25rem' }}>
                                  <label className="field-caption" style={{ color: '#cbd5e1' }}>Roll / Register ID (Optional)</label>
                                  <input type="text" className="app-input" placeholder="e.g. 2024CS1044" value={formRoll} onChange={(e) => handleRollChange(e.target.value)} />
                                </div>
                              </div>
                            </Step>

                            {Array.from({ length: Math.max(0, formTeamSize - 1) }, (_, index) => index + 2).map((memberIndex) => {
                              const member = teamMembers[memberIndex] || { name: '', email: '', phone: '', roll: '' };
                              return (
                                <Step key={memberIndex}>
                                  <div style={{ maxHeight: isMobile ? 'none' : '55vh', overflowY: 'auto', paddingRight: '0.5rem' }} className="reg-form-fields">
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#38bdf8', marginBottom: '1rem' }}>TEAM MEMBER {memberIndex}</div>
                                    <div className="form-group-item">
                                      <label className="field-caption" style={{ color: '#cbd5e1' }}>Full Name</label>
                                      <input type="text" required className="app-input" placeholder="Full Name" value={member.name} onChange={(e) => updateTeamMember(memberIndex, 'name', e.target.value)} />
                                    </div>
                                    <div className="form-group-item" style={{ marginTop: '1.25rem' }}>
                                      <label className="field-caption" style={{ color: '#cbd5e1' }}>Email Address</label>
                                      <input type="email" required className="app-input" placeholder="Email Address" value={member.email} onChange={(e) => updateTeamMember(memberIndex, 'email', e.target.value)} />
                                    </div>
                                    <div className="form-group-item" style={{ marginTop: '1.25rem' }}>
                                      <label className="field-caption" style={{ color: '#cbd5e1' }}>Phone Number</label>
                                      <input type="tel" required className="app-input" placeholder="Phone Number" value={member.phone} onChange={(e) => updateTeamMember(memberIndex, 'phone', e.target.value)} />
                                    </div>
                                    <div className="form-group-item" style={{ marginTop: '1.25rem' }}>
                                      <label className="field-caption" style={{ color: '#cbd5e1' }}>Roll / Register ID</label>
                                      <input type="text" className="app-input" placeholder="Roll / Register ID" value={member.roll} onChange={(e) => updateTeamMember(memberIndex, 'roll', e.target.value)} />
                                    </div>
                                  </div>
                                </Step>
                              );
                            })}
                            {/* Step: OTP Verification (Always required for both free and paid events) */}
                            <Step>
                              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                                <h4 style={{ fontFamily: 'var(--font-akira)', color: '#fff', fontSize: '1.4rem', marginBottom: '0.75rem' }}>
                                  Email Verification
                                </h4>
                                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                                  To secure your registration, enter the 6-digit verification code sent to:
                                </p>
                                <div style={{
                                  display: 'inline-block',
                                  padding: '0.4rem 1rem',
                                  background: 'rgba(56, 189, 248, 0.1)',
                                  border: '1px solid rgba(56, 189, 248, 0.3)',
                                  borderRadius: '8px',
                                  color: '#38bdf8',
                                  fontFamily: 'var(--font-mono)',
                                  fontWeight: 'bold',
                                  fontSize: '0.95rem',
                                  marginBottom: '1.25rem'
                                }}>
                                  {formEmail || 'your email'}
                                </div>

                                {otpVerified ? (
                                  <div style={{
                                    color: '#10b981',
                                    padding: '1.25rem',
                                    border: '1px solid #10b981',
                                    borderRadius: '10px',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    maxWidth: '420px',
                                    margin: '0 auto'
                                  }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.35rem' }}>
                                      ✓ Email Verified Successfully!
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                                      {requiresPayment ? 'Click Continue to proceed to the payment step.' : 'Click Complete to confirm your registration.'}
                                    </p>
                                  </div>
                                ) : (
                                  <div style={{ maxWidth: '420px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {!otpSent ? (
                                      <button
                                        type="button"
                                        onClick={handleSendOtp}
                                        disabled={isSendingOtp}
                                        style={{
                                          background: '#38bdf8',
                                          color: '#0f172a',
                                          border: 'none',
                                          padding: '0.75rem 1.5rem',
                                          borderRadius: '8px',
                                          fontWeight: 'bold',
                                          cursor: isSendingOtp ? 'not-allowed' : 'pointer',
                                          fontFamily: 'var(--font-mono)'
                                        }}
                                      >
                                        {isSendingOtp ? 'SENDING CODE...' : 'SEND VERIFICATION CODE'}
                                      </button>
                                    ) : (
                                      <>
                                        <div className="form-group-item">
                                          <label className="field-caption" style={{ color: '#cbd5e1' }}>Enter 6-Digit OTP</label>
                                          <input
                                            type="text"
                                            maxLength={6}
                                            className="app-input"
                                            placeholder="123456"
                                            value={otpCode}
                                            onChange={(e) => {
                                              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                              setOtpCode(val);
                                              if (val.length === 6) {
                                                handleVerifyOtp(val);
                                              }
                                            }}
                                            style={{
                                              textAlign: 'center',
                                              fontFamily: 'var(--font-mono)',
                                              fontSize: '1.5rem',
                                              letterSpacing: '0.4em',
                                              fontWeight: 'bold'
                                            }}
                                          />
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => handleVerifyOtp()}
                                          disabled={isVerifyingOtp || otpCode.length !== 6}
                                          style={{
                                            background: otpCode.length === 6 ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                                            color: otpCode.length === 6 ? '#ffffff' : '#64748b',
                                            border: 'none',
                                            padding: '0.75rem 1.5rem',
                                            borderRadius: '8px',
                                            fontWeight: 'bold',
                                            cursor: (isVerifyingOtp || otpCode.length !== 6) ? 'not-allowed' : 'pointer',
                                            fontFamily: 'var(--font-mono)'
                                          }}
                                        >
                                          {isVerifyingOtp ? 'VERIFYING...' : 'VERIFY CODE'}
                                        </button>

                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                                          <span style={{ color: '#64748b' }}>Didn't receive the code?</span>
                                          <button
                                            type="button"
                                            onClick={handleSendOtp}
                                            disabled={otpCooldown > 0 || isSendingOtp}
                                            style={{
                                              background: 'transparent',
                                              border: 'none',
                                              color: otpCooldown > 0 ? '#64748b' : '#38bdf8',
                                              cursor: otpCooldown > 0 ? 'not-allowed' : 'pointer',
                                              fontWeight: 'bold',
                                              fontFamily: 'var(--font-mono)',
                                              padding: 0
                                            }}
                                          >
                                            {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend Code'}
                                          </button>
                                        </div>
                                      </>
                                    )}

                                    {otpMessage && (
                                      <p style={{ color: '#10b981', fontSize: '0.85rem', margin: '0.5rem 0 0 0' }}>{otpMessage}</p>
                                    )}
                                    {otpError && (
                                      <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: '0.5rem 0 0 0' }}>{otpError}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </Step>

                            {/* Step: Payment Required (Paid events only) */}
                            {requiresPayment && (
                            <Step>
                              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                                <h4 style={{ fontFamily: 'var(--font-akira)', color: '#fff', fontSize: '1.4rem', marginBottom: '0.5rem' }}>
                                  Payment Required
                                </h4>
                                <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                                  Pay ₹{expectedPaymentAmount.toFixed(2)} to the FEST payment account using the QR code or UPI link below:
                                </p>
                                
                                <div style={{
                                  display: 'inline-flex',
                                  flexDirection: 'column',
                                  gap: '0.35rem',
                                  background: 'rgba(16, 185, 129, 0.08)',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  borderRadius: '12px',
                                  padding: '0.75rem 1.75rem',
                                  marginBottom: '1.25rem'
                                }}>
                                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                                    REGISTRATION FEE: ₹{eventRegistrationFee} • EXACT PAYABLE AMOUNT:
                                  </div>
                                  <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                                    ₹{expectedPaymentAmount.toFixed(2)}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                    (Exact fractional amount ensures quick reconciliation by coordinators)
                                  </div>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center' }}>
                                  <div style={{ background: '#fff', padding: '1rem', borderRadius: '12px', display: 'inline-block' }}>
                                    {(() => {
                                      const amount = expectedPaymentAmount.toFixed(2);
                                      const upiId = import.meta.env.VITE_UPI_ID || '9188811692@fam';
                                      
                                      const safeEventName = activeEventData?.label?.substring(0, 20) || 'Event';
                                      const safeLeadName = formName?.substring(0, 15) || 'Team';
                                      const transactionNote = encodeURIComponent(`Knightopp: ${safeEventName} - ${safeLeadName}`);
                                      
                                      const upiString = `upi://pay?pa=${upiId}&pn=SRISHTI FEST&tn=${transactionNote}&am=${amount}&cu=INR`;
                                      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`;
                                      return (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                          <img src={qrUrl} alt="Payment QR" style={{ width: '200px', height: '200px', display: 'block' }} />
                                          
                                          {/* Mobile deep link button */}
                                          <a 
                                            href={upiString}
                                            style={{ 
                                              display: 'inline-block',
                                              background: '#10b981', 
                                              color: '#fff', 
                                              textDecoration: 'none',
                                              padding: '0.75rem 1.5rem', 
                                              borderRadius: '8px', 
                                              fontWeight: 'bold', 
                                              fontFamily: 'var(--font-mono)',
                                              width: '100%',
                                              textAlign: 'center'
                                            }}
                                          >
                                            PAY ON THIS DEVICE
                                          </a>
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  <div style={{ width: '100%', maxWidth: '440px', textAlign: 'left' }}>
                                    <div className="form-group-item">
                                      <label className="field-caption" style={{ color: '#cbd5e1' }}>
                                        UTR / Transaction Reference ID <span style={{ color: '#ef4444' }}>*</span>
                                      </label>
                                      <input
                                        type="text"
                                        required
                                        className="app-input"
                                        placeholder="e.g. 12-digit UTR (e.g. 428719284729)"
                                        value={utrNumber}
                                        onChange={(e) => setUtrNumber(e.target.value)}
                                        style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem' }}
                                      />
                                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem' }}>
                                        Enter the 12-digit UTR or Transaction ID from your payment app (Google Pay, PhonePe, Paytm, etc.).
                                      </div>
                                    </div>

                                    <div style={{
                                      marginTop: '1rem',
                                      padding: '0.85rem',
                                      borderRadius: '8px',
                                      background: 'rgba(245, 158, 11, 0.08)',
                                      border: '1px solid rgba(245, 158, 11, 0.25)',
                                      color: '#fbbf24',
                                      fontSize: '0.8rem',
                                      lineHeight: 1.45
                                    }}>
                                      <strong>Note:</strong> Your registration will remain pending until the payment is verified by the FEST coordinator. Once approved, your entry pass will be issued.
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </Step>
                            )}
                          </Stepper>
                          )
                        ) : (
                          <div style={{ textAlign: 'center', padding: '1rem 0', display: 'flex', justifyContent: 'center' }}>
                            {isRegistered && isPaymentPending ? (
                              <div style={{
                                width: '100%',
                                maxWidth: '560px',
                                background: '#0c0d14',
                                border: '1px solid rgba(245, 158, 11, 0.35)',
                                borderRadius: '16px',
                                padding: '2.5rem 1.75rem',
                                textAlign: 'center',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                                margin: '0 auto'
                              }}>
                                <div style={{
                                  width: '56px',
                                  height: '56px',
                                  borderRadius: '50%',
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  border: '2px solid #f59e0b',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  margin: '0 auto 1.25rem'
                                }}>
                                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                  </svg>
                                </div>
                                
                                <div style={{
                                  display: 'inline-block',
                                  padding: '0.35rem 0.85rem',
                                  borderRadius: '20px',
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  border: '1px solid rgba(245, 158, 11, 0.35)',
                                  color: '#fbbf24',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                  fontFamily: 'var(--font-mono)',
                                  letterSpacing: '0.08em',
                                  marginBottom: '0.75rem'
                                }}>
                                  PAYMENT PENDING VERIFICATION
                                </div>

                                <h3 style={{
                                  fontFamily: 'var(--font-akira)',
                                  fontSize: '1.4rem',
                                  color: '#ffffff',
                                  margin: '0 0 0.5rem 0'
                                }}>
                                  Registration Submitted
                                </h3>

                                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                                  Your payment details have been submitted successfully.<br />
                                  Your registration is pending payment verification by the FEST coordinator.
                                </p>

                                <div style={{
                                  background: 'rgba(255, 255, 255, 0.03)',
                                  border: '1px solid rgba(255, 255, 255, 0.08)',
                                  borderRadius: '12px',
                                  padding: '1rem',
                                  textAlign: 'left',
                                  marginBottom: '1.5rem',
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '0.82rem'
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ color: '#64748b' }}>Event:</span>
                                    <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{activeEventData?.label}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ color: '#64748b' }}>Amount:</span>
                                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>₹{expectedPaymentAmount.toFixed(2)}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ color: '#64748b' }}>UTR / Reference:</span>
                                    <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{utrNumber}</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>Status:</span>
                                    <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>Awaiting Coordinator Approval</span>
                                  </div>
                                </div>

                                <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                                  Once your payment is verified, your official entry pass will be issued and viewable in your Participant Profile.
                                </p>

                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => navigate('/profile')}
                                    style={{
                                      background: '#38bdf8',
                                      color: '#0f172a',
                                      border: 'none',
                                      padding: '0.75rem 1.5rem',
                                      borderRadius: '8px',
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                      fontFamily: 'var(--font-mono)'
                                    }}
                                  >
                                    View Profile
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => navigate('/register')}
                                    style={{
                                      background: 'rgba(255, 255, 255, 0.08)',
                                      color: '#ffffff',
                                      border: '1px solid rgba(255, 255, 255, 0.15)',
                                      padding: '0.75rem 1.5rem',
                                      borderRadius: '8px',
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                      fontFamily: 'var(--font-mono)'
                                    }}
                                  >
                                    Browse Events
                                  </button>
                                </div>
                              </div>
                            ) : isRegistered && qrCodeDataUrl ? (
                              <TearTicket
                                orientation="horizontal"
                                scrim={false}
                                width={650}
                                height={300}
                                stubSize={180}
                                radius={16}
                                holes={12}
                                holeSize={7}
                                notch={5}
                                tearAngle={25}
                                stretch={30}
                                resistance={0.5}
                                rotate={-1.5}
                                tilt={true}
                                tiltMax={12}
                                tiltReach={300}
                                parallax={8}
                                perspective={1000}
                                background="#070a13"
                                stubBackground="#ffffff"
                                color="#ffffff"
                                border={true}
                                borderColor="rgba(56,189,248,0.2)"
                                borderWidth={1}
                                recenter={true}
                                stub={
                                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '1.25rem', background: '#fff', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', background: 'linear-gradient(135deg, rgba(165,243,252,0.6), rgba(56,189,248,0.8))', transform: 'rotate(45deg)', opacity: 0.6, zIndex: 0 }}></div>
                                    <div style={{ position: 'absolute', bottom: '-40px', left: '-30px', width: '150px', height: '120px', background: 'linear-gradient(135deg, rgba(56,189,248,0.8), rgba(29,78,216,0.8))', transform: 'rotate(35deg)', opacity: 0.8, zIndex: 0 }}></div>
                                    
                                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                                      <h4 style={{ fontFamily: 'var(--font-akira)', color: '#000', fontSize: '1.1rem', marginBottom: '1.25rem', letterSpacing: '0.05em' }}>SCAN ME</h4>
                                      
                                      <div style={{ position: 'relative', padding: '12px' }}>
                                        <div style={{ position: 'absolute', top: 0, left: 0, width: '18px', height: '18px', borderTop: '4px solid #06b6d4', borderLeft: '4px solid #06b6d4', borderRadius: '4px 0 0 0' }}></div>
                                        <div style={{ position: 'absolute', top: 0, right: 0, width: '18px', height: '18px', borderTop: '4px solid #06b6d4', borderRight: '4px solid #06b6d4', borderRadius: '0 4px 0 0' }}></div>
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '18px', height: '18px', borderBottom: '4px solid #06b6d4', borderLeft: '4px solid #06b6d4', borderRadius: '0 0 0 4px' }}></div>
                                        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '18px', height: '18px', borderBottom: '4px solid #06b6d4', borderRight: '4px solid #06b6d4', borderRadius: '0 0 4px 0' }}></div>
                                        
                                        <QRCodeSVG
                                          value={participantCode}
                                          size={120}
                                          bgColor="#ffffff"
                                          fgColor="#000000"
                                          level="H"
                                          imageSettings={{
                                            src: "/assets/logo.png",
                                            height: 28,
                                            width: 28,
                                            excavate: true,
                                          }}
                                        />
                                      </div>
                                      
                                      <span style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '1.25rem', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{participantCode}</span>
                                    </div>
                                  </div>
                                }
                              >
                                <div style={{ position: 'relative', width: '100%', height: '100%', padding: '2.5rem', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, background: 'radial-gradient(circle at 30% 50%, rgba(14,165,233,0.2) 0%, transparent 60%)' }}></div>
                                  <div style={{ position: 'absolute', top: '-10%', left: '20%', width: '150%', height: '120%', zIndex: 0, background: 'repeating-linear-gradient(90deg, rgba(14,165,233,0) 0px, rgba(14,165,233,0) 40px, rgba(14,165,233,0.3) 40px, rgba(14,165,233,0.6) 60px, rgba(14,165,233,0) 60px, rgba(14,165,233,0) 80px)', transform: 'skewX(-15deg)', opacity: 0.6 }}></div>
                              
                                  <div style={{ position: 'relative', zIndex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#e2e8f0', letterSpacing: '0.2em', lineHeight: 1.4 }}>SRISHTI 2.7<br/><span style={{ color: '#38bdf8' }}>ENTRY PASS</span></div>
                                      <div style={{ height: '2px', width: '60px', background: 'linear-gradient(90deg, #38bdf8, transparent)' }}></div>
                                    </div>
                                    
                                    <h3 style={{ fontFamily: 'var(--font-akira)', fontSize: '2.5rem', color: '#fff', margin: '0 0 1.5rem 0', lineHeight: 1, textTransform: 'uppercase', textShadow: '0 0 20px rgba(56,189,248,0.7), 0 0 40px rgba(56,189,248,0.3)' }}>
                                      {activeEventData?.label || 'EVENT'}
                                    </h3>
                                    
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                       <div style={{ width: '4px', height: '40px', background: '#38bdf8', borderRadius: '2px', boxShadow: '0 0 10px #38bdf8' }}></div>
                                       <div>
                                         <p style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.3rem', margin: '0' }}>{formName}</p>
                                         <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0' }}>{formCollege}</p>
                                       </div>
                                    </div>
                                  </div>
                                  
                                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(56,189,248,0.3)', display: 'inline-flex', flexDirection: 'column', gap: '0.25rem', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                                      <span style={{ fontSize: '0.65rem', color: '#94a3b8', letterSpacing: '0.1em' }}>STATUS</span>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '18px', height: '18px', background: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px #10b981' }}>
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        </div>
                                        <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '0.05em' }}>VERIFIED</span>
                                      </div>
                                    </div>
                                    
                                    <div style={{ textAlign: 'right' }}>
                                      <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>TEAM</span>
                                      <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.3rem' }}>{formTeamSize} Member(s)</span>
                                    </div>
                                  </div>
                                </div>
                              </TearTicket>
                            ) : (
                              <div style={{ padding: '3rem 0' }}>
                                <h4 style={{ fontFamily: 'var(--font-akira)', color: '#38bdf8', fontSize: '1.5rem', marginBottom: '1rem' }}>PROCESSING...</h4>
                                <p style={{ color: '#94a3b8' }}>Hold on tight.</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: isMobile ? '280px' : 'auto' }}>
                      <div style={{ width: '100%', maxWidth: '750px', height: isMobile ? '100%' : '85vh', maxHeight: '850px', position: 'relative' }}>
                        <SafeVisual>
                          <MorphSlider
                            items={sliderItems}
                            transition="melt"
                            intensity={0.55}
                            aberration={0.35}
                            drift={0.4}
                            autoplay={false}
                          />
                        </SafeVisual>
                      </div>
                    </div>
                  </div>
              );

              return (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100000, background: '#0a0a0a', overflowY: isMobile ? 'auto' : 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none' }}>
                    <SafeVisual>
                      <Silk 
                        dpr={isMobile ? [1, 1] : [1, 2]} 
                        speed={isMobile ? 3 : 5} 
                        scale={1.2}
                        noiseIntensity={1.0}
                        color="#0a192f"
                      />
                    </SafeVisual>
                  </div>
                  <button 
                    onClick={() => navigate('/register')}
                    style={{ position: 'fixed', top: '1.25rem', right: '1.25rem', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '44px', height: '44px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200000, cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
                    ✕
                  </button>
                  {eventContent}
                </div>
              );
            })() : (
              <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: 100000,
                background: '#0a0a0a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem',
                textAlign: 'center'
              }}>
                <div style={{
                  maxWidth: '460px',
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.75)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '24px',
                  padding: '2.5rem 1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1rem',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f87171'
                  }}>
                    <FiAlertCircle size={28} />
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.15em', color: '#f87171', textTransform: 'uppercase' }}>
                    404 // EVENT NOT FOUND
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-akira)', fontSize: '1.2rem', color: '#ffffff', margin: 0, lineHeight: 1.25 }}>
                    EVENT NOT FOUND
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
                    The event you are looking for does not exist or may have been updated.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => navigate('/register')}
                      style={{
                        padding: '0.85rem 1.5rem',
                        background: '#38bdf8',
                        color: '#000000',
                        fontWeight: '700',
                        fontSize: '0.88rem',
                        borderRadius: '12px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      ← Browse All Events
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      style={{
                        padding: '0.85rem 1.5rem',
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: '#e4e4e7',
                        fontWeight: '600',
                        fontSize: '0.88rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        cursor: 'pointer'
                      }}
                    >
                      Return to Homepage
                    </button>
                  </div>
                </div>
              </div>
            )
          } />
          <Route path="/events" element={<Navigate to="/register" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* Selected Event Details Modal - StaggeredMenu Side Panel */}
      <StaggeredMenu
        position="right"
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
                
                {selectedEventDetails.date && selectedEventDetails.time && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(56,189,248,0.1)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.2)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      <span style={{ color: '#0f172a', fontWeight: 'bold', fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}>{selectedEventDetails.date}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16,185,129,0.1)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      <span style={{ color: '#0f172a', fontWeight: 'bold', fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}>{selectedEventDetails.time}</span>
                    </div>
                  </div>
                )}
                
              </div>
            )
          },
          { 
            label: isEventAlreadyRegistered(selectedEventDetails) 
              ? '✓ View in Profile' 
              : isPortalClosed 
                ? '✕ Registrations Closed' 
                : 'Register Now', 
            ariaLabel: isEventAlreadyRegistered(selectedEventDetails) 
              ? 'View in Profile' 
              : isPortalClosed 
                ? 'Registrations Closed' 
                : 'Register', 
            onClick: (e) => {
              e.preventDefault();
              if (isEventAlreadyRegistered(selectedEventDetails)) {
                setSelectedEventDetails(null);
                navigate('/profile');
                return;
              }
              if (isPortalClosed) {
                alert(`Registrations for ${selectedEventDetails.label} are officially closed.`);
                return;
              }
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
              { icon: <FiActivity size={20} />, label: 'Experience', onClick: () => navigateTo('main', 'experience') },
              { icon: <FiCalendar size={20} />, label: 'Events', onClick: () => navigate('/register/') },
              { icon: <FiUserPlus size={20} />, label: 'Profile', onClick: () => navigate('/profile') },
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
