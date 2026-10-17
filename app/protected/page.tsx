import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Dashboard from "@/components/dashboard/dashboard";

async function AuthedDashboard() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/auth/login");

  return <Dashboard userId={data.user.id} email={data.user.email ?? ""} />;
}

export default function ProtectedPage() {
  return (
    <Suspense
      fallback={
        <div className="hud-bg flex h-screen items-center justify-center text-[#6dffc4]">
          Loading...
        </div>
      }
    >
      <AuthedDashboard />
    </Suspense>
  );
}