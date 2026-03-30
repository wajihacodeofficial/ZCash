'use client';
import React, { useState, useEffect } from 'react';
import TabHeader from './TabHeader';
import BottomNavbar from './BottomNavbar';
import NotificationPanel from './NotificationPanel';
import { createClient } from '../lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';

export default function PageWrapper({ children, title, activeTab, onTabChange, onBack, showNavbar = true }) {
  const [userProfile, setUserProfile] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile) setUserProfile(profile);
      }
    };
    fetchUser();
  }, [supabase, pathname]);

  const handleTabChange = (tab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      // If we are not on the dashboard, navigate home first
      router.push(`/?tab=${tab}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative', background: 'var(--bg-light)' }}>
      <TabHeader 
        title={title} 
        userProfile={userProfile} 
        setNotifOpen={setNotifOpen} 
        unreadCount={unreadCount} 
        onAvatarClick={() => handleTabChange('profile')}
        onBack={onBack}
        showActions={!!userProfile}
      />

      <NotificationPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} onUnreadCountChange={setUnreadCount} />

      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: showNavbar ? '80px' : '0' }}>
        {children}
      </main>

      {showNavbar && <BottomNavbar activeTab={activeTab} onTabChange={handleTabChange} />}
    </div>
  );
}
