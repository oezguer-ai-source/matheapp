import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ students: [] }, { status: 401 });
  }

  // Prüfen ob die Klasse dem Lehrer gehört
  const { data: classData } = await supabase
    .from("classes")
    .select("id")
    .eq("id", id)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (!classData) {
    return NextResponse.json({ students: [] }, { status: 404 });
  }

  // Schüler der Klasse laden
  const { data: students } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .eq("class_id", id)
    .eq("role", "child")
    .order("display_name");

  return NextResponse.json({ students: students ?? [] });
}
