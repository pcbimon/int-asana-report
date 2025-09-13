import { createClient } from '@/lib/server';
import { notFound, redirect } from 'next/navigation';
import { getUserAssignee, getLastUpdated } from '@/lib/storage';

// Maximum allowed age for sync metadata before forcing a resync (ms)
const SYNC_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 1 day

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
      if (last && last.lastUpdated) {
        const lastDate = new Date(last.lastUpdated).getTime();
        const now = Date.now();
        if (isFinite(lastDate) && now - lastDate > SYNC_MAX_AGE_MS) {
          // Force user to trigger/see the sync page
          redirect('/sync');
        } else {
          redirect('/dashboard');
        }
      }
    } catch (e) {
      // If checking sync metadata fails, log and continue to avoid blocking access
      console.error('Failed to check sync metadata:', e);
    }

    // const userRole = await getUserRole(user.id);
    const userAssignee = await getUserAssignee(user.id);

    if (userAssignee) {
      // Redirect to user's assignee dashboard
      redirect(`/dashboard/${encodeURIComponent(userAssignee)}`);
    } else {
      redirect('/error?code=403');
    }
  } catch (error) {
    // Next.js uses a thrown control-flow exception for `redirect()` with a digest
    // starting with 'NEXT_REDIRECT'. We must rethrow those so Next can handle
    // the redirect instead of treating it as an application error.
    const e = error as { message?: unknown; digest?: unknown };
    const isNextRedirect =
      (typeof e?.message === 'string' && e.message.includes('NEXT_REDIRECT')) ||
      (typeof e?.digest === 'string' && e.digest.startsWith('NEXT_REDIRECT'));

    if (isNextRedirect) throw error;

    console.error('Error loading dashboard index:', error);
    notFound();
  }
}
