import { EmptyState } from '../components/shared/EmptyState';
import { PageLayout } from '../components/shared/PageLayout';

export function NetworkPage() {
  return (
    <PageLayout title="Network">
      <EmptyState title="WLED network connector coming soon" description="Module 3.2" />
    </PageLayout>
  );
}
