import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user exists and is unverified
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email_verified')
      .eq('email', email)
      .single();

    if (profileErr || !profile) {
      // Return success anyway to not leak user existence
      return NextResponse.json({ success: true });
    }

    if (profile.email_verified) {
      return NextResponse.json({ error: 'Email is already verified. Please log in.' }, { status: 400 });
    }

    // Generate a new token
    const newToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 1000).toISOString(); // 30 seconds expiration

    // Upsert the token in email_verifications table (or update existing)
    await supabaseAdmin
      .from('email_verifications')
      .upsert(
        { user_id: profile.id, token: newToken, expires_at: expiresAt },
        { onConflict: 'user_id' }
      );

    // Send email
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const baseUrl = process.env.FRONTEND_URL || 'https://z-cash-8jve.vercel.app';
    const verificationLink = `${baseUrl}/verify-email?token=${newToken}&email=${encodeURIComponent(email)}`;

    await transporter.sendMail({
      from: `EasyPay Platform <${process.env.FROM_EMAIL || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify your EasyPay Account',
      html: `
        <div style="font-family: inherit; background: #f4f6f8; padding: 40px 20px;">
          <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 40px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
            <div style="background: linear-gradient(135deg, #0070f3, #00c6ff); width: 64px; height: 64px; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 900; color: #fff; margin-bottom: 24px;">EP</div>
            <h1 style="font-size: 24px; font-weight: 800; color: #1e293b; margin-bottom: 16px;">Verify your Email</h1>
            <p style="font-size: 15px; color: #64748b; font-weight: 500; margin-bottom: 32px; line-height: 1.5;">We received a request to resend your verification link. Click below to verify your EasyPay account.</p>
            <a href="${verificationLink}" style="display: inline-block; background: linear-gradient(135deg, #0070f3, #00c6ff); color: #ffffff; text-decoration: none; font-weight: 800; font-size: 15px; padding: 16px 32px; border-radius: 16px; letter-spacing: 0.5px; box-shadow: 0 8px 20px rgba(0, 112, 243, 0.25);">VERIFY MY ACCOUNT</a>
            <p style="font-size: 13px; color: #94a3b8; font-weight: 500; margin-top: 32px;">This link expires in 24 hours. If you didn't request this, you can safely ignore this email.</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json({ error: 'Failed to resend verification link.' }, { status: 500 });
  }
}
