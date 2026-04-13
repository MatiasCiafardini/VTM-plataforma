import { redirect } from 'next/navigation';
import { BrandLogo } from '@/components/brand-logo';
import { RegisterForm } from '@/components/register-form';
import { getDashboardPath, getSession } from '@/lib/session';

export default async function RegisterPage() {
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
            <BrandLogo
              priority
              chrome={false}
              className="auth-brand-logo auth-brand-logo-classic"
            />
            <p className="auth-subtitle auth-subtitle-reference">
              Crea tu cuenta con el codigo de acceso
            </p>
          </div>

          <RegisterForm />
        </section>
      </div>
    </main>
  );
}
