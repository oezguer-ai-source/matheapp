import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Matheapp — Lehrkräfte-Bereich",
};

export default async function LehrerDashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/login");
  }

  const userId = user.id;
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile || profile.role !== "teacher") {
    redirect("/login");
  }

  return (
    <main className="min-h-dvh bg-white p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          Willkommen, {profile.display_name}
        </h1>
        <form action={logoutAction}>
          <Button type="submit" variant="default">
            Abmelden
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ihr Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base text-slate-700">
            Ihr Klassen-Dashboard folgt in Kürze.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
