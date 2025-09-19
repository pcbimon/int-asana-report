/**
 * Client-side Dashboard component for root-level dashboard route
 */

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Assignee, AssigneeMetrics, Section, FilterOptions, AsanaReport } from '@/models/asanaReport';
import { generateExportData } from '@/lib/dataProcessor';
import { Header } from '@/components/Header';
import { KpiCards } from '@/components/KpiCards';
import { WeeklySummaryChart } from '@/components/WeeklySummaryChart';
import { CurrentTasksTable } from '@/components/CurrentTasksTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from '@/components/ui/command';
import { RefreshCw, Users, Settings, ChevronsUpDown, Check } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
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
  availableAssignees?: Assignee[];
  availableDepartments?: { departmentId: string; name_en: string; assignee: Assignee[] }[];
}

export function DashboardClient({
  assignee,
  metrics,
  sections,
  userRole,
  isAdmin,
  lastSyncTime,
  availableAssignees = [],
  availableDepartments = [],
}: DashboardClientProps) {
  const [filters] = useState<FilterOptions>({});
  const [isExporting, setIsExporting] = useState(false);
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const router = useRouter();

  const expectedCompletionTasks = parseInt(
    process.env.NEXT_PUBLIC_EXPECTED_COMPLETION_TASKS || '3'
  );

  const filteredMetrics = useMemo(() => metrics, [metrics]);

  // Determine display name for currently selected assignee.
  // availableDepartments contains assignee objects with `name` prepared as firstname(nickname)
  const currentAssigneeDisplay = (() => {
    try {
      if (!assignee) return undefined;
      // Search departments for a matching gid
      for (const dept of availableDepartments || []) {
        const found = (dept.assignee || []).find(a => a.gid === assignee.gid);
        if (found && found.name) return found.name;
      }
      // fallback to assignee.name (maybe already populated) or email
      return assignee.name ?? assignee.email;
    } catch {
      return assignee?.name ?? assignee?.email;
    }
  })();

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const printWindow = window.open('', '_blank');
      if (!printWindow) throw new Error('Unable to open print window');
      const dashboardElement = document.getElementById('dashboard-content');
      if (!dashboardElement) throw new Error('Dashboard content not found');
      const canvas = await html2canvas(dashboardElement, { scale: 2, useCORS: true, allowTaint: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgWidth = 297;
      const pageHeight = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`dashboard-${assignee.name}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const report = new AsanaReport(sections);
      const exportData = generateExportData(report, filters);
      const wb = XLSX.utils.book_new();
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
      if (exportData.length > 0) {
        const tasksWS = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, tasksWS, 'Tasks Detail');
      }
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
      XLSX.writeFile(wb, `dashboard-${assignee.name}-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Failed to export Excel. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefresh = () => window.location.reload();

  return (
    <div className="min-h-screen bg-gray-50">
      <div id="dashboard-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Header assignee={assignee} onExportPDF={handleExportPDF} onExportExcel={handleExportExcel} />

        <div className="py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:flex-nowrap gap-3">
            {/* Left: badge + controls */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Badge className="hidden sm:inline-flex" variant={userRole === 'admin' ? 'default' : 'secondary'}>
                {userRole === 'admin' ? (
                  <>
                    <Users className="w-3 h-3 mr-1" />
                    Admin
                  </>
                ) : (
                  'User'
                )}
              </Badge>

              {isAdmin && availableAssignees.length > 0 && (
                <div className="min-w-0">
                  <label className="sr-only">Select assignee</label>
                  <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={assigneePopoverOpen} className="w-[220px] max-w-full truncate justify-between" size="sm">
                        {assignee ? `${currentAssigneeDisplay}` : 'Select assignee...'}
                        <ChevronsUpDown className="opacity-50 ml-2" />
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent className="p-0">
                      <Command>
                        <CommandInput placeholder="Search assignee..." className="h-9" />
                        <CommandList>
                          <CommandEmpty>No assignee found.</CommandEmpty>
                          {/* Prefer grouping from availableDepartments if provided */}
                          {availableDepartments && availableDepartments.length > 0 ? (
                            availableDepartments.map((dept) => (
                              <CommandGroup key={dept.departmentId} heading={dept.name_en}>
                                {(dept.assignee || []).map(a => {
                                  const rawName = a.name ?? '';
                                  let firstname = '';
                                  let nickname = '';
                                  const nickMatch = rawName.match(/^([^(]+)\(([^)]+)\)$/);
                                  if (nickMatch) {
                                    firstname = nickMatch[1].trim();
                                    nickname = nickMatch[2].trim();
                                  } else {
                                    firstname = rawName;
                                  }

                                  const searchValue = `${a.gid} ${a.email ?? ''} ${firstname} ${nickname}`.trim();

                                  return (
                                    <CommandItem
                                      key={a.gid}
                                      value={searchValue}
                                      onSelect={() => {
                                        setAssigneePopoverOpen(false);
                                        router.push(`/dashboard/${a.gid}`);
                                      }}
                                      className="flex items-center gap-2"
                                    >
                                      <span className="truncate">{a.name ?? a.email}</span>
                                      <Check className={assignee.gid === a.gid ? 'ml-auto opacity-100' : 'ml-auto opacity-0'} />
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            ))
                          ) : null}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Hide lastSync on very small screens to save space */}
              {lastSyncTime && (
                <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
                  <RefreshCw className="w-3 h-3" />
                  <span className="truncate">Last synced: {new Date(lastSyncTime).toLocaleString()}</span>
                </div>
              )}

              {isAdmin && (
                  <div className="ml-auto flex items-center space-x-2 sm:shrink-0">
                    <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => window.location.href = '/sync'}>
                      <Settings className="w-4 h-4 mr-1" />
                      Sync Data
                    </Button>
                    <Button variant="outline" size="sm" className="sm:hidden" onClick={() => window.location.href = '/sync'}>
                      <Settings className="w-4 h-4" />
                    </Button>

                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isExporting}>
                      <RefreshCw className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Refresh</span>
                    </Button>
                  </div>
                )}
              </div>
          </div>
        </div>

        <div className="space-y-8 pb-8">
          <KpiCards metrics={filteredMetrics} />

          <WeeklySummaryChart weeklyData={filteredMetrics.weeklyTimeseries} expectedCompletionTasks={expectedCompletionTasks} title={`Weekly Summary - ${assignee.name}`} />

          <CurrentTasksTable sections={sections} assigneeGid={assignee.gid} pageSize={15} />

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
