'use client';
import React, { useState, useEffect } from 'react';
import { TrendingUp, Crown, Lock, CheckCircle2, ChevronLeft, Info, X } from 'lucide-react';
import TabHeader from '../TabHeader';
import { createClient } from '../../lib/supabase/client';

export default function EarnTab({ activePlans, userProfile, setNotifOpen, unreadCount, onAvatarClick, refreshData, showInternalHeader = true }) {
  const supabase = createClient();
  const [streak, setStreak] = useState(0);
  const [lastCheckin, setLastCheckin] = useState(null);
  const [isClaimedToday, setIsClaimedToday] = useState(false);
  const [totalEarnedFromStreaks, setTotalEarnedFromStreaks] = useState(0.00);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [history, setHistory] = useState([]);

  // Rewards for 7 days (USD)
  const rewards = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.50];

  const [timeLeft, setTimeLeft] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const fetchHistory = async () => {
    if (!userProfile?.id) return;
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userProfile.id)
      .eq('type', 'promo_bonus')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setHistory(data);
  };

  useEffect(() => {
    // Load checkin state from localStorage
    const savedStreak = localStorage.getItem('zc_streak') || 0;
    const savedLastCheckin = localStorage.getItem('zc_last_checkin');
    const savedTotal = localStorage.getItem('zc_streak_total') || 0;

    setStreak(parseInt(savedStreak));
    setLastCheckin(savedLastCheckin);
    setTotalEarnedFromStreaks(parseFloat(savedTotal));

    if (savedLastCheckin) {
      const lastDate = new Date(savedLastCheckin);
      const today = new Date();
      const diffHours = (today - lastDate) / (1000 * 60 * 60);

      if (diffHours < 24) {
        setIsClaimedToday(true);
      } else if (diffHours > 48) {
        setStreak(0);
        localStorage.setItem('zc_streak', 0);
        setIsClaimedToday(false);
      } else {
        setIsClaimedToday(false);
      }
    }
    fetchHistory();
  }, [userProfile]);

  // Timer logic for strict 24h reset
  useEffect(() => {
    if (!isClaimedToday || !lastCheckin) return;

    const timer = setInterval(() => {
      const lastDate = new Date(lastCheckin);
      const nextDate = new Date(lastDate.getTime() + 24 * 60 * 60 * 1000);
      const now = new Date();
      const diff = nextDate - now;

      if (diff <= 0) {
        setIsClaimedToday(false);
        setTimeLeft('');
        clearInterval(timer);
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isClaimedToday, lastCheckin]);

  const handleCheckin = async () => {
    if (isClaimedToday) return;

    const newStreak = streak + 1;
    const rewardIndex = (newStreak - 1) % 7;
    const reward = rewards[rewardIndex];
    const newTotal = totalEarnedFromStreaks + reward;

    const today = new Date();
    
    // Also log this in DB history
    await supabase.from('transactions').insert({
      user_id: userProfile.id,
      amount: reward,
      type: 'promo_bonus',
      status: 'completed',
      notes: `Day ${newStreak} Check-in`
    });

    setStreak(newStreak);
    setLastCheckin(today.toISOString());
    setIsClaimedToday(true);
    setTotalEarnedFromStreaks(newTotal);

    localStorage.setItem('zc_streak', newStreak);
    localStorage.setItem('zc_last_checkin', today.toISOString());
    localStorage.setItem('zc_streak_total', newTotal);

    showToast(`Success! You earned $${reward.toFixed(2)} for Day ${newStreak}`);
    fetchHistory();
  };

  const handleRedeem = async () => {
    if (totalEarnedFromStreaks <= 0) {
      showToast('No earnings to redeem yet!', 'error');
      return;
    }

    if (!userProfile?.id) return;

    try {
      const { error: txError } = await supabase.from('transactions').insert({
        user_id: userProfile.id,
        amount: totalEarnedFromStreaks,
        type: 'promo_bonus',
        status: 'completed',
        notes: 'Redeemed to Balance'
      });

      if (txError) throw txError;

      const { error: profileError } = await supabase.from('profiles')
        .update({ balance: Number(userProfile.balance || 0) + totalEarnedFromStreaks })
        .eq('id', userProfile.id);

      if (profileError) throw profileError;

      const redeemedAmount = totalEarnedFromStreaks;
      localStorage.setItem('zc_streak_total', 0);
      setTotalEarnedFromStreaks(0);
      showToast(`Successfully redeemed $${redeemedAmount.toFixed(2)} to balance!`);
      
      if (refreshData) refreshData();
      fetchHistory();
    } catch (err) {
      showToast('Redemption failed: ' + err.message, 'error');
    }
  };

  const totalEarnedOverall = activePlans.reduce((acc, p) => acc + Number(p.total_earned || 0), 0);
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  return (
    <section style={{ 
      minHeight: '100%', 
      background: 'linear-gradient(180deg, #1a1625 0%, #0d0b10 100%)', 
      paddingBottom: '120px', 
      color: '#fff',
      position: 'relative'
    }}>

      {/* Custom Toast Notification */}
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

      {/* Rules Modal Overlay */}
      {isRulesOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: '28px', border: '1px solid var(--border)',
            width: '100%', maxWidth: '380px', padding: '32px 24px', position: 'relative',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}>
             <button 
               onClick={() => setIsRulesOpen(false)}
               style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
             >
                <X size={18} />
             </button>

             <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Info size={24} color="#F39C12" /> Streak Rules
             </h2>

             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', maxHeight: '60vh', overflowY: 'auto' }}>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6' }}>
                  Welcome to EasyPay Daily Streaks! Claim rewards every day to build your streak.
                </p>

                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                   <div style={{ fontSize: '12px', fontWeight: '800', color: '#F39C12', marginBottom: '10px', textTransform: 'uppercase' }}>Reward Schedule</div>
                   {rewards.map((r, i) => (
                     <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Day {i + 1}</span>
                        <span style={{ fontWeight: '800', color: '#fff' }}>${r.toFixed(2)}</span>
                     </div>
                   ))}
                </div>

                <ul style={{ paddingLeft: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   <li>Check-in once every <strong>24 hours</strong>.</li>
                   <li>Missing a check-in for <strong>48 hours</strong> will reset your streak to Day 1.</li>
                   <li>Earned rewards can be <strong>redeemed</strong> to your main balance instantly!</li>
                   <li>Total rewards cycle every 7 days.</li>
                </ul>
             </div>

             <button 
               onClick={() => setIsRulesOpen(false)}
               style={{ width: '100%', marginTop: '24px', padding: '16px', borderRadius: '16px', background: '#F39C12', color: '#000', fontWeight: '900', border: 'none', fontSize: '15px' }}
             >
               GOT IT!
             </button>
          </div>
        </div>
      )}

      {showInternalHeader ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 20px 10px' }}>
           <TabHeader title="DAILY STREAKS" userProfile={userProfile} setNotifOpen={setNotifOpen} unreadCount={unreadCount} onAvatarClick={onAvatarClick} />
           <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '700', letterSpacing: '2px', marginTop: '-10px' }}>
              USER ID: {userProfile?.id?.substring(0, 8).toUpperCase() || '...'}
           </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', padding: '16px 20px', background: 'rgba(255,255,255,0.03)', gap: '4px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <ChevronLeft size={24} color="#fff" />
              <span style={{ fontWeight: '800', fontSize: '16px', letterSpacing: '0.5px' }}>Daily Streaks</span>
              <span onClick={() => setIsRulesOpen(true)} style={{ color: '#F39C12', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>Rules</span>
           </div>
           <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: '700', textAlign: 'center', letterSpacing: '1px' }}>
              USER ID: {userProfile?.id?.substring(0, 8).toUpperCase() || '...'}
           </span>
        </div>
      )}

      <div style={{ padding: '20px 20px', textAlign: 'center' }}>
        
        {/* Big Coin Visualization */}
        <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 15px' }}>
          <div style={{ 
            position: 'absolute', inset: 0, borderRadius: '50%', 
            background: 'radial-gradient(circle, rgba(243,156,18,0.4) 0%, transparent 70%)',
            animation: 'pulse 2s infinite'
          }} />
          <div style={{ 
            width: '100px', height: '100px', borderRadius: '50%', 
            background: 'linear-gradient(135deg, #FFD700 0%, #F39C12 100%)', 
            margin: '10px auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 25px rgba(243,156,18,0.4)',
            border: '5px solid rgba(255,255,255,0.2)',
            position: 'relative', zIndex: 1
          }}>
            <Crown size={50} color="#000" fill="#000" opacity={0.8} />
          </div>
        </div>

        <h3 style={{ color: 'rgba(255,255,255,0.7)', fontSize: '17px', fontWeight: '700', margin: '0 0 6px' }}>
          {streak} Day Streak
        </h3>
        <h1 style={{ fontSize: '30px', fontWeight: '900', margin: '0 0 16px', letterSpacing: '-0.5px' }}>
          ${totalEarnedFromStreaks.toFixed(2)} <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.4)' }}>Claimable</span>
        </h1>

        <button 
          onClick={handleRedeem}
          className="clicky"
          style={{ 
            background: 'transparent', border: '2px solid #F39C12', borderRadius: '30px', 
            padding: '8px 36px', color: '#F39C12', fontWeight: '800', fontSize: '14px' 
          }}
        >
          Redeem
        </button>

        <p style={{ color: 'rgba(239,68,68,0.6)', fontSize: '12px', fontWeight: '700', marginTop: '20px' }}>
          Expires on {expiryDate.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' })}
        </p>

        <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.06)', margin: '25px 0' }} />

        {/* Daily Track Cards */}
        <div style={{ 
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '30px'
        }}>
          {rewards.map((reward, i) => {
            const dayNum = i + 1;
            const status = i < streak ? 'completed' : (i === streak && !isClaimedToday ? 'active' : 'locked');

            return (
              <div 
                key={i} 
                style={{ 
                  background: status === 'active' ? 'rgba(243,156,18,0.2)' : 'rgba(255,255,255,0.02)',
                  border: status === 'active' ? '1px solid #F39C12' : '1px dashed rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  padding: '12px 6px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  position: 'relative', opacity: status === 'locked' ? 0.5 : 1
                }}
              >
                <span style={{ fontSize: '10px', fontWeight: '800', color: status === 'active' ? '#F39C12' : 'rgba(255,255,255,0.8)' }}>
                  ${reward.toFixed(2)}
                </span>
                <div style={{ 
                  width: '30px', height: '30px', borderRadius: '50%', 
                  background: status === 'completed' ? '#22c55e' : 'linear-gradient(135deg, #FFD700 0%, #F39C12 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                   {status === 'completed' ? <CheckCircle2 size={16} color="#000" /> : <Crown size={14} color="#000" fill="#000" opacity={0.6} />}
                </div>
                <span style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.4)' }}>
                  Day {dayNum}
                </span>
              </div>
            );
          })}
        </div>

        {/* Big Checkin Button */}
        <button 
          onClick={handleCheckin}
          disabled={isClaimedToday}
          className="clicky"
          style={{ 
            width: '100%', padding: '18px', borderRadius: '100px', border: 'none', 
            background: isClaimedToday ? 'rgba(255,255,255,0.05)' : '#cbd51e', 
            color: isClaimedToday ? 'rgba(255,255,255,0.2)' : '#000', 
            fontWeight: '900', fontSize: '17px', cursor: isClaimedToday ? 'not-allowed' : 'pointer',
            boxShadow: isClaimedToday ? 'none' : '0 8px 25px rgba(203,213,30,0.2)'
          }}
        >
          {isClaimedToday ? (timeLeft ? `Next Reward in ${timeLeft}` : 'Claimed Today ✓') : 'Check-in'}
        </button>

        {/* History Section */}
        <div style={{ marginTop: '40px', textAlign: 'left' }}>
           <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px', marginBottom: '15px' }}>RECENT HISTORY</h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {history.length > 0 ? history.map((tx, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: '#fff' }}>{tx.notes}</span>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>{new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                   </div>
                   <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '15px', fontWeight: '900', color: tx.notes.includes('Redeemed') ? '#EF4444' : '#22c55e' }}>
                         {tx.notes.includes('Redeemed') ? '-' : '+'}${Number(tx.amount).toFixed(2)}
                      </span>
                   </div>
                </div>
              )) : (
                <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '13px', fontWeight: '600', border: '1.5px dashed rgba(255,255,255,0.05)', borderRadius: '20px' }}>
                   No history yet. Start your streak!
                </div>
              )}
           </div>
        </div>

      </div>

      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.1); opacity: 0.1; }
          100% { transform: scale(1); opacity: 0.4; }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </section>
  );
}
