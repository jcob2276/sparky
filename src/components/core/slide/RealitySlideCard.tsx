import { useState } from 'react';
import { useUserId } from '../../../store/useStore';
import { useRealitySlide } from '../../../lib/realitySlideApi';
import { notify } from '../../../lib/notify';
import type { SlideDraft } from '../../../lib/realitySlide';
import { RealitySlideSheet } from './RealitySlideSheet';
import { RealitySlideView } from './RealitySlideView';

export default function RealitySlideCard() {
  const userId = useUserId();
  const { query, save } = useRealitySlide(userId ?? '');
  const [editing, setEditing] = useState(false);
  const onSave = (draft: SlideDraft) => {
    save.mutate(draft, {
      onSuccess: () => setEditing(false),
      onError: () => notify('Nie udało się zapisać slajdu. Spróbuj ponownie.', 'error'),
    });
  };
  return (
    <>
      <RealitySlideView slide={query.data ?? null} loading={query.isLoading} error={query.isError}
        onRetry={() => { void query.refetch(); }} onEdit={() => setEditing(true)} />
      <RealitySlideSheet open={editing} slide={query.data ?? null} saving={save.isPending}
        onClose={() => setEditing(false)} onSave={onSave} />
    </>
  );
}
