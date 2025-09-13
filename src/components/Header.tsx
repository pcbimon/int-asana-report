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
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Dashboard
            </h1>
            <div className="ml-4">
              <h2 className="text-xl text-gray-600">
                {assignee.name}
              </h2>
              {assignee.email && (
                <p className="text-sm text-gray-500">
                  {assignee.email}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
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