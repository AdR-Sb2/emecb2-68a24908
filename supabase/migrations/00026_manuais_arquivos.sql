-- Suporte a múltiplos arquivos por manual + permissão de remover

-- 1. Tabela de arquivos
CREATE TABLE IF NOT EXISTS manuais_arquivos (
  id BIGSERIAL PRIMARY KEY,
  manual_id BIGINT NOT NULL REFERENCES manuais(id) ON DELETE CASCADE,
  arquivo_url TEXT NOT NULL,
  nome_exibicao TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('pendente', 'ativo', 'rejeitado')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  enviado_por TEXT NOT NULL DEFAULT ''
);

-- 2. Migrar arquivos existentes (somente se a coluna ainda existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='manuais' AND column_name='arquivo_url') THEN
    INSERT INTO manuais_arquivos (manual_id, arquivo_url, nome_exibicao, status, enviado_por)
    SELECT id, arquivo_url, '', 'ativo', ''
    FROM manuais
    WHERE arquivo_url IS NOT NULL;
  END IF;
END $$;

-- 3. Remover coluna antiga
ALTER TABLE manuais DROP COLUMN IF EXISTS arquivo_url;

-- 4. Desabilitar RLS
ALTER TABLE manuais_arquivos DISABLE ROW LEVEL SECURITY;

-- 5. Nova permissão: remover arquivo
INSERT INTO permissions (key, label, panel_key, is_generic)
VALUES ('manuais.remover_arquivo', 'Remover arquivo do manual', 'manuais', false)
ON CONFLICT (key) DO NOTHING;

-- 6. Atribuir ao Administrador
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id FROM cargos c, permissions p
WHERE c.nome = 'Administrador' AND p.key = 'manuais.remover_arquivo'
ON CONFLICT DO NOTHING;

-- 7. Atribuir ao Supervisor
INSERT INTO cargo_panel_permissions (cargo_id, permission_id)
SELECT c.id, p.id FROM cargos c, permissions p
WHERE c.nome = 'Supervisor' AND p.key = 'manuais.remover_arquivo'
ON CONFLICT DO NOTHING;
