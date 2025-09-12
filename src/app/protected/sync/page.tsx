/**
 * Sync Page - Trigger data fetch from Asana and save to Supabase
 * Shows last sync time and status, admin only
 */

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/server';
import { getUserRole, getLastUpdated } from '@/lib/storage';
import { SyncClient } from './SyncClient';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Loading skeleton
function SyncSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center space-x-4">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-lg">Loading sync page...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default async function SyncPage() {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      notFound();
    }

    // Check if user is admin
    const userRole = await getUserRole(user.id);
    if (userRole !== 'admin') {
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Card>
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-bold text-red-600 mb-4">
                  Access Denied
                </h2>
                <p className="text-gray-600">
                  Only administrators can access the sync page.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // Get last sync status
    const lastSync = await getLastUpdated();

    return (
      <Suspense fallback={<SyncSkeleton />}>
        <SyncClient lastSync={lastSync} userEmail={user.email || ''} />
      </Suspense>
    );

  } catch (error) {
    console.error('Error loading sync page:', error);
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-4">
                Error Loading Sync Page
              </h2>
              <p className="text-gray-600 mb-6">
                There was an error loading the sync page. Please try again or contact support.
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

// Generate metadata
export const metadata = {
  title: 'Sync Data - Asana Dashboard',
  description: 'Sync data from Asana to the dashboard database.',
};