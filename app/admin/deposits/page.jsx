'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';
import * as XLSX from 'xlsx';

export default function AdminDepositsPage() {
  const supabase = createClient();
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [proofModal, setProofModal] = useState(null);

  const showAction = (msg, type = 'success') => {
    setActionMsg({ text: msg, type });
    setTimeout(() => setActionMsg(''), 3500);
  };

  const fetchDeposits = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const { data: txs, error } = await supabase
      .from('transactions')
      .select('*, profiles(full_name, email)')
      .eq('type', 'deposit')
      .order('created_at', { ascending: false })
      .limit(10000);
    if (error) console.error("Error fetching deposits:", error);
    if (txs) setDeposits(txs);
    if (showLoader) setLoading(false);
  };

  useEffect(() => { 
    fetchDeposits(); 

    const channel = supabase
      .channel('realtime_deposits')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: "type=eq.deposit" }, (payload) => {
         fetchDeposits(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAction = async (id, action, userId, amount) => {
    const { error } = await supabase.from('transactions').update({ status: action }).eq('id', id);
    if (error) { showAction('Error: ' + error.message, 'error'); return; }
    if (action === 'approved') {
      const { data: profile } = await supabase.from('profiles').select('balance').eq('id', userId).single();
      if (profile) await supabase.from('profiles').update({ balance: (profile.balance || 0) + Number(amount) }).eq('id', userId);
    }
    setDeposits(prev => prev.map(t => t.id === id ? { ...t, status: action } : t));
    showAction(`Deposit ${action} successfully.`);
  };

  const extractProofUrl = (notes, directUrl) => {
    if (directUrl) return directUrl;
    if (!notes) return null;
    const match = notes.match(/Payment proof: (http[^\s|]+)/);
    return match ? match[1] : null;
  };

  const extractMethod = (notes) => {
    if (!notes) return 'Unknown';
    const match = notes.match(/Method: ([^|]+)/);
    return match ? match[1].trim() : 'Unknown';
  };

  const extractRequestNumber = (requestNumber, notes) => {
    if (requestNumber) return requestNumber;
    if (!notes) return null;
    const txMatch = notes.match(/TX:\s*([^|]+)/i);
    if (txMatch) return txMatch[1].trim();
    const reqMatch = notes.match(/Request Number:\s*([^|]+)/i);
    return reqMatch ? reqMatch[1].trim() : null;
  };

  const handleExportCSV = () => {
    const headers = ['User', 'Email', 'Amount', 'Method', 'Request Number', 'Status', 'Date'];
    const rows = deposits.map(d => [
      d.profiles?.full_name || 'Unknown',
      d.profiles?.email || 'N/A',
      d.amount,
      extractMethod(d.notes),
      extractRequestNumber(d.request_number, d.notes) || 'N/A',
      d.status,
      new Date(d.created_at).toLocaleString()
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `EasyPay_Deposits_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportXLSX = () => {
    const rows = deposits.map(d => ({
      User: d.profiles?.full_name || 'Unknown',
      Email: d.profiles?.email || 'N/A',
      Amount: d.amount,
      Method: extractMethod(d.notes),
      RequestNumber: extractRequestNumber(d.request_number, d.notes) || 'N/A',
      Status: d.status,
      Date: new Date(d.created_at).toLocaleString(),
      ScreenshotURL: d.screenshot_url || d.proof_url || ''
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Deposits');
    XLSX.writeFile(workbook, `EasyPay_Deposits_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const STATUS_BADGE = { approved: 'green', pending: 'yellow', rejected: 'red' };

  const filtered = filterStatus === 'ALL' ? deposits : deposits.filter(d => d.status === filterStatus);

  const pending = deposits.filter(d => d.status === 'pending');
  const pendingTotal = pending.reduce((s, d) => s + Number(d.amount), 0);
  const approvedTotal = deposits.filter(d => d.status === 'approved').reduce((s, d) => s + Number(d.amount), 0);

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">Deposit Management</h1>
          <p className="admin-page-subtitle">Review and approve user deposit requests with payment proofs.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleExportCSV} className="admin-btn admin-btn-primary">
              Export CSV
            </button>
            <button onClick={handleExportXLSX} className="admin-btn admin-btn-secondary">
              Export XLSX
            </button>
            <button onClick={() => fetchDeposits(true)} className="admin-btn admin-btn-secondary">
              Refresh List
            </button>
        </div>
      </div>

      {/* Summary */}
      <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
        <div className="admin-stat-card" style={{ padding: '16px 18px' }}>
          <div className="admin-stat-label">Pending Deposits</div>
          <div className="admin-stat-value" style={{ fontSize: '22px', color: 'var(--ayellow)' }}>{pending.length}</div>
          <div style={{ fontSize: '11px', color: 'var(--amuted)', fontWeight: 600 }}>Total: ${pendingTotal.toFixed(2)}</div>
        </div>
        <div className="admin-stat-card" style={{ padding: '16px 18px' }}>
          <div className="admin-stat-label">Approved (Total)</div>
          <div className="admin-stat-value" style={{ fontSize: '22px', color: 'var(--agreen)' }}>${approvedTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
        </div>
        <div className="admin-stat-card" style={{ padding: '16px 18px' }}>
          <div className="admin-stat-label">All Deposits</div>
          <div className="admin-stat-value" style={{ fontSize: '22px' }}>{deposits.length}</div>
        </div>
      </div>

      {actionMsg && (
        <div className={`admin-alert admin-alert-${actionMsg.type === 'error' ? 'error' : 'success'}`}>{actionMsg.text}</div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className="admin-tabs">
          {['ALL', 'pending', 'approved', 'rejected'].map(s => (
            <button key={s} className={`admin-tab${filterStatus === s ? ' active' : ''}`} onClick={() => setFilterStatus(s)}>
              {s === 'ALL' ? `All (${deposits.length})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${deposits.filter(d => d.status === s).length})`}
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
                <th>Details</th>
                <th>Date</th>
                <th>Status</th>
                <th>Proof</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr className="admin-table-empty-row"><td colSpan="7">No deposits found.</td></tr>
              ) : filtered.map(tx => {
                const proofUrl = extractProofUrl(tx.notes, tx.screenshot_url || tx.proof_url);
                const requestNumber = extractRequestNumber(tx.request_number, tx.notes);
                const method = extractMethod(tx.notes);
                return (
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
                    <td><span className="admin-amount-pos">+${Number(tx.amount).toFixed(2)}</span></td>
                    <td>
                        <div className="admin-cell-name">{method}</div>
                        <div className="admin-badge admin-badge-muted" style={{ fontSize: '10px' }}>{requestNumber || 'No ID'}</div>
                    </td>
                    <td>
                      <div className="admin-cell-name">{new Date(tx.created_at).toLocaleDateString()}</div>
                      <div className="admin-cell-sub">{new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td><span className={`admin-badge admin-badge-${STATUS_BADGE[tx.status] || 'muted'}`}>{tx.status}</span></td>
                    <td>
                      {proofUrl ? (
                        <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setProofModal(proofUrl)}>
                          View
                        </button>
                      ) : (
                        <span style={{ color: 'var(--amuted)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {tx.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button className="admin-btn admin-btn-success admin-btn-sm"
                            onClick={() => handleAction(tx.id, 'approved', tx.user_id, tx.amount)}>
                            Approve
                          </button>
                          <button className="admin-btn admin-btn-danger-outline admin-btn-sm"
                            onClick={() => handleAction(tx.id, 'rejected', tx.user_id, tx.amount)}>
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="admin-badge admin-badge-muted">Processed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}


      {/* Proof Modal */}
      {proofModal && (
        <div className="admin-modal-overlay" onClick={() => setProofModal(null)}>
          <div style={{ position: 'relative', maxWidth: '640px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <button className="admin-modal-close" style={{ position: 'absolute', top: -14, right: -14 }}
              onClick={() => setProofModal(null)}>✕</button>
            <img src={proofModal} alt="Payment proof" style={{ width: '100%', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }} />
          </div>
        </div>
      )}
    </div>
  );
}
