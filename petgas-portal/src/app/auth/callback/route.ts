import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; // Ensure this path is correct

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/client/profile'; // Default redirect to profile

  if (code) {
    try {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
            console.error('Error exchanging code for session:', exchangeError);
            // Redirect to an error page or login page with an error message
            return NextResponse.redirect(`${origin}/login?error=Failed to log in. Please try again.`);
        }
        // On successful exchange, Supabase client automatically sets the session.
        // Now, ensure the client record exists. This might be better handled on the profile page itself.
        // For now, just redirect.
        return NextResponse.redirect(`${origin}${next}`);
    } catch (e: any) {
        console.error('Catch block error during auth callback:', e);
        return NextResponse.redirect(`${origin}/login?error=An unexpected error occurred. Please try again.`);
    }

  } else {
    console.error('No auth code found in callback URL');
    // Redirect to an error page or login page if no code is present
    return NextResponse.redirect(`${origin}/login?error=Invalid login link.`);
  }
}
