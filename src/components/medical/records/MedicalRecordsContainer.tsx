import { useState } from 'react';
import { useUserId } from '../../../store/useStore';
import { notify } from '../../../lib/notify';
import { useMedicalData } from '../hooks/useMedicalData';
import { useMedicalRecordsHub } from '../hooks/useMedicalRecordsHub';
import type { MedicalTimelineItem } from '../../../lib/health/medicalRecords';
import { importMedicalLabResults } from '../../../lib/health/medicalRecordsApi';
import MedicalLaboratoryPage from '../MedicalLaboratoryPage';
import MedicalQuickEntryModal from './MedicalQuickEntryModal';
import MedicalRecordsView from './MedicalRecordsView';
import MedicalEventDetailDrawer from './MedicalEventDetailDrawer';
import MedicalDoctorSummaryModal from './MedicalDoctorSummaryModal';
import MedicalImport, { type ImportedMedicalResult, type LabResultEntryMeta } from '../sections/MedicalImport';

export default function MedicalRecordsContainer() {
  const userId = useUserId();

  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [showLabs, setShowLabs] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MedicalTimelineItem | null>(null);
  const [doctorSummaryOpen, setDoctorSummaryOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { labs, documents, refresh } = useMedicalData(userId);

  const {
    series,
    timeline,
    suggestions,
    summary,
    createMutation,
    deleteMutation,
    actionMutation,
    userContext,
  } = useMedicalRecordsHub(userId, labs, documents);

  const handleConfirmImport = async (results: ImportedMedicalResult[], meta: LabResultEntryMeta) => {
    if (!userId) return;
    try {
      await importMedicalLabResults({
        userId,
        docName: meta.docName,
        resultDate: meta.resultDate,
        provider: meta.provider,
        results,
      });
      await refresh();
      setImportOpen(false);
      notify('Wyniki laboratoryjne zostały pomyślnie zaimportowane.', 'success');
    } catch {
      notify('Błąd podczas importu wyników.', 'error');
    }
  };

  if (showLabs) return <MedicalLaboratoryPage onBack={() => setShowLabs(false)} />;

  return (
    <>
      <MedicalRecordsView
        timeline={timeline}
        summary={summary}
        suggestions={suggestions}
        onAdd={() => setQuickEntryOpen(true)}
        onOpenLabs={() => setShowLabs(true)}
        onOpenDoctorSummary={() => setDoctorSummaryOpen(true)}
        onImportLabs={() => setImportOpen(true)}
        onSelectItem={(item) => setSelectedItem(item)}
        onSuggestion={(suggestion, status) => actionMutation.mutate({ suggestion, status })}
      />

      {quickEntryOpen && (
        <MedicalQuickEntryModal
          isOpen
          saving={createMutation.isPending}
          onClose={() => setQuickEntryOpen(false)}
          onSave={async (draft) => {
            await createMutation.mutateAsync(draft);
            setQuickEntryOpen(false);
          }}
        />
      )}

      <MedicalEventDetailDrawer
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onOpenLabs={() => {
          setSelectedItem(null);
          setShowLabs(true);
        }}
        onDelete={async (eventId) => {
          await deleteMutation.mutateAsync(eventId);
          setSelectedItem(null);
        }}
      />

      <MedicalDoctorSummaryModal
        isOpen={doctorSummaryOpen}
        onClose={() => setDoctorSummaryOpen(false)}
        summary={summary}
        timeline={timeline}
        series={series}
        userAge={userContext?.age}
      />

      <MedicalImport
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        series={series}
        onConfirmImport={handleConfirmImport}
      />
    </>
  );
}
