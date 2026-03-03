-- Migration 025 – Add is_active flag to repair_requests
--
-- Allows owners to soft-disable a request (hidden from public list)
-- without permanently deleting it.

ALTER TABLE repair_requests
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1
  AFTER status;
