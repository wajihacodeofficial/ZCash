import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check auth
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { plan_id, amount } = await req.json();

    if (!plan_id || !amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'Invalid plan or amount.' }, { status: 400 });
    }
    
    const investAmount = parseFloat(amount);

    // Fetch user profile to check demo balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('demo_balance')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }

    if (parseFloat(profile.demo_balance || 0) < investAmount) {
      return NextResponse.json({ error: 'Insufficient demo balance.' }, { status: 400 });
    }

    // Fetch the plan details
    const { data: plan, error: planError } = await supabase
      .from('demo_plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (planError || !plan || !plan.active) {
      return NextResponse.json({ error: 'Invalid or inactive demo plan.' }, { status: 400 });
    }

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + plan.duration_days);

    // Deduct demo balance
    const newBalance = parseFloat(profile.demo_balance) - investAmount;
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ demo_balance: newBalance })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update demo balance.' }, { status: 500 });
    }

    // Insert investment
    const { data: investment, error: insertError } = await supabase
      .from('demo_investments')
      .insert({
        user_id: userId,
        plan_id: plan.id,
        amount: investAmount,
        profit_percentage: plan.profit_percentage,
        duration_days: plan.duration_days,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'active',
        is_credited: false
      })
      .select();

    if (insertError) {
      // Rollback balance if insert fails
      await supabase.from('profiles').update({ demo_balance: profile.demo_balance }).eq('id', userId);
      return NextResponse.json({ error: 'Failed to create demographic investment.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Demo investment created successfully.', investment: investment[0] }, { status: 200 });
  } catch (error) {
    console.error('Demo Invest Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
