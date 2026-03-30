'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';

export default function AdminMessagesPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState('inbox');
  const [inbox, setInbox] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msgModal, setMsgModal] = useState(null);
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [adminId, setAdminId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const showAction = (msg, type = 'success') => {
    setActionMsg({ text: msg, type });
    setTimeout(() => setActionMsg(''), 3500);
  };

  const fetchMessages = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setAdminId(user.id);
    const { data: support } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(full_name, email)')
      .eq('type', 'support')
      .order('created_at', { ascending: false })
      .limit(100);
    if (support) setInbox(support);
    const { data: msgs } = await supabase
      .from('messages')
      .select('*, receiver:profiles!messages_receiver_id_fkey(full_name, email)')
      .eq('type', 'admin_message')
      .order('created_at', { ascending: false })
      .limit(100);
    if (msgs) setOutbox(msgs);
    setLoading(false);
  };

  useEffect(() => { fetchMessages(); }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!msgBody.trim() || !msgModal?.userId || !adminId) return;
    setSendingMsg(true);
    const newMsg = {
      sender_id: adminId, receiver_id: msgModal.userId,
      title: msgTitle || 'Message from Admin', body: msgBody,
      type: 'admin_message', is_read: false,
    };
    const { data, error } = await supabase.from('messages').insert(newMsg)
      .select('*, receiver:profiles!messages_receiver_id_fkey(full_name, email)');
    if (error) { showAction('Error: ' + error.message, 'error'); }
    else {
      showAction(`Message sent to ${msgModal.userName}.`);
      if (data) setOutbox([data[0], ...outbox]);
      setMsgModal(null); setMsgTitle(''); setMsgBody('');
    }
    setSendingMsg(false);
  };

  const markRead = async (id) => {
    await supabase.from('messages').update({ is_read: true }).eq('id', id);
    setInbox(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
  };

  const unreadCount = inbox.filter(m => !m.is_read).length;

  const MessageRow = ({ msg, isInbox }) => {
    const isExpanded = expandedId === msg.id;
    return (
      <div
        style={{
          background: (!msg.is_read && isInbox) ? 'rgba(79,142,247,0.04)' : 'var(--as)',
          border: `1px solid ${(!msg.is_read && isInbox) ? 'rgba(79,142,247,0.25)' : 'var(--aborder)'}`,
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          transition: '0.2s',
        }}>
        {/* Row Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', cursor: 'pointer' }}
          onClick={() => {
            setExpandedId(isExpanded ? null : msg.id);
            if (isInbox && !msg.is_read) markRead(msg.id);
          }}>
          <div className="admin-avatar" style={{ background: isInbox ? 'var(--as2)' : 'var(--ablue-dim)', color: isInbox ? 'var(--amuted)' : 'var(--ablue)' }}>
            {isInbox ? (msg.sender?.full_name || 'U').charAt(0).toUpperCase() : '→'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <div className="admin-cell-name" style={{ fontSize: '14px' }}>
                {isInbox ? (msg.sender?.full_name || 'Unknown') : msg.title}
              </div>
              {!msg.is_read && isInbox && <span className="admin-badge admin-badge-blue" style={{ fontSize: '9px' }}>NEW</span>}
            </div>
            <div className="admin-cell-sub">
              {isInbox ? msg.sender?.email : `To: ${msg.receiver?.full_name || msg.receiver?.email}`}
              {' • '}{new Date(msg.created_at).toLocaleString()}
            </div>
          </div>
          {!isInbox && (
            <span className={`admin-badge admin-badge-${msg.is_read ? 'green' : 'muted'}`}>
              {msg.is_read ? 'Read' : 'Unread'}
            </span>
          )}
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
            style={{ color: 'var(--amuted)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: '0.2s', flexShrink: 0 }}>
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Expanded Body */}
        {isExpanded && (
          <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--aborder)' }}>
            {isInbox && <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--amuted)', marginTop: '14px', marginBottom: '6px', textTransform: 'uppercase' }}>Subject: {msg.title || '(No subject)'}</div>}
            <div style={{
              background: 'var(--as2)', padding: '14px 16px', borderRadius: 'var(--radius-sm)',
              color: 'var(--atext)', fontSize: '14px', lineHeight: '1.7', whiteSpace: 'pre-wrap',
              border: '1px solid var(--aborder)', marginTop: isInbox ? '0' : '14px'
            }}>
              {msg.body}
            </div>
            {isInbox && (
              <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
                <button className="admin-btn admin-btn-primary admin-btn-sm"
                  onClick={() => setMsgModal({ userId: msg.sender_id, userName: msg.sender?.full_name || msg.sender?.email })}>
                  Reply
                </button>
                {!msg.is_read && (
                  <button className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => markRead(msg.id)}>
                    Mark Read
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="admin-page-header">
        <div className="admin-page-header-left">
          <h1 className="admin-page-title">Message Center</h1>
          <p className="admin-page-subtitle">Handle user support inquiries and outbound notifications.</p>
        </div>
        <div className="admin-page-header-right">
          <div className="admin-tabs">
            <button className={`admin-tab${activeTab === 'inbox' ? ' active' : ''}`} onClick={() => setActiveTab('inbox')}>
              Support Inbox
              {unreadCount > 0 && <span className="admin-nav-badge">{unreadCount}</span>}
            </button>
            <button className={`admin-tab${activeTab === 'outbox' ? ' active' : ''}`} onClick={() => setActiveTab('outbox')}>
              Sent ({outbox.length})
            </button>
          </div>
        </div>
      </div>

      {actionMsg && (
        <div className={`admin-alert admin-alert-${actionMsg.type === 'error' ? 'error' : 'info'}`}>{actionMsg.text}</div>
      )}

      {loading ? (
        <div className="admin-spinner-wrap"><div className="admin-spinner" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {activeTab === 'inbox' ? (
            inbox.length === 0 ? (
              <div className="admin-empty"><div className="admin-empty-icon">📭</div><div className="admin-empty-text">No support messages received yet.</div></div>
            ) : inbox.map(msg => <MessageRow key={msg.id} msg={msg} isInbox={true} />)
          ) : (
            outbox.length === 0 ? (
              <div className="admin-empty"><div className="admin-empty-icon">📤</div><div className="admin-empty-text">No messages sent yet.</div></div>
            ) : outbox.map(msg => <MessageRow key={msg.id} msg={msg} isInbox={false} />)
          )}
        </div>
      )}

      {/* Compose Modal */}
      {msgModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <button className="admin-modal-close" onClick={() => setMsgModal(null)}>✕</button>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Send Message</h3>
              <p className="admin-modal-sub">To: <strong style={{ color: 'var(--atext)' }}>{msgModal.userName}</strong></p>
            </div>
            <form onSubmit={handleSendMessage} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="admin-label">Subject</label>
                <input className="admin-input" type="text" value={msgTitle}
                  onChange={e => setMsgTitle(e.target.value)} placeholder="e.g. Account Update" />
              </div>
              <div>
                <label className="admin-label">Message *</label>
                <textarea required className="admin-input" rows={5} value={msgBody}
                  onChange={e => setMsgBody(e.target.value)} placeholder="Write your message here…"
                  style={{ resize: 'vertical' }} />
              </div>
              <div className="admin-modal-actions">
                <button type="submit" disabled={sendingMsg} className="admin-btn admin-btn-primary" style={{ flex: 1 }}>
                  {sendingMsg ? 'Sending…' : 'Send Message'}
                </button>
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setMsgModal(null)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
