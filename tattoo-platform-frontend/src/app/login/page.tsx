import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/login-form';
import { getDashboardPath, getSession } from '@/lib/session';

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect(getDashboardPath(session.role));
  }

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-brand">
          <div className="auth-logo" aria-hidden="true">
            <span className="auth-logo-bolt" />
            <span className="auth-logo-text">
              Tattoo<span>Academy</span>
            </span>
          </div>
          <p className="auth-subtitle">Ingresa a tu cuenta</p>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
