"use client";

import { useRouter } from "next/navigation";
import { SignInPage } from "@/components/ui/sign-in-flow-1";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  async function handleEmailSubmit(email: string) {
    await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  }

  async function handleCodeComplete(email: string, code: string) {
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    if (!error) {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <SignInPage
        onEmailSubmit={handleEmailSubmit}
        onCodeComplete={handleCodeComplete}
      />
    </div>
  );
}
