import React, { useState, useEffect } from 'react';
import { FiMail, FiLogOut, FiCalendar, FiArrowLeft, FiUser, FiPhone, FiBook, FiInfo, FiDownload, FiLock, FiRotateCcw, FiRefreshCw, FiCheckCircle, FiAlertCircle, FiShield, FiMapPin, FiClock, FiKey, FiArrowRight, FiEdit2, FiChevronRight, FiCreditCard } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
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

export default function ProfilePage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
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
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [whatsAppPassMsg, setWhatsAppPassMsg] = useState(null);
  const [hasSentWhatsApp, setHasSentWhatsApp] = useState(() => {
    try {
      return localStorage.getItem('srishti_wa_pass_sent') === 'true';
    } catch (_) {
      return false;
    }
  });
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
        setInitialLoading(false);
        return;
      }
      const savedEmail = authSession.user.email.trim().toLowerCase();
      setSession(authSession);
      setEmail(savedEmail);
      localStorage.setItem('srishti_session', savedEmail);
      try {
        const found = await fetchUserData(savedEmail);
        if (!alive) return;
        setStep(found ? 'dashboard' : 'onboarding');
        if (found) {
          const searchParams = new URLSearchParams(window.location.search);
          const redirectUrl = searchParams.get('redirect');
          if (redirectUrl && redirectUrl.startsWith('/')) {
            navigate(redirectUrl);
            return;
          }
        }
      } catch (err) {
        if (alive) {
          const cached = localStorage.getItem(`srishti_profile_${savedEmail}`);
          if (cached) {
            setStep('dashboard');
          } else {
            setStep('onboarding');
          }
        }
      } finally {
        if (alive) setInitialLoading(false);
      }
    });
    return () => { alive = false; };
  }, []);

  async function fetchUserData(userEmail) {
    const clean = (userEmail || '').trim().toLowerCase();
    const { data, error: profileError } = await supabase.functions.invoke('participant-profile', {
      body: { action: 'get' }
    });

    // Check if participant is simply not registered yet
    let isNotRegistered = false;
    if (data?.not_registered || (!data?.participant && data?.success)) {
      isNotRegistered = true;
    } else if (profileError?.context && typeof profileError.context.json === 'function') {
      try {
        const errBody = await profileError.context.json();
        if (errBody?.not_registered) isNotRegistered = true;
      } catch (_) {}
    }

    if (isNotRegistered) {
      const cached = localStorage.getItem(`srishti_profile_${clean}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.name) {
            setParticipantData(parsed);
            setEditName(parsed.name || '');
            setEditCollege(parsed.college || '');
            setEditPhone(parsed.phone || '');
            setEditDepartment(parsed.department || '');
            setEditYear(parsed.year || '');
            return true;
          }
        } catch (_) {}
      }
      setParticipantData(null);
      setRegistrations([]);
      return false;
    }

    if (profileError || !data?.success) {
      let errMsg = 'Could not load your profile.';
      if (profileError?.context && typeof profileError.context.json === 'function') {
        try {
          const errBody = await profileError.context.json();
          errMsg = errBody?.error || errMsg;
        } catch (_) {}
      } else if (data?.error) {
        errMsg = data.error;
      }
      throw new Error(errMsg);
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
      // 1. Request secure 4-digit numeric OTP via server-side Edge Function
      const { data: sendData, error: sendError } = await supabase.functions.invoke('participant-profile', {
        body: { action: 'send-otp', email: cleanEmail }
      });

      if (sendError || !sendData?.success) {
        let errMessage = 'Failed to send OTP. Please try again.';
        if (sendError?.context && typeof sendError.context.json === 'function') {
          try {
            const errBody = await sendError.context.json();
            if (errBody?.error) errMessage = errBody.error;
            if (errBody?.cooldown_remaining) setResendCooldown(errBody.cooldown_remaining);
          } catch (_) {}
        } else if (sendData?.error) {
          errMessage = sendData.error;
          if (sendData?.cooldown_remaining) setResendCooldown(sendData.cooldown_remaining);
        }
        setError(errMessage);
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
        let errMessage = 'Failed to resend code.';
        if (resendError?.context && typeof resendError.context.json === 'function') {
          try {
            const errBody = await resendError.context.json();
            if (errBody?.error) errMessage = errBody.error;
            if (errBody?.cooldown_remaining) setResendCooldown(errBody.cooldown_remaining);
          } catch (_) {}
        } else if (resendData?.error) {
          errMessage = resendData.error;
          if (resendData?.cooldown_remaining) setResendCooldown(resendData.cooldown_remaining);
        }
        setError(errMessage);
        setLoading(false);
        return;
      }

      setMessage('A new 4-digit OTP has been sent to your email.');
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
    if (cleanToken.length !== 4 && cleanToken.length !== 6) {
      setError('Please enter the complete 4-digit verification code.');
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
        let errMessage = 'Incorrect verification code. Please check your email and try again.';
        if (verifyError?.context && typeof verifyError.context.json === 'function') {
          try {
            const errBody = await verifyError.context.json();
            if (errBody?.error) errMessage = errBody.error;
          } catch (_) {}
        } else if (verifyData?.error) {
          errMessage = verifyData.error;
        }
        setError(errMessage);
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
        setStep('onboarding');
      } else {
        setStep('dashboard');
        const searchParams = new URLSearchParams(window.location.search);
        const redirectUrl = searchParams.get('redirect');
        if (redirectUrl && redirectUrl.startsWith('/')) {
          navigate(redirectUrl);
          return;
        }
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
    const userEmail = (session?.user?.email || email || localStorage.getItem('srishti_session') || '').replace(/[\'"]+/g, '').trim().toLowerCase();

    if (!onboardingName.trim()) {
      setError('Please enter your full name.');
      setLoading(false);
      return;
    }
    if (!onboardingCollege.trim()) {
      setError('Please enter your college name.');
      setLoading(false);
      return;
    }
    if (!onboardingPhone.trim()) {
      setError('Please enter your phone number.');
      setLoading(false);
      return;
    }

    let savedParticipant = null;

    try {
      const { data, error } = await supabase.functions.invoke('participant-profile', {
        body: {
          action: 'save',
          profile: {
            name: onboardingName.trim(),
            phone: onboardingPhone.trim(),
            college: onboardingCollege.trim(),
            department: onboardingDepartment.trim() || 'General',
            year: onboardingYear.trim() || '1st Year'
          }
        }
      });
      if (!error && data?.success && data?.participant) {
        savedParticipant = data.participant;
      } else if (data?.error) {
        console.warn('Edge function notice:', data.error);
      }
    } catch (err) {
      console.warn('Invoke participant-profile error:', err);
    }

    // Direct DB insert fallback if edge function returned error or wasn't deployed
    if (!savedParticipant) {
      try {
        const uniqueCode = 'SRI27-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const payload = {
          participant_code: uniqueCode,
          name: onboardingName.trim(),
          email: userEmail,
          phone: onboardingPhone.trim(),
          college: onboardingCollege.trim(),
          department: onboardingDepartment.trim() || 'General',
          year: onboardingYear.trim() || '1st Year'
        };
        const { data: dbData, error: dbErr } = await supabase
          .from('participants')
          .insert([payload])
          .select()
          .maybeSingle();

        if (!dbErr && dbData) {
          savedParticipant = dbData;
        } else {
          console.warn('DB insert notice, preserving locally:', dbErr);
          savedParticipant = payload;
        }
      } catch (e) {
        console.warn('Participant sync fallback:', e);
        const uniqueCode = 'SRI27-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        savedParticipant = {
          participant_code: uniqueCode,
          name: onboardingName.trim(),
          email: userEmail,
          phone: onboardingPhone.trim(),
          college: onboardingCollege.trim(),
          department: onboardingDepartment.trim() || 'General',
          year: onboardingYear.trim() || '1st Year'
        };
      }
    }

    localStorage.setItem(`srishti_profile_${userEmail}`, JSON.stringify(savedParticipant));
    localStorage.setItem('srishti_session', userEmail);
    localStorage.setItem('srishti_user_name', savedParticipant.name);
    localStorage.setItem('srishti_user_college', savedParticipant.college);
    localStorage.setItem('srishti_user_phone', savedParticipant.phone);
    if (savedParticipant.department) localStorage.setItem('srishti_user_roll', savedParticipant.department);

    setParticipantData(savedParticipant);
    setEditName(savedParticipant.name || '');
    setEditCollege(savedParticipant.college || '');
    setEditPhone(savedParticipant.phone || '');
    setEditDepartment(savedParticipant.department || '');
    setEditYear(savedParticipant.year || '');

    setStep('dashboard');
    setLoading(false);

    const searchParams = new URLSearchParams(window.location.search);
    const redirectUrl = searchParams.get('redirect');
    if (redirectUrl && redirectUrl.startsWith('/')) {
      navigate(redirectUrl);
    }
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

  const handleSendWhatsAppToUser = async () => {
    const hasRegistered = registrations.length > 0;
    if (!hasRegistered) {
      alert('Your delegate pass is locked. Please register for at least one event first.');
      return;
    }
    const data = getPassData();
    if (!data.isVerified) {
      alert('Your registration is pending payment verification by the FEST coordinator. Your official entry pass will be issued once payment is approved.');
      return;
    }

    let targetPhone = (participantData?.phone || localStorage.getItem('srishti_user_phone') || '').trim();
    if (!targetPhone) {
      const entered = window.prompt('Please enter your 10-digit WhatsApp number to receive your pass:');
      if (!entered || !entered.trim()) return;
      targetPhone = entered.replace(/\D/g, '').trim();
      if (targetPhone.length < 10) {
        alert('Please enter a valid 10-digit mobile number.');
        return;
      }
      localStorage.setItem('srishti_user_phone', targetPhone);
      if (participantData) {
        participantData.phone = targetPhone;
      }
    }

    setSendingWhatsApp(true);
    setWhatsAppPassMsg(null);

    try {
      // 1. Generate full-resolution pass PNG image
      const cardPng = await generateCardImagePng({
        attendeeName: data.attendeeName,
        college: data.college,
        passCode: data.passCode,
        passToken: data.passToken,
        events: data.events,
        isVerified: data.isVerified,
        statusText: data.statusText
      });

      // 2. Default Profile Re-send template
      const defaultResendTemplate = 
`🎟️ *SRISHTI 2.7 | OFFICIAL DELEGATE PASS*

Hello *{name}*, here is your requested entry pass:

🆔 *Delegate ID:* {participantCode}  
🏆 *Event:* {eventName}  
🏛️ *College:* {college}

📱 *Your Digital Pass & QR Code:*  
{passUrl}

Please present your QR code and college ID at the entrance.

See you at *SRISHTI 2.7*! 🚀`;

      const customTemplate = localStorage.getItem('srishti_wa_profile_template') || defaultResendTemplate;
      const eventNames = data.events.length > 0 ? data.events.join(', ') : 'All Registered Competitions';

      const res = await fetch('https://trialrun2.onrender.com/send-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: targetPhone,
          name: data.attendeeName,
          participantCode: data.passCode,
          eventName: eventNames,
          college: data.college || '',
          passUrl: 'https://srishti2-7.vercel.app/profile',
          imageBase64: cardPng,
          customMessage: customTemplate
        })
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to dispatch pass via WhatsApp bot.');
      }

      setHasSentWhatsApp(true);
      try {
        localStorage.setItem('srishti_wa_pass_sent', 'true');
      } catch (_) {}

      setWhatsAppPassMsg({
        type: 'success',
        text: `Pass & QR code sent to your WhatsApp (+${targetPhone})!`
      });
      setTimeout(() => setWhatsAppPassMsg(null), 8000);
    } catch (err) {
      console.error('WhatsApp dispatch error:', err);
      setWhatsAppPassMsg({
        type: 'error',
        text: err.message || 'WhatsApp bot temporarily busy. Try again or share via web.'
      });
      setTimeout(() => setWhatsAppPassMsg(null), 9000);
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleWhatsAppSharePass = () => {
    const hasRegistered = registrations.length > 0;
    if (!hasRegistered) {
      alert('Your delegate pass is locked. Please register for at least one event first.');
      return;
    }
    const data = getPassData();
    const liveProductionUrl = 'https://srishti2-7.vercel.app';
    const profileLink = `${liveProductionUrl}/profile`;
    const eventNames = data.events.length > 0 ? data.events.join(', ') : 'All Registered Competitions';

    const text = 
`🎟️ *SRISHTI 2.7 | OFFICIAL DELEGATE PASS*

Hello *${data.attendeeName}*, here is your requested entry pass:

🆔 *Delegate ID:* ${data.passCode}  
🏆 *Event:* ${eventNames}  
${data.college ? `🏛️ *College:* ${data.college}\n` : ''}
📱 *Your Digital Pass & QR Code:*  
${profileLink}

Please present your QR code and college ID at the entrance.

See you at *SRISHTI 2.7*! 🚀`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const isNextDisabled = () => {
    if (onboardingStep === 1 && !onboardingName.trim()) return true;
    if (onboardingStep === 2 && (!onboardingCollege.trim() || !onboardingPhone.trim())) return true;
    return false;
  };

  if (initialLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        padding: '2rem 1.5rem',
        boxSizing: 'border-box'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          maxWidth: '480px',
          width: '100%',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Top subtle edition header */}
          <div style={{
            fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
            fontSize: '0.85rem',
            letterSpacing: '0.45em',
            textTransform: 'uppercase',
            color: '#8e8e93',
            fontWeight: 500,
            marginBottom: '3rem'
          }}>
            SRISHTI 2.7
          </div>

          {/* Central Metallic Chrome Srishti Logo */}
          <div style={{
            width: '68px',
            height: '68px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '2.5rem',
            position: 'relative'
          }}>
            <img
              src="/assets/logo.png"
              alt="Srishti Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: 'grayscale(100%) brightness(1.22) contrast(1.15) drop-shadow(0 4px 16px rgba(255, 255, 255, 0.12))',
                animation: 'srishtiLogoSheen 2.8s ease-in-out infinite alternate'
              }}
            />
          </div>

          {/* Primary Heading: Almost there */}
          <h1 style={{
            fontFamily: '"Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: 'clamp(2.15rem, 5vw, 2.75rem)',
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '-0.025em',
            lineHeight: 1.15,
            margin: '0 0 0.85rem 0'
          }}>
            Almost there
          </h1>

          {/* Subtitle: Finalizing your entry... */}
          <p style={{
            fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
            fontSize: 'clamp(0.92rem, 2.5vw, 1.05rem)',
            fontWeight: 400,
            color: '#8e8e93',
            letterSpacing: '0.015em',
            margin: '0 0 2.75rem 0',
            lineHeight: 1.4
          }}>
            Finalizing your entry...
          </p>

          {/* Sleek Horizontal Progress Bar with rounded tip */}
          <div style={{
            width: '100%',
            maxWidth: '350px',
            height: '3.5px',
            backgroundColor: 'rgba(255, 255, 255, 0.16)',
            borderRadius: '9999px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              backgroundColor: '#ffffff',
              borderRadius: '9999px',
              boxShadow: '0 0 8px rgba(255, 255, 255, 0.5), 0 0 2px #ffffff',
              animation: 'srishtiBarProgress 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite'
            }} />
          </div>
        </div>

        <style>{`
          @keyframes srishtiBarProgress {
            0% {
              width: 15%;
            }
            40% {
              width: 58%;
            }
            70% {
              width: 68%;
            }
            90% {
              width: 82%;
            }
            100% {
              width: 92%;
            }
          }
          @keyframes srishtiLogoSheen {
            0% {
              opacity: 0.9;
              transform: translateY(0px) scale(1);
            }
            100% {
              opacity: 1;
              transform: translateY(-2px) scale(1.02);
            }
          }
        `}</style>
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
            speed={2.0}
            rayColor1="#ffffff"
            rayColor2="#52525b"
            intensity={1.5}
            spread={2.2}
            origin="top-right"
            tilt={-5}
            saturation={0}
            blend={0.6}
            falloff={1.6}
            opacity={0.5}
          />
        </SafeVisual>
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1180px', margin: '0 auto', paddingTop: '3rem', paddingBottom: '5rem' }}>

        <button
          onClick={() => navigate('/')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'none', border: 'none', color: '#71717a',
            cursor: 'pointer', marginBottom: '2rem', fontSize: '0.9rem',
            padding: '0', transition: 'color 0.2s ease'
          }}
          onMouseOver={e => e.currentTarget.style.color = '#fff'}
          onMouseOut={e => e.currentTarget.style.color = '#71717a'}
        >
          <FiArrowLeft size={16} /> Return Home
        </button>

        {step === 'dashboard' ? (
          <div>
            {/* Header: SRISHTI 2.7 / My Space / Subtitle & Sign Out */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '3.5rem' }}>
              <div>
                <div style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '0.85rem',
                  color: '#8c8c92',
                  letterSpacing: '0.35em',
                  textTransform: 'uppercase',
                  marginBottom: '0.45rem',
                  fontWeight: '500'
                }}>
                  SRISHTI 2.7
                </div>
                <h1 style={{
                  fontSize: '3.2rem',
                  fontWeight: '800',
                  margin: '0 0 0.45rem 0',
                  letterSpacing: '-0.02em',
                  color: '#ffffff',
                  lineHeight: 1.1
                }}>
                  My Space
                </h1>
                <p style={{
                  color: '#8c8c92',
                  fontSize: '1.05rem',
                  margin: 0,
                  fontWeight: '400'
                }}>
                  Your profile, passes and registrations.
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
                      padding: '0.65rem 1.25rem',
                      backgroundColor: 'rgba(56, 189, 248, 0.1)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.88rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.2)'}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.1)'}
                  >
                    <FiShield size={15} /> Admin Command Center
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.65rem 1.35rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    color: '#e4e4e7',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.35)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)';
                    e.currentTarget.style.color = '#e4e4e7';
                  }}
                >
                  <FiLogOut size={16} /> Sign Out
                </button>
              </div>
            </div>

            {(error || message) && (
              <div style={{
                marginBottom: '2rem',
                padding: '0.9rem 1.25rem',
                borderRadius: '12px',
                color: error ? '#ff8b8b' : '#86efac',
                background: error ? 'rgba(255,59,48,0.1)' : 'rgba(16,185,129,0.1)',
                border: `1px solid ${error ? 'rgba(255,59,48,0.25)' : 'rgba(16,185,129,0.25)'}`,
                fontSize: '0.92rem'
              }}>
                {error || message}
              </div>
            )}

            {loading ? (
              <div style={{ padding: '5rem 0', textAlign: 'center', color: '#8c8c92', fontSize: '1.05rem' }}>
                Loading your data...
              </div>
            ) : (
              <div>
                {/* 2-Column Section: Left Profile, Right Digital Entry Pass */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '3.5rem',
                  alignItems: 'flex-start'
                }}>

                  {/* Left Column: Profile */}
                  <div style={{ flex: '1 1 380px', minWidth: '280px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#ffffff', fontSize: '1.15rem', fontWeight: '600' }}>
                        <FiUser size={18} />
                        <span>Profile</span>
                      </div>
                      {!isEditing && (
                        <button
                          onClick={() => setIsEditing(true)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#38bdf8',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            padding: 0,
                            transition: 'opacity 0.2s ease'
                          }}
                          onMouseOver={e => e.currentTarget.style.opacity = '0.75'}
                          onMouseOut={e => e.currentTarget.style.opacity = '1'}
                        >
                          <FiEdit2 size={14} />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                          <label style={{ color: '#71717a', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#fff',
                              borderRadius: '8px',
                              marginTop: '0.35rem',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ color: '#71717a', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email (Account Bound)</label>
                          <input
                            type="email"
                            value={participantData?.email || session?.user?.email || ''}
                            disabled
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              background: 'rgba(255, 255, 255, 0.02)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              color: '#71717a',
                              borderRadius: '8px',
                              marginTop: '0.35rem',
                              boxSizing: 'border-box',
                              cursor: 'not-allowed'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ color: '#71717a', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>College</label>
                          <input
                            type="text"
                            value={editCollege}
                            onChange={e => setEditCollege(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#fff',
                              borderRadius: '8px',
                              marginTop: '0.35rem',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div>
                            <label style={{ color: '#71717a', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</label>
                            <input
                              type="text"
                              value={editDepartment}
                              onChange={e => setEditDepartment(e.target.value)}
                              placeholder="e.g. Computer Science"
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                color: '#fff',
                                borderRadius: '8px',
                                marginTop: '0.35rem',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ color: '#71717a', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Year</label>
                            <input
                              type="text"
                              value={editYear}
                              onChange={e => setEditYear(e.target.value)}
                              placeholder="e.g. 2026"
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                color: '#fff',
                                borderRadius: '8px',
                                marginTop: '0.35rem',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <label style={{ color: '#71717a', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</label>
                          <input
                            type="text"
                            value={editPhone}
                            onChange={e => setEditPhone(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#fff',
                              borderRadius: '8px',
                              marginTop: '0.35rem',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                          <button
                            onClick={handleSaveProfile}
                            disabled={isSaving}
                            style={{
                              flex: 1,
                              padding: '0.75rem',
                              background: '#fff',
                              color: '#000',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: 'bold',
                              cursor: 'pointer'
                            }}
                          >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            onClick={() => setIsEditing(false)}
                            style={{
                              flex: 1,
                              padding: '0.75rem',
                              background: 'transparent',
                              color: '#fff',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              borderRadius: '8px',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {[
                          { label: 'Name', value: participantData?.name || 'Participant', bold: true },
                          { label: 'Email', value: participantData?.email || session?.user?.email || '-' },
                          { label: 'College', value: participantData?.college || '-' },
                          { label: 'Department', value: participantData?.department || '-' },
                          { label: 'Year', value: participantData?.year || '-' },
                          { label: 'Phone', value: participantData?.phone || '-' }
                        ].map((field) => (
                          <div
                            key={field.label}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '125px 1fr',
                              alignItems: 'center',
                              padding: '1.05rem 0',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.07)'
                            }}
                          >
                            <span style={{ color: '#71717a', fontSize: '0.95rem' }}>{field.label}</span>
                            <span style={{
                              color: '#ffffff',
                              fontSize: '0.95rem',
                              fontWeight: field.bold ? '700' : '400',
                              wordBreak: 'break-word'
                            }}>
                              {field.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Digital Entry Pass */}
                  <div style={{ flex: '1.4 1 540px', minWidth: '320px', maxWidth: '100%', overflow: 'visible' }}>
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
                        <div>
                          {/* Header: Digital Entry Pass & Verified status dot */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#ffffff', fontSize: '1.15rem', fontWeight: '600' }}>
                              <FiCreditCard size={18} />
                              <span>Digital Entry Pass</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.88rem', fontWeight: '600', color: isVerified ? '#10b981' : '#f59e0b' }}>
                              <span style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                backgroundColor: isVerified ? '#10b981' : '#f59e0b',
                                boxShadow: isVerified ? '0 0 8px #10b981' : '0 0 8px #f59e0b'
                              }}></span>
                              <span>{isVerified ? 'Verified' : 'Pending Approval'}</span>
                            </div>
                          </div>

                          {/* Ticket Visual */}
                          <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'visible' }}>
                            <div
                              id="participant-ticket-card"
                              style={{
                                width: '100%',
                                maxWidth: '640px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                position: 'relative',
                                overflow: 'visible',
                                filter: !hasRegistered ? 'blur(4px) grayscale(0.85) opacity(0.35)' : 'none',
                                pointerEvents: !hasRegistered ? 'none' : 'auto',
                                userSelect: !hasRegistered ? 'none' : 'auto',
                                transition: 'all 0.3s ease'
                              }}
                            >
                              <TearTicket
                                orientation="horizontal"
                                scrim={false}
                                torn={isTicketTorn}
                                onTear={() => setIsTicketTorn(true)}
                                width={630}
                                height={305}
                                stubSize={175}
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
                                border={false}
                                borderColor="transparent"
                                borderWidth={0}
                                recenter={true}
                                stub={
                                  <div style={{
                                    position: 'relative',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    padding: '1rem 0.75rem',
                                    backgroundImage: "url('/assets/ticket-stub-light.jpg')",
                                    backgroundPosition: 'center',
                                    backgroundSize: 'cover',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundColor: '#ffffff',
                                    overflow: 'hidden',
                                    boxSizing: 'border-box'
                                  }}>
                                    <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                                      <h4 style={{ fontFamily: 'var(--font-akira)', color: '#050714', fontSize: '1.05rem', margin: '0 0 0.85rem 0', letterSpacing: '0.05em' }}>
                                        SCAN ME
                                      </h4>

                                      <div style={{ position: 'relative', padding: '8px' }}>
                                        <div style={{ position: 'absolute', top: 0, left: 0, width: '14px', height: '14px', borderTop: '4px solid #06b6d4', borderLeft: '4px solid #06b6d4', borderRadius: '4px 0 0 0' }}></div>
                                        <div style={{ position: 'absolute', top: 0, right: 0, width: '14px', height: '14px', borderTop: '4px solid #06b6d4', borderRight: '4px solid #06b6d4', borderRadius: '0 4px 0 0' }}></div>
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '14px', height: '14px', borderBottom: '4px solid #06b6d4', borderLeft: '4px solid #06b6d4', borderRadius: '0 0 0 4px' }}></div>
                                        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '14px', height: '14px', borderBottom: '4px solid #06b6d4', borderRight: '4px solid #06b6d4', borderRadius: '0 0 4px 0' }}></div>

                                        <QRCodeSVG
                                          value={signedPassQr || passCode}
                                          size={110}
                                          bgColor="#ffffff"
                                          fgColor="#000000"
                                          level="H"
                                          imageSettings={{
                                            src: "/assets/logo.png",
                                            height: 24,
                                            width: 24,
                                            excavate: true,
                                          }}
                                        />
                                      </div>

                                      <span style={{
                                        fontSize: '0.85rem',
                                        color: '#0f172a',
                                        marginTop: '0.75rem',
                                        fontFamily: 'var(--font-mono)',
                                        fontWeight: 'bold',
                                        letterSpacing: '0.05em',
                                        background: 'rgba(255,255,255,0.7)',
                                        padding: '2px 8px',
                                        borderRadius: '6px'
                                      }}>
                                        {passCode}
                                      </span>
                                    </div>
                                  </div>
                                }
                              >
                                <div style={{
                                  position: 'relative',
                                  width: '100%',
                                  height: '100%',
                                  padding: '1.75rem 2rem',
                                  overflow: 'hidden',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  boxSizing: 'border-box',
                                  backgroundImage: "url('/assets/ticket-bg-dark.png')",
                                  backgroundPosition: 'right center',
                                  backgroundSize: 'cover',
                                  backgroundRepeat: 'no-repeat',
                                  backgroundColor: '#070a13'
                                }}>
                                  <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    zIndex: 0,
                                    background: 'linear-gradient(90deg, rgba(3, 5, 12, 0.94) 0%, rgba(3, 5, 12, 0.72) 55%, rgba(3, 5, 12, 0.25) 100%)',
                                    pointerEvents: 'none'
                                  }} />

                                  <div style={{ position: 'relative', zIndex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.65rem' }}>
                                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#e2e8f0', letterSpacing: '0.2em', lineHeight: 1.4 }}>
                                        SRISHTI 2.7<br/><span style={{ color: '#38bdf8' }}>DELEGATE PASS</span>
                                      </div>
                                      <div style={{ height: '2px', width: '50px', background: 'linear-gradient(90deg, #38bdf8, transparent)' }}></div>
                                    </div>

                                    <h3 style={{
                                      fontFamily: 'var(--font-akira)',
                                      fontSize: attendeeName.length > 20 ? '1.4rem' : attendeeName.length > 14 ? '1.75rem' : '2.1rem',
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
                                      <div style={{ width: '4px', height: '20px', background: '#38bdf8', borderRadius: '2px', boxShadow: '0 0 10px #38bdf8' }}></div>
                                      <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0, fontWeight: 500 }}>
                                        {college}
                                      </p>
                                    </div>

                                    {/* Registered Events Badges */}
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', maxWidth: '360px' }}>
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
                                          CODING AND DEBUGGING
                                        </span>
                                      )}
                                      {eventsList.length > 3 && (
                                        <span style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', fontWeight: 'bold' }}>
                                          +{eventsList.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', paddingTop: '0.35rem' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid rgba(56,189,248,0.3)', display: 'inline-flex', flexDirection: 'column', gap: '0.2rem', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                                      <span style={{ fontSize: '0.62rem', color: '#94a3b8', letterSpacing: '0.1em' }}>STATUS</span>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                        <div style={{ width: '16px', height: '16px', background: isVerified ? '#10b981' : '#f59e0b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isVerified ? '0 0 10px #10b981' : '0 0 10px #f59e0b' }}>
                                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        </div>
                                        <span style={{ color: isVerified ? '#10b981' : '#f59e0b', fontWeight: 'bold', fontSize: '0.98rem', letterSpacing: '0.05em' }}>
                                          {statusText}
                                        </span>
                                      </div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                      <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>EVENTS ENROLLED</span>
                                      <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.2rem' }}>{eventsList.length || 1} Event(s)</span>
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
                                  width: '48px',
                                  height: '48px',
                                  borderRadius: '50%',
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  border: '1px solid rgba(239, 68, 68, 0.5)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginBottom: '0.75rem'
                                }}>
                                  <FiLock size={22} color="#ef4444" />
                                </div>

                                <div style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '0.75rem',
                                  color: '#ef4444',
                                  letterSpacing: '0.16em',
                                  fontWeight: 'bold',
                                  marginBottom: '0.35rem'
                                }}>
                                  ACCESS RESTRICTED // PASS LOCKED
                                </div>

                                <h4 style={{
                                  fontFamily: 'var(--font-akira)',
                                  fontSize: '1.1rem',
                                  color: '#ffffff',
                                  margin: '0 0 0.45rem 0'
                                }}>
                                  EVENT REGISTRATION REQUIRED
                                </h4>

                                <p style={{
                                  color: '#94a3b8',
                                  fontSize: '0.85rem',
                                  maxWidth: '400px',
                                  lineHeight: 1.4,
                                  margin: '0 0 1rem 0'
                                }}>
                                  Register for an event to unlock your official Delegate Pass, QR entry badge, and card download.
                                </p>

                                <button
                                  onClick={() => navigate('/register')}
                                  style={{
                                    padding: '0.65rem 1.4rem',
                                    background: '#ffffff',
                                    color: '#000000',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    fontSize: '0.86rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Browse Events & Register Now →
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
                                boxSizing: 'border-box'
                              }}>
                                <div style={{
                                  width: '48px',
                                  height: '48px',
                                  borderRadius: '50%',
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  border: '1px solid rgba(245, 158, 11, 0.5)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginBottom: '0.75rem'
                                }}>
                                  <FiLock size={22} color="#f59e0b" />
                                </div>

                                <div style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '0.75rem',
                                  color: '#f59e0b',
                                  letterSpacing: '0.16em',
                                  fontWeight: 'bold',
                                  marginBottom: '0.35rem'
                                }}>
                                  PAYMENT VERIFICATION PENDING
                                </div>

                                <h4 style={{
                                  fontFamily: 'var(--font-akira)',
                                  fontSize: '1.1rem',
                                  color: '#ffffff',
                                  margin: '0 0 0.45rem 0'
                                }}>
                                  PAYMENT PENDING APPROVAL
                                </h4>

                                <p style={{
                                  color: '#94a3b8',
                                  fontSize: '0.85rem',
                                  maxWidth: '420px',
                                  lineHeight: 1.45,
                                  margin: 0
                                }}>
                                  Your registration is awaiting coordinator approval. Once verified, your entry pass unlocks automatically.
                                </p>
                              </div>
                            ) : null}
                          </div>

                          {/* Action Buttons Below Pass: Download Pass (PNG), Send to Email, Send to WhatsApp */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1.5rem',
                            marginTop: '1.5rem',
                            flexWrap: 'wrap'
                          }}>
                            <button
                              onClick={handleDownloadPassPng}
                              disabled={!hasRegistered || downloadingPass}
                              style={{
                                padding: '0.65rem 1.35rem',
                                backgroundColor: '#ffffff',
                                color: '#000000',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                fontSize: '0.88rem',
                                cursor: (!hasRegistered || downloadingPass) ? 'not-allowed' : 'pointer',
                                opacity: (!hasRegistered || downloadingPass) ? 0.6 : 1,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.55rem',
                                boxShadow: '0 2px 10px rgba(255, 255, 255, 0.15)',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <FiDownload size={16} />
                              <span>{downloadingPass ? 'Exporting PNG...' : 'Download Pass (PNG)'}</span>
                            </button>

                            <button
                              onClick={handleEmailPassToUser}
                              disabled={!hasRegistered || emailingPass}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#cbd5e1',
                                fontSize: '0.88rem',
                                fontWeight: '500',
                                cursor: (!hasRegistered || emailingPass) ? 'not-allowed' : 'pointer',
                                opacity: (!hasRegistered || emailingPass) ? 0.5 : 1,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.55rem',
                                padding: '0.5rem 0',
                                transition: 'color 0.2s ease'
                              }}
                              onMouseOver={e => e.currentTarget.style.color = '#ffffff'}
                              onMouseOut={e => e.currentTarget.style.color = '#cbd5e1'}
                            >
                              <FiMail size={16} color="#38bdf8" />
                              <span>{emailingPass ? 'Sending...' : 'Send to Email'}</span>
                            </button>

                            <button
                              onClick={handleSendWhatsAppToUser}
                              disabled={!hasRegistered || sendingWhatsApp}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#cbd5e1',
                                fontSize: '0.88rem',
                                fontWeight: '500',
                                cursor: (!hasRegistered || sendingWhatsApp) ? 'not-allowed' : 'pointer',
                                opacity: (!hasRegistered || sendingWhatsApp) ? 0.5 : 1,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.55rem',
                                padding: '0.5rem 0',
                                transition: 'color 0.2s ease'
                              }}
                              onMouseOver={e => e.currentTarget.style.color = '#ffffff'}
                              onMouseOut={e => e.currentTarget.style.color = '#cbd5e1'}
                            >
                              <FaWhatsapp size={17} color="#25D366" />
                              <span>{sendingWhatsApp ? 'Sending...' : (hasSentWhatsApp ? 'Send Again to WhatsApp' : 'Send to WhatsApp')}</span>
                            </button>

                            {isTicketTorn && (
                              <button
                                onClick={() => setIsTicketTorn(false)}
                                style={{
                                  background: 'none',
                                  border: '1px solid rgba(56, 189, 248, 0.4)',
                                  color: '#38bdf8',
                                  fontSize: '0.85rem',
                                  fontWeight: '500',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.45rem',
                                  padding: '0.45rem 0.9rem',
                                  borderRadius: '8px'
                                }}
                              >
                                <FiRotateCcw size={14} /> Re-attach Stub
                              </button>
                            )}
                          </div>

                          {/* Message indicators */}
                          {emailPassMsg && (
                            <div style={{
                              marginTop: '0.75rem',
                              fontSize: '0.85rem',
                              color: emailPassMsg.type === 'success' ? '#10b981' : '#ef4444',
                              fontWeight: '500'
                            }}>
                              {emailPassMsg.text}
                            </div>
                          )}

                          {whatsAppPassMsg && (
                            <div style={{
                              marginTop: '0.75rem',
                              fontSize: '0.85rem',
                              color: whatsAppPassMsg.type === 'success' ? '#4ade80' : '#ef4444',
                              fontWeight: '500',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.45rem'
                            }}>
                              {whatsAppPassMsg.type === 'success' ? <FiCheckCircle size={14} /> : <FiAlertCircle size={14} />}
                              <span>{whatsAppPassMsg.text}</span>
                              {whatsAppPassMsg.type === 'error' && (
                                <button
                                  type="button"
                                  onClick={handleWhatsAppSharePass}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#38bdf8',
                                    textDecoration: 'underline',
                                    cursor: 'pointer',
                                    fontSize: '0.82rem',
                                    padding: 0,
                                    marginLeft: '0.3rem'
                                  }}
                                >
                                  Share via Web WhatsApp instead
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Bottom Section: Registered Competitions */}
                <div style={{ marginTop: '4.5rem' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.25rem',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#ffffff', fontSize: '1.15rem', fontWeight: '600' }}>
                      <FiCalendar size={18} />
                      <span>Registered Competitions</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '0.8rem',
                        color: '#71717a',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase'
                      }}>
                        {registrations.length} REGISTERED
                      </span>

                      <button
                        onClick={async () => {
                          const em = session?.user?.email || localStorage.getItem('srishti_session');
                          if (em) {
                            setLoading(true);
                            setError(null);
                            try {
                              await fetchUserData(em);
                              setMessage('Refreshed registrations.');
                            } catch (err) {
                              setError(err.message || 'Could not refresh registrations.');
                            }
                            setLoading(false);
                          }
                        }}
                        title="Refresh registrations"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#38bdf8',
                          fontSize: '0.88rem',
                          fontWeight: '500',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          padding: 0
                        }}
                      >
                        <FiRefreshCw size={14} />
                        <span>Refresh</span>
                      </button>
                    </div>
                  </div>

                  {registrations.length === 0 ? (
                    <div style={{
                      padding: '3.5rem 2rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      textAlign: 'center'
                    }}>
                      <FiCalendar size={42} color="#52525b" style={{ marginBottom: '1rem' }} />
                      <h3 style={{ fontSize: '1.35rem', marginBottom: '0.4rem', fontWeight: '700', color: '#fff' }}>No Registered Competitions Yet</h3>
                      <p style={{ color: '#71717a', fontSize: '0.95rem', marginBottom: '1.75rem', maxWidth: '440px', margin: '0 auto 1.75rem' }}>
                        You haven't enrolled in any competitions yet. Explore our events and register to unlock your pass.
                      </p>
                      <button
                        onClick={() => navigate('/register')}
                        style={{
                          padding: '0.75rem 1.6rem',
                          backgroundColor: '#ffffff',
                          color: '#000000',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          boxShadow: '0 4px 14px rgba(255, 255, 255, 0.15)'
                        }}
                      >
                        Browse Events & Register
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {registrations.map(reg => {
                        const isVerified = reg.payment_status === 'verified' || reg.status === 'verified';
                        const eventName = reg.events?.name || reg.event_name || reg.event_id || 'Coding and Debugging';
                        const venueName = reg.events?.venue || 'Computer Lab';

                        // Format date (e.g. 12 Dec 2026)
                        let eventDate = reg.events?.date || '12 Dec 2026';
                        if (/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
                          try {
                            const d = new Date(eventDate + 'T00:00:00');
                            eventDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                          } catch (_) {}
                        }

                        // Format time (e.g. 10:00 AM)
                        let eventTime = '10:00 AM';
                        if (reg.events?.start_time) {
                          const t = reg.events.start_time.substring(0, 5);
                          const [hh, mm] = t.split(':');
                          const hNum = parseInt(hh, 10);
                          if (!isNaN(hNum)) {
                            const ampm = hNum >= 12 ? 'PM' : 'AM';
                            const h12 = hNum % 12 || 12;
                            eventTime = `${h12}:${mm} ${ampm}`;
                          } else {
                            eventTime = t;
                          }
                        }

                        const avatarImg = reg.events?.image || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=900&auto=format&fit=crop';

                        return (
                          <div
                            key={reg.id || eventName}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '1.25rem 1.6rem',
                              backgroundColor: 'rgba(255, 255, 255, 0.02)',
                              border: '1px solid rgba(255, 255, 255, 0.06)',
                              borderRadius: '14px',
                              transition: 'all 0.2s ease',
                              gap: '1rem'
                            }}
                            onMouseOver={e => {
                              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.035)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                            }}
                          >
                            {/* Left Info with Round Image */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', minWidth: 0 }}>
                              <img
                                src={avatarImg}
                                alt={eventName}
                                style={{
                                  width: '54px',
                                  height: '54px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  border: '1px solid rgba(255, 255, 255, 0.12)',
                                  flexShrink: 0
                                }}
                                onError={e => {
                                  e.currentTarget.src = 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=900&auto=format&fit=crop';
                                }}
                              />
                              <div style={{ minWidth: 0 }}>
                                <h4 style={{
                                  color: '#ffffff',
                                  fontSize: '1.15rem',
                                  fontWeight: '700',
                                  margin: '0 0 0.35rem 0',
                                  letterSpacing: '-0.01em',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {eventName}
                                </h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', color: '#71717a', fontSize: '0.85rem' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <FiCalendar size={13} /> {eventDate}
                                  </span>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <FiClock size={13} /> {eventTime}
                                  </span>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <FiMapPin size={13} /> {venueName}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right Status Pill & Chevron */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexShrink: 0 }}>
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                padding: '0.45rem 1.15rem',
                                borderRadius: '9999px',
                                background: isVerified ? 'rgba(6, 182, 212, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                border: isVerified ? '1px solid rgba(6, 182, 212, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)',
                                color: isVerified ? '#38bdf8' : '#f59e0b',
                                fontSize: '0.85rem',
                                fontWeight: '600'
                              }}>
                                <span style={{
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  background: isVerified ? '#06b6d4' : '#f59e0b',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#000',
                                  flexShrink: 0
                                }}>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                </span>
                                <span>{isVerified ? 'Registered' : 'Pending'}</span>
                              </div>

                              <FiChevronRight size={18} color="#71717a" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : step === 'onboarding' ? (
          <div style={{
            maxWidth: '620px',
            margin: '2rem auto 0',
            padding: '2.5rem',
            backgroundColor: 'rgba(12, 14, 20, 0.94)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            borderRadius: '28px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(56, 189, 248, 0.08)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Top Monochrome Accent Beam */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '15%',
              right: '15%',
              height: '2px',
              background: 'linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.85), transparent)',
              boxShadow: '0 0 14px rgba(56, 189, 248, 0.5)'
            }} />

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

            <Stepper
              initialStep={onboardingStep}
              onStepChange={(s) => { setError(null); setOnboardingStep(s); }}
              onFinalStepCompleted={handleOnboardingComplete}
              backButtonText="← Back"
              nextButtonText={onboardingStep === 3 ? (loading ? 'Creating Profile...' : 'Complete Profile & Unlock →') : 'Continue →'}
              nextButtonProps={{ disabled: isNextDisabled() || loading }}
              backButtonProps={{ disabled: loading }}
            >
              <Step>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.75rem' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: '#38bdf8',
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono, monospace)',
                    letterSpacing: '0.14em',
                    fontWeight: '700',
                    textTransform: 'uppercase'
                  }}>
                    STEP 1 OF 3 • DELEGATE IDENTITY
                  </span>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', color: '#fff' }}>
                    Create Your Profile
                  </h2>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
                    Mandatory participant profile creation is required before you can register for SRISHTI 2.7 events.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.78rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={onboardingName}
                      onChange={(e) => setOnboardingName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      required
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '1.1rem 1.25rem',
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '14px',
                        color: '#fff',
                        fontSize: '1rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={e => e.target.style.borderColor = '#38bdf8'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.78rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                      Account Email (Verified)
                    </label>
                    <input
                      type="email"
                      value={session?.user?.email || email || ''}
                      disabled
                      style={{
                        width: '100%',
                        padding: '1.1rem 1.25rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '14px',
                        color: '#64748b',
                        fontSize: '0.95rem',
                        cursor: 'not-allowed',
                        boxSizing: 'border-box'
                      }}
                    />
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem', display: 'block' }}>
                      Your festival pass and event registrations will be tied to this verified email address.
                    </span>
                  </div>
                </div>
              </Step>

              <Step>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.75rem' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: '#38bdf8',
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono, monospace)',
                    letterSpacing: '0.14em',
                    fontWeight: '700',
                    textTransform: 'uppercase'
                  }}>
                    STEP 2 OF 3 • INSTITUTION & CONTACT
                  </span>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', color: '#fff' }}>
                    College & Phone Number
                  </h2>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
                    Required for delegate badges, entry pass dispatch, and event coordinator verification.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.78rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                      College / Institute Name *
                    </label>
                    <input
                      type="text"
                      value={onboardingCollege}
                      onChange={(e) => setOnboardingCollege(e.target.value)}
                      placeholder="e.g. St. Thomas College (Autonomous), Thrissur"
                      required
                      style={{
                        width: '100%',
                        padding: '1.1rem 1.25rem',
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '14px',
                        color: '#fff',
                        fontSize: '1rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={e => e.target.style.borderColor = '#38bdf8'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.78rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                        Department / Branch
                      </label>
                      <input
                        type="text"
                        value={onboardingDepartment}
                        onChange={(e) => setOnboardingDepartment(e.target.value)}
                        placeholder="e.g. Computer Science"
                        style={{
                          width: '100%',
                          padding: '1.1rem 1.25rem',
                          backgroundColor: 'rgba(0, 0, 0, 0.6)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '14px',
                          color: '#fff',
                          fontSize: '0.95rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                        onFocus={e => e.target.style.borderColor = '#38bdf8'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.78rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                        Year of Study
                      </label>
                      <select
                        value={onboardingYear}
                        onChange={(e) => setOnboardingYear(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '1.1rem 1.25rem',
                          backgroundColor: '#0a0a0a',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '14px',
                          color: '#fff',
                          fontSize: '0.95rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">Select Year</option>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                        <option value="Post-Graduate / Other">PG / Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.78rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                      Phone / WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      value={onboardingPhone}
                      onChange={(e) => setOnboardingPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      required
                      style={{
                        width: '100%',
                        padding: '1.1rem 1.25rem',
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '14px',
                        color: '#fff',
                        fontSize: '1rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={e => e.target.style.borderColor = '#38bdf8'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                    />
                  </div>
                </div>
              </Step>

              <Step>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.75rem' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: '#34d399',
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono, monospace)',
                    letterSpacing: '0.14em',
                    fontWeight: '700',
                    textTransform: 'uppercase'
                  }}>
                    STEP 3 OF 3 • CONFIRMATION
                  </span>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', color: '#fff' }}>
                    Review Your Details
                  </h2>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
                    Confirm your details to generate your official SRISHTI 2.7 Delegate Profile.
                  </p>
                </div>

                <div style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Full Name</span>
                    <span style={{ color: '#fff', fontWeight: '600', fontSize: '0.95rem' }}>{onboardingName || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>College</span>
                    <span style={{ color: '#fff', fontWeight: '600', fontSize: '0.95rem', textAlign: 'right', maxWidth: '60%' }}>{onboardingCollege || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Department / Year</span>
                    <span style={{ color: '#fff', fontWeight: '600', fontSize: '0.95rem' }}>{onboardingDepartment || 'General'} · {onboardingYear || '1st Year'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Phone</span>
                    <span style={{ color: '#fff', fontWeight: '600', fontSize: '0.95rem' }}>{onboardingPhone || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Email</span>
                    <span style={{ color: '#38bdf8', fontWeight: '600', fontSize: '0.92rem' }}>{session?.user?.email || email}</span>
                  </div>
                </div>

                <div style={{
                  marginTop: '1.25rem',
                  padding: '0.85rem 1rem',
                  backgroundColor: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem'
                }}>
                  <FiCheckCircle size={18} color="#38bdf8" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.82rem', color: '#93c5fd', lineHeight: 1.4 }}>
                    Upon completion, your profile will be created and you can immediately proceed to register for festival events.
                  </span>
                </div>
              </Step>
            </Stepper>

            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'color 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.color = '#fff'}
                onMouseOut={e => e.currentTarget.style.color = '#64748b'}
              >
                Logged in as {session?.user?.email || email} • Sign Out
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
            {/* Top Monochrome Accent Beam */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '10%',
              right: '10%',
              height: '2px',
              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.85), transparent)',
              boxShadow: '0 0 12px rgba(255, 255, 255, 0.5)'
            }} />

            {/* Header Badge - Monochrome */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '50px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: '700',
                letterSpacing: '0.12em',
                textTransform: 'uppercase'
              }}>
                <FiUser size={13} /> SRISHTI 2.7 • PROFILE
              </span>
            </div>

            <h2 style={{
              fontSize: '2.1rem',
              fontWeight: '800',
              marginBottom: '0.65rem',
              textAlign: 'center',
              letterSpacing: '-0.02em',
              color: '#ffffff'
            }}>
              {step === 'email' ? 'Profile' : 'Enter Verification Code'}
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
                ? 'Enter your email address to access your profile, registrations, and account.'
                : `We dispatched a 4-digit verification code to ${email}`}
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
                      e.currentTarget.style.backgroundColor = '#e2e8f0';
                      e.currentTarget.style.boxShadow = '0 8px 28px rgba(255, 255, 255, 0.3)';
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
                    Enter 4-Digit Passcode
                  </label>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <CodeSlots
                      length={4}
                      value={otpCode}
                      onChange={(val) => setOtpCode(val)}
                      onComplete={(code) => handleVerifyOtp(code)}
                      autoFocus
                      accentColor="#ffffff"
                      inkColor="#ffffff"
                      slotColor="rgba(0,0,0,0.6)"
                      digitColor="#ffffff"
                      dangerColor="#ef4444"
                    />
                  </div>
                  <p style={{ textAlign: 'center', fontSize: '0.78rem', color: '#64748b', marginTop: '0.75rem', marginBottom: 0 }}>
                    Please check your <strong>Inbox</strong> or <strong>Spam / Promotions</strong> folder.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                  <button
                    type="button"
                    onClick={() => handleVerifyOtp(otpCode)}
                    disabled={loading || otpCode.trim().length < 4}
                    style={{
                      width: '100%',
                      padding: '1.15rem',
                      backgroundColor: '#ffffff',
                      color: '#000000',
                      border: 'none',
                      borderRadius: '16px',
                      fontSize: '0.98rem',
                      fontWeight: '700',
                      letterSpacing: '0.03em',
                      cursor: (loading || otpCode.trim().length < 4) ? 'not-allowed' : 'pointer',
                      opacity: (loading || otpCode.trim().length < 4) ? 0.5 : 1,
                      transition: 'all 0.2s',
                      boxShadow: '0 8px 24px rgba(255, 255, 255, 0.2)'
                    }}
                    onMouseOver={e => {
                      if (!loading && otpCode.trim().length >= 4) {
                        e.currentTarget.style.backgroundColor = '#e2e8f0';
                      }
                    }}
                    onMouseOut={e => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
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
