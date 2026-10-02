import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { FiUsers, FiLock, FiLogOut, FiDatabase, FiSettings, FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('email'); // 'email', 'otp', 'dashboard'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [adminRole, setAdminRole] = useState(null); // 'superadmin' or 'coordinator'
  const [adminEventId, setAdminEventId] = useState(null);
  
  // Dashboard data
  const [registrations, setRegistrations] = useState([]);
  const [stats, setStats] = useState({ total: 0, verified: 0 });

  useEffect(() => {
    const savedAdmin = localStorage.getItem('srishti_admin_session');
    if (savedAdmin) {
      verifyAdminAccess(savedAdmin);
    }
  }, []);

  const verifyAdminAccess = async (adminEmail) => {
    setLoading(true);
    try {
      const { data: adminData, error: adminErr } = await supabase
        .from('event_admins')
        .select('*')
        .eq('email', adminEmail)
        .single();

      if (adminErr || !adminData) {
        handleLogout();
        throw new Error('Unauthorized. Not an admin.');
      }

      setAdminRole(adminData.role);
      setAdminEventId(adminData.event_id);
      setStep('dashboard');
      fetchDashboardData(adminData.role, adminData.event_id);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async (role, eventId) => {
    try {
      let query = supabase.from('registrations').select('*, events_metadata(label)');
      if (role === 'coordinator' && eventId) {
        query = query.eq('event_id', eventId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      setRegistrations(data || []);
      setStats({
        total: data.length,
        verified: data.filter(r => r.payment_status === 'verified').length
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data: adminData, error: adminErr } = await supabase
        .from('event_admins')
        .select('*')
        .eq('email', email)
        .single();

      if (adminErr || !adminData) {
        throw new Error('Access Denied: This email is not registered as an Admin.');
      }

      const code = Math.floor(1000 + Math.random() * 9000).toString();
      localStorage.setItem('pending_admin_otp', code);
      localStorage.setItem('pending_admin_email', email);

      const htmlContent = `
        <div style="font-family: sans-serif; background: #070b14; color: white; padding: 40px; border-radius: 12px; text-align: center;">
          <h2 style="color: #ff3366;">ADMIN ACCESS REQUEST</h2>
          <h1 style="font-size: 48px; letter-spacing: 4px; margin: 20px 0;">${code}</h1>
          <p>If you didn't request this, ignore this email.</p>
        </div>
      `;

      await fetch('/api/send_email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email, subject: 'Admin Login Code', html: htmlContent })
      });

      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const savedCode = localStorage.getItem('pending_admin_otp');
      const savedEmail = localStorage.getItem('pending_admin_email');

      if (otp !== savedCode || email !== savedEmail) {
        throw new Error('Invalid code.');
      }

      localStorage.removeItem('pending_admin_otp');
      localStorage.removeItem('pending_admin_email');
      localStorage.setItem('srishti_admin_session', email);
      
      verifyAdminAccess(email);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('srishti_admin_session');
    setStep('email');
    setRegistrations([]);
    setAdminRole(null);
  };

  if (step !== 'dashboard') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#070b14', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '400px', width: '100%', padding: '2.5rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,50,50,0.2)', backdropFilter: 'blur(20px)' }}>
          <h1 style={{ textAlign: 'center', color: '#ff4444', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <FiLock /> Admin Portal
          </h1>
          
          {error && <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255,50,50,0.1)', color: '#ff4444', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{error}</div>}

          {step === 'email' ? (
            <form onSubmit={handleSendOtp}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Admin Email" style={{ width: '100%', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', marginBottom: '1rem' }} />
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '1rem', backgroundColor: '#ff4444', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                {loading ? 'Authenticating...' : 'Request Access'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <input type="text" value={otp} onChange={e => setOtp(e.target.value)} required maxLength="4" placeholder="4-Digit Code" style={{ width: '100%', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', marginBottom: '1rem', letterSpacing: '4px', textAlign: 'center' }} />
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '1rem', backgroundColor: '#ff4444', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                {loading ? 'Verifying...' : 'Login'}
              </button>
            </form>
          )}
          
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>Return to Website</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#070b14', color: '#fff', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1.5rem' }}>
          <div>
            <h1 style={{ color: '#ff4444', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FiDatabase /> {adminRole === 'superadmin' ? 'Super Admin Dashboard' : 'Event Coordinator Dashboard'}
            </h1>
            <p style={{ color: '#888', margin: 0 }}>Logged in as: {localStorage.getItem('srishti_admin_session')}</p>
          </div>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', backgroundColor: 'rgba(255,50,50,0.1)', color: '#ff4444', border: '1px solid rgba(255,50,50,0.2)', borderRadius: '12px', cursor: 'pointer', fontWeight: '600' }}>
            <FiLogOut /> Exit Panel
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          <div style={{ padding: '1.5rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ color: '#888', margin: '0 0 0.5rem 0' }}>Total Registrations</p>
            <h2 style={{ margin: 0, fontSize: '2.5rem' }}>{stats.total}</h2>
          </div>
          <div style={{ padding: '1.5rem', backgroundColor: 'rgba(56,189,248,0.05)', borderRadius: '16px', border: '1px solid rgba(56,189,248,0.2)' }}>
            <p style={{ color: '#38bdf8', margin: '0 0 0.5rem 0' }}>Verified</p>
            <h2 style={{ margin: 0, fontSize: '2.5rem', color: '#38bdf8' }}>{stats.verified}</h2>
          </div>
          {adminRole === 'superadmin' && (
            <div style={{ padding: '1.5rem', backgroundColor: 'rgba(16,185,129,0.05)', borderRadius: '16px', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <span style={{ color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiUsers /> Manage Admins</span>
            </div>
          )}
        </div>

        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <th style={{ padding: '1rem', color: '#888' }}>Reg ID</th>
                <th style={{ padding: '1rem', color: '#888' }}>Participant</th>
                <th style={{ padding: '1rem', color: '#888' }}>Event</th>
                <th style={{ padding: '1rem', color: '#888' }}>Team Size</th>
                <th style={{ padding: '1rem', color: '#888' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map(reg => (
                <tr key={reg.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem', fontFamily: 'monospace', color: '#38bdf8' }}>{reg.participant_code}</td>
                  <td style={{ padding: '1rem' }}>
                    <div>{reg.lead_name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>{reg.lead_email}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>{reg.events_metadata?.label || reg.event_id}</td>
                  <td style={{ padding: '1rem' }}>{reg.team_size}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ padding: '0.25rem 0.5rem', backgroundColor: reg.payment_status === 'verified' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)', color: reg.payment_status === 'verified' ? '#10b981' : '#fff', borderRadius: '4px', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                      {reg.payment_status}
                    </span>
                  </td>
                </tr>
              ))}
              {registrations.length === 0 && (
                <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No registrations found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
