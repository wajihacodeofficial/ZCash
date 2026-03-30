import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { email, password, fullName, country, phoneNumber, token } =
      await request.json();

    if (!email || !password || !token) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Create user with admin API to bypass rate limits and auto-confirmation
    const { data: userData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: false, // We'll handle verification ourselves
        user_metadata: {
          full_name: fullName,
          country,
          phone_number: phoneNumber,
          referral_code: 'REF-' + Math.floor(Math.random() * 1000000),
          is_verified: false,
          verification_token: token,
          verification_token_created_at: new Date().toISOString(),
        },
      });

    if (createError) {
      console.error('Admin signup error:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Trigger the custom verification email
    try {
      const origin =
        process.env.FRONTEND_URL ||
        request.headers.get('origin') ||
        'https://EasyPay.vercel.app';
      await fetch(`${origin}/api/auth/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token }),
      });
    } catch (emailError) {
      console.error('Verification email trigger error:', emailError);
      // We don't fail the whole request since the user is created
    }

    return NextResponse.json({ success: true, user: userData.user });
  } catch (error) {
    console.error('Signup API error:', error);
    return NextResponse.json(
      { error: 'Internal server error during registration' },
      { status: 500 }
    );
  }
}
