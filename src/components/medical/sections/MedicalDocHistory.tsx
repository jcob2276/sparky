import { FileText, Download } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Pressable } from '../../ui/ControlPrimitives';
import { downloadFromUrl } from '../../../lib/download';
import type { MedicalDocumentRow } from '../../../lib/health/medicalAnalytics';
import { formatMedicalDocumentType } from '../../../lib/health/medicalRecords';

interface MedicalDocHistoryProps {
  documents: MedicalDocumentRow[];
}

export default function MedicalDocHistory({ documents }: MedicalDocHistoryProps) {
  return (
    <div className="space-y-4">
      <div className="border-b border-border-custom/50 pb-3">
        <h2 className="text-lg font-black uppercase font-display">4. Historia Dokumentów</h2>
        <p className="text-2xs text-text-muted mt-0.5">Oryginalne dokumenty i surowe raporty laboratoryjne jako źródło prawdy</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.map(doc => {
          const typeInfo = formatMedicalDocumentType(doc.document_type);
          
          return (
            <Card
              key={doc.id}
              variant="outline"
              padding="1rem"
              className="bg-background/25 border-border-custom hover:bg-background/40 ui-interactive flex flex-col justify-between min-h-[160px]"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary min-w-0 flex-1">
                    <FileText size={14} className="text-text-muted shrink-0" />
                    <span className="truncate" title={doc.source_name}>
                      {doc.source_name}
                    </span>
                  </div>
                  <span className={`text-3xs font-black uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${typeInfo.badgeColor}`}>
                    {typeInfo.label}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-3xs font-semibold text-text-secondary">
                  <p>
                    <span className="text-text-muted uppercase font-black">Data badania:</span> {doc.document_date}
                  </p>
                  <p>
                    <span className="text-text-muted uppercase font-black">Laboratorium / Źródło:</span> {doc.provider || 'Nieznane'}
                  </p>
                  {doc.summary && (
                    <p className="text-text-muted italic truncate mt-1">
                      "{doc.summary}"
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-border-custom/40 pt-2.5 flex items-center justify-between text-3xs">
                <span className="text-text-muted font-bold">
                  Dodano: {doc.created_at?.slice(0, 10)}
                </span>
                
                {doc.source_path ? (
                  <Pressable
                    type="button"
                    onClick={() => {
                      const filename = doc.source_name || 'dokument-medyczny.pdf';
                      void downloadFromUrl(doc.source_path!, filename);
                    }}
                    className="flex items-center gap-1 font-black uppercase text-primary hover:underline cursor-pointer"
                  >
                    <Download size={10} /> Pobierz źródło
                  </Pressable>
                ) : (
                  <span className="text-text-muted italic">Raport cyfrowy</span>
                )}
              </div>
            </Card>
          );
        })}

        {documents.length === 0 && (
          <div className="col-span-2 rounded-xl border border-dashed border-border-custom py-12 text-center">
            <p className="text-xs text-text-muted italic">Brak zapisanych oryginalnych dokumentów PDF.</p>
          </div>
        )}
      </div>
    </div>
  );
}
