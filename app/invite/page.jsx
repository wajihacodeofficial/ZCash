'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';
import InviteTab from '../../components/tabs/InviteTab';
import PageWrapper from '../../components/PageWrapper';

export default function InvitePage() {
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
    <PageWrapper title="INVITE & EARN" activeTab="invite">
      <InviteTab userProfile={userProfile} showInternalHeader={false} />
    </PageWrapper>
  );
}
