'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';
import ProfileTab from '../../components/tabs/ProfileTab';
import PageWrapper from '../../components/PageWrapper';

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile) setUserProfile(profile);
      }
    };
    fetchUser();
  }, [supabase]);

  return (
    <PageWrapper title="MY PROFILE" activeTab="profile">
      <ProfileTab userProfile={userProfile} showInternalHeader={false} />
    </PageWrapper>
  );
}
