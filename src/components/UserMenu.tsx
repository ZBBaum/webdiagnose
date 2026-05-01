"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

export default function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  if (!user) {
    return (
      <a
        href="/login"
        className="h-8 px-3.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors inline-flex items-center"
      >
        Sign in
      </a>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-8 px-3 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors inline-flex items-center gap-2 cursor-pointer"
      >
        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-semibold shrink-0">
          {user.email?.[0]?.toUpperCase() ?? "?"}
        </span>
        <span className="max-w-[140px] truncate hidden sm:block">{user.email}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-border bg-card shadow-lg p-1">
            <a
              href="/history"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              Audit history
            </a>
            <button
              onClick={signOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 rounded-lg hover:bg-muted transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
