-- Cargo Almoxarife e demais cargos operacionais do estoque

INSERT INTO paineis (chave, nome_exibicao, descricao, icone) VALUES
  ('estoque', 'Almoxarifado', 'Estoque de materiais, entrada/saída, compras e pedidos', 'Package')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO cargos (nome, descricao) VALUES
  ('Técnico', 'Lança entrada e saída no estoque'),
  ('Almoxarife', 'Gestão completa do módulo de estoque e compras'),
  ('Supervisor', 'Estoque completo e acesso aos painéis técnicos')
ON CONFLICT (nome) DO NOTHING;

-- Administrador: inclui painel de estoque
INSERT INTO cargo_paineis (cargo_id, painel_id)
SELECT c.id, p.id
FROM cargos c, paineis p
WHERE c.nome = 'Administrador' AND p.chave = 'estoque'
ON CONFLICT DO NOTHING;

-- Técnico: apenas estoque
INSERT INTO cargo_paineis (cargo_id, painel_id)
SELECT c.id, p.id
FROM cargos c, paineis p
WHERE c.nome = 'Técnico' AND p.chave = 'estoque'
ON CONFLICT DO NOTHING;

-- Almoxarife: apenas estoque
INSERT INTO cargo_paineis (cargo_id, painel_id)
SELECT c.id, p.id
FROM cargos c, paineis p
WHERE c.nome = 'Almoxarife' AND p.chave = 'estoque'
ON CONFLICT DO NOTHING;

-- Supervisor: estoque + painéis técnicos (sem admin)
INSERT INTO cargo_paineis (cargo_id, painel_id)
SELECT c.id, p.id
FROM cargos c, paineis p
WHERE c.nome = 'Supervisor'
  AND p.chave IN (
    'estoque',
    'dashboard_testes',
    'dashboard_automacao',
    'dashboard_os',
    'relatorio_tecnico',
    'relatorio_planta',
    'verificacao_ia',
    'ficha_elevatoria',
    'sistemas'
  )
ON CONFLICT DO NOTHING;
