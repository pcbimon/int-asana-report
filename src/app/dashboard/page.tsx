import { createClient } from '@/lib/server';
import { notFound, redirect } from 'next/navigation';
import { getUserAssignee, getLastUpdated, getUserRole } from '@/lib/storage';

// Maximum allowed age for sync metadata before forcing a resync (ms)
const SYNC_MAX_AGE_MS = 60 * 60 * 1000; // 1 day

// Helper to detect Next.js control-flow redirect errors so we can rethrow them
const isNextRedirect = (err: unknown) => {
  const e = err as { message?: unknown; digest?: unknown } | undefined;
  return (
    (typeof e?.message === 'string' && e.message.includes('NEXT_REDIRECT')) ||
    (typeof e?.digest === 'string' && String(e.digest).startsWith('NEXT_REDIRECT'))
  );
};

// NOTE: Ensure this file is a Server Component (REMOVE any "use client" at the top).
export const dynamic = 'force-dynamic';
export default async function DashboardIndexPage() {
  try {

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      redirect('/auth/login');
    }

    // Check last sync time and redirect to /sync if it's older than 1 day
    // Resolve user email once
    const userEmail = user.email || '';

    // Check sync metadata + role, but keep logic simple:
    // - If admin and last sync is too old => force /sync
    // - Otherwise continue and redirect to the user's assignee dashboard (or 403)
    let forceSync = false;
    try {
      const last = await getLastUpdated();
      const role = await getUserRole(userEmail);
      if (role === 'admin' && last?.lastUpdated) {
        const lastDate = Date.parse(last.lastUpdated);
        if (isFinite(lastDate) && Date.now() - lastDate > SYNC_MAX_AGE_MS) {
          forceSync = true;
        }
      }
    } catch (e) {
      // Preserve Next.js redirect control-flow exceptions
      if (isNextRedirect(e)) throw e;
      // Log and continue if metadata/role check fails
      console.error('Failed to check sync metadata or user role:', e);
    }

    if (forceSync) {
      // Force admins to the sync page when data is stale
      redirect('/sync?force=true');
    }

    // Resolve assignee and redirect (same for admin and non-admin)
    const userAssignee = await getUserAssignee(userEmail);
    if (userAssignee) {
      redirect(`/dashboard/${encodeURIComponent(userAssignee)}`);
    } else {
      redirect('/error?code=403');
    }
  } catch (error) {
    // Next.js uses a thrown control-flow exception for `redirect()` with a digest
    // starting with 'NEXT_REDIRECT'. We must rethrow those so Next can handle
    // the redirect instead of treating it as an application error.
    if (isNextRedirect(error)) throw error;

    console.error('Error loading dashboard index:', error);
    notFound();
  }
}
