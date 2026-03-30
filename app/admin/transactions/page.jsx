'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';

export default function AdminTransactionsPage() {
  const supabase = createClient();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchUser, setSearchUser] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const fetchTransactions = async () => {
    setLoading(true);
    const { data: txs } = await supabase
      .from('transactions')
      .select('*, profiles(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(500);
    if (txs) setTransactions(txs);
    setLoading(false);
  };

  useEffect(() => { fetchTransactions(); }, []);

  const downloadCSV = () => {
    const headers = ['ID', 'User Email', 'User Name', 'Type', 'Amount', 'Status', 'Request Number', 'Screenshot URL', 'Date'];
    const rows = filteredTxs.map(tx => [
      tx.id, tx.profiles?.email || '', tx.profiles?.full_name || '',
      tx.type, tx.amount, tx.status, tx.request_number || '', tx.screenshot_url || tx.proof_url || '', new Date(tx.created_at).toISOString(),
    ]);
    const csv = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `easypay_tx_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const filteredTxs = transactions.filter(tx => {
    const matchUser = (tx.profiles?.email || '').toLowerCase().includes(searchUser.toLowerCase()) ||
      (tx.profiles?.full_name || '').toLowerCase().includes(searchUser.toLowerCase());
    const matchType = filterType === 'ALL' || tx.type === filterType;
    const matchStatus = filterStatus === 'ALL' || tx.status === filterStatus;
    return matchUser && matchType && matchStatus;
  });

  const TYPE_BADGE = {
    deposit: 'green', withdrawal: 'red',
    roi_earning: 'blue', referral_bonus: 'purple', promo_bonus: 'purple',
  };
  const TYPE_LABEL = {
    deposit: 'Deposit', withdrawal: 'Withdrawal',
    roi_earning: 'ROI', referral_bonus: 'Referral', promo_bonus: 'Promo',
  };
  const STATUS_BADGE = { approved: 'green', pending: 'yellow', rejected: 'red', completed: 'green' };

  const isCredit = (type) => type === 'deposit' || type?.includes('bonus') || type === 'roi_earning';

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">Master Ledger</h1>
          <p className="admin-page-subtitle">Global record of all platform transactions — {transactions.length} total.</p>
        </div>
        <div className="admin-page-header-right">
          <button className="admin-btn admin-btn-primary" onClick={downloadCSV}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Export CSV
          </button>
          <button className="admin-btn admin-btn-secondary" onClick={fetchTransactions}>Refresh</button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <input className="admin-input" type="text" placeholder="Search user…"
          value={searchUser} onChange={e => setSearchUser(e.target.value)}
          style={{ maxWidth: '240px' }}
        />
        <select className="admin-input" value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ maxWidth: '170px' }}>
          <option value="ALL">All Types</option>
          <option value="deposit">Deposit</option>
          <option value="withdrawal">Withdrawal</option>
          <option value="roi_earning">ROI Earning</option>
          <option value="promo_bonus">Promo Bonus</option>
          <option value="referral_bonus">Referral Bonus</option>
        </select>
        <select className="admin-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ maxWidth: '170px' }}>
          <option value="ALL">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
        </select>
        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--amuted)', fontWeight: 600 }}>
          {filteredTxs.length} record{filteredTxs.length !== 1 ? 's' : ''}
        </div>
      </div>

      {loading ? (
        <div className="admin-spinner-wrap"><div className="admin-spinner" /></div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Request #</th>
                <th>Proof</th>
                <th style={{ textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTxs.length === 0 ? (
                <tr className="admin-table-empty-row"><td colSpan="7">No transactions match your filters.</td></tr>
              ) : filteredTxs.map(tx => (
                <tr key={tx.id}>
                  <td>
                    <div className="admin-cell-name">{new Date(tx.created_at).toLocaleDateString()}</div>
                    <div className="admin-cell-sub">{new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td>
                    <div className="admin-user-cell">
                      <div className="admin-avatar" style={{ width: 28, height: 28, fontSize: 10 }}>
                        {(tx.profiles?.full_name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="admin-cell-name">{tx.profiles?.full_name || 'Unknown'}</div>
                        <div className="admin-cell-sub">{tx.profiles?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`admin-badge admin-badge-${TYPE_BADGE[tx.type] || 'muted'}`}>
                      {TYPE_LABEL[tx.type] || tx.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span className={isCredit(tx.type) ? 'admin-amount-pos' : 'admin-amount-neg'}>
                      {isCredit(tx.type) ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                    </span>
                  </td>
                  <td>
                    <span className="admin-badge admin-badge-muted">{tx.request_number || '—'}</span>
                  </td>
                  <td>
                    {(tx.screenshot_url || tx.proof_url) ? (
                      <a href={tx.screenshot_url || tx.proof_url} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-secondary admin-btn-sm">
                        View
                      </a>
                    ) : (
                      <span style={{ color: 'var(--amuted)', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={`admin-badge admin-badge-${STATUS_BADGE[tx.status] || 'muted'}`}>{tx.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
