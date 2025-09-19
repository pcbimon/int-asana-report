/**
 * Root-level Sync Page - enforces auth and admin-only access
 */

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/server';
import { getUserRole, getLastUpdated } from '@/lib/storage';
import { SyncClient } from '@/components/SyncClient';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

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

// This page uses server-side cookies via `createClient()`; mark as dynamic
export const dynamic = 'force-dynamic';

type SearchParamsObj = { [key: string]: string | string[] | undefined };

export default async function SyncPage({ searchParams }: { searchParams?: SearchParamsObj | Promise<SearchParamsObj> }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      redirect('/auth/login');
    }

  const userEmail = user.email || '';
  const userRole = await getUserRole(userEmail);
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

  const lastSync = await getLastUpdated();

  // searchParams may be a promise in Next.js; await it and provide a typed default
  const params: SearchParamsObj = (await searchParams) ?? {};

  // parse boolean-ish query param safely (supports string or string[])
  const parseBooleanParam = (p: string | string[] | undefined) => {
    if (typeof p === 'string') return p === 'true';
    if (Array.isArray(p)) return p.includes('true');
    return false;
  };

  const force = parseBooleanParam(params.force);

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
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
}

export const metadata = {
  title: 'Sync Data - Asana Dashboard',
  description: 'Sync data from Asana to the dashboard database.',
};
