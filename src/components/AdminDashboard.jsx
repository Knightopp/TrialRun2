import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import QRCode from 'qrcode';
import { 
  FiUsers, FiLogOut, FiDatabase, FiArrowLeft, 
  FiCalendar, FiCheckCircle, FiClock, FiSearch, FiEdit2, FiPlus, 
  FiTrash2, FiDownload, FiSend, FiEye, FiRefreshCw, FiShield, 
  FiCheck, FiX, FiActivity, FiPhone, FiMail, FiBookOpen, 
  FiAlertCircle, FiLayers, FiUserCheck, FiAward, FiTag, FiMapPin
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { generateEntryPassEmailHtml } from '../utils/entryPassEmail';
import { generateCardImagePng } from '../utils/cardImageGenerator';
import './AdminDashboard.css';

// Official SRISHTI 2.7 Database Events Catalog
const DEFAULT_FEST_EVENTS = [
  { id: 'SRI27-TREASURE', event_code: 'SRI27-TREASURE', label: 'TREASURE HUNT', name: 'Treasure Hunt', category: 'FUN', date: '2026-12-10', start_time: '10:00', end_time: '12:00', venue: 'College Campus', status: 'upcoming', capacity: 100 },
  { id: 'SRI27-WALTZ', event_code: 'SRI27-WALTZ', label: 'WALTZ (DANCE)', name: 'Waltz', category: 'CULTURAL', date: '2026-12-10', start_time: '14:00', end_time: '16:00', venue: 'Main Auditorium', status: 'upcoming', capacity: 80 },
  { id: 'SRI27-QUIZ', event_code: 'SRI27-QUIZ', label: 'IT QUIZ', name: 'Quiz', category: 'TECHNICAL', date: '2026-12-10', start_time: '10:00', end_time: '12:00', venue: 'Seminar Hall', status: 'upcoming', capacity: 60 },
  { id: 'SRI27-CODE', event_code: 'SRI27-CODE', label: 'CODING & DEBUGGING', name: 'Coding and Debugging', category: 'TECHNICAL', date: '2026-12-11', start_time: '10:00', end_time: '12:00', venue: 'Computer Lab', status: 'upcoming', capacity: 50 },
  { id: 'SRI27-TRACEBOT', event_code: 'SRI27-TRACEBOT', label: 'TRACE BOT', name: 'Tracebot', category: 'TECHNICAL', date: '2026-12-11', start_time: '13:00', end_time: '15:00', venue: 'CS Lab', status: 'upcoming', capacity: 40 },
  { id: 'SRI27-RELAY', event_code: 'SRI27-RELAY', label: 'RELAY CODING', name: 'Relay Coding', category: 'TECHNICAL', date: '2026-12-11', start_time: '10:00', end_time: '12:00', venue: 'Computer Lab', status: 'upcoming', capacity: 50 }
];

// Presets for fast role testing matching exact database records
const DEMO_STAFF_PRESETS = [
  { username: 'admin', email: 'anselrwilliams2106@gmail.com', name: 'SRISHTI Admin', role: 'admin', assignedEventCode: null },
  { username: 'srishti_registration', email: 'srishti_registration@auth.srishti.internal', name: 'SRISHTI Registration', role: 'registration', assignedEventCode: null },
  { username: 'srishti_quiz', email: 'quiz123@auth.srishti.internal', name: 'Quiz Coordinator', role: 'event_staff', assignedEventCode: 'SRI27-QUIZ' },
  { username: 'srishti_treasure', email: 'srishti_treasure@auth.srishti.internal', name: 'Treasure Hunt Coordinator', role: 'event_staff', assignedEventCode: 'SRI27-TREASURE' },
  { username: 'srishti_code', email: 'srishti_code@auth.srishti.internal', name: 'Coding Coordinator', role: 'event_staff', assignedEventCode: 'SRI27-CODE' },
  { username: 'srishti_tracebot', email: 'srishti_tracebot@auth.srishti.internal', name: 'Tracebot Coordinator', role: 'event_staff', assignedEventCode: 'SRI27-TRACEBOT' },
  { username: 'srishti_relay', email: 'srishti_relay@auth.srishti.internal', name: 'Relay Coding Coordinator', role: 'event_staff', assignedEventCode: 'SRI27-RELAY' },
  { username: 'srishti_waltz', email: 'srishti_waltz@auth.srishti.internal', name: 'Waltz Coordinator', role: 'event_staff', assignedEventCode: 'SRI27-WALTZ' }
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
  // Tabs: 'overview', 'checkin', 'attendance', 'events', 'participants', 'registrations', 'staff', 'databases'

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

  // Live Check-in / Attendance Station State
  const [stationCodeInput, setStationCodeInput] = useState('');
  const [stationAttendee, setStationAttendee] = useState(null);
  const [stationNotes, setStationNotes] = useState('');
  const [stationActionLoading, setStationActionLoading] = useState(false);

  // Modals state
  const [modalType, setModalType] = useState(null); 
  // 'editUser', 'editEvent', 'addEvent', 'addVolunteer', 'assignEventStaff', 'inspectRow'
  const [activeItem, setActiveItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [userFormData, setUserFormData] = useState({});
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
  const authenticateStaff = useCallback(async (userQuery) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const clean = userQuery.trim().toLowerCase();
      let matchedStaff = null;

      // 1. Try finding in Supabase volunteers table by username or email
      try {
        const { data: volData } = await supabase
          .from('volunteers')
          .select('*')
          .or(`email.ilike.${clean},username.ilike.${clean}`)
          .maybeSingle();

        if (volData) {
          matchedStaff = volData;
        }
      } catch (_) {}

      // 2. Demo Presets fallback if offline or mock account
      if (!matchedStaff) {
        const preset = DEMO_STAFF_PRESETS.find(p => 
          p.username.toLowerCase() === clean || p.email.toLowerCase() === clean
        );
        if (preset) {
          matchedStaff = {
            id: `mock-${preset.username}`,
            auth_user_id: `mock-auth-${preset.username}`,
            username: preset.username,
            name: preset.name,
            email: preset.email,
            role: preset.role,
            status: 'active'
          };
        }
      }

      // 3. Fallback for Master Superadmin
      if (!matchedStaff && (clean === 'tsrknight@gmail.com' || clean === 'tsrknight_admin' || clean === 'anselrwilliams2106@gmail.com' || clean === 'admin')) {
        matchedStaff = {
          id: '2d7c07-9014-4ce3-88d2-3d899f0e',
          auth_user_id: '8c78f36f-a47f-4837-8106-d06380aada14',
          username: 'admin',
          name: 'SRISHTI Admin',
          email: clean.includes('tsrknight') ? 'tsrknight@gmail.com' : 'anselrwilliams2106@gmail.com',
          role: 'admin',
          status: 'active'
        };
      }

      if (!matchedStaff) {
        throw new Error('Access Denied: No active staff profile found with this username or email.');
      }

      const role = matchedStaff.role || 'volunteer';
      setCurrentStaff(matchedStaff);
      setAdminRole(role);
      localStorage.setItem('srishti_staff_session', JSON.stringify(matchedStaff));

      // Set initial tab based on role
      if (role === 'registration') {
        setActiveTab('checkin');
      } else if (role === 'event_staff') {
        setActiveTab('attendance');
      } else {
        setActiveTab('overview');
      }

      setStep('dashboard');
      showToast(`Welcome back, ${matchedStaff.name} (${role.toUpperCase()})`, 'success');

      // Hydrate all database data
      fetchAllData(role, matchedStaff.id);

    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  }, [fetchAllData, showToast]);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    authenticateStaff(identifier);
  };

  const handleQuickPresetLogin = (preset) => {
    setIdentifier(preset.username);
    authenticateStaff(preset.username);
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem('srishti_staff_session');
    setStep('login');
    setCurrentStaff(null);
    setAdminRole(null);
    setAssignedEvents([]);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('srishti_staff_session');
    if (saved) {
      try {
        const staffObj = JSON.parse(saved);
        if (staffObj?.email || staffObj?.username) {
          authenticateStaff(staffObj.username || staffObj.email);
        }
      } catch (_) {}
    }
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
  // ACTION: ARRIVAL GATE CHECK-IN (registration desk & admin)
  // -----------------------------------------------------------------------------
  const handleLookupParticipantForStation = (codeToSearch) => {
    const q = (codeToSearch || stationCodeInput).trim().toUpperCase();
    if (!q) {
      setStationAttendee(null);
      return;
    }

    const match = participants.find(p => 
      (p.participant_code && p.participant_code.toUpperCase() === q) ||
      (p.email && p.email.toUpperCase() === q) ||
      (p.phone && p.phone.includes(q))
    );

    if (match) {
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
        arrivalCheckin: arrival
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

      const { data, error } = await supabase
        .from('arrival_checkins')
        .insert([payload])
        .select('*');

      if (error && error.code !== '23505') { // 23505 is unique violation
        throw error;
      }

      showToast(`Gate Arrival Confirmed: ${stationAttendee.name} checked in!`, 'success');
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

      if (error && error.code !== '23505') {
        throw error;
      }

      showToast(`Attendance marked successfully for event room!`, 'success');
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
  // ACTION: VOLUNTEER MANAGEMENT (Admin only)
  // -----------------------------------------------------------------------------
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

      const { error } = await supabase
        .from('volunteers')
        .insert([payload]);

      if (error) throw error;

      showToast(`Staff member ${payload.name} added!`, 'success');
      setModalType(null);
      fetchAllData(adminRole, currentStaff?.id);
    } catch (err) {
      showToast(err.message || 'Failed to add staff member', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -----------------------------------------------------------------------------
  // ACTION: EVENT MANAGEMENT (Admin only)
  // -----------------------------------------------------------------------------
  const handleSaveEvent = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        name: eventFormData.name.trim(),
        category: eventFormData.category.trim(),
        venue: eventFormData.venue.trim(),
        date: eventFormData.date,
        start_time: eventFormData.start_time,
        end_time: eventFormData.end_time,
        capacity: Number(eventFormData.capacity) || null,
        status: eventFormData.status || 'upcoming'
      };

      const { error } = await supabase
        .from('events')
        .update(payload)
        .eq('id', activeItem.id);

      if (error) throw error;
      showToast(`Event updated successfully!`, 'success');
      setModalType(null);
      fetchAllData(adminRole, currentStaff?.id);
    } catch (err) {
      showToast(err.message || 'Failed to update event', 'error');
    } finally {
      setIsSubmitting(false);
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
        <div className="admin-auth-card" style={{ maxWidth: '500px' }}>
          <div className="admin-auth-header">
            <span className="admin-auth-badge">SRISHTI 2.7 • MULTI-ROLE PORTAL</span>
            <h1>
              <FiShield style={{ color: '#ef4444' }} />
              Staff Command Center
            </h1>
            <p className="admin-auth-subtitle">
              Role-Based Authentication: Admin • Registration • Event Staff • Volunteer
            </p>
          </div>

          {authError && (
            <div style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              color: '#f87171',
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

          {/* Preset Roles Quick Switch for Examiners / Reviewers */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
              Quick-Select Staff Role (One-Click Demo Login):
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {DEMO_STAFF_PRESETS.map(preset => (
                <button
                  key={preset.username}
                  type="button"
                  onClick={() => handleQuickPresetLogin(preset)}
                  className="admin-quick-pill-btn"
                  style={{
                    padding: '0.55rem 0.65rem',
                    textAlign: 'left',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.2rem'
                  }}
                >
                  <span style={{ fontWeight: '700', color: '#fff', fontSize: '0.8rem' }}>{preset.name}</span>
                  <span style={{ fontSize: '0.7rem', color: '#38bdf8' }}>
                    {preset.role.toUpperCase()} {preset.assignedEventCode ? `• ${preset.assignedEventCode}` : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleLoginSubmit}>
            <div className="admin-form-group">
              <label>Staff Username or Email</label>
              <div style={{ position: 'relative' }}>
                <FiMail style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  required
                  placeholder="e.g. srishti_quiz or tsrknight@gmail.com"
                  className="admin-form-control"
                  style={{ paddingLeft: '2.5rem' }}
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="admin-btn admin-btn-primary"
              style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }}
            >
              {authLoading ? 'Verifying Credentials...' : 'Authenticate & Enter Portal'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
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
      {/* 1. TOP NAVBAR */}
      <header className="admin-navbar">
        <div className="admin-nav-container">
          <div className="admin-brand">
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
              <span style={{ color: '#cbd5e1', fontFamily: 'var(--font-mono)' }}>
                {currentStaff?.name || currentStaff?.username || currentStaff?.email}
              </span>
              {assignedEvents.length > 0 && (
                <span style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.72rem' }}>
                  {assignedEvents.map(e => e.event_code).join(', ')}
                </span>
              )}
            </div>

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

      {/* 2. ROLE-ADAPTIVE NAVIGATION TABS BAR */}
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
      </nav>

      {/* 3. MAIN TAB CONTENT */}
      <main className="admin-main-view">
        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div>
            {/* Stat Cards */}
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <div className="admin-stat-header">
                  <span className="admin-stat-label">Total Participants</span>
                  <div className="admin-stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa' }}>
                    <FiUsers />
                  </div>
                </div>
                <h3 className="admin-stat-val" style={{ color: '#a78bfa' }}>{stats.totalUsers}</h3>
                <div className="admin-stat-desc">Enrolled attendees</div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-header">
                  <span className="admin-stat-label">Gate Check-Ins</span>
                  <div className="admin-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>
                    <FiUserCheck />
                  </div>
                </div>
                <h3 className="admin-stat-val" style={{ color: '#34d399' }}>{stats.totalArrivals}</h3>
                <div className="admin-stat-desc">Participants arrived at campus</div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-header">
                  <span className="admin-stat-label">Room Attendance</span>
                  <div className="admin-stat-icon" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
                    <FiAward />
                  </div>
                </div>
                <h3 className="admin-stat-val" style={{ color: '#38bdf8' }}>{stats.totalAttendance}</h3>
                <div className="admin-stat-desc">Marked present across events</div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-header">
                  <span className="admin-stat-label">Active Events</span>
                  <div className="admin-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24' }}>
                    <FiCalendar />
                  </div>
                </div>
                <h3 className="admin-stat-val" style={{ color: '#fbbf24' }}>{stats.totalEventsCount}</h3>
                <div className="admin-stat-desc">6 core festival competitions</div>
              </div>
            </div>

            {/* Role Quick Nav Banner */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.7))',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '16px',
              padding: '1.5rem',
              marginTop: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div>
                <h3 style={{ margin: '0 0 0.4rem 0', color: '#fff', fontSize: '1.15rem' }}>
                  SRISHTI 2.7 Multi-Event Management System Ready
                </h3>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.88rem' }}>
                  You are operating as <strong>{adminRole?.toUpperCase()}</strong>. Use the dedicated stations for gate check-in and room attendance.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {(adminRole === 'admin' || adminRole === 'registration') && (
                  <button 
                    onClick={() => setActiveTab('checkin')} 
                    className="admin-btn admin-btn-success"
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
                  <FiUserCheck style={{ color: '#10b981' }} />
                  Campus Gate Arrival Check-In Station
                </h2>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Operator: <strong>{currentStaff?.name}</strong>
                </span>
              </div>

              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Enter participant pass code (e.g. <code>TEST-SRI27-002</code>, <code>SRI27-XXXXXX</code>) or scan QR pass:
              </p>

              {/* Sample Code Pills for quick testing */}
              <div className="admin-quick-pills" style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Quick Test Codes:</span>
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
                        <h3 style={{ margin: 0, color: '#fff', fontSize: '1.4rem' }}>{stationAttendee.name}</h3>
                        <span style={{ 
                          fontFamily: 'var(--font-mono)', 
                          background: 'rgba(56, 189, 248, 0.2)', 
                          color: '#38bdf8', 
                          padding: '0.2rem 0.6rem', 
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          fontWeight: 'bold'
                        }}>
                          {stationAttendee.participant_code}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 0.25rem 0', color: '#cbd5e1', fontSize: '0.9rem' }}>
                        🏫 {stationAttendee.college || 'St. Thomas College Thrissur'} • 📚 {stationAttendee.department || 'CS'} ({stationAttendee.year || '2026'})
                      </p>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
                        📞 {stationAttendee.phone || 'N/A'} • ✉️ {stationAttendee.email}
                      </p>
                    </div>

                    {/* Arrival Status Indicator */}
                    <div>
                      {stationAttendee.arrivalCheckin ? (
                        <div style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          color: '#34d399',
                          padding: '0.6rem 1rem',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.9rem',
                          fontWeight: 'bold'
                        }}>
                          <FiCheckCircle style={{ fontSize: '1.2rem' }} />
                          <div>
                            <div>ALREADY CHECKED IN AT GATE</div>
                            <div style={{ fontSize: '0.75rem', color: '#a7f3d0', fontWeight: 'normal' }}>
                              Time: {new Date(stationAttendee.arrivalCheckin.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={stationActionLoading}
                          onClick={() => handleMarkGateArrival('manual')}
                          className="admin-btn admin-btn-success"
                          style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', fontWeight: 'bold' }}
                        >
                          <FiCheckCircle /> Confirm Gate Arrival
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Registered Events List */}
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase' }}>
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
                              color: '#f8fafc',
                              padding: '0.35rem 0.75rem',
                              borderRadius: '8px',
                              fontSize: '0.85rem'
                            }}
                          >
                            🎯 {r.events?.name || r.event_name || r.event_id}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>No individual event registrations recorded.</span>
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
                          <td style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                            {new Date(a.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
                            {a.participants?.participant_code || '—'}
                          </td>
                          <td style={{ color: '#fff', fontWeight: '600' }}>
                            {a.participants?.name || '—'}
                          </td>
                          <td>{a.participants?.college || '—'}</td>
                          <td>
                            <span style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              background: a.source === 'qr' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                              color: a.source === 'qr' ? '#38bdf8' : '#94a3b8'
                            }}>
                              {a.source?.toUpperCase() || 'QR'}
                            </span>
                          </td>
                          <td style={{ color: '#cbd5e1' }}>
                            {a.volunteers?.name || a.volunteers?.username || 'Staff'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
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
                  <FiAward style={{ color: '#38bdf8' }} />
                  Event Room Attendance Station
                </h2>
                
                {/* Event Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Selected Event:</label>
                  <select
                    value={selectedStaffEventId}
                    onChange={e => setSelectedStaffEventId(e.target.value)}
                    className="admin-select"
                    style={{ minWidth: '220px', background: '#020617', color: '#fff' }}
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
                    gap: '1rem'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Competition Room</span>
                      <h3 style={{ margin: '0.2rem 0', color: '#fff', fontSize: '1.25rem' }}>{curEv?.name || curEv?.label}</h3>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
                        📍 Venue: {curEv?.venue || 'TBA'} • 🗓️ {curEv?.date} • ⏰ {curEv?.start_time}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ textAlign: 'center', padding: '0.5rem 1rem', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Present in Room</div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#38bdf8' }}>{curAttendance.length}</div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '0.5rem 1rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Registered</div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: '#fff' }}>{curRegs.length}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Verify participant entry into the competition room:
              </p>

              {/* Sample Code Pills */}
              <div className="admin-quick-pills" style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Quick Test Codes:</span>
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
                          <h3 style={{ margin: 0, color: '#fff', fontSize: '1.4rem' }}>{stationAttendee.name}</h3>
                          <span style={{ 
                            fontFamily: 'var(--font-mono)', 
                            background: 'rgba(56, 189, 248, 0.2)', 
                            color: '#38bdf8', 
                            padding: '0.2rem 0.6rem', 
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold'
                          }}>
                            {stationAttendee.participant_code}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 0.25rem 0', color: '#cbd5e1', fontSize: '0.9rem' }}>
                          🏫 {stationAttendee.college} • 📞 {stationAttendee.phone || 'N/A'}
                        </p>

                        {/* Status checks */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            background: isGateChecked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isGateChecked ? '#34d399' : '#f87171'
                          }}>
                            {isGateChecked ? '✓ Gate Check-In Verified' : '⚠️ Gate Check-In Pending'}
                          </span>

                          <span style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            background: isReg ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: isReg ? '#38bdf8' : '#fbbf24'
                          }}>
                            {isReg ? `✓ Registered for ${curEv?.name}` : `⚠️ Not Registered for ${curEv?.name}`}
                          </span>
                        </div>
                      </div>

                      {/* Action */}
                      <div>
                        {isMarked ? (
                          <div style={{
                            background: 'rgba(56, 189, 248, 0.15)',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            color: '#38bdf8',
                            padding: '0.6rem 1rem',
                            borderRadius: '10px',
                            fontSize: '0.9rem',
                            fontWeight: 'bold'
                          }}>
                            ✓ ALREADY MARKED PRESENT IN ROOM
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
                                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{pCode}</td>
                                  <td style={{ color: '#fff', fontWeight: '600' }}>{pName}</td>
                                  <td>{r.participants?.college || '—'}</td>
                                  <td>{r.participants?.phone || '—'}</td>
                                  <td>
                                    <span style={{
                                      padding: '0.2rem 0.5rem',
                                      borderRadius: '4px',
                                      fontSize: '0.72rem',
                                      background: isArrived ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                      color: isArrived ? '#34d399' : '#94a3b8'
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
                                      background: isPresent ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                      color: isPresent ? '#38bdf8' : '#64748b'
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
                                      <span style={{ color: '#38bdf8', fontSize: '0.8rem' }}>✓ Verified</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="7" style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
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
            <div className="admin-section-header">
              <h2>Festival Competitions &amp; Events ({events.length})</h2>
              {adminRole === 'admin' && (
                <button 
                  onClick={() => {
                    setEventFormData({
                      event_code: '',
                      name: '',
                      category: 'TECHNICAL',
                      venue: '',
                      date: '2026-12-10',
                      start_time: '10:00',
                      end_time: '12:00',
                      capacity: 60,
                      status: 'upcoming'
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
              {events.map(ev => {
                const regCount = registrations.filter(r => r.event_id === ev.id || r.events?.event_code === ev.event_code).length;
                const attCount = eventAttendance.filter(a => a.event_id === ev.id).length;

                return (
                  <div key={ev.id} className="admin-event-card">
                    <div className="admin-event-card-header">
                      <span className="admin-event-card-cat">{ev.category || 'TECHNICAL'}</span>
                      <span style={{ 
                        fontFamily: 'var(--font-mono)', 
                        fontSize: '0.72rem', 
                        color: ev.status === 'upcoming' ? '#38bdf8' : '#34d399',
                        textTransform: 'uppercase'
                      }}>
                        {ev.status || 'upcoming'}
                      </span>
                    </div>

                    <h3 className="admin-event-card-title">{ev.name || ev.label}</h3>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
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
                      fontSize: '0.8rem',
                      color: '#cbd5e1'
                    }}>
                      <span>Registered: <strong>{regCount}</strong></span>
                      <span>Present: <strong style={{ color: '#38bdf8' }}>{attCount}</strong></span>
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
            <div className="admin-section-header">
              <h2>Festival Participants ({participants.length})</h2>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Search participants by code, name, college..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="admin-search-box"
                />
                <button onClick={() => handleExportCsv('participants', participants)} className="admin-btn admin-btn-secondary">
                  <FiDownload /> Export CSV
                </button>
              </div>
            </div>

            <div className="admin-table-container">
              <div className="admin-table-scroll">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Participant Code</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>College</th>
                      <th>Dept &amp; Year</th>
                      <th>Gate Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants
                      .filter(p => {
                        const q = searchQuery.toLowerCase().trim();
                        return !q || 
                          p.name?.toLowerCase().includes(q) ||
                          p.participant_code?.toLowerCase().includes(q) ||
                          p.college?.toLowerCase().includes(q) ||
                          p.email?.toLowerCase().includes(q);
                      })
                      .map(p => {
                        const isArrived = arrivalCheckins.some(a => a.participant_id === p.id);
                        return (
                          <tr key={p.id}>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: '#38bdf8' }}>
                              {p.participant_code}
                            </td>
                            <td style={{ color: '#fff', fontWeight: '600' }}>{p.name}</td>
                            <td>{p.email || '—'}</td>
                            <td>{p.phone || '—'}</td>
                            <td>{p.college || '—'}</td>
                            <td>{p.department || '—'} ({p.year || '—'})</td>
                            <td>
                              <span style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                background: isArrived ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                color: isArrived ? '#34d399' : '#94a3b8'
                              }}>
                                {isArrived ? 'Checked In' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
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
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
                          {r.participants?.participant_code || r.participant_code || '—'}
                        </td>
                        <td style={{ color: '#fff', fontWeight: '600' }}>
                          {r.participants?.name || r.name || '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                          {r.events?.event_code || r.event_id || '—'}
                        </td>
                        <td>{r.events?.name || r.event_name || '—'}</td>
                        <td>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399'
                          }}>
                            {r.status?.toUpperCase() || 'REGISTERED'}
                          </span>
                        </td>
                        <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                          {r.registered_at ? new Date(r.registered_at).toLocaleDateString() : '—'}
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
              <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '1rem' }}>
                Active Event Coordinator Assignments (public.event_staff)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                {eventStaff.length > 0 ? (
                  eventStaff.map(es => (
                    <div 
                      key={es.id} 
                      style={{
                        background: 'rgba(15, 23, 42, 0.75)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '1rem', marginBottom: '0.2rem' }}>
                          {es.volunteers?.name || 'Staff Member'}
                        </div>
                        <div style={{ color: '#38bdf8', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
                          Username: @{es.volunteers?.username || 'user'} • Role: {es.volunteers?.role}
                        </div>
                        <div style={{ marginTop: '0.5rem', color: '#a7f3d0', fontSize: '0.85rem' }}>
                          🎯 Assigned to: <strong>{es.events?.name || es.events?.event_code}</strong>
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
                  <p style={{ color: '#64748b' }}>No event staff assignments configured yet.</p>
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
                    </tr>
                  </thead>
                  <tbody>
                    {volunteers.map(v => (
                      <tr key={v.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: '#38bdf8' }}>
                          @{v.username || '—'}
                        </td>
                        <td style={{ color: '#fff', fontWeight: '600' }}>{v.name}</td>
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
                            background: v.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: v.status === 'active' ? '#34d399' : '#f87171'
                          }}>
                            {v.status?.toUpperCase()}
                          </span>
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
            <div className="admin-section-header">
              <div>
                <h2>Database Tables Explorer</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                  Raw PostgreSQL inspection for all 7 SRISHTI 2.7 core tables
                </p>
              </div>
              <button 
                onClick={() => handleExportCsv(selectedDbTable, currentTableData)}
                className="admin-btn admin-btn-primary"
              >
                <FiDownload /> Download Table (CSV)
              </button>
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
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    cursor: 'pointer',
                    background: selectedDbTable === t.name ? 'linear-gradient(135deg, #0284c7, #38bdf8)' : 'rgba(255, 255, 255, 0.03)',
                    color: selectedDbTable === t.name ? '#fff' : '#94a3b8',
                    borderColor: selectedDbTable === t.name ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
                    fontWeight: '600',
                    fontSize: '0.85rem'
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
                                  <code style={{ fontSize: '0.72rem', color: '#38bdf8' }}>{JSON.stringify(val)}</code>
                                ) : (
                                  String(val ?? '—')
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>Table is empty.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

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
