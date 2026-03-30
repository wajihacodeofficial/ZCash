import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// Service-role Supabase client (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if a user with this email exists in auth.users via profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', normalizedEmail)
      .single();

    if (profileError || !profile) {
      // Don't reveal if email exists — return generic success to prevent enumeration
      return NextResponse.json({ success: true });
    }

    // Rate limit: check if an OTP was sent in the last 60 seconds
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentOtp } = await supabaseAdmin
      .from('password_reset_otps')
      .select('created_at')
      .eq('email', normalizedEmail)
      .eq('used', false)
      .gte('created_at', oneMinuteAgo)
      .limit(1)
      .single();

    if (recentOtp) {
      return NextResponse.json(
        { error: 'Please wait 60 seconds before requesting another OTP.' },
        { status: 429 }
      );
    }

    // Invalidate any previous unused OTPs for this email
    await supabaseAdmin
      .from('password_reset_otps')
      .update({ used: true })
      .eq('email', normalizedEmail)
      .eq('used', false);

    // Generate OTP and set 5-minute expiry
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: insertError } = await supabaseAdmin
      .from('password_reset_otps')
      .insert({ email: normalizedEmail, otp_code: otp, expires_at: expiresAt });

    if (insertError) throw insertError;

    // Send OTP email via nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `EasyPay Platform <${process.env.FROM_EMAIL || process.env.EMAIL_USER}>`,
      to: normalizedEmail,
      subject: 'Your EasyPay Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; background: #f4f6f8; padding: 40px 20px;">
          <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 40px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
            <div style="background: #F39C12; width: 64px; height: 64px; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 900; color: #fff; margin-bottom: 24px;">ZC</div>
            <h1 style="font-size: 24px; font-weight: 800; color: #1e293b; margin-bottom: 8px;">Password Reset OTP</h1>
            <p style="font-size: 15px; color: #64748b; font-weight: 500; margin-bottom: 32px; line-height: 1.5;">
              You requested a password reset for your EasyPay account. Use the OTP below to continue. It expires in <strong>5 minutes</strong>.
            </p>
            <div style="background: #fff8ee; border: 2px solid #F39C12; border-radius: 16px; padding: 24px 32px; margin: 0 auto 32px; display: inline-block;">
              <span style="font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #1e293b;">${otp}</span>
            </div>
            <p style="font-size: 13px; color: #94a3b8; font-weight: 500;">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ error: 'Failed to send OTP. Please try again.' }, { status: 500 });
  }
}
