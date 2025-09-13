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

    if (userRole !== 'admin' && userAssignee) {
      // Redirect to user's assignee dashboard
      redirect(`/dashboard/${encodeURIComponent(userAssignee)}`);
    }

    // Admin: show list of assignees
    const assignees = await getAllAssigneesFromDB();

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent>
              <h2 className="text-2xl font-bold mb-4">Select Assignee</h2>
              <ul className="space-y-2">
                {assignees.map(a => (
                  <li key={a.gid}>
                    <Link href={`/dashboard/${a.gid}`} className="text-blue-600 hover:underline">{a.email || a.name}</Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading dashboard index:', error);
    notFound();
  }
}
