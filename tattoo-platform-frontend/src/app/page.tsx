import { redirect } from 'next/navigation';
import { BrandLogo } from '@/components/brand-logo';
import { LoginForm } from '@/components/login-form';
import { getDashboardPath, getSession } from '@/lib/session';

export default async function Home() {
  const session = await getSession();

  if (session) {
    redirect(getDashboardPath(session.role));
  }

  return (
    <main className="auth-page auth-page-reference">
      <div className="auth-background-orb auth-background-orb-left" aria-hidden="true" />
      <div className="auth-background-orb auth-background-orb-right" aria-hidden="true" />
      <div className="auth-scene">
        <section className="auth-shell auth-shell-reference">
          <div className="auth-brand">
            <BrandLogo priority chrome={false} className="auth-brand-logo auth-brand-logo-classic" />
            <p className="auth-subtitle auth-subtitle-reference">Ingresa a tu cuenta</p>
          </div>

          <LoginForm />
        </section>
      </div>
    </main>
  );
}
