'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';
import { Megaphone, Trash2, Plus, Calendar } from 'lucide-react';

export default function AdminAnnouncementsPage() {
  const supabase = createClient();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newAnn, setNewAnn] = useState({ text: '', type: 'info' });
  const [actionMsg, setActionMsg] = useState('');

  const showAction = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 3500);
  };

  const fetchAnnouncements = async () => {
    setLoading(true);
    const res = await (supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false }));
    if (res['data']) setAnnouncements(res['data']);
    setLoading(false);
  };

  useEffect(() => { 
    fetchAnnouncements(); 
    
    // Create announcements table if it doesn't exist (mocking since we can't run DDL easily)
    // Note: In a real app, this should be done via migration
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newAnn.text.trim()) return;

    const { data, error } = await supabase
      .from('announcements')
      .insert({ 
        text: newAnn.text, 
        type: newAnn.type,
        created_at: new Date().toISOString()
      })
      .select();

    if (error) {
      showAction('Error creating announcement: ' + error.message);
    } else {
      showAction('Announcement published successfully.');
      if (data) setAnnouncements([data[0], ...announcements]);
      setShowModal(false);
      setNewAnn({ text: '', type: 'info' });
    }
  };

  const [confirmId, setConfirmId] = useState(null);

  const handleDelete = async (id) => {
    setLoading(true);
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) {
      showAction('Error deleting: ' + error.message);
    } else {
      showAction('Announcement removed.');
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    }
    setConfirmId(null);
    setLoading(false);
  };

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">Announcements</h1>
          <p className="admin-page-subtitle">Manage system-wide broadcasts shown to all users.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="admin-btn admin-btn-primary">
          <Plus size={16} style={{ marginRight: '8px' }} />
          New Announcement
        </button>
      </div>

      {actionMsg && (
        <div className="admin-alert admin-alert-info">
          {actionMsg}
        </div>
      )}

      {loading ? (
        <div className="admin-spinner-wrap"><div className="admin-spinner" /></div>
      ) : (
        <div className="admin-card">
          <div className="admin-card-header">
             <h3 className="admin-card-title">Active Weekly Broadcasts</h3>
             <span className="admin-badge admin-badge-muted">{announcements.length} Active</span>
          </div>
          <div className="admin-table-wrap" style={{ border: 'none' }}>
             <table className="admin-table">
                <thead>
                   <tr>
                      <th>Content</th>
                      <th>Type</th>
                      <th>Published</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                   </tr>
                </thead>
                <tbody>
                   {announcements.length === 0 ? (
                      <tr className="admin-table-empty-row"><td colSpan={4}>No announcements yet. Create your first broadcast!</td></tr>
                   ) : announcements.map(ann => (
                      <tr key={ann.id}>
                         <td style={{ maxWidth: '400px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                               <div className="admin-avatar" style={{ background: 'var(--ablue-dim)', color: 'var(--ablue)', width: '32px', height: '32px' }}>
                                  <Megaphone size={14} />
                               </div>
                               <span style={{ fontWeight: 600, fontSize: '13.5px' }}>{ann.text}</span>
                            </div>
                         </td>
                         <td>
                             <span className={`admin-badge admin-badge-${
                               ann.type === 'info' ? 'blue' : 
                               ann.type === 'alert' ? 'red' : 
                               ann.type === 'update' ? 'orange' : 
                               ann.type === 'roi' ? 'green' : 
                               ann.type === 'referral' ? 'purple' : 
                               ann.type === 'withdraw' ? 'yellow' : 'muted'
                             }`}>
                                {String(ann.type).toUpperCase()}
                             </span>
                         </td>
                         <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--amuted)', fontSize: '12px' }}>
                               <Calendar size={12} />
                               {new Date(ann.created_at).toLocaleDateString()}
                            </div>
                         </td>
                          <td style={{ textAlign: 'right' }}>
                             <button onClick={() => setConfirmId(ann.id)} className="admin-btn admin-btn-sm admin-btn-danger-ghost">
                                <Trash2 size={14} />
                             </button>
                          </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <button className="admin-modal-close" onClick={() => setShowModal(false)}>✕</button>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Create Announcement</h3>
              <p className="admin-modal-sub">This will be visible on the home dashboard for all regular users.</p>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="admin-label">Announcement Text *</label>
                <textarea 
                  required 
                  className="admin-input" 
                  rows={4} 
                  value={newAnn.text}
                  onChange={e => setNewAnn({ ...newAnn, text: e.target.value })}
                  placeholder="e.g. Weekly withdrawal limits have been increased..."
                />
              </div>
              <div>
                <label className="admin-label">Notification Type</label>
                <div style={{ position: 'relative' }}>
                  <select 
                    className="admin-input admin-select" 
                    value={newAnn.type}
                    onChange={e => setNewAnn({ ...newAnn, type: e.target.value })}
                    style={{ appearance: 'none', paddingRight: '40px' }}
                  >
                    <option value="info">📢 Information (Blue)</option>
                    <option value="alert">⚠️ Critical Alert (Red)</option>
                    <option value="update">🚀 Platform Update (Orange)</option>
                    <option value="roi">💰 ROI Earning (Green)</option>
                    <option value="referral">👥 Referral Bonus (Purple)</option>
                    <option value="withdraw">💳 Withdrawal Info (Yellow)</option>
                  </select>
                  <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--amuted)' }}>
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              </div>
              <div className="admin-modal-actions">
                <button type="submit" className="admin-btn admin-btn-primary" style={{ flex: 1 }}>
                   Publish Now
                </button>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>
                   Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Custom Confirmation Modal */}
      {confirmId && (
        <div className="system-modal-overlay">
          <div className="system-modal">
            <div className="system-modal-icon" style={{ background: 'var(--ared-dim)', color: 'var(--ared)' }}>
              <Trash2 size={24} />
            </div>
            <h3 className="system-modal-title">Delete Broadcast?</h3>
            <p className="system-modal-text">This will remove the announcement for all users instantly. This action cannot be undone.</p>
            <div className="system-modal-actions">
              <button className="system-modal-btn system-modal-cancel" onClick={() => setConfirmId(null)}>Cancel</button>
              <button className="system-modal-btn system-modal-confirm" style={{ background: 'var(--ared)', color: '#fff' }} onClick={() => handleDelete(confirmId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
