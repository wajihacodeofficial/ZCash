'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';
import InvestTab from '../../components/tabs/InvestTab';
import PageWrapper from '../../components/PageWrapper';
import { useRouter } from 'next/navigation';

export default function InvestPage() {
  const [userProfile, setUserProfile] = useState(null);
  const [balance, setBalance] = useState(0);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile) {
          setUserProfile(profile);
          setBalance(Number(profile.balance || 0));
        }
      }
    };
    fetchUser();
  }, [supabase]);

  const activatePlan = async (plan) => {
    if (!userProfile) return;
    if (balance < plan.price_usd && plan.price_usd > 0) {
      router.push(`/deposit?planId=${plan.id}&amount=${plan.price_usd}`); return;
    }
    const { error } = await supabase.rpc('buy_plan_from_balance', {
      p_user_id: userProfile.id, p_plan_id: plan.id, p_amount: plan.price_usd, p_duration_days: plan.duration_days
    });
    if (error) { alert('Error: ' + error.message); }
    else { alert('Plan Activated!'); window.location.reload(); }
  };

  return (
    <PageWrapper title="INVESTMENT" activeTab="invest">
      <InvestTab activatePlan={activatePlan} showInternalHeader={false} />
    </PageWrapper>
  );
}
