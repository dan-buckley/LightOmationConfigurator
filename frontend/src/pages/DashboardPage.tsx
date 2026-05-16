import { EmptyState } from '../components/shared/EmptyState';
import { PageLayout } from '../components/shared/PageLayout';

export function DashboardPage() {
  return (
    <PageLayout title="Dashboard">
      <EmptyState title="Fleet overview coming soon" description="Module 4.2" />
    </PageLayout>
  );
}
