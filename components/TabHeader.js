'use client';
import React from 'react';
import Image from 'next/image';
import { Sun, Moon, Bell, ArrowLeft } from 'lucide-react';

/**
 * Reusable header used by all tabs.
 * Props: title, theme, toggleTheme, userProfile, setNotifOpen, unreadCount, onAvatarClick, onBack, showActions
 */
export default function TabHeader({ title, userProfile, setNotifOpen = null, unreadCount = 0, onAvatarClick, onBack = null, showActions = true }) {
  const initial = userProfile?.full_name?.charAt(0).toUpperCase() || 'F';

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px', height: '62px', flexShrink: 0,
      background: 'var(--bg-card)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, zIndex: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {onBack && (
          <button 
            onClick={onBack} 
            className="clicky"
            style={{ 
              background: 'var(--bg-light)', 
              border: '1px solid var(--border)', 
              borderRadius: '10px',
              width: '32px',
              height: '32px',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <ArrowLeft size={16} color="var(--text-dark)" strokeWidth={3} />
          </button>
        )}
        
        <Image
          src="/logo.png"
          alt="EasyPay"
          width={42}
          height={42}
          style={{ objectFit: 'contain', flexShrink: 0 }}
          priority
        />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
          <span style={{ color: 'var(--blue-text)', fontSize: '18px', fontWeight: '900', letterSpacing: '-0.8px', lineHeight: 1.1 }}>EasyPay</span>
          {title && <span style={{ color: 'var(--text-muted)', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{title}</span>}
        </div>
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {showActions && (
          <>
            {/* Notification bell */}
            <button
              onClick={() => setNotifOpen?.(true)}
              style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--bg-light)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, position: 'relative' }}
            >
              <Bell size={16} color="var(--text-muted)" strokeWidth={2} />
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: '7px', right: '7px', width: '7px', height: '7px', borderRadius: '50%', background: '#EF4444', border: '1.5px solid var(--bg-card)' }} />
              )}
            </button>

            {/* User avatar — click → profile tab */}
            <button
              onClick={onAvatarClick}
              style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--border)', padding: '4px', overflow: 'hidden' }}
            >
              <Image src="/logo.png" alt="Profile" width={26} height={26} style={{ objectFit: 'contain' }} />
            </button>
          </>
        )}
      </div>
    </header>
  );
}
