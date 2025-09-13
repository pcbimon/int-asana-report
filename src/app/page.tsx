import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';

export default async function RootPage() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      // Not authenticated — redirect to login
      redirect('/auth/login');
    }

    // If authenticated, redirect to dashboard index which will further route based on role
    redirect('/dashboard');
  } catch (err) {
    console.error('Error checking auth on root page:', err);
    // Fallback to login on error
    redirect('/auth/login');
  }
}
