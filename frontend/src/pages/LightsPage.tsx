import { EmptyState } from '../components/shared/EmptyState';
import { PageLayout } from '../components/shared/PageLayout';

export function LightsPage() {
  return (
    <PageLayout title="Lights">
      <EmptyState title="Light profile manager coming soon" description="Module 1.1" />
    </PageLayout>
  );
}
