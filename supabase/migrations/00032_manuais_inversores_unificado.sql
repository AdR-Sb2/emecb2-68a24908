-- ============================================================
-- Migration: Unifica categorias de inversores + fabricante
-- Cria categoria única "Inversores" com filtro por fabricante.
-- Adiciona coluna fabricante à tabela manuais.
-- ============================================================

ALTER TABLE manuais ADD COLUMN IF NOT EXISTS fabricante TEXT;

-- Criar categoria unificada Inversores
INSERT INTO manuais_categorias (chave, nome_exibicao, ordem)
VALUES ('inversores', 'Inversores', 2)
ON CONFLICT (chave) DO NOTHING;

DO $$
DECLARE
  new_cat_id INTEGER;
  old_weg_id INTEGER;
  old_danfoss_id INTEGER;
  idx INTEGER;
BEGIN
  SELECT id INTO new_cat_id FROM manuais_categorias WHERE chave = 'inversores';
  SELECT id INTO old_weg_id FROM manuais_categorias WHERE chave = 'inversores_weg';
  SELECT id INTO old_danfoss_id FROM manuais_categorias WHERE chave = 'inversores_danfoss';

  -- Migrar manuais WEG para a nova categoria
  IF new_cat_id IS NOT NULL AND old_weg_id IS NOT NULL THEN
    UPDATE manuais SET fabricante = 'WEG', categoria_id = new_cat_id
    WHERE categoria_id = old_weg_id;
    UPDATE manuais_categorias SET ativo = false WHERE id = old_weg_id;
  END IF;

  -- Migrar manuais DANFOSS para a nova categoria
  IF new_cat_id IS NOT NULL AND old_danfoss_id IS NOT NULL THEN
    UPDATE manuais SET fabricante = 'DANFOSS', categoria_id = new_cat_id
    WHERE categoria_id = old_danfoss_id;
    UPDATE manuais_categorias SET ativo = false WHERE id = old_danfoss_id;
  END IF;

  -- Inserir manuais adicionais de todos os fabricantes
  IF new_cat_id IS NOT NULL THEN
    -- WEG
    INSERT INTO manuais (titulo, descricao, categoria_id, fabricante) VALUES
      ('CFW100', 'Manual do Inversor de Frequência CFW100', new_cat_id, 'WEG'),
      ('CFW700', 'Manual do Inversor de Frequência CFW700', new_cat_id, 'WEG'),
      ('CFW08', 'Manual do Inversor de Frequência CFW08', new_cat_id, 'WEG'),
      ('CFW-04', 'Manual do Inversor de Frequência CFW-04', new_cat_id, 'WEG'),
      ('CFW400', 'Manual do Inversor de Frequência CFW400', new_cat_id, 'WEG'),
      ('CFW600', 'Manual do Inversor de Frequência CFW600', new_cat_id, 'WEG'),
      ('WEG Drive 1000', 'Manual do Inversor de Frequência WEG Drive 1000', new_cat_id, 'WEG')
    ON CONFLICT (titulo, categoria_id) DO NOTHING;

    -- DANFOSS
    INSERT INTO manuais (titulo, descricao, categoria_id, fabricante) VALUES
      ('VLT Micro Drive', 'Manual do Inversor de Frequência VLT Micro Drive FC-51', new_cat_id, 'DANFOSS'),
      ('VLT AutomationDrive', 'Manual do Inversor de Frequência VLT AutomationDrive FC-302', new_cat_id, 'DANFOSS'),
      ('VLT HVAC Drive', 'Manual do Inversor de Frequência VLT HVAC Drive FC-102', new_cat_id, 'DANFOSS'),
      ('VLT Decentral Drive', 'Manual do Inversor de Frequência VLT Decentral Drive FCD-302', new_cat_id, 'DANFOSS'),
      ('VLT AQUA Drive FC-202', 'Manual do Inversor de Frequência VLT AQUA Drive FC-202', new_cat_id, 'DANFOSS'),
      ('VLT Parallel Drive', 'Manual do Inversor de Frequência VLT Parallel Drive', new_cat_id, 'DANFOSS'),
      ('VLT Midi Drive', 'Manual do Inversor de Frequência VLT Midi Drive FC-280', new_cat_id, 'DANFOSS')
    ON CONFLICT (titulo, categoria_id) DO NOTHING;

    -- SIEMENS
    INSERT INTO manuais (titulo, descricao, categoria_id, fabricante) VALUES
      ('SINAMICS G120', 'Manual do Inversor de Frequência SINAMICS G120', new_cat_id, 'SIEMENS'),
      ('SINAMICS V20', 'Manual do Inversor de Frequência SINAMICS V20', new_cat_id, 'SIEMENS'),
      ('SINAMICS S120', 'Manual do Inversor de Frequência SINAMICS S120', new_cat_id, 'SIEMENS'),
      ('SINAMICS G110', 'Manual do Inversor de Frequência SINAMICS G110', new_cat_id, 'SIEMENS'),
      ('SINAMICS G130', 'Manual do Inversor de Frequência SINAMICS G130', new_cat_id, 'SIEMENS'),
      ('SINAMICS G150', 'Manual do Inversor de Frequência SINAMICS G150', new_cat_id, 'SIEMENS'),
      ('SINAMICS V90', 'Manual do Inversor de Frequência SINAMICS V90', new_cat_id, 'SIEMENS'),
      ('MICROMASTER 420', 'Manual do Inversor de Frequência MICROMASTER 420', new_cat_id, 'SIEMENS'),
      ('MICROMASTER 440', 'Manual do Inversor de Frequência MICROMASTER 440', new_cat_id, 'SIEMENS'),
      ('MICROMASTER 430', 'Manual do Inversor de Frequência MICROMASTER 430', new_cat_id, 'SIEMENS'),
      ('SINAMICS G120C', 'Manual do Inversor de Frequência SINAMICS G120C', new_cat_id, 'SIEMENS'),
      ('SINAMICS G115D', 'Manual do Inversor de Frequência SINAMICS G115D', new_cat_id, 'SIEMENS')
    ON CONFLICT (titulo, categoria_id) DO NOTHING;

    -- POWERELETRONICS
    INSERT INTO manuais (titulo, descricao, categoria_id, fabricante) VALUES
      ('SD700', 'Manual do Inversor de Frequência SD700', new_cat_id, 'POWERELETRONICS'),
      ('SD500', 'Manual do Inversor de Frequência SD500', new_cat_id, 'POWERELETRONICS'),
      ('FR500', 'Manual do Inversor de Frequência FR500', new_cat_id, 'POWERELETRONICS'),
      ('FR700', 'Manual do Inversor de Frequência FR700', new_cat_id, 'POWERELETRONICS'),
      ('HFR', 'Manual do Inversor de Frequência HFR', new_cat_id, 'POWERELETRONICS'),
      ('SD800', 'Manual do Inversor de Frequência SD800', new_cat_id, 'POWERELETRONICS'),
      ('SD400', 'Manual do Inversor de Frequência SD400', new_cat_id, 'POWERELETRONICS'),
      ('SD600', 'Manual do Inversor de Frequência SD600', new_cat_id, 'POWERELETRONICS'),
      ('HFR-SD', 'Manual do Inversor de Frequência HFR-SD', new_cat_id, 'POWERELETRONICS')
    ON CONFLICT (titulo, categoria_id) DO NOTHING;
  END IF;
END $$;
