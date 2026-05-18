#!/usr/bin/env bash
# Diagnose: Verknüpfungs-Graph (Profile, Klassen, Aufgaben, Nachrichten-Zähler).
# Gibt KEINE Nachrichteninhalte aus — nur Struktur/IDs/Rollen.
cd "$(dirname "$0")/.." || exit 1

if [ ! -f .env.local ]; then
  echo "FEHLER: .env.local nicht gefunden in $(pwd)"
  exit 1
fi

U=$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | head -1 | cut -d= -f2- | tr -d '\r')
K=$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | head -1 | cut -d= -f2- | tr -d '\r')

if [ -z "$U" ] || [ -z "$K" ]; then
  echo "FEHLER: URL oder Service-Key konnte nicht aus .env.local gelesen werden."
  exit 1
fi

echo "=== PROFILE (user_id, role, class_id, display_name) ==="
curl -s -H "apikey: $K" -H "Authorization: Bearer $K" \
  "$U/rest/v1/profiles?select=user_id,role,class_id,display_name&order=role"

echo; echo "=== KLASSEN (id, name, grade, teacher_id) ==="
curl -s -H "apikey: $K" -H "Authorization: Bearer $K" \
  "$U/rest/v1/classes?select=id,name,grade,teacher_id"

echo; echo "=== ASSIGNMENTS (id, title, teacher_id) ==="
curl -s -H "apikey: $K" -H "Authorization: Bearer $K" \
  "$U/rest/v1/assignments?select=id,title,teacher_id"

echo; echo "=== ASSIGNMENT_CLASSES (assignment_id -> class_id) ==="
curl -s -H "apikey: $K" -H "Authorization: Bearer $K" \
  "$U/rest/v1/assignment_classes?select=assignment_id,class_id"

echo; echo "=== NACHRICHTEN (nur sender_id, recipient_id, class_id — KEIN body) ==="
curl -s -H "apikey: $K" -H "Authorization: Bearer $K" \
  "$U/rest/v1/messages?select=sender_id,recipient_id,class_id&order=created_at.desc&limit=20"
echo
