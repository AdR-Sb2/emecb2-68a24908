-- ============================================================
-- Migration: Inversores WEG e Inversores Danfoss
-- Adiciona categorias e manuais para os inversores de frequência.
-- ============================================================

-- Inserir categorias (ajusta ordem para depois de NR's = 1)
INSERT INTO manuais_categorias (chave, nome_exibicao, ordem) VALUES
  ('inversores_weg', 'Inversores WEG', 2),
  ('inversores_danfoss', 'Inversores Danfoss', 3)
ON CONFLICT (chave) DO NOTHING;

-- Inserir manuais para Inversores WEG
DO $$
DECLARE
  v_cat_id INTEGER;
BEGIN
  SELECT id INTO v_cat_id FROM manuais_categorias WHERE chave = 'inversores_weg';
  IF v_cat_id IS NOT NULL THEN
    INSERT INTO manuais (titulo, descricao, categoria_id) VALUES
      ('CFW500', 'Manual do Inversor de Frequência CFW500', v_cat_id),
      ('CFW300', 'Manual do Inversor de Frequência CFW300', v_cat_id),
      ('CFW900', 'Manual do Inversor de Frequência CFW900', v_cat_id),
      ('CFW11', 'Manual do Inversor de Frequência CFW11', v_cat_id)
    ON CONFLICT (titulo, categoria_id) DO NOTHING;
  END IF;
END $$;

-- Inserir manuais para Inversores Danfoss
DO $$
DECLARE
  v_cat_id INTEGER;
BEGIN
  SELECT id INTO v_cat_id FROM manuais_categorias WHERE chave = 'inversores_danfoss';
  IF v_cat_id IS NOT NULL THEN
    INSERT INTO manuais (titulo, descricao, categoria_id) VALUES
      ('FC-51', 'Manual do Inversor de Frequência FC-51', v_cat_id),
      ('FC-360', 'Manual do Inversor de Frequência FC-360', v_cat_id),
      ('FC-302', 'Manual do Inversor de Frequência FC-302', v_cat_id),
      ('VLT AQUA Drive', 'Manual do Inversor de Frequência VLT AQUA Drive', v_cat_id)
    ON CONFLICT (titulo, categoria_id) DO NOTHING;
  END IF;
END $$;
