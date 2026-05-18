#!/usr/bin/env bash
# Legt EIN sauberes Test-Set an: 1 Lehrer + 1 Schule + 1 Klasse (Stufe 1) + 1 Kind.
# Bildet die App-Logik nach (Teacher-Trigger, PIN-Schema aus lib/supabase/pin-email.ts).
# Nur EINMAL ausführen. Gibt am Ende die Zugangsdaten aus.
cd "$(dirname "$0")/.." || exit 1

[ -f .env.local ] || { echo "FEHLER: .env.local fehlt"; exit 1; }
U=$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | head -1 | cut -d= -f2- | tr -d '\r')
K=$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | head -1 | cut -d= -f2- | tr -d '\r')
[ -n "$U" ] && [ -n "$K" ] || { echo "FEHLER: URL/Key nicht lesbar"; exit 1; }

# --- feste Test-Zugangsdaten ---
T_EMAIL="test-lehrer@matheapp.de"
T_PASS="Mathe2026!"
T_NAME="Test Lehrer"
CLASS_NAME="Klasse 1a (Test)"
CLASS_GRADE=1
CHILD_USERNAME="mia.test"
CHILD_FULLNAME="Mia Test"
CHILD_PIN="1234"

api() { curl -s -H "apikey: $K" -H "Authorization: Bearer $K" "$@"; }
jget() { python3 -c "import sys,json;d=json.load(sys.stdin);print(d$1)" 2>/dev/null; }

echo "1/6  Lehrer-Auth-User anlegen ($T_EMAIL)…"
T_RESP=$(api -X POST "$U/auth/v1/admin/users" -H "Content-Type: application/json" \
  -d "{\"email\":\"$T_EMAIL\",\"password\":\"$T_PASS\",\"email_confirm\":true,\"app_metadata\":{\"role\":\"teacher\"},\"user_metadata\":{\"name\":\"$T_NAME\"}}")
T_ID=$(echo "$T_RESP" | jget "['id']")
if [ -z "$T_ID" ]; then echo "FEHLER beim Lehrer-Anlegen:"; echo "$T_RESP"; exit 1; fi
echo "     Lehrer-ID: $T_ID"

echo "2/6  Auf Teacher-Profil-Trigger warten…"
sleep 2
P_RESP=$(api "$U/rest/v1/profiles?select=user_id,role&user_id=eq.$T_ID")
if [ "$(echo "$P_RESP" | jget "[0]['role']")" != "teacher" ]; then
  echo "     Trigger hat kein Profil erzeugt — lege es manuell an."
  api -X POST "$U/rest/v1/profiles" -H "Content-Type: application/json" \
    -d "{\"user_id\":\"$T_ID\",\"role\":\"teacher\",\"display_name\":\"$T_NAME\",\"class_id\":null,\"grade_level\":null}" >/dev/null
fi

echo "3/6  Schule anlegen…"
S_RESP=$(api -X POST "$U/rest/v1/schools" -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"name\":\"Test-Grundschule\",\"subscription_tier\":\"free\"}")
S_ID=$(echo "$S_RESP" | jget "[0]['id']")
if [ -z "$S_ID" ]; then echo "FEHLER bei Schule:"; echo "$S_RESP"; exit 1; fi

echo "4/6  Klasse anlegen ($CLASS_NAME, Stufe $CLASS_GRADE)…"
C_RESP=$(api -X POST "$U/rest/v1/classes" -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"name\":\"$CLASS_NAME\",\"school_id\":\"$S_ID\",\"teacher_id\":\"$T_ID\",\"grade\":$CLASS_GRADE}")
C_ID=$(echo "$C_RESP" | jget "[0]['id']")
if [ -z "$C_ID" ]; then echo "FEHLER bei Klasse:"; echo "$C_RESP"; exit 1; fi
echo "     Klassen-ID: $C_ID"

# PIN-Schema aus lib/supabase/pin-email.ts: email = {username}.{classid8}@matheapp.internal
#                                           password = {pin}-{classid8}
PREFIX=${C_ID:0:8}
CHILD_EMAIL="${CHILD_USERNAME}.${PREFIX}@matheapp.internal"
CHILD_PW="${CHILD_PIN}-${PREFIX}"

echo "5/6  Kind-Auth-User anlegen ($CHILD_USERNAME)…"
CH_RESP=$(api -X POST "$U/auth/v1/admin/users" -H "Content-Type: application/json" \
  -d "{\"email\":\"$CHILD_EMAIL\",\"password\":\"$CHILD_PW\",\"email_confirm\":true,\"app_metadata\":{\"role\":\"child\"},\"user_metadata\":{\"name\":\"$CHILD_FULLNAME\"}}")
CH_ID=$(echo "$CH_RESP" | jget "['id']")
if [ -z "$CH_ID" ]; then echo "FEHLER beim Kind-Anlegen:"; echo "$CH_RESP"; exit 1; fi

echo "6/6  Kind-Profil anlegen…"
CHP=$(api -X POST "$U/rest/v1/profiles" -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"user_id\":\"$CH_ID\",\"role\":\"child\",\"display_name\":\"$CHILD_USERNAME\",\"class_id\":\"$C_ID\",\"grade_level\":$CLASS_GRADE}")
if [ -z "$(echo "$CHP" | jget "[0]['user_id']")" ]; then echo "FEHLER bei Kind-Profil:"; echo "$CHP"; exit 1; fi

echo
echo "============================================================"
echo " SAUBERES TEST-SET ANGELEGT"
echo "============================================================"
echo " LEHRER-LOGIN (Lehrer-Bereich):"
echo "   E-Mail:    $T_EMAIL"
echo "   Passwort:  $T_PASS"
echo
echo " KIND-LOGIN (Schüler-Bereich):"
echo "   Benutzername: $CHILD_USERNAME"
echo "   PIN:          $CHILD_PIN"
echo
echo " Klasse: $CLASS_NAME  (Stufe $CLASS_GRADE)"
echo "============================================================"
