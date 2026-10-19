import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function SignUpOutcome() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  // Email confirmation is off: the new account is already signed in, so go straight to the dashboard.
  if (data.user) redirect("/protected");

  // Email confirmation is on: the person still has to open the link in their email.
  return (
    <div className="flex w-full max-w-sm flex-col gap-4 text-center">
      <h1 className="text-2xl font-semibold">Check your email</h1>
      <p className="text-sm opacity-80">
        We sent a confirmation link to your inbox. Open it to finish creating your account,
        then log in.
      </p>
      <div className="flex justify-center gap-3">
        <Link
          href="/auth/login"
          className="rounded-md border px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
        >
          Log in
        </Link>
        <Link
          href="/"
          className="rounded-md border px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Suspense fallback={<p className="text-sm opacity-70">Loading...</p>}>
        <SignUpOutcome />
      </Suspense>
    </div>
  );
}

