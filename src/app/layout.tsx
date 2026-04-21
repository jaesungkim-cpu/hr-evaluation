import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabase-server';

export const metadata: Metadata = {
  title: '비버웍스 인사평가',
  description: '비버웍스 인사평가 시스템',
};

async function getUser() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session_id')?.value;

    if (!sessionId) {
      return null;
    }

    const { data, error } = await supabaseServer
      .from('employees')
      .select('id, name, email, role')
      .eq('id', sessionId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
    };
  } catch (error) {
    return null;
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='75' font-size='75' fill='%231a365d'>B</text></svg>" />
      </head>
      <body>
        {user && <Header user={user} />}
        <main className={user ? '' : ''}>
          {children}
        </main>
      </body>
    </html>
  );
}
