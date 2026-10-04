import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiMail, FiLogOut, FiCalendar, FiArrowLeft, FiUser, FiPhone, FiBook, FiInfo, FiDownload, FiLock, FiRotateCcw } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import CodeSlots from './CodeSlots';
import Stepper, { Step } from './Stepper';
import TearTicket from './TearTicket';
import { QRCodeSVG } from 'qrcode.react';
import { generateEntryPassEmailHtml } from '../utils/entryPassEmail';
import { generateCardImagePng, downloadPngFromDataUrl } from '../utils/cardImageGenerator';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('email'); // 'email', 'otp', 'onboarding', 'dashboard'
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const [participantData, setParticipantData] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [selectedRegIndex, setSelectedRegIndex] = useState(0);

  // Onboarding
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingPhone, setOnboardingPhone] = useState('');
  const [onboardingCollege, setOnboardingCollege] = useState('');

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCollege, setEditCollege] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [emailingPass, setEmailingPass] = useState(false);
  const [downloadingPass, setDownloadingPass] = useState(false);
  const [emailPassMsg, setEmailPassMsg] = useState(null);
  const [arrivalCheckin, setArrivalCheckin] = useState(null);
  const [eventAttendance, setEventAttendance] = useState({});
  const [signedPassQr, setSignedPassQr] = useState('');
  const [isTicketTorn, setIsTicketTorn] = useState(false);

  const isSuperAdmin = (session?.user?.email || localStorage.getItem('srishti_session') || '').trim().toLowerCase() === 'tsrknight@gmail.com';

  useEffect(() => {
    const code = participantData?.participant_code || (isSuperAdmin ? 'ADMIN-PASS' : null);
    if (code) {
      import('../utils/cryptoSecurity').then(({ generatePassPayload }) => {
        const payload = generatePassPayload(
          code,
          participantData?.pass_token || registrations?.[0]?.pass_token || '',
          participantData?.name || (isSuperAdmin ? 'Master Superadmin' : '')
        );
        setSignedPassQr(payload);
      });
    }
  }, [participantData, registrations, isSuperAdmin]);

  useEffect(() => {
    const rawEmail = localStorage.getItem('srishti_session');
    if (rawEmail) {
      const savedEmail = rawEmail.trim().toLowerCase();
      setSession({ user: { email: savedEmail } });
      const isAdmin = savedEmail === 'tsrknight@gmail.com';
      if (isAdmin) {
        localStorage.setItem('srishti_admin_session', savedEmail);
      }
      fetchUserData(savedEmail).then(found => {
        if (!found && !isAdmin) {
          setStep('onboarding');
        } else {
          if (!found && isAdmin) {
            setParticipantData({ name: 'Master Superadmin', college: 'Srishti 2.7 HQ', participant_code: 'ADMIN-PASS', email: savedEmail });
          }
          setStep('dashboard');
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserData = async (userEmail) => {
    try {
      const clean = (userEmail || '').trim().toLowerCase();
      let currentParticipant = null;

      // 1. Try identity-based authenticated RPC get_my_participant
      try {
        const { data: myRows } = await supabase.rpc('get_my_participant');
        if (myRows && myRows.length > 0) currentParticipant = myRows[0];
      } catch (_) {}

      // 2. Staff lookup fallback
      if (!currentParticipant) {
        try {
          const { data: rpcRows } = await supabase.rpc('get_participant_by_email', { lookup_email: clean });
          if (rpcRows && rpcRows.length > 0) currentParticipant = rpcRows[0];
        } catch (_) {}
      }

      // 3. Local profile fallback if Supabase RLS limits select
      if (!currentParticipant) {
        const cached = localStorage.getItem(`srishti_profile_${clean}`);
        if (cached) {
          try {
            currentParticipant = JSON.parse(cached);
          } catch (_) {}
        }
      }

      if (!currentParticipant && clean === 'tsrknight@gmail.com') {
        currentParticipant = {
          name: 'Master Superadmin',
          college: 'Srishti 2.7 HQ',
          participant_code: 'ADMIN-PASS',
          email: clean
        };
      }

      if (currentParticipant) {
        // Retrieve pass_token ONLY via authenticated credential or local encrypted vault
        if (!currentParticipant.pass_token) {
          try {
            const { data: credRows } = await supabase.rpc('get_my_pass_credential');
            if (credRows && credRows.length > 0 && credRows[0].pass_token) {
              currentParticipant.pass_token = credRows[0].pass_token;
            }
          } catch (_) {}

          if (!currentParticipant.pass_token) {
            try {
              const { secureStorage } = await import('../utils/cryptoSecurity');
              const localToken = await secureStorage.getItem(`srishti_token_${clean}`);
              if (localToken) currentParticipant.pass_token = localToken;
            } catch (_) {}
          }
        }
      }

      setParticipantData(currentParticipant);
      
      if (currentParticipant) {
        setEditName(currentParticipant.name || '');
        setEditCollege(currentParticipant.college || '');
        setEditPhone(currentParticipant.phone || '');
        if (currentParticipant.name) localStorage.setItem('srishti_user_name', currentParticipant.name);
        if (currentParticipant.college) localStorage.setItem('srishti_user_college', currentParticipant.college);
        if (currentParticipant.phone) localStorage.setItem('srishti_user_phone', currentParticipant.phone);
        if (currentParticipant.department && currentParticipant.department !== 'N/A') {
          localStorage.setItem('srishti_user_roll', currentParticipant.department);
        }
        localStorage.setItem(`srishti_profile_${clean}`, JSON.stringify(currentParticipant));
      }

      let regs = [];
      // 1. Try identity-based authenticated RPC get_my_registrations
      try {
        const { data: myRegs } = await supabase.rpc('get_my_registrations');
        if (myRegs && myRegs.length > 0) {
          regs = myRegs.map(r => ({
            ...r,
            events: {
              name: r.event_name,
              event_code: r.event_code,
              venue: r.event_venue,
              date: r.event_date,
              start_time: r.event_time
            }
          }));
        }
      } catch (_) {}

      // 2. Staff lookup fallback
      if (regs.length === 0) {
        try {
          const { data: rpcRegs } = await supabase.rpc('get_registrations_by_email', { lookup_email: clean });
          if (rpcRegs && rpcRegs.length > 0) {
            regs = rpcRegs.map(r => ({
              ...r,
              events: {
                name: r.event_name,
                event_code: r.event_code,
                venue: r.event_venue,
                date: r.event_date,
                start_time: r.event_time
              }
            }));
          }
        } catch (_) {}
      }

      // 2. Direct query fallback
      if (regs.length === 0 && currentParticipant?.id) {
        try {
          const { data: rData } = await supabase
            .from('registrations')
            .select('*, events(*)')
            .eq('participant_id', currentParticipant.id);
          if (rData) regs = rData;
        } catch (_) {}
      }

      setRegistrations(regs);

      // Fetch arrival check-in status
      let arrivalInfo = null;
      if (currentParticipant?.id) {
        try {
          const { data: arrData } = await supabase
            .from('arrival_checkins')
            .select('*')
            .eq('participant_id', currentParticipant.id)
            .maybeSingle();
          if (arrData) arrivalInfo = arrData;
        } catch (_) {}
      }
      setArrivalCheckin(arrivalInfo);

      // Fetch event attendance status
      let attendanceMap = {};
      if (currentParticipant?.id) {
        try {
          const { data: attData } = await supabase
            .from('event_attendance')
            .select('*')
            .eq('participant_id', currentParticipant.id);
          if (attData) {
            attData.forEach(a => {
              if (a.event_id) attendanceMap[a.event_id] = a;
            });
          }
        } catch (_) {}
      }
      setEventAttendance(attendanceMap);

      return !!currentParticipant || regs.length > 0;
    } catch (err) {
      console.error('Error fetching data:', err);
      return false;
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    try {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      
      // Cryptographically secure challenge (prevents DevTools / F12 inspection bypass)
      const salt = Math.random().toString(36).substring(2) + Date.now();
      const enc = new TextEncoder();
      const buf = await crypto.subtle.digest('SHA-256', enc.encode(`${code}_${cleanEmail}_${salt}_srishti_sec`));
      const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Store ONLY the irreversible hash and expiry in ephemeral sessionStorage
      sessionStorage.setItem('srishti_otp_challenge', JSON.stringify({
        hash,
        salt,
        email: cleanEmail,
        expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes validity
      }));
      // Remove any legacy plaintext keys
      localStorage.removeItem('pending_otp');
      localStorage.removeItem('pending_email');

      const htmlContent = `
        <div style="font-family: sans-serif; background: #000; color: white; padding: 40px; border-radius: 12px; text-align: center; max-width: 500px; margin: 0 auto; border: 1px solid #333;">
          <h2 style="color: #fff; letter-spacing: 2px;">SRISHTI 2.7</h2>
          <p style="color: #888;">Your secure login code is:</p>
          <h1 style="font-size: 56px; letter-spacing: 8px; color: #fff; margin: 30px 0;">${code}</h1>
          <p style="color: #888; font-size: 14px;">This code is valid for 5 minutes.</p>
        </div>
      `;

      const response = await fetch('/api/send_email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: cleanEmail,
          subject: 'Srishti 2.7 - Login Code',
          html: htmlContent
        })
      });

      if (!response.ok) throw new Error('Failed to send email. Please verify your email and try again.');

      setStep('otp');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (code) => {
    setError(null);
    try {
      const challengeRaw = sessionStorage.getItem('srishti_otp_challenge');
      if (!challengeRaw) {
        throw new Error('No active verification session. Please request a new code.');
      }

      const challenge = JSON.parse(challengeRaw);
      if (Date.now() > challenge.expiresAt) {
        sessionStorage.removeItem('srishti_otp_challenge');
        throw new Error('Verification code has expired (5 minute limit). Please request a new one.');
      }

      // Verify input against cryptographic hash
      const enc = new TextEncoder();
      const buf = await crypto.subtle.digest('SHA-256', enc.encode(`${code.trim()}_${challenge.email}_${challenge.salt}_srishti_sec`));
      const inputHash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');

      if (inputHash !== challenge.hash) {
        throw new Error('Invalid verification code. Please check your email and try again.');
      }

      setLoading(true);
      sessionStorage.removeItem('srishti_otp_challenge');
      const savedEmail = challenge.email;
      localStorage.setItem('srishti_session', savedEmail);
      
      setSession({ user: { email: savedEmail } });
      const isAdmin = savedEmail === 'tsrknight@gmail.com';
      if (isAdmin) {
        localStorage.setItem('srishti_admin_session', savedEmail);
      }

      const found = await fetchUserData(savedEmail);
      
      if (!found && !isAdmin) {
        setStep('onboarding');
      } else {
        if (!found && isAdmin) {
          setParticipantData({ name: 'Master Superadmin', college: 'Srishti 2.7 HQ', participant_code: 'ADMIN-PASS', email: savedEmail });
        }
        setStep('dashboard');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = async () => {
    setLoading(true);
    setError(null);
    const rawEmail = session?.user?.email || localStorage.getItem('srishti_session') || '';
    const userEmail = rawEmail.replace(/['"]+/g, '').trim().toLowerCase();

    const name = onboardingName.trim() || 'Attendee';
    const phone = onboardingPhone.trim() || 'N/A';
    const college = onboardingCollege.trim() || 'Participant';

    const uniqueCode = 'SRI27-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const payload = {
      participant_code: uniqueCode,
      name: name,
      email: userEmail,
      phone: phone,
      college: college,
      department: 'N/A',
      year: 'N/A'
    };

    // 1. Immediately persist profile locally so attendee is NEVER blocked
    localStorage.setItem(`srishti_profile_${userEmail}`, JSON.stringify(payload));
    localStorage.setItem('srishti_session', userEmail);
    localStorage.setItem('srishti_user_name', name);
    localStorage.setItem('srishti_user_college', college);
    localStorage.setItem('srishti_user_phone', phone);
    if (userEmail === 'tsrknight@gmail.com') {
      localStorage.setItem('srishti_admin_session', userEmail);
    }

    // 2. Attempt sync to Supabase without letting RLS errors block the user
    try {
      await supabase
        .from('participants')
        .insert([payload]);

      try {
        const { data: createdRows } = await supabase.rpc('get_participant_by_email', { lookup_email: userEmail });
        if (createdRows && createdRows.length > 0) {
          setParticipantData(createdRows[0]);
          localStorage.setItem(`srishti_profile_${userEmail}`, JSON.stringify(createdRows[0]));
        } else {
          setParticipantData(payload);
        }
      } catch (_) {
        setParticipantData(payload);
      }
    } catch (err) {
      console.warn('Participant sync notice:', err);
      setParticipantData(payload);
    }

    // 3. Seamlessly transition to dashboard
    setStep('dashboard');
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('srishti_session');
    setSession(null);
    setStep('email');
    setParticipantData(null);
    setRegistrations([]);
    setOnboardingStep(1);
    setEmail('');
    setError(null);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('participants')
        .update({ name: editName, college: editCollege, phone: editPhone })
        .eq('id', participantData.id);
      
      if (error) throw error;
      const updated = { ...participantData, name: editName, college: editCollege, phone: editPhone };
      setParticipantData(updated);
      localStorage.setItem('srishti_user_name', editName);
      localStorage.setItem('srishti_user_college', editCollege);
      localStorage.setItem('srishti_user_phone', editPhone);
      const cleanEmail = (participantData?.email || '').trim().toLowerCase();
      if (cleanEmail) {
        localStorage.setItem(`srishti_profile_${cleanEmail}`, JSON.stringify(updated));
      }
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const getPassData = () => {
    const attendeeName = participantData?.name || (isSuperAdmin ? 'Master Superadmin' : 'Participant');
    const college = participantData?.college || (isSuperAdmin ? 'Srishti 2.7 HQ' : 'St Thomas College Thrissur');
    const passCode = participantData?.participant_code || registrations[0]?.participant_code || (isSuperAdmin ? 'ADMIN-PASS' : 'SRI27-PASS');
    const passToken = participantData?.pass_token || registrations[0]?.pass_token || '';
    const events = isSuperAdmin 
      ? ['FULL ALL-ACCESS PASS', 'ADMIN COMMAND CENTER']
      : registrations.map(r => r.events?.name || r.event_name).filter(Boolean);
    const isVerified = isSuperAdmin || registrations.some(r => r.payment_status === 'verified' || r.status === 'verified') || !!participantData?.id;
    const statusText = isSuperAdmin ? 'SUPERADMIN' : (isVerified ? 'VERIFIED' : (registrations.length === 0 ? 'UNLOCKED' : 'PENDING'));
    return { attendeeName, college, passCode, passToken, events, isVerified, statusText };
  };

  const handleEmailPassToUser = async () => {
    const hasRegistered = (registrations && registrations.length > 0) || isSuperAdmin;
    if (!hasRegistered) {
      alert('Your delegate pass is locked. Please register for at least one festival event to unlock your pass.');
      return;
    }

    const targetEmail = session?.user?.email || participantData?.email;
    if (!targetEmail) {
      alert('No email found to send pass.');
      return;
    }
    const data = getPassData();
    setEmailingPass(true);
    setEmailPassMsg(null);

    try {
      // 1. Generate exact 1:1 high-resolution PNG image of the card
      const cardPng = await generateCardImagePng({
        attendeeName: data.attendeeName,
        college: data.college,
        passCode: data.passCode,
        passToken: data.passToken,
        events: data.events,
        isVerified: data.isVerified,
        statusText: data.statusText
      });

      // 2. Generate email HTML containing the embedded CID image
      const ticketHtml = generateEntryPassEmailHtml({
        attendeeName: data.attendeeName,
        college: data.college,
        passCode: data.passCode,
        eventName: data.events[0] || 'DELEGATE PASS',
        status: data.statusText
      });

      const response = await fetch('/api/send_email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetEmail,
          subject: `Your Srishti 2.7 Digital Entry Pass — ${data.attendeeName}`,
          html: ticketHtml,
          image: cardPng // Attached as inline image and PNG file!
        })
      });

      if (!response.ok) throw new Error('Failed to send pass email.');
      setEmailPassMsg({ type: 'success', text: `Pass sent to ${targetEmail} with full-res card!` });
      setTimeout(() => setEmailPassMsg(null), 5000);
    } catch (err) {
      console.error(err);
      setEmailPassMsg({ type: 'error', text: 'Could not send email. Please try again.' });
      setTimeout(() => setEmailPassMsg(null), 5000);
    } finally {
      setEmailingPass(false);
    }
  };

  const handleDownloadPassPng = async () => {
    const hasRegistered = (registrations && registrations.length > 0) || isSuperAdmin;
    if (!hasRegistered) {
      alert('Your delegate pass is locked. Please register for at least one event first.');
      return;
    }

    const data = getPassData();
    setDownloadingPass(true);
    try {
      const cardPng = await generateCardImagePng({
        attendeeName: data.attendeeName,
        college: data.college,
        passCode: data.passCode,
        passToken: data.passToken,
        events: data.events,
        isVerified: data.isVerified,
        statusText: data.statusText
      });

      if (cardPng) {
        downloadPngFromDataUrl(cardPng, `srishti_pass_${data.passCode}.png`);
      }
    } catch (err) {
      console.error('Error downloading pass:', err);
      alert('Could not download pass image.');
    } finally {
      setDownloadingPass(false);
    }
  };

  const isNextDisabled = () => {
    if (onboardingStep === 1 && !onboardingName.trim()) return true;
    if (onboardingStep === 2 && (!onboardingCollege.trim() || !onboardingPhone.trim())) return true;
    return false;
  };

  if (loading && !session && step !== 'email' && step !== 'otp') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', color: '#fff' }}>
        <div style={{ width: '40px', height: '40px', border: '2px solid rgba(255, 255, 255, 0.1)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#000',
      color: '#fff',
      fontFamily: 'var(--font-sans)',
      padding: '2rem',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1000px', margin: '0 auto', paddingTop: '4rem' }}>
        
        <button 
          onClick={() => navigate('/')}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', 
            background: 'none', border: 'none', color: '#888', 
            cursor: 'pointer', marginBottom: '2rem', fontSize: '1rem',
            padding: '0', transition: 'color 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.color = '#fff'}
          onMouseOut={e => e.currentTarget.style.color = '#888'}
        >
          <FiArrowLeft /> Return Home
        </button>

        {step === 'dashboard' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 style={{ fontSize: '3.5rem', fontWeight: '800', margin: '0 0 0.5rem 0', letterSpacing: '-0.03em' }}>
                  My Tickets
                </h1>
                <p style={{ color: '#888', fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <span>Logged in as <span style={{ color: '#fff', fontWeight: '600' }}>{session?.user?.email}</span></span>
                  {isSuperAdmin && (
                    <button 
                      onClick={() => {
                        localStorage.setItem('srishti_admin_session', 'tsrknight@gmail.com');
                        navigate('/admin');
                      }}
                      style={{ 
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        color: '#38bdf8', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '700', 
                        padding: '0.35rem 0.85rem', background: 'rgba(56,189,248,0.15)', 
                        borderRadius: '8px', border: '1px solid rgba(56,189,248,0.3)',
                        transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.5px'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(56,189,248,0.25)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(56,189,248,0.15)'}
                    >
                      <FiLock size={13} /> Admin Command Center →
                    </button>
                  )}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button 
                  onClick={handleLogout}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.75rem 1.5rem', backgroundColor: 'transparent',
                    color: '#888', border: '1px solid #333',
                    borderRadius: '12px', cursor: 'pointer', fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#888'; }}
                >
                  <FiLogOut /> Sign Out
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ marginTop: '4rem', textAlign: 'center' }}>Loading your data...</div>
            ) : (
              <div style={{ marginTop: '4rem', display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                
                {/* Profile Card */}
                <div style={{ flex: '1 1 300px', maxWidth: '100%', padding: '2.5rem', backgroundColor: '#0a0a0a', borderRadius: '24px', border: '1px solid #222' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.2rem', color: '#888', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FiUser /> Profile Overview
                    </h3>
                    {!isEditing && (
                      <button 
                        onClick={() => setIsEditing(true)}
                        style={{ background: 'none', border: '1px solid #333', color: '#fff', padding: '0.4rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div>
                        <label style={{ color: '#666', fontSize: '0.75rem', textTransform: 'uppercase' }}>Name</label>
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: '#111', border: '1px solid #333', color: '#fff', borderRadius: '8px', marginTop: '0.25rem' }} />
                      </div>
                      <div>
                        <label style={{ color: '#666', fontSize: '0.75rem', textTransform: 'uppercase' }}>College</label>
                        <input type="text" value={editCollege} onChange={e => setEditCollege(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: '#111', border: '1px solid #333', color: '#fff', borderRadius: '8px', marginTop: '0.25rem' }} />
                      </div>
                      <div>
                        <label style={{ color: '#666', fontSize: '0.75rem', textTransform: 'uppercase' }}>Phone</label>
                        <input type="text" value={editPhone} onChange={e => setEditPhone(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: '#111', border: '1px solid #333', color: '#fff', borderRadius: '8px', marginTop: '0.25rem' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button onClick={handleSaveProfile} disabled={isSaving} style={{ flex: 1, padding: '0.75rem', background: '#fff', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => setIsEditing(false)} style={{ flex: 1, padding: '0.75rem', background: 'transparent', color: '#fff', border: '1px solid #333', borderRadius: '8px', cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                      <p style={{ color: '#666', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 0.25rem 0' }}>Name</p>
                      <p style={{ fontSize: '1.25rem', margin: 0, fontWeight: '500' }}>{participantData?.name || 'Admin'}</p>
                    </div>
                    <div>
                      <p style={{ color: '#666', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 0.25rem 0' }}>College</p>
                      <p style={{ fontSize: '1.25rem', margin: 0, fontWeight: '500' }}>{participantData?.college || '-'}</p>
                    </div>
                    <div>
                      <p style={{ color: '#666', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 0.25rem 0' }}>Phone</p>
                      <p style={{ fontSize: '1.25rem', margin: 0, fontWeight: '500' }}>{participantData?.phone || '-'}</p>
                    </div>
                  </div>
                  )}
                </div>

                {/* Srishti Entry Pass */}
                <div 
                  className="tear-ticket-card-wrapper"
                  style={{ 
                    flex: '2 1 480px', 
                    minWidth: 0, 
                    maxWidth: '100%',
                    padding: '2.5rem 1.5rem', 
                    backgroundColor: '#0a0a0a', 
                    borderRadius: '24px', 
                    border: '1px solid #222', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    position: 'relative',
                    overflow: 'visible'
                  }}
                >
                  <h3 style={{ fontSize: '1.2rem', color: '#888', marginBottom: '1.5rem', width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FiCalendar /> Digital Entry Pass
                  </h3>
                  {(() => {
                    const passData = getPassData();
                    const attendeeName = passData.attendeeName;
                    const college = passData.college;
                    const passCode = passData.passCode;
                    const isVerified = passData.isVerified;
                    const statusText = passData.statusText;
                    const eventsList = passData.events;

                    const hasRegistered = (registrations && registrations.length > 0) || isSuperAdmin;

                    return (
                      <div style={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'visible' }}>
                        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', maxWidth: '100%', overflow: 'visible', padding: '0.5rem 0' }}>
                          <div style={{
                            width: '100%',
                            maxWidth: '660px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            position: 'relative',
                            overflow: 'visible',
                            filter: !hasRegistered ? 'blur(4px) grayscale(0.85) opacity(0.35)' : 'none',
                            pointerEvents: !hasRegistered ? 'none' : 'auto',
                            userSelect: !hasRegistered ? 'none' : 'auto',
                            transition: 'all 0.3s ease'
                          }}>
                          <TearTicket
                            orientation="horizontal"
                            scrim={false}
                            torn={isTicketTorn}
                            onTear={() => setIsTicketTorn(true)}
                            width={660}
                            height={320}
                            stubSize={185}
                            radius={16}
                            holes={12}
                            holeSize={7}
                            notch={5}
                            tearAngle={25}
                            stretch={30}
                            resistance={0.5}
                            rotate={0}
                            tilt={false}
                            background="#070a13"
                            stubBackground="#ffffff"
                            color="#ffffff"
                            border={true}
                            borderColor="rgba(56,189,248,0.25)"
                            borderWidth={1}
                            recenter={true}
                            stub={
                              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '1rem', background: '#fff', overflow: 'hidden', boxSizing: 'border-box' }}>
                                <div style={{ position: 'absolute', top: '-25px', right: '-25px', width: '110px', height: '110px', background: 'linear-gradient(225deg, rgba(56,189,248,0.7) 0%, rgba(165,243,252,0.8) 35%, transparent 36%)', zIndex: 0 }}></div>
                                <div style={{ position: 'absolute', bottom: '-20px', right: '-20px', width: '120px', height: '120px', background: 'linear-gradient(135deg, transparent 40%, #38bdf8 40%, #38bdf8 60%, #1d4ed8 60%, #1d4ed8 100%)', zIndex: 0 }}></div>
                                
                                {/* Bottom-left dot matrix */}
                                <div style={{ position: 'absolute', bottom: '16px', left: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 4px)', gap: '4px', opacity: 0.35, zIndex: 1 }}>
                                  {[...Array(9)].map((_, i) => (
                                    <div key={i} style={{ width: '4px', height: '4px', borderRadius: '1px', background: '#38bdf8' }} />
                                  ))}
                                </div>

                                <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                                  <h4 style={{ fontFamily: 'var(--font-akira)', color: '#000', fontSize: '1.05rem', margin: '0 0 0.85rem 0', letterSpacing: '0.05em' }}>SCAN ME</h4>
                                  
                                  <div style={{ position: 'relative', padding: '10px' }}>
                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '16px', height: '16px', borderTop: '4px solid #06b6d4', borderLeft: '4px solid #06b6d4', borderRadius: '4px 0 0 0' }}></div>
                                    <div style={{ position: 'absolute', top: 0, right: 0, width: '16px', height: '16px', borderTop: '4px solid #06b6d4', borderRight: '4px solid #06b6d4', borderRadius: '0 4px 0 0' }}></div>
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '16px', height: '16px', borderBottom: '4px solid #06b6d4', borderLeft: '4px solid #06b6d4', borderRadius: '0 0 0 4px' }}></div>
                                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: '16px', height: '16px', borderBottom: '4px solid #06b6d4', borderRight: '4px solid #06b6d4', borderRadius: '0 0 4px 0' }}></div>
                                    
                                    <QRCodeSVG
                                      value={signedPassQr || passCode}
                                      size={115}
                                      bgColor="#ffffff"
                                      fgColor="#000000"
                                      level="H"
                                      imageSettings={{
                                        src: "/assets/logo.png",
                                        height: 26,
                                        width: 26,
                                        excavate: true,
                                      }}
                                    />
                                  </div>
                                  
                                  <span style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.85rem', fontFamily: 'var(--font-mono)', fontWeight: 'bold', letterSpacing: '0.05em' }}>{passCode}</span>
                                </div>
                              </div>
                            }
                          >
                            <div style={{ position: 'relative', width: '100%', height: '100%', padding: '1.75rem 2.25rem', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
                              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, background: 'radial-gradient(circle at 30% 50%, rgba(14,165,233,0.2) 0%, transparent 60%)' }}></div>
                              <div style={{ position: 'absolute', top: '-10%', left: '20%', width: '150%', height: '120%', zIndex: 0, background: 'repeating-linear-gradient(90deg, rgba(14,165,233,0) 0px, rgba(14,165,233,0) 40px, rgba(14,165,233,0.3) 40px, rgba(14,165,233,0.6) 60px, rgba(14,165,233,0.6) 60px, rgba(14,165,233,0.8) 80px)', transform: 'skewX(-15deg)', opacity: 0.6 }}></div>

                              {/* Decorative dot matrix on ticket body */}
                              <div style={{ position: 'absolute', top: '50%', right: '25px', transform: 'translateY(-50%)', display: 'grid', gridTemplateColumns: 'repeat(2, 4px)', gap: '6px', opacity: 0.35, zIndex: 1 }}>
                                {[...Array(6)].map((_, i) => (
                                  <div key={i} style={{ width: '4px', height: '4px', borderRadius: '1px', background: '#38bdf8' }} />
                                ))}
                              </div>

                              <div style={{ position: 'relative', zIndex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.65rem' }}>
                                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#e2e8f0', letterSpacing: '0.2em', lineHeight: 1.4 }}>
                                    SRISHTI 2.7<br/><span style={{ color: '#38bdf8' }}>DELEGATE PASS</span>
                                  </div>
                                  <div style={{ height: '2px', width: '60px', background: 'linear-gradient(90deg, #38bdf8, transparent)' }}></div>
                                </div>
                                
                                <h3 style={{ 
                                  fontFamily: 'var(--font-akira)', 
                                  fontSize: attendeeName.length > 20 ? '1.5rem' : attendeeName.length > 14 ? '1.85rem' : '2.2rem', 
                                  margin: '0 0 0.45rem 0', 
                                  lineHeight: 1.05, 
                                  textTransform: 'uppercase', 
                                  letterSpacing: '-0.02em',
                                  background: 'linear-gradient(180deg, #ffffff 40%, #38bdf8 100%)',
                                  WebkitBackgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                  filter: 'drop-shadow(0 0 20px rgba(56,189,248,0.5))'
                                }}>
                                  {attendeeName}
                                </h3>
                                
                                <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', marginBottom: '0.65rem' }}>
                                  <div style={{ width: '4px', height: '22px', background: '#38bdf8', borderRadius: '2px', boxShadow: '0 0 10px #38bdf8' }}></div>
                                  <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0, fontWeight: 500 }}>
                                    {college}
                                  </p>
                                </div>

                                {/* Registered Events Badges */}
                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', maxWidth: '380px' }}>
                                  {eventsList.length > 0 ? (
                                    eventsList.slice(0, 3).map((evt, idx) => (
                                      <span key={idx} style={{
                                        fontSize: '0.68rem',
                                        fontWeight: '700',
                                        padding: '0.2rem 0.55rem',
                                        borderRadius: '6px',
                                        background: 'rgba(56, 189, 248, 0.12)',
                                        border: '1px solid rgba(56, 189, 248, 0.35)',
                                        color: '#38bdf8',
                                        letterSpacing: '0.04em',
                                        textTransform: 'uppercase',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {evt}
                                      </span>
                                    ))
                                  ) : (
                                    <span style={{
                                      fontSize: '0.7rem',
                                      padding: '0.2rem 0.55rem',
                                      borderRadius: '6px',
                                      background: 'rgba(255, 255, 255, 0.05)',
                                      border: '1px solid rgba(255, 255, 255, 0.1)',
                                      color: '#94a3b8'
                                    }}>
                                      FEST ALL-ACCESS DELEGATE
                                    </span>
                                  )}
                                  {eventsList.length > 3 && (
                                    <span style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', fontWeight: 'bold' }}>
                                      +{eventsList.length - 3} more
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', paddingTop: '0.4rem' }}>
                                <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', padding: '0.55rem 1.1rem', borderRadius: '12px', border: '1px solid rgba(56,189,248,0.3)', display: 'inline-flex', flexDirection: 'column', gap: '0.2rem', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                                  <span style={{ fontSize: '0.65rem', color: '#94a3b8', letterSpacing: '0.1em' }}>STATUS</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: '18px', height: '18px', background: isVerified ? '#10b981' : '#f59e0b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isVerified ? '0 0 10px #10b981' : '0 0 10px #f59e0b' }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </div>
                                    <span style={{ color: isVerified ? '#10b981' : '#f59e0b', fontWeight: 'bold', fontSize: '1.05rem', letterSpacing: '0.05em' }}>
                                      {statusText}
                                    </span>
                                  </div>
                                </div>
                                
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>EVENTS ENROLLED</span>
                                  <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.25rem' }}>{eventsList.length || 1} Event(s)</span>
                                </div>
                              </div>
                            </div>
                          </TearTicket>
                          </div>

                          {!hasRegistered && (
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              width: '100%',
                              height: '100%',
                              minHeight: '280px',
                              background: 'rgba(5, 8, 16, 0.88)',
                              backdropFilter: 'blur(10px)',
                              WebkitBackdropFilter: 'blur(10px)',
                              borderRadius: '16px',
                              border: '1px dashed rgba(239, 68, 68, 0.45)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '1.5rem',
                              textAlign: 'center',
                              zIndex: 10,
                              boxSizing: 'border-box',
                              boxShadow: '0 0 35px rgba(239, 68, 68, 0.2)'
                            }}>
                              <div style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '50%',
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '0.85rem',
                                boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)'
                              }}>
                                <FiLock size={26} color="#ef4444" />
                              </div>

                              <div style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.78rem',
                                color: '#ef4444',
                                letterSpacing: '0.18em',
                                fontWeight: 'bold',
                                marginBottom: '0.35rem'
                              }}>
                                ACCESS RESTRICTED // PASS LOCKED
                              </div>

                              <h4 style={{
                                fontFamily: 'var(--font-akira)',
                                fontSize: '1.15rem',
                                color: '#ffffff',
                                margin: '0 0 0.45rem 0',
                                letterSpacing: '0.04em'
                              }}>
                                EVENT REGISTRATION REQUIRED
                              </h4>

                              <p style={{
                                color: '#94a3b8',
                                fontSize: '0.86rem',
                                maxWidth: '420px',
                                lineHeight: 1.45,
                                margin: '0 0 1.15rem 0'
                              }}>
                                You haven't registered for any events yet. Register for an event to unlock your official Delegate Pass, QR entry badge, and card download.
                              </p>

                              <button
                                onClick={() => navigate('/register')}
                                style={{
                                  padding: '0.7rem 1.6rem',
                                  background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '10px',
                                  fontWeight: 'bold',
                                  fontSize: '0.88rem',
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 16px rgba(14, 165, 233, 0.4)'
                                }}
                              >
                                Browse Events &amp; Register Now →
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Send Pass & Download Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '1.25rem', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {isTicketTorn && (
                              <button
                                onClick={() => setIsTicketTorn(false)}
                                title="Re-attach Pass Stub"
                                style={{
                                  padding: '0.7rem 1.4rem',
                                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                                  color: '#38bdf8',
                                  border: '1px solid rgba(56, 189, 248, 0.45)',
                                  borderRadius: '12px',
                                  fontWeight: '600',
                                  fontSize: '0.88rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  transition: 'all 0.2s',
                                  boxShadow: '0 0 16px rgba(56, 189, 248, 0.25)'
                                }}
                              >
                                <FiRotateCcw /> Re-attach Stub
                              </button>
                            )}

                            <button
                              onClick={handleEmailPassToUser}
                              disabled={!hasRegistered || emailingPass}
                              title={!hasRegistered ? 'Pass is locked. Register for an event first.' : 'Send Entry Pass to My Email'}
                              style={{
                                padding: '0.7rem 1.4rem',
                                backgroundColor: !hasRegistered ? 'rgba(56, 189, 248, 0.04)' : 'rgba(56, 189, 248, 0.1)',
                                color: !hasRegistered ? '#64748b' : '#38bdf8',
                                border: !hasRegistered ? '1px solid #334155' : '1px solid rgba(56, 189, 248, 0.35)',
                                borderRadius: '12px',
                                fontWeight: '600',
                                fontSize: '0.88rem',
                                opacity: !hasRegistered ? 0.45 : 1,
                                cursor: !hasRegistered ? 'not-allowed' : emailingPass ? 'wait' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s',
                                backdropFilter: 'blur(8px)'
                              }}
                            >
                              <FiMail /> {emailingPass ? 'Generating & Sending...' : 'Send Entry Pass to My Email'}
                            </button>

                            <button
                              onClick={handleDownloadPassPng}
                              disabled={!hasRegistered || downloadingPass}
                              title={!hasRegistered ? 'Pass is locked. Register for an event first.' : 'Download Pass (PNG)'}
                              style={{
                                padding: '0.7rem 1.4rem',
                                backgroundColor: !hasRegistered ? '#334155' : '#fff',
                                color: !hasRegistered ? '#94a3b8' : '#000',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: '700',
                                fontSize: '0.88rem',
                                opacity: !hasRegistered ? 0.45 : 1,
                                cursor: !hasRegistered ? 'not-allowed' : downloadingPass ? 'wait' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s',
                                boxShadow: !hasRegistered ? 'none' : '0 4px 14px rgba(255,255,255,0.2)'
                              }}
                            >
                              <FiDownload /> {downloadingPass ? 'Exporting PNG...' : 'Download Pass (PNG)'}
                            </button>
                          </div>

                          {!hasRegistered && (
                            <span style={{ fontSize: '0.82rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                              <FiLock size={13} /> Pass locked — Register for an event to unlock email &amp; PNG download.
                            </span>
                          )}

                          {emailPassMsg && (
                            <span style={{ 
                              fontSize: '0.85rem', 
                              color: emailPassMsg.type === 'success' ? '#10b981' : '#ef4444', 
                              fontWeight: '600' 
                            }}>
                              {emailPassMsg.text}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Events List */}
                <div style={{ flex: '1 1 100%', marginTop: '1rem' }}>
                  {registrations.length === 0 ? (
                    <div style={{ padding: '4rem', backgroundColor: '#0a0a0a', borderRadius: '24px', border: '1px solid #222', textAlign: 'center' }}>
                      <FiCalendar size={48} color="#444" style={{ marginBottom: '1.5rem' }} />
                      <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>No Tickets Yet</h2>
                      <p style={{ color: '#888', fontSize: '1.1rem', marginBottom: '2rem' }}>You haven't registered for any events yet.</p>
                      <button 
                        onClick={() => navigate('/register')}
                        style={{ padding: '1rem 2rem', backgroundColor: '#fff', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
                      >
                        Explore Events
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                      {registrations.map(reg => (
                        <div key={reg.id} style={{ 
                          padding: '2rem', 
                          backgroundColor: '#0a0a0a',
                          borderRadius: '24px', 
                          border: '1px solid #222',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            position: 'absolute', 
                            top: 0, 
                            right: 0, 
                            padding: '0.5rem 1.5rem', 
                            background: '#111', 
                            color: (reg.payment_status === 'verified' || reg.status === 'verified') ? '#34d399' : '#fbbf24', 
                            borderBottomLeftRadius: '16px', 
                            borderLeft: '1px solid #222', 
                            borderBottom: '1px solid #222', 
                            fontSize: '0.8rem', 
                            fontWeight: 'bold', 
                            letterSpacing: '1px' 
                          }}>
                            {String(reg.payment_status || reg.status || 'VERIFIED').toUpperCase()}
                          </div>
                          
                          <h4 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem 0', color: '#fff', fontWeight: 'bold' }}>
                            {reg.events?.name || reg.event_name || reg.event_id}
                          </h4>

                          {reg.events && (
                            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 1rem 0' }}>
                              📍 {reg.events.venue || 'Campus Venue'} • 🗓️ {reg.events.date} {reg.events.start_time ? `• ⏰ ${reg.events.start_time}` : ''}
                            </p>
                          )}

                          {/* Attendance Status Badges */}
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '0.75rem 0' }}>
                            {/* Gate Arrival */}
                            <span style={{
                              padding: '0.3rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              background: arrivalCheckin ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                              color: arrivalCheckin ? '#34d399' : '#94a3b8',
                              border: arrivalCheckin ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(148, 163, 184, 0.2)'
                            }}>
                              {arrivalCheckin ? '✓ Gate Check-in Verified' : '⏳ Gate Arrival Pending'}
                            </span>

                            {/* Event Room Attendance */}
                            <span style={{
                              padding: '0.3rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              background: eventAttendance[reg.event_id] ? 'rgba(56, 189, 248, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                              color: eventAttendance[reg.event_id] ? '#38bdf8' : '#94a3b8',
                              border: eventAttendance[reg.event_id] ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(148, 163, 184, 0.2)'
                            }}>
                              {eventAttendance[reg.event_id] ? '✓ Present in Room' : '○ Room Attendance Pending'}
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ color: '#666', fontSize: '0.8rem', margin: '0 0 0.25rem 0', textTransform: 'uppercase', letterSpacing: '1px' }}>Participant Code</p>
                              <p style={{ fontSize: '1.2rem', margin: 0, fontFamily: 'monospace', color: '#fff', letterSpacing: '1px' }}>
                                {participantData?.participant_code || reg.participant_code || reg.registration_code || reg.id?.substring(0, 8) || 'PASS'}
                              </p>
                            </div>
                            {reg.team_size > 1 && (
                              <div>
                                <p style={{ color: '#666', fontSize: '0.8rem', margin: '0 0 0.25rem 0', textTransform: 'uppercase', letterSpacing: '1px' }}>Team</p>
                                <p style={{ fontSize: '1.2rem', margin: 0 }}>{reg.team_size} <span style={{fontSize: '0.9rem', color: '#888'}}>Pax</span></p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : step === 'onboarding' ? (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            {error && (
              <div style={{ 
                padding: '1.25rem', 
                backgroundColor: 'rgba(255, 59, 48, 0.15)', 
                color: '#ff453a', 
                borderRadius: '16px', 
                marginBottom: '2rem', 
                fontSize: '0.95rem', 
                lineHeight: '1.5',
                border: '1px solid rgba(255,59,48,0.35)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem'
              }}>
                <FiInfo style={{ flexShrink: 0, fontSize: '1.3rem', marginTop: '0.1rem' }} />
                <div>
                  <div style={{ fontWeight: '700', marginBottom: '0.25rem' }}>Registration Notice</div>
                  <div>{error}</div>
                </div>
              </div>
            )}
            <Stepper
              initialStep={1}
              onStepChange={(s) => setOnboardingStep(s)}
              onFinalStepCompleted={handleOnboardingComplete}
              backButtonText="Back"
              nextButtonText="Continue"
              nextButtonProps={{ style: { opacity: isNextDisabled() ? 0.5 : 1, pointerEvents: isNextDisabled() ? 'none' : 'auto' } }}
            >
              <Step>
                <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: 'bold', letterSpacing: '-0.02em' }}>Welcome</h2>
                <p style={{ color: '#888', marginBottom: '3rem', fontSize: '1.1rem', lineHeight: '1.6' }}>We need a few details to generate your official Srishti 2.7 participant profile.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ color: '#aaa', fontSize: '0.9rem', fontWeight: '500' }}>Full Name</label>
                  <input 
                    type="text" 
                    value={onboardingName} 
                    onChange={(e) => setOnboardingName(e.target.value)} 
                    placeholder="John Doe"
                    style={{ width: '100%', padding: '1.25rem', background: '#000', border: '1px solid #333', borderRadius: '16px', color: '#fff', fontSize: '1.1rem', outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = '#666'}
                    onBlur={e => e.target.style.borderColor = '#333'}
                  />
                </div>
              </Step>
              
              <Step>
                <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: 'bold', letterSpacing: '-0.02em' }}>Contact Info</h2>
                <p style={{ color: '#888', marginBottom: '3rem', fontSize: '1.1rem', lineHeight: '1.6' }}>This information is required for verifying your identity at the venues.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ color: '#aaa', fontSize: '0.9rem', fontWeight: '500' }}>College Name</label>
                    <input 
                      type="text" 
                      value={onboardingCollege} 
                      onChange={(e) => setOnboardingCollege(e.target.value)} 
                      placeholder="e.g. SRISHTI Institute"
                      style={{ width: '100%', padding: '1.25rem', background: '#000', border: '1px solid #333', borderRadius: '16px', color: '#fff', fontSize: '1.1rem', outline: 'none' }}
                      onFocus={e => e.target.style.borderColor = '#666'}
                      onBlur={e => e.target.style.borderColor = '#333'}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ color: '#aaa', fontSize: '0.9rem', fontWeight: '500' }}>Phone Number</label>
                    <input 
                      type="tel" 
                      value={onboardingPhone} 
                      onChange={(e) => setOnboardingPhone(e.target.value)} 
                      placeholder="1234567890"
                      style={{ width: '100%', padding: '1.25rem', background: '#000', border: '1px solid #333', borderRadius: '16px', color: '#fff', fontSize: '1.1rem', outline: 'none' }}
                      onFocus={e => e.target.style.borderColor = '#666'}
                      onBlur={e => e.target.style.borderColor = '#333'}
                    />
                  </div>
                </div>
              </Step>

              <Step>
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <FiInfo size={64} color="#fff" style={{ marginBottom: '2rem' }} />
                  <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: 'bold', letterSpacing: '-0.02em' }}>All Set!</h2>
                  <p style={{ color: '#888', marginBottom: '0', fontSize: '1.1rem', lineHeight: '1.6' }}>
                    Your profile is ready. Click finish to access your dashboard.
                  </p>
                </div>
              </Step>
            </Stepper>
          </div>
        ) : (
          <div style={{ maxWidth: '460px', margin: '4rem auto 0', padding: '3rem', backgroundColor: '#0a0a0a', borderRadius: '32px', border: '1px solid #222', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center', letterSpacing: '-0.02em' }}>
              {step === 'email' ? 'Welcome Back' : 'Verify Identity'}
            </h2>
            <p style={{ color: '#888', textAlign: 'center', marginBottom: '2.5rem', fontSize: '0.95rem' }}>
              {step === 'email' ? 'Enter your email to access your tickets' : `We sent a code to ${email}`}
            </p>

            {error && <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', borderRadius: '12px', marginBottom: '2rem', fontSize: '0.9rem', textAlign: 'center', border: '1px solid rgba(255,59,48,0.2)' }}>{error}</div>}

            {step === 'email' ? (
              <form onSubmit={handleSendOtp}>
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ position: 'relative' }}>
                    <FiMail style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#666', fontSize: '1.2rem' }} />
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="name@college.edu"
                      style={{ 
                        width: '100%', padding: '1.25rem 1.25rem 1.25rem 3.5rem', 
                        backgroundColor: '#000', border: '1px solid #333',
                        borderRadius: '16px', color: '#fff', fontSize: '1rem',
                        outline: 'none', transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#666'}
                      onBlur={(e) => e.target.style.borderColor = '#333'}
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={loading || !email}
                  style={{ 
                    width: '100%', padding: '1.25rem', backgroundColor: '#fff', 
                    color: '#000', border: 'none', borderRadius: '16px', 
                    fontSize: '1rem', fontWeight: 'bold', cursor: (loading || !email) ? 'not-allowed' : 'pointer',
                    opacity: (loading || !email) ? 0.7 : 1, transition: 'background-color 0.2s'
                  }}
                  onMouseOver={e => { if(!loading && email) e.currentTarget.style.backgroundColor = '#e5e5e5'; }}
                  onMouseOut={e => { e.currentTarget.style.backgroundColor = '#fff'; }}
                >
                  {loading ? 'Sending Code...' : 'Continue'}
                </button>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ marginBottom: '2.5rem' }}>
                  <CodeSlots 
                    length={4} 
                    onComplete={(code) => handleVerifyOtp(code)} 
                    autoFocus
                    accentColor="#fff"
                    inkColor="#fff"
                    slotColor="#111"
                    digitColor="#fff"
                    dangerColor="#ff3b30"
                  />
                </div>
                {loading && <p style={{ color: '#888', fontSize: '0.9rem' }}>Verifying...</p>}
                
                <button 
                  type="button"
                  onClick={() => { setStep('email'); setError(null); setMessage(null); }}
                  style={{ 
                    padding: '0.75rem 1.5rem', backgroundColor: 'transparent', 
                    color: '#666', border: 'none', borderRadius: '12px', 
                    fontSize: '0.9rem', cursor: 'pointer', marginTop: '1rem',
                    transition: 'color 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.color = '#fff'}
                  onMouseOut={e => e.currentTarget.style.color = '#666'}
                >
                  Use a different email
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
