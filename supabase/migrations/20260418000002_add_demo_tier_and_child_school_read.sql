-- Migration: Add 'demo' tier + child school read policy
-- Phase 60 — Subscription Gate

-- 1. Erweitere CHECK-Constraint um 'demo' (per D-12)
ALTER TABLE public.schools DROP CONSTRAINT schools_subscription_tier_check;
ALTER TABLE public.schools ADD CONSTRAINT schools_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'grundschule', 'foerderung', 'experte', 'demo'));

-- 2. RLS: Kinder duerfen die Schule lesen, zu der ihre Klasse gehoert
-- Pfad: profiles.class_id -> classes.school_id -> schools.id
CREATE POLICY "child_reads_own_school"
ON public.schools FOR SELECT
TO authenticated
USING (
  (SELECT private.user_role()) = 'child'
  AND id IN (
    SELECT s.id FROM public.schools s
    JOIN public.classes c ON c.school_id = s.id
    WHERE c.id = (SELECT private.user_class_id())
  )
);

-- 3. RLS: Kinder duerfen subscription_tier ihrer Schule updaten (fuer simulierten Checkout per D-08/D-09)
-- In Produktion wuerde dies ueber einen Admin-Endpoint laufen, aber fuer die Uni-Demo
-- erlauben wir Kindern das direkte Update auf ihre eigene Schule.
CREATE POLICY "child_upgrades_own_school"
ON public.schools FOR UPDATE
TO authenticated
USING (
  (SELECT private.user_role()) = 'child'
  AND id IN (
    SELECT s.id FROM public.schools s
    JOIN public.classes c ON c.school_id = s.id
    WHERE c.id = (SELECT private.user_class_id())
  )
)
WITH CHECK (
  (SELECT private.user_role()) = 'child'
  AND id IN (
    SELECT s.id FROM public.schools s
    JOIN public.classes c ON c.school_id = s.id
    WHERE c.id = (SELECT private.user_class_id())
  )
);
