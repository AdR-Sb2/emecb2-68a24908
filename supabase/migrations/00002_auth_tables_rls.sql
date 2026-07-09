-- ============================================================
-- Migration: Allow the app client to read/write auth-related tables
-- ============================================================

ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cargos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS paineis DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cargo_paineis DISABLE ROW LEVEL SECURITY;
