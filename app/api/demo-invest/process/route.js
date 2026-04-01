import { createClient } from '../../../../lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const supabase = await createClient();
    
    // Check auth
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = session.user.id;

    // Call the atomic function to process investments for this specific user.
    // The RPC is marked SECURITY DEFINER so it can bypass RLS for the exact operations.
    const { data: resultData, error: rpcError } = await supabase.rpc('process_demo_investments', {
        p_user_id: userId
    });

    if (rpcError) {
      console.error('Failed to run RPC demo processing:', rpcError);
      return NextResponse.json({ error: 'Failed to process investments.' }, { status: 500 });
    }

    const result = (Array.isArray(resultData) && resultData.length > 0) ? resultData[0] : { processed_count: 0, credited_amount: 0 };
    
    // Return the response seamlessly matching what the UI expects (or just logs)
    return NextResponse.json({ 
      success: true, 
      message: `Processed ${result.processed_count} investments. Credited $${result.credited_amount}.`,
      processed: parseInt(result.processed_count || 0, 10),
      creditedAmount: parseFloat(result.credited_amount || 0)
    }, { status: 200 });
    
  } catch (error) {
    console.error('Demo Invest Process Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
