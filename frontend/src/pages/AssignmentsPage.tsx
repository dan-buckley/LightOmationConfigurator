import { EmptyState } from '../components/shared/EmptyState';
import { PageLayout } from '../components/shared/PageLayout';

export function AssignmentsPage() {
  return (
    <PageLayout title="Assignments">
      <EmptyState title="Preset assignments coming soon" description="Module 1.4" />
    </PageLayout>
  );
}
