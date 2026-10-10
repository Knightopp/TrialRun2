import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import {
  getLocalCopperConfig,
  syncCopperConfig,
  saveCopperConfig,
  DEFAULT_COPPER_CONFIG
} from '../utils/copperConfig';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Power,
  Volume2,
  VolumeX,
  Play,
  Square,
  Plus,
  Trash2,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Radio,
  ExternalLink,
  LogOut,
  Mail,
  KeyRound
} from 'lucide-react';

const AUTHORIZED_EMAIL = 'tsrknight@gmail.com';

export default function CopperDashboard() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [authStep, setAuthStep] = useState('email'); // 'email', 'otp', 'password'
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(null);
  const [authMessage, setAuthMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Copper configuration state
  const [config, setConfig] = useState(getLocalCopperConfig);
  const [newTarget, setNewTarget] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // Audio preview state
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewAudioRef = useRef(null);

  // Check existing session on load
  useEffect(() => {
    let alive = true;

    const checkSession = async () => {
      setAuthLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentEmail = session?.user?.email?.trim().toLowerCase();

        if (alive) {
          if (currentEmail === AUTHORIZED_EMAIL.toLowerCase()) {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        }
      } catch (_) {
        if (alive) setIsAuthenticated(false);
      } finally {
        if (alive) setAuthLoading(false);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      const currentEmail = session?.user?.email?.trim().toLowerCase();
      if (currentEmail === AUTHORIZED_EMAIL.toLowerCase()) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });

    // Sync copper config
    syncCopperConfig().then(synced => {
      if (alive && synced) setConfig(synced);
    });

    return () => {
      alive = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Cooldown timer for OTP
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(c => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Clean up preview audio on unmount
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  // ---------------------------------------------------------
  // AUTHENTICATION HANDLERS
  // ---------------------------------------------------------
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthMessage(null);

    const clean = emailInput.trim().toLowerCase();
    if (!clean) {
      setAuthError('Please enter your administrator Gmail address.');
      return;
    }

    if (clean !== AUTHORIZED_EMAIL.toLowerCase()) {
      setAuthError(`ACCESS DENIED. Identity "${clean}" is unauthorized for Copper Protocol.`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Send Supabase OTP
      const { error } = await supabase.auth.signInWithOtp({
        email: clean,
        options: {
          shouldCreateUser: false
        }
      });

      if (error) {
        // If OTP sending hits an issue, give option to use password
        setAuthError(`Could not dispatch OTP: ${error.message}. You can switch to password verification below.`);
      } else {
        setAuthStep('otp');
        setCooldown(60);
        setAuthMessage(`Security OTP dispatched to ${AUTHORIZED_EMAIL}. Check your inbox!`);
      }
    } catch (err) {
      setAuthError(err.message || 'Error communicating with authentication server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthMessage(null);

    const cleanOtp = otpInput.trim();
    if (!cleanOtp) {
      setAuthError('Please enter the verification code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: AUTHORIZED_EMAIL,
        token: cleanOtp,
        type: 'email'
      });

      if (error) throw error;

      if (data?.session?.user?.email?.trim().toLowerCase() === AUTHORIZED_EMAIL.toLowerCase()) {
        setIsAuthenticated(true);
        setAuthMessage('Identity confirmed. Welcome to Copper Command.');
      } else {
        setAuthError('Verification succeeded, but unauthorized user email detected.');
      }
    } catch (err) {
      setAuthError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthMessage(null);

    if (!passwordInput) {
      setAuthError('Please enter the administrator password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: AUTHORIZED_EMAIL,
        password: passwordInput
      });

      if (error) throw error;

      if (data?.session?.user?.email?.trim().toLowerCase() === AUTHORIZED_EMAIL.toLowerCase()) {
        setIsAuthenticated(true);
      } else {
        setAuthError('Access restricted to tsrknight@gmail.com.');
      }
    } catch (err) {
      setAuthError(err.message || 'Incorrect password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setAuthStep('email');
    setEmailInput('');
    setOtpInput('');
    setPasswordInput('');
  };

  // ---------------------------------------------------------
  // PRANK CONFIGURATION HANDLERS
  // ---------------------------------------------------------
  const handleTogglePrank = async () => {
    const updated = {
      ...config,
      enabled: !config.enabled
    };
    setConfig(updated);
    await commitConfig(updated);
  };

  const handleAddTarget = async (e) => {
    e.preventDefault();
    const clean = newTarget.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }
    if (config.targets.includes(clean)) {
      alert('This email is already in the targets list.');
      return;
    }

    const updated = {
      ...config,
      targets: [...config.targets, clean]
    };
    setConfig(updated);
    setNewTarget('');
    await commitConfig(updated);
  };

  const handleRemoveTarget = async (emailToRemove) => {
    const updated = {
      ...config,
      targets: config.targets.filter(t => t !== emailToRemove)
    };
    setConfig(updated);
    await commitConfig(updated);
  };

  const handleVolumeChange = async (newVol) => {
    const volNum = parseFloat(newVol);
    const updated = {
      ...config,
      volume: volNum
    };
    setConfig(updated);
    if (previewAudioRef.current) {
      previewAudioRef.current.volume = volNum;
    }
    await commitConfig(updated);
  };

  const commitConfig = async (cfgToSave) => {
    setIsSaving(true);
    setSaveStatus('Saving changes...');
    try {
      await saveCopperConfig(cfgToSave);
      setSaveStatus('Config saved & synced to network!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('Saved locally (network sync pending).');
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------
  // AUDIO PREVIEW HANDLER
  // ---------------------------------------------------------
  const toggleAudioPreview = () => {
    if (isPreviewPlaying) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
      }
      setIsPreviewPlaying(false);
    } else {
      if (!previewAudioRef.current) {
        previewAudioRef.current = new Audio(config.audioUrl || '/song.mp3');
        previewAudioRef.current.loop = true;
      }
      previewAudioRef.current.volume = config.volume;
      previewAudioRef.current.play().then(() => {
        setIsPreviewPlaying(true);
      }).catch(err => {
        alert('Could not preview audio: ' + err.message);
        setIsPreviewPlaying(false);
      });
    }
  };

  // ---------------------------------------------------------
  // RENDER: LOADING STATE
  // ---------------------------------------------------------
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#090a0f',
        color: '#e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace'
      }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw className="animate-spin" size={36} color="#d97706" style={{ margin: '0 auto 1rem' }} />
          <p style={{ letterSpacing: '0.15em', textTransform: 'uppercase', color: '#94a3b8' }}>
            Initializing Copper Security Protocol...
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER: AUTHENTICATION GATE
  // ---------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 20%, #1c140a 0%, #08080c 100%)',
        color: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '480px',
          background: 'rgba(15, 17, 23, 0.95)',
          border: '1px solid rgba(217, 119, 6, 0.35)',
          borderRadius: '16px',
          padding: '2.5rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 35px rgba(217, 119, 6, 0.15)',
          backdropFilter: 'blur(12px)'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.2), rgba(180, 83, 9, 0.1))',
              border: '1px solid rgba(217, 119, 6, 0.4)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              color: '#f59e0b',
              boxShadow: '0 0 20px rgba(245, 158, 11, 0.25)'
            }}>
              <Lock size={30} />
            </div>
            <span style={{
              display: 'inline-block',
              background: 'rgba(217, 119, 6, 0.15)',
              border: '1px solid rgba(217, 119, 6, 0.3)',
              color: '#f59e0b',
              fontSize: '0.75rem',
              fontWeight: '700',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '0.75rem'
            }}>
              Top Secret // Restricted
            </span>
            <h1 style={{
              fontSize: '1.65rem',
              fontWeight: '800',
              color: '#fff',
              margin: '0 0 0.5rem',
              letterSpacing: '-0.02em'
            }}>
              Operation Copper
            </h1>
            <p style={{
              fontSize: '0.85rem',
              color: '#94a3b8',
              margin: 0,
              lineHeight: 1.5
            }}>
              Authorized clearance required. Please authenticate with master credentials.
            </p>
          </div>

          {/* Feedback messages */}
          {authError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              fontSize: '0.825rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem'
            }}>
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{authError}</div>
            </div>
          )}

          {authMessage && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#6ee7b7',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              fontSize: '0.825rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem'
            }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{authMessage}</div>
            </div>
          )}

          {/* STEP 1: ENTER GMAIL */}
          {authStep === 'email' && (
            <form onSubmit={handleRequestOtp}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#cbd5e1',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Admin Gmail
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b'
                  }} />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="tsrknight@gmail.com"
                    autoComplete="email"
                    autoFocus
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: 'rgba(30, 41, 59, 0.6)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem 0.85rem 2.75rem',
                      color: '#fff',
                      fontSize: '0.95rem',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(148, 163, 184, 0.2)'}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #d97706, #b45309)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.9rem',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  letterSpacing: '0.05em',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'opacity 0.2s, transform 0.1s',
                  boxShadow: '0 4px 15px rgba(217, 119, 6, 0.35)'
                }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} /> Verifying Authorization...
                  </>
                ) : (
                  <>
                    Request Security OTP <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div style={{
                marginTop: '1.25rem',
                textAlign: 'center'
              }}>
                <button
                  type="button"
                  onClick={() => { setAuthStep('password'); setAuthError(null); }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.775rem',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Or enter using master password
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: ENTER OTP */}
          {authStep === 'otp' && (
            <form onSubmit={handleVerifyOtp}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#cbd5e1',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Enter OTP Code sent to {AUTHORIZED_EMAIL}
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={18} style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b'
                  }} />
                  <input
                    type="text"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="Enter 6-digit code"
                    autoFocus
                    maxLength={10}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: 'rgba(30, 41, 59, 0.6)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem 0.85rem 2.75rem',
                      color: '#fff',
                      fontSize: '1.1rem',
                      letterSpacing: '0.2em',
                      fontWeight: 'bold',
                      outline: 'none',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(148, 163, 184, 0.2)'}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.9rem',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  letterSpacing: '0.05em',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)'
                }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} /> Verifying Code...
                  </>
                ) : (
                  <>
                    <Unlock size={16} /> Unlock Copper Dashboard
                  </>
                )}
              </button>

              <div style={{
                marginTop: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.775rem'
              }}>
                <button
                  type="button"
                  onClick={() => { setAuthStep('email'); setAuthError(null); }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Change Email
                </button>
                <button
                  type="button"
                  disabled={cooldown > 0}
                  onClick={handleRequestOtp}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: cooldown > 0 ? '#64748b' : '#f59e0b',
                    cursor: cooldown > 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: PASSWORD FALLBACK */}
          {authStep === 'password' && (
            <form onSubmit={handlePasswordLogin}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#cbd5e1',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Password for {AUTHORIZED_EMAIL}
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b'
                  }} />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••••••"
                    autoFocus
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: 'rgba(30, 41, 59, 0.6)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem 0.85rem 2.75rem',
                      color: '#fff',
                      fontSize: '0.95rem',
                      outline: 'none',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(148, 163, 184, 0.2)'}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #d97706, #b45309)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.9rem',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  letterSpacing: '0.05em',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} /> Authenticating...
                  </>
                ) : (
                  <>
                    <Unlock size={16} /> Enter with Password
                  </>
                )}
              </button>

              <div style={{
                marginTop: '1.25rem',
                textAlign: 'center'
              }}>
                <button
                  type="button"
                  onClick={() => { setAuthStep('email'); setAuthError(null); }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.775rem',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Back to OTP authentication
                </button>
              </div>
            </form>
          )}

          {/* Discreet home button */}
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <a
              href="/"
              style={{
                color: '#64748b',
                fontSize: '0.75rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              ← Return to public website
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // RENDER: SECRET COPPER DASHBOARD
  // ---------------------------------------------------------
  return (
    <div style={{
      minHeight: '100vh',
      background: '#090a0f',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      paddingBottom: '4rem'
    }}>
      {/* Top Navbar */}
      <header style={{
        background: 'rgba(15, 17, 23, 0.9)',
        borderBottom: '1px solid rgba(217, 119, 6, 0.3)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #d97706, #b45309)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 0 15px rgba(217, 119, 6, 0.4)'
            }}>
              <Radio size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h1 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, letterSpacing: '-0.01em' }}>
                  OPERATION COPPER
                </h1>
                <span style={{
                  background: config.enabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  border: config.enabled ? '1px solid #10b981' : '1px solid #ef4444',
                  color: config.enabled ? '#34d399' : '#f87171',
                  fontSize: '0.65rem',
                  fontWeight: '800',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}>
                  {config.enabled ? 'ARMED & ACTIVE' : 'DISARMED'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                Authorized Controller: <span style={{ color: '#f59e0b', fontWeight: '600' }}>{AUTHORIZED_EMAIL}</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Panic Exit Button */}
            <a
              href="/"
              title="Quickly exit to main site"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#fca5a5',
                padding: '0.5rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.775rem',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'background 0.2s'
              }}
            >
              <ShieldAlert size={14} /> Panic Exit
            </a>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              style={{
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                color: '#cbd5e1',
                padding: '0.5rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.775rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1100px', margin: '2rem auto 0', padding: '0 1.5rem' }}>
        {/* Save feedback indicator */}
        {saveStatus && (
          <div style={{
            background: 'rgba(217, 119, 6, 0.15)',
            border: '1px solid rgba(217, 119, 6, 0.4)',
            color: '#fef3c7',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <RefreshCw className={isSaving ? "animate-spin" : ""} size={16} color="#f59e0b" />
            <span>{saveStatus}</span>
          </div>
        )}

        {/* TOP HERO: MASTER ON/OFF SWITCH */}
        <section style={{
          background: config.enabled
            ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.18) 0%, rgba(15, 17, 23, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(15, 17, 23, 0.95) 100%)',
          border: config.enabled
            ? '1px solid rgba(217, 119, 6, 0.45)'
            : '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: config.enabled
            ? '0 10px 30px rgba(217, 119, 6, 0.15)'
            : '0 10px 30px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem'
        }}>
          <div>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: config.enabled ? '#f59e0b' : '#ef4444'
            }}>
              Master Prank Override
            </span>
            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: '800',
              margin: '0.25rem 0 0.5rem',
              color: '#fff'
            }}>
              {config.enabled ? 'Prank Audio Engine is ARMED' : 'Prank Audio Engine is MUTED'}
            </h2>
            <p style={{
              fontSize: '0.9rem',
              color: '#94a3b8',
              margin: 0,
              maxWidth: '600px',
              lineHeight: 1.5
            }}>
              {config.enabled
                ? 'Whenever any of the targeted admin emails log in anywhere on the website, goofy song playback begins immediately in the background.'
                : 'All prank music triggers are suspended globally. No audio will play even if targeted emails log in.'}
            </p>
          </div>

          <button
            onClick={handleTogglePrank}
            style={{
              background: config.enabled
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '1rem 1.75rem',
              fontSize: '1rem',
              fontWeight: '800',
              letterSpacing: '0.04em',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              boxShadow: config.enabled
                ? '0 8px 25px rgba(239, 68, 68, 0.4)'
                : '0 8px 25px rgba(16, 185, 129, 0.4)',
              transition: 'transform 0.1s, opacity 0.2s'
            }}
          >
            <Power size={20} />
            {config.enabled ? 'TURN PRANK OFF' : 'ACTIVATE PRANK'}
          </button>
        </section>

        {/* 2-COLUMN GRID: TARGETS & AUDIO LAB */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {/* TARGETS CARD */}
          <section style={{
            background: 'rgba(15, 17, 23, 0.85)',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            borderRadius: '16px',
            padding: '1.75rem',
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: '0 0 0.25rem' }}>
                  Targeted Admin Emails
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                  Victim logins that trigger background playback
                </p>
              </div>
              <span style={{
                background: 'rgba(217, 119, 6, 0.15)',
                border: '1px solid rgba(217, 119, 6, 0.3)',
                color: '#f59e0b',
                fontSize: '0.75rem',
                fontWeight: '700',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px'
              }}>
                {config.targets.length} Targets
              </span>
            </div>

            {/* Target List */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              marginBottom: '1.5rem',
              maxHeight: '260px',
              overflowY: 'auto'
            }}>
              {config.targets.map((email) => (
                <div
                  key={email}
                  style={{
                    background: 'rgba(30, 41, 59, 0.4)',
                    border: '1px solid rgba(148, 163, 184, 0.15)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: config.enabled ? '#34d399' : '#94a3b8',
                      boxShadow: config.enabled ? '0 0 8px #34d399' : 'none'
                    }} />
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      fontFamily: 'monospace',
                      color: '#f1f5f9'
                    }}>
                      {email}
                    </span>
                  </div>

                  <button
                    onClick={() => handleRemoveTarget(email)}
                    title={`Remove ${email}`}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '0.35rem',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Target Input */}
            <form onSubmit={handleAddTarget} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="email"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                placeholder="victim@gmail.com"
                style={{
                  flex: 1,
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #d97706, #b45309)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Plus size={16} /> Add
              </button>
            </form>
          </section>

          {/* AUDIO CONTROLS CARD */}
          <section style={{
            background: 'rgba(15, 17, 23, 0.85)',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            borderRadius: '16px',
            padding: '1.75rem',
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: '0 0 0.25rem' }}>
                Goofy Track Station
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                Mounted audio file and preview controls
              </p>
            </div>

            {/* Track Info Box */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.4)',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Target Track File
                </span>
                <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#f59e0b', fontFamily: 'monospace' }}>
                  /song.mp3
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  1.95 MB (Desktop renders / song.mp3)
                </span>
              </div>

              {/* Preview Button */}
              <button
                onClick={toggleAudioPreview}
                style={{
                  background: isPreviewPlaying ? 'rgba(239, 68, 68, 0.2)' : 'rgba(217, 119, 6, 0.2)',
                  border: isPreviewPlaying ? '1px solid #ef4444' : '1px solid #f59e0b',
                  color: isPreviewPlaying ? '#f87171' : '#f59e0b',
                  borderRadius: '8px',
                  padding: '0.65rem 1rem',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'background 0.2s'
                }}
              >
                {isPreviewPlaying ? (
                  <>
                    <Square size={14} /> Stop Preview
                  </>
                ) : (
                  <>
                    <Play size={14} /> Test Play
                  </>
                )}
              </button>
            </div>

            {/* Volume Slider */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Volume2 size={16} color="#f59e0b" /> Playback Volume
                </span>
                <span style={{ color: '#f59e0b', fontWeight: '700', fontFamily: 'monospace' }}>
                  {Math.round(config.volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.volume}
                onChange={(e) => handleVolumeChange(e.target.value)}
                style={{
                  width: '100%',
                  accentColor: '#d97706',
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* Loop Setting */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.25)',
              border: '1px solid rgba(148, 163, 184, 0.1)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#f1f5f9' }}>
                  Continuous Infinite Loop
                </div>
                <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
                  Replays continuously until target logs out
                </div>
              </div>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.15)',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px'
              }}>
                ALWAYS ON
              </span>
            </div>
          </section>
        </div>

        {/* HOW IT WORKS / CHEAT SHEET */}
        <section style={{
          background: 'rgba(15, 17, 23, 0.5)',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          borderRadius: '16px',
          padding: '1.75rem'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: '0 0 1rem', color: '#cbd5e1' }}>
            Prank Architecture & Behavior
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
            fontSize: '0.825rem',
            color: '#94a3b8'
          }}>
            <div style={{ background: 'rgba(30, 41, 59, 0.3)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ fontWeight: '700', color: '#f59e0b', marginBottom: '0.35rem' }}>1. Cross-Page Stealth</div>
              The audio engine stays alive across navigation between home, event registrations, admin portal, and user profiles.
            </div>
            <div style={{ background: 'rgba(30, 41, 59, 0.3)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ fontWeight: '700', color: '#f59e0b', marginBottom: '0.35rem' }}>2. Autoplay Bypass</div>
              Because the victim clicks the "Sign in" button or taps their profile, modern browser autoplay protections are naturally unlocked!
            </div>
            <div style={{ background: 'rgba(30, 41, 59, 0.3)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ fontWeight: '700', color: '#f59e0b', marginBottom: '0.35rem' }}>3. Cloud & Local Sync</div>
              Toggling or modifying targets in this dashboard instantly updates in localStorage and syncs with the remote Supabase database.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
