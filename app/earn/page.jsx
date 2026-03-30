'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';
import EarnTab from '../../components/tabs/EarnTab';
import PageWrapper from '../../components/PageWrapper';
import { useRouter } from 'next/navigation';

export default function EarnPage() {
  const [activePlans, setActivePlans] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile) setUserProfile(profile);
        
        const { data: plans } = await supabase
          .from('user_plans')
          .select('*, plans(name, daily_roi_percent)')
          .eq('user_id', user.id)
          .eq('active', true);
        if (plans) setActivePlans(plans);
      }
    };
    fetchUser();
  }, [supabase]);

  return (
    <PageWrapper title="GROWTH HUB" activeTab="earn" onBack={() => router.push('/')}>
      <EarnTab activePlans={activePlans} userProfile={userProfile} showInternalHeader={false} />
    </PageWrapper>
  );
}
