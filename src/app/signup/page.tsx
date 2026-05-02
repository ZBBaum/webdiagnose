"use client";

import { useRouter } from "next/navigation";
import { SignUpPage } from "@/components/ui/sign-in-flow-1";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();

  async function handleGoogleSignIn() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw new Error(error.message);
  }

  async function handleSubmit(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
  }

  return (
    <div className="fixed inset-0 z-50">
      <SignUpPage
        onGoogleSignIn={handleGoogleSignIn}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
