#!/usr/bin/env bash
set -euo pipefail
set -a; source .env.local; set +a
npx supabase gen types typescript \
  --project-id "$SUPABASE_PROJECT_REF" \
  > types/database.types.ts
echo "Regenerated types/database.types.ts"
