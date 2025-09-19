/**
 * Header component for the dashboard
 * Shows assignee name and export buttons
 */

import { Assignee } from '@/models/asanaReport';
import { ExportButtons } from '@/components/ExportButtons';
import { LogoutButton } from '@/components/logout-button';

interface HeaderProps {
  assignee: Assignee;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
}

export function Header({ assignee, onExportPDF, onExportExcel }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Use column-reverse on small screens so actions fall below the title block */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center py-6 gap-4">
          <div className="flex items-start sm:items-center w-full sm:w-auto">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Dashboard
              </h1>
              <div className="mt-1">
                <h2 className="text-lg sm:text-xl text-gray-600">
                  {assignee.name}
                </h2>
                {/* hide email on very small screens to save space */}
                {assignee.email && (
                  <p className="hidden xs:block text-sm text-gray-500">
                    {assignee.email}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 w-full sm:w-auto justify-start sm:justify-end">
            {/* Keep export buttons and logout accessible; on very small screens they will appear below the title */}
            <ExportButtons 
              onExportPDF={onExportPDF}
              onExportExcel={onExportExcel}
            />
            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  );
}