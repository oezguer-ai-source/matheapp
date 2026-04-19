import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Sidebar } from "@/components/teacher/sidebar";
import { logoutAction } from "@/app/login/actions";

export default async function LehrerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Lehrer-Profil via Admin-Client (RLS-agnostisch) laden.
  const admin = createAdminClient();
  let { data: profile } = await admin
    .from("profiles")
    .select("display_name, role")
    .eq("user_id", user.id)
    .maybeSingle();

  // Self-Healing: Wenn der Auth-Account als Lehrer markiert ist, aber das
  // Profil (noch) fehlt — z. B. weil der Trigger aus 20260415000003 beim
  // Signup nicht feuerte oder das Row später gelöscht wurde — legen wir es
  // hier automatisch an. Verhindert das "Kein Lehrer-Profil"-Deadlock.
  const authRole = (user.app_metadata as { role?: string } | undefined)?.role;

  if ((!profile || profile.role !== "teacher") && authRole === "teacher") {
    const displayName =
      (user.user_metadata as { name?: string } | undefined)?.name ??
      user.email?.split("@")[0] ??
      "Lehrkraft";

    const { error: upsertError } = await admin.from("profiles").upsert(
      {
        user_id: user.id,
        role: "teacher",
        display_name: displayName,
        class_id: null,
        grade_level: null,
      },
      { onConflict: "user_id" }
    );

    if (!upsertError) {
      profile = { display_name: displayName, role: "teacher" };
    }
  }

  if (!profile || profile.role !== "teacher") {
    return (
      <main className="min-h-dvh grid place-items-center bg-slate-50 p-6">
        <div className="max-w-md bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            Kein Lehrer-Profil
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            Für diesen Account wurde noch kein Lehrer-Profil angelegt. Bitte
            registrieren Sie sich erneut oder kontaktieren Sie den Support.
          </p>
          <div className="flex gap-2 justify-center">
            <Link
              href="/registrieren"
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium"
            >
              Registrieren
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium"
              >
                Abmelden
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  // Klassen des Lehrers laden
  const { data: classes } = await admin
    .from("classes")
    .select("id, name")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: true });

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        teacherName={profile.display_name}
        classes={classes ?? []}
      />
      <main className="flex-1 bg-slate-50 overflow-auto">
        {children}
      </main>
    </div>
  );
}
