/**
 * API Route for getting sync status
 * GET /api/sync/status - Get current sync status
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { getUserRole, getLastUpdated } from '@/lib/storage';

export async function GET() {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const userRole = await getUserRole(user.id);
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 });
    }

    // Get last sync status
    const lastSync = await getLastUpdated('asana_sync');

    return NextResponse.json({
      success: true,
      lastSync,
    });

  } catch (error) {
    console.error('Status API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}