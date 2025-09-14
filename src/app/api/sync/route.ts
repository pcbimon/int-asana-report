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

export async function POST(request: NextRequest) {
  try {
    // Check authentication
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
    const body = await request.json();
  const { userEmail } = body;

  console.log(`Sync started by: ${userEmail}`);

    // Set sync status to in-progress
    await setLastUpdated('asana_sync', 'in-progress', 'Sync started');

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
            message: `Sync completed by ${userEmail}`,
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