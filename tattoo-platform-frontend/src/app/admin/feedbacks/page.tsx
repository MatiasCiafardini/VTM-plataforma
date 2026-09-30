import { AdminFeedbacksPanel } from "@/components/admin-feedbacks-panel";
import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/session";

export default async function AdminFeedbacksPage({
  searchParams,
}: {
  searchParams: Promise<{ feedbackId?: string }>;
}) {
  const session = await requireRole("ADMIN");
  const { feedbackId } = await searchParams;
  return (
    <AppShell
      role={session.role}
      displayName={session.displayName}
      activeNav="feedbacks"
      title=""
      subtitle=""
      showSectionEyebrow={false}
    >
      <AdminFeedbacksPanel initialFeedbackId={feedbackId} />
    </AppShell>
  );
}
