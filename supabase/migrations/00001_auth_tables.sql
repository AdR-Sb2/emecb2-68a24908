-- ============================================================
-- Migration: Sistema de Autenticação e Controle de Acesso
-- ============================================================

-- 1. Cargos (roles)
CREATE TABLE IF NOT EXISTS cargos (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT DEFAULT '',
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- 2. Painéis
CREATE TABLE IF NOT EXISTS paineis (
  id BIGSERIAL PRIMARY KEY,
  chave TEXT NOT NULL UNIQUE,
  nome_exibicao TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  icone TEXT DEFAULT ''
);

-- 3. Cargo → Painéis (junction)
CREATE TABLE IF NOT EXISTS cargo_paineis (
  cargo_id BIGINT NOT NULL REFERENCES cargos(id) ON DELETE CASCADE,
  painel_id BIGINT NOT NULL REFERENCES paineis(id) ON DELETE CASCADE,
  PRIMARY KEY (cargo_id, painel_id)
);

-- 4. Profiles (vinculado ao auth.users do Supabase)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  cargo_id BIGINT REFERENCES cargos(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'ativo', 'bloqueado')),
  criado_em TIMESTAMPTZ DEFAULT now(),
  ultimo_acesso TIMESTAMPTZ
);

-- 5. Trigger: criar profile automaticamente ao cadastrar
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, nome_completo, email, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', ''),
    NEW.email,
    'pendente'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 6. Seed: painéis padrão
INSERT INTO paineis (chave, nome_exibicao, descricao, icone) VALUES
  ('dashboard_testes',     'Dashboard Testes & Aferições', 'Testes e aferições de equipamentos',  'FlaskConical'),
  ('dashboard_automacao',  'Dashboard Automação',         'Dashboard de automação',             'Cpu'),
  ('dashboard_os',         'Dashboard O.S./Backlog',       'Ordens de serviço e backlog',         'ClipboardList'),
  ('relatorio_tecnico',    'Relatório Técnico',            'Relatório técnico de equipamentos',   'FileText'),
  ('relatorio_planta',     'Relatório de Planta',          'Relatórios por planta',               'Building2'),
  ('verificacao_ia',       'Verificação com IA',           'Verificação de dados com IA',        'BrainCircuit'),
  ('ficha_elevatoria',     'Ficha da Elevatória',          'Ficha técnica de elevatórias',        'FileSpreadsheet'),
  ('sistemas',             'Sistemas',                     'Hubs Administrativo e Operacional',   'Boxes'),
  ('admin',                'Painel Admin',                 'Administração do sistema',            'Shield')
ON CONFLICT (chave) DO NOTHING;

-- 7. Seed: cargo Administrador
INSERT INTO cargos (nome, descricao) VALUES ('Administrador', 'Acesso irrestrito a todos os painéis')
ON CONFLICT (nome) DO NOTHING;

-- 8. Seed: Admin tem todos os painéis
INSERT INTO cargo_paineis (cargo_id, painel_id)
SELECT c.id, p.id
FROM cargos c, paineis p
WHERE c.nome = 'Administrador'
ON CONFLICT DO NOTHING;

-- 9. Função para excluir um usuário (auth + profile)
CREATE OR REPLACE FUNCTION delete_user(user_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM profiles WHERE id = user_id;
  DELETE FROM auth.users WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
