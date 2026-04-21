import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import LoginForm from '@/components/LoginForm';

export default async function LoginPage() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;

  if (sessionId) {
    redirect('/dashboard');
  }

  return <LoginForm />;
}
