import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import QRCode from 'qrcode';
import { 
  FiUsers, FiLogOut, FiDatabase, FiArrowLeft, 
  FiCalendar, FiCheckCircle, FiClock, FiSearch, FiEdit2, FiPlus, 
  FiTrash2, FiDownload, FiEye, FiRefreshCw, FiShield, 
  FiCheck, FiX, FiActivity, FiPhone, FiMail, FiBookOpen, 
  FiAlertCircle, FiLayers, FiUserCheck, FiAward, FiMapPin, FiLock
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { generateCardImagePng } from '../utils/cardImageGenerator';
import SideRays from './SideRays';
import SafeVisual from './SafeVisual';
import AdminAnalytics from './AdminAnalytics';
import { getAuditLogs, clearAuditLogs, exportLogsAsCsv, exportLogsAsJson, logActivity, parseLocationTelemetryPayload } from '../utils/auditLogger';
import './AdminDashboard.css';

// Official SRISHTI 2.7 Database Events Catalog
const DEFAULT_FEST_EVENTS = [
  { id: 'SRI27-TREASURE', event_code: 'SRI27-TREASURE', label: 'TREASURE HUNT', name: 'Treasure Hunt', category: 'FUN', date: '2026-12-10', start_time: '10:00', end_time: '12:00', venue: 'College Campus', status: 'upcoming', capacity: 100, registration_type: 'team', max_team_size: 4 },
  { id: 'SRI27-WALTZ', event_code: 'SRI27-WALTZ', label: 'WALTZ (DANCE)', name: 'Waltz', category: 'CULTURAL', date: '2026-12-10', start_time: '14:00', end_time: '16:00', venue: 'Main Auditorium', status: 'upcoming', capacity: 80, registration_type: 'team', max_team_size: 8 },
  { id: 'SRI27-QUIZ', event_code: 'SRI27-QUIZ', label: 'IT QUIZ', name: 'Quiz', category: 'TECHNICAL', date: '2026-12-10', start_time: '10:00', end_time: '12:00', venue: 'Seminar Hall', status: 'upcoming', capacity: 60, registration_type: 'team', max_team_size: 2 },
  { id: 'SRI27-CODE', event_code: 'SRI27-CODE', label: 'CODING & DEBUGGING', name: 'Coding and Debugging', category: 'TECHNICAL', date: '2026-12-11', start_time: '10:00', end_time: '12:00', venue: 'Computer Lab', status: 'upcoming', capacity: 50, registration_type: 'individual', max_team_size: 1 },
  { id: 'SRI27-TRACEBOT', event_code: 'SRI27-TRACEBOT', label: 'TRACE BOT', name: 'Tracebot', category: 'TECHNICAL', date: '2026-12-11', start_time: '13:00', end_time: '15:00', venue: 'CS Lab', status: 'upcoming', capacity: 40, registration_type: 'team', max_team_size: 4 },
  { id: 'SRI27-RELAY', event_code: 'SRI27-RELAY', label: 'RELAY CODING', name: 'Relay Coding', category: 'TECHNICAL', date: '2026-12-11', start_time: '10:00', end_time: '12:00', venue: 'Computer Lab', status: 'upcoming', capacity: 50, registration_type: 'team', max_team_size: 4 },
  { id: 'TEST-EV-02', event_code: 'TEST-EV-02', label: 'HACKAI 24H HACKATHON', name: 'HackAI 24h Hackathon', category: 'TECHNICAL', date: '2026-12-10', start_time: '10:00', end_time: '10:00', venue: 'Main Auditorium', status: 'upcoming', capacity: 80, registration_type: 'team', max_team_size: 4 },
  { id: 'TEST-EV-01', event_code: 'TEST-EV-01', label: 'CODE SPRINT (SPEED CODING)', name: 'Code Sprint (Speed Coding)', category: 'TECHNICAL', date: '2026-12-11', start_time: '10:00', end_time: '12:00', venue: 'CS Lab 3', status: 'upcoming', capacity: 60, registration_type: 'individual', max_team_size: 1 },
  { id: 'SRI27-BOMB', event_code: 'SRI27-BOMB', label: 'BOMB SQUAD', name: 'bomb squad', category: 'TECHNICAL', date: '2026-12-10', start_time: '10:00', end_time: '12:00', venue: 'Campus Venue', status: 'upcoming', capacity: 60, registration_type: 'team', max_team_size: 4 }
];

export default function AdminDashboard() {
  const navigate = useNavigate();

  // Authentication states
  const [identifier, setIdentifier] = useState(''); // username or email
  const [password, setPassword] = useState('');
  const [step, setStep] = useState('login'); // 'login', 'dashboard'
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Active user / staff session
  const [currentStaff, setCurrentStaff] = useState(null);
  const [adminRole, setAdminRole] = useState(null); // 'admin', 'registration', 'event_staff', 'volunteer'
  const [assignedEvents, setAssignedEvents] = useState([]); // events assigned to this event_staff
  const [selectedStaffEventId, setSelectedStaffEventId] = useState('');

  // Navigation tab
  const [activeTab, setActiveTab] = useState('overview'); 
  // Tabs: 'overview', 'checkin', 'attendance', 'events', 'participants', 'registrations', 'staff', 'databases', 'logs'

  // Audit & Location logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [logFilterAction, setLogFilterAction] = useState('all');
  const [selectedLogForInspect, setSelectedLogForInspect] = useState(null);
  const [isTestingLocation, setIsTestingLocation] = useState(false);

  // Primary database tables
  const [events, setEvents] = useState(DEFAULT_FEST_EVENTS);
  const [participants, setParticipants] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [eventStaff, setEventStaff] = useState([]);
  const [arrivalCheckins, setArrivalCheckins] = useState([]);
  const [eventAttendance, setEventAttendance] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDbTable, setSelectedDbTable] = useState('participants');
  const [eventTrackFilter, setEventTrackFilter] = useState('all'); // 'all', 'individual', 'team'

  // Live Check-in / Attendance Station State
  const [stationCodeInput, setStationCodeInput] = useState('');
  const [stationAttendee, setStationAttendee] = useState(null);
  const [stationNotes, setStationNotes] = useState('');
  const [stationActionLoading, setStationActionLoading] = useState(false);

  // Modals state
  const [modalType, setModalType] = useState(null); 
  // 'addParticipant', 'editParticipant', 'viewParticipantPass', 'quickRegister', 'editEvent', 'addEvent', 'addVolunteer', 'editVolunteer', 'assignEventStaff', 'inspectRow'
  const [activeItem, setActiveItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states & Participant Management
  const [userFormData, setUserFormData] = useState({
    participant_code: '',
    name: '',
    email: '',
    phone: '',
    college: '',
    department: '',
    year: ''
  });
  const [participantGateFilter, setParticipantGateFilter] = useState('all'); // 'all', 'checked_in', 'pending'
  const [selectedParticipantForPass, setSelectedParticipantForPass] = useState(null);
  const [participantQrUrl, setParticipantQrUrl] = useState('');
  const [isGeneratingPass, setIsGeneratingPass] = useState(false);
  const [quickRegData, setQuickRegData] = useState({
    participant_id: '',
    event_id: '',
    payment_status: 'verified',
    payment_method: 'cash'
  });
  const [eventFormData, setEventFormData] = useState({});
  const [volunteerFormData, setVolunteerFormData] = useState({
    username: '',
    name: '',
    email: '',
    role: 'volunteer',
    status: 'active'
  });
  const [assignStaffData, setAssignStaffData] = useState({
    volunteer_id: '',
    event_id: ''
  });

  // Multi-select & Danger Zone Factory Reset state
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
  const [resetConfirmWord, setResetConfirmWord] = useState('');
  const [resetOptions, setResetOptions] = useState({
    participants: true,
    registrations: true,
    arrivals: true,
    attendance: true,
    events: false
  });
  const [isResetting, setIsResetting] = useState(false);

  // Registration Portal Status Settings
  const [regPortalStatus, setRegPortalStatus] = useState(() => {
    try {
      return localStorage.getItem('srishti_reg_portal_status') || 'open';
    } catch (_) {
      return 'open';
    }
  });

  // Default and Custom WhatsApp Message Templates
  const DEFAULT_WA_REG_TEMPLATE = 
`🎟️ *SRISHTI 2.7 | OFFICIAL DELEGATE PASS*

Hello *{name}*, your registration is confirmed!

🆔 *Delegate ID:* {participantCode}  
🏆 *Event:* {eventName}  
🏛️ *College:* {college}

📱 *Your Digital Pass & QR Code:*  
{passUrl}

Please present your QR code and college ID at the entrance.

See you at *SRISHTI 2.7*! 🚀`;

  const DEFAULT_WA_RESEND_TEMPLATE = 
`🎟️ *SRISHTI 2.7 | OFFICIAL DELEGATE PASS*

Hello *{name}*, here is your requested entry pass:

🆔 *Delegate ID:* {participantCode}  
🏆 *Event:* {eventName}  
🏛️ *College:* {college}

📱 *Your Digital Pass & QR Code:*  
{passUrl}

Please present your QR code and college ID at the entrance.

See you at *SRISHTI 2.7*! 🚀`;

  const [activeWaTemplateTab, setActiveWaTemplateTab] = useState('reg'); // 'reg' or 'resend'

  const [whatsAppTemplate, setWhatsAppTemplate] = useState(() => {
    try {
      return localStorage.getItem('srishti_wa_custom_template') || DEFAULT_WA_REG_TEMPLATE;
    } catch (_) {
      return DEFAULT_WA_REG_TEMPLATE;
    }
  });

  const [whatsAppResendTemplate, setWhatsAppResendTemplate] = useState(() => {
    try {
      return localStorage.getItem('srishti_wa_profile_template') || DEFAULT_WA_RESEND_TEMPLATE;
    } catch (_) {
      return DEFAULT_WA_RESEND_TEMPLATE;
    }
  });

  const [isCustomizingWhatsApp, setIsCustomizingWhatsApp] = useState(false);

  const handleSaveWhatsAppTemplate = () => {
    try {
      if (activeWaTemplateTab === 'reg') {
        localStorage.setItem('srishti_wa_custom_template', whatsAppTemplate);
        showToast('Registration WhatsApp template saved successfully!', 'success');
      } else {
        localStorage.setItem('srishti_wa_profile_template', whatsAppResendTemplate);
        showToast('Profile "Send Again" WhatsApp template saved successfully!', 'success');
      }
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('srishti_wa_template_update'));
      logActivity(
        'UPDATE_SETTINGS',
        'WHATSAPP_TEMPLATE',
        `Admin updated ${activeWaTemplateTab === 'reg' ? 'Registration' : 'Profile Re-send'} WhatsApp template`,
        currentStaff?.username || currentStaff?.email || 'admin',
        'SUCCESS'
      );
    } catch (err) {
      showToast('Failed to save template: ' + err.message, 'error');
    }
  };

  const handleResetWhatsAppTemplate = () => {
    if (activeWaTemplateTab === 'reg') {
      setWhatsAppTemplate(DEFAULT_WA_REG_TEMPLATE);
      localStorage.removeItem('srishti_wa_custom_template');
      showToast('Reset to default Registration template.', 'info');
    } else {
      setWhatsAppResendTemplate(DEFAULT_WA_RESEND_TEMPLATE);
      localStorage.removeItem('srishti_wa_profile_template');
      showToast('Reset to default Profile "Send Again" template.', 'info');
    }
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('srishti_wa_template_update'));
  };

  const handleInsertWhatsAppTag = (tag) => {
    if (activeWaTemplateTab === 'reg') {
      setWhatsAppTemplate(prev => prev + ' ' + tag);
    } else {
      setWhatsAppResendTemplate(prev => prev + ' ' + tag);
    }
  };

  // WhatsApp Cloud Bot Real-time Connection Status
  const [botStatus, setBotStatus] = useState({ connected: false, phone: null, loading: true });

  const checkBotStatus = useCallback(async () => {
    try {
      const res = await fetch('https://trialrun2.onrender.com/status');
      const data = await res.json();
      setBotStatus({ connected: !!data.connected, phone: data.phone || null, loading: false });
    } catch (_) {
      setBotStatus({ connected: false, phone: null, loading: false });
    }
  }, []);

  useEffect(() => {
    checkBotStatus();
    const interval = setInterval(checkBotStatus, 10000);
    return () => clearInterval(interval);
  }, [checkBotStatus]);

  const handleTogglePortalStatus = (newStatus) => {
    try {
      localStorage.setItem('srishti_reg_portal_status', newStatus);
      setRegPortalStatus(newStatus);
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('srishti_reg_portal_update'));
      logActivity(
        'UPDATE_SETTINGS',
        'PORTAL_LOCK',
        `Admin switched public registration status to ${newStatus.toUpperCase()}`,
        currentStaff?.username || currentStaff?.email || 'admin',
        'SUCCESS'
      );
      showToast(
        newStatus === 'closed' 
          ? 'Registration Portal CLOSED. Notice banner is active on /register.' 
          : 'Registration Portal OPENED. Visitors can freely register for all events.',
        'success'
      );
    } catch (err) {
      showToast(`Failed to update status: ${err.message}`, 'error');
    }
  };

  // Toast feedback
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  }, []);

  // -----------------------------------------------------------------------------
  // DATA HYDRATION: FETCH ALL 7 CORE TABLES
  // -----------------------------------------------------------------------------
  const fetchAllData = useCallback(async (role, staffVolunteerId) => {
    setIsDataLoading(true);
    try {
      // 1. Fetch Events
      const { data: dbEvents, error: evErr } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      let loadedEvents = DEFAULT_FEST_EVENTS;
      if (!evErr && dbEvents && dbEvents.length > 0) {
        loadedEvents = dbEvents.map(ev => ({
          ...ev,
          label: ev.name || ev.event_code,
          category: ev.category || 'TECHNICAL',
          venue: ev.venue || 'Campus Venue',
          date: ev.date || '2026-12-10',
          time: ev.start_time ? `${ev.start_time} - ${ev.end_time || ''}` : '10:00 AM'
        }));
      }
      setEvents(loadedEvents);

      // 2. Fetch Participants
      const { data: pData, error: pErr } = await supabase
        .from('participants')
        .select('*')
        .order('created_at', { ascending: false });

      if (!pErr && pData) {
        setParticipants(pData);
      } else if (pErr) {
        console.error('Failed to load participants:', pErr);
        showToast(`Could not load participants: ${pErr.message}`, 'error');
      }

      // 3. Fetch Registrations joined with participants and events
      try {
        const { data: rData, error: rErr } = await supabase
          .from('registrations')
          .select('*, participants(id, participant_code, name, email, phone, college, department, year), events(id, event_code, name, category, venue, date, start_time)')
          .order('registered_at', { ascending: false });

        if (!rErr && rData) {
          setRegistrations(rData);
        } else {
          const { data: fallbackR } = await supabase.from('registrations').select('*');
          if (fallbackR) setRegistrations(fallbackR);
        }
      } catch (_) {}

      // 4. Fetch Volunteers
      try {
        const { data: volData, error: volErr } = await supabase
          .from('volunteers')
          .select('*')
          .order('name', { ascending: true });

        if (!volErr && volData) {
          setVolunteers(volData);
        }
      } catch (_) {}

      // 5. Fetch Event Staff Assignments
      let staffAssignments = [];
      try {
        const { data: esData, error: esErr } = await supabase
          .from('event_staff')
          .select('*, volunteers(id, name, username, email, role), events(id, name, event_code, venue)');

        if (!esErr && esData) {
          staffAssignments = esData;
          setEventStaff(esData);
        }
      } catch (_) {}

      // Filter assigned events for event_staff role
      if (staffVolunteerId) {
        const userAssignments = staffAssignments.filter(es => es.volunteer_id === staffVolunteerId);
        const assignedEvs = userAssignments.map(ua => 
          loadedEvents.find(e => e.id === ua.event_id || e.event_code === ua.events?.event_code)
        ).filter(Boolean);

        setAssignedEvents(assignedEvs);
        if (assignedEvs.length > 0 && !selectedStaffEventId) {
          setSelectedStaffEventId(assignedEvs[0].id);
        }
      }

      // 6. Fetch Arrival Check-ins
      try {
        const { data: arrData } = await supabase
          .from('arrival_checkins')
          .select('*, participants(id, participant_code, name, college, phone, email), volunteers(name, username)')
          .order('checked_in_at', { ascending: false });

        if (arrData) setArrivalCheckins(arrData);
      } catch (_) {}

      // 7. Fetch Event Attendance
      try {
        const { data: attData } = await supabase
          .from('event_attendance')
          .select('*, participants(id, participant_code, name, college, phone), events(id, name, event_code, venue), volunteers(name, username)')
          .order('marked_at', { ascending: false });

        if (attData) setEventAttendance(attData);
      } catch (_) {}

      // 8. Fetch Security Audit & Location Logs
      try {
        const logs = await getAuditLogs();
        if (logs) setAuditLogs(logs);
      } catch (_) {}

    } catch (err) {
      console.error('Error fetching admin data:', err);
      showToast('Notice: Synced with available tables', 'info');
    } finally {
      setIsDataLoading(false);
    }
  }, [selectedStaffEventId, showToast]);

  // -----------------------------------------------------------------------------
  // AUTHENTICATION & LOGIN
  // -----------------------------------------------------------------------------
  const authenticateStaff = useCallback(async (authUser) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      if (!authUser?.id && !authUser?.email) throw new Error('Sign in with your administrator account.');
      const userEmail = (authUser.email || '').trim().toLowerCase();
      
      let staffProfile = null;
      // 1. Try matching by auth_user_id
      if (authUser.id) {
        const { data: matchedStaff } = await supabase
          .from('volunteers')
          .select('id, auth_user_id, username, name, email, role, status')
          .eq('auth_user_id', authUser.id)
          .eq('status', 'active')
          .maybeSingle();
        if (matchedStaff) staffProfile = matchedStaff;
      }

      // 2. Fallback to matching by email if auth_user_id is unlinked
      if (!staffProfile && userEmail) {
        const { data: matchedByEmail } = await supabase
          .from('volunteers')
          .select('id, auth_user_id, username, name, email, role, status')
          .ilike('email', userEmail)
          .maybeSingle();
        if (matchedByEmail) staffProfile = matchedByEmail;
      }

      // 3. Superadmin authorization check (tsrknight@gmail.com or role === 'admin')
      const isSuperAdminEmail = userEmail === 'tsrknight@gmail.com';
      if (!isSuperAdminEmail && (!staffProfile || (staffProfile.role !== 'admin' && staffProfile.role !== 'registration'))) {
        await supabase.auth.signOut();
        throw new Error('This account is not an active SRISHTI administrator.');
      }

      const activeStaff = staffProfile || {
        id: 'superadmin',
        name: 'Master Superadmin',
        email: userEmail,
        username: 'superadmin',
        role: 'admin',
        status: 'active'
      };

      setCurrentStaff(activeStaff);
      setAdminRole('admin');
      setActiveTab('overview');
      setStep('dashboard');
      showToast(`Welcome back, ${activeStaff.name || activeStaff.email}`, 'success');
      await fetchAllData('admin', activeStaff.id);
    } catch (err) {
      setAuthError(err.message || 'Unable to verify administrator access.');
    } finally {
      setAuthLoading(false);
    }
  }, [fetchAllData, showToast]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;
    setAuthLoading(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: identifier.trim(), password });
    if (error) {
      setAuthLoading(false);
      setAuthError('Email or password is incorrect.');
      return;
    }
    // The auth state listener below verifies the newly signed-in identity.
  };

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setStep('login');
    setCurrentStaff(null);
    setAdminRole(null);
    setAssignedEvents([]);
  }, []);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (alive && session?.user) authenticateStaff(session.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive && _event === 'SIGNED_IN' && session?.user) authenticateStaff(session.user);
      if (alive && _event === 'SIGNED_OUT') {
        setCurrentStaff(null);
        setAdminRole(null);
        setStep('login');
      }
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, [authenticateStaff]);

  // -----------------------------------------------------------------------------
  // COMPUTED STATS & SUMMARY
  // -----------------------------------------------------------------------------
  const stats = useMemo(() => {
    const totalRegs = registrations.length;
    const totalUsers = participants.length;
    const totalArrivals = arrivalCheckins.length;
    const totalAttendance = eventAttendance.length;
    const totalEventsCount = events.length;
    const totalStaffCount = volunteers.length;

    return {
      totalRegs,
      totalUsers,
      totalArrivals,
      totalAttendance,
      totalEventsCount,
      totalStaffCount
    };
  }, [registrations, participants, arrivalCheckins, eventAttendance, events, volunteers]);

  // -----------------------------------------------------------------------------
  // -----------------------------------------------------------------------------
  // ACTION: ARRIVAL GATE CHECK-IN (registration desk & admin)
  // -----------------------------------------------------------------------------
  const handleLookupParticipantForStation = async (codeToSearch) => {
    let q = (codeToSearch || stationCodeInput).trim();
    if (!q) {
      setStationAttendee(null);
      return;
    }

    // Server-Authoritative Cryptographic Pass Verification
    let isCryptographicallyVerified = false;
    let scannedToken = '';
    if (q.startsWith('{') || q.includes('"k":') || q.includes('"c":') || q.startsWith('SRI27:')) {
      const { parseScannedPass } = await import('../utils/cryptoSecurity');
      const parsed = parseScannedPass(q);
      if (parsed.valid && parsed.participantCode) {
        q = parsed.participantCode.trim();
        scannedToken = parsed.passToken || '';
      }
    }

    const searchUpper = q.toUpperCase();
    const match = participants.find(p => 
      (p.participant_code && p.participant_code.toUpperCase() === searchUpper) ||
      (p.email && p.email.toUpperCase() === searchUpper) ||
      (p.phone && p.phone.includes(q))
    );

    if (match) {
      // If a cryptographic token was scanned, verify against database server pass_token
      if (scannedToken) {
        if (match.pass_token && match.pass_token.toLowerCase() !== scannedToken.toLowerCase()) {
          setStationAttendee(null);
          showToast('COUNTERFEIT PASS DETECTED: Pass cryptographic token mismatch with database!', 'error');
          return;
        }
        isCryptographicallyVerified = true;
        showToast(`Server-Verified Cryptographic Pass — ${match.name}`, 'success');
      }

      // Find user registrations
      const userRegs = registrations.filter(r => 
        r.participant_id === match.id || 
        r.participants?.participant_code === match.participant_code
      );
      
      // Check if already arrived
      const arrival = arrivalCheckins.find(a => 
        a.participant_id === match.id || 
        a.participants?.participant_code === match.participant_code
      );

      setStationAttendee({
        ...match,
        registrations: userRegs,
        arrivalCheckin: arrival,
        isCryptoVerified: isCryptographicallyVerified,
        scannedToken: scannedToken || match.pass_token
      });
    } else {
      setStationAttendee(null);
      showToast(`No participant found with code "${q}"`, 'error');
    }
  };

  const handleMarkGateArrival = async (sourceType = 'manual') => {
    if (!stationAttendee) return;
    setStationActionLoading(true);

    try {
      const payload = {
        participant_id: stationAttendee.id,
        checked_in_by: currentStaff?.id || '8c78f36f-a47f-4837-8106-d06380aada14',
        source: sourceType,
        notes: stationNotes.trim() || null
      };

      const { error } = await supabase
        .from('arrival_checkins')
        .insert([payload])
        .select('*');

      if (error) {
        if (error.code === '23505') {
          showToast(`Notice: ${stationAttendee.name} is already checked in at the gate!`, 'warning');
        } else {
          throw error;
        }
      } else {
        showToast(`Gate Arrival Confirmed: ${stationAttendee.name} checked in!`, 'success');
      }

      setStationNotes('');
      
      // Refresh data
      fetchAllData(adminRole, currentStaff?.id);
      handleLookupParticipantForStation(stationAttendee.participant_code);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error recording arrival check-in', 'error');
    } finally {
      setStationActionLoading(false);
    }
  };

  // -----------------------------------------------------------------------------
  // ACTION: EVENT ROOM ATTENDANCE (event_staff & admin)
  // -----------------------------------------------------------------------------
  const handleMarkEventAttendance = async (participantId, targetEventId, sourceType = 'manual') => {
    setStationActionLoading(true);
    try {
      const payload = {
        participant_id: participantId,
        event_id: targetEventId,
        marked_by: currentStaff?.id || '8c78f36f-a47f-4837-8106-d06380aada14',
        source: sourceType,
        notes: stationNotes.trim() || null
      };

      const { error } = await supabase
        .from('event_attendance')
        .insert([payload]);

      if (error) {
        if (error.code === '23505') {
          showToast(`Notice: Attendance already recorded for this event room.`, 'warning');
        } else {
          throw error;
        }
      } else {
        showToast(`Attendance marked successfully for event room!`, 'success');
      }

      setStationNotes('');
      fetchAllData(adminRole, currentStaff?.id);

      if (stationAttendee) {
        handleLookupParticipantForStation(stationAttendee.participant_code);
      }
    } catch (err) {
      showToast(err.message || 'Error marking attendance', 'error');
    } finally {
      setStationActionLoading(false);
    }
  };

  // -----------------------------------------------------------------------------
  // ACTION: EVENT STAFF ASSIGNMENT (Admin only)
  // -----------------------------------------------------------------------------
  const handleAssignStaffToEvent = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { volunteer_id, event_id } = assignStaffData;
      if (!volunteer_id || !event_id) throw new Error('Please select both staff member and event.');

      const { error } = await supabase
        .from('event_staff')
        .insert([{ volunteer_id, event_id }]);

      if (error && error.code !== '23505') throw error;

      showToast('Staff coordinator assigned to event successfully!', 'success');
      setModalType(null);
      fetchAllData(adminRole, currentStaff?.id);
    } catch (err) {
      showToast(err.message || 'Failed to assign staff to event', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveStaffAssignment = async (assignmentId) => {
    if (!window.confirm('Remove this coordinator assignment?')) return;
    try {
      const { error } = await supabase
        .from('event_staff')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
      showToast('Assignment removed.', 'success');
      fetchAllData(adminRole, currentStaff?.id);
    } catch (err) {
      showToast(err.message || 'Failed to remove assignment', 'error');
    }
  };

  // -----------------------------------------------------------------------------
  // ACTION: PARTICIPANT MANAGEMENT ("People" Full CRUD, Admin & Registration Desk)
  // -----------------------------------------------------------------------------
  const handleOpenAddParticipant = () => {
    // Generate next sequential participant code (e.g. SRI27-P1005)
    const existingNumbers = participants
      .map(p => {
        const match = p.participant_code?.match(/\d+/g);
        return match ? parseInt(match[match.length - 1], 10) : 0;
      })
      .filter(n => !isNaN(n) && n > 0);
    const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 1000;
    const nextCode = `SRI27-P${Math.max(maxNum + 1, 1001)}`;

    setUserFormData({
      participant_code: nextCode,
      name: '',
      email: '',
      phone: '',
      college: 'St. Thomas College (Autonomous) Thrissur',
      department: 'Computer Science',
      year: '1st Year'
    });
    setActiveItem(null);
    setModalType('addParticipant');
  };

  const handleOpenEditParticipant = (participant) => {
    setActiveItem(participant);
    setUserFormData({
      participant_code: participant.participant_code || '',
      name: participant.name || '',
      email: participant.email || '',
      phone: participant.phone || '',
      college: participant.college || '',
      department: participant.department || '',
      year: participant.year || ''
    });
    setModalType('editParticipant');
  };

  const handleSaveParticipant = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const pCode = (userFormData.participant_code || '').trim().toUpperCase();
      if (!pCode) throw new Error('Participant code is required (e.g. SRI27-P1005)');
      if (!userFormData.name?.trim()) throw new Error('Participant name is required');

      const payload = {
        participant_code: pCode,
        name: userFormData.name.trim(),
        email: userFormData.email?.trim().toLowerCase() || null,
        phone: userFormData.phone?.trim() || null,
        college: userFormData.college?.trim() || 'St. Thomas College (Autonomous) Thrissur',
        department: userFormData.department?.trim() || null,
        year: userFormData.year?.trim() || null,
      };

      if (modalType === 'addParticipant' || !activeItem) {
        const { error } = await supabase
          .from('participants')
          .insert([payload]);

        if (error) throw error;
        showToast(`Participant "${payload.name}" registered successfully!`, 'success');
      } else {
        const { error } = await supabase
          .from('participants')
          .update(payload)
          .eq('id', activeItem.id);

        if (error) throw error;
        showToast(`Participant "${payload.name}" updated successfully!`, 'success');
      }

      setModalType(null);
      setActiveItem(null);
      fetchAllData(adminRole, currentStaff?.id);
    } catch (err) {
      showToast(err.message || 'Failed to save participant', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteParticipant = async (participantId, participantName, participantCode) => {
    if (!window.confirm(`Are you sure you want to permanently delete participant "${participantName}" (${participantCode})?\n\nWARNING: This will cascade-delete their profile, all event registrations, and arrival check-ins.`)) {
      return;
    }
    try {
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', participantId);

      if (error) throw error;
      showToast(`Participant "${participantName}" deleted successfully!`, 'success');
      fetchAllData(adminRole, currentStaff?.id);
    } catch (err) {
      showToast(err.message || 'Failed to delete participant', 'error');
    }
  };

  const handleToggleArrivalCheckin = async (participant) => {
    const isArrived = arrivalCheckins.some(a => a.participant_id === participant.id);
    try {
      if (isArrived) {
        if (!window.confirm(`Revoke gate check-in status for ${participant.name}?`)) return;
        const { error } = await supabase
          .from('arrival_checkins')
          .delete()
          .eq('participant_id', participant.id);

        if (error) throw error;
        showToast(`Gate check-in revoked for ${participant.name}`, 'info');
      } else {
        const staffId = currentStaff?.id || (volunteers.length > 0 ? volunteers[0].id : null);
        if (!staffId) throw new Error('No staff ID available to record check-in');
        const { error } = await supabase
          .from('arrival_checkins')
          .insert([{
            participant_id: participant.id,
            checked_in_by: staffId,
            source: 'manual',
            notes: 'Verified via Participants Table'
          }]);

        if (error && error.code !== '23505') throw error;
        showToast(`Gate arrival verified: ${participant.name} is checked in!`, 'success');
      }
      fetchAllData(adminRole, currentStaff?.id);
    } catch (err) {
      showToast(err.message || 'Failed to update check-in status', 'error');
    }
  };

  const handleViewParticipantPass = async (participant) => {
    try {
      setIsGeneratingPass(true);
      setSelectedParticipantForPass(participant);
      const plainCode = (participant.participant_code || '').trim().toUpperCase();
      const qrDataUrl = await QRCode.toDataURL(plainCode, {
        margin: 1,
        width: 300,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setParticipantQrUrl(qrDataUrl);
      setModalType('viewParticipantPass');
    } catch (err) {
      showToast('Failed to generate pass QR code', 'error');
    } finally {
      setIsGeneratingPass(false);
    }
  };

  const handleDownloadPassPng = async () => {
    if (!selectedParticipantForPass) return;
    try {
      const pEvents = registrations
        .filter(r => (r.participant_id === selectedParticipantForPass.id || r.participants?.id === selectedParticipantForPass.id))
        .map(r => r.events?.name || r.events?.label || 'Festival Event');

      const cardPng = await generateCardImagePng({
        attendeeName: selectedParticipantForPass.name,
        college: selectedParticipantForPass.college || 'St. Thomas College Thrissur',
        passCode: selectedParticipantForPass.participant_code,
        passToken: `SRISHTI27-${selectedParticipantForPass.participant_code}`,
        events: pEvents.length > 0 ? pEvents : ['General Festival Pass']
      });

      const link = document.createElement('a');
      link.download = `SRISHTI27_PASS_${selectedParticipantForPass.participant_code}.png`;
      link.href = cardPng;
      link.click();
      showToast('Festival pass PNG downloaded!', 'success');
    } catch (err) {
      showToast('Failed to generate card image: ' + (err.message || 'unknown error'), 'error');
    }
  };

  const handleSendWhatsAppPass = useCallback(async (participant, specificEventName = null) => {
    if (!participant) return;
    const phone = participant.phone;
    if (!phone) {
      showToast('No phone number registered for this participant.', 'error');
      return;
    }

    // Always link to the live production website!
    const liveProductionUrl = 'https://srishti2-7.vercel.app';
    const profileLink = `${liveProductionUrl}/profile`;

    // Clean Indian phone number: strip non-digits, ensure 91 prefix
    let cleanPhone = String(phone).replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
      cleanPhone = `91${cleanPhone.slice(1)}`;
    }

    // Determine event names
    let eventTitle = specificEventName;
    if (!eventTitle) {
      const pRegs = registrations.filter(r => r.participant_id === participant.id || r.participants?.id === participant.id);
      eventTitle = pRegs.length > 0
        ? pRegs.map(r => r.events?.name || r.events?.label || r.event_name || 'Event').join(', ')
        : 'All Registered Competitions';
    }

    // 1. Generate full-resolution Delegate Card PNG image attachment
    let cardPng = null;
    try {
      const pEvents = registrations
        .filter(r => (r.participant_id === participant.id || r.participants?.id === participant.id))
        .map(r => r.events?.name || r.events?.label || 'Festival Event');

      cardPng = await generateCardImagePng({
        attendeeName: participant.name,
        college: participant.college || 'St. Thomas College Thrissur',
        passCode: participant.participant_code,
        passToken: `SRISHTI27-${participant.participant_code}`,
        events: pEvents.length > 0 ? pEvents : [eventTitle],
        isVerified: true,
        statusText: 'VERIFIED'
      });
    } catch (pngErr) {
      console.warn('Card PNG generation note:', pngErr);
    }

    // Format custom message template
    const formattedCaption = whatsAppTemplate
      .replace(/{name}/g, participant.name)
      .replace(/{participantCode}/g, participant.participant_code)
      .replace(/{eventName}/g, eventTitle)
      .replace(/{college}/g, participant.college || '')
      .replace(/{passUrl}/g, profileLink);

    // 2. Automated cloud bot dispatch with image card attachment
    try {
      showToast(`Generating pass card image & dispatching automatically to ${participant.name}...`, 'info');
      const res = await fetch('https://trialrun2.onrender.com/send-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          name: participant.name,
          participantCode: participant.participant_code,
          eventName: eventTitle,
          college: participant.college || '',
          passUrl: profileLink,
          imageBase64: cardPng,
          customMessage: whatsAppTemplate
        })
      });
      const data = await res.json();
      if (data.success) {
        logActivity(
          'DISPATCH_PASS',
          'WHATSAPP_BOT',
          `Automated WhatsApp pass card image sent to ${participant.name} (${cleanPhone})`,
          currentStaff?.username || currentStaff?.email || 'admin',
          'SUCCESS'
        );
        showToast(`Pass card image delivered to ${participant.name}'s WhatsApp!`, 'success');
        return;
      } else {
        console.error('WhatsApp Bot Dispatch Error:', data.error);
        if (data.error && data.error.includes('not connected')) {
          showToast('WhatsApp Bot is not linked to your phone! Please scan QR code first.', 'error');
          const wantLink = window.confirm(
            '⚠️ WhatsApp Bot on Render is NOT linked to your phone!\n\n' +
            'Because the bot is disconnected, it cannot send the pass automatically.\n\n' +
            'Would you like to open the QR scan page (https://trialrun2.onrender.com/qr) right now to link your phone?\n\n' +
            '(Once scanned, all passes are sent 100% automatically in the background).'
          );
          if (wantLink) {
            window.open('https://trialrun2.onrender.com/qr', '_blank');
          }
          return;
        } else {
          showToast(`WhatsApp Bot error: ${data.error || 'Failed to dispatch pass'}`, 'error');
          return;
        }
      }
    } catch (botErr) {
      console.error('Bot dispatch network error:', botErr);
      showToast('Could not reach WhatsApp bot server (trialrun2.onrender.com).', 'error');
      return;
    }
  }, [registrations, currentStaff, showToast, whatsAppTemplate]);

  const handleOpenQuickRegister = (participant) => {
    setActiveItem(participant);
    const registeredEventIds = new Set(
      registrations
        .filter(r => r.participant_id === participant.id)
        .map(r => r.event_id || r.events?.id)
        .filter(Boolean)
    );
    const availableEvent = events.find(ev => !registeredEventIds.has(ev.id));
    setQuickRegData({
      participant_id: participant.id,
      event_id: availableEvent ? availableEvent.id : (events[0]?.id || ''),
      payment_status: 'verified',
      payment_method: 'cash'
    });
    setModalType('quickRegister');
  };

  const handleSaveQuickRegistration = async (e) => {
    e.preventDefault();
    const isAlready = registrations.some(
      r => r.participant_id === quickRegData.participant_id && (r.event_id === quickRegData.event_id || r.events?.id === quickRegData.event_id)
    );
    if (isAlready) {
      showToast('This participant is already registered for this event.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      if (!quickRegData.participant_id || !quickRegData.event_id) {
        throw new Error('Please select both participant and event.');
      }
      const staffId = currentStaff?.id || (volunteers.length > 0 ? volunteers[0].id : null);
      const { error } = await supabase
        .from('registrations')
        .insert([{
          participant_id: quickRegData.participant_id,
          event_id: quickRegData.event_id,
          status: 'registered',
          registration_source: 'admin',
          registered_by: staffId,
          payment_status: quickRegData.payment_status || 'verified',
          payment_method: quickRegData.payment_method || 'cash',
          payment_amount: 0.00
        }]);

      if (error) {
        if (error.code === '23505') {
          throw new Error('This participant is already registered for this event.');
        }
        throw error;
      }

      showToast('Participant registered for event successfully!', 'success');
      setModalType(null);
      fetchAllData(adminRole, currentStaff?.id);
    } catch (err) {
      showToast(err.message || 'Failed to register participant', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRegistration = async (regId, attendeeName, eventName) => {
    if (!window.confirm(`Are you sure you want to cancel and delete the registration of "${attendeeName || 'Participant'}" for "${eventName || 'Event'}"?`)) {
      return;
    }
    try {
      const { error } = await supabase
        .from('registrations')
        .delete()
        .eq('id', regId);

      if (error) throw error;
      showToast('Registration cancelled and deleted!', 'success');
      fetchAllData(adminRole, currentStaff?.id);
    } catch (err) {
      showToast(err.message || 'Failed to delete registration', 'error');
    }
  };

  // -----------------------------------------------------------------------------
  // ACTION: VOLUNTEER & STAFF MANAGEMENT (Admin only)
  // -----------------------------------------------------------------------------
  const handleOpenEditVolunteer = (v) => {
    setActiveItem(v);
    setVolunteerFormData({
      username: v.username || '',
      name: v.name || '',
      email: v.email || '',
      role: v.role || 'volunteer',
      status: v.status || 'active'
    });
    setModalType('editVolunteer');
  };

  const handleSaveVolunteer = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        name: volunteerFormData.name.trim(),
        username: volunteerFormData.username.trim().toLowerCase(),
        email: volunteerFormData.email.trim().toLowerCase(),
        role: volunteerFormData.role,
        status: volunteerFormData.status
      };

      if (modalType === 'editVolunteer' && activeItem) {
        const { error } = await supabase
          .from('volunteers')
          .update(payload)
          .eq('id', activeItem.id);

        if (error) throw error;
        showToast(`Staff member "${payload.name}" updated!`, 'success');
      } else {
        const { error } = await supabase
          .from('volunteers')
          .insert([payload]);

        if (error) throw error;
        showToast(`Staff member "${payload.name}" added!`, 'success');
      }

      setModalType(null);
      setActiveItem(null);
      fetchAllData(adminRole, currentStaff?.id);
    } catch (err) {
      showToast(err.message || 'Failed to save staff member', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVolunteer = async (volunteerId, volunteerName) => {
    if (!window.confirm(`Are you sure you want to delete staff/volunteer profile "${volunteerName}"?`)) {
      return;
    }
    try {
      const { error } = await supabase
        .from('volunteers')
        .delete()
        .eq('id', volunteerId);

      if (error) throw error;
      showToast(`Staff profile "${volunteerName}" deleted!`, 'success');
      fetchAllData(adminRole, currentStaff?.id);
    } catch (err) {
      showToast(err.message || 'Failed to delete staff member', 'error');
    }
  };

  // -----------------------------------------------------------------------------
  // ACTION: EVENT MANAGEMENT (Admin only)
  // -----------------------------------------------------------------------------
  const handleSaveEvent = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const eventCode = (eventFormData.event_code || '').trim().toUpperCase();
      if (!eventCode) {
        throw new Error('Event code is required (e.g. SRI27-AI)');
      }
      if (!eventFormData.name?.trim()) {
        throw new Error('Event name is required');
      }

      const payload = {
        event_code: eventCode,
        name: eventFormData.name.trim(),
        category: eventFormData.category?.trim() || 'TECHNICAL',
        venue: eventFormData.venue?.trim() || 'Campus Venue',
        date: eventFormData.date || new Date().toISOString().split('T')[0],
        start_time: eventFormData.start_time ? `${eventFormData.start_time}:00`.substring(0, 8) : '10:00:00',
        end_time: eventFormData.end_time ? `${eventFormData.end_time}:00`.substring(0, 8) : '12:00:00',
        capacity: eventFormData.capacity ? Number(eventFormData.capacity) : null,
        status: eventFormData.status || 'upcoming',
        registration_fee: eventFormData.registration_fee !== undefined ? Number(eventFormData.registration_fee) : 0.00,
        registration_type: eventFormData.registration_type || 'individual',
        max_team_size: eventFormData.registration_type === 'team' ? (Number(eventFormData.max_team_size) || 4) : 1,
        is_spot_registration_enabled: eventFormData.is_spot_registration_enabled !== undefined ? Boolean(eventFormData.is_spot_registration_enabled) : true,
      };

      if (modalType === 'addEvent' || !activeItem) {
        const { error } = await supabase
          .from('events')
          .insert([payload]);

        if (error) throw error;
        showToast(`Event "${payload.name}" created successfully!`, 'success');
      } else {
        const { error } = await supabase
          .from('events')
          .update(payload)
          .eq('id', activeItem.id);

        if (error) throw error;
        showToast(`Event "${payload.name}" updated successfully!`, 'success');
      }

      setModalType(null);
      fetchAllData(adminRole, currentStaff?.id);
    } catch (err) {
      showToast(err.message || 'Failed to save event', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId, eventName) => {
    if (!window.confirm(`Are you sure you want to delete event "${eventName}"?`)) return;
    try {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;
      showToast(`Event "${eventName}" deleted successfully!`, 'success');
      fetchAllData(adminRole, currentStaff?.id);
    } catch (err) {
      showToast(err.message || 'Failed to delete event', 'error');
    }
  };

  // -----------------------------------------------------------------------------
  // ACTION: EXPORT CSV FOR ANY TABLE
  // -----------------------------------------------------------------------------
  const handleExportCsv = (tableName, data) => {
    if (!data || data.length === 0) {
      showToast('No records available to export', 'error');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    data.forEach(row => {
      const values = headers.map(header => {
        let val = row[header];
        if (typeof val === 'object' && val !== null) {
          val = JSON.stringify(val);
        }
        val = String(val ?? '').replace(/"/g, '""');
        return `"${val}"`;
      });
      csvRows.push(values.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `srishti_2.7_${tableName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${data.length} records to CSV!`, 'success');
  };

  // -----------------------------------------------------------------------------
  // ACTION: DANGER ZONE & BULK DELETIONS (Admin only)
  // -----------------------------------------------------------------------------
  const handleToggleSelectParticipant = (id) => {
    setSelectedParticipantIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllParticipants = () => {
    if (selectedParticipantIds.length === filteredParticipants.length && filteredParticipants.length > 0) {
      setSelectedParticipantIds([]);
    } else {
      setSelectedParticipantIds(filteredParticipants.map(p => p.id));
    }
  };

  const handleDeleteSelectedParticipants = async () => {
    if (selectedParticipantIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete the ${selectedParticipantIds.length} selected participant(s)?\n\nWARNING: This will cascade-delete all their event registrations and arrival check-ins.`)) {
      return;
    }
    try {
      const { error } = await supabase
        .from('participants')
        .delete()
        .in('id', selectedParticipantIds);

      if (error) throw error;
      showToast(`Deleted ${selectedParticipantIds.length} participant(s)!`, 'success');
      setSelectedParticipantIds([]);
      fetchAllData(adminRole, currentStaff?.id);
    } catch (err) {
      showToast(err.message || 'Failed to delete selected participants', 'error');
    }
  };

  const handleClearSingleTable = async (tableName) => {
    if (!window.confirm(`DANGER: Are you sure you want to wipe ALL records in "${tableName}" to zero?`)) {
      return;
    }
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;
      showToast(`Table "${tableName}" cleared to zero records!`, 'success');
      fetchAllData(adminRole, currentStaff?.id);
    } catch (err) {
      showToast(err.message || `Failed to clear table ${tableName}`, 'error');
    }
  };

  const handleDeleteDatabaseRow = async (tableName, rowId) => {
    if (!window.confirm(`Delete record from ${tableName}?`)) return;
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', rowId);

      if (error) throw error;
      showToast(`Record deleted from ${tableName}!`, 'success');
      fetchAllData(adminRole, currentStaff?.id);
    } catch (err) {
      showToast(err.message || 'Failed to delete record', 'error');
    }
  };

  const handleResetFestivalDataToZero = async (e) => {
    e.preventDefault();
    if (resetConfirmWord.trim().toUpperCase() !== 'RESET') {
      showToast('Please type RESET to confirm factory reset', 'error');
      return;
    }

    setIsResetting(true);
    try {
      // 1. Delete Attendance if selected
      if (resetOptions.attendance) {
        await supabase
          .from('event_attendance')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
      }

      // 2. Delete Arrival Check-ins if selected
      if (resetOptions.arrivals) {
        await supabase
          .from('arrival_checkins')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
      }

      // 3. Delete Registrations if selected
      if (resetOptions.registrations) {
        await supabase
          .from('registrations')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
      }

      // 4. Delete Participants if selected (cascades any leftover registrations/check-ins)
      if (resetOptions.participants) {
        await supabase
          .from('participants')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
      }

      // 5. Delete Events if explicitly selected
      if (resetOptions.events) {
        await supabase
          .from('events')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
      }

      // Reset local states immediately
      if (resetOptions.attendance) setEventAttendance([]);
      if (resetOptions.arrivals) setArrivalCheckins([]);
      if (resetOptions.registrations) setRegistrations([]);
      if (resetOptions.participants) setParticipants([]);
      if (resetOptions.events) setEvents([]);
      setSelectedParticipantIds([]);

      showToast('All festival data reset to zero successfully!', 'success');
      setModalType(null);
      setResetConfirmWord('');
      fetchAllData(adminRole, currentStaff?.id);
    } catch (err) {
      showToast(err.message || 'Failed to reset festival data', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  // Filtered participants
  const filteredParticipants = useMemo(() => {
    return participants.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        p.name?.toLowerCase().includes(q) ||
        p.participant_code?.toLowerCase().includes(q) ||
        p.college?.toLowerCase().includes(q) ||
        p.department?.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const isArrived = arrivalCheckins.some(a => a.participant_id === p.id);
      if (participantGateFilter === 'checked_in') return isArrived;
      if (participantGateFilter === 'pending') return !isArrived;
      return true;
    });
  }, [participants, searchQuery, participantGateFilter, arrivalCheckins]);

  // Filtered registrations
  const filteredRegistrations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return registrations.filter(r => {
      const matchesEvent = eventFilter === 'all' || r.event_id === eventFilter || r.events?.event_code === eventFilter;
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const pName = r.participants?.name || r.name || '';
      const pCode = r.participants?.participant_code || r.participant_code || '';
      const evName = r.events?.name || r.event_name || '';

      const matchesSearch = !q ||
        pName.toLowerCase().includes(q) ||
        pCode.toLowerCase().includes(q) ||
        evName.toLowerCase().includes(q);

      return matchesEvent && matchesStatus && matchesSearch;
    });
  }, [registrations, eventFilter, statusFilter, searchQuery]);

  // Database Explorer current table rows
  const currentTableData = useMemo(() => {
    switch (selectedDbTable) {
      case 'participants': return participants;
      case 'events': return events;
      case 'registrations': return registrations;
      case 'volunteers': return volunteers;
      case 'event_staff': return eventStaff;
      case 'arrival_checkins': return arrivalCheckins;
      case 'event_attendance': return eventAttendance;
      default: return [];
    }
  }, [selectedDbTable, participants, events, registrations, volunteers, eventStaff, arrivalCheckins, eventAttendance]);

  const filteredDbRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return currentTableData;
    return currentTableData.filter(row => 
      Object.values(row).some(v => String(v).toLowerCase().includes(q))
    );
  }, [currentTableData, searchQuery]);

  // -----------------------------------------------------------------------------
  // RENDER: LOGIN PORTAL
  // -----------------------------------------------------------------------------
  if (step === 'login') {
    return (
      <div className="admin-auth-wrapper">
        {/* Ambient WebGL SideRays Background */}
        <div className="admin-ambient-rays">
          <SafeVisual>
            <SideRays
              speed={2.5}
              rayColor1="#EAB308"
              rayColor2="#96c8ff"
              intensity={2}
              spread={2}
              origin="top-right"
              tilt={0}
              saturation={1.5}
              blend={0.75}
              falloff={1.6}
              opacity={1.0}
            />
          </SafeVisual>
        </div>

        <div className="admin-auth-card" style={{ maxWidth: '500px' }}>
          <div className="admin-auth-header">
            <span className="admin-auth-badge">SRISHTI 2.7 • ADMIN ACCESS</span>
            <h1>
              <FiShield style={{ color: '#ffffff' }} />
              Staff Command Center
            </h1>
            <p className="admin-auth-subtitle">
              Administrator sign-in
            </p>
          </div>

          {authError && (
            <div style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              color: '#ffffff',
              fontSize: '0.85rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FiAlertCircle />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit}>
            <div className="admin-form-group">
              <label>Administrator Email</label>
              <div style={{ position: 'relative' }}>
                <FiMail style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
                <input
              type="email"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  required
                  placeholder="admin@example.com"
                  className="admin-form-control"
                  style={{ paddingLeft: '2.5rem' }}
                  autoFocus
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="admin-form-control"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="admin-btn admin-btn-primary"
              style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }}
            >
              {authLoading ? 'Verifying...' : 'Sign in'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'none',
                border: 'none',
                color: '#71717a',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <FiArrowLeft /> Return to Main Festival Page
            </button>
          </div>
        </div>

        {/* Global Toast */}
        {toast && (
          <div className={`admin-toast admin-toast-${toast.type}`}>
            {toast.type === 'success' ? <FiCheck /> : <FiAlertCircle />}
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    );
  }

  // -----------------------------------------------------------------------------
  // RENDER: MAIN COMMAND CENTER DASHBOARD
  // -----------------------------------------------------------------------------
  return (
    <div className="admin-portal-root">
      {/* React Bits Volumetric SideRays Background Layer */}
      <div className="admin-ambient-rays">
        <SafeVisual>
          <SideRays
            speed={2.5}
            rayColor1="#EAB308"
            rayColor2="#96c8ff"
            intensity={2}
            spread={2}
            origin="top-right"
            tilt={0}
            saturation={1.5}
            blend={0.75}
            falloff={1.6}
            opacity={1.0}
          />
        </SafeVisual>
      </div>

      <div className="admin-content-layer">
        {/* 1. TOP NAVBAR */}
        <header className="admin-navbar">
          <div className="admin-nav-container">
            <div className="admin-brand" onClick={() => navigate('/')}>
              <div className="admin-brand-icon">
                <FiLayers />
              </div>
              <div>
                <h1 className="admin-brand-title">
                  SRISHTI <span className="admin-brand-edition">2.7</span> COMMAND CENTER
                </h1>
              </div>
            </div>

            <div className="admin-nav-actions">
              <div className="admin-user-pill">
                <span className={`admin-role-tag admin-role-${adminRole}`}>
                  {adminRole?.toUpperCase()}
                </span>
                <span style={{ color: '#e4e4e7', fontFamily: 'var(--font-mono)' }}>
                  {currentStaff?.name || currentStaff?.username || currentStaff?.email}
                </span>
                {assignedEvents.length > 0 && (
                  <span style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                    {assignedEvents.map(e => e.event_code).join(', ')}
                  </span>
                )}
              </div>

              {adminRole === 'admin' && (
                <button
                  type="button"
                  onClick={() => handleTogglePortalStatus(regPortalStatus === 'closed' ? 'open' : 'closed')}
                  className="admin-btn"
                  style={{
                    background: regPortalStatus === 'closed' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                    border: regPortalStatus === 'closed' ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(34, 197, 94, 0.5)',
                    color: regPortalStatus === 'closed' ? '#f87171' : '#4ade80',
                    fontSize: '0.78rem',
                    fontWeight: '700'
                  }}
                  title="Click to toggle Public Event Registrations"
                >
                  {regPortalStatus === 'closed' ? <FiLock /> : <FiCheckCircle />}
                  <span>PORTAL: {regPortalStatus.toUpperCase()}</span>
                </button>
              )}

              <button 
                onClick={() => fetchAllData(adminRole, currentStaff?.id)}
                className="admin-btn admin-btn-secondary"
                title="Refresh Data from Supabase"
              >
                <FiRefreshCw className={isDataLoading ? 'spin' : ''} />
                <span>Sync</span>
              </button>

              <button 
                onClick={() => navigate('/')} 
                className="admin-btn admin-btn-secondary"
              >
                <FiArrowLeft />
                <span>Live Site</span>
              </button>

              {adminRole === 'admin' && (
                <button 
                  type="button"
                  onClick={() => setModalType('resetAllData')} 
                  className="admin-btn admin-btn-danger"
                  style={{ border: '1px solid rgba(255, 255, 255, 0.4)', background: 'rgba(255, 255, 255, 0.08)' }}
                  title="Reset Festival Data & Counters to Zero"
                >
                  <FiTrash2 />
                  <span>Reset to Zero</span>
                </button>
              )}

              <button 
                onClick={handleLogout} 
                className="admin-btn admin-btn-danger"
              >
                <FiLogOut />
                <span>Exit</span>
              </button>
            </div>
          </div>
        </header>

        {/* 2. ROLE-ADAPTIVE NAVIGATION TABS BAR (ZERO SCROLLBAR CLIPPING) */}
        <div className="admin-tabs-bar-wrapper">
          <nav className="admin-tabs-bar">
            {/* Overview (All roles) */}
            <button
              onClick={() => { setActiveTab('overview'); setSearchQuery(''); }}
              className={`admin-tab-item ${activeTab === 'overview' ? 'active' : ''}`}
            >
              <FiActivity />
              <span>Overview</span>
            </button>

            {/* Arrival Check-in Gate (Registration Desk & Admin) */}
            {(adminRole === 'admin' || adminRole === 'registration') && (
              <button
                onClick={() => { setActiveTab('checkin'); setSearchQuery(''); }}
                className={`admin-tab-item ${activeTab === 'checkin' ? 'active' : ''}`}
              >
                <FiUserCheck />
                <span>Gate Check-In</span>
                <span className="admin-tab-counter">{arrivalCheckins.length}</span>
              </button>
            )}

            {/* Event Room Attendance (Event Staff & Admin) */}
            {(adminRole === 'admin' || adminRole === 'event_staff') && (
              <button
                onClick={() => { setActiveTab('attendance'); setSearchQuery(''); }}
                className={`admin-tab-item ${activeTab === 'attendance' ? 'active' : ''}`}
              >
                <FiAward />
                <span>Event Attendance</span>
                <span className="admin-tab-counter">{eventAttendance.length}</span>
              </button>
            )}

            {/* Events Catalog (All Staff) */}
            <button
              onClick={() => { setActiveTab('events'); setSearchQuery(''); }}
              className={`admin-tab-item ${activeTab === 'events' ? 'active' : ''}`}
            >
              <FiCalendar />
              <span>Events</span>
              <span className="admin-tab-counter">{events.length}</span>
            </button>

            {/* Participants (Admin, Registration, Event Staff) */}
            {(adminRole === 'admin' || adminRole === 'registration' || adminRole === 'event_staff') && (
              <button
                onClick={() => { setActiveTab('participants'); setSearchQuery(''); }}
                className={`admin-tab-item ${activeTab === 'participants' ? 'active' : ''}`}
              >
                <FiUsers />
                <span>Participants</span>
                <span className="admin-tab-counter">{participants.length}</span>
              </button>
            )}

            {/* Registrations (Admin & Registration Desk) */}
            {(adminRole === 'admin' || adminRole === 'registration') && (
              <button
                onClick={() => { setActiveTab('registrations'); setSearchQuery(''); }}
                className={`admin-tab-item ${activeTab === 'registrations' ? 'active' : ''}`}
              >
                <FiCheckCircle />
                <span>Registrations</span>
                <span className="admin-tab-counter">{registrations.length}</span>
              </button>
            )}

            {/* Staff & Event Assignments (Admin only) */}
            {adminRole === 'admin' && (
              <button
                onClick={() => { setActiveTab('staff'); setSearchQuery(''); }}
                className={`admin-tab-item ${activeTab === 'staff' ? 'active' : ''}`}
              >
                <FiShield />
                <span>Staff Assignments</span>
                <span className="admin-tab-counter">{volunteers.length}</span>
              </button>
            )}

            {/* Database Explorer (Admin only) */}
            {adminRole === 'admin' && (
              <button
                onClick={() => { setActiveTab('databases'); setSearchQuery(''); }}
                className={`admin-tab-item ${activeTab === 'databases' ? 'active' : ''}`}
              >
                <FiDatabase />
                <span>Database (7 Tables)</span>
              </button>
            )}

            {/* Audit & Location Logs (Admin only) */}
            {adminRole === 'admin' && (
              <button
                onClick={() => { setActiveTab('logs'); setSearchQuery(''); }}
                className={`admin-tab-item ${activeTab === 'logs' ? 'active' : ''}`}
              >
                <FiMapPin />
                <span>Audit & Location Logs</span>
                <span className="admin-tab-counter">{auditLogs.length}</span>
              </button>
            )}
          </nav>
        </div>

        {/* 3. MAIN TAB CONTENT */}
        <main className="admin-main-view">
          {/* ========================================================================= */}
          {/* TAB 1: OVERVIEW */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div>
              {/* REGISTRATION PORTAL STATUS CONTROL */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(18, 18, 24, 0.95), rgba(10, 10, 14, 0.98))',
                border: regPortalStatus === 'closed' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(34, 197, 94, 0.4)',
                borderRadius: '16px',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1.5rem',
                flexWrap: 'wrap',
                boxShadow: regPortalStatus === 'closed' ? '0 8px 30px rgba(239, 68, 68, 0.15)' : '0 8px 30px rgba(34, 197, 94, 0.12)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: regPortalStatus === 'closed' ? 'rgba(239, 68, 68, 0.18)' : 'rgba(34, 197, 94, 0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: regPortalStatus === 'closed' ? '#f87171' : '#4ade80',
                    fontSize: '1.3rem'
                  }}>
                    {regPortalStatus === 'closed' ? <FiLock /> : <FiCheckCircle />}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <h4 style={{ margin: 0, color: '#ffffff', fontSize: '1.05rem', fontWeight: '800', letterSpacing: '0.02em' }}>
                        Public Registration Portal
                      </h4>
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '20px',
                        fontSize: '0.7rem',
                        fontWeight: '800',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        background: regPortalStatus === 'closed' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                        color: regPortalStatus === 'closed' ? '#f87171' : '#4ade80',
                        border: regPortalStatus === 'closed' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(34, 197, 94, 0.4)'
                      }}>
                        {regPortalStatus === 'closed' ? 'LOCKED / CLOSED' : 'ACTIVE / OPEN'}
                      </span>
                    </div>
                    <p style={{ margin: '0.35rem 0 0 0', color: '#a1a1aa', fontSize: '0.84rem', lineHeight: '1.4' }}>
                      {regPortalStatus === 'closed' 
                        ? 'Registrations are locked. Visitors see the closed banner on /register and cannot submit new entries.'
                        : 'Registration portal is live. Attendees can freely choose solo & team tracks and register.'}
                    </p>
                  </div>
                </div>

                {adminRole === 'admin' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => handleTogglePortalStatus(regPortalStatus === 'closed' ? 'open' : 'closed')}
                      style={{
                        padding: '0.75rem 1.4rem',
                        borderRadius: '12px',
                        fontWeight: '700',
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.55rem',
                        transition: 'all 0.2s ease',
                        background: regPortalStatus === 'closed' ? '#22c55e' : '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                        boxShadow: regPortalStatus === 'closed' ? '0 4px 14px rgba(34, 197, 94, 0.35)' : '0 4px 14px rgba(239, 68, 68, 0.35)'
                      }}
                    >
                      {regPortalStatus === 'closed' ? (
                        <>
                          <FiCheckCircle size={16} /> Re-Open Registrations
                        </>
                      ) : (
                        <>
                          <FiLock size={16} /> Close Registrations
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* WHATSAPP PASS DISPATCH & CUSTOM MESSAGE TEMPLATE SETTINGS */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(10, 25, 18, 0.95), rgba(10, 14, 12, 0.98))',
                border: '1px solid rgba(34, 197, 94, 0.35)',
                borderRadius: '16px',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.75rem',
                boxShadow: '0 8px 30px rgba(34, 197, 94, 0.08)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  marginBottom: isCustomizingWhatsApp ? '1.25rem' : '0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: 'rgba(37, 211, 102, 0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#25D366',
                      fontSize: '1.4rem'
                    }}>
                      <FiPhone />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <h4 style={{ margin: 0, color: '#ffffff', fontSize: '1.05rem', fontWeight: '800' }}>
                          WhatsApp Pass Automation &amp; Message Template
                        </h4>
                        {botStatus.loading ? (
                          <span style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '20px',
                            fontSize: '0.7rem',
                            fontWeight: '800',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: '#e4e4e7'
                          }}>
                            Checking Bot...
                          </span>
                        ) : botStatus.connected ? (
                          <span style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '20px',
                            fontSize: '0.7rem',
                            fontWeight: '800',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            background: 'rgba(34, 197, 94, 0.2)',
                            color: '#4ade80',
                            border: '1px solid rgba(34, 197, 94, 0.4)'
                          }}>
                            🟢 BOT CONNECTED (+{botStatus.phone || 'ONLINE'})
                          </span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{
                              padding: '0.2rem 0.6rem',
                              borderRadius: '20px',
                              fontSize: '0.7rem',
                              fontWeight: '800',
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              background: 'rgba(239, 68, 68, 0.2)',
                              color: '#f87171',
                              border: '1px solid rgba(239, 68, 68, 0.4)'
                            }}>
                              🔴 BOT DISCONNECTED
                            </span>
                            <a
                              href="https://trialrun2.onrender.com/qr"
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: '0.2rem 0.6rem',
                                borderRadius: '8px',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                background: 'rgba(56, 189, 248, 0.2)',
                                color: '#38bdf8',
                                border: '1px solid rgba(56, 189, 248, 0.4)',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                            >
                              Scan QR to Link ➔
                            </a>
                          </div>
                        )}
                      </div>
                      <p style={{ margin: '0.35rem 0 0 0', color: '#a1a1aa', fontSize: '0.84rem', lineHeight: '1.4' }}>
                        Dispatches official <strong>Pass Card Image attachment</strong> + customized notice automatically on registration and admin click.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setIsCustomizingWhatsApp(!isCustomizingWhatsApp)}
                      className="admin-btn admin-btn-secondary"
                      style={{
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                        color: '#4ade80',
                        fontSize: '0.82rem'
                      }}
                    >
                      <FiEdit2 /> {isCustomizingWhatsApp ? 'Close Template Editor' : 'Customize Message Template'}
                    </button>
                  </div>
                </div>

                {/* EXPANDABLE MESSAGE TEMPLATE EDITOR */}
                {isCustomizingWhatsApp && (
                  <div style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingTop: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <label style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: '700' }}>
                          WhatsApp Pass Caption Template:
                        </label>
                        <span style={{ color: '#71717a', fontSize: '0.75rem' }}>
                          Click tags below to insert dynamic participant details:
                        </span>
                      </div>

                      {/* Tabs: Registration Welcome vs Profile Re-send */}
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => setActiveWaTemplateTab('reg')}
                          style={{
                            padding: '0.45rem 0.95rem',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            background: activeWaTemplateTab === 'reg' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                            color: activeWaTemplateTab === 'reg' ? '#38bdf8' : '#a1a1aa',
                            border: activeWaTemplateTab === 'reg' ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid rgba(255, 255, 255, 0.1)',
                            transition: 'all 0.2s'
                          }}
                        >
                          Registration Welcome Message
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveWaTemplateTab('resend')}
                          style={{
                            padding: '0.45rem 0.95rem',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            background: activeWaTemplateTab === 'resend' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                            color: activeWaTemplateTab === 'resend' ? '#4ade80' : '#a1a1aa',
                            border: activeWaTemplateTab === 'resend' ? '1px solid rgba(34, 197, 94, 0.45)' : '1px solid rgba(255, 255, 255, 0.1)',
                            transition: 'all 0.2s'
                          }}
                        >
                          Profile "Send Again" Message
                        </button>
                      </div>

                      {/* Dynamic Tags Insertion Pills */}
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                        {[
                          { tag: '{name}', label: 'Participant Name' },
                          { tag: '{participantCode}', label: 'Delegate Code' },
                          { tag: '{eventName}', label: 'Event Name' },
                          { tag: '{college}', label: 'College' },
                          { tag: '{passUrl}', label: 'Pass Link' }
                        ].map(item => (
                          <button
                            key={item.tag}
                            type="button"
                            onClick={() => handleInsertWhatsAppTag(item.tag)}
                            style={{
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#38bdf8',
                              borderRadius: '6px',
                              padding: '0.2rem 0.55rem',
                              fontSize: '0.75rem',
                              fontFamily: 'var(--font-mono)',
                              cursor: 'pointer'
                            }}
                            title={`Insert ${item.label}`}
                          >
                            + {item.tag}
                          </button>
                        ))}
                      </div>

                      <textarea
                        value={activeWaTemplateTab === 'reg' ? whatsAppTemplate : whatsAppResendTemplate}
                        onChange={(e) => {
                          if (activeWaTemplateTab === 'reg') {
                            setWhatsAppTemplate(e.target.value);
                          } else {
                            setWhatsAppResendTemplate(e.target.value);
                          }
                        }}
                        rows={12}
                        style={{
                          width: '100%',
                          background: '#09090b',
                          color: '#e4e4e7',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '12px',
                          padding: '1rem',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.82rem',
                          lineHeight: '1.5',
                          boxSizing: 'border-box',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={handleResetWhatsAppTemplate}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#71717a',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Reset to Default {activeWaTemplateTab === 'reg' ? 'Registration' : 'Profile "Send Again"'} Template
                      </button>

                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                          type="button"
                          onClick={handleSaveWhatsAppTemplate}
                          style={{
                            padding: '0.65rem 1.4rem',
                            borderRadius: '10px',
                            fontWeight: '700',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            background: '#22c55e',
                            color: '#ffffff',
                            border: 'none',
                            boxShadow: '0 4px 14px rgba(34, 197, 94, 0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.45rem'
                          }}
                        >
                          <FiCheckCircle size={15} /> Save Template
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Stat Cards - 6 Clean Monochromatic Cards */}
              <div className="admin-stats-grid">
                <div className="admin-stat-card">
                  <div className="admin-stat-header">
                    <span className="admin-stat-title">Registrations</span>
                    <div className="admin-stat-icon">
                      <FiCheckCircle />
                    </div>
                  </div>
                  <div className="admin-stat-value">{stats.totalRegs}</div>
                  <div className="admin-stat-sub">Confirmed festival entries</div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-header">
                    <span className="admin-stat-title">Total Participants</span>
                    <div className="admin-stat-icon">
                      <FiUsers />
                    </div>
                  </div>
                  <div className="admin-stat-value">{stats.totalUsers}</div>
                  <div className="admin-stat-sub">Unique delegates enrolled</div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-header">
                    <span className="admin-stat-title">Gate Arrivals</span>
                    <div className="admin-stat-icon">
                      <FiUserCheck />
                    </div>
                  </div>
                  <div className="admin-stat-value">{stats.totalArrivals}</div>
                  <div className="admin-stat-sub">Passed campus entry turnstiles</div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-header">
                    <span className="admin-stat-title">Room Attendance</span>
                    <div className="admin-stat-icon">
                      <FiAward />
                    </div>
                  </div>
                  <div className="admin-stat-value">{stats.totalAttendance}</div>
                  <div className="admin-stat-sub">Marked in competition halls</div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-header">
                    <span className="admin-stat-title">Active Competitions</span>
                    <div className="admin-stat-icon">
                      <FiCalendar />
                    </div>
                  </div>
                  <div className="admin-stat-value">{stats.totalEventsCount}</div>
                  <div className="admin-stat-sub">{events.filter(e => e.registration_type === 'team').length} Team • {events.filter(e => e.registration_type === 'individual').length} Solo</div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-header">
                    <span className="admin-stat-title">Staff Coordinators</span>
                    <div className="admin-stat-icon">
                      <FiShield />
                    </div>
                  </div>
                  <div className="admin-stat-value">{stats.totalStaffCount}</div>
                  <div className="admin-stat-sub">Volunteers &amp; event leads</div>
                </div>
              </div>

              {/* INTEGRATED INTERACTIVE RECHARTS ANALYTICS WITH DOWNLOADABLE DETAILS */}
              <AdminAnalytics
                events={events}
                participants={participants}
                registrations={registrations}
                arrivalCheckins={arrivalCheckins}
                eventAttendance={eventAttendance}
              />

              {/* Fast Action Operational Launch Banner */}
              <div style={{
                background: '#09090b',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <div>
                  <h3 style={{ margin: '0 0 0.35rem 0', color: '#ffffff', fontSize: '1.05rem', fontWeight: '700' }}>
                    SRISHTI 2.7 Multi-Event Operational Control
                  </h3>
                  <p style={{ margin: 0, color: '#a1a1aa', fontSize: '0.82rem' }}>
                    Operating as <strong style={{ color: '#ffffff' }}>{adminRole?.toUpperCase()}</strong>. Instant station launch for gate check-in and attendance scanners.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {(adminRole === 'admin' || adminRole === 'registration') && (
                    <button 
                      onClick={() => setActiveTab('checkin')} 
                      className="admin-btn admin-btn-secondary"
                    >
                      <FiUserCheck /> Open Gate Check-In Station
                    </button>
                  )}

                  {(adminRole === 'admin' || adminRole === 'event_staff') && (
                    <button 
                      onClick={() => setActiveTab('attendance')} 
                      className="admin-btn admin-btn-primary"
                    >
                      <FiAward /> Open Event Attendance Station
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* ========================================================================= */}
        {/* TAB 2: ARRIVAL CHECK-IN GATE STATION (Registration & Admin) */}
        {/* ========================================================================= */}
        {activeTab === 'checkin' && (
          <div>
            <div className="admin-station-card">
              <div className="admin-station-header">
                <h2 className="admin-station-title">
                  <FiUserCheck style={{ color: '#ffffff' }} />
                  Campus Gate Arrival Check-In Station
                </h2>
                <span style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>
                  Operator: <strong style={{ color: '#ffffff' }}>{currentStaff?.name}</strong>
                </span>
              </div>

              <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Enter participant pass code (e.g. <code>TEST-SRI27-002</code>, <code>SRI27-XXXXXX</code>) or scan QR pass:
              </p>

              {/* Sample Code Pills for quick testing */}
              <div className="admin-quick-pills" style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#71717a' }}>Quick Test Codes:</span>
                {['TEST-SRI27-001', 'TEST-SRI27-002', 'SRI27-ADMIN'].map(code => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setStationCodeInput(code);
                      handleLookupParticipantForStation(code);
                    }}
                    className="admin-quick-pill-btn"
                  >
                    {code}
                  </button>
                ))}
              </div>

              <div className="admin-code-search-box">
                <input
                  type="text"
                  placeholder="Enter Participant Code (e.g. TEST-SRI27-002)..."
                  value={stationCodeInput}
                  onChange={e => setStationCodeInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLookupParticipantForStation()}
                  className="admin-code-input"
                />
                <button
                  type="button"
                  onClick={() => handleLookupParticipantForStation()}
                  className="admin-btn admin-btn-primary"
                >
                  <FiSearch /> Verify Code
                </button>
              </div>

              {/* Verified Attendee Badge & Action */}
              {stationAttendee && (
                <div className="admin-attendee-preview-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.4rem' }}>{stationAttendee.name}</h3>
                        <span style={{ 
                          fontFamily: 'var(--font-mono)', 
                          background: 'rgba(255, 255, 255, 0.1)', 
                          color: '#ffffff', 
                          padding: '0.2rem 0.6rem', 
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          fontWeight: 'bold',
                          border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}>
                          {stationAttendee.participant_code}
                        </span>
                        {stationAttendee.isCryptoVerified && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: '#ffffff',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            letterSpacing: '0.05em'
                          }}>
                            <FiShield /> CRYPTO-VERIFIED
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '0 0 0.35rem 0', color: '#d4d4d8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <FiMapPin size={13} color="#a1a1aa" />
                          <span>{stationAttendee.college || 'St. Thomas College Thrissur'}</span>
                        </span>
                        <span style={{ color: '#71717a' }}>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <FiBookOpen size={13} color="#a1a1aa" />
                          <span>{stationAttendee.department || 'CS'} ({stationAttendee.year || '2026'})</span>
                        </span>
                      </p>
                      <p style={{ margin: 0, color: '#a1a1aa', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <FiPhone size={13} color="#a1a1aa" />
                          <span>{stationAttendee.phone || 'N/A'}</span>
                        </span>
                        <span style={{ color: '#71717a' }}>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <FiMail size={13} color="#a1a1aa" />
                          <span>{stationAttendee.email}</span>
                        </span>
                      </p>
                    </div>

                    {/* Arrival Status Indicator */}
                    <div>
                      {stationAttendee.arrivalCheckin ? (
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          color: '#ffffff',
                          padding: '0.6rem 1rem',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.9rem',
                          fontWeight: 'bold'
                        }}>
                          <FiCheckCircle style={{ fontSize: '1.2rem', color: '#ffffff' }} />
                          <div>
                            <div>ALREADY CHECKED IN AT GATE</div>
                            <div style={{ fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 'normal' }}>
                              Time: {new Date(stationAttendee.arrivalCheckin.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={stationActionLoading}
                          onClick={() => handleMarkGateArrival('manual')}
                          className="admin-btn admin-btn-primary"
                          style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', fontWeight: 'bold' }}
                        >
                          <FiCheckCircle /> Confirm Gate Arrival
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Registered Events List */}
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', color: '#a1a1aa', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                      Registered Festival Events ({stationAttendee.registrations?.length || 0}):
                    </h4>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {stationAttendee.registrations && stationAttendee.registrations.length > 0 ? (
                        stationAttendee.registrations.map(r => (
                          <span
                            key={r.id}
                            style={{
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#ffffff',
                              padding: '0.35rem 0.75rem',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem'
                            }}
                          >
                            <FiAward size={13} color="#ffffff" />
                            <span>{r.events?.name || r.event_name || r.event_id}</span>
                          </span>
                        ))
                      ) : (
                        <span style={{ color: '#71717a', fontSize: '0.85rem' }}>No individual event registrations recorded.</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Gate Arrival Check-ins Stream */}
            <div className="admin-section-header">
              <h3>Today's Arrival Check-Ins Log ({arrivalCheckins.length})</h3>
            </div>
            <div className="admin-table-container">
              <div className="admin-table-scroll">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Participant Code</th>
                      <th>Name</th>
                      <th>College</th>
                      <th>Source</th>
                      <th>Checked In By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {arrivalCheckins.length > 0 ? (
                      arrivalCheckins.map(a => (
                        <tr key={a.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                            {new Date(a.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
                            {a.participants?.participant_code || '—'}
                          </td>
                          <td style={{ color: '#ffffff', fontWeight: '600' }}>
                            {a.participants?.name || '—'}
                          </td>
                          <td>{a.participants?.college || '—'}</td>
                          <td>
                            <span style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: '#ffffff',
                              border: '1px solid rgba(255, 255, 255, 0.15)'
                            }}>
                              {a.source?.toUpperCase() || 'QR'}
                            </span>
                          </td>
                          <td style={{ color: '#d4d4d8' }}>
                            {a.volunteers?.name || a.volunteers?.username || 'Staff'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: '#71717a', padding: '2rem' }}>
                          No arrival check-ins recorded yet today.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: EVENT ROOM ATTENDANCE STATION (Event Staff & Admin) */}
        {/* ========================================================================= */}
        {activeTab === 'attendance' && (
          <div>
            <div className="admin-station-card">
              <div className="admin-station-header">
                <h2 className="admin-station-title">
                  <FiAward style={{ color: '#ffffff' }} />
                  Event Room Attendance Station
                </h2>
                
                {/* Event Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Selected Event:</label>
                  <select
                    value={selectedStaffEventId}
                    onChange={e => setSelectedStaffEventId(e.target.value)}
                    className="admin-select"
                    style={{ minWidth: '220px', background: '#121214', color: '#ffffff' }}
                  >
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>
                        {ev.event_code || ev.id}: {ev.name || ev.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Event Room Details Header */}
              {(() => {
                const curEv = events.find(e => e.id === selectedStaffEventId) || events[0];
                const curAttendance = eventAttendance.filter(a => a.event_id === curEv?.id);
                const curRegs = registrations.filter(r => r.event_id === curEv?.id);
                return (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '1rem',
                    borderRadius: '12px',
                    marginBottom: '1.5rem',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Competition Room</span>
                      <h3 style={{ margin: '0.2rem 0', color: '#ffffff', fontSize: '1.25rem' }}>{curEv?.name || curEv?.label}</h3>
                      <div style={{ margin: 0, color: '#a1a1aa', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <FiMapPin size={13} color="#a1a1aa" />
                          <span>Venue: {curEv?.venue || 'TBA'}</span>
                        </span>
                        <span style={{ color: '#71717a' }}>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <FiCalendar size={13} color="#a1a1aa" />
                          <span>{curEv?.date}</span>
                        </span>
                        <span style={{ color: '#71717a' }}>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <FiClock size={13} color="#a1a1aa" />
                          <span>{curEv?.start_time}</span>
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ textAlign: 'center', padding: '0.5rem 1rem', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
                        <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Present in Room</div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#ffffff' }}>{curAttendance.length}</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '0.5rem 1rem', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>Total Registered</div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#ffffff' }}>{curRegs.length}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Verify participant entry into the competition room:
              </p>

              {/* Sample Code Pills */}
              <div className="admin-quick-pills" style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#71717a' }}>Quick Test Codes:</span>
                {['TEST-SRI27-001', 'TEST-SRI27-002'].map(code => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setStationCodeInput(code);
                      handleLookupParticipantForStation(code);
                    }}
                    className="admin-quick-pill-btn"
                  >
                    {code}
                  </button>
                ))}
              </div>

              <div className="admin-code-search-box">
                <input
                  type="text"
                  placeholder="Scan or Enter Participant Code (e.g. TEST-SRI27-002)..."
                  value={stationCodeInput}
                  onChange={e => setStationCodeInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLookupParticipantForStation()}
                  className="admin-code-input"
                />
                <button
                  type="button"
                  onClick={() => handleLookupParticipantForStation()}
                  className="admin-btn admin-btn-primary"
                >
                  <FiSearch /> Verify Attendee
                </button>
              </div>

              {/* Verified Attendee Badge & Action */}
              {stationAttendee && (() => {
                const curEv = events.find(e => e.id === selectedStaffEventId) || events[0];
                const isReg = stationAttendee.registrations?.some(r => r.event_id === curEv?.id);
                const isGateChecked = !!stationAttendee.arrivalCheckin;
                const isMarked = eventAttendance.some(a => 
                  a.participant_id === stationAttendee.id && a.event_id === curEv?.id
                );

                return (
                  <div className="admin-attendee-preview-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                          <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.4rem' }}>{stationAttendee.name}</h3>
                          <span style={{ 
                            fontFamily: 'var(--font-mono)', 
                            background: 'rgba(255, 255, 255, 0.1)', 
                            color: '#ffffff', 
                            padding: '0.2rem 0.6rem', 
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                          }}>
                            {stationAttendee.participant_code}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 0.35rem 0', color: '#d4d4d8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <FiMapPin size={13} color="#a1a1aa" />
                            <span>{stationAttendee.college}</span>
                          </span>
                          <span style={{ color: '#71717a' }}>•</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <FiPhone size={13} color="#a1a1aa" />
                            <span>{stationAttendee.phone || 'N/A'}</span>
                          </span>
                        </p>

                        {/* Status checks */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: isGateChecked ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                            color: isGateChecked ? '#ffffff' : '#71717a',
                            border: '1px solid rgba(255, 255, 255, 0.15)'
                          }}>
                            {isGateChecked ? <FiCheckCircle size={13} /> : <FiAlertCircle size={13} />}
                            <span>{isGateChecked ? 'Gate Check-In Verified' : 'Gate Check-In Pending'}</span>
                          </span>

                          <span style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: isReg ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                            color: isReg ? '#ffffff' : '#a1a1aa',
                            border: '1px solid rgba(255, 255, 255, 0.15)'
                          }}>
                            {isReg ? <FiCheckCircle size={13} /> : <FiAlertCircle size={13} />}
                            <span>{isReg ? `Registered for ${curEv?.name}` : `Not Registered for ${curEv?.name}`}</span>
                          </span>
                        </div>
                      </div>

                      {/* Action */}
                      <div>
                        {isMarked ? (
                          <div style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            color: '#ffffff',
                            padding: '0.6rem 1rem',
                            borderRadius: '10px',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                          }}>
                            <FiCheckCircle size={14} />
                            <span>ALREADY MARKED PRESENT IN ROOM</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={stationActionLoading}
                            onClick={() => handleMarkEventAttendance(stationAttendee.id, curEv?.id, 'manual')}
                            className="admin-btn admin-btn-primary"
                            style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', fontWeight: 'bold' }}
                          >
                            <FiCheck /> Mark Present in Room
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Event Attendance Roster */}
            {(() => {
              const curEv = events.find(e => e.id === selectedStaffEventId) || events[0];
              const curRegs = registrations.filter(r => r.event_id === curEv?.id);
              return (
                <div>
                  <div className="admin-section-header">
                    <h3>Registered Attendee Roster for {curEv?.name || curEv?.label} ({curRegs.length})</h3>
                  </div>

                  <div className="admin-table-container">
                    <div className="admin-table-scroll">
                      <table className="admin-data-table">
                        <thead>
                          <tr>
                            <th>Participant Code</th>
                            <th>Name</th>
                            <th>College</th>
                            <th>Phone</th>
                            <th>Gate Arrival</th>
                            <th>Room Attendance</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {curRegs.length > 0 ? (
                            curRegs.map(r => {
                              const pId = r.participant_id;
                              const pCode = r.participants?.participant_code || r.participant_code;
                              const pName = r.participants?.name || r.name;
                              const isPresent = eventAttendance.some(a => a.participant_id === pId && a.event_id === curEv?.id);
                              const isArrived = arrivalCheckins.some(a => a.participant_id === pId);

                              return (
                                <tr key={r.id}>
                                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: '#ffffff' }}>{pCode}</td>
                                  <td style={{ color: '#ffffff', fontWeight: '600' }}>{pName}</td>
                                  <td>{r.participants?.college || '—'}</td>
                                  <td>{r.participants?.phone || '—'}</td>
                                  <td>
                                    <span style={{
                                      padding: '0.2rem 0.5rem',
                                      borderRadius: '4px',
                                      fontSize: '0.72rem',
                                      background: isArrived ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                                      color: isArrived ? '#ffffff' : '#71717a',
                                      border: '1px solid rgba(255, 255, 255, 0.12)'
                                    }}>
                                      {isArrived ? 'Arrived' : 'Pending'}
                                    </span>
                                  </td>
                                  <td>
                                    <span style={{
                                      padding: '0.2rem 0.5rem',
                                      borderRadius: '4px',
                                      fontSize: '0.72rem',
                                      fontWeight: 'bold',
                                      background: isPresent ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                      color: isPresent ? '#ffffff' : '#71717a',
                                      border: '1px solid rgba(255, 255, 255, 0.15)'
                                    }}>
                                      {isPresent ? 'PRESENT' : 'Awaiting'}
                                    </span>
                                  </td>
                                  <td>
                                    {!isPresent ? (
                                      <button
                                        type="button"
                                        onClick={() => handleMarkEventAttendance(pId, curEv?.id, 'manual')}
                                        className="admin-btn admin-btn-primary admin-btn-sm"
                                      >
                                        Mark Present
                                      </button>
                                    ) : (
                                      <span style={{ color: '#ffffff', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <FiCheckCircle size={13} color="#ffffff" />
                                        <span>Verified</span>
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="7" style={{ textAlign: 'center', color: '#71717a', padding: '2rem' }}>
                                No participants registered for this event yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: EVENTS CATALOG */}
        {/* ========================================================================= */}
        {activeTab === 'events' && (
          <div>
            <div className="admin-section-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2>Festival Competitions &amp; Events ({events.length})</h2>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {[
                    { key: 'all', label: `All (${events.length})` },
                    { key: 'individual', label: `Solo (${events.filter(e => e.registration_type === 'individual').length})` },
                    { key: 'team', label: `Team (${events.filter(e => e.registration_type === 'team').length})` }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setEventTrackFilter(tab.key)}
                      style={{
                        padding: '0.35rem 0.85rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        borderRadius: '20px',
                        border: '1px solid',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: eventTrackFilter === tab.key ? '#ffffff' : 'rgba(255, 255, 255, 0.04)',
                        borderColor: eventTrackFilter === tab.key ? '#ffffff' : 'rgba(255, 255, 255, 0.12)',
                        color: eventTrackFilter === tab.key ? '#000000' : '#a1a1aa'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {adminRole === 'admin' && (
                <button 
                  onClick={() => {
                    setActiveItem(null);
                    setEventFormData({
                      event_code: '',
                      name: '',
                      category: 'TECHNICAL',
                      venue: '',
                      date: '2026-12-10',
                      start_time: '10:00',
                      end_time: '12:00',
                      capacity: 60,
                      status: 'upcoming',
                      registration_fee: 0,
                      registration_type: 'individual',
                      max_team_size: 1,
                      is_spot_registration_enabled: true
                    });
                    setModalType('addEvent');
                  }} 
                  className="admin-btn admin-btn-primary"
                >
                  <FiPlus /> Add New Event
                </button>
              )}
            </div>

            <div className="admin-events-grid">
              {events
                .filter(ev => eventTrackFilter === 'all' || (ev.registration_type || 'individual') === eventTrackFilter)
                .map(ev => {
                const regCount = registrations.filter(r => r.event_id === ev.id || r.events?.event_code === ev.event_code).length;
                const attCount = eventAttendance.filter(a => a.event_id === ev.id).length;
                const isTeamEvent = ev.registration_type === 'team';

                return (
                  <div key={ev.id} className="admin-event-card">
                    <div className="admin-event-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span className="admin-event-card-cat">{ev.category || 'TECHNICAL'}</span>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.65rem',
                          fontWeight: '700',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          backgroundColor: isTeamEvent ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                          color: isTeamEvent ? '#ffffff' : '#a1a1aa',
                          border: '1px solid rgba(255, 255, 255, 0.18)',
                          textTransform: 'uppercase'
                        }}>
                          {isTeamEvent ? `Team (Max ${ev.max_team_size || 4})` : 'Solo'}
                        </span>
                      </div>
                      <span style={{ 
                        fontFamily: 'var(--font-mono)', 
                        fontSize: '0.72rem', 
                        color: '#a1a1aa',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}>
                        {ev.status || 'upcoming'}
                      </span>
                    </div>

                    <h3 className="admin-event-card-title">{ev.name || ev.label}</h3>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#71717a', marginBottom: '0.75rem' }}>
                      Code: {ev.event_code || ev.id}
                    </div>

                    <div className="admin-event-card-meta">
                      <div className="admin-event-meta-item">
                        <FiCalendar />
                        <span>{ev.date}</span>
                      </div>
                      <div className="admin-event-meta-item">
                        <FiClock />
                        <span>{ev.time || `${ev.start_time || '10:00'} - ${ev.end_time || ''}`}</span>
                      </div>
                      <div className="admin-event-meta-item">
                        <FiMapPin />
                        <span>{ev.venue || 'Campus Venue'}</span>
                      </div>
                    </div>

                    <div style={{ 
                      marginTop: '1rem', 
                      paddingTop: '0.75rem', 
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem',
                      color: '#d4d4d8'
                    }}>
                      <div>
                        <span>Reg: <strong style={{ color: '#ffffff' }}>{regCount}</strong></span>
                        <span style={{ marginLeft: '0.6rem' }}>Att: <strong style={{ color: '#ffffff' }}>{attCount}</strong></span>
                      </div>

                      {adminRole === 'admin' && (
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            onClick={() => {
                              setActiveItem(ev);
                              setEventFormData({
                                event_code: ev.event_code || '',
                                name: ev.name || ev.label || '',
                                category: ev.category || 'TECHNICAL',
                                venue: ev.venue || '',
                                date: ev.date || '2026-12-10',
                                start_time: ev.start_time ? String(ev.start_time).substring(0, 5) : '10:00',
                                end_time: ev.end_time ? String(ev.end_time).substring(0, 5) : '12:00',
                                capacity: ev.capacity ?? 60,
                                status: ev.status || 'upcoming',
                                registration_fee: ev.registration_fee ?? 0,
                                registration_type: ev.registration_type || 'individual',
                                max_team_size: ev.max_team_size || 1,
                                is_spot_registration_enabled: ev.is_spot_registration_enabled !== false
                              });
                              setModalType('editEvent');
                            }}
                            className="admin-btn admin-btn-secondary"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                            title="Edit Event"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(ev.id, ev.name || ev.label)}
                            className="admin-btn admin-btn-danger"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                            title="Delete Event"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: PARTICIPANTS DIRECTORY */}
        {/* ========================================================================= */}
        {activeTab === 'participants' && (
          <div>
            <div className="admin-section-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2>Festival Participants ({participants.length})</h2>
                <div style={{ color: '#a1a1aa', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                  Manage attendee identities, gate passes, event enrollments, and check-in statuses
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search participants by code, name, college, email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="admin-search-box"
                  style={{ width: '280px' }}
                />
                <select
                  value={participantGateFilter}
                  onChange={e => setParticipantGateFilter(e.target.value)}
                  className="admin-select"
                  style={{ width: '160px' }}
                >
                  <option value="all">All Gate Status</option>
                  <option value="checked_in">Checked In Only</option>
                  <option value="pending">Pending Arrival Only</option>
                </select>
                {(adminRole === 'admin' || adminRole === 'registration') && (
                  <button 
                    onClick={handleOpenAddParticipant} 
                    className="admin-btn admin-btn-primary"
                    title="Add New Festival Participant"
                  >
                    <FiPlus /> Add Participant
                  </button>
                )}
                <button 
                  onClick={() => handleExportCsv('participants', filteredParticipants)} 
                  className="admin-btn admin-btn-secondary"
                  title="Export Participants CSV"
                >
                  <FiDownload /> Export CSV
                </button>
                {adminRole === 'admin' && (
                  <button 
                    type="button"
                    onClick={() => setModalType('resetAllData')} 
                    className="admin-btn admin-btn-danger"
                    title="Reset all test participant data and turnout back to 0"
                  >
                    <FiTrash2 /> Reset All to Zero
                  </button>
                )}
              </div>
            </div>

            {/* Bulk Selection Bar */}
            {selectedParticipantIds.length > 0 && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '8px',
                padding: '0.65rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem'
              }}>
                <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.88rem' }}>
                  {selectedParticipantIds.length} participant{selectedParticipantIds.length > 1 ? 's' : ''} selected
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleDeleteSelectedParticipants}
                    className="admin-btn admin-btn-sm admin-btn-danger"
                  >
                    <FiTrash2 /> Delete Selected ({selectedParticipantIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedParticipantIds([])}
                    className="admin-btn admin-btn-sm admin-btn-secondary"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
            )}

            <div className="admin-table-container">
              <div className="admin-table-scroll">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={filteredParticipants.length > 0 && selectedParticipantIds.length === filteredParticipants.length}
                          onChange={handleToggleSelectAllParticipants}
                          title="Select All Participants"
                        />
                      </th>
                      <th>Participant Code</th>
                      <th>Attendee Name</th>
                      <th>College &amp; Dept</th>
                      <th>Contact Info</th>
                      <th>Gate Status</th>
                      <th>Events</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParticipants.length > 0 ? (
                      filteredParticipants.map(p => {
                        const isArrived = arrivalCheckins.some(a => a.participant_id === p.id);
                        const pRegs = registrations.filter(r => r.participant_id === p.id || r.participants?.id === p.id);

                        return (
                          <tr key={p.id}>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={selectedParticipantIds.includes(p.id)}
                                onChange={() => handleToggleSelectParticipant(p.id)}
                              />
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: '#ffffff' }}>
                              {p.participant_code}
                            </td>
                            <td style={{ color: '#ffffff', fontWeight: '600' }}>
                              {p.name}
                            </td>
                            <td>
                              <div style={{ color: '#ffffff', fontSize: '0.88rem' }}>{p.college || '—'}</div>
                              <div style={{ color: '#a1a1aa', fontSize: '0.78rem' }}>{p.department || '—'} • {p.year || '—'}</div>
                            </td>
                            <td>
                              <div style={{ color: '#ffffff', fontSize: '0.82rem' }}>{p.email || '—'}</div>
                              <div style={{ color: '#a1a1aa', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>{p.phone || '—'}</div>
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => handleToggleArrivalCheckin(p)}
                                className="admin-btn admin-btn-sm"
                                style={{
                                  background: isArrived ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.04)',
                                  color: isArrived ? '#ffffff' : '#71717a',
                                  border: isArrived ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.15)',
                                  cursor: 'pointer',
                                  fontSize: '0.74rem',
                                  padding: '0.3rem 0.6rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem'
                                }}
                                title={isArrived ? 'Click to revoke gate check-in' : 'Click to verify and check in at gate'}
                              >
                                <FiCheckCircle size={13} color={isArrived ? '#ffffff' : '#71717a'} />
                                <span>{isArrived ? 'Checked In' : 'Check In'}</span>
                              </button>
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => handleOpenQuickRegister(p)}
                                className="admin-btn admin-btn-sm admin-btn-secondary"
                                style={{ fontSize: '0.74rem', padding: '0.25rem 0.55rem' }}
                                title="Click to register this participant for events"
                              >
                                <FiAward size={12} />
                                <span>{pRegs.length} {pRegs.length === 1 ? 'Event' : 'Events'}</span>
                                <FiPlus size={10} style={{ marginLeft: '2px' }} />
                              </button>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  onClick={() => handleSendWhatsAppPass(p)}
                                  className="admin-btn admin-btn-sm"
                                  style={{
                                    background: 'rgba(37, 211, 102, 0.15)',
                                    border: '1px solid rgba(37, 211, 102, 0.4)',
                                    color: '#4ade80'
                                  }}
                                  title="Send Live Delegate Pass on WhatsApp"
                                >
                                  <FiPhone />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleViewParticipantPass(p)}
                                  className="admin-btn admin-btn-sm admin-btn-secondary"
                                  title="View Digital Festival Pass & QR Badge"
                                >
                                  <FiEye />
                                </button>
                                {(adminRole === 'admin' || adminRole === 'registration') && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditParticipant(p)}
                                      className="admin-btn admin-btn-sm admin-btn-secondary"
                                      title="Edit Participant Details"
                                    >
                                      <FiEdit2 />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteParticipant(p.id, p.name, p.participant_code)}
                                      className="admin-btn admin-btn-sm admin-btn-danger"
                                      title="Delete Participant"
                                    >
                                      <FiTrash2 />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#71717a' }}>
                          No participants matching criteria found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: REGISTRATIONS DIRECTORY */}
        {/* ========================================================================= */}
        {activeTab === 'registrations' && (
          <div>
            <div className="admin-section-header">
              <h2>All Event Registrations ({filteredRegistrations.length})</h2>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Search registrations..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="admin-search-box"
                />
                <select
                  value={eventFilter}
                  onChange={e => setEventFilter(e.target.value)}
                  className="admin-select"
                >
                  <option value="all">All Events</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.name || ev.label}</option>
                  ))}
                </select>
                {(adminRole === 'admin' || adminRole === 'registration') && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveItem(participants[0] || null);
                      setQuickRegData({
                        participant_id: participants[0]?.id || '',
                        event_id: events[0]?.id || '',
                        payment_status: 'verified',
                        payment_method: 'cash'
                      });
                      setModalType('quickRegister');
                    }}
                    className="admin-btn admin-btn-primary"
                    title="Register a Participant for an Event"
                  >
                    <FiPlus /> Register Attendee
                  </button>
                )}
                <button onClick={() => handleExportCsv('registrations', filteredRegistrations)} className="admin-btn admin-btn-secondary">
                  <FiDownload /> CSV
                </button>
              </div>
            </div>

            <div className="admin-table-container">
              <div className="admin-table-scroll">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Participant Code</th>
                      <th>Attendee Name</th>
                      <th>Event Code</th>
                      <th>Event Name</th>
                      <th>Status</th>
                      <th>Registration Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: '#ffffff' }}>
                          {r.participants?.participant_code || r.participant_code || '—'}
                        </td>
                        <td style={{ color: '#ffffff', fontWeight: '600' }}>
                          {r.participants?.name || r.name || '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                          {r.events?.event_code || r.event_id || '—'}
                        </td>
                        <td>{r.events?.name || r.event_name || '—'}</td>
                        <td>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            background: 'rgba(255, 255, 255, 0.12)',
                            color: '#ffffff',
                            border: '1px solid rgba(255, 255, 255, 0.15)'
                          }}>
                            {r.status?.toUpperCase() || 'REGISTERED'}
                          </span>
                        </td>
                        <td style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>
                          {r.registered_at ? new Date(r.registered_at).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const participantObj = participants.find(p => p.id === r.participant_id) || r.participants || {
                                  name: r.name,
                                  phone: r.phone,
                                  participant_code: r.participant_code,
                                  id: r.participant_id
                                };
                                handleSendWhatsAppPass(participantObj, r.events?.name || r.event_name);
                              }}
                              className="admin-btn admin-btn-sm"
                              style={{
                                background: 'rgba(37, 211, 102, 0.15)',
                                border: '1px solid rgba(37, 211, 102, 0.4)',
                                color: '#4ade80'
                              }}
                              title="Send Pass on WhatsApp"
                            >
                              <FiPhone />
                            </button>
                            {(adminRole === 'admin' || adminRole === 'registration') && (
                              <button
                                type="button"
                                onClick={() => handleDeleteRegistration(r.id, r.participants?.name || r.name, r.events?.name || r.event_name)}
                                className="admin-btn admin-btn-sm admin-btn-danger"
                                title="Cancel & Delete Registration"
                              >
                                <FiTrash2 />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: STAFF & ASSIGNMENTS (Admin only) */}
        {/* ========================================================================= */}
        {activeTab === 'staff' && adminRole === 'admin' && (
          <div>
            <div className="admin-section-header">
              <h2>Festival Staff &amp; Coordinators ({volunteers.length})</h2>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={() => {
                    setAssignStaffData({ volunteer_id: volunteers[0]?.id || '', event_id: events[0]?.id || '' });
                    setModalType('assignEventStaff');
                  }} 
                  className="admin-btn admin-btn-primary"
                >
                  <FiPlus /> Assign Staff to Event
                </button>
                <button 
                  onClick={() => {
                    setVolunteerFormData({ username: '', name: '', email: '', role: 'event_staff', status: 'active' });
                    setModalType('addVolunteer');
                  }} 
                  className="admin-btn admin-btn-secondary"
                >
                  <FiPlus /> Add Staff Profile
                </button>
              </div>
            </div>

            {/* Event Staff Assignments Mapping */}
            <div style={{ marginBottom: '2.5rem' }}>
              <h3 style={{ color: '#ffffff', fontSize: '1.1rem', marginBottom: '1rem' }}>
                Active Event Coordinator Assignments (public.event_staff)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                {eventStaff.length > 0 ? (
                  eventStaff.map(es => (
                    <div 
                      key={es.id} 
                      style={{
                        background: '#121214',
                        border: '1px solid rgba(255, 255, 255, 0.14)',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#ffffff', fontSize: '1rem', marginBottom: '0.2rem' }}>
                          {es.volunteers?.name || 'Staff Member'}
                        </div>
                        <div style={{ color: '#a1a1aa', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
                          Username: @{es.volunteers?.username || 'user'} • Role: {es.volunteers?.role}
                        </div>
                        <div style={{ marginTop: '0.5rem', color: '#ffffff', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <FiAward size={14} color="#ffffff" />
                          <span>Assigned to: <strong>{es.events?.name || es.events?.event_code}</strong></span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveStaffAssignment(es.id)}
                        className="admin-btn admin-btn-danger admin-btn-sm"
                        title="Remove Assignment"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#71717a' }}>No event staff assignments configured yet.</p>
                )}
              </div>
            </div>

            {/* All Volunteers Table */}
            <div className="admin-section-header">
              <h3>All Registered Volunteers (public.volunteers)</h3>
            </div>
            <div className="admin-table-container">
              <div className="admin-table-scroll">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {volunteers.map(v => (
                      <tr key={v.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: '#ffffff' }}>
                          @{v.username || '—'}
                        </td>
                        <td style={{ color: '#ffffff', fontWeight: '600' }}>{v.name}</td>
                        <td>{v.email}</td>
                        <td>
                          <span className={`admin-role-tag admin-role-${v.role}`}>
                            {v.role?.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            background: v.status === 'active' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                            color: v.status === 'active' ? '#ffffff' : '#71717a',
                            border: '1px solid rgba(255, 255, 255, 0.15)'
                          }}>
                            {v.status?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditVolunteer(v)}
                              className="admin-btn admin-btn-sm admin-btn-secondary"
                              title="Edit Staff Profile"
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteVolunteer(v.id, v.name)}
                              className="admin-btn admin-btn-sm admin-btn-danger"
                              title="Delete Staff Member"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: DATABASE EXPLORER (7 TABLES) */}
        {/* ========================================================================= */}
        {activeTab === 'databases' && adminRole === 'admin' && (
          <div>
            <div className="admin-section-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2>Database Tables Explorer</h2>
                <p style={{ color: '#a1a1aa', fontSize: '0.85rem', margin: 0 }}>
                  Raw PostgreSQL inspection and operational controls for all 7 SRISHTI 2.7 core tables
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => handleExportCsv(selectedDbTable, currentTableData)}
                  className="admin-btn admin-btn-secondary"
                >
                  <FiDownload /> Download CSV
                </button>
                <button 
                  onClick={() => handleClearSingleTable(selectedDbTable)}
                  className="admin-btn admin-btn-danger"
                  title={`Clear all rows from public.${selectedDbTable}`}
                >
                  <FiTrash2 /> Clear Table ({currentTableData.length})
                </button>
                <button 
                  onClick={() => setModalType('resetAllData')}
                  className="admin-btn admin-btn-danger"
                  style={{ border: '1px solid rgba(255, 255, 255, 0.4)' }}
                  title="Reset all festival operational data back to 0"
                >
                  <FiAlertCircle /> Reset Everything to Zero
                </button>
              </div>
            </div>

            {/* Table Selection Pills */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {[
                { name: 'participants', label: 'public.participants', count: participants.length },
                { name: 'events', label: 'public.events', count: events.length },
                { name: 'registrations', label: 'public.registrations', count: registrations.length },
                { name: 'volunteers', label: 'public.volunteers', count: volunteers.length },
                { name: 'event_staff', label: 'public.event_staff', count: eventStaff.length },
                { name: 'arrival_checkins', label: 'public.arrival_checkins', count: arrivalCheckins.length },
                { name: 'event_attendance', label: 'public.event_attendance', count: eventAttendance.length }
              ].map(t => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => setSelectedDbTable(t.name)}
                  style={{
                    padding: '0.55rem 0.95rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    cursor: 'pointer',
                    background: selectedDbTable === t.name ? '#ffffff' : 'rgba(255, 255, 255, 0.04)',
                    color: selectedDbTable === t.name ? '#000000' : '#a1a1aa',
                    borderColor: selectedDbTable === t.name ? '#ffffff' : 'rgba(255, 255, 255, 0.12)',
                    fontWeight: '600',
                    fontSize: '0.82rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {t.label} ({t.count})
                </button>
              ))}
            </div>

            <div className="admin-table-container">
              <div className="admin-table-scroll">
                {filteredDbRows.length > 0 ? (
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        {Object.keys(filteredDbRows[0]).map(col => (
                          <th key={col}>{col}</th>
                        ))}
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDbRows.map((row, idx) => (
                        <tr key={row.id || idx}>
                          {Object.keys(filteredDbRows[0]).map(col => {
                            const val = row[col];
                            return (
                              <td key={col} style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {typeof val === 'object' && val !== null ? (
                                  <code style={{ fontSize: '0.72rem', color: '#ffffff' }}>{JSON.stringify(val)}</code>
                                ) : (
                                  String(val ?? '—')
                                )}
                              </td>
                            );
                          })}
                          <td style={{ textAlign: 'right' }}>
                            {row.id && (
                              <button
                                type="button"
                                onClick={() => handleDeleteDatabaseRow(selectedDbTable, row.id)}
                                className="admin-btn admin-btn-sm admin-btn-danger"
                                title="Delete this record"
                              >
                                <FiTrash2 />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ textAlign: 'center', color: '#71717a', padding: '2rem' }}>Table is empty (0 records).</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 9: AUDIT & LOCATION LOGS */}
        {/* ========================================================================= */}
        {activeTab === 'logs' && adminRole === 'admin' && (
          <div>
            <div className="admin-section-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2>Security Audit & Location Logs</h2>
                <p style={{ color: '#a1a1aa', fontSize: '0.85rem', margin: 0 }}>
                  Real-time client IP network geo-resolution, GPS coordinates, device fingerprints, and activity tracing.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={async () => {
                    setIsTestingLocation(true);
                    try {
                      const newLog = await logActivity('LOCATION_TEST_PROBE', {
                        email: currentStaff?.email || 'admin@srishti.live',
                        name: currentStaff?.name || 'Administrator',
                        status: 'SUCCESS',
                        metadata: { probe: 'Manual Test from Admin Panel' },
                        requestGps: true
                      });
                      showToast(`Tracked: ${newLog.city || 'Local'}, ${newLog.country || 'IN'} (${newLog.client_ip})`, 'success');
                      const updated = await getAuditLogs();
                      setAuditLogs(updated);
                    } catch (err) {
                      showToast('Test failed: ' + err.message, 'error');
                    } finally {
                      setIsTestingLocation(false);
                    }
                  }}
                  disabled={isTestingLocation}
                  className="admin-btn admin-btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <FiMapPin /> {isTestingLocation ? 'Detecting Location...' : 'Test My Current Location'}
                </button>
                <button 
                  type="button"
                  onClick={async () => {
                    setIsDataLoading(true);
                    try {
                      const l = await getAuditLogs();
                      setAuditLogs(l);
                      showToast(`Refreshed ${l.length} audit logs`, 'info');
                    } catch (err) {
                      showToast(err.message || 'Unable to load audit logs', 'error');
                    } finally {
                      setIsDataLoading(false);
                    }
                  }}
                  className="admin-btn admin-btn-secondary"
                >
                  <FiRefreshCw /> Refresh Logs
                </button>
                <button 
                  type="button"
                  onClick={() => exportLogsAsCsv(auditLogs)}
                  className="admin-btn admin-btn-secondary"
                  disabled={auditLogs.length === 0}
                >
                  <FiDownload /> Export CSV
                </button>
                <button 
                  type="button"
                  onClick={() => exportLogsAsJson(auditLogs)}
                  className="admin-btn admin-btn-secondary"
                  disabled={auditLogs.length === 0}
                >
                  <FiDownload /> Export JSON
                </button>
                <button 
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Clear all audit logs? This removes the stored audit history.')) {
                      try {
                        await clearAuditLogs();
                        setAuditLogs([]);
                        showToast('Audit logs cleared', 'success');
                      } catch (err) {
                        showToast(err.message || 'Unable to clear audit logs', 'error');
                      }
                    }
                  }}
                  className="admin-btn admin-btn-danger"
                  disabled={auditLogs.length === 0}
                >
                  <FiTrash2 /> Clear Logs
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '1.5rem' }}>
              <div className="admin-stat-card">
                <div className="admin-stat-header">
                  <span className="admin-stat-title">Total Logs</span>
                  <div className="admin-stat-icon"><FiActivity /></div>
                </div>
                <div className="admin-stat-value">{auditLogs.length}</div>
                <div className="admin-stat-sub">Actions & visits recorded</div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-header">
                  <span className="admin-stat-title">Unique IPs</span>
                  <div className="admin-stat-icon"><FiShield /></div>
                </div>
                <div className="admin-stat-value">
                  {new Set(auditLogs.map(l => l.client_ip).filter(ip => ip && ip !== 'Client Local')).size}
                </div>
                <div className="admin-stat-sub">Distinct client addresses</div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-header">
                  <span className="admin-stat-title">Tracked Cities</span>
                  <div className="admin-stat-icon"><FiMapPin /></div>
                </div>
                <div className="admin-stat-value">
                  {new Set(auditLogs.map(l => l.city).filter(Boolean)).size}
                </div>
                <div className="admin-stat-sub">Geographic origin nodes</div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-header">
                  <span className="admin-stat-title">Security Warnings</span>
                  <div className="admin-stat-icon" style={{ color: '#ef4444' }}><FiAlertCircle /></div>
                </div>
                <div className="admin-stat-value" style={{ color: '#ef4444' }}>
                  {auditLogs.filter(l => l.status === 'WARNING' || l.status === 'DANGER' || l.action?.includes('FAIL') || l.action?.includes('INVALID')).length}
                </div>
                <div className="admin-stat-sub">Failed logins / exceptions</div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="admin-table-controls" style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div className="admin-search-wrapper" style={{ flex: '1 1 300px' }}>
                <FiSearch className="admin-search-icon" />
                <input
                  type="text"
                  placeholder="Search by IP, email, participant code, city, device..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="admin-search-input"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select
                  value={logFilterAction}
                  onChange={(e) => setLogFilterAction(e.target.value)}
                  className="admin-select"
                  style={{ width: 'auto' }}
                >
                  <option value="all">All Action Types ({auditLogs.length})</option>
                  <option value="EVENT_REGISTRATION">Event Registrations</option>
                  <option value="LOGIN">OTP Logins</option>
                  <option value="GATE">Gate Arrivals</option>
                  <option value="PASS">Pass Downloads & Emails</option>
                  <option value="SECURITY">Warnings & Security Events</option>
                </select>
              </div>
            </div>

            {/* Logs Table */}
            {(() => {
              const filteredLogs = auditLogs.filter(l => {
                // Filter by action
                if (logFilterAction === 'EVENT_REGISTRATION' && !l.action?.includes('REGISTRATION')) return false;
                if (logFilterAction === 'LOGIN' && !l.action?.includes('LOGIN')) return false;
                if (logFilterAction === 'GATE' && !l.action?.includes('GATE')) return false;
                if (logFilterAction === 'PASS' && !l.action?.includes('PASS')) return false;
                if (logFilterAction === 'SECURITY' && l.status !== 'WARNING' && l.status !== 'DANGER' && !l.action?.includes('FAIL') && !l.action?.includes('INVALID')) return false;

                // Search query
                if (searchQuery.trim()) {
                  const q = searchQuery.toLowerCase();
                  const match = (
                    l.client_ip?.toLowerCase().includes(q) ||
                    l.user_email?.toLowerCase().includes(q) ||
                    l.participant_code?.toLowerCase().includes(q) ||
                    l.participant_name?.toLowerCase().includes(q) ||
                    l.city?.toLowerCase().includes(q) ||
                    l.country?.toLowerCase().includes(q) ||
                    l.action?.toLowerCase().includes(q) ||
                    l.device?.os?.toLowerCase().includes(q) ||
                    l.device?.browser?.toLowerCase().includes(q)
                  );
                  if (!match) return false;
                }
                return true;
              });

              return (
                <div className="admin-table-container">
                  {filteredLogs.length > 0 ? (
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Action</th>
                          <th>Attendee / User</th>
                          <th>Location / IP</th>
                          <th>GPS Coordinates</th>
                          <th>Device & Client</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLogs.map(log => {
                          const isWarning = log.status === 'WARNING' || log.status === 'DANGER' || log.action?.includes('FAIL') || log.action?.includes('INVALID');
                          const hasCoords = log.latitude !== null && log.latitude !== undefined && log.longitude !== null && log.longitude !== undefined;
                          const mapsLink = log.maps_url || (hasCoords ? `https://www.google.com/maps?q=${log.latitude},${log.longitude}` : null);

                          return (
                            <tr key={log.id} style={{ backgroundColor: isWarning ? 'rgba(239, 68, 68, 0.05)' : undefined }}>
                              <td style={{ whiteSpace: 'nowrap' }}>
                                <div style={{ fontSize: '0.82rem', color: '#ffffff', fontWeight: '600' }}>
                                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#71717a' }}>
                                  {new Date(log.timestamp).toLocaleDateString()}
                                </div>
                              </td>

                              <td>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '0.25rem 0.6rem',
                                  borderRadius: '6px',
                                  fontSize: '0.72rem',
                                  fontFamily: 'var(--font-mono, monospace)',
                                  fontWeight: '700',
                                  letterSpacing: '0.04em',
                                  background: isWarning 
                                    ? 'rgba(239, 68, 68, 0.15)' 
                                    : (log.action?.includes('REGISTRATION') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)'),
                                  color: isWarning 
                                    ? '#f87171' 
                                    : (log.action?.includes('REGISTRATION') ? '#34d399' : '#38bdf8'),
                                  border: isWarning 
                                    ? '1px solid rgba(239, 68, 68, 0.3)' 
                                    : (log.action?.includes('REGISTRATION') ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)')
                                }}>
                                  {log.action}
                                </span>
                              </td>

                              <td>
                                <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '0.85rem' }}>
                                  {log.participant_name || 'Attendee'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                  {log.user_email || 'anonymous'}
                                </div>
                                {log.participant_code && log.participant_code !== 'N/A' && (
                                  <div style={{ fontSize: '0.7rem', color: '#00f2fe', fontFamily: 'monospace' }}>
                                    {log.participant_code}
                                  </div>
                                )}
                              </td>

                              <td>
                                <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <FiMapPin size={12} color="#00f2fe" />
                                  <span>{log.city || 'Local Area'}{log.country ? `, ${log.country}` : ''}</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#a1a1aa', fontFamily: 'monospace' }}>
                                  IP: {log.client_ip || 'N/A'}
                                </div>
                                {log.isp && (
                                  <div style={{ fontSize: '0.7rem', color: '#71717a' }}>
                                    {log.isp}
                                  </div>
                                )}
                              </td>

                              <td>
                                {hasCoords ? (
                                  <div>
                                    <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#38bdf8' }}>
                                      {Number(log.latitude).toFixed(4)}, {Number(log.longitude).toFixed(4)}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.2rem', alignItems: 'center' }}>
                                      {mapsLink && (
                                        <a
                                          href={mapsLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{
                                            fontSize: '0.7rem',
                                            color: '#00f2fe',
                                            textDecoration: 'underline',
                                            fontWeight: '600'
                                          }}
                                        >
                                          📍 View on Maps
                                        </a>
                                      )}
                                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                        ({log.location_source === 'browser_gps' ? 'GPS' : 'IP Geo'})
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: '#71717a' }}>No GPS Fix</span>
                                )}
                              </td>

                              <td>
                                <div style={{ fontSize: '0.8rem', color: '#ffffff' }}>
                                  {log.device?.os || 'OS'} • {log.device?.browser || 'Browser'}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#71717a' }}>
                                  {log.device?.screen || 'Screen'} {log.device?.isMobile ? '• Mobile' : '• Desktop'}
                                </div>
                              </td>

                              <td>
                                <span style={{
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: '700',
                                  background: isWarning ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                  color: isWarning ? '#f87171' : '#34d399'
                                }}>
                                  {log.status || 'OK'}
                                </span>
                              </td>

                              <td style={{ textAlign: 'right' }}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedLogForInspect(log)}
                                  className="admin-btn admin-btn-sm admin-btn-secondary"
                                  title="Inspect full telemetry & location metadata"
                                >
                                  <FiEye /> Inspect
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#71717a' }}>
                      <FiMapPin size={36} color="#444" style={{ marginBottom: '1rem' }} />
                      <p style={{ margin: 0, fontSize: '1rem' }}>No activity or location logs match your filter criteria.</p>
                      <button
                        type="button"
                        onClick={() => { setSearchQuery(''); setLogFilterAction('all'); }}
                        style={{ marginTop: '0.75rem', background: 'transparent', border: '1px solid #333', color: '#cbd5e1', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        Reset Filters
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Modal: Inspect Audit Log & Telemetry */}
      {selectedLogForInspect && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-card" style={{ maxWidth: '640px' }}>
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FiMapPin style={{ color: '#00f2fe' }} />
                <h3>Telemetry & Location Inspection</h3>
              </div>
              <button onClick={() => setSelectedLogForInspect(null)} className="admin-modal-close"><FiX /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ background: '#0a0a0a', padding: '1rem', borderRadius: '8px', border: '1px solid #222' }}>
                <div style={{ fontSize: '0.75rem', color: '#71717a', textTransform: 'uppercase' }}>Action & User</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff', marginTop: '0.2rem' }}>
                  {selectedLogForInspect.action}
                </div>
                <div style={{ color: '#00f2fe', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  {selectedLogForInspect.participant_name} ({selectedLogForInspect.user_email})
                </div>
                {selectedLogForInspect.participant_code && (
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                    Code: {selectedLogForInspect.participant_code}
                  </div>
                )}
              </div>

              <div style={{ background: '#0a0a0a', padding: '1rem', borderRadius: '8px', border: '1px solid #222' }}>
                <div style={{ fontSize: '0.75rem', color: '#71717a', textTransform: 'uppercase' }}>Network & Geolocation</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                  <div><strong style={{ color: '#94a3b8' }}>IP Address:</strong> <span style={{ color: '#fff' }}>{selectedLogForInspect.client_ip}</span></div>
                  <div><strong style={{ color: '#94a3b8' }}>City:</strong> <span style={{ color: '#fff' }}>{selectedLogForInspect.city || 'Unknown'}</span></div>
                  <div><strong style={{ color: '#94a3b8' }}>Country:</strong> <span style={{ color: '#fff' }}>{selectedLogForInspect.country || 'Unknown'}</span></div>
                  <div><strong style={{ color: '#94a3b8' }}>ISP:</strong> <span style={{ color: '#fff' }}>{selectedLogForInspect.isp || 'N/A'}</span></div>
                  <div><strong style={{ color: '#94a3b8' }}>Latitude:</strong> <span style={{ color: '#38bdf8' }}>{selectedLogForInspect.latitude ?? 'N/A'}</span></div>
                  <div><strong style={{ color: '#94a3b8' }}>Longitude:</strong> <span style={{ color: '#38bdf8' }}>{selectedLogForInspect.longitude ?? 'N/A'}</span></div>
                  <div><strong style={{ color: '#94a3b8' }}>Source:</strong> <span style={{ color: '#fff' }}>{selectedLogForInspect.location_source || 'ip'}</span></div>
                  <div><strong style={{ color: '#94a3b8' }}>Accuracy:</strong> <span style={{ color: '#fff' }}>{selectedLogForInspect.accuracy_meters ? `${selectedLogForInspect.accuracy_meters}m` : 'N/A'}</span></div>
                </div>

                {selectedLogForInspect.maps_url && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <a
                      href={selectedLogForInspect.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-btn admin-btn-sm admin-btn-primary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none' }}
                    >
                      <FiMapPin /> Open Coordinates on Google Maps
                    </a>
                  </div>
                )}
              </div>

              <div style={{ background: '#0a0a0a', padding: '1rem', borderRadius: '8px', border: '1px solid #222' }}>
                <div style={{ fontSize: '0.75rem', color: '#71717a', textTransform: 'uppercase' }}>Device & Raw Metadata</div>
                <pre style={{ margin: '0.5rem 0 0 0', padding: '0.75rem', background: '#000', borderRadius: '6px', fontSize: '0.75rem', color: '#34d399', overflowX: 'auto', border: '1px solid #1f2937' }}>
                  {JSON.stringify({
                    device: selectedLogForInspect.device,
                    user_agent: selectedLogForInspect.user_agent,
                    metadata: selectedLogForInspect.metadata,
                    timestamp: selectedLogForInspect.timestamp
                  }, null, 2)}
                </pre>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedLogForInspect(null)}
                  className="admin-btn admin-btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Assign Staff to Event */}
      {modalType === 'assignEventStaff' && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Assign Coordinator to Event</h3>
              <button onClick={() => setModalType(null)} className="admin-modal-close"><FiX /></button>
            </div>
            <form onSubmit={handleAssignStaffToEvent}>
              <div className="admin-form-group">
                <label>Select Coordinator (Volunteer)</label>
                <select
                  value={assignStaffData.volunteer_id}
                  onChange={e => setAssignStaffData({ ...assignStaffData, volunteer_id: e.target.value })}
                  className="admin-select"
                  required
                >
                  <option value="">-- Choose Coordinator --</option>
                  {volunteers.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} (@{v.username || 'user'}) - Role: {v.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-form-group">
                <label>Select Event</label>
                <select
                  value={assignStaffData.event_id}
                  onChange={e => setAssignStaffData({ ...assignStaffData, event_id: e.target.value })}
                  className="admin-select"
                  required
                >
                  <option value="">-- Choose Event --</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.event_code || ev.id}: {ev.name || ev.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setModalType(null)} className="admin-btn admin-btn-secondary">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="admin-btn admin-btn-primary">
                  {isSubmitting ? 'Saving...' : 'Save Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Volunteer */}
      {modalType === 'addVolunteer' && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Add Staff Member (public.volunteers)</h3>
              <button onClick={() => setModalType(null)} className="admin-modal-close"><FiX /></button>
            </div>
            <form onSubmit={handleSaveVolunteer}>
              <div className="admin-form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  required
                  value={volunteerFormData.name}
                  onChange={e => setVolunteerFormData({ ...volunteerFormData, name: e.target.value })}
                  className="admin-form-control"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="admin-form-group">
                <label>Username</label>
                <input
                  type="text"
                  required
                  value={volunteerFormData.username}
                  onChange={e => setVolunteerFormData({ ...volunteerFormData, username: e.target.value })}
                  className="admin-form-control"
                  placeholder="e.g. srishti_quiz"
                />
              </div>

              <div className="admin-form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  required
                  value={volunteerFormData.email}
                  onChange={e => setVolunteerFormData({ ...volunteerFormData, email: e.target.value })}
                  className="admin-form-control"
                  placeholder="e.g. user@stthomas.edu"
                />
              </div>

              <div className="admin-form-group">
                <label>Role</label>
                <select
                  value={volunteerFormData.role}
                  onChange={e => setVolunteerFormData({ ...volunteerFormData, role: e.target.value })}
                  className="admin-select"
                >
                  <option value="admin">admin (Full Festival Administrator)</option>
                  <option value="registration">registration (Gate Arrival Check-in Desk)</option>
                  <option value="event_staff">event_staff (Event Coordinator)</option>
                  <option value="volunteer">volunteer (General Support)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setModalType(null)} className="admin-btn admin-btn-secondary">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="admin-btn admin-btn-primary">
                  {isSubmitting ? 'Creating...' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add or Edit Festival Event */}
      {(modalType === 'addEvent' || modalType === 'editEvent') && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-card" style={{ maxWidth: '640px' }}>
            <div className="admin-modal-header">
              <h3>{modalType === 'addEvent' ? 'Add New Festival Event' : 'Edit Festival Event'}</h3>
              <button onClick={() => setModalType(null)} className="admin-modal-close"><FiX /></button>
            </div>
            <form onSubmit={handleSaveEvent}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="admin-form-group">
                  <label>Event Name *</label>
                  <input
                    type="text"
                    required
                    value={eventFormData.name || ''}
                    onChange={e => setEventFormData({ ...eventFormData, name: e.target.value })}
                    className="admin-form-control"
                    placeholder="e.g. AI Prompt Battle"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Event Code *</label>
                  <input
                    type="text"
                    required
                    value={eventFormData.event_code || ''}
                    onChange={e => setEventFormData({ ...eventFormData, event_code: e.target.value.toUpperCase() })}
                    className="admin-form-control"
                    placeholder="e.g. SRI27-PROMPT"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="admin-form-group">
                  <label>Category</label>
                  <select
                    value={eventFormData.category || 'TECHNICAL'}
                    onChange={e => setEventFormData({ ...eventFormData, category: e.target.value })}
                    className="admin-select"
                  >
                    <option value="TECHNICAL">TECHNICAL</option>
                    <option value="Coding">Coding</option>
                    <option value="Robotics">Robotics</option>
                    <option value="Web & App">Web & App</option>
                    <option value="FUN">FUN</option>
                    <option value="CULTURAL">CULTURAL</option>
                    <option value="Gaming">Gaming</option>
                    <option value="Workshops">Workshops</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>Venue</label>
                  <input
                    type="text"
                    value={eventFormData.venue || ''}
                    onChange={e => setEventFormData({ ...eventFormData, venue: e.target.value })}
                    className="admin-form-control"
                    placeholder="e.g. Main Auditorium / CS Lab 3"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="admin-form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    required
                    value={eventFormData.date || '2026-12-10'}
                    onChange={e => setEventFormData({ ...eventFormData, date: e.target.value })}
                    className="admin-form-control"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={eventFormData.start_time || '10:00'}
                    onChange={e => setEventFormData({ ...eventFormData, start_time: e.target.value })}
                    className="admin-form-control"
                  />
                </div>

                <div className="admin-form-group">
                  <label>End Time</label>
                  <input
                    type="time"
                    value={eventFormData.end_time || '12:00'}
                    onChange={e => setEventFormData({ ...eventFormData, end_time: e.target.value })}
                    className="admin-form-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="admin-form-group">
                  <label>Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={eventFormData.capacity ?? 60}
                    onChange={e => setEventFormData({ ...eventFormData, capacity: e.target.value })}
                    className="admin-form-control"
                    placeholder="60"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Registration Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={eventFormData.registration_fee ?? 0}
                    onChange={e => setEventFormData({ ...eventFormData, registration_fee: e.target.value })}
                    className="admin-form-control"
                    placeholder="0"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Status</label>
                  <select
                    value={eventFormData.status || 'upcoming'}
                    onChange={e => setEventFormData({ ...eventFormData, status: e.target.value })}
                    className="admin-select"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing (Live)</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="admin-form-group">
                  <label>Registration Type</label>
                  <select
                    value={eventFormData.registration_type || 'individual'}
                    onChange={e => {
                      const newType = e.target.value;
                      setEventFormData({
                        ...eventFormData,
                        registration_type: newType,
                        max_team_size: newType === 'team' ? (eventFormData.max_team_size > 1 ? eventFormData.max_team_size : 4) : 1
                      });
                    }}
                    className="admin-select"
                  >
                    <option value="individual">Solo (Individual)</option>
                    <option value="team">Team Event</option>
                  </select>
                </div>

                {eventFormData.registration_type === 'team' && (
                  <div className="admin-form-group">
                    <label>Max Team Size (e.g. 2, 4, 8)</label>
                    <input
                      type="number"
                      min="2"
                      max="15"
                      value={eventFormData.max_team_size || 4}
                      onChange={e => setEventFormData({ ...eventFormData, max_team_size: Math.max(2, Number(e.target.value)) })}
                      className="admin-form-control"
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setModalType(null)} className="admin-btn admin-btn-secondary">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="admin-btn admin-btn-primary">
                  {isSubmitting ? 'Saving...' : modalType === 'addEvent' ? 'Create Event' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD OR EDIT PARTICIPANT (PEOPLE MANAGEMENT) */}
      {/* ========================================================================= */}
      {(modalType === 'addParticipant' || modalType === 'editParticipant') && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-card" style={{ maxWidth: '640px' }}>
            <div className="admin-modal-header">
              <h3>{modalType === 'addParticipant' ? 'Register New Participant' : 'Edit Participant Profile'}</h3>
              <button onClick={() => setModalType(null)} className="admin-modal-close"><FiX /></button>
            </div>
            <form onSubmit={handleSaveParticipant}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="admin-form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    required
                    value={userFormData.name || ''}
                    onChange={e => setUserFormData({ ...userFormData, name: e.target.value })}
                    className="admin-form-control"
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Participant Code *</label>
                  <input
                    type="text"
                    required
                    value={userFormData.participant_code || ''}
                    onChange={e => setUserFormData({ ...userFormData, participant_code: e.target.value.toUpperCase() })}
                    className="admin-form-control"
                    placeholder="e.g. SRI27-P1005"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="admin-form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={userFormData.email || ''}
                    onChange={e => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="admin-form-control"
                    placeholder="e.g. rahul@example.com"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={userFormData.phone || ''}
                    onChange={e => setUserFormData({ ...userFormData, phone: e.target.value })}
                    className="admin-form-control"
                    placeholder="e.g. +91 9876543210"
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label>College / Institution *</label>
                <input
                  type="text"
                  required
                  value={userFormData.college || ''}
                  onChange={e => setUserFormData({ ...userFormData, college: e.target.value })}
                  className="admin-form-control"
                  placeholder="e.g. St. Thomas College (Autonomous) Thrissur"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="admin-form-group">
                  <label>Department / Branch</label>
                  <input
                    type="text"
                    value={userFormData.department || ''}
                    onChange={e => setUserFormData({ ...userFormData, department: e.target.value })}
                    className="admin-form-control"
                    placeholder="e.g. Computer Science"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Year of Study</label>
                  <input
                    type="text"
                    value={userFormData.year || ''}
                    onChange={e => setUserFormData({ ...userFormData, year: e.target.value })}
                    className="admin-form-control"
                    placeholder="e.g. 3rd Year"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setModalType(null)} className="admin-btn admin-btn-secondary">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="admin-btn admin-btn-primary">
                  {isSubmitting ? 'Saving...' : modalType === 'addParticipant' ? 'Register Participant' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW PARTICIPANT PASS & QR BADGE */}
      {/* ========================================================================= */}
      {modalType === 'viewParticipantPass' && selectedParticipantForPass && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-card" style={{ maxWidth: '520px' }}>
            <div className="admin-modal-header">
              <h3>Official Festival Pass &amp; Entry Badge</h3>
              <button onClick={() => setModalType(null)} className="admin-modal-close"><FiX /></button>
            </div>

            <div style={{
              background: '#000000',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              borderRadius: '16px',
              padding: '1.75rem',
              textAlign: 'center',
              boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
              marginBottom: '1.5rem',
              position: 'relative'
            }}>
              <div style={{
                fontSize: '0.68rem',
                textTransform: 'uppercase',
                letterSpacing: '0.22em',
                color: '#a1a1aa',
                marginBottom: '0.4rem',
                fontWeight: '700'
              }}>
                SRISHTI 2.7 • NATIONAL TECH FESTIVAL
              </div>

              <div style={{
                fontSize: '1.55rem',
                fontWeight: '900',
                color: '#ffffff',
                marginBottom: '0.25rem',
                letterSpacing: '-0.02em'
              }}>
                {selectedParticipantForPass.name}
              </div>

              <div style={{
                display: 'inline-block',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.9rem',
                fontWeight: '800',
                color: '#ffffff',
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '0.25rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                marginBottom: '1.25rem'
              }}>
                {selectedParticipantForPass.participant_code}
              </div>

              {/* QR Code Container */}
              <div style={{
                background: '#ffffff',
                padding: '0.85rem',
                borderRadius: '12px',
                display: 'inline-block',
                boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
                marginBottom: '1.25rem'
              }}>
                {participantQrUrl && !isGeneratingPass ? (
                  <img 
                    src={participantQrUrl} 
                    alt={`QR Code for ${selectedParticipantForPass.participant_code}`} 
                    style={{ width: '180px', height: '180px', display: 'block' }} 
                  />
                ) : (
                  <div style={{ width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000000' }}>
                    <FiRefreshCw className="animate-spin" />
                  </div>
                )}
              </div>

              <div style={{ color: '#ffffff', fontSize: '0.92rem', fontWeight: '600', marginBottom: '0.2rem' }}>
                {selectedParticipantForPass.college || 'St. Thomas College Thrissur'}
              </div>
              <div style={{ color: '#a1a1aa', fontSize: '0.8rem', marginBottom: '1.1rem' }}>
                {selectedParticipantForPass.department || 'General'} • {selectedParticipantForPass.year || 'Participant'}
              </div>

              {/* Arrival Status & Events */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px'
              }}>
                {arrivalCheckins.some(a => a.participant_id === selectedParticipantForPass.id) ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ffffff', fontSize: '0.82rem', fontWeight: 'bold' }}>
                    <FiCheckCircle color="#ffffff" />
                    <span>VERIFIED AT GATE</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#71717a', fontSize: '0.82rem' }}>
                    <FiClock color="#71717a" />
                    <span>PENDING GATE ARRIVAL</span>
                  </div>
                )}
              </div>
            </div>

            {/* Participant Registrations & Event Attendance Breakdown */}
            <div style={{
              background: '#09090b',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '14px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              maxHeight: '220px',
              overflowY: 'auto'
            }}>
              <div style={{
                fontSize: '0.8rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#a1a1aa',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span>Registered Events &amp; Room Attendance</span>
                <span style={{ fontSize: '0.75rem', color: '#71717a' }}>
                  {registrations.filter(r => r.participant_id === selectedParticipantForPass.id).length} Events
                </span>
              </div>

              {(() => {
                const userRegs = registrations.filter(r => r.participant_id === selectedParticipantForPass.id);
                if (userRegs.length === 0) {
                  return (
                    <div style={{ color: '#71717a', fontSize: '0.82rem', textAlign: 'center', padding: '1rem 0' }}>
                      No registered events found for this participant.
                    </div>
                  );
                }
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {userRegs.map(reg => {
                      const ev = events.find(e => e.id === reg.event_id);
                      const isAttended = eventAttendance.some(
                        att => att.participant_id === selectedParticipantForPass.id && att.event_id === reg.event_id
                      );
                      const isPaid = reg.payment_status === 'verified';
                      return (
                        <div
                          key={reg.id || reg.registration_code}
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '10px',
                            padding: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem'
                          }}
                        >
                          <div>
                            <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.88rem' }}>
                              {ev ? ev.title : (reg.event_id || 'Event')}
                            </div>
                            <div style={{ color: '#71717a', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                              Code: {reg.registration_code || 'N/A'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: '600',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              background: isPaid ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                              color: isPaid ? '#4ade80' : '#facc15',
                              border: isPaid ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(234, 179, 8, 0.3)'
                            }}>
                              {isPaid ? 'Paid' : 'Payment Pending'}
                            </span>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: '600',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              background: isAttended ? 'rgba(56, 189, 248, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                              color: isAttended ? '#38bdf8' : '#94a3b8',
                              border: isAttended ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(148, 163, 184, 0.2)'
                            }}>
                              {isAttended ? '✓ Attended Room' : '○ Room Pending'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleToggleArrivalCheckin(selectedParticipantForPass)}
                className="admin-btn admin-btn-secondary"
              >
                <FiCheckCircle />
                <span>
                  {arrivalCheckins.some(a => a.participant_id === selectedParticipantForPass.id) ? 'Revoke Check-In' : 'Mark Gate Checked-In'}
                </span>
              </button>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleSendWhatsAppPass(selectedParticipantForPass)}
                  className="admin-btn"
                  style={{
                    background: '#25D366',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer'
                  }}
                  title="Send Official Pass & Live Link to Participant on WhatsApp"
                >
                  <FiPhone /> Send on WhatsApp
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPassPng}
                  className="admin-btn admin-btn-primary"
                >
                  <FiDownload /> Download PNG
                </button>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="admin-btn admin-btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: QUICK REGISTER PARTICIPANT TO EVENT */}
      {/* ========================================================================= */}
      {modalType === 'quickRegister' && activeItem && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-card" style={{ maxWidth: '520px' }}>
            <div className="admin-modal-header">
              <h3>Register Participant for Event</h3>
              <button onClick={() => setModalType(null)} className="admin-modal-close"><FiX /></button>
            </div>
            <form onSubmit={handleSaveQuickRegistration}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ color: '#a1a1aa', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                  Target Participant:
                </div>
                <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '1.05rem' }}>
                  {activeItem.name}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', color: '#a1a1aa', fontSize: '0.85rem' }}>
                  Code: {activeItem.participant_code} • {activeItem.college || '—'}
                </div>
              </div>

              <div className="admin-form-group">
                <label>Select Festival Event *</label>
                <select
                  value={quickRegData.event_id}
                  onChange={e => setQuickRegData({ ...quickRegData, event_id: e.target.value })}
                  className="admin-select"
                  required
                >
                  {events.map(ev => {
                    const isAlready = registrations.some(
                      r => r.participant_id === activeItem.id && (r.event_id === ev.id || r.events?.id === ev.id)
                    );
                    return (
                      <option key={ev.id} value={ev.id} disabled={isAlready}>
                        {ev.name || ev.label} ({ev.event_code}) {isAlready ? '— [ALREADY REGISTERED]' : ''}
                      </option>
                    );
                  })}
                </select>
                {registrations.some(
                  r => r.participant_id === activeItem.id && (r.event_id === quickRegData.event_id || r.events?.id === quickRegData.event_id)
                ) && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.4rem', fontWeight: '600' }}>
                    ⚠️ This participant is already registered for this event.
                  </p>
                )}
              </div>

              <div className="admin-form-group">
                <label>Payment / Verification Status</label>
                <select
                  value={quickRegData.payment_status}
                  onChange={e => setQuickRegData({ ...quickRegData, payment_status: e.target.value })}
                  className="admin-select"
                >
                  <option value="verified">Verified (Complimentary / Paid)</option>
                  <option value="waived">Fee Waived</option>
                  <option value="pending">Payment Pending</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setModalType(null)} className="admin-btn admin-btn-secondary">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="admin-btn admin-btn-primary">
                  {isSubmitting ? 'Registering...' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT STAFF / VOLUNTEER PROFILE */}
      {/* ========================================================================= */}
      {modalType === 'editVolunteer' && activeItem && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3>Edit Staff Profile</h3>
              <button onClick={() => setModalType(null)} className="admin-modal-close"><FiX /></button>
            </div>
            <form onSubmit={handleSaveVolunteer}>
              <div className="admin-form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  required
                  value={volunteerFormData.name || ''}
                  onChange={e => setVolunteerFormData({ ...volunteerFormData, name: e.target.value })}
                  className="admin-form-control"
                />
              </div>

              <div className="admin-form-group">
                <label>Username</label>
                <input
                  type="text"
                  required
                  value={volunteerFormData.username || ''}
                  onChange={e => setVolunteerFormData({ ...volunteerFormData, username: e.target.value })}
                  className="admin-form-control"
                />
              </div>

              <div className="admin-form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  required
                  value={volunteerFormData.email || ''}
                  onChange={e => setVolunteerFormData({ ...volunteerFormData, email: e.target.value })}
                  className="admin-form-control"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="admin-form-group">
                  <label>Staff Role</label>
                  <select
                    value={volunteerFormData.role || 'volunteer'}
                    onChange={e => setVolunteerFormData({ ...volunteerFormData, role: e.target.value })}
                    className="admin-select"
                  >
                    <option value="admin">admin (Full Festival Administrator)</option>
                    <option value="registration">registration (Gate Arrival Check-in Desk)</option>
                    <option value="event_staff">event_staff (Event Coordinator)</option>
                    <option value="volunteer">volunteer (General Support)</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>Account Status</label>
                  <select
                    value={volunteerFormData.status || 'active'}
                    onChange={e => setVolunteerFormData({ ...volunteerFormData, status: e.target.value })}
                    className="admin-select"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setModalType(null)} className="admin-btn admin-btn-secondary">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="admin-btn admin-btn-primary">
                  {isSubmitting ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESET FESTIVAL DATA TO ZERO (DANGER ZONE) */}
      {/* ========================================================================= */}
      {modalType === 'resetAllData' && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal-card" style={{ maxWidth: '580px', border: '1px solid rgba(255, 255, 255, 0.4)' }}>
            <div className="admin-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <FiTrash2 style={{ color: '#ffffff', fontSize: '1.25rem' }} />
                <h3 style={{ color: '#ffffff' }}>Reset Festival Data to Zero</h3>
              </div>
              <button onClick={() => { setModalType(null); setResetConfirmWord(''); }} className="admin-modal-close"><FiX /></button>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff', fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '0.4rem' }}>
                <FiAlertCircle size={18} />
                <span>CRITICAL ACTION: ZERO OUT FESTIVAL DATA</span>
              </div>
              <p style={{ color: '#a1a1aa', fontSize: '0.84rem', margin: 0, lineHeight: 1.5 }}>
                This operation wipes test data and resets festival attendee records and live counters back to 0. 
                Administrator accounts and core system configurations are preserved.
              </p>
            </div>

            <form onSubmit={handleResetFestivalDataToZero}>
              {/* Impact Breakdown Table */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#a1a1aa', letterSpacing: '0.05em', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
                  Select Tables to Wipe to Zero:
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: '#121214',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input
                        type="checkbox"
                        checked={resetOptions.participants}
                        onChange={e => setResetOptions({ ...resetOptions, participants: e.target.checked })}
                      />
                      <div>
                        <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.88rem' }}>Participants (public.participants)</div>
                        <div style={{ color: '#a1a1aa', fontSize: '0.75rem' }}>Attendee profiles, identity codes, college metadata</div>
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#ffffff', fontWeight: 'bold', fontSize: '0.85rem' }}>
                      {participants.length} → 0
                    </span>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: '#121214',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input
                        type="checkbox"
                        checked={resetOptions.registrations}
                        onChange={e => setResetOptions({ ...resetOptions, registrations: e.target.checked })}
                      />
                      <div>
                        <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.88rem' }}>Registrations (public.registrations)</div>
                        <div style={{ color: '#a1a1aa', fontSize: '0.75rem' }}>Event enrollments, slot assignments, payment verifications</div>
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#ffffff', fontWeight: 'bold', fontSize: '0.85rem' }}>
                      {registrations.length} → 0
                    </span>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: '#121214',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input
                        type="checkbox"
                        checked={resetOptions.arrivals}
                        onChange={e => setResetOptions({ ...resetOptions, arrivals: e.target.checked })}
                      />
                      <div>
                        <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.88rem' }}>Gate Check-Ins (public.arrival_checkins)</div>
                        <div style={{ color: '#a1a1aa', fontSize: '0.75rem' }}>Main entrance arrival check-in verification log</div>
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#ffffff', fontWeight: 'bold', fontSize: '0.85rem' }}>
                      {arrivalCheckins.length} → 0
                    </span>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: '#121214',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input
                        type="checkbox"
                        checked={resetOptions.attendance}
                        onChange={e => setResetOptions({ ...resetOptions, attendance: e.target.checked })}
                      />
                      <div>
                        <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.88rem' }}>Event Room Attendance (public.event_attendance)</div>
                        <div style={{ color: '#a1a1aa', fontSize: '0.75rem' }}>In-session venue attendance marked by coordinators</div>
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#ffffff', fontWeight: 'bold', fontSize: '0.85rem' }}>
                      {eventAttendance.length} → 0
                    </span>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: '#121214',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input
                        type="checkbox"
                        checked={resetOptions.events}
                        onChange={e => setResetOptions({ ...resetOptions, events: e.target.checked })}
                      />
                      <div>
                        <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '0.88rem' }}>Events Catalog (public.events)</div>
                        <div style={{ color: '#71717a', fontSize: '0.75rem' }}>Leave unchecked to keep all festival competition definitions</div>
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#71717a', fontSize: '0.85rem' }}>
                      {resetOptions.events ? `${events.length} → 0` : 'Kept safe'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Safeguard Input */}
              <div className="admin-form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ color: '#ffffff', fontSize: '0.85rem' }}>
                  To confirm, type <strong style={{ letterSpacing: '0.1em', background: 'rgba(255, 255, 255, 0.12)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>RESET</strong> below:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Type RESET"
                  value={resetConfirmWord}
                  onChange={e => setResetConfirmWord(e.target.value)}
                  className="admin-form-control"
                  style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', fontWeight: 'bold' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => { setModalType(null); setResetConfirmWord(''); }} 
                  className="admin-btn admin-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting || resetConfirmWord.trim().toUpperCase() !== 'RESET'}
                  className="admin-btn admin-btn-danger"
                  style={{
                    opacity: (resetConfirmWord.trim().toUpperCase() === 'RESET' && !isResetting) ? 1 : 0.4,
                    cursor: (resetConfirmWord.trim().toUpperCase() === 'RESET' && !isResetting) ? 'pointer' : 'not-allowed',
                    border: '1px solid #ffffff'
                  }}
                >
                  {isResetting ? 'Zeroing Out Data...' : 'RESET ALL DATA TO ZERO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        {/* Global Toast */}
        {toast && (
          <div className={`admin-toast admin-toast-${toast.type}`}>
            {toast.type === 'success' ? <FiCheck /> : <FiAlertCircle />}
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
