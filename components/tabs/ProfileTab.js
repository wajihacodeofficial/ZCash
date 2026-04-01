'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';
import { useRouter } from 'next/navigation';
import { 
  CreditCard, 
  Copy, 
  Upload, 
  Image as ImageIcon, 
  History, 
  ChevronRight, 
  LogOut, 
  X, 
  Loader2, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  Minus, 
  Info, 
  Users, 
  Trophy, 
  UserPlus, 
  HelpCircle, 
  MessageSquare,
  Lock,
  ShieldCheck,
  Headset,
  Eye,
  EyeOff
} from 'lucide-react';
import TabHeader from '../TabHeader';

export default function ProfileTab({ userProfile, setNotifOpen, unreadCount, onAvatarClick, showInternalHeader = true }) {
  const router = useRouter();
  const supabase = createClient();
  const initial = userProfile?.full_name?.split(' ')[0]?.toUpperCase()?.charAt(0) || 'F';
  const firstName = userProfile?.full_name?.split(' ')[0] || 'User';
  const balance = Number(userProfile?.balance || 0);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  
  // Security/Password states
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passForm, setPassForm] = useState({ old: '', new: '', confirm: '' });
  const [showPass, setShowPass] = useState({ old: false, new: false, confirm: false });
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Edit Profile states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ 
    full_name: userProfile?.full_name || '', 
    phone_number: userProfile?.phone_number || '',
    country: userProfile?.country || ''
  });

  // Rank Modal state
  const [showRankModal, setShowRankModal] = useState(false);

  useEffect(() => {
    if (userProfile?.id) {
      fetchHistory();
    }
  }, [userProfile?.id]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passForm.new !== passForm.confirm) {
      showToast('New passwords do not match!', 'error');
      return;
    }
    if (passForm.new.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userProfile.email,
        password: passForm.old,
      });

      if (signInError) {
         showToast('Old password is incorrect.', 'error');
         setLoading(false);
         return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: passForm.new
      });

      if (updateError) throw updateError;

      showToast('Password updated successfully!');
      setIsChangingPass(false);
      setPassForm({ old: '', new: '', confirm: '' });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateRank = (invested) => {
    const amount = Number(invested || 0);
    if (amount >= 500) return { name: 'DIAMOND', color: '#b9f2ff', next: null, min: 500 };
    if (amount >= 200) return { name: 'GOLD', color: '#FFD700', next: 'DIAMOND', nextMin: 500, min: 200 };
    if (amount >= 50) return { name: 'SILVER', color: '#C0C0C0', next: 'GOLD', nextMin: 200, min: 50 };
    return { name: 'BRONZE', color: '#CD7F32', next: 'SILVER', nextMin: 50, min: 0 };
  };

  const handleSupport = () => {
    const supportMsg = 'Hello, I need assistance with my EasyPay profile.';
    window.open(`https://wa.me/923000000000?text=${supportMsg}`, '_blank');
  };

  const handleResendVerification = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userProfile.email }),
      });
      if (res.ok) {
        showToast('Verification link sent to your email!');
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to resend link.', 'error');
      }
    } catch (err) {
      showToast('Network error. Please try again later.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'deposit': return <Plus size={14} color="#22c55e" />;
      case 'withdrawal': return <Minus size={14} color="#ef4444" />;
      case 'investment': return <ArrowUpRight size={14} color="#f59e0b" />;
      case 'roi_earning':
      case 'promo_bonus':
      case 'referral_bonus': return <ArrowDownLeft size={14} color="#22c55e" />;
      default: return <Info size={14} color="var(--text-muted)" />;
    }
  };

  const getTransactionLabel = (type) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const copyUserId = () => {
    if (userProfile?.id) {
       navigator.clipboard.writeText(userProfile.id);
       showToast('User ID copied to clipboard!');
    }
  };

  return (
    <section style={{ paddingBottom: '100px', background: 'var(--bg-light)', minHeight: '100%', position: 'relative' }}>
      
      {/* Custom Toast */}
      {toast.show && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, background: toast.type === 'success' ? '#22c55e' : '#ef4444',
          color: '#fff', padding: '12px 24px', borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '10px',
          fontWeight: '700', fontSize: '14px', animation: 'fadeInDown 0.3s ease forwards'
        }}>
          {toast.message}
          <X size={16} onClick={() => setToast({ ...toast, show: false })} style={{ cursor: 'pointer' }} />
        </div>
      )}

      {showInternalHeader && (
          <TabHeader title="MY PROFILE" userProfile={userProfile} setNotifOpen={setNotifOpen} unreadCount={unreadCount} onAvatarClick={onAvatarClick} />
      )}

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Profile details card (Combined) */}
        {!isChangingPass && (
          <div style={{ background: 'var(--bg-card)', borderRadius: '28px', border: '1px solid var(--border)', padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', boxShadow: '0 12px 40px rgba(0,0,0,0.08)' }}>
            {/* Avatar Section */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <div style={{ width: '92px', height: '92px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--blue-text), #599dff)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '42px', fontWeight: '900', boxShadow: '0 10px 20px rgba(34, 156, 255, 0.3)' }}>
                {initial}
              </div>
              <div style={{ position: 'absolute', bottom: '0', right: '0', width: '28px', height: '28px', background: '#22c55e', border: '3px solid var(--bg-card)', borderRadius: '50%' }} />
            </div>

            <h2 style={{ color: 'var(--text-dark)', fontSize: '24px', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>
              {userProfile?.full_name || 'User Name'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0, fontWeight: '600' }}>
              @{userProfile?.username || 'user_easypay'}
            </p>
            
            <div onClick={copyUserId} style={{ marginTop: '10px', padding: '6px 14px', borderRadius: '30px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} className="clicky">
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', letterSpacing: '0.8px' }}>USER ID: {userProfile?.id?.slice(0, 15)}...</span>
              <Copy size={12} color="var(--text-muted)" />
            </div>

            <div style={{ width: '100%', height: '1px', background: 'var(--border)', margin: '24px 0 20px' }} />

            {/* Core Metrics: Balance, Earning, Invested */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(34,156,255,0.08)', padding: '16px 20px', borderRadius: '20px', border: '1px solid rgba(34,156,255,0.15)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>Current Balance</span>
                  <span style={{ color: 'var(--blue-text)', fontSize: '24px', fontWeight: '900' }}>${balance.toFixed(2)}</span>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--blue-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={24} color="#000" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'rgba(34,197,94,0.08)', borderRadius: '20px', padding: '16px', border: '1px solid rgba(34,197,94,0.15)' }}>
                  <div style={{ color: 'var(--green-text)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '6px' }}>Earnings</div>
                  <div style={{ color: 'var(--green-text)', fontSize: '18px', fontWeight: '900' }}>${Number(userProfile?.total_roi || 0).toFixed(2)}</div>
                </div>
                <div style={{ background: 'rgba(243,156,18,0.08)', borderRadius: '20px', padding: '16px', border: '1px solid rgba(243,156,18,0.15)' }}>
                  <div style={{ color: '#F39C12', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '6px' }}>Invested</div>
                  <div style={{ color: '#F39C12', fontSize: '18px', fontWeight: '900' }}>${Number(userProfile?.total_invested || 0).toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Profile Form */}
        {isEditing && (
          <div style={{ background: 'var(--bg-card)', borderRadius: '28px', border: '1px solid var(--border)', padding: '24px', boxShadow: '0 12px 40px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h3 style={{ color: 'var(--text-dark)', fontSize: '18px', fontWeight: '900' }}>Edit Profile</h3>
                  <X size={20} color="var(--text-muted)" onClick={() => setIsEditing(false)} style={{ cursor: 'pointer' }} />
              </div>
              <form onSubmit={handleProfileUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700', paddingLeft: '4px' }}>FULL NAME</label>
                    <input
                      type="text" required
                      value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px', color: '#fff', outline: 'none', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700', paddingLeft: '4px' }}>PHONE NUMBER</label>
                    <input
                      type="text"
                      value={editForm.phone_number} onChange={e => setEditForm({...editForm, phone_number: e.target.value})}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px', color: '#fff', outline: 'none', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700', paddingLeft: '4px' }}>COUNTRY</label>
                    <input
                      type="text"
                      value={editForm.country} onChange={e => setEditForm({...editForm, country: e.target.value})}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px', color: '#fff', outline: 'none', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                  <button
                    disabled={loading}
                    type="submit"
                    style={{ background: 'var(--blue-text)', color: '#000', border: 'none', borderRadius: '16px', padding: '16px', fontWeight: '900', marginTop: '8px', fontSize: '15px' }}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
              </form>
          </div>
        )}

        {/* Verification Alert */}
        {userProfile && !userProfile.email_confirmed_at && (
          <div style={{ background: 'rgba(239, 68, 68, 0.05)', borderRadius: '24px', border: '1px dashed rgba(239, 68, 68, 0.3)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldCheck size={20} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-dark)', margin: 0 }}>Verify your email</p>
              <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', margin: 0 }}>Your account is currently restricted.</p>
            </div>
            <button 
              onClick={handleResendVerification}
              disabled={loading}
              style={{ padding: '8px 14px', borderRadius: '10px', background: 'var(--blue-text)', color: '#fff', border: 'none', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
            >
              RESEND
            </button>
          </div>
        )}

        {/* Password Form (Visible when isChangingPass is true) */}
        {isChangingPass && (
          <div style={{ background: 'var(--bg-card)', borderRadius: '28px', border: '1px solid var(--border)', padding: '24px', boxShadow: '0 12px 40px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h3 style={{ color: 'var(--text-dark)', fontSize: '18px', fontWeight: '900' }}>Change Password</h3>
                  <X size={20} color="var(--text-muted)" onClick={() => setIsChangingPass(false)} style={{ cursor: 'pointer' }} />
              </div>
              <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Current Password */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700', paddingLeft: '4px' }}>CURRENT PASSWORD</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPass.old ? 'text' : 'password'} placeholder="Enter current password" required
                        value={passForm.old} onChange={e => setPassForm({...passForm, old: e.target.value})}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px 46px 14px 14px', color: '#fff', outline: 'none', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                      />
                      <div onClick={() => setShowPass(s => ({...s, old: !s.old}))} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.5 }}>
                        {showPass.old ? <EyeOff size={16} color="#fff" /> : <Eye size={16} color="#fff" />}
                      </div>
                    </div>
                  </div>
                  {/* New Password */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700', paddingLeft: '4px' }}>NEW PASSWORD</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPass.new ? 'text' : 'password'} placeholder="Min. 6 characters" required
                        value={passForm.new} onChange={e => setPassForm({...passForm, new: e.target.value})}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px 46px 14px 14px', color: '#fff', outline: 'none', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                      />
                      <div onClick={() => setShowPass(s => ({...s, new: !s.new}))} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.5 }}>
                        {showPass.new ? <EyeOff size={16} color="#fff" /> : <Eye size={16} color="#fff" />}
                      </div>
                    </div>
                    {/* Password strength */}
                    {passForm.new.length > 0 && (() => {
                      const s = passForm.new;
                      const strength = s.length >= 10 && /[A-Z]/.test(s) && /[0-9]/.test(s) && /[^A-Za-z0-9]/.test(s) ? 4
                        : s.length >= 8 && /[A-Z]/.test(s) && /[0-9]/.test(s) ? 3
                        : s.length >= 6 ? 2 : 1;
                      const color = strength >= 3 ? '#22c55e' : strength === 2 ? '#F39C12' : '#ef4444';
                      const label = strength === 4 ? 'Strong' : strength === 3 ? 'Good' : strength === 2 ? 'Weak' : 'Too short';
                      return (
                        <div style={{ marginTop: '6px' }}>
                          <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                            {[1,2,3,4].map(l => <div key={l} style={{ flex: 1, height: '3px', borderRadius: '3px', background: l <= strength ? color : 'rgba(255,255,255,0.08)', transition: 'background 0.3s' }} />)}
                          </div>
                          <p style={{ fontSize: '11px', color: color, fontWeight: '700', margin: 0 }}>{label}</p>
                        </div>
                      );
                    })()}
                  </div>
                  {/* Confirm Password */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700', paddingLeft: '4px' }}>CONFIRM PASSWORD</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPass.confirm ? 'text' : 'password'} placeholder="Repeat new password" required
                        value={passForm.confirm} onChange={e => setPassForm({...passForm, confirm: e.target.value})}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px 46px 14px 14px', color: '#fff', outline: 'none', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                      />
                      <div onClick={() => setShowPass(s => ({...s, confirm: !s.confirm}))} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.5 }}>
                        {showPass.confirm ? <EyeOff size={16} color="#fff" /> : <Eye size={16} color="#fff" />}
                      </div>
                    </div>
                    {/* Match indicator */}
                    {passForm.confirm.length > 0 && (
                      <p style={{ fontSize: '11px', fontWeight: '700', margin: '2px 0 0', color: passForm.new === passForm.confirm ? '#22c55e' : '#ef4444' }}>
                        {passForm.new === passForm.confirm ? '✓ Passwords match' : '✗ Passwords do not match'}
                      </p>
                    )}
                  </div>
                  <button
                    disabled={loading}
                    type="submit"
                    style={{ background: 'var(--blue-text)', color: '#000', border: 'none', borderRadius: '16px', padding: '16px', fontWeight: '900', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}
                  >
                    {loading && <Loader2 size={18} className="spin" />} Update Password
                  </button>
              </form>
          </div>
        )}

        {/* Main Menu Options */}
        {!isChangingPass && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--bg-card)', borderRadius: '28px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
              {[
                { Icon: Users,           label: 'My Teams',             color: '#3498DB', action: () => router.push('/teams') },
                { Icon: Trophy,          label: 'Rank & Rewards',       color: '#F1C40F', action: () => setShowRankModal(true) },
                { Icon: History,         label: 'Transaction History',   color: '#2ECC71', action: () => router.push('/history') },
                { Icon: ImageIcon,       label: 'Deposit History',       color: '#9B59B6', action: () => router.push('/slips') },
                { Icon: UserPlus,        label: 'Edit Profile',          color: '#E67E22', action: () => setIsEditing(true) },
                { Icon: Lock,            label: 'Change Password',       color: '#3498DB', action: () => setIsChangingPass(true) },
                { Icon: ShieldCheck,     label: '2FA Security',         color: '#2ECC71', action: () => showToast('2FA coming soon!', 'info') },
                { Icon: MessageSquare,   label: 'Message Admin',         color: '#1ABC9C', action: () => router.push('/dashboard/messages') },
                { Icon: Headset,         label: 'Help & Support',       color: '#F39C12', action: handleSupport },
              ].map(({ Icon, label, color, action }, i, arr) => (
                <div 
                  key={label} 
                  onClick={action} 
                  className="clicky" 
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px', 
                    borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', 
                    cursor: 'pointer', transition: 'background 0.2s ease'
                  }}
                >
                  <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${color}20` }}>
                    <Icon size={20} color={color} />
                  </div>
                  <span style={{ flex: 1, color: 'var(--text-dark)', fontSize: '15px', fontWeight: '700' }}>{label}</span>
                  <ChevronRight size={18} color="var(--text-muted)" style={{ opacity: 0.5 }} />
                </div>
              ))}
            </div>

            {/* Logout Action (Visual variant) */}
            <div 
              onClick={() => setShowConfirmLogout(true)} 
              className="clicky" 
              style={{ 
                background: 'rgba(239,68,68,0.06)', borderRadius: '24px', border: '1.5px dashed rgba(239,68,68,0.25)', 
                padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer',
                marginTop: '8px'
              }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' }}>
                <LogOut size={20} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#EF4444', fontSize: '16px', fontWeight: '900' }}>Logout Account</div>
                <div style={{ color: 'rgba(239,68,68,0.6)', fontSize: '12px', fontWeight: '600' }}>Securely exit your account session</div>
              </div>
              <ChevronRight size={20} color="#EF4444" />
            </div>
          </div>
        )}

        {/* Confirmation Logout Modal */}
        {showConfirmLogout && (
          <div className="system-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(10px)' }}>
            <div className="system-modal" style={{ background: '#111', maxWidth: '320px', width: '90%', padding: '32px 24px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '24px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LogOut size={32} />
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: '900', color: '#fff', marginBottom: '8px' }}>Logout {firstName}?</h3>
              <p style={{ fontSize: '14px', fontWeight: '500', color: 'rgba(255,255,255,0.5)', lineHeight: '1.6', marginBottom: '32px' }}>Are you sure you want to end your session? You'll need to log in again.</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setShowConfirmLogout(false)} style={{ flex: 1, padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', fontWeight: '800', cursor: 'pointer', fontSize: '15px' }}>Stay</button>
                <button onClick={handleLogout} style={{ flex: 1, padding: '16px', borderRadius: '16px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: '800', cursor: 'pointer', fontSize: '15px', boxShadow: '0 8px 20px rgba(239, 68, 68, 0.4)' }}>Logout</button>
              </div>
            </div>
          </div>
        )}
        {/* Rank Modal call */}
        <RankModal 
          isOpen={showRankModal} 
          onClose={() => setShowRankModal(false)} 
          totalInvested={userProfile?.total_invested || 0}
          calculateRank={calculateRank}
        />
      </div>

      <style jsx>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .clicky:active { transform: scale(0.98); opacity: 0.8; }
        .clicky { transition: all 0.2s ease; }
      `}</style>
    </section>
  );
}

function RankModal({ isOpen, onClose, totalInvested, calculateRank }) {
  if (!isOpen) return null;
  const rank = calculateRank(totalInvested);
  const progress = rank.next ? (totalInvested / rank.nextMin) * 100 : 100;

  return (
    <div className="system-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ background: '#181520', width: '90%', maxWidth: '340px', borderRadius: '32px', border: '1px solid var(--border)', padding: '32px 24px', textAlign: 'center', position: 'relative' }}>
        <X size={20} color="var(--text-muted)" onClick={onClose} style={{ position: 'absolute', right: '20px', top: '20px', cursor: 'pointer' }} />
        
        <div style={{ width: '80px', height: '80px', background: `${rank.color}15`, borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: `1px solid ${rank.color}30` }}>
          <Trophy size={40} color={rank.color} />
        </div>
        
        <h3 style={{ fontSize: '24px', fontWeight: '900', color: '#fff', margin: '0 0 4px' }}>{rank.name} TIER</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '24px' }}>Total Invested: ${Number(totalInvested).toFixed(2)}</p>
        
        <div style={{ textAlign: 'left', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>PROGRESS TO {rank.next || 'MAX'}</span>
            <span style={{ fontSize: '11px', fontWeight: '900', color: rank.color }}>{progress.toFixed(0)}%</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: rank.color, transition: 'width 0.5s ease' }} />
          </div>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { name: 'BRONZE', min: '$0+' },
            { name: 'SILVER', min: '$50+' },
            { name: 'GOLD', min: '$200+' },
            { name: 'DIAMOND', min: '$500+' }
          ].map(r => (
            <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '14px', background: rank.name === r.name ? 'rgba(255,255,255,0.05)' : 'transparent', border: rank.name === r.name ? '1px solid var(--border)' : 'none' }}>
              <span style={{ color: rank.name === r.name ? '#fff' : 'var(--text-muted)', fontSize: '13px', fontWeight: '800' }}>{r.name}</span>
              <span style={{ color: rank.name === r.name ? 'var(--blue-text)' : 'var(--text-muted)', fontSize: '12px', fontWeight: '700' }}>{r.min}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
