'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

export default function AdminDashboardOverview() {
  const router = useRouter();
  const supabase = createClient();
  const [stats, setStats] = useState({ totalUsers: 0, totalDeposits: 0, totalWithdrawals: 0, pendingCount: 0, activeUsers: 0 });
  const [recentTx, setRecentTx] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    // Fetch stats using bracket notation to bypass IDE property checks on Postgrest response
    const userRes = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const activeRes = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user');
    
    const txRes = await supabase
      .from('transactions')
      .select('id, amount, type, status, created_at, profiles(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(200);

    const txs = txRes.data || [];
    const approvedDeposits = txs.filter(t => t.type === 'deposit' && t.status === 'approved').reduce((s, t) => s + Number(t.amount || 0), 0);
    const approvedWithdrawals = txs.filter(t => (t.type === 'withdrawal' || t.type === 'withdraw') && t.status === 'approved').reduce((s, t) => s + Number(t.amount || 0), 0);
    const pendingCount = txs.filter(t => t.status === 'pending').length;

    setStats({ 
      totalUsers: userRes['count'] || 0, 
      totalDeposits: approvedDeposits, 
      totalWithdrawals: approvedWithdrawals, 
      pendingCount, 
      activeUsers: activeRes['count'] || 0 
    });
    setRecentTx(txs.slice(0, 12));
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  const TYPE_COLOR = { deposit: 'green', withdrawal: 'red', ROI: 'blue', bonus: 'purple', roi_earning: 'blue', referral_bonus: 'purple' };
  const TYPE_LABEL = { deposit: '↓ Deposit', withdrawal: '↑ Withdrawal', ROI: '⟳ ROI', bonus: '★ Bonus' };
  const STATUS_BADGE = { approved: 'green', pending: 'yellow', rejected: 'red', completed: 'green' };

  if (loading) return (
    <div className="admin-spinner-wrap"><div className="admin-spinner" /><span className="admin-spinner-text">Loading dashboard…</span></div>
  );

  return (
    <div>
      {/* Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">Command Center</h1>
          <p className="admin-page-subtitle">Real-time overview of platform activity and key metrics.</p>
        </div>
        <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={fetchStats}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card clickable-card" 
          onClick={() => router.push('/admin/users')}
          style={{ borderColor: 'rgba(79,142,247,0.2)', cursor: 'pointer' }}>
          <div className="admin-stat-label">Total Users</div>
          <div className="admin-stat-value">{stats.totalUsers.toLocaleString()}</div>
          <div style={{ fontSize: '11px', color: 'var(--amuted)', fontWeight: 600 }}>{stats.activeUsers} active</div>
          <div className="admin-stat-icon" style={{ background: 'var(--ablue-dim)', color: 'var(--ablue)' }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        <div className="admin-stat-card clickable-card" 
          onClick={() => router.push('/admin/deposits')}
          style={{ borderColor: 'rgba(34,197,94,0.2)', cursor: 'pointer' }}>
          <div className="admin-stat-label">Approved Deposits</div>
          <div className="admin-stat-value" style={{ color: 'var(--agreen)' }}>${stats.totalDeposits.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
          <div style={{ fontSize: '11px', color: 'var(--amuted)', fontWeight: 600 }}>Lifetime total</div>
          <div className="admin-stat-icon" style={{ background: 'var(--agreen-dim)', color: 'var(--agreen)' }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
            </svg>
          </div>
        </div>

        <div className="admin-stat-card clickable-card" 
          onClick={() => router.push('/admin/withdrawals')}
          style={{ borderColor: 'rgba(239,68,68,0.2)', cursor: 'pointer' }}>
          <div className="admin-stat-label">Paid Withdrawals</div>
          <div className="admin-stat-value" style={{ color: 'var(--ared)' }}>${stats.totalWithdrawals.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
          <div style={{ fontSize: '11px', color: 'var(--amuted)', fontWeight: 600 }}>Lifetime total</div>
          <div className="admin-stat-icon" style={{ background: 'var(--ared-dim)', color: 'var(--ared)' }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <div className="admin-stat-card clickable-card" 
          onClick={() => router.push('/admin/transactions')}
          style={{ borderColor: 'rgba(245,158,11,0.2)', cursor: 'pointer' }}>
          <div className="admin-stat-label">Pending Actions</div>
          <div className="admin-stat-value" style={{ color: stats.pendingCount > 0 ? 'var(--ayellow)' : 'var(--atext)' }}>{stats.pendingCount}</div>
          <div style={{ fontSize: '11px', color: 'var(--amuted)', fontWeight: 600 }}>Require review</div>
          <div className="admin-stat-icon" style={{ background: 'var(--ayellow-dim)', color: 'var(--ayellow)' }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h3 className="admin-card-title">Recent Activity</h3>
          <span className="admin-badge admin-badge-muted">{recentTx.length} records</span>
        </div>
        <div className="admin-table-wrap" style={{ border: 'none', borderRadius: 0 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentTx.length === 0 ? (
                <tr className="admin-table-empty-row"><td colSpan="5">No recent transactions.</td></tr>
              ) : recentTx.map(tx => {
                const col = TYPE_COLOR[tx.type] || 'blue';
                const isCredit = tx.type === 'deposit' || tx.type?.includes('bonus') || tx.type === 'roi_earning';
                return (
                  <tr key={tx.id}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-avatar" style={{ width: 30, height: 30, padding: '4px' }}>
                           <img src="/logo.png" alt="Z" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                        <div className="admin-user-cell-info">
                          <div className="admin-cell-name">{tx.profiles?.full_name || 'Unknown'}</div>
                          <div className="admin-cell-sub">{tx.profiles?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`admin-badge admin-badge-${col}`}>{TYPE_LABEL[tx.type] || tx.type}</span>
                    </td>
                    <td>
                      <span className={isCredit ? 'admin-amount-pos' : 'admin-amount-neg'}>
                        {isCredit ? '+' : '-'}${Number(tx.amount || 0).toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge admin-badge-${STATUS_BADGE[tx.status] || 'muted'}`}>{tx.status}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="admin-cell-name">{new Date(tx.created_at).toLocaleDateString()}</div>
                      <div className="admin-cell-sub">{new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
