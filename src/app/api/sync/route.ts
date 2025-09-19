/**
 * API Route for syncing data from Asana to Supabase
 * POST /api/sync - Start sync process
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { getUserRole } from '@/lib/storage';
import { fetchCompleteReport } from '@/lib/asanaApi';
import { saveReport, setLastUpdated } from '@/lib/storage';
import { AsanaReport } from '@/models/asanaReport';
export const dynamic = 'force-static';
export async function POST(request: NextRequest) {
  try {
    // Allow server-to-server scheduled jobs to call this endpoint using a service key
    const serviceKey = request.headers.get('x-sync-service-key');
    const expectedKey = process.env.SYNC_SERVICE_KEY;

    let initiatorEmail = '';

    if (serviceKey && expectedKey && serviceKey === expectedKey) {
      // Authorized as scheduled job
      initiatorEmail = 'scheduled-job';
      console.log('Sync triggered by service key (scheduled job)');
    } else {
      // Fallback to the existing supabase session-based auth flow
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Check if user is admin (lookup by email)
      const authUserEmail = user.email || '';
      const userRole = await getUserRole(authUserEmail);
      if (userRole !== 'admin') {
        return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 });
      }

      // Parse request body
      const body = await request.json().catch(() => ({}));
      const { userEmail } = body as { userEmail?: string };
      initiatorEmail = userEmail || authUserEmail;

      console.log(`Sync started by: ${initiatorEmail}`);
    }

    // Set sync status to in-progress
    await setLastUpdated('asana_sync', 'in-progress', `Sync started by ${initiatorEmail}`);

    try {
      // Fetch data from Asana
      console.log('Fetching data from Asana API...');
      const { sections, totalTasks, totalSubtasks, assigneeMap } = await fetchCompleteReport();

      // Create AsanaReport instance
      const report = new AsanaReport(sections);
      // Apply assignee map to report
      report.applyAssigneeMap(assigneeMap);
      // Set team members
      report.setTeamMembers(Array.from(assigneeMap.values()));
      // Save to Supabase
      console.log('Saving data to Supabase...');
      const result = await saveReport(report, 'asana_sync');

      if (result.success) {
        console.log(`Sync completed successfully. ${result.recordCount} records processed.`);

        return NextResponse.json({
          success: true,
          message: `Sync completed successfully. Processed ${totalTasks} tasks and ${totalSubtasks} subtasks.`,
          recordCount: result.recordCount,
          metadata: {
            key: 'asana_sync',
            lastUpdated: new Date().toISOString(),
            status: 'success',
            message: `Sync completed by ${initiatorEmail}`,
            recordCount: result.recordCount,
          },
        });
      } else {
        throw new Error(result.message);
      }

    } catch (syncError) {
      console.error('Sync error:', syncError);

      // Update sync status to error
      const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown sync error';
      await setLastUpdated('asana_sync', 'error', errorMessage);

      return NextResponse.json({
        success: false,
        error: 'Sync failed',
        message: errorMessage,
      }, { status: 500 });
    }

  } catch (error) {
    console.error('API error:', error);

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}