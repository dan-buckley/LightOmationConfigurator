import { EmptyState } from '../components/shared/EmptyState';
import { PageLayout } from '../components/shared/PageLayout';

export function ImportPage() {
  return (
    <PageLayout title="Import">
      <EmptyState title="File import coming soon" description="Module 1.2" />
    </PageLayout>
  );
}
