import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChildNav } from "@/components/child/child-nav";

export default async function KindLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "child") redirect("/login");

  // Formatiere den Namen
  const displayName = profile.display_name
    .split(".")
    .map((p: string) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");

  return (
    <div className="min-h-dvh child-bg flex flex-col">
      <ChildNav displayName={displayName} />
      <main className="flex-1 relative z-10">
        {children}
      </main>
    </div>
  );
}
