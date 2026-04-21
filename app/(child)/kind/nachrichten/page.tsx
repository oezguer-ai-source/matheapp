import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchChildConversationAction } from "./actions";
import { ChildChat } from "@/components/child/child-chat";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Matheapp — Nachrichten",
};

export default async function KindNachrichtenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await fetchChildConversationAction();
  if (res.error) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-red-600">{res.error}</p>
      </div>
    );
  }

  return (
    <ChildChat
      initialMessages={res.messages ?? []}
      teacherId={res.teacherId ?? null}
      teacherName={res.teacherName ?? null}
    />
  );
}
