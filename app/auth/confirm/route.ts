import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = await createClient();

  if (code) {
    // PKCE flow: exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/lehrer/dashboard", origin));
    }
  } else if (token_hash && type) {
    // Implicit flow: verify the OTP
    const { error } = await supabase.auth.verifyOtp({
      type: type as "signup" | "email",
      token_hash,
    });
    if (!error) {
      return NextResponse.redirect(new URL("/lehrer/dashboard", origin));
    }
  }

  // Verification failed — redirect to login with error hint
  return NextResponse.redirect(
    new URL("/login?error=confirmation_failed", origin)
  );
}
