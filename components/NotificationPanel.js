'use client';
import React, { useEffect, useState } from 'react';
import { createClient } from '../lib/supabase/client';

export default function NotificationPanel({ isOpen, onClose, onUnreadCountChange, isAdminView = false }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const fetchNotifications = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    let query = supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (!isAdminView) {
      query = query.eq('receiver_id', user.id).eq('type', 'admin_message');
    }

    const res = await query;
    const data = res['data'];
    const error = res['error'];

    const msgs = data || [];
    setNotifications(msgs);
    const unread = msgs.filter(m => !m.is_read).length;
    if (onUnreadCountChange) onUnreadCountChange(unread);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen]);

  const markRead = async (id) => {
    await supabase.from('messages').update({ is_read: true }).eq('id', id);
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, is_read: true } : n);
      const unread = updated.filter(m => !m.is_read).length;
      if (onUnreadCountChange) onUnreadCountChange(unread);
      return updated;
    });
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    const query = supabase.from('messages').update({ is_read: true });
    await query['in']('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    if (onUnreadCountChange) onUnreadCountChange(0);
  };

  const iconForNotif = (notif) => {
    const title = (notif.title || '').toLowerCase();
    if (title.includes('approv')) return { icon: '✅', color: '#10b981' };
    if (title.includes('reject') || title.includes('fail')) return { icon: '❌', color: '#ef4444' };
    if (title.includes('plan')) return { icon: '🚀', color: '#1e88e5' };
    if (title.includes('bonus') || title.includes('reward')) return { icon: '🎁', color: '#9b59b6' };
    if (title.includes('warn') || title.includes('alert')) return { icon: '⚠️', color: '#f39c12' };
    return { icon: '💬', color: '#1e88e5' };
  };

  const timeAgo = (dateStr) => {
    const diff = Math.floor((Date.now() - (+new Date(dateStr))) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (!isOpen) return null;

  return (
    /* position:absolute so it stays inside the 390px phone frame */
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 500 }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s' }}
      />

      {/* Drawer slides up from bottom */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', maxHeight: '78%', background: 'var(--bg-card)', borderTopLeftRadius: '28px', borderTopRightRadius: '28px', padding: '20px 20px 32px', boxShadow: '0 -10px 40px rgba(0,0,0,0.2)', overflowY: 'auto', animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <div style={{ width: '40px', height: '4px', background: 'var(--border)', borderRadius: '10px', margin: '0 auto 24px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-dark)' }}>Notifications</h3>
          <span onClick={markAllRead} style={{ fontSize: '12px', fontWeight: '700', color: 'var(--blue-text)', cursor: 'pointer' }}>Mark all read</span>
        </div>

        {loading && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0', fontWeight: '700' }}>Loading...</p>}
        
        {!loading && notifications.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔔</div>
            <p style={{ color: 'var(--text-muted)', fontWeight: '700', fontSize: '14px' }}>No notifications yet</p>
            <p style={{ color: 'var(--text-muted)', fontWeight: '600', fontSize: '12px', marginTop: '4px' }}>Admin messages will appear here</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map(n => {
            const { icon, color } = iconForNotif(n);
            return (
              <div
                key={n.id}
                className="clicky"
                onClick={() => !n.is_read && markRead(n.id)}
                style={{ background: n.is_read ? 'var(--bg-card)' : `${color}08`, padding: '16px', borderRadius: '20px', border: n.is_read ? '1px solid var(--border)' : `1.5px solid ${color}40`, display: 'flex', gap: '14px', alignItems: 'flex-start', cursor: n.is_read ? 'default' : 'pointer', transition: '0.2s' }}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                  {icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '4px' }}>{n.title || 'Message'}</h4>
                    {!n.is_read && (
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, marginLeft: '8px', flexShrink: 0 }} />
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>{n.body}</p>
                  <span style={{ display: 'block', marginTop: '8px', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{timeAgo(n.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          style={{ width: '100%', marginTop: '32px', padding: '16px', borderRadius: '16px', background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
