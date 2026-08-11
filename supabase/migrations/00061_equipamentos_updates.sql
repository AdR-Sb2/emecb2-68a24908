-- ============================================================
-- Migration: Equipamentos — v2 (tipos com cor, checklist, localização e vínculo)
-- Base: 00059_equipamentos.sql + 00060_consertar_equipamentos.sql
-- Idempotente: pode rodar quantas vezes quiser.
-- ============================================================

-- 1. Tipos (equipamento_categorias) ganham cor para o badge na tabela.
ALTER TABLE equipamento_categorias ADD COLUMN IF NOT EXISTS cor text DEFAULT '#3b82f6';

-- Cores padrão dos tipos já existentes (só quando ainda estiverem com o default).
UPDATE equipamento_categorias SET cor = CASE nome
  WHEN 'Motor'       THEN '#2563eb'
  WHEN 'Bomba'       THEN '#059669'
  WHEN 'Inversor'    THEN '#f97316'
  WHEN 'Softstarter' THEN '#9333ea'
  ELSE '#64748b'
END
WHERE cor IS NULL OR cor = '#3b82f6';

-- 2. Novos campos dos equipamentos:
--    - localizacao: "aonde se encontra" o equipamento;
--    - cadastrado / esta_bom: checklist de conferência;
--    - vinculo_id: vínculo com outro equipamento da mesma lista (self-FK).
ALTER TABLE equipamentos ADD COLUMN IF NOT EXISTS localizacao text;
ALTER TABLE equipamentos ADD COLUMN IF NOT EXISTS cadastrado boolean NOT NULL DEFAULT false;
ALTER TABLE equipamentos ADD COLUMN IF NOT EXISTS esta_bom boolean NOT NULL DEFAULT false;
ALTER TABLE equipamentos ADD COLUMN IF NOT EXISTS vinculo_id uuid REFERENCES equipamentos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_equipamentos_vinculo ON equipamentos(vinculo_id);

-- 3. Consistência com o restante do módulo (RLS desabilitado + grants).
ALTER TABLE equipamento_categorias DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipamento_fotos DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipamento_registros DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  equipamentos, equipamento_categorias, equipamento_fotos, equipamento_registros
TO anon, authenticated, service_role;

-- 4. Recarregar o schema do PostgREST (novas colunas visíveis ao client).
NOTIFY pgrst, 'reload schema';
