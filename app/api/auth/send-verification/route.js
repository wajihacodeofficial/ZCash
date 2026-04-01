import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const { email, token } = await request.json();

    if (!email || !token) {
      return NextResponse.json(
        { error: 'Missing email or token' },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const baseUrl = process.env.FRONTEND_URL || 'https://z-cash-8jve.vercel.app';
    const verificationLink = `${baseUrl}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

    const mailOptions = {
      from: `EasyPay Platform <${process.env.FROM_EMAIL || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify your EasyPay Account',
      html: `
        <div style="font-family: inherit; background: #f4f6f8; padding: 40px 20px;">
          <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 40px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
            <div style="background: #22c55e; width: 64px; height: 64px; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 900; color: #fff; margin-bottom: 24px;">ZC</div>
            <h1 style="font-size: 24px; font-weight: 800; color: #1e293b; margin-bottom: 16px;">Verify your Email</h1>
            <p style="font-size: 15px; color: #64748b; font-weight: 500; margin-bottom: 32px; line-height: 1.5;">Welcome to EasyPay! Please verify your email address to complete your registration and secure your account.</p>
            <a href="${verificationLink}" style="display: inline-block; background: #22c55e; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 15px; padding: 16px 32px; border-radius: 16px; letter-spacing: 0.5px; box-shadow: 0 8px 20px rgba(34, 197, 94, 0.2);">VERIFY ACCOUNT</a>
            <p style="font-size: 13px; color: #94a3b8; font-weight: 500; margin-top: 32px;">If you didn't create an account, you can safely ignore this email.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification email' },
      { status: 500 }
    );
  }
}
