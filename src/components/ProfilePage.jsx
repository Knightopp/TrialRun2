import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiMail, FiKey, FiLogOut, FiAward, FiCalendar, FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email'); // 'email', 'otp', 'dashboard'
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const [participantData, setParticipantData] = useState(null);
  const [registrations, setRegistrations] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setStep('dashboard');
        fetchUserData(session.user.email);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setStep('dashboard');
        fetchUserData(session.user.email);
      } else {
        setStep('email');
        setParticipantData(null);
        setRegistrations([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userEmail) => {
    setLoading(true);
    try {
      // 1. Fetch participant record
      const { data: participant, error: pError } = await supabase
        .from('participants')
        .select('*')
        .eq('email', userEmail)
        .maybeSingle();

      if (pError) throw pError;
      
      setParticipantData(participant);

      if (participant) {
        // 2. Fetch their registrations + event details
        const { data: regs, error: rError } = await supabase
          .from('registrations')
          .select(`
            *,
            events_metadata (*)
          `)
          .eq('participant_id', participant.id);

        if (rError) throw rError;
        setRegistrations(regs || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
      });

      if (error) throw error;
      setStep('otp');
      setMessage('A login code has been sent to your email.');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });

      if (error) throw error;
      // Auth state change will handle the rest
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading && !session && step !== 'email' && step !== 'otp') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#070b14', color: '#fff' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(56, 189, 248, 0.3)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#070b14',
      color: '#fff',
      fontFamily: 'var(--font-sans)',
      padding: '2rem',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Background Effects */}
      <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(56,189,248,0.15) 0%, rgba(7,11,20,0) 70%)', filter: 'blur(60px)', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(7,11,20,0) 70%)', filter: 'blur(60px)', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1000px', margin: '0 auto', paddingTop: '4rem' }}>
        
        <button 
          onClick={() => navigate('/')}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', 
            background: 'none', border: 'none', color: '#888', 
            cursor: 'pointer', marginBottom: '2rem', fontSize: '1rem',
            padding: '0'
          }}
        >
          <FiArrowLeft /> Back to Home
        </button>

        {step === 'dashboard' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h1 style={{ fontSize: '3rem', fontWeight: '800', margin: '0 0 0.5rem 0', background: 'linear-gradient(90deg, #fff, #888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Participant Dashboard
                </h1>
                <p style={{ color: '#888', fontSize: '1.1rem', margin: 0 }}>
                  Welcome back, <span style={{ color: '#38bdf8' }}>{session?.user?.email}</span>
                </p>
              </div>
              <button 
                onClick={handleLogout}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.75rem 1.5rem', backgroundColor: 'rgba(255,50,50,0.1)',
                  color: '#ff4444', border: '1px solid rgba(255,50,50,0.2)',
                  borderRadius: '12px', cursor: 'pointer', fontWeight: '600',
                  transition: 'all 0.2s'
                }}
              >
                <FiLogOut /> Sign Out
              </button>
            </div>

            {loading ? (
              <div style={{ marginTop: '4rem', textAlign: 'center' }}>Loading your data...</div>
            ) : !participantData ? (
              <div style={{ marginTop: '4rem', padding: '3rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                <FiCalendar size={48} color="#555" style={{ marginBottom: '1rem' }} />
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>No Registrations Found</h2>
                <p style={{ color: '#888' }}>You haven't registered for any events yet using this email.</p>
                <button 
                  onClick={() => navigate('/')}
                  style={{ marginTop: '1.5rem', padding: '0.75rem 2rem', backgroundColor: '#38bdf8', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Explore Events
                </button>
              </div>
            ) : (
              <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                
                {/* Profile Card */}
                <div style={{ padding: '2rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h3 style={{ fontSize: '1.2rem', color: '#888', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FiAward /> Your Profile
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <p style={{ color: '#555', fontSize: '0.9rem', margin: '0 0 0.25rem 0' }}>Name</p>
                      <p style={{ fontSize: '1.1rem', margin: 0 }}>{participantData.name}</p>
                    </div>
                    <div>
                      <p style={{ color: '#555', fontSize: '0.9rem', margin: '0 0 0.25rem 0' }}>College</p>
                      <p style={{ fontSize: '1.1rem', margin: 0 }}>{participantData.college}</p>
                    </div>
                    <div>
                      <p style={{ color: '#555', fontSize: '0.9rem', margin: '0 0 0.25rem 0' }}>Phone</p>
                      <p style={{ fontSize: '1.1rem', margin: 0 }}>{participantData.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Events Card */}
                <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Your Registered Events</h3>
                  
                  {registrations.length === 0 ? (
                    <p style={{ color: '#888' }}>You don't have any event tickets yet.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                      {registrations.map(reg => (
                        <div key={reg.id} style={{ 
                          padding: '1.5rem', 
                          background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                          borderRadius: '20px', 
                          border: '1px solid rgba(255,255,255,0.05)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <div style={{ position: 'absolute', top: 0, right: 0, padding: '0.5rem 1rem', background: 'rgba(56,189,248,0.1)', color: '#38bdf8', borderBottomLeftRadius: '16px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                            {reg.status.toUpperCase()}
                          </div>
                          
                          <h4 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0', color: '#fff' }}>
                            {reg.events_metadata?.label || reg.event_id}
                          </h4>
                          
                          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <div style={{ flex: 1, padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                              <p style={{ color: '#888', fontSize: '0.8rem', margin: '0 0 0.25rem 0' }}>Registration ID</p>
                              <p style={{ fontSize: '0.9rem', margin: 0, fontFamily: 'monospace', color: '#38bdf8' }}>
                                {reg.registration_code}
                              </p>
                            </div>
                            {reg.team_size > 1 && (
                              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                                <p style={{ color: '#888', fontSize: '0.8rem', margin: '0 0 0.25rem 0' }}>Team</p>
                                <p style={{ fontSize: '0.9rem', margin: 0 }}>{reg.team_size} Members</p>
                              </div>
                            )}
                          </div>
                          
                          {reg.status === 'confirmed' && (
                            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                              <button style={{ 
                                width: '100%', padding: '0.75rem', 
                                backgroundColor: 'transparent', border: '1px solid #38bdf8', 
                                color: '#38bdf8', borderRadius: '8px', cursor: 'pointer',
                                fontWeight: '600'
                              }}>
                                View Certificate (Locked)
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        ) : (
          <div style={{ 
            maxWidth: '400px', margin: '4rem auto', 
            padding: '2.5rem', backgroundColor: 'rgba(255,255,255,0.02)', 
            borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(20px)'
          }}>
            <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', textAlign: 'center' }}>Welcome Back</h1>
            <p style={{ color: '#888', textAlign: 'center', marginBottom: '2rem' }}>
              Sign in to view your tickets and certificates
            </p>

            {error && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255,50,50,0.1)', color: '#ff4444', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid rgba(255,50,50,0.2)' }}>
                {error}
              </div>
            )}
            {message && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(56,189,248,0.1)', color: '#38bdf8', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid rgba(56,189,248,0.2)' }}>
                {message}
              </div>
            )}

            {step === 'email' ? (
              <form onSubmit={handleSendOtp}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', color: '#888', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <FiMail style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@college.edu"
                      style={{ 
                        width: '100%', padding: '1rem 1rem 1rem 2.75rem', 
                        backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px', color: '#fff', fontSize: '1rem',
                        outline: 'none', transition: 'border-color 0.2s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#38bdf8'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  style={{ 
                    width: '100%', padding: '1rem', backgroundColor: '#38bdf8', 
                    color: '#000', border: 'none', borderRadius: '12px', 
                    fontSize: '1rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? 'Sending...' : 'Send Login Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', color: '#888', fontSize: '0.9rem', marginBottom: '0.5rem' }}>6-Digit Login Code</label>
                  <div style={{ position: 'relative' }}>
                    <FiKey style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                    <input 
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                      placeholder="Enter code from email"
                      style={{ 
                        width: '100%', padding: '1rem 1rem 1rem 2.75rem', 
                        backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px', color: '#fff', fontSize: '1rem',
                        outline: 'none', transition: 'border-color 0.2s',
                        letterSpacing: '2px'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#38bdf8'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  style={{ 
                    width: '100%', padding: '1rem', backgroundColor: '#38bdf8', 
                    color: '#000', border: 'none', borderRadius: '12px', 
                    fontSize: '1rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? 'Verifying...' : 'Sign In'}
                </button>
                <button 
                  type="button"
                  onClick={() => { setStep('email'); setOtp(''); setError(null); setMessage(null); }}
                  style={{ 
                    width: '100%', padding: '1rem', backgroundColor: 'transparent', 
                    color: '#888', border: 'none', borderRadius: '12px', 
                    fontSize: '0.9rem', cursor: 'pointer', marginTop: '0.5rem'
                  }}
                >
                  Use a different email
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
