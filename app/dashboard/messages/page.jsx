'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import TabHeader from '../../../components/TabHeader';
import MessagesTab from '../../../components/tabs/MessagesTab';

export default function DashboardMessagesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    setUserProfile(profile || null);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-light)' }}>
        <TabHeader
          title="INBOX"
          userProfile={userProfile}
          showActions={false}
          onBack={() => router.push('/')}
        />
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading messages...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-light)' }}>
      <TabHeader
        title="INBOX"
        userProfile={userProfile}
        showActions={false}
        onBack={() => router.push('/')}
      />
      <MessagesTab userProfile={userProfile} refreshData={refreshData} />
    </div>
  );
}
