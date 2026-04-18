-- Phase 40: Extend operation_type CHECK to allow minigame point redemption (D-13)
ALTER TABLE public.progress_entries
  DROP CONSTRAINT progress_entries_operation_type_check;

ALTER TABLE public.progress_entries
  ADD CONSTRAINT progress_entries_operation_type_check
  CHECK (operation_type IN ('addition', 'subtraktion', 'multiplikation', 'division', 'minigame_redeem'));
