'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Download, Upload, Shield, Gift, Swords, ArrowUpRight, Info, Users, Megaphone, History, Rocket, Ticket, Zap } from 'lucide-react';
import TabHeader from '../TabHeader';
import { createClient } from '../../lib/supabase/client';

export default function HomeTab({ balance, activePlans, userProfile, setNotifOpen, unreadCount, onAvatarClick, showInternalHeader = true }) {
  const supabase = createClient();
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  
  const dailyUsd    = activePlans.reduce((s, p) => s + (Number(p.amount_invested || 0) * Number(p.plans?.daily_roi_percent || 0) / 100), 0);
  const totalEarned = activePlans.reduce((s, p) => s + Number(p.total_earned || 0), 0);

  useEffect(() => {
    const fetchRecent = async () => {
      if (!userProfile?.id) return;
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false })
        .limit(3);
      if (data) setRecentTransactions(data);
    };

    const fetchAnnouncements = async () => {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
      if (data) setAnnouncements(data);
    };

    fetchRecent();
    fetchAnnouncements();

    const annChannel = supabase
      .channel('public_announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
         supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(3)
           .then(({ data }) => { if (data) setAnnouncements(data); });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(annChannel);
    };
  }, [userProfile?.id, supabase]);

  return (
    <section style={{ minHeight: '100%', background: 'var(--bg-light)', paddingBottom: '100px' }}>

      {showInternalHeader && (
          <TabHeader title="DASHBOARD" userProfile={userProfile} setNotifOpen={setNotifOpen} unreadCount={unreadCount} onAvatarClick={onAvatarClick} />
      )}

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Balance Card */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)', padding: '28px 20px', boxShadow: 'var(--shadow)', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '700', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '8px' }}>TOTAL BALANCE</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '24px', justifyContent: 'center' }}>
            <h1 style={{ color: 'var(--text-dark)', fontSize: '42px', fontWeight: '800', letterSpacing: '-1.5px', margin: 0 }}>${balance.toFixed(2)}</h1>
            <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600' }}>/ Rs. {(balance * 280).toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', gap: '0', justifyContent: 'center', borderTop: '1px solid var(--border)', paddingTop: '18px' }}>
            <div style={{ flex: 1, borderRight: '1px solid var(--border)', paddingRight: '16px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: '700', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '4px' }}>DAILY</div>
              <div style={{ color: 'var(--green-text)', fontSize: '18px', fontWeight: '800' }}>+${dailyUsd.toFixed(2)}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>Rs. {(dailyUsd * 280).toFixed(0)}</div>
            </div>
            <div style={{ flex: 1, paddingLeft: '16px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: '700', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '4px' }}>TOTAL EARNED</div>
              <div style={{ color: 'var(--green-text)', fontSize: '18px', fontWeight: '800' }}>+${totalEarned.toFixed(2)}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>Rs. {(totalEarned * 280).toFixed(0)}</div>
            </div>
          </div>
        </div>

        {/* Action Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${userProfile && ['admin', 'ADMIN', 'SUPERADMIN'].includes(userProfile.role) ? 4 : 3}, 1fr)`, gap: '10px' }}>
          {[
            { href: '/deposit',  Icon: Download, bg: '#F39C12', label: 'Deposit'  },
            { href: '/withdraw', Icon: Upload,   bg: '#22c55e', label: 'Withdraw' },
            { href: '/earn',     Icon: Gift,     bg: '#F5B041', label: 'Promo'    },
            { href: '/admin',    Icon: Shield,   bg: '#F39C12', label: 'Admin', adminOnly: true },
          ].filter(item => !item.adminOnly || (userProfile && ['admin', 'ADMIN', 'SUPERADMIN'].includes(userProfile.role))).map(({ href, Icon, bg, label }) => (
            <Link key={label} href={href} style={{ textDecoration: 'none' }}>
              <div className="clicky" style={{ background: 'var(--bg-card)', borderRadius: '18px', border: '1px solid var(--border)', padding: '14px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: bg, width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color="#000" strokeWidth={2.5} />
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '700' }}>{label}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Weekly Battle */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid rgba(192,57,43,0.3)', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#C0392B', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Swords size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'var(--text-dark)', fontSize: '14px', fontWeight: '800', marginBottom: '2px' }}>Weekly Battle</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600' }}>23 Mar — 29 Mar</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#EF4444', fontSize: '11px', fontWeight: '900', background: 'rgba(239,68,68,0.1)', padding: '4px 10px', borderRadius: '20px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444', animation: 'fadeIn 1s infinite alternate' }} />LIVE
          </div>
        </div>

        {/* ACTIVE PLANS */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 4px' }}>
            <span style={{ color: 'var(--text-dark)', fontSize: '12px', fontWeight: '900', letterSpacing: '1px' }}>ACTIVE PLANS</span>
            <Link href="/invest" style={{ color: 'var(--blue-text)', fontSize: '12px', fontWeight: '800', textDecoration: 'none' }}>View All</Link>
          </div>
          <div style={{ background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border)', padding: activePlans.length === 0 ? '32px 16px' : '8px 16px', textAlign: 'center' }}>
            {activePlans.length === 0
              ? <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600' }}>No active plans yet</span>
              : activePlans.map((up, i) => {
                  const daily = (Number(up.amount_invested) * Number(up.plans?.daily_roi_percent || 0) / 100);
                  return (
                    <div key={up.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < activePlans.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ color: 'var(--text-dark)', fontSize: '14px', fontWeight: '800' }}>{up.plans?.name || 'Plan'}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px', fontWeight: '600' }}>Since {new Date(up.start_date).toLocaleDateString()}</div>
                      </div>
                      <span style={{ color: 'var(--green-text)', fontSize: '14px', fontWeight: '900' }}>+${daily.toFixed(2)} / d</span>
                    </div>
                  );
                })
            }
          </div>
        </div>

        {/* TEAM & REFERRAL */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 4px' }}>
            <span style={{ color: 'var(--text-dark)', fontSize: '12px', fontWeight: '900', letterSpacing: '1px' }}>TEAM & REFERRAL</span>
          </div>
          <div className="clicky" style={{ background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border)', padding: '32px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
             <Users size={32} color="var(--text-muted)" opacity={0.3} />
             <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600' }}>Invite friends to build your team</span>
          </div>
        </div>

        {/* ANNOUNCEMENTS */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '0 4px' }}>
            <Megaphone size={14} color="var(--blue-text)" />
            <span style={{ color: 'var(--text-dark)', fontSize: '12px', fontWeight: '900', letterSpacing: '1px' }}>ANNOUNCEMENTS</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
             {announcements.length === 0 ? (
                <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px 16px', textAlign: 'center' }}>
                   <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>No new announcements this week.</span>
                </div>
             ) : announcements.map((ann, i) => {
                const colors = { alert: '#ef4444', info: '#3b82f6', update: '#eab308' };
                return (
                  <div key={ann.id || i} style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Megaphone size={18} color={colors[ann.type] || '#3b82f6'} />
                    <span style={{ color: 'var(--text-dark)', fontSize: '13px', fontWeight: '700' }}>{ann.text}</span>
                  </div>
                );
             })}
          </div>
        </div>

        {/* RECENT TRANSACTIONS */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 4px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={14} color="var(--text-muted)" />
                <span style={{ color: 'var(--text-dark)', fontSize: '12px', fontWeight: '900', letterSpacing: '1px' }}>RECENT</span>
             </div>
             <Link href="/profile" style={{ color: 'var(--blue-text)', fontSize: '12px', fontWeight: '800', textDecoration: 'none' }}>History</Link>
          </div>
          <div style={{ background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border)', padding: recentTransactions.length === 0 ? '32px 16px' : '8px 16px', textAlign: 'center' }}>
            {recentTransactions.length === 0
              ? <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600' }}>No recent activity</span>
              : recentTransactions.map((tx, i) => (
                  <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < recentTransactions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ color: 'var(--text-dark)', fontSize: '13px', fontWeight: '800' }}>{tx.type === 'deposit' ? 'Deposit' : 'Withdrawal'}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px', fontWeight: '600' }}>{new Date(tx.created_at).toLocaleDateString()}</div>
                    </div>
                    <span style={{ color: tx.type === 'deposit' ? 'var(--green-text)' : '#ef4444', fontSize: '14px', fontWeight: '900' }}>
                      {tx.type === 'deposit' ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                    </span>
                  </div>
                ))
            }
        </div>
      </div>
    </div>
    </section>
  );
}
