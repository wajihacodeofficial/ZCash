'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Shield, Clock, Check, CheckCheck } from 'lucide-react';
import { createClient } from '../../lib/supabase/client';

export default function MessagesTab({ userProfile, refreshData }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const supabase = createClient();
  const scrollRef = useRef(null);

  const fetchMessages = async () => {
    if (!userProfile) return;
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userProfile.id},receiver_id.eq.${userProfile.id}`)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `receiver_id=eq.${userProfile?.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !userProfile || sending) return;

    setSending(true);
    // Find admin ID - for now we use a generic placeholder or the first admin found
    // Usually, messages to admin have receiver_id null or a specific admin ID
    // Based on existing admin code, it expects 'type' = 'support' for incoming messages
    
    const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'ADMIN', 'SUPERADMIN'])
        .limit(1);
    
    const adminId = admins?.[0]?.id;

    const { error } = await supabase.from('messages').insert({
      sender_id: userProfile.id,
      receiver_id: adminId, // Can be null if broadcasting to all admins
      title: 'Support Inquiry',
      body: newMessage,
      type: 'support',
      is_read: false
    });

    if (!error) {
      setNewMessage('');
      fetchMessages();
    }
    setSending(false);
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading messages...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 220px)', background: 'transparent' }}>
      <div style={{ padding: '0 20px 15px' }}>
        <div style={{ 
          background: 'rgba(79, 142, 247, 0.1)', 
          padding: '12px 18px', 
          borderRadius: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          border: '1px solid rgba(79, 142, 247, 0.2)'
        }}>
          <Shield size={20} color="var(--blue-text)" />
          <div>
            <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-dark)' }}>Admin Support</p>
            <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Typical response time: <span style={{ color: 'var(--blue-text)' }}>5-10 mins</span></p>
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '10px 20px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px',
          scrollbarWidth: 'none'
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '60px', color: 'var(--text-muted)' }}>
            <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: '15px' }} />
            <p style={{ fontWeight: '700' }}>No messages yet</p>
            <p style={{ fontSize: '12px', opacity: 0.7 }}>Send a message to start a conversation with Admin.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === userProfile.id;
            return (
              <div 
                key={msg.id} 
                style={{ 
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{ 
                  background: isMe ? 'var(--blue-text)' : 'var(--bg-card)',
                  color: isMe ? '#fff' : 'var(--text-dark)',
                  padding: '12px 16px',
                  borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                  fontSize: '14px',
                  fontWeight: '600',
                  boxShadow: isMe ? '0 4px 15px rgba(79,142,247,0.2)' : '0 4px 15px rgba(0,0,0,0.03)',
                  border: isMe ? 'none' : '1px solid var(--border)'
                }}>
                  {msg.body}
                </div>
                <div style={{ 
                  marginTop: '4px', 
                  fontSize: '10px', 
                  color: 'var(--text-muted)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  fontWeight: '700'
                }}>
                  <Clock size={10} />
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isMe && (msg.is_read ? <CheckCheck size={12} color="var(--green-text)" /> : <Check size={12} />)}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form 
        onSubmit={handleSendMessage}
        style={{ 
          padding: '15px 20px', 
          background: 'var(--bg-card)', 
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: '10px',
          alignItems: 'center'
        }}
      >
        <input 
          type="text" 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          style={{ 
            flex: 1, 
            background: 'var(--bg-light)', 
            border: '2px solid var(--border)', 
            borderRadius: '25px', 
            padding: '12px 20px', 
            fontSize: '14px', 
            fontWeight: '600',
            color: 'var(--text-dark)',
            outline: 'none'
          }}
        />
        <button 
          type="submit"
          disabled={sending || !newMessage.trim()}
          style={{ 
            width: '45px', 
            height: '45px', 
            borderRadius: '50%', 
            background: 'var(--blue-text)', 
            border: 'none', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#fff',
            cursor: 'pointer',
            opacity: sending || !newMessage.trim() ? 0.6 : 1,
            boxShadow: '0 4px 15px rgba(79,142,247,0.3)'
          }}
        >
          <Send size={20} strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}
