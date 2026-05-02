"use client";

import { useRouter } from "next/navigation";
import { SignInPage } from "@/components/ui/sign-in-flow-1";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  async function handleGoogleSignIn() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw new Error(error.message);
  }

  async function handleEmailSubmit(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) throw new Error(error.message);
  }

  async function handleCodeComplete(email: string, code: string) {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    if (error) throw new Error(error.message);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50">
      <SignInPage
        onGoogleSignIn={handleGoogleSignIn}
        onEmailSubmit={handleEmailSubmit}
        onCodeComplete={handleCodeComplete}
      />
    </div>
  );
}
