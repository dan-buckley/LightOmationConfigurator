import { EmptyState } from '../components/shared/EmptyState';
import { PageLayout } from '../components/shared/PageLayout';

export function PresetsPage() {
  return (
    <PageLayout title="Preset Library">
      <EmptyState title="Master preset library coming soon" description="Module 1.3" />
    </PageLayout>
  );
}
