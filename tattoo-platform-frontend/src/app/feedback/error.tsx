'use client';

import styles from '@/components/feedback.module.css';

export default function FeedbackError({ reset }: { reset: () => void }) {
  return (
    <main className={styles.feedbackPage}>
      <section className={styles.wizard}>
        <h1>No pudimos cargar el formulario</h1>
        <p>Revisá tu conexión y volvé a intentar en unos momentos.</p>
        <div className={styles.actions}>
          <button type="button" className="primary-button" onClick={reset}>Volver a intentar</button>
        </div>
      </section>
    </main>
  );
}
