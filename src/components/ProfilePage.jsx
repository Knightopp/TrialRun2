import React, { useState, useEffect } from 'react';
import { FiMail, FiLogOut, FiCalendar, FiArrowLeft, FiUser, FiPhone, FiBook, FiInfo, FiDownload, FiLock, FiRotateCcw, FiRefreshCw, FiCheckCircle, FiAlertCircle, FiShield, FiMapPin, FiClock, FiKey, FiArrowRight } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import CodeSlots from './CodeSlots';
import Stepper, { Step } from './Stepper';
import TearTicket from './TearTicket';
import { QRCodeSVG } from 'qrcode.react';
import { generateEntryPassEmailHtml } from '../utils/entryPassEmail';
import { generateCardImagePng, downloadPngFromDataUrl } from '../utils/cardImageGenerator';
import { supabase } from '../supabaseClient';
import SideRays from './SideRays';
import SafeVisual from './SafeVisual';
import ProfileCard from './ProfileCard';

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
  const [onboardingDepartment, setOnboardingDepartment] = useState('');
  const [onboardingYear, setOnboardingYear] = useState('');

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCollege, setEditCollege] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [emailingPass, setEmailingPass] = useState(false);
  const [downloadingPass, setDownloadingPass] = useState(false);
  const [emailPassMsg, setEmailPassMsg] = useState(null);
  const [arrivalCheckin, setArrivalCheckin] = useState(null);
  const [eventAttendance, setEventAttendance] = useState({});
  const [signedPassQr, setSignedPassQr] = useState('');
  const [isTicketTorn, setIsTicketTorn] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isAdminUser, setIsAdminUser] = useState(false);

  // 60-second cooldown timer for resending OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  useEffect(() => {
    const code = participantData?.participant_code || null;
    if (code) {
      import('../utils/cryptoSecurity').then(({ generatePassPayload }) => {
        // Generates plain participant code string for 100% Flutter scanner compatibility
        const payload = generatePassPayload(code);
        setSignedPassQr(payload);
      });
    }
  }, [participantData]);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data: { session: authSession } }) => {
      if (!alive) return;
      if (!authSession?.user?.email) {
        localStorage.removeItem('srishti_session');
        setLoading(false);
        return;
      }
      const savedEmail = authSession.user.email.trim().toLowerCase();
      setSession(authSession);
      localStorage.setItem('srishti_session', savedEmail);
      try {
        const found = await fetchUserData(savedEmail);
        if (!alive) return;
        setStep(found ? 'dashboard' : 'not_registered');
      } catch (err) {
        if (alive) {
          setError(err.message || 'Could not load your profile. Please try again.');
          setStep('not_registered');
        }
      } finally {
        if (alive) setLoading(false);
      }
    });
    return () => { alive = false; };
  }, []);

  async function fetchUserData(userEmail) {
    const clean = (userEmail || '').trim().toLowerCase();
    const { data, error: profileError } = await supabase.functions.invoke('participant-profile', {
      body: { action: 'get' }
    });
    if (profileError || !data?.success) {
      throw new Error(data?.error || profileError?.message || 'Could not load your profile.');
    }
    const currentParticipant = data.participant || null;
    const regs = Array.isArray(data.registrations) ? data.registrations : [];

    if (currentParticipant) {
      setParticipantData(currentParticipant);
      setEditName(currentParticipant.name || '');
      setEditCollege(currentParticipant.college || '');
      setEditPhone(currentParticipant.phone || '');
      setEditDepartment(currentParticipant.department || '');
      setEditYear(currentParticipant.year || '');
    }
    setRegistrations(regs);
    if (currentParticipant) {
      localStorage.setItem(`srishti_profile_${clean}`, JSON.stringify(currentParticipant));
    }
    localStorage.setItem(`srishti_user_registrations_${clean}`, JSON.stringify(regs));
    setArrivalCheckin(data.arrival_checkin || null);
    if (Array.isArray(data.attendance_logs)) {
      const attMap = {};
      data.attendance_logs.forEach((log) => {
        if (log.event_id) attMap[log.event_id] = log;
      });
      setEventAttendance(attMap);
    } else {
      setEventAttendance({});
    }

    // Check if current user is an authorized administrator
    try {
      if (clean === 'tsrknight@gmail.com') {
        setIsAdminUser(true);
      } else {
        const { data: vStaff } = await supabase
          .from('volunteers')
          .select('id, role, status')
          .ilike('email', clean)
          .eq('status', 'active')
          .maybeSingle();
        if (vStaff && (vStaff.role === 'admin' || vStaff.role === 'registration')) {
          setIsAdminUser(true);
        } else {
          setIsAdminUser(false);
        }
      }
    } catch (_) {
      if (clean === 'tsrknight@gmail.com') setIsAdminUser(true);
    }

    return !!currentParticipant || regs.length > 0;
  }
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;
    setError(null);
    setMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      // 1. Request secure 6-digit numeric OTP via server-side Edge Function
      const { data: sendData, error: sendError } = await supabase.functions.invoke('participant-profile', {
        body: { action: 'send-otp', email: cleanEmail }
      });

      if (sendError || !sendData?.success) {
        if (sendData?.not_registered) {
          setError('No registered participant found with this email. Please register for an event first.');
        } else if (sendData?.cooldown_remaining) {
          setResendCooldown(sendData.cooldown_remaining);
          setError(sendData?.error || 'Please wait before requesting another code.');
        } else {
          setError(sendData?.error || sendError?.message || 'Failed to send OTP. Please try again.');
        }
        setLoading(false);
        return;
      }

      // 2. Transition to numeric OTP verification step
      setEmail(cleanEmail);
      setOtpCode('');
      setStep('otp');
      setMessage('OTP sent to your email.');
      setResendCooldown(60);
    } catch (err) {
      console.error('Send OTP error:', err);
      setError(err.message || 'Network error while sending OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setError(null);
    setMessage(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    try {
      const { data: resendData, error: resendError } = await supabase.functions.invoke('participant-profile', {
        body: { action: 'send-otp', email: cleanEmail }
      });

      if (resendError || !resendData?.success) {
        setError(resendData?.error || resendError?.message || 'Failed to resend code.');
        if (resendData?.cooldown_remaining) setResendCooldown(resendData.cooldown_remaining);
        setLoading(false);
        return;
      }

      setMessage('A new 6-digit OTP has been sent to your email.');
      setResendCooldown(60);
    } catch (err) {
      setError(err.message || 'Network error resending code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (codeToVerify) => {
    const cleanToken = (codeToVerify || otpCode || '').trim();
    if (!cleanToken) {
      setError('Please enter the verification code.');
      return;
    }
    if (cleanToken.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const savedEmail = email.trim().toLowerCase();
      // 1. Verify numeric OTP server-side
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('participant-profile', {
        body: { action: 'verify-otp', email: savedEmail, otp: cleanToken }
      });

      if (verifyError || !verifyData?.success) {
        setError(verifyData?.error || verifyError?.message || 'Incorrect verification code. Please try again.');
        setLoading(false);
        return;
      }

      // 2. Establish official Supabase session in browser using verified token_hash
      if (verifyData.token_hash) {
        try {
          const { data: authResult } = await supabase.auth.verifyOtp({
            token_hash: verifyData.token_hash,
            type: 'email'
          });
          if (authResult?.session) {
            setSession(authResult.session);
          }
        } catch (_) {}
      }

      localStorage.setItem('srishti_session', savedEmail);

      // 3. Load participant profile and pass
      const found = await fetchUserData(savedEmail);
      if (!found) {
        setStep('not_registered');
      } else {
        setStep('dashboard');
      }
    } catch (err) {
      console.error('Verify OTP error:', err);
      setError(err.message || 'Verification error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = async () => {
    setLoading(true);
    setError(null);
    const userEmail = (session?.user?.email || localStorage.getItem('srishti_session') || '').replace(/[\'"]+/g, '').trim().toLowerCase();
    const { data, error } = await supabase.functions.invoke('participant-profile', {
      body: {
        action: 'save',
        profile: {
          name: onboardingName.trim(),
          phone: onboardingPhone.trim(),
          college: onboardingCollege.trim(),
          department: onboardingDepartment.trim(),
          year: onboardingYear.trim()
        }
      }
    });
    if (error || !data?.success || !data.participant) {
      setError(data?.error || error?.message || 'Could not save your profile. Please try again.');
      setLoading(false);
      return;
    }
    const activeParticipant = data.participant;
    localStorage.setItem(`srishti_profile_${userEmail}`, JSON.stringify(activeParticipant));
    localStorage.setItem('srishti_session', userEmail);
    localStorage.setItem('srishti_user_name', activeParticipant.name);
    localStorage.setItem('srishti_user_college', activeParticipant.college);
    localStorage.setItem('srishti_user_phone', activeParticipant.phone);
    setParticipantData(activeParticipant);
    await fetchUserData(userEmail);
    setStep('dashboard');
    setLoading(false);
  };
  const handleLogout = () => {
    supabase.auth.signOut();
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
    setError(null);
    setMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke('participant-profile', {
        body: {
          action: 'save',
          profile: {
            name: editName,
            college: editCollege,
            phone: editPhone,
            department: editDepartment,
            year: editYear
          }
        }
      });
      if (error || !data?.success || !data.participant) {
        throw new Error(data?.error || error?.message || 'Failed to save your profile.');
      }
      const updated = data.participant;
      setParticipantData(updated);
      localStorage.setItem('srishti_user_name', editName);
      localStorage.setItem('srishti_user_college', editCollege);
      localStorage.setItem('srishti_user_phone', editPhone);
      const cleanEmail = (participantData?.email || '').trim().toLowerCase();
      if (cleanEmail) {
        localStorage.setItem(`srishti_profile_${cleanEmail}`, JSON.stringify(updated));
      }
      setIsEditing(false);
      setMessage('Profile changes saved.');
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const getPassData = () => {
    const attendeeName = participantData?.name || 'Participant';
    const college = participantData?.college || 'St Thomas College Thrissur';
    const passCode = participantData?.participant_code || registrations[0]?.participant_code || 'SRI27-PASS';
    const passToken = participantData?.pass_token || registrations[0]?.pass_token || '';
    const events = registrations.map(r => r.events?.name || r.event_name).filter(Boolean);
    const hasVerifiedRegistration = registrations.length > 0 && registrations.some(r => r.payment_status === 'verified' || r.status === 'verified');
    const hasPendingPayment = registrations.some(r => r.payment_status === 'pending');
    const isVerified = hasVerifiedRegistration;
    const statusText = isVerified ? 'VERIFIED' : (hasPendingPayment ? 'PAYMENT PENDING' : (registrations.length === 0 ? 'LOCKED' : 'PENDING'));
    return { attendeeName, college, passCode, passToken, events, isVerified, statusText, hasPendingPayment };
  };

  const handleEmailPassToUser = async () => {
    const hasRegistered = registrations.length > 0;
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
    if (!data.isVerified) {
      alert('Your registration is pending payment verification by the FEST coordinator. Your entry pass will be issued once payment is approved.');
      return;
    }
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

      const { data: passRes, error: passErr } = await supabase.functions.invoke('participant-profile', {
        body: {
          action: 'email-pass',
          subject: `Your Srishti 2.7 Digital Entry Pass — ${data.attendeeName}`,
          html: ticketHtml,
          image: cardPng // Attached as inline image and PNG file!
        }
      });

      if (passErr || !passRes?.success) throw new Error(passRes?.error || passErr?.message || 'Failed to send pass email.');
      setEmailPassMsg({ type: 'success', text: `Pass sent to ${targetEmail} with full-res card!` });
      setTimeout(() => setEmailPassMsg(null), 5000);
    } catch (err) {
      console.error(err);
      setEmailPassMsg({ type: 'error', text: err.message || 'Could not send email. Please try again.' });
      setTimeout(() => setEmailPassMsg(null), 5000);
    } finally {
      setEmailingPass(false);
    }
  };

  const handleDownloadPassPng = async () => {
    const hasRegistered = registrations.length > 0;
    if (!hasRegistered) {
      alert('Your delegate pass is locked. Please register for at least one event first.');
      return;
    }

    const data = getPassData();
    if (!data.isVerified) {
      alert('Your registration is pending payment verification by the FEST coordinator. Your entry pass will be issued once payment is approved.');
      return;
    }
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <SafeVisual>
            <SideRays
              speed={2.2}
              rayColor1="#38bdf8"
              rayColor2="#1d4ed8"
              intensity={2.2}
              spread={2}
              origin="top-right"
              tilt={0}
              saturation={1.5}
              blend={0.7}
              falloff={1.5}
              opacity={0.85}
            />
          </SafeVisual>
        </div>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: '2px solid rgba(56, 189, 248, 0.2)',
            borderTopColor: '#38bdf8',
            boxShadow: '0 0 20px rgba(56, 189, 248, 0.3)',
            animation: 'srishtiSpin 0.9s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite'
          }} />
          <div style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '0.82rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#94a3b8'
          }}>
            Authenticating Session
          </div>
        </div>
        <style>{`@keyframes srishtiSpin { to { transform: rotate(360deg); } }`}</style>
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
      {/* React Bits Volumetric SideRays Ambient Background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden'
      }}>
        <SafeVisual>
          <SideRays
            speed={2.2}
            rayColor1="#38bdf8"
            rayColor2="#1d4ed8"
            intensity={1.8}
            spread={2.2}
            origin="top-right"
            tilt={-5}
            saturation={1.4}
            blend={0.75}
            falloff={1.6}
            opacity={0.85}
          />
        </SafeVisual>
      </div>

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
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                {(isAdminUser || (session?.user?.email || '').toLowerCase().trim() === 'tsrknight@gmail.com') && (
                  <button
                    onClick={() => navigate('/admin')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1.4rem',
                      background: 'linear-flex',
                      backgroundColor: 'rgba(56, 189, 248, 0.12)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: '700',
                      letterSpacing: '0.04em',
                      fontSize: '0.88rem',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: '0 0 15px rgba(56, 189, 248, 0.15)'
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.22)';
                      e.currentTarget.style.borderColor = '#38bdf8';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.12)';
                      e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                    }}
                  >
                    <FiShield size={16} /> Admin Command Center
                  </button>
                )}
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

            {(error || message) && (
              <div style={{
                marginTop: '1.5rem',
                padding: '0.9rem 1.1rem',
                borderRadius: '12px',
                color: error ? '#ff8b8b' : '#86efac',
                background: error ? 'rgba(255,59,48,0.1)' : 'rgba(16,185,129,0.1)',
                border: `1px solid ${error ? 'rgba(255,59,48,0.25)' : 'rgba(16,185,129,0.25)'}`
              }}>
                {error || message}
              </div>
            )}

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
                        <label style={{ color: '#666', fontSize: '0.75rem', textTransform: 'uppercase' }}>Email (Account Bound)</label>
                        <input type="email" value={participantData?.email || session?.user?.email || ''} disabled style={{ width: '100%', padding: '0.75rem', background: '#181818', border: '1px solid #282828', color: '#888', borderRadius: '8px', marginTop: '0.25rem', cursor: 'not-allowed' }} />
                      </div>
                      <div>
                        <label style={{ color: '#666', fontSize: '0.75rem', textTransform: 'uppercase' }}>College</label>
                        <input type="text" value={editCollege} onChange={e => setEditCollege(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: '#111', border: '1px solid #333', color: '#fff', borderRadius: '8px', marginTop: '0.25rem' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ color: '#666', fontSize: '0.75rem', textTransform: 'uppercase' }}>Department</label>
                          <input type="text" value={editDepartment} onChange={e => setEditDepartment(e.target.value)} placeholder="e.g. CSE" style={{ width: '100%', padding: '0.75rem', background: '#111', border: '1px solid #333', color: '#fff', borderRadius: '8px', marginTop: '0.25rem' }} />
                        </div>
                        <div>
                          <label style={{ color: '#666', fontSize: '0.75rem', textTransform: 'uppercase' }}>Year</label>
                          <input type="text" value={editYear} onChange={e => setEditYear(e.target.value)} placeholder="e.g. 2nd Year" style={{ width: '100%', padding: '0.75rem', background: '#111', border: '1px solid #333', color: '#fff', borderRadius: '8px', marginTop: '0.25rem' }} />
                        </div>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div>
                        <p style={{ color: '#666', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 0.25rem 0' }}>Name</p>
                        <p style={{ fontSize: '1.2rem', margin: 0, fontWeight: '500' }}>{participantData?.name || 'Participant'}</p>
                      </div>
                      <div>
                        <p style={{ color: '#666', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 0.25rem 0' }}>Email</p>
                        <p style={{ fontSize: '1rem', margin: 0, fontWeight: '500', color: '#aaa' }}>{participantData?.email || session?.user?.email || '-'}</p>
                      </div>
                      <div>
                        <p style={{ color: '#666', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 0.25rem 0' }}>College</p>
                        <p style={{ fontSize: '1.1rem', margin: 0, fontWeight: '500' }}>{participantData?.college || '-'}</p>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <p style={{ color: '#666', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 0.25rem 0' }}>Department</p>
                          <p style={{ fontSize: '1.05rem', margin: 0, fontWeight: '500' }}>{participantData?.department || '-'}</p>
                        </div>
                        <div>
                          <p style={{ color: '#666', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 0.25rem 0' }}>Year</p>
                          <p style={{ fontSize: '1.05rem', margin: 0, fontWeight: '500' }}>{participantData?.year || '-'}</p>
                        </div>
                      </div>
                      <div>
                        <p style={{ color: '#666', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 0.25rem 0' }}>Phone</p>
                        <p style={{ fontSize: '1.1rem', margin: 0, fontWeight: '500' }}>{participantData?.phone || '-'}</p>
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

                    const hasRegistered = registrations.length > 0;

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

                          {!hasRegistered ? (
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
                          ) : !isVerified ? (
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
                              border: '1px dashed rgba(245, 158, 11, 0.45)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '1.5rem',
                              textAlign: 'center',
                              zIndex: 10,
                              boxSizing: 'border-box',
                              boxShadow: '0 0 35px rgba(245, 158, 11, 0.2)'
                            }}>
                              <div style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '50%',
                                background: 'rgba(245, 158, 11, 0.15)',
                                border: '1px solid rgba(245, 158, 11, 0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '0.85rem',
                                boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)'
                              }}>
                                <FiLock size={26} color="#f59e0b" />
                              </div>

                              <div style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.78rem',
                                color: '#f59e0b',
                                letterSpacing: '0.18em',
                                fontWeight: 'bold',
                                marginBottom: '0.35rem'
                              }}>
                                PAYMENT VERIFICATION PENDING // PASS LOCKED
                              </div>

                              <h4 style={{
                                fontFamily: 'var(--font-akira)',
                                fontSize: '1.15rem',
                                color: '#ffffff',
                                margin: '0 0 0.45rem 0',
                                letterSpacing: '0.04em'
                              }}>
                                PAYMENT PENDING APPROVAL
                              </h4>

                              <p style={{
                                color: '#94a3b8',
                                fontSize: '0.86rem',
                                maxWidth: '440px',
                                lineHeight: 1.45,
                                margin: '0 0 1.15rem 0'
                              }}>
                                Your registration details have been submitted and are awaiting coordinator verification. Once your payment reference is verified, your official entry pass and download will unlock automatically.
                              </p>
                            </div>
                          ) : null}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <FiCalendar style={{ color: '#38bdf8' }} size={18} />
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
                        Registered Competitions
                      </h3>
                      {registrations.length > 0 && (
                        <span style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: '0.72rem',
                          color: '#38bdf8',
                          background: 'rgba(56, 189, 248, 0.08)',
                          padding: '0.15rem 0.55rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(56, 189, 248, 0.25)',
                          letterSpacing: '0.06em'
                        }}>
                          {registrations.length} ENROLLED
                        </span>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        const em = session?.user?.email || localStorage.getItem('srishti_session');
                        if (em) {
                          setLoading(true);
                          setError(null);
                          try {
                            await fetchUserData(em);
                            setMessage('Profile and tickets refreshed from the database.');
                          } catch (err) {
                            setError(err.message || 'Could not refresh your profile.');
                          }
                          setLoading(false);
                        }
                      }}
                      title="Refresh profile and tickets from the database"
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '8px',
                        color: '#cbd5e1',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <FiRotateCcw size={14} /> Refresh Tickets
                    </button>
                  </div>

                  {registrations.length === 0 ? (
                    <div style={{ padding: '4rem 2rem', backgroundColor: '#0a0a0a', borderRadius: '24px', border: '1px solid #222', textAlign: 'center' }}>
                      <FiCalendar size={48} color="#444" style={{ marginBottom: '1.5rem' }} />
                      <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>No Tickets Yet</h2>
                      <p style={{ color: '#888', fontSize: '1.1rem', marginBottom: '2rem' }}>You haven't registered for any events yet or your registration is syncing.</p>
                      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => navigate('/register')}
                          style={{ padding: '0.9rem 1.8rem', backgroundColor: '#fff', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' }}
                        >
                          Explore Events
                        </button>
                        <button
                          onClick={async () => {
                            const em = session?.user?.email || localStorage.getItem('srishti_session');
                            if (em) {
                              setLoading(true);
                              await fetchUserData(em);
                              setLoading(false);
                            }
                          }}
                          style={{ padding: '0.9rem 1.8rem', backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid #333', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                          <FiRotateCcw size={16} /> Reload Saved Tickets
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                      {registrations.map(reg => {
                        const isVerified = reg.payment_status === 'verified' || reg.status === 'verified';
                        const isGateChecked = Boolean(arrivalCheckin);
                        const isRoomChecked = Boolean(eventAttendance[reg.event_id]);
                        const codeVal = participantData?.participant_code || reg.participant_code || reg.registration_code || reg.id?.substring(0, 8) || 'PASS';
                        const eventName = reg.events?.name || reg.event_name || reg.event_id;
                        const eventCategory = reg.events?.category || 'COMPETITION';
                        const venueName = reg.events?.venue || 'Campus Venue';
                        const eventDate = reg.events?.date || 'Dec 2026';
                        const eventTime = reg.events?.start_time ? reg.events.start_time.substring(0, 5) : '10:00';

                        // Curated category badge pills matching the Ethan Harrison design
                        const badges = [
                          eventCategory.toUpperCase(),
                          reg.team_size > 1 ? `TEAM (${reg.team_size} PAX)` : 'SOLO',
                          isVerified ? 'VERIFIED' : 'PENDING'
                        ];

                        // 3-Column Telemetry stats (Rating / Earned / Rate equivalent)
                        const stats = [
                          {
                            value: isVerified ? '✓ PASS' : '⏳ PENDING',
                            label: 'Status'
                          },
                          {
                            value: isGateChecked ? 'IN' : 'WAIT',
                            label: 'Gate'
                          },
                          {
                            value: isRoomChecked ? 'HERE' : 'CALL',
                            label: 'Venue'
                          }
                        ];

                        const avatarImg = reg.events?.image || 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop';

                        return (
                          <ProfileCard
                            key={reg.id}
                            name={eventName}
                            title={`${venueName} · ${eventDate} @ ${eventTime}`}
                            avatarUrl={avatarImg}
                            badges={badges}
                            stats={stats}
                            actionText={`Pass: ${codeVal}`}
                            onActionClick={() => {
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            onShareClick={() => {
                              if (navigator.share) {
                                navigator.share({
                                  title: `Srishti 2.7 - ${eventName}`,
                                  text: `I'm registered for ${eventName} at Srishti 2.7! Code: ${codeVal}`,
                                  url: window.location.href
                                }).catch(() => {});
                              } else {
                                navigator.clipboard?.writeText?.(codeVal);
                                alert(`Copied Participant Code: ${codeVal}`);
                              }
                            }}
                            behindGlowColor={isVerified ? 'rgba(56, 189, 248, 0.4)' : 'rgba(234, 179, 8, 0.4)'}
                            behindGlowSize="40%"
                            innerGradient="linear-gradient(155deg, rgba(24, 25, 32, 0.95) 0%, rgba(13, 14, 18, 0.98) 100%)"
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : step === 'not_registered' ? (
          <div style={{ maxWidth: '500px', margin: '4rem auto 0', padding: '3rem', backgroundColor: '#0a0a0a', borderRadius: '32px', border: '1px solid #222', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(255, 149, 0, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#ff9500' }}>
              <FiAlertCircle size={32} />
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>Participant Registration Required</h2>
            <p style={{ color: '#888', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: '1.6' }}>
              No registered participant was found for <strong style={{ color: '#fff' }}>{email || session?.user?.email || 'this email'}</strong>.
              Participant passes and profiles are reserved for students registered for SRISHTI 2.7 events.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => navigate('/events')}
                style={{
                  width: '100%', padding: '1.1rem', backgroundColor: '#fff',
                  color: '#000', border: 'none', borderRadius: '16px',
                  fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#e5e5e5'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = '#fff'}
              >
                Browse Events & Register
              </button>
              <button
                type="button"
                onClick={() => {
                  supabase.auth.signOut().catch(() => {});
                  localStorage.removeItem('srishti_session');
                  setSession(null);
                  setStep('email');
                  setEmail('');
                  setOtpCode('');
                  setError(null);
                  setMessage(null);
                }}
                style={{
                  width: '100%', padding: '1rem', backgroundColor: 'transparent',
                  color: '#888', border: '1px solid #333', borderRadius: '16px',
                  fontSize: '0.95rem', cursor: 'pointer', transition: 'border-color 0.2s, color 0.2s'
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = '#666'; e.currentTarget.style.color = '#fff'; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#888'; }}
              >
                Use a Different Email
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            maxWidth: '480px',
            margin: '3rem auto 0',
            padding: '2.5rem',
            backgroundColor: 'rgba(12, 14, 20, 0.9)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            borderRadius: '28px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(56, 189, 248, 0.08)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Top Cyan Accent Beam */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '10%',
              right: '10%',
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)',
              boxShadow: '0 0 12px #38bdf8'
            }} />

            {/* Header Badge */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '50px',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                color: '#38bdf8',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: '700',
                letterSpacing: '0.12em',
                textTransform: 'uppercase'
              }}>
                <FiKey size={13} /> SRISHTI 2.7 • DELEGATE PORTAL
              </span>
            </div>

            <h2 style={{
              fontSize: '1.9rem',
              fontWeight: '800',
              marginBottom: '0.65rem',
              textAlign: 'center',
              letterSpacing: '-0.02em',
              color: '#ffffff'
            }}>
              {step === 'email' ? 'Claim Your Delegate Pass' : 'Enter Secure Access Code'}
            </h2>

            <p style={{
              color: '#94a3b8',
              textAlign: 'center',
              marginBottom: '2rem',
              fontSize: '0.92rem',
              lineHeight: '1.55',
              padding: '0 0.5rem'
            }}>
              {step === 'email'
                ? 'Enter your registered email address to retrieve your digital entry pass and access your festival schedule.'
                : `We dispatched a 6-digit verification code to ${email}`}
            </p>

            {message && (
              <div style={{
                padding: '0.85rem 1rem',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: '#34d399',
                borderRadius: '14px',
                marginBottom: '1.5rem',
                fontSize: '0.88rem',
                textAlign: 'center',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}>
                <FiCheckCircle size={16} />
                <span>{message}</span>
              </div>
            )}

            {error && (
              <div style={{
                padding: '0.85rem 1rem',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#f87171',
                borderRadius: '14px',
                marginBottom: '1.5rem',
                fontSize: '0.88rem',
                textAlign: 'center',
                border: '1px solid rgba(239, 68, 68, 0.25)'
              }}>
                {error}
              </div>
            )}

            {step === 'email' ? (
              <form onSubmit={handleSendOtp}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    color: '#64748b',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: '0.5rem'
                  }}>
                    Registered Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <FiMail style={{
                      position: 'absolute',
                      left: '1.25rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#475569',
                      fontSize: '1.15rem'
                    }} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="e.g. name@college.edu"
                      style={{
                        width: '100%',
                        padding: '1.15rem 1.15rem 1.15rem 3.4rem',
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '16px',
                        color: '#ffffff',
                        fontSize: '0.98rem',
                        outline: 'none',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#38bdf8';
                        e.target.style.boxShadow = '0 0 15px rgba(56, 189, 248, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  style={{
                    width: '100%',
                    padding: '1.15rem',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '16px',
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    letterSpacing: '0.03em',
                    cursor: (loading || !email.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (loading || !email.trim()) ? 0.65 : 1,
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 8px 24px rgba(255, 255, 255, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6rem'
                  }}
                  onMouseOver={e => {
                    if (!loading && email.trim()) {
                      e.currentTarget.style.backgroundColor = '#38bdf8';
                      e.currentTarget.style.boxShadow = '0 8px 28px rgba(56, 189, 248, 0.35)';
                    }
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 255, 255, 0.12)';
                  }}
                >
                  {loading ? (
                    <>
                      <span style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(0, 0, 0, 0.25)',
                        borderTopColor: '#000000',
                        borderRadius: '50%',
                        animation: 'srishtiSpin 0.7s linear infinite'
                      }} />
                      <span>Sending One-Time Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue with Email</span>
                      <FiArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', marginBottom: '1.75rem' }}>
                  <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.85rem', textAlign: 'center' }}>
                    Enter 6-Digit Passcode
                  </label>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <CodeSlots
                      length={6}
                      value={otpCode}
                      onChange={(val) => setOtpCode(val)}
                      onComplete={(code) => handleVerifyOtp(code)}
                      autoFocus
                      accentColor="#38bdf8"
                      inkColor="#ffffff"
                      slotColor="rgba(0,0,0,0.6)"
                      digitColor="#ffffff"
                      dangerColor="#ef4444"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                  <button
                    type="button"
                    onClick={() => handleVerifyOtp(otpCode)}
                    disabled={loading || otpCode.trim().length < 6}
                    style={{
                      width: '100%',
                      padding: '1.15rem',
                      backgroundColor: '#38bdf8',
                      color: '#000',
                      border: 'none',
                      borderRadius: '16px',
                      fontSize: '0.98rem',
                      fontWeight: '700',
                      letterSpacing: '0.03em',
                      cursor: (loading || otpCode.trim().length < 6) ? 'not-allowed' : 'pointer',
                      opacity: (loading || otpCode.trim().length < 6) ? 0.5 : 1,
                      transition: 'all 0.2s',
                      boxShadow: '0 8px 24px rgba(56, 189, 248, 0.25)'
                    }}
                    onMouseOver={e => {
                      if (!loading && otpCode.trim().length >= 6) {
                        e.currentTarget.style.backgroundColor = '#7dd3fc';
                      }
                    }}
                    onMouseOut={e => { e.currentTarget.style.backgroundColor = '#38bdf8'; }}
                  >
                    {loading ? 'Verifying Credentials...' : 'Unlock Delegate Portal'}
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading || resendCooldown > 0}
                    style={{
                      width: '100%',
                      padding: '0.9rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: resendCooldown > 0 ? '#64748b' : '#cbd5e1',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '14px',
                      fontSize: '0.88rem',
                      fontWeight: '600',
                      cursor: (loading || resendCooldown > 0) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={e => { if(!loading && resendCooldown === 0) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; }}
                    onMouseOut={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'; }}
                  >
                    {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => { setStep('email'); setOtpCode(''); setError(null); setMessage(null); }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'transparent',
                    color: '#64748b',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    marginTop: '1rem',
                    transition: 'color 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.color = '#fff'}
                  onMouseOut={e => e.currentTarget.style.color = '#64748b'}
                >
                  Use a different email address
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
