import { useState } from 'react';
import { LightForm } from '../components/lights/LightForm';
import { LightList } from '../components/lights/LightList';
import { PageLayout } from '../components/shared/PageLayout';

type View = { mode: 'list' } | { mode: 'create' } | { mode: 'edit'; id: number };

export function LightsPage() {
  const [view, setView] = useState<View>({ mode: 'list' });

  function title() {
    if (view.mode === 'create') return 'New Light';
    if (view.mode === 'edit') return 'Edit Light';
    return 'Lights';
  }

  function backAction() {
    if (view.mode === 'list') return undefined;
    return (
      <button
        onClick={() => setView({ mode: 'list' })}
        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        ← Back to list
      </button>
    );
  }

  return (
    <PageLayout title={title()} actions={backAction()}>
      {view.mode === 'list' && (
        <LightList
          onNew={() => setView({ mode: 'create' })}
          onEdit={(id) => setView({ mode: 'edit', id })}
        />
      )}

      {view.mode === 'create' && (
        <LightForm
          onSaved={(id) => setView({ mode: 'edit', id })}
          onCancel={() => setView({ mode: 'list' })}
        />
      )}

      {view.mode === 'edit' && (
        <LightForm
          lightId={view.id}
          onSaved={() => setView({ mode: 'list' })}
          onCancel={() => setView({ mode: 'list' })}
        />
      )}
    </PageLayout>
  );
}

