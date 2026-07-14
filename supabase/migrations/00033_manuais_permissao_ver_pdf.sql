-- ============================================================
-- Migration: Permissão para ver apenas manuais com PDF
-- Técnicos com esta permissão enxergam somente manuais
-- que já possuem pelo menos um PDF ativo.
-- ============================================================

INSERT INTO permissions (key, label, panel_key, is_generic)
VALUES ('manuais.ver_com_pdf', 'Ver apenas manuais com PDF', 'manuais', false)
ON CONFLICT (key) DO NOTHING;

-- Conceder ao Técnico
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id
FROM cargos c, permissions p
WHERE c.nome = 'Técnico' AND p.key = 'manuais.ver_com_pdf'
ON CONFLICT DO NOTHING;
