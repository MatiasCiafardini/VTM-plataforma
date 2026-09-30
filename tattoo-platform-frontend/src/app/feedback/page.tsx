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
  return (
    <main className={styles.feedbackPage}>
      <Link href="/" aria-label="VMT, inicio">
        <BrandLogo priority chrome={false} className={styles.logo} />
      </Link>
      {user.role === "STUDENT" && user.status === "ACTIVE" ? (
        <StudentFeedbackForm userId={user.id} firstName={user.firstName} />
      ) : (
        <section className={styles.wizard}>
          <h1>Un espacio para nuestros alumnos</h1>
          <p>
            Para compartir tu experiencia, ingresá con una cuenta de alumno
            activa.
          </p>
          <Link href="/">Volver a mi panel</Link>
        </section>
      )}
    </main>
  );
}
