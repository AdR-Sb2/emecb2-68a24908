-- ============================================================
-- Migration: Disable RLS on permissions tables
-- ============================================================

ALTER TABLE IF EXISTS permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cargo_panel_permissions DISABLE ROW LEVEL SECURITY;
