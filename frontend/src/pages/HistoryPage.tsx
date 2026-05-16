import { EmptyState } from '../components/shared/EmptyState';
import { PageLayout } from '../components/shared/PageLayout';

export function HistoryPage() {
  return (
    <PageLayout title="History">
      <EmptyState title="Change and deployment history coming soon" description="Module 4.1" />
    </PageLayout>
  );
}
