import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';

export default async function RootPage() {
  // Attempt to get the current user; any thrown NEXT_REDIRECT from `redirect()` must not be caught here
  let user = null;
  try {
    const supabase = await createClient();
    const result = await supabase.auth.getUser();
    // result shape: { data: { user: User | null }, error }
    if (result && result.data) {
      user = result.data.user ?? null;
    }
    if (result && result.error) {
      // Log non-fatal auth errors but don't convert them into a redirect exception here
      console.error('supabase.auth.getUser error on root page:', result.error);
    }
  } catch (err) {
    // Only log unexpected errors — do not swallow Next.js redirect control flow
    console.error('Unexpected error checking auth on root page:', err);
  }

  // Decide redirect based on presence of user. Keep redirect() calls outside of try/catch above so
  // Next's internal control-flow exception is not accidentally caught.
  if (!user) {
    redirect('/auth/login');
  }

  redirect('/dashboard');
}
