'use client';
import { Home, TrendingUp, Briefcase, Send, User, MessageSquare } from 'lucide-react';

export default function BottomNavbar({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'home',     icon: Home,          label: 'HOME'    },
    { id: 'invest',   icon: TrendingUp,    label: 'INVEST'  },
    { id: 'messages', icon: MessageSquare, label: 'CHAT'    },
    { id: 'invite',   icon: Send,          label: 'INVITE'  },
    { id: 'profile',  icon: User,          label: 'PROFILE' },
  ];

  return (
    <nav style={{ 
      position: 'absolute', bottom: 0, left: 0, width: '100%', 
      background: 'var(--bg-card)', 
      borderTop: '1px solid var(--border)', 
      display: 'flex', justifyContent: 'space-around', 
      padding: '8px 4px 18px', zIndex: 100,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.05)'
    }}>
      {tabs.map(({ id, icon: Icon, label }) => {
        const active = activeTab === id;
        return (
          <div 
            key={id} 
            onClick={() => onTabChange(id)} 
            className="clicky" 
            style={{ 
              flex: 1, display: 'flex', flexDirection: 'column', 
              alignItems: 'center', gap: '5px', position: 'relative', 
              paddingTop: '6px', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <div style={{
              width: active ? '32px' : '0px',
              height: '32px',
              borderRadius: '10px',
              background: active ? 'rgba(243, 156, 18, 0.12)' : 'transparent',
              position: 'absolute',
              top: '2px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: -1
            }} />
            
            <Icon 
              size={19} 
              strokeWidth={active ? 2.5 : 2} 
              color={active ? 'var(--blue-text)' : 'var(--text-muted)'} 
            />
            <span style={{ 
              fontSize: '10px', fontWeight: '800', letterSpacing: '0.4px', 
              color: active ? 'var(--blue-text)' : 'var(--text-muted)',
              opacity: active ? 1 : 0.8
            }}>
              {label}
            </span>
            
            {active && (
              <div style={{ 
                position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)', 
                width: '4px', height: '4px', background: 'var(--blue-text)', 
                borderRadius: '50%' 
              }} />
            )}
          </div>
        );
      })}
    </nav>
  );
}
