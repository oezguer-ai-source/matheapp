-- Fix: infinite recursion in child_reads_own_school and child_upgrades_own_school policies
-- Problem 1: The original policies JOINed schools within a policy ON schools (42P17).
-- Problem 2: Subquery on classes was blocked by RLS (children can't read classes).
-- Fix: Use a SECURITY DEFINER helper that resolves school_id bypassing RLS on classes.

-- 1. Create a SECURITY DEFINER helper to get the school_id for the current user
CREATE OR REPLACE FUNCTION private.user_school_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.school_id
  FROM public.classes c
  WHERE c.id = (SELECT class_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  LIMIT 1;
$$;

-- 2. Drop the broken policies
DROP POLICY IF EXISTS "child_reads_own_school" ON public.schools;
DROP POLICY IF EXISTS "child_upgrades_own_school" ON public.schools;

-- 3. Re-create SELECT policy using SECURITY DEFINER helper
CREATE POLICY "child_reads_own_school"
ON public.schools FOR SELECT
TO authenticated
USING (
  (SELECT private.user_role()) = 'child'
  AND id = (SELECT private.user_school_id())
);

-- 4. Re-create UPDATE policy using SECURITY DEFINER helper
CREATE POLICY "child_upgrades_own_school"
ON public.schools FOR UPDATE
TO authenticated
USING (
  (SELECT private.user_role()) = 'child'
  AND id = (SELECT private.user_school_id())
)
WITH CHECK (
  (SELECT private.user_role()) = 'child'
  AND id = (SELECT private.user_school_id())
);
