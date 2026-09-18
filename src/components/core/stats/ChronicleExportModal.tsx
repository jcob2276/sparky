import { memo } from 'react';
import Modal from '../../ui/Modal';
import { DataExportSection } from './DataExportSection';

interface ChronicleExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateRange: { from: string; to: string };
  setDateRange: (range: { from: string; to: string }) => void;
  includeWorkouts: boolean;
  setIncludeWorkouts: (v: boolean) => void;
  includeBody: boolean;
  setIncludeBody: (v: boolean) => void;
  includeNutrition: boolean;
  setIncludeNutrition: (v: boolean) => void;
  includeJournal: boolean;
  setIncludeJournal: (v: boolean) => void;
  includeOura: boolean;
  setIncludeOura: (v: boolean) => void;
  includeHabits: boolean;
  setIncludeHabits: (v: boolean) => void;
  includeActivityWatch: boolean;
  setIncludeActivityWatch: (v: boolean) => void;
  includeFundament: boolean;
  setIncludeFundament: (v: boolean) => void;
  exportData: () => void;
  isExporting: boolean;
  copyData?: () => void;
  isCopying?: boolean;
}

export const ChronicleExportModal = memo(function ChronicleExportModal({
  isOpen,
  onClose,
  ...exportProps
}: ChronicleExportModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Eksport & Kopia Danych"
      subtitle="Pobierz pełny raport w formacie Markdown lub skopiuj do schowka"
      size="lg"
      padding="p-4 sm:p-6"
    >
      <div className="pt-2">
        <DataExportSection {...exportProps} />
      </div>
    </Modal>
  );
});
