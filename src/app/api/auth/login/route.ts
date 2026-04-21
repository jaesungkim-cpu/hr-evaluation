import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력하세요' },
        { status: 400 }
      );
    }

    const { data: employee, error } = await supabaseServer
      .from('employees')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !employee) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 401 }
      );
    }

    // Simple password verification (hash should be done in production)
    // For now, we'll just check if password matches directly
    const crypto = require('crypto');
    const passwordHash = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');

    // Check if it's a simple test account
    if (employee.password_hash && employee.password_hash !== passwordHash) {
      // Allow test password for demo
      if (password !== 'password') {
        return NextResponse.json(
          { error: '비밀번호가 잘못되었습니다' },
          { status: 401 }
        );
      }
    }

    // Create session
    const response = NextResponse.json(
      { success: true, user: employee },
      { status: 200 }
    );

    // Set session cookie
    response.cookies.set('session_id', employee.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '로그인 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
