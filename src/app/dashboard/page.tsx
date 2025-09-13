import Link from 'next/link';
import { createClient } from '@/lib/server';
import { notFound, redirect } from 'next/navigation';
import { getUserRole, getUserAssignee, getAllAssigneesFromDB } from '@/lib/storage';
import { Card, CardContent } from '@/components/ui/card';

export default async function DashboardIndexPage() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      redirect('/auth/login');
    }

    const userRole = await getUserRole(user.id);
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
    const e = error as any;
    const isNextRedirect =
      (typeof e?.message === 'string' && e.message.includes('NEXT_REDIRECT')) ||
      (typeof e?.digest === 'string' && e.digest.startsWith('NEXT_REDIRECT'));

    if (isNextRedirect) throw error;

    console.error('Error loading dashboard index:', error);
    notFound();
  }
}
