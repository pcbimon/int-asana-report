/**
 * Individual Dashboard Page - Dynamic route for assignee
 * Server-side rendered with data from Supabase
 */

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/server';
import { loadReport, hasData, getUserRole, getUserAssignee, getLastUpdated, getAllAssigneesFromDB } from '@/lib/storage';
import { getAssigneeMetrics } from '@/lib/dataProcessor';
import { DashboardClient } from './DashboardClient';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Assignee } from '@/models/asanaReport';

interface DashboardPageProps {
  params: { assignee: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

// Loading skeleton component
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center space-x-4">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-lg">Loading dashboard...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  // Next.js may pass params as a Promise — await to ensure we can read properties safely
  const resolvedParams = (await Promise.resolve(params)) as { assignee: string };
  const assigneeGid = decodeURIComponent(resolvedParams.assignee);

  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      // Redirect to login (this should be handled by middleware)
      notFound();
    }

    // Check if user has access to this assignee
    const userRole = await getUserRole(user.id);
    const userAssignee = await getUserAssignee(user.id);

    // Admin can view any assignee, regular users can only view their own
    if (userRole !== 'admin' && userAssignee !== assigneeGid) {
      notFound();
    }

    // Check if data exists in database
    const dataExists = await hasData();
    if (!dataExists) {
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Card>
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  No Data Available
                </h2>
                <p className="text-gray-600 mb-6">
                  Please sync data from Asana to view the dashboard.
                </p>
                <a
                  href="/sync"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go to Sync Page
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

  // Load data from Supabase (filtered to this assignee)
  const report = await loadReport(assigneeGid);
    
    // Find the assignee
    const allAssignees = report.getAllAssignees();
    const assignee = allAssignees.find(a => a.gid === assigneeGid);
    if (!assignee) {
      notFound();
    }

    // Get metrics for this assignee
    const metrics = getAssigneeMetrics(report, assigneeGid);
    
    if (!metrics) {
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Card>
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  No Tasks Found
                </h2>
                <p className="text-gray-600">
                  No tasks found for {assignee.name}. They may not have any assigned subtasks in the current data.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // Get available options for filters
    const availableProjects = Array.from(new Set(
      report.sections.flatMap(section => 
        section.tasks.map(task => task.project).filter(Boolean)
      )
    )) as string[];

    const availableSections = report.sections.map(section => section.name);

    // If admin, fetch the list of all assignees for the dropdown selector
    let availableAssignees = [] as Assignee[];
    if (userRole === 'admin') {
      try {
        availableAssignees = await getAllAssigneesFromDB();
      } catch (e) {
        console.error('Failed to load available assignees:', e);
        availableAssignees = [];
      }
    }

    // Get last sync time
    const lastSyncMetadata = await getLastUpdated();
    const lastSyncTime = lastSyncMetadata?.lastUpdated || null;

    // Pass data to client component
    return (
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardClient
          assignee={assignee}
          metrics={metrics}
          sections={report.sections}
          availableProjects={availableProjects}
          availableSections={availableSections}
          userRole={userRole}
          isAdmin={userRole === 'admin'}
          lastSyncTime={lastSyncTime}
          availableAssignees={availableAssignees}
        />
      </Suspense>
    );

  } catch (error) {
    console.error('Error loading dashboard:', error);
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-4">
                Error Loading Dashboard
              </h2>
              <p className="text-gray-600 mb-6">
                There was an error loading the dashboard data. Please try again or contact support.
              </p>
              <details className="text-left bg-gray-100 p-4 rounded-md">
                <summary className="cursor-pointer font-medium">Error Details</summary>
                <pre className="mt-2 text-sm text-red-600">
                  {error instanceof Error ? error.message : 'Unknown error'}
                </pre>
              </details>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
}

// Generate metadata for the page
export async function generateMetadata({ params }: DashboardPageProps) {
  // Next.js may pass params as a Promise — await to ensure we can read properties safely
  const resolvedParams = await (params as unknown as Promise<{ assignee: string }> | { assignee: string });
  const assigneeGid = decodeURIComponent((resolvedParams as any).assignee);

  try {
  const report = await loadReport(assigneeGid);
    const assignee = report.getAllAssignees().find(a => a.gid === assigneeGid);
    
    return {
      title: assignee ? `Dashboard - ${assignee.name}` : 'Dashboard',
      description: `Individual dashboard for ${assignee?.name || 'assignee'} showing task metrics and progress.`,
    };
  } catch {
    return {
      title: 'Dashboard',
      description: 'Individual dashboard showing task metrics and progress.',
    };
  }
}