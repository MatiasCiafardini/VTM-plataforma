import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { StudentFeedbackForm } from "@/components/student-feedback-form";
import styles from "@/components/feedback.module.css";
import { BackendFetchError, backendFetch } from "@/lib/backend";
import { getSession } from "@/lib/session";

export default async function FeedbackPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/feedback");
  let user: { id: string; firstName: string; role: string; status: string };
  try {
    user = await backendFetch("/auth/me", { token: session.token });
  } catch (error) {
    if (error instanceof BackendFetchError && error.status === 401)
      redirect("/login?next=/feedback");
    throw error;
  }
  const isActiveStudent = user.role === "STUDENT" && user.status === "ACTIVE";
  const isAdminPreview = user.role === "ADMIN" && user.status === "ACTIVE";
  const dashboardPath = user.role === "ADMIN" ? "/admin" : user.role === "MENTOR" ? "/mentor" : "/student";
  return (
    <main className={styles.feedbackPage}>
      <div className={styles.feedbackShell}>
        <header className={styles.feedbackHeader}>
          <Link href={dashboardPath} aria-label="VMT, volver al panel">
            <BrandLogo priority chrome={false} className={styles.logo} />
          </Link>
          <Link className={styles.returnLink} href={isAdminPreview ? "/admin/feedbacks" : dashboardPath}>
            {isAdminPreview ? "Ir a Feedbacks" : "Volver a mi panel"} <span aria-hidden="true">↗</span>
          </Link>
        </header>
        <div className={styles.feedbackLayout}>
          <section className={styles.feedbackIntro} aria-label="Acerca del feedback semanal">
            <p className={styles.eyebrow}>UN ESPACIO PARA TU VOZ</p>
            <h2>Tu semana merece ser escuchada<span>.</span></h2>
            <p>Queremos saber cómo viviste la mentoría y qué paso diste esta semana. Cada respuesta nos ayuda a acompañarte mejor.</p>
            <div className={styles.introDivider} />
            <ol className={styles.introSteps}>
              <li><span>01</span><div><strong>Tu experiencia</strong><small>Valorá la mentoría con estrellas.</small></div></li>
              <li><span>02</span><div><strong>Tu mirada</strong><small>Contanos qué te sirvió y qué mejorarías.</small></div></li>
              <li><span>03</span><div><strong>Tu logro</strong><small>Compartí un avance, grande o pequeño.</small></div></li>
            </ol>
          </section>
          {isActiveStudent || isAdminPreview ? (
            <StudentFeedbackForm userId={user.id} firstName={user.firstName} preview={isAdminPreview} />
          ) : (
            <section className={`${styles.wizard} ${styles.feedbackRestricted}`}>
              <p className={styles.eyebrow}>ACCESO AL FORMULARIO</p>
              <h1>Ingresá con una cuenta de alumno activa</h1>
              <p>Este espacio recibe las experiencias de quienes participan en la mentoría.</p>
              <Link className="primary-button" href={dashboardPath}>Volver a mi panel</Link>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
