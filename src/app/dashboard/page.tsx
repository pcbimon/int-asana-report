import { createClient } from '@/lib/server';
import { notFound, redirect } from 'next/navigation';
import { getUserAssignee, getLastUpdated, getUserRole } from '@/lib/storage';

// Maximum allowed age for sync metadata before forcing a resync (ms)
const SYNC_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 1 day

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
    try {
      const last = await getLastUpdated();
      const userRole = await getUserRole(user.email!);
      if (last && last.lastUpdated && userRole === 'admin') {
        const lastDate = new Date(last.lastUpdated).getTime();
        const now = Date.now();
        if (isFinite(lastDate) && now - lastDate > SYNC_MAX_AGE_MS) {
          // Force user to trigger/see the sync page
          redirect('/sync');
        } else {
          const userAssignee = await getUserAssignee(user.email || '');
          if (userAssignee) {
            // Redirect to user's assignee dashboard
            redirect(`/dashboard/${encodeURIComponent(userAssignee)}`);
          } else {
            // If no mapping was found, deny access
            redirect('/error?code=403');
          }
        }
      }
    } catch (e) {
      // If the caught error is a Next.js redirect control-flow exception, rethrow
      if (isNextRedirect(e)) throw e;
      // Otherwise log and continue to avoid blocking access from sync metadata failures
      console.error('Failed to check sync metadata:', e);
    }

    // Use user email to resolve the assignee gid (assignees.email)
    const userEmail = user.email || '';
    
    const userAssignee = await getUserAssignee(userEmail);

    if (userAssignee) {
      // Redirect to user's assignee dashboard
      redirect(`/dashboard/${encodeURIComponent(userAssignee)}`);
    } else {
      // If no mapping was found, deny access
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
