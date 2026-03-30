'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';
import * as XLSX from 'xlsx';

export default function AdminWithdrawalsPage() {
  const supabase = createClient();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [detailModal, setDetailModal] = useState(null);

  const showAction = (msg, type = 'success') => {
    setActionMsg({ text: msg, type });
    setTimeout(() => setActionMsg(''), 3500);
  };

  const fetchWithdrawals = async () => {
    setLoading(true);
    const { data: txs } = await supabase
      .from('transactions')
      .select('*, profiles(full_name, email)')
      .eq('type', 'withdrawal')
      .order('created_at', { ascending: false });
    if (txs) setWithdrawals(txs);
    setLoading(false);
  };

  useEffect(() => { fetchWithdrawals(); }, []);

  const handleAction = async (id, action, userId, amount) => {
    if (action === 'rejected') {
      const { data: profile } = await supabase.from('profiles').select('balance').eq('id', userId).single();
      if (profile) await supabase.from('profiles').update({ balance: (profile.balance || 0) + Number(amount) }).eq('id', userId);
    }
    const { error } = await supabase.from('transactions').update({ status: action }).eq('id', id);
    if (error) { showAction('Error: ' + error.message, 'error'); return; }
    setWithdrawals(prev => prev.map(t => t.id === id ? { ...t, status: action } : t));
    showAction(action === 'approved' ? 'Withdrawal marked as PAID.' : 'Withdrawal cancelled & balance refunded.');
    if (detailModal?.id === id) setDetailModal(prev => ({ ...prev, status: action }));
  };

  const handleExportCSV = () => {
    const headers = ['User', 'Email', 'Amount', 'Status', 'Date', 'Wallet Details'];
    const rows = withdrawals.map(w => [
      w.profiles?.full_name || 'Unknown',
      w.profiles?.email || 'N/A',
      w.amount,
      w.status,
      new Date(w.created_at).toLocaleString(),
      (w.notes || '').replace(/\n/g, " ")
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `EasyPay_Withdrawals_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportXLSX = () => {
    const rows = withdrawals.map(w => ({
      User: w.profiles?.full_name || 'Unknown',
      Email: w.profiles?.email || 'N/A',
      Amount: w.amount,
      Status: w.status,
      Date: new Date(w.created_at).toLocaleString(),
      WalletDetails: (w.notes || '').replace(/\n/g, ' '),
      RequestNumber: w.request_number || 'N/A'
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Withdrawals');
    XLSX.writeFile(workbook, `EasyPay_Withdrawals_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const STATUS_BADGE = { approved: 'green', pending: 'yellow', rejected: 'red' };
  const filtered = filterStatus === 'ALL' ? withdrawals : withdrawals.filter(w => w.status === filterStatus);
  const pending = withdrawals.filter(w => w.status === 'pending');
  const pendingTotal = pending.reduce((s, w) => s + Number(w.amount), 0);
  const paidTotal = withdrawals.filter(w => w.status === 'approved').reduce((s, w) => s + Number(w.amount), 0);

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">Withdrawal Requests</h1>
          <p className="admin-page-subtitle">Process and payout user withdrawal requests.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleExportCSV} className="admin-btn admin-btn-primary">
            Export CSV
          </button>
          <button onClick={handleExportXLSX} className="admin-btn admin-btn-secondary">
            Export XLSX
          </button>
          <button onClick={fetchWithdrawals} className="admin-btn admin-btn-secondary">
            Refresh List
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
        <div className="admin-stat-card" style={{ padding: '16px 18px' }}>
          <div className="admin-stat-label">Pending</div>
          <div className="admin-stat-value" style={{ fontSize: '22px', color: pending.length > 0 ? 'var(--ayellow)' : 'var(--atext)' }}>{pending.length}</div>
          <div style={{ fontSize: '11px', color: 'var(--amuted)', fontWeight: 600 }}>Total: ${pendingTotal.toFixed(2)}</div>
        </div>
        <div className="admin-stat-card" style={{ padding: '16px 18px' }}>
          <div className="admin-stat-label">Paid Out</div>
          <div className="admin-stat-value" style={{ fontSize: '22px', color: 'var(--agreen)' }}>${paidTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
        </div>
        <div className="admin-stat-card" style={{ padding: '16px 18px' }}>
          <div className="admin-stat-label">Total Requests</div>
          <div className="admin-stat-value" style={{ fontSize: '22px' }}>{withdrawals.length}</div>
        </div>
      </div>

      {actionMsg && (
        <div className={`admin-alert admin-alert-${actionMsg.type === 'error' ? 'error' : 'success'}`}>{actionMsg.text}</div>
      )}

      {/* Filter Tabs */}
      <div style={{ marginBottom: '20px' }}>
        <div className="admin-tabs">
          {['ALL', 'pending', 'approved', 'rejected'].map(s => (
            <button key={s} className={`admin-tab${filterStatus === s ? ' active' : ''}`} onClick={() => setFilterStatus(s)}>
              {s === 'ALL' ? `All (${withdrawals.length})` : `${s === 'approved' ? 'Paid' : s.charAt(0).toUpperCase() + s.slice(1)} (${withdrawals.filter(w => w.status === s).length})`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="admin-spinner-wrap"><div className="admin-spinner" /></div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th>Wallet Details</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr className="admin-table-empty-row"><td colSpan="6">No withdrawals found.</td></tr>
              ) : filtered.map(tx => (
                <tr key={tx.id}>
                  <td>
                    <div className="admin-user-cell">
                      <div className="admin-avatar">{(tx.profiles?.full_name || 'U').charAt(0).toUpperCase()}</div>
                      <div>
                        <div className="admin-cell-name">{tx.profiles?.full_name || 'Unknown'}</div>
                        <div className="admin-cell-sub">{tx.profiles?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="admin-amount-neg">-${Number(tx.amount).toFixed(2)}</span></td>
                  <td>
                    <div className="admin-cell-name">{new Date(tx.created_at).toLocaleDateString()}</div>
                    <div className="admin-cell-sub">{new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td>
                    <span className={`admin-badge admin-badge-${STATUS_BADGE[tx.status] || 'muted'}`}>
                      {tx.status === 'approved' ? 'PAID' : tx.status}
                    </span>
                  </td>
                  <td>
                    <button className="admin-btn admin-btn-secondary admin-btn-sm"
                      onClick={() => setDetailModal(tx)}>
                      View Details
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {tx.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="admin-btn admin-btn-primary admin-btn-sm"
                          onClick={() => handleAction(tx.id, 'approved', tx.user_id, tx.amount)}>
                          Mark Paid
                        </button>
                        <button className="admin-btn admin-btn-danger-outline admin-btn-sm"
                          onClick={() => handleAction(tx.id, 'rejected', tx.user_id, tx.amount)}>
                          Refund
                        </button>
                      </div>
                    ) : (
                      <span className="admin-badge admin-badge-muted">
                        {tx.status === 'approved' ? 'Completed' : 'Refunded'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {detailModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{ maxWidth: '480px' }}>
            <button className="admin-modal-close" onClick={() => setDetailModal(null)}>✕</button>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Withdrawal Details</h3>
              <p className="admin-modal-sub">{detailModal.profiles?.full_name} — <span className="admin-amount-neg">${Number(detailModal.amount).toFixed(2)}</span></p>
            </div>

            <div style={{ background: 'var(--as2)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', border: '1px solid var(--aborder)' }}>
              <div style={{ fontSize: '11px', color: 'var(--amuted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Wallet / Payment Details</div>
              <pre style={{ color: 'var(--atext)', fontSize: '13px', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'monospace', lineHeight: '1.6' }}>
                {detailModal.notes || 'No payment details provided.'}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div className="admin-cell-sub">Status</div>
                <span className={`admin-badge admin-badge-${STATUS_BADGE[detailModal.status] || 'muted'}`} style={{ marginTop: '4px', display: 'inline-flex' }}>
                  {detailModal.status === 'approved' ? 'PAID' : detailModal.status}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="admin-cell-sub">Requested</div>
                <div className="admin-cell-name" style={{ marginTop: '4px' }}>{new Date(detailModal.created_at).toLocaleString()}</div>
              </div>
            </div>

            {detailModal.status === 'pending' && (
              <div className="admin-modal-actions">
                <button className="admin-btn admin-btn-primary" style={{ flex: 1 }}
                  onClick={() => handleAction(detailModal.id, 'approved', detailModal.user_id, detailModal.amount)}>
                  Mark as Paid
                </button>
                <button className="admin-btn admin-btn-danger-outline" style={{ flex: 1 }}
                  onClick={() => handleAction(detailModal.id, 'rejected', detailModal.user_id, detailModal.amount)}>
                  Cancel & Refund
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
