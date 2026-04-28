import SignupForm from "./SignupForm";

export default function SignupPage() {
  return (
    <main className="min-h-[calc(100vh-76px)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create an account</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Start auditing your websites for free</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <SignupForm />
        </div>
      </div>
    </main>
  );
}
