/**
 * Client-side Dashboard component
 * Handles interactive features like filters, export, and real-time updates
 */

'use client';

import { useState, useMemo } from 'react';
import { Assignee, AssigneeMetrics, Section, FilterOptions, AsanaReport } from '@/models/asanaReport';
import { generateExportData } from '@/lib/dataProcessor';
import { Header } from '@/components/Header';
import { KpiCards } from '@/components/KpiCards';
import { WeeklySummaryChart } from '@/components/WeeklySummaryChart';
import { CurrentTasksTable } from '@/components/CurrentTasksTable';
import { FiltersPanel } from '@/components/FiltersPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Users, Settings } from 'lucide-react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface DashboardClientProps {
  assignee: Assignee;
  metrics: AssigneeMetrics;
  sections: Section[];
  availableProjects: string[];
  availableSections: string[];
  userRole: string | null;
  isAdmin: boolean;
  lastSyncTime: string | null;
}

export function DashboardClient({
  assignee,
  metrics,
  sections,
  availableProjects,
  availableSections,
  userRole,
  isAdmin,
  lastSyncTime,
}: DashboardClientProps) {
  const [filters, setFilters] = useState<FilterOptions>({});
  const [isExporting, setIsExporting] = useState(false);

  // Get expected completion tasks from environment (default: 3)
  const expectedCompletionTasks = parseInt(
    process.env.NEXT_PUBLIC_EXPECTED_COMPLETION_TASKS || '3'
  );

  // Filter metrics based on current filters
  const filteredMetrics = useMemo(() => {
    // For now, return the original metrics
    // In the future, this could be enhanced to apply filters to metrics
    return metrics;
  }, [metrics]); // Removed 'filters' dependency as it's not used in the function

  // Handle PDF export
  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      
      // Create a printable version of the dashboard
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Unable to open print window');
      }

      // Get dashboard content
      const dashboardElement = document.getElementById('dashboard-content');
      if (!dashboardElement) {
        throw new Error('Dashboard content not found');
      }

      // Create canvas from the dashboard
      const canvas = await html2canvas(dashboardElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
      const imgWidth = 297; // A4 landscape width in mm
      const pageHeight = 210; // A4 landscape height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      // Add the image to PDF
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add more pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save the PDF
      pdf.save(`dashboard-${assignee.name}-${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Excel export
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);

      // Generate export data
      const report = new AsanaReport(sections);
      const exportData = generateExportData(report, filters);

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Add summary sheet
      const summaryData = [
        ['Dashboard Summary'],
        ['Assignee', assignee.name],
        ['Email', assignee.email || ''],
        ['Total Tasks', metrics.total],
        ['Completed', metrics.completed],
        ['Completion Rate', `${Math.round(metrics.completionRate * 100)}%`],
        ['Overdue', metrics.overdue],
        ['Avg Lead Time (days)', metrics.avgTime.toFixed(1)],
        [''],
        ['Generated', new Date().toISOString()],
      ];

      const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');

      // Add tasks detail sheet
      if (exportData.length > 0) {
        const tasksWS = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, tasksWS, 'Tasks Detail');
      }

      // Add weekly data sheet
      const weeklyData = metrics.weeklyTimeseries.map(week => ({
        Week: week.week,
        'Week Start': week.weekStart,
        Assigned: week.assigned,
        Completed: week.completed,
      }));

      if (weeklyData.length > 0) {
        const weeklyWS = XLSX.utils.json_to_sheet(weeklyData);
        XLSX.utils.book_append_sheet(wb, weeklyWS, 'Weekly Data');
      }

      // Save the file
      XLSX.writeFile(wb, `dashboard-${assignee.name}-${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Failed to export Excel. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle page refresh
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div id="dashboard-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <Header
          assignee={assignee}
          onExportPDF={handleExportPDF}
          onExportExcel={handleExportExcel}
        />

        {/* User Role Badge and Actions */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-4">
            <Badge variant={userRole === 'admin' ? 'default' : 'secondary'}>
              {userRole === 'admin' ? (
                <>
                  <Users className="w-3 h-3 mr-1" />
                  Admin
                </>
              ) : (
                'User'
              )}
            </Badge>

            {lastSyncTime && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <RefreshCw className="w-3 h-3" />
                <span>Last synced: {new Date(lastSyncTime).toLocaleString()}</span>
              </div>
            )}

            {isAdmin && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/protected/sync'}
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Sync Data
                </Button>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isExporting}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>

        {/* Main Dashboard Content */}
        <div className="space-y-8 pb-8">
          {/* KPI Cards */}
          <KpiCards metrics={filteredMetrics} />

          {/* Weekly Summary Chart */}
          <WeeklySummaryChart
            weeklyData={filteredMetrics.weeklyTimeseries}
            expectedCompletionTasks={expectedCompletionTasks}
            title={`Weekly Summary - ${assignee.name}`}
          />

          {/* Current Tasks Table */}
          <CurrentTasksTable
            sections={sections}
            assigneeGid={assignee.gid}
            pageSize={15}
          />

          {/* Export Status */}
          {isExporting && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 text-blue-600">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Exporting data...</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}