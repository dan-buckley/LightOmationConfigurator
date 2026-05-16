import { EmptyState } from '../components/shared/EmptyState';
import { PageLayout } from '../components/shared/PageLayout';

export function GeneratePage() {
  return (
    <PageLayout title="Generate">
      <EmptyState title="Generation engine coming soon" description="Module 2.2" />
    </PageLayout>
  );
}
