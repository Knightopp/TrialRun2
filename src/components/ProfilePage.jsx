import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiMail, FiLogOut, FiCalendar, FiArrowLeft, FiUser, FiPhone, FiBook, FiInfo } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import CodeSlots from './CodeSlots';
import Stepper, { Step } from './Stepper';
import TearTicket from './TearTicket';

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

  // Onboarding
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingPhone, setOnboardingPhone] = useState('');
  const [onboardingCollege, setOnboardingCollege] = useState('');

  useEffect(() => {
    const savedEmail = localStorage.getItem('srishti_session');
    if (savedEmail) {
      setSession({ user: { email: savedEmail } });
      fetchUserData(savedEmail).then(found => {
        if (!found) {
          setStep('onboarding');
        } else {
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
      const { data: participant, error: pError } = await supabase
        .from('participants')
        .select('*')
        .eq('email', userEmail)
        .limit(1)
        .maybeSingle();

      if (pError) throw pError;
      setParticipantData(participant);

      if (participant) {
        const { data: regs, error: rError } = await supabase
          .from('registrations')
          .select('*, events_metadata (*)')
          .eq('participant_id', participant.id);

        if (rError) throw rError;
        setRegistrations(regs || []);
        return true;
      }
      return false;
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

    try {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      localStorage.setItem('pending_otp', code);
      localStorage.setItem('pending_email', email);

      const htmlContent = `
        <div style="font-family: sans-serif; background: #000; color: white; padding: 40px; border-radius: 12px; text-align: center; max-width: 500px; margin: 0 auto; border: 1px solid #333;">
          <h2 style="color: #fff; letter-spacing: 2px;">SRISHTI 2.7</h2>
          <p style="color: #888;">Your secure login code is:</p>
          <h1 style="font-size: 56px; letter-spacing: 8px; color: #fff; margin: 30px 0;">${code}</h1>
          <p style="color: #888; font-size: 14px;">This code is valid for your current session.</p>
        </div>
      `;

      const response = await fetch('/api/send_email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: 'Srishti 2.7 - Login Code',
          html: htmlContent
        })
      });

      if (!response.ok) throw new Error('Failed to send email.');

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
      const savedCode = localStorage.getItem('pending_otp');
      const savedEmail = localStorage.getItem('pending_email');

      if (code !== savedCode) {
        throw new Error('Invalid code. Please try again.');
      }

      setLoading(true);
      localStorage.removeItem('pending_otp');
      localStorage.setItem('srishti_session', savedEmail);
      
      setSession({ user: { email: savedEmail } });
      const found = await fetchUserData(savedEmail);
      
      if (!found) {
        setStep('onboarding');
      } else {
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
    try {
      const uniqueCode = 'SR27-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data, error } = await supabase.from('participants').insert([{
         participant_code: uniqueCode,
         name: onboardingName,
         email: session.user.email,
         phone: onboardingPhone,
         college: onboardingCollege,
         department: 'N/A',
         year: 'N/A'
      }]).select().single();
      
      if (error) throw error;
      setParticipantData(data);
      setStep('dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('srishti_session');
    setSession(null);
    setStep('email');
    setParticipantData(null);
    setRegistrations([]);
    setOnboardingStep(1);
    setEmail('');
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
                <p style={{ color: '#888', fontSize: '1.1rem', margin: 0 }}>
                  Logged in as <span style={{ color: '#fff', fontWeight: '600' }}>{session?.user?.email}</span>
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {session?.user?.email === 'tsrknight@gmail.com' && (
                  <button 
                    onClick={() => navigate('/admin')}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.75rem 1.5rem', backgroundColor: '#fff',
                      color: '#000', border: 'none',
                      borderRadius: '12px', cursor: 'pointer', fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={e => { e.currentTarget.style.backgroundColor = '#e5e5e5'; }}
                    onMouseOut={e => { e.currentTarget.style.backgroundColor = '#fff'; }}
                  >
                    Admin Panel
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

            {loading ? (
              <div style={{ marginTop: '4rem', textAlign: 'center' }}>Loading your data...</div>
            ) : (
              <div style={{ marginTop: '4rem', display: 'flex', flexDirection: 'column', gap: '3rem', alignItems: 'center' }}>
                {registrations.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
                    <div style={{ opacity: 0.5, pointerEvents: 'none', filter: 'grayscale(100%)' }}>
                      <TearTicket 
                        eventName="Srishti 2.7 Entry Pass"
                        participantName={participantData.name}
                        college={participantData.college}
                        teamSize="-"
                        eventDate="TBD"
                        eventTime="-"
                        eventLocation="Register to unlock"
                        ticketId="LOCKED"
                        barcodeValue="LOCKED"
                      />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ color: '#888', fontSize: '1.1rem', marginBottom: '1.5rem' }}>You haven't registered for any events yet. Register to unlock your entry pass!</p>
                      <button 
                        onClick={() => navigate('/')}
                        style={{ padding: '1rem 2rem', backgroundColor: '#fff', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
                      >
                        Explore Events
                      </button>
                    </div>
                  </div>
                ) : (
                  registrations.map(reg => (
                    <TearTicket 
                      key={reg.id}
                      eventName={reg.events_metadata?.label || reg.event_id}
                      participantName={participantData.name}
                      college={participantData.college}
                      teamSize={reg.team_size.toString()}
                      eventDate="OCT 2026"
                      eventTime="9:00 AM"
                      eventLocation="Main Campus"
                      ticketId={reg.registration_code}
                      barcodeValue={participantData.participant_code}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        ) : step === 'onboarding' ? (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
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
