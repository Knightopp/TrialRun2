import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import QRCode from 'qrcode';
import { 
  FiUsers, FiLogOut, FiDatabase, FiArrowLeft, 
  FiCalendar, FiCheckCircle, FiClock, FiSearch, FiEdit2, FiPlus, 
  FiTrash2, FiDownload, FiSend, FiEye, FiRefreshCw, FiShield, 
  FiCheck, FiX, FiActivity, FiPhone, FiMail, FiBookOpen, 
  FiAlertCircle, FiLayers
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { generateEntryPassEmailHtml } from '../utils/entryPassEmail';
import { generateCardImagePng } from '../utils/cardImageGenerator';
import './AdminDashboard.css';

// Fest Event Catalog (aligned with client App.jsx)
const DEFAULT_FEST_EVENTS = [
  { id: 'tracebot', label: 'TRACE BOT', category: 'ROBOTICS', group: 'Team Events', date: 'Dec 6, 2026', time: '10:00 AM', venue: 'Main Auditorium' },
  { id: 'treasurehunt', label: 'TREASURE HUNT', category: 'FUN', group: 'Popular', date: 'Dec 7, 2026', time: '01:00 PM', venue: 'Campus Grounds' },
  { id: 'codingdebugging', label: 'CODING & DEBUGGING', category: 'DEV', group: 'Solo Events', date: 'Dec 6, 2026', time: '11:00 AM', venue: 'Lab 1 & 2' },
  { id: 'aiwebsitemaking', label: 'AI WEBSITE MAKING', category: 'DEV', group: 'Popular', date: 'Dec 7, 2026', time: '09:30 AM', venue: 'Lab 3' },
  { id: 'blindcoding', label: 'BLIND CODING', category: 'DEV', group: 'Solo Events', date: 'Dec 6, 2026', time: '02:00 PM', venue: 'Lab 1' },
  { id: 'ideathon', label: 'IDEATHON', category: 'INNOVATION', group: 'Team Events', date: 'Dec 7, 2026', time: '10:30 AM', venue: 'Seminar Hall' },
  { id: 'waltz', label: 'WALTZ (DANCE)', category: 'CULTURE', group: 'Team Events', date: 'Dec 7, 2026', time: '04:00 PM', venue: 'Open Air Theatre' },
  { id: 'mindgame', label: 'MINDGAME', category: 'PUZZLE', group: 'Solo Events', date: 'Dec 6, 2026', time: '03:00 PM', venue: 'Hall B' },
  { id: 'itquiz', label: 'IT QUIZ', category: 'KNOWLEDGE', group: 'Solo Events', date: 'Dec 7, 2026', time: '11:30 AM', venue: 'Audio Visual Hall' },
  { id: 'facepainting', label: 'FACE PAINTING', category: 'ART', group: 'Solo Events', date: 'Dec 6, 2026', time: '12:00 PM', venue: 'Art Quad' },
  { id: 'hackathon', label: 'HACKATHON', category: 'DEV', group: 'Popular', date: 'Dec 6, 2026', time: '05:00 PM', venue: 'Innovation Hub' }
];

export default function AdminDashboard() {
  const navigate = useNavigate();

  // Authentication states
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email'); // 'email', 'otp', 'dashboard'
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [adminRole, setAdminRole] = useState(null); // 'superadmin' or 'coordinator'
  const [adminEventId, setAdminEventId] = useState(null);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'events', 'participants', 'registrations', 'databases'

  // Primary database tables in memory
  const [events, setEvents] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [adminsList, setAdminsList] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDbTable, setSelectedDbTable] = useState('participants');

  // Modals state
  const [modalType, setModalType] = useState(null); // 'editUser', 'assignEvent', 'editEvent', 'addEvent', 'inspectRow', 'editRow'
  const [activeItem, setActiveItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms data
  const [userFormData, setUserFormData] = useState({});
  const [assignFormData, setAssignFormData] = useState({
    eventId: '',
    teamSize: 1,
    teamMembers: '',
    paymentStatus: 'verified',
    sendEmailPass: true
  });
  const [eventFormData, setEventFormData] = useState({});
  const [rowEditData, setRowEditData] = useState({});

  // Toast feedback
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3800);
  }, []);

  // -----------------------------------------------------------------------------
  // DATA HYDRATION
  // -----------------------------------------------------------------------------
  const fetchAllData = useCallback(async (role, scopedEventId) => {
    setIsDataLoading(true);
    try {
      // 1. Fetch Events
      const { data: dbEvents, error: evErr } = await supabase.from('events').select('*');
      if (evErr) console.warn('Events fetch error:', evErr);
      
      const combinedEvents = (dbEvents && dbEvents.length > 0)
        ? dbEvents.map(ev => {
            const matchDefault = DEFAULT_FEST_EVENTS.find(d => d.id === ev.id || d.id === ev.event_code);
            return {
              ...ev,
              label: ev.name || matchDefault?.label || ev.id,
              category: ev.category || matchDefault?.category || 'DEV',
              venue: ev.venue || matchDefault?.venue || 'TBA',
              date: ev.date || matchDefault?.date || 'Dec 6-7, 2026',
              time: ev.start_time || matchDefault?.time || '10:00 AM'
            };
          })
        : DEFAULT_FEST_EVENTS;
      setEvents(combinedEvents);

      // 2. Fetch Participants
      const { data: pData, error: pErr } = await supabase
        .from('participants')
        .select('*')
        .order('created_at', { ascending: false });
      if (!pErr && pData) {
        setParticipants(pData);
      }

      // 3. Fetch Registrations
      let regQuery = supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (role === 'coordinator' && scopedEventId) {
        regQuery = regQuery.eq('event_id', scopedEventId);
      }

      const { data: rData, error: rErr } = await regQuery;
      if (!rErr && rData) {
        setRegistrations(rData);
      }

      // 4. Fetch Event Admins (if superadmin)
      if (role === 'superadmin') {
        const { data: admData } = await supabase.from('event_admins').select('*');
        if (admData) setAdminsList(admData);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
      showToast('Error syncing with database', 'error');
    } finally {
      setIsDataLoading(false);
    }
  }, [showToast]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('srishti_admin_session');
    setStep('email');
    setAdminRole(null);
    setAdminEventId(null);
    setRegistrations([]);
    setParticipants([]);
    setEvents([]);
  }, []);

  // -----------------------------------------------------------------------------
  // AUTHENTICATION & ACCESS VERIFICATION
  // -----------------------------------------------------------------------------
  const verifyAdminAccess = useCallback(async (adminEmail) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { data: adminData, error: adminErr } = await supabase
        .from('event_admins')
        .select('*')
        .eq('email', adminEmail)
        .maybeSingle();

      if (adminErr || !adminData) {
        handleLogout();
        throw new Error('Access denied. No admin record with this email.');
      }

      setAdminRole(adminData.role || 'coordinator');
      setAdminEventId(adminData.event_id || null);
      setStep('dashboard');

      fetchAllData(adminData.role, adminData.event_id);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  }, [fetchAllData, handleLogout]);

  useEffect(() => {
    const savedAdmin = localStorage.getItem('srishti_admin_session');
    if (savedAdmin) {
      verifyAdminAccess(savedAdmin);
    }
  }, [verifyAdminAccess]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    const cleanEmail = email.trim().toLowerCase();
    try {
      const { data: adminData, error: adminErr } = await supabase
        .from('event_admins')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (adminErr || !adminData) {
        throw new Error('Access Denied: This email is not registered as an Admin.');
      }

      const code = Math.floor(1000 + Math.random() * 9000).toString();
      localStorage.setItem('pending_admin_otp', code);
      localStorage.setItem('pending_admin_email', cleanEmail);

      const htmlContent = `
        <div style="font-family: sans-serif; background: #070b14; color: white; padding: 40px; border-radius: 12px; text-align: center; max-width: 500px; margin: 0 auto; border: 1px solid #ff4444;">
          <h2 style="color: #ff4444; letter-spacing: 2px;">SRISHTI 2.7 ADMIN ACCESS</h2>
          <p style="color: #94a3b8; font-size: 15px;">Use the following verification code to access the Admin Command Center:</p>
          <h1 style="font-size: 48px; letter-spacing: 6px; margin: 25px 0; color: #fff; font-family: monospace;">${code}</h1>
          <p style="color: #64748b; font-size: 13px;">If you did not request this verification code, please ignore this email.</p>
        </div>
      `;

      try {
        await fetch('/api/send_email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            to: cleanEmail, 
            subject: 'Srishti 2.7 — Admin Login Verification Code', 
            html: htmlContent 
          })
        });
      } catch (mailErr) {
        console.warn('Mail send notice (local fallback active):', mailErr);
      }

      setStep('otp');
      showToast(`Verification code sent to ${cleanEmail}!`, 'success');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const savedCode = localStorage.getItem('pending_admin_otp');
      const savedEmail = localStorage.getItem('pending_admin_email');

      if (otp.trim() !== savedCode || email.trim().toLowerCase() !== savedEmail) {
        throw new Error('Invalid or expired verification code.');
      }

      localStorage.removeItem('pending_admin_otp');
      localStorage.removeItem('pending_admin_email');
      localStorage.setItem('srishti_admin_session', savedEmail);

      await verifyAdminAccess(savedEmail);
      showToast('Welcome to Srishti 2.7 Admin Center', 'success');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // -----------------------------------------------------------------------------
  // COMPUTED STATS & SUMMARY
  // -----------------------------------------------------------------------------
  const stats = useMemo(() => {
    const totalRegs = registrations.length;
    const verifiedRegs = registrations.filter(r => r.payment_status === 'verified').length;
    const pendingRegs = totalRegs - verifiedRegs;
    const totalUsers = participants.length;
    const totalEventsCount = events.length;

    return {
      totalRegs,
      verifiedRegs,
      pendingRegs,
      totalUsers,
      totalEventsCount
    };
  }, [registrations, participants, events]);

  const participantRegistrationsMap = useMemo(() => {
    const map = {};
    registrations.forEach(reg => {
      const keyId = reg.participant_id;
      const keyCode = reg.participant_code;
      const keyEmail = reg.lead_email?.toLowerCase();

      if (keyId) {
        if (!map[keyId]) map[keyId] = [];
        map[keyId].push(reg);
      }
      if (keyCode) {
        if (!map[keyCode]) map[keyCode] = [];
        map[keyCode].push(reg);
      }
      if (keyEmail) {
        if (!map[keyEmail]) map[keyEmail] = [];
        map[keyEmail].push(reg);
      }
    });
    return map;
  }, [registrations]);

  const eventRegCounts = useMemo(() => {
    const counts = {};
    registrations.forEach(r => {
      const eid = r.event_id;
      if (!counts[eid]) counts[eid] = { count: 0, verified: 0, members: 0 };
      counts[eid].count += 1;
      if (r.payment_status === 'verified') counts[eid].verified += 1;
      counts[eid].members += (Number(r.team_size) || 1);
    });
    return counts;
  }, [registrations]);

  // -----------------------------------------------------------------------------
  // ACTIONS: PARTICIPANT / USER EDITING & MANAGEMENT
  // -----------------------------------------------------------------------------
  const handleOpenEditUser = (participant) => {
    setActiveItem(participant);
    setUserFormData({
      name: participant.name || '',
      email: participant.email || '',
      phone: participant.phone || '',
      college: participant.college || '',
      department: participant.department || '',
      year: participant.year || '',
      participant_code: participant.participant_code || ''
    });
    setModalType('editUser');
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const original = activeItem;
      const updates = {
        name: userFormData.name.trim(),
        email: userFormData.email.trim().toLowerCase(),
        phone: userFormData.phone.trim(),
        college: userFormData.college.trim(),
        department: userFormData.department.trim(),
        year: userFormData.year.trim(),
        participant_code: userFormData.participant_code.trim().toUpperCase()
      };

      const { error: pUpdErr } = await supabase
        .from('participants')
        .update(updates)
        .eq('id', original.id);

      if (pUpdErr) throw pUpdErr;

      // Synchronize matching registrations
      await supabase
        .from('registrations')
        .update({
          lead_name: updates.name,
          lead_email: updates.email,
          lead_phone: updates.phone,
          lead_college: updates.college,
          participant_code: updates.participant_code
        })
        .or(`participant_id.eq.${original.id},lead_email.ilike.${original.email}`);

      showToast(`Participant ${updates.name} updated successfully!`, 'success');
      setModalType(null);
      fetchAllData(adminRole, adminEventId);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to update user', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (participant) => {
    if (!window.confirm(`Are you sure you want to delete participant ${participant.name} (${participant.email})? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', participant.id);

      if (error) throw error;

      showToast(`Participant ${participant.name} removed.`, 'success');
      fetchAllData(adminRole, adminEventId);
    } catch (err) {
      showToast(err.message || 'Failed to delete participant', 'error');
    }
  };

  // -----------------------------------------------------------------------------
  // ACTIONS: ASSIGN EVENT TO PARTICIPANT
  // -----------------------------------------------------------------------------
  const handleOpenAssignEvent = (participant) => {
    setActiveItem(participant);
    setAssignFormData({
      eventId: events[0]?.id || 'tracebot',
      teamSize: 1,
      teamMembers: '',
      paymentStatus: 'verified',
      sendEmailPass: true
    });
    setModalType('assignEvent');
  };

  const handleSaveAssignEvent = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const participant = activeItem;
      const targetEvent = events.find(ev => ev.id === assignFormData.eventId) || events[0];
      const uniqueCode = participant.participant_code || `SR27-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      let membersArray = [];
      if (assignFormData.teamMembers.trim()) {
        membersArray = assignFormData.teamMembers
          .split('\n')
          .filter(m => m.trim().length > 0)
          .map(name => ({ name: name.trim() }));
      }

      const newRegistration = {
        participant_id: participant.id,
        participant_code: uniqueCode,
        event_id: targetEvent.id,
        event_name: targetEvent.label || targetEvent.name,
        team_size: Number(assignFormData.teamSize) || 1,
        lead_name: participant.name,
        lead_college: participant.college || 'St Thomas College',
        lead_email: participant.email,
        lead_phone: participant.phone || '',
        lead_roll: '',
        team_members: membersArray,
        payment_status: assignFormData.paymentStatus
      };

      const { error: regError } = await supabase
        .from('registrations')
        .insert([newRegistration]);

      if (regError) throw regError;

      // Dispatch Entry Pass Email if option checked
      if (assignFormData.sendEmailPass && participant.email) {
        try {
          const qrDataUrl = await QRCode.toDataURL(uniqueCode, {
            width: 260,
            margin: 2,
            color: { dark: '#020617', light: '#ffffff' }
          });

          let cardPng = null;
          try {
            cardPng = await generateCardImagePng({
              attendeeName: participant.name,
              college: participant.college || 'St Thomas College',
              passCode: uniqueCode,
              events: [targetEvent.label || targetEvent.name],
              isVerified: true,
              statusText: 'VERIFIED'
            });
          } catch (pngErr) {
            console.warn('PNG card generation notice:', pngErr);
          }

          const ticketHtml = generateEntryPassEmailHtml({
            attendeeName: participant.name,
            college: participant.college || 'St Thomas College',
            passCode: uniqueCode,
            eventName: targetEvent.label || targetEvent.name,
            status: 'VERIFIED'
          });

          await fetch('/api/send_email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: participant.email,
              subject: `Entry Pass: ${targetEvent.label || targetEvent.name} — Srishti 2.7`,
              html: ticketHtml,
              image: cardPng
            })
          });
        } catch (mailErr) {
          console.warn('Mail send failed in assign:', mailErr);
        }
      }

      showToast(`Assigned ${participant.name} to ${targetEvent.label || targetEvent.name}!`, 'success');
      setModalType(null);
      fetchAllData(adminRole, adminEventId);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to assign event', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -----------------------------------------------------------------------------
  // ACTIONS: REGISTRATIONS MANAGEMENT
  // -----------------------------------------------------------------------------
  const handleTogglePaymentStatus = async (reg) => {
    const newStatus = reg.payment_status === 'verified' ? 'pending' : 'verified';
    try {
      const { error } = await supabase
        .from('registrations')
        .update({ payment_status: newStatus })
        .eq('id', reg.id);

      if (error) throw error;

      showToast(`Registration marked as ${newStatus.toUpperCase()}`, 'success');
      setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, payment_status: newStatus } : r));
    } catch (err) {
      showToast(err.message || 'Failed to update payment status', 'error');
    }
  };

  const handleDeleteRegistration = async (reg) => {
    if (!window.confirm(`Delete registration for ${reg.lead_name} (${reg.event_name})?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('registrations')
        .delete()
        .eq('id', reg.id);

      if (error) throw error;

      showToast('Registration deleted', 'success');
      fetchAllData(adminRole, adminEventId);
    } catch (err) {
      showToast(err.message || 'Failed to delete registration', 'error');
    }
  };

  const handleResendPassEmail = async (reg) => {
    if (!reg.lead_email) {
      showToast('No email found for this registration', 'error');
      return;
    }

    try {
      showToast(`Generating and sending pass to ${reg.lead_email}...`, 'info');
      const uniqueCode = reg.participant_code || reg.id.substring(0, 8);
      const qrDataUrl = await QRCode.toDataURL(uniqueCode, {
        width: 256,
        margin: 2,
        color: { dark: '#020617', light: '#ffffff' }
      });

      let cardPng = null;
      try {
        cardPng = await generateCardImagePng({
          attendeeName: reg.lead_name || 'Participant',
          college: reg.lead_college || 'St Thomas College',
          passCode: uniqueCode,
          events: [reg.event_name || 'FEST PASS'],
          isVerified: reg.payment_status === 'verified' || reg.status === 'verified',
          statusText: (reg.payment_status || reg.status || 'VERIFIED').toUpperCase()
        });
      } catch (pngErr) {
        console.warn('PNG card generation notice:', pngErr);
      }

      const ticketHtml = generateEntryPassEmailHtml({
        attendeeName: reg.lead_name || 'Participant',
        college: reg.lead_college || 'St Thomas College',
        passCode: uniqueCode,
        eventName: reg.event_name || reg.events?.name || 'FEST PASS',
        status: reg.payment_status || reg.status || 'VERIFIED'
      });

      await fetch('/api/send_email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: reg.lead_email,
          subject: `Entry Pass: ${reg.event_name} — Srishti 2.7`,
          html: ticketHtml,
          image: cardPng
        })
      });

      showToast(`Pass email successfully re-sent to ${reg.lead_email}!`, 'success');
    } catch {
      showToast('Failed to send pass email', 'error');
    }
  };

  // -----------------------------------------------------------------------------
  // ACTIONS: EVENTS MANAGEMENT
  // -----------------------------------------------------------------------------
  const handleOpenEditEvent = (event) => {
    setActiveItem(event);
    setEventFormData({
      id: event.id,
      name: event.name || event.label || '',
      category: event.category || 'DEV',
      venue: event.venue || '',
      date: event.date || '',
      start_time: event.time || event.start_time || ''
    });
    setModalType('editEvent');
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        name: eventFormData.name.trim(),
        category: eventFormData.category.trim().toUpperCase(),
        venue: eventFormData.venue.trim(),
        date: eventFormData.date.trim(),
        start_time: eventFormData.start_time.trim()
      };

      const { error } = await supabase
        .from('events')
        .update(payload)
        .eq('id', activeItem.id);

      if (error) throw error;

      showToast(`Event ${payload.name} updated!`, 'success');
      setModalType(null);
      fetchAllData(adminRole, adminEventId);
    } catch (err) {
      showToast(err.message || 'Failed to update event', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAddEvent = () => {
    setEventFormData({
      id: '',
      name: '',
      category: 'DEV',
      venue: '',
      date: '2026-10-06',
      start_time: '10:00 AM'
    });
    setModalType('addEvent');
  };

  const handleSaveAddEvent = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const safeId = eventFormData.id.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!safeId) throw new Error('Valid event ID required');

      const payload = {
        id: safeId,
        event_code: safeId,
        name: eventFormData.name.trim(),
        category: eventFormData.category.trim().toUpperCase(),
        venue: eventFormData.venue.trim() || 'TBA',
        date: eventFormData.date.trim() || '2026-10-06',
        start_time: eventFormData.start_time.trim() || '10:00 AM'
      };

      const { error } = await supabase
        .from('events')
        .insert([payload]);

      if (error) throw error;

      showToast(`New Event ${payload.name} created!`, 'success');
      setModalType(null);
      fetchAllData(adminRole, adminEventId);
    } catch (err) {
      showToast(err.message || 'Failed to add event', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -----------------------------------------------------------------------------
  // ACTIONS: DATABASE EXPLORER & CSV EXPORT
  // -----------------------------------------------------------------------------
  const handleExportCsv = (tableName, data) => {
    if (!data || data.length === 0) {
      showToast('No rows to export for this table', 'error');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(field => {
          let val = row[field];
          if (val === null || val === undefined) return '""';
          if (typeof val === 'object') val = JSON.stringify(val);
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(',')
      )
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `srishti_${tableName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${tableName}.csv successfully!`, 'success');
  };

  const handleInspectRow = (row) => {
    setActiveItem(row);
    setModalType('inspectRow');
  };

  const handleOpenEditRow = (row) => {
    setActiveItem(row);
    setRowEditData({ ...row });
    setModalType('editRow');
  };

  const handleSaveEditRow = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const primaryKey = activeItem.id ? 'id' : (activeItem.email ? 'email' : 'username');
      const targetId = activeItem[primaryKey];

      const cleanPayload = { ...rowEditData };
      delete cleanPayload.id;

      const { error } = await supabase
        .from(selectedDbTable)
        .update(cleanPayload)
        .eq(primaryKey, targetId);

      if (error) throw error;

      showToast(`Record updated in ${selectedDbTable}!`, 'success');
      setModalType(null);
      fetchAllData(adminRole, adminEventId);
    } catch (err) {
      showToast(err.message || 'Failed to update record', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDbRow = async (row) => {
    if (!window.confirm(`Are you sure you want to delete this row from ${selectedDbTable}?`)) {
      return;
    }

    try {
      const primaryKey = row.id ? 'id' : (row.email ? 'email' : 'username');
      const targetId = row[primaryKey];

      const { error } = await supabase
        .from(selectedDbTable)
        .delete()
        .eq(primaryKey, targetId);

      if (error) throw error;

      showToast('Record deleted from table', 'success');
      fetchAllData(adminRole, adminEventId);
    } catch (err) {
      showToast(err.message || 'Failed to delete row', 'error');
    }
  };

  // -----------------------------------------------------------------------------
  // FILTERED DATA VIEWS
  // -----------------------------------------------------------------------------
  const filteredParticipants = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return participants.filter(p => {
      const matchesSearch = !q || 
        p.name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q) ||
        p.college?.toLowerCase().includes(q) ||
        p.participant_code?.toLowerCase().includes(q);

      return matchesSearch;
    });
  }, [participants, searchQuery]);

  const filteredRegistrations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return registrations.filter(r => {
      const matchesEvent = eventFilter === 'all' || r.event_id === eventFilter;
      const matchesStatus = statusFilter === 'all' || r.payment_status === statusFilter;
      const matchesSearch = !q ||
        r.lead_name?.toLowerCase().includes(q) ||
        r.lead_email?.toLowerCase().includes(q) ||
        r.lead_phone?.toLowerCase().includes(q) ||
        r.participant_code?.toLowerCase().includes(q) ||
        r.event_name?.toLowerCase().includes(q);

      return matchesEvent && matchesStatus && matchesSearch;
    });
  }, [registrations, eventFilter, statusFilter, searchQuery]);

  const currentTableData = useMemo(() => {
    switch (selectedDbTable) {
      case 'participants': return participants;
      case 'registrations': return registrations;
      case 'events': return events;
      case 'event_admins': return adminsList;
      default: return [];
    }
  }, [selectedDbTable, participants, registrations, events, adminsList]);

  const filteredDbRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return currentTableData;

    return currentTableData.filter(row => {
      return Object.values(row).some(val => 
        String(val).toLowerCase().includes(q)
      );
    });
  }, [currentTableData, searchQuery]);

  // -----------------------------------------------------------------------------
  // RENDER: LOGIN FLOW (EMAIL OTP ONLY)
  // -----------------------------------------------------------------------------
  if (step !== 'dashboard') {
    return (
      <div className="admin-auth-wrapper">
        <div className="admin-auth-card">
          <div className="admin-auth-header">
            <span className="admin-auth-badge">SECURE PORTAL</span>
            <h1>
              <FiShield style={{ color: '#ef4444' }} />
              Admin Center
            </h1>
            <p className="admin-auth-subtitle">
              Srishti 2.7 Multi-Event Management &amp; Database Administration
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

          {step === 'email' ? (
            <form onSubmit={handleSendOtp}>
              <div className="admin-form-group">
                <label>Admin Email Address</label>
                <div style={{ position: 'relative' }}>
                  <FiMail style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="e.g. tsrknight@gmail.com"
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
                {authLoading ? 'Verifying Admin Record...' : 'Send Access OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <div className="admin-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ margin: 0 }}>4-Digit Passcode</label>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Sent to: {email}</span>
                </div>
                <input
                  type="text"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  required
                  maxLength="4"
                  placeholder="••••"
                  className="admin-form-control"
                  style={{
                    letterSpacing: '8px',
                    textAlign: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    fontFamily: 'var(--font-mono)'
                  }}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="admin-btn admin-btn-primary"
                style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }}
              >
                {authLoading ? 'Authenticating...' : 'Confirm & Enter Dashboard'}
              </button>

              <button
                type="button"
                onClick={() => setStep('email')}
                className="admin-btn admin-btn-secondary"
                style={{ width: '100%', marginTop: '0.75rem' }}
              >
                Use Different Email
              </button>
            </form>
          )}

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
  // RENDER: MAIN ADMIN DASHBOARD
  // -----------------------------------------------------------------------------
  return (
    <div className="admin-portal-root">
      {/* 1. TOP NAVIGATION BAR */}
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
              <span className={`admin-role-tag ${adminRole === 'superadmin' ? 'admin-role-super' : 'admin-role-coord'}`}>
                {adminRole === 'superadmin' ? 'Super Admin' : `Coordinator: ${adminEventId}`}
              </span>
              <span style={{ color: '#cbd5e1', fontFamily: 'var(--font-mono)' }}>
                {localStorage.getItem('srishti_admin_session')}
              </span>
            </div>

            <button 
              onClick={() => fetchAllData(adminRole, adminEventId)}
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

      {/* 2. DASHBOARD TABS BAR */}
      <nav className="admin-tabs-bar">
        <button
          onClick={() => { setActiveTab('overview'); setSearchQuery(''); }}
          className={`admin-tab-item ${activeTab === 'overview' ? 'active' : ''}`}
        >
          <FiActivity />
          <span>Overview</span>
        </button>

        <button
          onClick={() => { setActiveTab('events'); setSearchQuery(''); }}
          className={`admin-tab-item ${activeTab === 'events' ? 'active' : ''}`}
        >
          <FiCalendar />
          <span>Events Section</span>
          <span className="admin-tab-counter">{events.length}</span>
        </button>

        <button
          onClick={() => { setActiveTab('participants'); setSearchQuery(''); }}
          className={`admin-tab-item ${activeTab === 'participants' ? 'active' : ''}`}
        >
          <FiUsers />
          <span>Participants Section</span>
          <span className="admin-tab-counter">{participants.length}</span>
        </button>

        <button
          onClick={() => { setActiveTab('registrations'); setSearchQuery(''); }}
          className={`admin-tab-item ${activeTab === 'registrations' ? 'active' : ''}`}
        >
          <FiCheckCircle />
          <span>Registrations</span>
          <span className="admin-tab-counter">{registrations.length}</span>
        </button>

        <button
          onClick={() => { setActiveTab('databases'); setSearchQuery(''); }}
          className={`admin-tab-item ${activeTab === 'databases' ? 'active' : ''}`}
        >
          <FiDatabase />
          <span>Databases &amp; Tables</span>
          <span className="admin-tab-counter">4 Tables</span>
        </button>
      </nav>

      {/* 3. MAIN TAB CONTENT */}
      <main className="admin-main-view">
        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div>
            {/* Stat Summary Cards */}
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <div className="admin-stat-header">
                  <span className="admin-stat-label">Total Registrations</span>
                  <div className="admin-stat-icon" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
                    <FiCheckCircle />
                  </div>
                </div>
                <h3 className="admin-stat-val">{stats.totalRegs}</h3>
                <div className="admin-stat-desc">Across all festival events</div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-header">
                  <span className="admin-stat-label">Verified Passes</span>
                  <div className="admin-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>
                    <FiShield />
                  </div>
                </div>
                <h3 className="admin-stat-val" style={{ color: '#34d399' }}>{stats.verifiedRegs}</h3>
                <div className="admin-stat-desc">{stats.pendingRegs} pending approval</div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-header">
                  <span className="admin-stat-label">Total Participants</span>
                  <div className="admin-stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa' }}>
                    <FiUsers />
                  </div>
                </div>
                <h3 className="admin-stat-val" style={{ color: '#a78bfa' }}>{stats.totalUsers}</h3>
                <div className="admin-stat-desc">Unique attendee accounts</div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-header">
                  <span className="admin-stat-label">Active Events</span>
                  <div className="admin-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24' }}>
                    <FiCalendar />
                  </div>
                </div>
                <h3 className="admin-stat-val" style={{ color: '#fbbf24' }}>{stats.totalEventsCount}</h3>
                <div className="admin-stat-desc">Fest competitions &amp; tracks</div>
              </div>
            </div>

            {/* Quick Action Banner */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.7))',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div>
                <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.2rem', color: '#fff' }}>
                  Admin Quick Controls
                </h3>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.88rem' }}>
                  Quickly manage participants, assign event slots, or export attendee rosters to Excel/CSV.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setActiveTab('participants'); }}
                  className="admin-btn admin-btn-primary"
                >
                  <FiUsers /> Manage Participants
                </button>
                <button
                  onClick={() => { setActiveTab('events'); }}
                  className="admin-btn admin-btn-secondary"
                >
                  <FiCalendar /> View Events
                </button>
                <button
                  onClick={() => handleExportCsv('all_registrations', registrations)}
                  className="admin-btn admin-btn-success"
                >
                  <FiDownload /> Export Regs (CSV)
                </button>
              </div>
            </div>

            {/* Event Registration Distribution Overview */}
            <div className="admin-table-container" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.15rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FiActivity style={{ color: '#38bdf8' }} /> Event Registration Breakdown
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {events.map(ev => {
                  const evData = eventRegCounts[ev.id] || { count: 0, verified: 0, members: 0 };
                  const percent = stats.totalRegs ? Math.round((evData.count / stats.totalRegs) * 100) : 0;
                  return (
                    <div 
                      key={ev.id}
                      style={{
                        background: 'rgba(2, 6, 23, 0.4)',
                        border: '1px solid var(--admin-border-subtle)',
                        borderRadius: '12px',
                        padding: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#fff' }}>{ev.label || ev.name}</span>
                        <span className="admin-event-badge">{ev.category}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                        <span>{evData.count} Teams ({evData.members} Members)</span>
                        <span style={{ color: '#34d399' }}>{evData.verified} Verified</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, #0284c7, #38bdf8)', borderRadius: '3px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Registrations Snippet */}
            <div className="admin-table-container">
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--admin-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Recent Registrations</h3>
                <button 
                  onClick={() => setActiveTab('registrations')}
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                >
                  View All Registrations →
                </button>
              </div>

              <div className="admin-table-scroll">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Pass Code</th>
                      <th>Lead Name</th>
                      <th>Event</th>
                      <th>Team Size</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.slice(0, 6).map(reg => (
                      <tr key={reg.id}>
                        <td><span className="admin-code-badge">{reg.participant_code || 'PASS'}</span></td>
                        <td>
                          <div style={{ fontWeight: '600', color: '#fff' }}>{reg.lead_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{reg.lead_email}</div>
                        </td>
                        <td>{reg.event_name}</td>
                        <td>{reg.team_size} Member(s)</td>
                        <td>
                          <span className={`admin-status-pill ${reg.payment_status === 'verified' ? 'admin-status-verified' : 'admin-status-pending'}`}>
                            {reg.payment_status}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleTogglePaymentStatus(reg)}
                            className="admin-btn admin-btn-secondary admin-btn-sm"
                          >
                            Toggle Status
                          </button>
                        </td>
                      </tr>
                    ))}
                    {registrations.length === 0 && (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No registrations recorded yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: EVENTS SECTION */}
        {/* ========================================================================= */}
        {activeTab === 'events' && (
          <div>
            <div className="admin-section-header">
              <div className="admin-section-title-box">
                <h2><FiCalendar style={{ color: '#38bdf8' }} /> Events Directory &amp; Schedules</h2>
                <p className="admin-section-subtitle">
                  Configure event venues, timings, categories, and monitor live registration counts.
                </p>
              </div>

              <div className="admin-controls-row">
                <button
                  onClick={handleOpenAddEvent}
                  className="admin-btn admin-btn-primary"
                >
                  <FiPlus /> New Event
                </button>
                <button
                  onClick={() => handleExportCsv('events', events)}
                  className="admin-btn admin-btn-secondary"
                >
                  <FiDownload /> Export Events
                </button>
              </div>
            </div>

            {/* Events Grid */}
            <div className="admin-events-grid">
              {events.map(ev => {
                const countInfo = eventRegCounts[ev.id] || { count: 0, verified: 0, members: 0 };
                return (
                  <div key={ev.id} className="admin-event-card">
                    <div className="admin-event-card-head">
                      <div>
                        <span className="admin-event-badge">{ev.category || 'EVENT'}</span>
                        <h4 className="admin-event-name" style={{ marginTop: '0.4rem' }}>{ev.label || ev.name}</h4>
                      </div>
                      <div className="admin-event-stat-badge">
                        <FiUsers />
                        <span>{countInfo.count} Registered</span>
                      </div>
                    </div>

                    <div className="admin-event-card-body">
                      <div className="admin-event-meta-list">
                        <div className="admin-event-meta-item">
                          <FiCalendar style={{ color: '#38bdf8' }} />
                          <span>{ev.date || 'Dec 6-7, 2026'}</span>
                        </div>
                        <div className="admin-event-meta-item">
                          <FiClock style={{ color: '#38bdf8' }} />
                          <span>{ev.time || ev.start_time || '10:00 AM'}</span>
                        </div>
                        <div className="admin-event-meta-item">
                          <FiBookOpen style={{ color: '#38bdf8' }} />
                          <span>Venue: {ev.venue || 'TBA'}</span>
                        </div>
                      </div>

                      <div style={{
                        padding: '0.65rem 0.85rem',
                        background: 'rgba(2, 6, 23, 0.5)',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        color: '#94a3b8'
                      }}>
                        <strong>ID:</strong> <code style={{ color: '#38bdf8' }}>{ev.id}</code> &bull; 
                        <strong style={{ marginLeft: '0.5rem' }}>Verified:</strong> <span style={{ color: '#34d399' }}>{countInfo.verified}</span>
                      </div>
                    </div>

                    <div className="admin-event-card-actions">
                      <button
                        onClick={() => {
                          setEventFilter(ev.id);
                          setActiveTab('registrations');
                        }}
                        className="admin-btn admin-btn-secondary admin-btn-sm"
                      >
                        <FiEye /> View Attendees ({countInfo.count})
                      </button>

                      <button
                        onClick={() => handleOpenEditEvent(ev)}
                        className="admin-btn admin-btn-primary admin-btn-sm"
                      >
                        <FiEdit2 /> Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PARTICIPANTS SECTION (USER DIRECTORY & EDITING) */}
        {/* ========================================================================= */}
        {activeTab === 'participants' && (
          <div>
            <div className="admin-section-header">
              <div className="admin-section-title-box">
                <h2><FiUsers style={{ color: '#38bdf8' }} /> Participants Directory &amp; User Control</h2>
                <p className="admin-section-subtitle">
                  Search, inspect, edit user details, and assign attendees to any fest event.
                </p>
              </div>

              <div className="admin-controls-row">
                <div className="admin-search-box">
                  <FiSearch className="admin-search-icon" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search by name, college, email, code..."
                    className="admin-search-input"
                  />
                </div>

                <button
                  onClick={() => handleExportCsv('participants', participants)}
                  className="admin-btn admin-btn-secondary"
                >
                  <FiDownload /> Export Users
                </button>
              </div>
            </div>

            <div className="admin-table-container">
              <div className="admin-table-scroll">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Participant Code</th>
                      <th>Full Name &amp; Contact</th>
                      <th>College &amp; Dept</th>
                      <th>Enrolled Events</th>
                      <th>Created</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParticipants.map(participant => {
                      const userRegs = participantRegistrationsMap[participant.id] || 
                                       participantRegistrationsMap[participant.participant_code] || 
                                       participantRegistrationsMap[participant.email?.toLowerCase()] || [];

                      return (
                        <tr key={participant.id}>
                          <td>
                            <span className="admin-code-badge">
                              {participant.participant_code || 'STC-PASS'}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.92rem' }}>
                              {participant.name}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                              <FiMail size={12} /> {participant.email}
                            </div>
                            {participant.phone && (
                              <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <FiPhone size={11} /> {participant.phone}
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ color: '#cbd5e1' }}>{participant.college || '—'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {participant.department || ''} {participant.year ? `(${participant.year})` : ''}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', maxWidth: '240px' }}>
                              {userRegs.map(reg => (
                                <span
                                  key={reg.id}
                                  style={{
                                    fontSize: '0.7rem',
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: '4px',
                                    background: reg.payment_status === 'verified' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                    color: reg.payment_status === 'verified' ? '#34d399' : '#fbbf24',
                                    border: '1px solid rgba(255,255,255,0.06)'
                                  }}
                                >
                                  {reg.event_name}
                                </span>
                              ))}
                              {userRegs.length === 0 && (
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>No events assigned</span>
                              )}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            {participant.created_at ? new Date(participant.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.45rem' }}>
                              <button
                                onClick={() => handleOpenAssignEvent(participant)}
                                className="admin-btn admin-btn-success admin-btn-sm"
                                title="Assign to an Event"
                              >
                                <FiPlus /> Assign Event
                              </button>

                              <button
                                onClick={() => handleOpenEditUser(participant)}
                                className="admin-btn admin-btn-primary admin-btn-sm"
                                title="Edit Participant Details"
                              >
                                <FiEdit2 /> Edit
                              </button>

                              <button
                                onClick={() => handleDeleteUser(participant)}
                                className="admin-btn admin-btn-danger admin-btn-sm"
                                title="Delete User"
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredParticipants.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                          No participants matching "{searchQuery}".
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
        {/* TAB 4: REGISTRATIONS & VERIFICATIONS */}
        {/* ========================================================================= */}
        {activeTab === 'registrations' && (
          <div>
            <div className="admin-section-header">
              <div className="admin-section-title-box">
                <h2><FiCheckCircle style={{ color: '#10b981' }} /> Registrations &amp; Entry Passes</h2>
                <p className="admin-section-subtitle">
                  Verify payments, manage spot team entries, and dispatch digital tickets.
                </p>
              </div>

              <div className="admin-controls-row">
                <div className="admin-search-box">
                  <FiSearch className="admin-search-icon" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search registrations..."
                    className="admin-search-input"
                  />
                </div>

                <select
                  value={eventFilter}
                  onChange={e => setEventFilter(e.target.value)}
                  className="admin-select"
                >
                  <option value="all">All Events</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.label || ev.name}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="admin-select"
                >
                  <option value="all">All Statuses</option>
                  <option value="verified">Verified Only</option>
                  <option value="pending">Pending Only</option>
                </select>

                <button
                  onClick={() => handleExportCsv('registrations', filteredRegistrations)}
                  className="admin-btn admin-btn-secondary"
                >
                  <FiDownload /> Export Regs
                </button>
              </div>
            </div>

            <div className="admin-table-container">
              <div className="admin-table-scroll">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Pass Code</th>
                      <th>Lead Contact</th>
                      <th>College</th>
                      <th>Event</th>
                      <th>Team Size</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegistrations.map(reg => (
                      <tr key={reg.id}>
                        <td>
                          <span className="admin-code-badge">{reg.participant_code || 'PASS'}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: '600', color: '#fff' }}>{reg.lead_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{reg.lead_email}</div>
                          {reg.lead_phone && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{reg.lead_phone}</div>
                          )}
                        </td>
                        <td>{reg.lead_college || '—'}</td>
                        <td style={{ fontWeight: '600', color: '#38bdf8' }}>{reg.event_name}</td>
                        <td>{reg.team_size || 1} Member(s)</td>
                        <td>
                          <button
                            onClick={() => handleTogglePaymentStatus(reg)}
                            className={`admin-status-pill ${reg.payment_status === 'verified' ? 'admin-status-verified' : 'admin-status-pending'}`}
                            style={{ cursor: 'pointer', border: 'none' }}
                            title="Click to toggle status"
                          >
                            {reg.payment_status}
                          </button>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.45rem' }}>
                            <button
                              onClick={() => handleResendPassEmail(reg)}
                              className="admin-btn admin-btn-secondary admin-btn-sm"
                              title="Resend Entry Pass Ticket Email"
                            >
                              <FiSend /> Send Pass
                            </button>

                            <button
                              onClick={() => handleDeleteRegistration(reg)}
                              className="admin-btn admin-btn-danger admin-btn-sm"
                              title="Delete registration"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredRegistrations.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                          No registrations found for the selected criteria.
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
        {/* TAB 5: "VARIOUS DATABASES AND STUFF" (LIVE DATABASE EXPLORER) */}
        {/* ========================================================================= */}
        {activeTab === 'databases' && (
          <div>
            <div className="admin-section-header">
              <div className="admin-section-title-box">
                <h2><FiDatabase style={{ color: '#a78bfa' }} /> Live Database Inspector &amp; Explorer</h2>
                <p className="admin-section-subtitle">
                  Direct database view across core Supabase tables with search, raw record inspector, and full CSV exports.
                </p>
              </div>

              <div className="admin-controls-row">
                <div className="admin-search-box">
                  <FiSearch className="admin-search-icon" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={`Search within ${selectedDbTable}...`}
                    className="admin-search-input"
                  />
                </div>

                <button
                  onClick={() => handleExportCsv(selectedDbTable, currentTableData)}
                  className="admin-btn admin-btn-primary"
                >
                  <FiDownload /> Download Table (CSV)
                </button>
              </div>
            </div>

            {/* Table Selector Pills */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {['participants', 'registrations', 'events', 'event_admins'].map(tableName => (
                <button
                  key={tableName}
                  onClick={() => { setSelectedDbTable(tableName); setSearchQuery(''); }}
                  style={{
                    padding: '0.6rem 1.2rem',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    border: '1px solid',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: selectedDbTable === tableName ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'rgba(15, 23, 42, 0.6)',
                    color: selectedDbTable === tableName ? '#fff' : '#94a3b8',
                    borderColor: selectedDbTable === tableName ? '#7c3aed' : 'var(--admin-border-subtle)'
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)' }}>public.{tableName}</span>
                  <span style={{
                    marginLeft: '0.5rem',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '999px',
                    fontSize: '0.72rem'
                  }}>
                    {tableName === 'participants' ? participants.length : 
                     tableName === 'registrations' ? registrations.length :
                     tableName === 'events' ? events.length : adminsList.length}
                  </span>
                </button>
              ))}
            </div>

            {/* Table View */}
            <div className="admin-table-container">
              <div className="admin-table-scroll">
                {filteredDbRows.length > 0 ? (
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        {Object.keys(filteredDbRows[0]).map(col => (
                          <th key={col}>{col}</th>
                        ))}
                        <th style={{ textAlign: 'right' }}>Row Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDbRows.map((row, idx) => (
                        <tr key={row.id || row.email || row.username || idx}>
                          {Object.keys(filteredDbRows[0]).map(col => {
                            const val = row[col];
                            return (
                              <td key={col} style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {typeof val === 'object' ? (
                                  <code style={{ fontSize: '0.72rem', color: '#a78bfa' }}>{JSON.stringify(val)}</code>
                                ) : (
                                  String(val ?? '—')
                                )}
                              </td>
                            );
                          })}
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                              <button
                                onClick={() => handleInspectRow(row)}
                                className="admin-btn admin-btn-secondary admin-btn-sm"
                                title="Inspect JSON"
                              >
                                <FiEye />
                              </button>
                              <button
                                onClick={() => handleOpenEditRow(row)}
                                className="admin-btn admin-btn-primary admin-btn-sm"
                                title="Edit Record"
                              >
                                <FiEdit2 />
                              </button>
                              <button
                                onClick={() => handleDeleteDbRow(row)}
                                className="admin-btn admin-btn-danger admin-btn-sm"
                                title="Delete Record"
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    No rows found in table <code>public.{selectedDbTable}</code>.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT USER DETAILS */}
      {/* ========================================================================= */}
      {modalType === 'editUser' && (
        <div className="admin-modal-backdrop" onClick={() => setModalType(null)}>
          <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3><FiEdit2 style={{ color: '#38bdf8' }} /> Edit Participant Details</h3>
              <button onClick={() => setModalType(null)} className="admin-modal-close-btn"><FiX /></button>
            </div>

            <form onSubmit={handleSaveUser}>
              <div className="admin-form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  required
                  value={userFormData.name}
                  onChange={e => setUserFormData({ ...userFormData, name: e.target.value })}
                  className="admin-form-control"
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    required
                    value={userFormData.email}
                    onChange={e => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="admin-form-control"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    value={userFormData.phone}
                    onChange={e => setUserFormData({ ...userFormData, phone: e.target.value })}
                    className="admin-form-control"
                  />
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>College</label>
                  <input
                    type="text"
                    value={userFormData.college}
                    onChange={e => setUserFormData({ ...userFormData, college: e.target.value })}
                    className="admin-form-control"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Department / Stream</label>
                  <input
                    type="text"
                    value={userFormData.department}
                    onChange={e => setUserFormData({ ...userFormData, department: e.target.value })}
                    className="admin-form-control"
                  />
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Year of Study</label>
                  <input
                    type="text"
                    value={userFormData.year}
                    onChange={e => setUserFormData({ ...userFormData, year: e.target.value })}
                    className="admin-form-control"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Participant Pass Code</label>
                  <input
                    type="text"
                    required
                    value={userFormData.participant_code}
                    onChange={e => setUserFormData({ ...userFormData, participant_code: e.target.value })}
                    className="admin-form-control"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="admin-btn admin-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="admin-btn admin-btn-primary"
                >
                  {isSubmitting ? 'Saving Changes...' : 'Save User Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ASSIGN EVENT TO USER */}
      {/* ========================================================================= */}
      {modalType === 'assignEvent' && (
        <div className="admin-modal-backdrop" onClick={() => setModalType(null)}>
          <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3><FiPlus style={{ color: '#10b981' }} /> Assign Event to {activeItem?.name}</h3>
              <button onClick={() => setModalType(null)} className="admin-modal-close-btn"><FiX /></button>
            </div>

            <form onSubmit={handleSaveAssignEvent}>
              <div className="admin-form-group">
                <label>Select Event</label>
                <select
                  value={assignFormData.eventId}
                  onChange={e => setAssignFormData({ ...assignFormData, eventId: e.target.value })}
                  className="admin-form-control"
                >
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.label || ev.name} ({ev.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Team Size</label>
                  <select
                    value={assignFormData.teamSize}
                    onChange={e => setAssignFormData({ ...assignFormData, teamSize: Number(e.target.value) })}
                    className="admin-form-control"
                  >
                    <option value={1}>1 Member (Solo)</option>
                    <option value={2}>2 Members (Duo)</option>
                    <option value={3}>3 Members</option>
                    <option value={4}>4 Members (Full Squad)</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>Payment / Verification Status</label>
                  <select
                    value={assignFormData.paymentStatus}
                    onChange={e => setAssignFormData({ ...assignFormData, paymentStatus: e.target.value })}
                    className="admin-form-control"
                  >
                    <option value="verified">Verified (Complimentary / Paid)</option>
                    <option value="pending">Pending Spot Verification</option>
                  </select>
                </div>
              </div>

              {assignFormData.teamSize > 1 && (
                <div className="admin-form-group">
                  <label>Additional Team Member Names (1 per line)</label>
                  <textarea
                    rows={3}
                    value={assignFormData.teamMembers}
                    onChange={e => setAssignFormData({ ...assignFormData, teamMembers: e.target.value })}
                    placeholder="John Doe&#10;Jane Smith"
                    className="admin-form-control"
                  />
                </div>
              )}

              <div style={{
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                margin: '1.25rem 0'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', margin: 0, textTransform: 'none', color: '#fff' }}>
                  <input
                    type="checkbox"
                    checked={assignFormData.sendEmailPass}
                    onChange={e => setAssignFormData({ ...assignFormData, sendEmailPass: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#38bdf8' }}
                  />
                  <span>Dispatch Digital Entry Pass with QR code via email immediately</span>
                </label>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="admin-btn admin-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="admin-btn admin-btn-success"
                >
                  {isSubmitting ? 'Registering & Generating Pass...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT EVENT */}
      {/* ========================================================================= */}
      {modalType === 'editEvent' && (
        <div className="admin-modal-backdrop" onClick={() => setModalType(null)}>
          <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3><FiEdit2 style={{ color: '#38bdf8' }} /> Edit Event Details</h3>
              <button onClick={() => setModalType(null)} className="admin-modal-close-btn"><FiX /></button>
            </div>

            <form onSubmit={handleSaveEvent}>
              <div className="admin-form-group">
                <label>Event Name / Title</label>
                <input
                  type="text"
                  required
                  value={eventFormData.name}
                  onChange={e => setEventFormData({ ...eventFormData, name: e.target.value })}
                  className="admin-form-control"
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Category</label>
                  <select
                    value={eventFormData.category}
                    onChange={e => setEventFormData({ ...eventFormData, category: e.target.value })}
                    className="admin-form-control"
                  >
                    <option value="DEV">DEV (Coding / Tech)</option>
                    <option value="ROBOTICS">ROBOTICS</option>
                    <option value="INNOVATION">INNOVATION</option>
                    <option value="CULTURE">CULTURE (Dance / Arts)</option>
                    <option value="FUN">FUN</option>
                    <option value="KNOWLEDGE">KNOWLEDGE (Quiz)</option>
                    <option value="ART">ART</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>Venue Location</label>
                  <input
                    type="text"
                    value={eventFormData.venue}
                    onChange={e => setEventFormData({ ...eventFormData, venue: e.target.value })}
                    className="admin-form-control"
                    placeholder="e.g. Lab 2 / Main Stage"
                  />
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Date</label>
                  <input
                    type="text"
                    value={eventFormData.date}
                    onChange={e => setEventFormData({ ...eventFormData, date: e.target.value })}
                    className="admin-form-control"
                    placeholder="e.g. Dec 6, 2026"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Start Time</label>
                  <input
                    type="text"
                    value={eventFormData.start_time}
                    onChange={e => setEventFormData({ ...eventFormData, start_time: e.target.value })}
                    className="admin-form-control"
                    placeholder="e.g. 10:00 AM"
                  />
                </div>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="admin-btn admin-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="admin-btn admin-btn-primary"
                >
                  {isSubmitting ? 'Updating...' : 'Save Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ADD NEW EVENT */}
      {/* ========================================================================= */}
      {modalType === 'addEvent' && (
        <div className="admin-modal-backdrop" onClick={() => setModalType(null)}>
          <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3><FiPlus style={{ color: '#38bdf8' }} /> Create New Festival Event</h3>
              <button onClick={() => setModalType(null)} className="admin-modal-close-btn"><FiX /></button>
            </div>

            <form onSubmit={handleSaveAddEvent}>
              <div className="admin-form-group">
                <label>Event Unique Slug / ID (Lowercase alphanumeric)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. droneprix or bugbounty"
                  value={eventFormData.id}
                  onChange={e => setEventFormData({ ...eventFormData, id: e.target.value })}
                  className="admin-form-control"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div className="admin-form-group">
                <label>Event Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DRONE RACING PRIX"
                  value={eventFormData.name}
                  onChange={e => setEventFormData({ ...eventFormData, name: e.target.value })}
                  className="admin-form-control"
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Category</label>
                  <select
                    value={eventFormData.category}
                    onChange={e => setEventFormData({ ...eventFormData, category: e.target.value })}
                    className="admin-form-control"
                  >
                    <option value="DEV">DEV</option>
                    <option value="ROBOTICS">ROBOTICS</option>
                    <option value="INNOVATION">INNOVATION</option>
                    <option value="CULTURE">CULTURE</option>
                    <option value="FUN">FUN</option>
                    <option value="KNOWLEDGE">KNOWLEDGE</option>
                    <option value="ART">ART</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>Venue</label>
                  <input
                    type="text"
                    value={eventFormData.venue}
                    onChange={e => setEventFormData({ ...eventFormData, venue: e.target.value })}
                    className="admin-form-control"
                    placeholder="e.g. College Grounds"
                  />
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Date</label>
                  <input
                    type="text"
                    value={eventFormData.date}
                    onChange={e => setEventFormData({ ...eventFormData, date: e.target.value })}
                    className="admin-form-control"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Time</label>
                  <input
                    type="text"
                    value={eventFormData.start_time}
                    onChange={e => setEventFormData({ ...eventFormData, start_time: e.target.value })}
                    className="admin-form-control"
                  />
                </div>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="admin-btn admin-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="admin-btn admin-btn-primary"
                >
                  {isSubmitting ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: INSPECT ROW RAW JSON */}
      {/* ========================================================================= */}
      {modalType === 'inspectRow' && (
        <div className="admin-modal-backdrop" onClick={() => setModalType(null)}>
          <div className="admin-modal-content admin-modal-content-lg" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3><FiEye style={{ color: '#a78bfa' }} /> Raw Record Inspector — {selectedDbTable}</h3>
              <button onClick={() => setModalType(null)} className="admin-modal-close-btn"><FiX /></button>
            </div>

            <pre style={{
              background: '#040711',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#38bdf8',
              fontSize: '0.85rem',
              maxHeight: '400px',
              overflowY: 'auto',
              fontFamily: 'var(--font-mono)'
            }}>
              {JSON.stringify(activeItem, null, 2)}
            </pre>

            <div className="admin-modal-actions">
              <button
                onClick={() => setModalType(null)}
                className="admin-btn admin-btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: EDIT DATABASE ROW */}
      {/* ========================================================================= */}
      {modalType === 'editRow' && (
        <div className="admin-modal-backdrop" onClick={() => setModalType(null)}>
          <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3><FiEdit2 style={{ color: '#a78bfa' }} /> Edit Record in public.{selectedDbTable}</h3>
              <button onClick={() => setModalType(null)} className="admin-modal-close-btn"><FiX /></button>
            </div>

            <form onSubmit={handleSaveEditRow}>
              <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {Object.keys(rowEditData).map(col => {
                  if (col === 'id' || col === 'created_at') {
                    return (
                      <div key={col} className="admin-form-group">
                        <label>{col} (Read Only)</label>
                        <input
                          type="text"
                          disabled
                          value={String(rowEditData[col] ?? '')}
                          className="admin-form-control"
                          style={{ opacity: 0.6 }}
                        />
                      </div>
                    );
                  }

                  const val = rowEditData[col];
                  const isObj = typeof val === 'object' && val !== null;

                  return (
                    <div key={col} className="admin-form-group">
                      <label>{col}</label>
                      {isObj ? (
                        <textarea
                          rows={3}
                          value={JSON.stringify(val)}
                          onChange={e => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              setRowEditData({ ...rowEditData, [col]: parsed });
                            } catch {
                              // keep raw string if invalid
                            }
                          }}
                          className="admin-form-control"
                          style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                        />
                      ) : (
                        <input
                          type="text"
                          value={val ?? ''}
                          onChange={e => setRowEditData({ ...rowEditData, [col]: e.target.value })}
                          className="admin-form-control"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="admin-btn admin-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="admin-btn admin-btn-primary"
                >
                  {isSubmitting ? 'Saving Record...' : 'Save Database Record'}
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
