/**
 * Export buttons component for PDF and Excel export
 */

import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';

interface ExportButtonsProps {
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  disabled?: boolean;
}

export function ExportButtons({ onExportPDF, onExportExcel, disabled = false }: ExportButtonsProps) {
  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onExportPDF}
        disabled={disabled}
        className="flex items-center space-x-2"
      >
        <FileText className="w-4 h-4" />
        <span>Export PDF</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onExportExcel}
        disabled={disabled}
        className="flex items-center space-x-2"
      >
        <Download className="w-4 h-4" />
        <span>Export Excel</span>
      </Button>
    </div>
  );
}