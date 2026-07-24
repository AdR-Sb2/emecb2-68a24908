-- ============================================================
-- Importação: NOVA RELAÇÃO EAT 2026
-- Gerado automaticamente138

-- ============================================================

BEGIN;

-- 1. Elevatórias (identificação básica)
INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('ADOLFO BERGAMINI / ALTO MILITÂO', 'PL-RJB-EAT0093', 'EAT', 'BAIXADA 2', 'Estr. Gen. Mena Barreto, 821 - Novo Horizonte, Nilópolis - RJ, 26535-330', 'Novo Horizonte', 'NILÓPOLIS', '26535-330', -22.8035, -43.4081, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('AMAURI GUIMARAES', 'PL-RJB-EAT0687', 'EAT', 'BAIXADA 2', 'R. Ângela Maria, 2 - Posse, Nova Iguaçu - RJ, 26089-175', 'Floresta', 'NOVA IGUAÇU', '26031-200', -22.736, -43.4782, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('ÂNGELA MARIA', 'PL-RJB-EAT0088', 'EAT', 'BAIXADA 2', 'R. Oliveiros Rodrigues Alves, 130 - Jardim da Posse, Nova Iguaçu - RJ, 26030-010', 'Jardim da Posse', 'NOVA IGUAÇU', '26030-010', -22.7388, -43.4551, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('ANTONIO VALDIGEM', 'PL-RJB-EAT0736', 'EAT', 'BAIXADA 2', 'R. Antonio Valdigem, 51 - Queimados, RJ, 26385-300', 'Vila das porteiras', 'QUEIMADOS', '26385-300', -22.704, -43.5529, NULL, 'INFORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('BEIRA LINHA', 'PL-RJB-EAT0688', 'EAT', 'BAIXADA 2', 'Av Beira Linha 275 - Miguel Couto - Nova Iguaçu', 'Miguel Couto', 'NOVA IGUAÇU', '26070-320', -22.7027, -43.4311, NULL, 'INFORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('BELO HORIZONTE', 'PL-RJB-EAT0083', 'EAT', 'BAIXADA 2', 'R. Jequitia, 300 - Nova América, Nova Iguaçu - RJ, 26021-630', 'Nova América', 'NOVA IGUAÇU', '26021-630', -22.7237, -43.4358, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('BOOSTER AUSTIN', 'PL-RJB-EAT0695', 'EAT', 'BAIXADA 2', 'R. Araicas, 27 - Austin, Nova Iguaçu - RJ, 26086-320', 'Largo dos peixes', 'QUEIMADOS', '26086-320', -22.7238, -43.53, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('BOOSTER BRASÍLIA', 'PL-RJB-EAT1005', 'EAT', 'BAIXADA 2', 'R. Prof. Venina Correa Torres, 23 - Centro, Nova Iguaçu - RJ, 26220-100', 'Centro', 'NOVA IGUAÇU', '26220-100', -22.7596, -43.4455, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('BOOSTER CABUÇU ALTO', 'PL-RJB-EAT0689', 'EAT', 'BAIXADA 2', 'R. José Cabral, 448 - Cabuçu, Nova Iguaçu - RJ, 26290-048', 'Cabuçu', 'NOVA IGUAÇU', '26290-048', -22.764, -43.537, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('BOOSTER ENGENHEIRO PEDREIRA', 'PL-RJB-EAT0122', 'EAT', 'BAIXADA 2', 'Cidade Jardim Marajoara, Japeri - RJ, 26420-243', 'Jardim Marajoara', 'JAPERI', '26420-243', -22.7075, -43.6287, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('BOOSTER JK', 'PL-RJB-EAT0746', 'EAT', 'BAIXADA 2', 'R. da Cascata, 60 - Pres. Juscelino, Mesquita - RJ, 26557-700', 'Pres. Juscelino', 'MESQUITA', '26557-700', -22.7702, -43.4356, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('BOOSTER POSSE', 'PL-RJB-EAT0042', 'EAT', 'BAIXADA 2', 'Estrada velha de Iguaçu, 812 - Miguel Couto , Belford Roxo - RJ', 'Miguel Couto', 'NOVA IGUAÇU', '26145-420', -22.7096, -43.4287, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('BURITI', 'PL-RJB-EAT0684', 'EAT', 'BAIXADA 2', 'R. Freitas De Aguiar, 13 - Eucalipto, Japeri - RJ, 26453-325', 'Eucalipto', 'JAPERI', '26453-325', -22.6731, -43.6112, NULL, 'INFORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('CAIÇARA', 'PL-RJB-EAT0048', 'EAT', 'BAIXADA 2', 'Tv. Benjamim Chanbarelli, 30 - Caonze, Nova Iguaçu - RJ, 26250-120', 'Jardim da Posse', 'NOVA IGUAÇU', '26021-072', -22.7284, -43.4433, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('CAIXA VELHA', 'PL-RJB-EAT0011', 'EAT', 'BAIXADA 2', 'R. Tab. Murilo Costa, 140 - Centro', 'Centro', 'NOVA IGUAÇU', '26255-130', -22.7631, -43.4531, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('CABUÇU BAIXO', 'PL-RJB-EAT0847', 'EAT', 'BAIXADA 2', 'Av. Abílio Augusto Távora, 5157 - Vl Valverde, Nova Iguaçu - RJ, 26290-717', 'Vl Valverde', 'NOVA IGUAÇU', '26290-717', -22.7759, -43.5315, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('CANADENSE', 'PL-RJB-EAT0056', 'EAT', 'BAIXADA 2', 'Rua Gen. Olímpio da Fonseca, 917 - Paiol de Pólvora, Nilópolis - RJ, 26545-470', 'Paiol de Pólvora', 'NILÓPOLIS', '26545-470', -22.8137, -43.3945, NULL, 'INFORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('CARAMUJOS', 'PL-RJB-EAT0835', 'EAT', 'BAIXADA 2', 'R. Cruz Alta, 2-8 - Parque do Ipanema, Queimados - RJ, 26320-330', 'Parque do Ipanema', 'QUEIMADOS', '26320-330', -22.7063, -43.5825, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('CARLOS SAMPAIO', 'PL-RJB-EAT0822', 'EAT', 'BAIXADA 2', 'R. Lúcia Maria Piper, 50 - Adrianópolis, Nova Iguaçu - RJ, 26053-075', 'Adrianopolis', 'NOVA IGUAÇU', '0', -22.6594, -43.4876, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('CAONZE', 'PL-RJB-EAT0821', 'EAT', 'BAIXADA 2', 'R. Ver. Hélcio Chambarelli - Caonze, Nova Iguaçu - RJ, 26250-170', 'Caonze', 'NOVA IGUAÇU', '26250-170', -22.7665, -43.4429, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('CASA DE CUSTÓDIA COTRIN NETO', 'PL-RJB-EAT1016', 'EAT', 'BAIXADA 2', 'R. Assul,  Jd Belo Horizonte, Japeri - RJ, 26480-400', 'Jd Belo Horizonte', 'JAPERI', '26480-400', -22.673, -43.5826, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('CEFET', 'PL-RJB-EAT0108', 'EAT', 'BAIXADA 2', 'R. Ademar Guimarães, 17 - Jardim Monte Castelo, Nova Iguaçu - RJ, 26041-600', 'Santa Rita', 'NOVA IGUAÇU', '26041-271', -22.7009, -43.4645, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('CHATUBA', 'PL-RJB-EAT0741', 'EAT', 'BAIXADA 2', 'Rua Marques Canário, 667 - Chatuba - Mesquita - RJ, 26585-520', 'Chatuba', 'MESQUITA', '26585-520', -22.804, -43.4408, NULL, 'INFORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('CITROPOLIS', 'PL-RJB-EAT0833', 'EAT', 'BAIXADA 2', 'R. Tóquio, 38 - Citrópolis, Japeri - RJ, 26425-340', 'Citrópolis', 'JAPERI', '26425-340', -22.682, -43.6049, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('DANON', 'PL-RJB-EAT0816', 'EAT', 'BAIXADA 2', 'R. Luís Ferreira, 3 - Pioneiro, Nova Iguaçu - RJ, 26294-300', 'Pioneiro', 'NOVA IGUAÇU', '26271-350', -22.7684, -43.5068, NULL, 'Nova', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('DAS ROSAS', 'PL-RJB-EAT0836', 'EAT', 'BAIXADA 2', 'Rancho Fundo, Nova Iguaçu - RJ, 26051-370', 'Rancho Fundo', 'NOVA IGUAÇU', '26051-370', -22.6943, -43.4584, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('DA SERRA', 'PL-RJB-EAT0848', 'EAT', 'BAIXADA 2', 'R. Soares Couto, 361 - Santa Terezinha, Mesquita - RJ, 26554-220', 'Santa Terezinha', 'MESQUITA', '26554-220', -22.7896, -43.4383, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('DINAMARCO REIS', 'PL-RJB-EAT0069', 'EAT', 'BAIXADA 2', 'R. Dinamarco Réis, 48 - Joaquim De Almeida Flores, Nilópolis - RJ, 26545-230', 'Joaquim De Almeida Flores', 'NILÓPOLIS', '26545-230', -22.8153, -43.401, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('DIVINO', 'PL-RJB-EAT0834', 'EAT', 'BAIXADA 2', 'Av. Luigi Giobi, 26 - Vila do Tinguá, Queimados - RJ, 26383-340', 'Vila do Tinguá', 'QUEIMADOS', '26383-340', -22.7027, -43.559, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('DORALICE', 'PL-RJB-EAT0761', 'EAT', 'BAIXADA 2', 'Rua Doralice 235, Caixa DAgua - Queimados', 'Caixa DAgua', 'QUEIMADOS', '0', -22.7121, -43.5516, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('EDNA', 'PL-RJB-EAT0062', 'EAT', 'BAIXADA 2', 'Av. Henrique Duque Estrada Meyer, 690-798 - Ponto Chic, Nova Iguaçu - RJ, 26041-061', 'Ponto Chic', 'NOVA IGUAÇU', '26041-061', -22.7319, -43.4611, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('EDUARDO CELIDÔNIO', 'PL-RJB-EAT0693', 'EAT', 'BAIXADA 2', 'R. A, 1 - Vila Camarim, Queimados - RJ, 26383-522', 'Vila Camarim', 'QUEIMADOS', '26383-522', -22.7002, -43.5694, NULL, 'INFORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('EL SHADAY', 'PL-RJB-EAT0104', 'EAT', 'BAIXADA 2', 'R. Márcio Vieira de Oliveira, 372 - Austin, Nova Iguaçu - RJ, 26086-215', 'AUSTIN', 'NOVA IGUAÇU', '26086-215', -22.7234, -43.5258, NULL, 'INFORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('ENGENHARIA', 'PL-RJB-EAT0117', 'EAT', 'BAIXADA 2', 'Av. Henrique Duque Estrada Meyer, 395 - Alto da Posse, Nova Iguaçu - RJ, 26030-380', 'Posse', 'NOVA IGUAÇU', '26041-061', -22.7351, -43.4591, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('ESPLANADA', 'PL-RJB-EAT0075', 'EAT', 'BAIXADA 2', 'Estr. da Fazenda, 2-264 - Jardim da Viga, Nova Iguaçu - RJ, 26013-470', 'Jardim da Viga', 'NOVA IGUAÇU', '26013-470', -22.7426, -43.4458, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('EXPEDICIONARIOS', 'PL-RJB-EAT0066', 'EAT', 'BAIXADA 2', 'Estrada dos Expedicionário, 1264, Paiol, Nilópolis - RJ, 26540-020', 'Paiol', 'NILÓPOLIS', '26540-020', -22.805, -43.4028, NULL, 'INFORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('ETE LAGOINHA', 'PL-RJB-ETE0040', 'ETE', 'BAIXADA 2', 'R. Dez, 47 - Lagoinha, Nova Iguaçu - RJ, 26296-069', 'Lagoinha', 'NOVA IGUAÇU', '26296-069', -22.7985, -43.5892, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('FLORESTA MIRANDA', 'PL-RJB-EAT0065', 'EAT', 'BAIXADA 2', 'Rua Floresta Miranda, 257 - Centro, Nova Iguaçu - RJ, 26250-060', 'Centro', 'NOVA IGUAÇU', '26250-060', -22.764, -43.4489, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('FRANCISCO XAVIER', 'PL-RJB-EAT0082', 'EAT', 'BAIXADA 2', 'Próximo a R. Francisco Xavier, 801 - São Gabriel, Nova Iguaçu - RJ, 26021-650', 'São Gabriel', 'NOVA IGUAÇU', '26021-650', -22.723, -43.4356, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('GAMA', 'PL-RJB-EAT0110', 'EAT', 'BAIXADA 2', 'Estr. da Gama, 721 - Cerâmica, Nova Iguaçu - RJ, 26035-220', 'Posse', 'NOVA IGUAÇU', '26030-200', -22.7342, -43.4658, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('GOLDEN GATE', 'PL-RJB-EAT0691', 'EAT', 'BAIXADA 2', 'R. Amazor Moreira Prisco, 154 - Centro, Nova Iguaçu - RJ, 26255-250', 'Centro', 'NOVA IGUAÇU', '26255-250', -22.7613, -43.456, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('GRAMA', 'PL-RJB-EAT0745', 'EAT', 'BAIXADA 2', 'Estr. da Grama, 1743 - Jardim Fonte Sao Miguel, Nova Iguaçu - RJ, 26060-015', 'Jardim Fonte Sao Miguel', 'NOVA IGUAÇU', '26060-015', -22.7018, -43.4312, NULL, 'INFORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('GRANJA ROSALINA', 'PL-RJB-EAT0811', 'EAT', 'BAIXADA 2', 'Rua José Alexandre esquina com a Estr. Campo Alegre', 'Granja Rosalina', 'QUEIMADOS', '26317-180', -22.7172, -43.5819, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('HADDOCK LOBO', 'PL-RJB-EAT1013', 'EAT', 'BAIXADA 2', 'R. Adoc Lôbo, 10 - Vila do Tinguá, Queimados - RJ, 26385-380', 'Vila do Tinguá', 'QUEIMADOS', '26385380', -22.7051, -43.5555, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('IARA', 'PL-RJB-EAT0837', 'EAT', 'BAIXADA 2', 'R. Manuel Rodrigues de Sá Panela, 214-302 - Cacuia, Nova Iguaçu - RJ, 26082-215', 'Cacuia', 'NOVA IGUAÇU', '26082-215', -22.7295, -43.5089, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('INDIA PORTUGUESA', 'PL-RJB-EAT0087', 'EAT', 'BAIXADA 2', 'R. Antônio Pereira de Carvalho, 34 - Centro, Nilópolis - RJ, 26540-000', 'Centro', 'NILÓPOLIS', '26540-000', -22.8127, -43.4116, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('ITAPEMIRIM', 'PL-RJB-EAT0109', 'EAT', 'BAIXADA 2', 'R. Rio Douro, 79 - Itaipu, Belford Roxo - RJ, 26143-500', 'Itaipu', 'BELFORD ROXO', '26143-500', -22.7168, -43.4273, NULL, 'INFORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('ITAPAGE', 'PL-RJB-EAT0830', 'EAT', 'BAIXADA 2', 'R. Itapage, 440, Queimados - RJ, 26381-429', 'Laranjal', 'QUEIMADOS', '26381-429', -22.6943, -43.5573, NULL, 'Nova', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('ITORORÓ', 'PL-RJB-EAT0748', 'EAT', 'BAIXADA 2', 'R. Itororó, 246 - Vila Guimaraes, Queimados - RJ, 26340-250', 'Vila Guimaraes', 'QUEIMADOS', '26340-250', -22.7068, -43.5357, NULL, 'INFORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('IVO MIRANDA', 'PL-RJB-EAT0053', 'EAT', 'BAIXADA 2', 'Rua Ivo de Miranda Monte, 28, Banco de Areia, Mesquita - RJ, 26574-770', 'Banco de Areia', 'MESQUITA', '26574-770', -22.7788, -43.4122, NULL, 'INFORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('JOSE VIRGILIO DO PRADO', 'PL-RJB-EAT0694', 'EAT', 'BAIXADA 2', 'R. das Crianças, 257 - Vila Nascente, Queimados - RJ, 26327-210', 'Vila Nascente', 'QUEIMADOS', '26325-030', -22.7254, -43.5543, NULL, 'INFORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('LAGOINHA', 'PL-RJB-EEE0082', 'EEE', 'BAIXADA 2', 'R. Quarenta e Sete, 62 - Conj. Campo Belo, Nova Iguaçu - RJ, 26296-099', 'Campo Belo', 'NOVA IGUAÇU', '26296-099', -22.7962, -43.5912, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('LAGOINHA II', 'PL-RJB-EEE0083', 'EEE', 'BAIXADA 2', 'R. Zero, 195 - Lagoinha, Nova Iguaçu - RJ, 26296-024', 'Campo Belo', 'NOVA IGUAÇU', '0', -22.8027, -43.5901, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('LIBANEA', 'PL-RJB-EAT0046', 'EAT', 'BAIXADA 2', 'R. Libânia, 2-144 - Vila Emil, Mesquita - RJ, 26551-200', 'Vila Emil', 'MESQUITA', '26551-200', -22.7792, -43.4247, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('LIBERDADE', 'PL-RJB-EAT0045', 'EAT', 'BAIXADA 2', 'Rua Mario Pereira Lima, 140 - Lote 9 - Austin - Nova Iguaçu', 'Austin', 'NOVA IGUAÇU', '0', -22.719, -43.5184, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('LUCIO TAVARES', 'PL-RJB-EAT0043', 'EAT', 'BAIXADA 2', 'R. Lúcio Tavares - Centro, Nilópolis - RJ, 26535-001', 'Centro', 'NILÓPOLIS', '26535-001', -22.8061, -43.4152, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('MACIEL', 'PL-RJB-EAT0747', 'EAT', 'BAIXADA 2', 'R. Ver. José Virgílio do Prado, 79 - Vila Nascente, Queimados - RJ, 26325-050', 'Vila Nascente', 'QUEIMADOS', '26325-050', -22.7227, -43.5521, NULL, 'INFORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('MANOEL REIS', 'PL-RJB-EAT0040', 'EAT', 'BAIXADA 2', 'R. Dr. Manoel Reis, 405 - Olinda, Nilópolis - RJ, 26510-182', 'Olinda', 'NILÓPOLIS', '26510-182', -22.8147, -43.4159, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('MAURICIA BORGES', 'PL-RJB-EAT0032', 'EAT', 'BAIXADA 2', 'Rua Maurícia Borges, 314 - Banco de Areia, Mesquita - RJ, 26564-021', 'Banco de Areia', 'MESQUITA', '26564-021', -22.7776, -43.4193, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('MELVIN JONES', 'PL-RJB-EAT0031', 'EAT', 'BAIXADA 2', 'R. Gov. Portela, 331 - Centro, Nova Iguaçu - RJ, 26221-030', 'Centro', 'NOVA IGUAÇU', '26221-130', -22.764, -43.4385, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('MENA BARRETO', 'PL-RJB-EAT0030', 'EAT', 'BAIXADA 2', 'R. Otaciano, 96 - Novo Horizonte, Nilópolis - RJ, 26535-430', 'Novo Horizonte', 'NILÓPOLIS', '26535-430', -22.8018, -43.4052, NULL, 'INFORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('MESQUITA G1', 'PL-RJB-EAT0086', 'EAT', 'BAIXADA 2', 'Rua Augusto Cardoso, 240 -  Coréia, Mesquita, RJ - 26556-030', 'Coréia', 'MESQUITA', '26556-030', -22.7805, -43.4361, NULL, 'INFORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('MORRO DA COCADA', 'PL-RJB-EAT0068', 'EAT', 'BAIXADA 2', 'R. Doná Orminda, 23 - Andrade Araujo, Nova Iguaçu - RJ, 26010-450', 'Andrade Araujo', 'NOVA IGUAÇU', '26010-450', -22.7567, -43.4207, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('MORRO DA TORRE', 'PL-RJB-EAT1014', 'EAT', 'BAIXADA 2', 'R. Mirante, 289-193 - Flesmam, Queimados - RJ, 26325-200', 'Flesmam', 'QUEIMADOS', '26325-200', -22.7211, -43.5516, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('MORRO DA MOENDA', 'PL-RJB-EAT0039', 'EAT', 'BAIXADA 2', 'Rua Manuel Rodrigues de Sá Panela, 25 - Cacuia - Nova Iguaçu -RJ', 'Cacuia', 'NOVA IGUAÇU', '26082-250', -22.7306, -43.5146, NULL, 'INFORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('MORRO DO TEMPERO', 'PL-RJB-EAT0738', 'EAT', 'BAIXADA 2', 'Estrada Carlos Sampaio ,78 - Austin - Nova Iguaçu', 'Austin', 'NOVA IGUAÇU', '26088-230', -22.7029, -43.5334, NULL, 'INFORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('MORRO DOS 40', 'PL-RJB-EAT0832', 'EAT', 'BAIXADA 2', 'R. José Assis Ferreira, 91 - Centro de Japeri, Japeri - RJ, 26435-267', 'Centro', 'JAPERI', '26435-267', -22.6419, -43.6546, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('NESTOR MARINHO', 'PL-RJB-EAT0825', 'EAT', 'BAIXADA 2', 'R. Nestor Marinho, 14 - Jardim Nossa Sra. das Gracas, Nova Iguaçu - RJ, 26261-230', 'Jardim Alvorada', 'NOVA IGUAÇU', '26261-230', -22.762, -43.4836, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('NILÓPOLIS', 'PL-RJB-EAT0113', 'EAT', 'BAIXADA 2', 'Av. Nazaré, 3076 - Olinda, Nilópolis - RJ, 21645-010', 'Olinda', 'NILÓPOLIS', '21645-010', -22.8207, -43.4072, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('NILO PECANHA (CEMITERIO)', 'PL-RJB-EAT0024', 'EAT', 'BAIXADA 2', 'R. Dep. Andrade Figueira, 826 - Cabuís, Nilópolis - RJ, 26545-191', 'Cabuís', 'NILÓPOLIS', '26545-191', -22.8104, -43.4044, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('ODILON BRAGA', 'PL-RJB-EAT0737', 'EAT', 'BAIXADA 2', 'R. Odilon Braga, 119 - Queimados, RJ, 26310-190', 'Centro', 'QUEIMADOS', '26310-190', -22.7157, -43.5602, NULL, 'INFORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('NOÊMIA VIEIRA', 'PL-RJB-EAT0124', 'EAT', 'BAIXADA 2', 'Av. Abílio Augusto Távora, 3715 - Jardim Alvorada, Nova Iguaçu - RJ, 26265-090', 'Jardim Alvorada', 'NOVA IGUAÇU', '26265-090', -22.7627, -43.4862, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('OLIVIA MARIA MACHADO', 'PL-RJB-EAT0735', 'EAT', 'BAIXADA 2', 'R. Olívia Maria Machado, 145 - Vila Santa Catarina, Queimados - RJ, 26323-400', 'Vila Santa Catarina', 'QUEIMADOS', '26323-400', -22.7237, -43.5571, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('PADRE VIEIRA', 'PL-RJB-EAT0022', 'EAT', 'BAIXADA 2', 'Rua Nair Dias, 657 - Vila São Luís, Nova Iguaçu - RJ, 26012-451', 'Vila São Luís', 'NOVA IGUAÇU', '26012-451', -22.7386, -43.4343, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('PAIOL', 'PL-RJB-EAT0050', 'EAT', 'BAIXADA 2', 'Rua Gen. Olímpio da Fonseca, 917 - Paiol de Pólvora, Nilópolis - RJ, 26545-470', 'Paiol de Pólvora', 'NILÓPOLIS', '26545-470', -22.8152, -43.3967, NULL, 'INFORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('PALHADA', 'PL-RJB-EAT0044', 'EAT', 'BAIXADA 2', 'Estr. da Palhada, 2337 - Valverde, Nova Iguaçu - RJ, 26290-006', 'Valverde', 'NOVA IGUAÇU', '26290-006', -22.7528, -43.5189, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('PARQUE MARAVILHA', 'PL-RJB-EAT0733', 'EAT', 'BAIXADA 2', 'Estrada da Gama, 815 - Oliveira - Nova Iguaçu', 'Oliveira', 'NOVA IGUAÇU', '0', -22.7338, -43.4664, NULL, 'INFORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('PASTOR ANTONIO MARTINS', 'PL-RJB-EAT0823', 'EAT', 'BAIXADA 2', 'R. Rui Chagas, 07 - q 17 loja 01 sala 04 - Flesmam, Queimados - RJ, 26383-320', 'Flesmam', 'QUEIMADOS', '26383-320', -22.7124, -43.5478, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('PRAÇA DA BÍBLIA', 'PL-RJB-EAT0692', 'EAT', 'BAIXADA 2', 'R. Olímpia Silva, 16 - Centro, Queimados - RJ, 26327-380', 'Pacaembu', 'QUEIMADOS', '26330-260', -22.718, -43.5471, NULL, 'INFORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('QUEIMADOS', 'PL-RJB-EAT0697', 'EAT', 'BAIXADA 2', 'Estr. Carlos Sampaio, 176 - São Simao, Queimados - RJ, 26327-410', 'São Simao', 'QUEIMADOS', '26327-410', -22.7115, -43.554, NULL, 'INFORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('QUISSUCO', 'PL-RJB-EAT0102', 'EAT', 'BAIXADA 2', 'Estr. Padre José Anchieta, 76 - Laranjal Santo Antonio', 'Laranjal', 'QUEIMADOS', '0', -22.6932, -43.5581, NULL, 'INFORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('PINDORAMA', 'PL-RJB-EAT0099', 'EAT', 'BAIXADA 2', 'R. Itaparica, 16 - Banco de Areia, Mesquita - RJ, 26570-250', 'Banco de Areia', 'MESQUITA', '26570-250', -22.7777, -43.4149, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('RESERVATÓRIO CABUÇU ALTO', 'PL-RJB-RES0113', 'RES', 'BAIXADA 2', 'Próximo Rua Passa Vinte, Nova Iguaçu - RJ  26290', 'Campo Alegre', 'NOVA IGUAÇU', '26290-000', -22.7595, -43.5398, NULL, 'FORMAL', '1', 'RESERVAÇÃO')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('RESERVATÓRIO NILÓPOLIS', 'PL-RJB-RES0107', 'RES', 'BAIXADA 2', 'Rua Antônio Pereira de Carvalho, Próximo ao n. 217', 'CENTRO', 'NILÓPOLIS', NULL, -22.812, -43.4103, NULL, NULL, '1', 'RESERVAÇÃO')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('RODILÂNDIA', 'PL-RJB-EAT0059', 'EAT', 'BAIXADA 2', 'Rua Rodolfo Torres,67 - Rodilandia - Nova Iguaçu', 'Rodilandia', 'NOVA IGUAÇU', '0', -22.7392, -43.4975, NULL, 'INFORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('ROLDAO GONCALVES', 'PL-RJB-EAT0017', 'EAT', 'BAIXADA 2', 'R. João Rodrigues da Cunha, 1174 - Olinda, Nilópolis - RJ, 26510-049', 'Olinda', 'NILÓPOLIS', '26510-049', -22.8226, -43.4202, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('SANTO ELIAS', 'PL-RJB-EEE1006', 'EEE', 'BAIXADA 2', 'R. Teresinha, 320 - Jacutinga, Mesquita - RJ, 26564-240', 'Jacutinga', 'MESQUITA', '24064-240', -22.7689, -43.4164, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('SANTO ANTÔNIO', 'PL-RJB-EAT0014', 'EAT', 'BAIXADA 2', 'R. Santo Antônio, 9 - Califórnia, Nova Iguaçu - RJ, 26010-050', 'Califórnia', 'NOVA IGUAÇU', '26010-050', -22.7601, -43.4367, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('SÃO JOAQUIM', 'PL-RJB-EAT0824', 'EAT', 'BAIXADA 2', 'Estr. Manuel Resende, 568, Nova Iguaçu - RJ, 26083-530', 'Rodilândia', 'NOVA IGUAÇU', '26083-530', -22.7305, -43.5205, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('SÃO JORGE', 'PL-RJB-ETE1007', 'ETE', 'BAIXADA 2', 'Rua Gastão Costa, 56, São Jorge, Queimados - RJ, 26381-324', 'São Jorge', 'QUEIMADOS', '26381-324', -22.6909, -43.5594, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('SHEIK REJANE', 'PL-RJB-EAT0831', 'EAT', 'BAIXADA 2', 'R. Cheik Rejane, 2-380 - São Jorge, Japeri - RJ, 26435-270', 'São Jorge', 'JAPERI', '26435-270', -22.6447, -43.6577, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('TABELIÃO MURILO COSTA', 'PL-RJB-EAT0751', 'EAT', 'BAIXADA 2', 'R. Cel. Alfredo Soares, 101 - Centro, Nova Iguaçu - RJ, 26255-150', 'Centro', 'NOVA IGUAÇU', '26255-150', -22.7617, -43.4529, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('TACIANO MANACÁ', 'PL-RJB-EAT0829', 'EAT', 'BAIXADA 2', 'R. Taciano Manacá, 101 - São Francisco, Queimados - RJ', 'Sao Francisco', 'QUEIMADOS', '0', -22.6969, -43.5582, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('TIMBO', 'PL-RJB-EAT0739', 'EAT', 'BAIXADA 2', 'R. Timbó, 10 - Vila das Porteiras, Queimados - RJ, 26385-396', 'Vila das Porteiras', 'QUEIMADOS', '26385-396', -22.7085, -43.555, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('VISTA ALEGRE', 'PL-RJB-EAT0828', 'EAT', 'BAIXADA 2', 'R. Gurupi Ac R Padre Jose Anchietpa, 72 - Sao Francisco, Queimados - RJ, 26381-348', 'Sao Francisco', 'QUEIMADOS', '26381-348', -22.6918, -43.5631, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('TRÊS CORAÇÕES', 'PL-RJB-EAT0061', 'EAT', 'BAIXADA 2', 'R. Pindá, 20-66 - Posse, Nova Iguaçu - RJ, 26022-550', 'Posse', 'NOVA IGUAÇU', '26022-550', -22.7287, -43.4613, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('YOLANDA', 'PL-RJB-EAT0817', 'EAT', 'BAIXADA 2', 'Rua Caminho de Madureira, s/n - Iolanda, Nova Iguaçu - RJ, 26277-425', 'Yolanda', 'NOVA IGUAÇU', '26277-425', -22.7723, -43.5145, NULL, 'Nova', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('WALLACE PAES LEME', 'PL-RJB-EAT0098', 'EAT', 'BAIXADA 2', 'Rua Pracinha Wallace Paes Leme, 523 - Olinda, Nilópolis - RJ, 26510-044', 'Olinda', 'NILÓPOLIS', '26510-044', -22.8171, -43.4168, NULL, 'FORMAL', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('3º LINHA PRETA', 'PL-RJB-EAT0849', 'EAT', 'BAIXADA 2', 'Tv. Guaranis - Heliópolis, Belford Roxo', 'Heliópolis', 'Belford Roxo', '26140-014', -22.7348, -43.4189, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('CLUBE 34', 'PL-RJB-EAT0861', 'EAT', 'BAIXADA 2', 'R. Rio de Janeiro, 63 - Jardim Paraíso, Nova Iguaçu - RJ, 26086-005', 'Jardim Paraíso', 'NOVA IGUAÇU', '26086-005', -22.8312, -43.6009, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('MONTE LIBANO', 'PL-RJB-EAT0774', 'EAT', 'BAIXADA 2', 'RUA DAMAS BATISTA 872 - CENTRO - NOVA IGUAÇU', 'CENTRO', 'NOVA IGUAÇU', '26220-180', -22.7515, -43.4306, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('VILA NORMA', 'PL-RJB-EEE1100', 'EEE', 'BAIXADA 2', 'Av. Laura Gonçalves Machado, 255 - Cosmorama, Mesquita - RJ, 26572-360', 'Cosmorama', 'MESQUITA', '26572-360', -22.7892, -43.4099, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('BANCO DE AREIA', 'PL-RJB-EEE0100', 'EEE', 'BAIXADA 2', 'R. Bicuíba, 399 - Banco de Areia', 'Banco de Areia', 'MESQUITA', '26570-090', -22.7813, -43.4167, NULL, NULL, '1', 'DESATIVADO')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('VILA RORAIMA', 'PL-RJB-EAT0723', 'EAT', 'BAIXADA 2', 'Rua sagres 97', 'VALVERDE', 'NOVA IGUAÇU', NULL, -22.7587, -43.5331, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('VILA RORAIMA 2', 'PL-RJB-EAT0971', 'CONTAINER', 'BAIXADA 2', NULL, NULL, 'NOVA IGUAÇU', NULL, NULL, NULL, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('SANTA RITA', 'PL-RJB-EAT0744', 'EAT', 'BAIXADA 2', 'Rua Coronel Alberto de Melo, 809 – Vila de Cava – Nova Iguaçu -  RJ, 26052-050', 'Vila de Cava', 'NOVA IGUAÇU', '26052-050', -22.6855, -43.4469, NULL, NULL, '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('BOOSTER BNH', 'PL-RJB-EAT0775', 'CONTAINER', 'BAIXADA 2', 'Av. Pres. Kennedy, 630 - BNH, Mesquita - RJ, 26574-640', 'BNH', 'MESQUITA', '26574-640', -22.7778, -43.3978, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('BIQUINHA', 'PL-RJB-EAT0724', 'EAT', 'BAIXADA 2', 'R do Comércio, 831-801', 'TINGUÁ', 'NOVA IGUAÇU', '26062-000', NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('BAIXO PEDREIRA', 'PL-RJB-EAT0933', 'EAT', 'BAIXADA 2', 'Rua Luizan 37 - Luz, Nova Iguaçu - Rj.', 'Luz', 'NOVA IGUAÇU', NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('BENTO RUBIÃO', 'PL-RJB-EAT0928', 'EAT', 'BAIXADA 2', 'R. Geni Saraíva, 942 - Ponto Chic, Nova Iguaçu - RJ, 26032-662', NULL, 'NOVA IGUAÇU', NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('AMBAÍ', NULL, 'EAT', 'BAIXADA 2', NULL, NULL, 'NOVA IGUAÇU', NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('JAQUEIRA', 'PL-RJB-EAT0929', 'CONTAINER', 'BAIXADA 2', 'Estrada Padre José Anchieta, 477', 'Jardim Tri-Campeao', 'QUEIMADOS', '26330-000', NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('MORRO DA PAZ', NULL, 'CONTAINER', 'BAIXADA 2', NULL, NULL, 'QUEIMADOS', NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('COLOMBO', NULL, 'CONTAINER', 'BAIXADA 2', 'Estr. do Riachão, 753-671', 'Incofindência', 'QUEIMADOS', '26327-410', -22.721802, 43.541913, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('DONA AFRA', 'Verificar', 'EAT', 'BAIXADA 2', NULL, NULL, 'NOVA IGUAÇU', NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('CARLOS MONSANTE', 'CADASTRAR', 'CONTAINER', 'BAIXADA 2', NULL, NULL, 'NOVA IGUAÇU', NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('BEIRA RIO', NULL, 'CONTAINER', 'BAIXADA 2', NULL, NULL, 'JAPERI', NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('ADIBE SAAD', 'PL-RJB-EAT0934', 'CONTAINER', 'BAIXADA 2', NULL, NULL, 'QUEIMADOS', NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('SÃO SIMÃO', 'Cadastrar', 'CONTAINER', 'BAIXADA 2', NULL, NULL, 'QUEIMADOS', NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('NÉLIO CHAMBARELLI', NULL, 'EAT', 'BAIXADA 2', NULL, NULL, 'QUEIMADOS', NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('MESSIAS', NULL, 'EAT', 'BAIXADA 2', NULL, NULL, 'JAPERI', NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('CHACRINHA', NULL, 'CONTAINER', 'BAIXADA 2', NULL, NULL, 'JAPERI', NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('NOVA CIDADE', NULL, 'CONTAINER', 'BAIXADA 2', NULL, NULL, 'NILÓPOLIS', NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('BOA ESPERANÇA', NULL, 'CONTAINER', 'BAIXADA 2', NULL, NULL, 'NOVA IGUAÇU', NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('TINGUAZINHO', NULL, 'CONTAINER', 'BAIXADA 2', NULL, NULL, 'NOVA IGUAÇU', NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('BELA VISTA', NULL, 'EAT', 'BAIXADA 2', NULL, NULL, 'NOVA IGUAÇU', NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('COMENDADOR SOARES', NULL, 'CONTAINER', 'BAIXADA 2', NULL, NULL, 'NOVA IGUAÇU', NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('MANOEL DIAS', NULL, 'EAT', 'BAIXADA 2', NULL, NULL, 'NOVA IGUAÇU', NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('CAMBURI', NULL, 'EAT', 'BAIXADA 2', NULL, NULL, 'QUEIMADOS', NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('MORRO DO TINGUAZINHO', NULL, 'EAT', 'BAIXADA 2', NULL, NULL, 'NOVA IGUAÇU', NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('MORRO AGUDO', NULL, 'CONTAINER', 'BAIXADA 2', NULL, NULL, 'NOVA IGUAÇU', NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('AEROCLUBE', NULL, 'CONTAINER', 'BAIXADA 2', NULL, NULL, 'NOVA IGUAÇU', NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('BNH 2', NULL, 'CONTAINER', 'BAIXADA 2', NULL, NULL, 'MESQUITA', NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('Morro do Cruzeiro', 'PL-RJB-EAT0972', 'CONTAINER', 'BAIXADA 2', NULL, NULL, 'NOVA IGUAÇU', NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('Praça do Cabuçu', 'Cadastrar', 'CONTAINER', 'BAIXADA 2', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('Paulo Miranda', 'Cadastrar', 'CONTAINER', 'BAIXADA 2', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('DANON 2', 'PL-RJB-EAT0970', 'CONTAINER', NULL, 'RUA GERALDO DANON, 70', 'DANON', 'NOVA IGUAÇU', NULL, NULL, NULL, NULL, 'NOVO', '1', NULL)
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

INSERT INTO elevatorias (nome, planta, tipo, superintendencia, endereco, bairro, municipio, cep, latitude, longitude, inicio_operacao, caracteristicas_area, grupo, funcao)
VALUES ('CIRILO', 'PL-RJB-EAT0973', 'EAT', 'BAIXADA 2', 'Rua cirilo', 'Presidente Juscelino', 'MESQUITA', NULL, NULL, NULL, NULL, 'NOVO', '1', 'OPERACIONAL')
ON CONFLICT (nome) DO UPDATE SET
  planta = EXCLUDED.planta, tipo = EXCLUDED.tipo, superintendencia = EXCLUDED.superintendencia,
  endereco = EXCLUDED.endereco, bairro = EXCLUDED.bairro, municipio = EXCLUDED.municipio, cep = EXCLUDED.cep,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
  inicio_operacao = EXCLUDED.inicio_operacao, caracteristicas_area = EXCLUDED.caracteristicas_area,
  grupo = EXCLUDED.grupo, funcao = EXCLUDED.funcao;

-- 2. Equipamento
INSERT INTO elevatoria_equipamento (elevatoria_id, potencia_motor_cv, rpm, marca_motor, carcaca_motor, tag_motor, tensao_v, corrente_a, mancais_la, mancais_loa, modelo_bomba, tag_bomba, marca_bomba, diametro_rotor_pol, diametro_rotor_mm, tipo_construtivo_elevatoria, bomba_dreno, ponta_eixo_motor, sentido_montagem_motor, flange, forma_construtiva_bomba, vazao_aproximada_m3h, amt_aproximada, capacidade_tratamento, procedencia_mca, cod_sap)
SELECT id AS elevatoria_id, '25CV', '3480rpm', NULL, NULL, NULL, '220', '68.4', NULL, NULL, 'HAR25195B1', 'RJB-21219', 'HELBOMBAS', '3', '142mm', 'TUBULÂO', 'NÃO', NULL, NULL, NULL, NULL, '100m³/h', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'ADOLFO BERGAMINI / ALTO MILITÂO'
 UNION ALL SELECT id AS elevatoria_id, '7.5cv', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'TUBULÂO', NULL, NULL, 'ANFÍBIA', NULL, 'SUBMERSIVEL', NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'AMAURI GUIMARAES'
 UNION ALL SELECT id AS elevatoria_id, '3vc', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CASINHA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'ÂNGELA MARIA'
 UNION ALL SELECT id AS elevatoria_id, '20cv', '3535rpm', 'Weg', '160m', 'RJB-21457', '220V / 380V / 440V', '49.8 / 28.8 / 24.9', NULL, NULL, 'GSD-32/200 20.0', 'RJB-21458', 'Ebara', '2', '197mm', 'ABRIGADA', 'NÃO', NULL, 'HORIZONTAL', NULL, 'CONVENSIONAL', '40M3/h', '54mca', NULL, NULL, NULL FROM elevatorias WHERE nome = 'ANTONIO VALDIGEM'
 UNION ALL SELECT id AS elevatoria_id, '25cv', '3550rpm', 'Weg', '160M', 'RJB-26491', '220V / 380V / 440V', '60.9/35/2/30.4', '6209-ZZ-C3', '6209-ZZ-C3', NULL, 'RJB-26976', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONVENSIONAL', NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BEIRA LINHA'
 UNION ALL SELECT id AS elevatoria_id, '25cv', '3500rpm', NULL, NULL, 'RJB-05419', NULL, NULL, NULL, NULL, NULL, 'RJB-05571', 'WORTHINGTON', '2', NULL, 'ABRIGADA', NULL, NULL, 'VERTICAL', NULL, 'INLINE', NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BELO HORIZONTE'
 UNION ALL SELECT id AS elevatoria_id, '400cv', '1190rpm', 'WEG', '315S/M', 'RJB-12396', '440', '413', NULL, NULL, 'ZW', 'RJB-26840', 'RP', '6', '505mm', 'ABRIGADA', 'SIM', 'CONVENSIONAL', 'VERTICAL', 'FF', 'VERTICAL', '1908,6 m³/h', '47,46 m', NULL, NULL, NULL FROM elevatorias WHERE nome = 'BOOSTER AUSTIN'
 UNION ALL SELECT id AS elevatoria_id, '100cv', '1783 rpm', 'WEG PREMIUM W22', '250S/M', 'RJB-23564', '220V / 380V / 440V', '246A / 142A / 123A', '6314-C3', '6314-C3', 'OMEGA 150-290A', 'RJB-23599', 'KSB', '7', '1780mm', 'ABRIGADA', NULL, NULL, 'HORIZONTAL', NULL, 'HORIZONTAL', '504,0M³/H', '33,0MCA', NULL, NULL, NULL FROM elevatorias WHERE nome = 'BOOSTER BRASÍLIA'
 UNION ALL SELECT id AS elevatoria_id, '50CV', '1770rpm', 'WEG', '200L', 'RJB-06856', '220V / 380V / 440V', '122/70.6/61.0', '6312-C3', '6212-Z-C3', 'OMEGA 150-290A', 'RJB-06880', 'KSB', '4', '247mm', 'ABRIGADA', 'NÃO', NULL, 'HORIZONTAL', NULL, 'HORIZONTAL', '360m³/h', '26.1MCA', NULL, NULL, NULL FROM elevatorias WHERE nome = 'BOOSTER CABUÇU ALTO'
 UNION ALL SELECT id AS elevatoria_id, '200cv', '1790rpm', 'W22 PREMIUM', '315S/M', 'RJB-20410', '220V / 380V / 440V', '476 / 278 / 238A', '6319-C3', '6316-C3', 'OMEGA 150-460B', 'RJB-20411', 'KSB', '4', NULL, 'ABRIGADA', 'NÃO', NULL, 'HORIZONTAL', NULL, 'HORIZONTAL', '360 m³/h', '110MCA', NULL, 'placa', NULL FROM elevatorias WHERE nome = 'BOOSTER ENGENHEIRO PEDREIRA'
 UNION ALL SELECT id AS elevatoria_id, '450CV', '1793rpm', 'WEG', '355.4L', 'RJB-02539', '440', '515', NULL, NULL, 'RDL 250-400 A', 'RJB-07474', 'KSB', '4', NULL, 'ABRIGADA', 'NÃO', NULL, 'HORIZONTAL', NULL, 'HORIZONTAL', '1070M3/H', '85MCA', NULL, NULL, NULL FROM elevatorias WHERE nome = 'BOOSTER JK'
 UNION ALL SELECT id AS elevatoria_id, '175cv', '1791rpm', 'WEG', NULL, 'VERIFICAR', '220 / 380 / 440', '424 / 245 / 212', NULL, NULL, 'OMEGA 150-460 B', 'VERIFICAR', 'KSB', '4', 'Sem Dados', 'ABRIGADA', 'NÃO', 'CONVENSIONAL', 'HORIZONTAL', 'CONVENSIONAL', 'HORIZONTAL', '450 M³/H', '82MCA', NULL, NULL, NULL FROM elevatorias WHERE nome = 'BOOSTER POSSE'
 UNION ALL SELECT id AS elevatoria_id, '7.5 cv', NULL, NULL, NULL, 'RJB-17524', NULL, NULL, '/', NULL, '050-032-160', 'RJB-17563', 'SCHNEIDER', '2', '150mm', 'ABRIGADA', NULL, NULL, 'HORIZONTAL', NULL, 'CONVENSIONAL', '41m3/h', '46mca', NULL, NULL, NULL FROM elevatorias WHERE nome = 'BURITI'
 UNION ALL SELECT id AS elevatoria_id, '20cv', '3535rpm', 'WEG', NULL, 'RJB-05451', '220 / 380', '50.3 / 29.1', NULL, NULL, 'MONOBLOCO', 'RJB-05513', 'Ingersoll-Dresser Pumps', '2', '165,1 mm', 'ABRIGADA', 'NÃO', NULL, 'HORIZONTAL', NULL, 'CONVENSIONAL', NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CAIÇARA'
 UNION ALL SELECT id AS elevatoria_id, '40cv', '3550rpm', 'WEG', NULL, 'RJB-12016', '220 / 380', '97.6 / 56.5', NULL, NULL, NULL, 'RJB-04532', NULL, '2', NULL, 'ABRIGADA', 'NÃO', NULL, 'VERTICAL', NULL, 'INLINE', NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CAIXA VELHA'
 UNION ALL SELECT id AS elevatoria_id, '75CV', '3500rpm', 'HELIBOMBAS', NULL, NULL, '220V / 380V', '187,1A/108,3A', NULL, NULL, 'HAM-75/305-1', NULL, 'HELIBOMAS', NULL, NULL, 'ABRIGADA', 'SIM', NULL, 'ANFÍBIA', NULL, NULL, '750M³/H', '16,5MCA', NULL, NULL, NULL FROM elevatorias WHERE nome = 'CABUÇU BAIXO'
 UNION ALL SELECT id AS elevatoria_id, '4,5CV', '3450RPM', 'VANBRO', 'VMSP', NULL, '220V / 380V / 440V', '13.8/8.0', NULL, NULL, 'VBSP.67X.02.045.Y', NULL, 'VANBRO', '2', '140mm', 'SUBMERSA', NULL, NULL, 'SUBMERSA VERTICAL', NULL, 'SUBMERSA', '24m³/h', '33,5mca', NULL, 'RESERVA FRIA', '5501608' FROM elevatorias WHERE nome = 'CANADENSE'
 UNION ALL SELECT id AS elevatoria_id, '12.5CV', '3535rpm', 'WEG', '132M', 'RJB-21905', '220 / 380 / 440', '30.2 / 17.5 / 15.1', NULL, NULL, NULL, 'RJB-21906', 'W22 premium', '2', '132mm', 'ABRIGADA', 'NÃO', NULL, 'ANFÍBIA', NULL, 'CONVENSIONAL', NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CARAMUJOS'
 UNION ALL SELECT id AS elevatoria_id, '100CV', '1785rpm', 'SEW EURODRIVE', NULL, 'RJB-20145', '220/380/440', '200 / 131 / 151', '6317-2Z-C4', '6315-2RS-C3', 'CONJ.GS - 125/400', 'RJB-23961', 'EBARA', '4', '356', 'ABRIGADA', 'NÃO', NULL, 'HORIZONTAL', NULL, 'CONVENSIONAL', '275.0 m³/h', '55MCA', NULL, 'Placa', NULL FROM elevatorias WHERE nome = 'CARLOS SAMPAIO'
 UNION ALL SELECT id AS elevatoria_id, '15cv', '3530rpm', NULL, NULL, 'RJB-18613', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ABRIGADA', NULL, NULL, 'HORIZONTAL', NULL, 'CONVENSIONAL', NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CAONZE'
 UNION ALL SELECT id AS elevatoria_id, '12.5CV', '3460rpm', 'WEG', 'E56J', 'RJB-30668', '220 / 380', '7.81 / 4.52', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ABRIGADA', NULL, NULL, 'HORIZONTAL', NULL, 'CONVENSIONAL', NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CASA DE CUSTÓDIA COTRIN NETO'
 UNION ALL SELECT id AS elevatoria_id, '7,5cv', '3515rpm', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SUBMERSA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CEFET'
 UNION ALL SELECT id AS elevatoria_id, '100cv', '3500', NULL, '250S/M', 'RJB-21052', '220V / 380V', NULL, NULL, NULL, '4x3x10', 'RJB-30605', NULL, '10', '254mm', 'TUBULÂO', 'SIM', 'JM', 'VERTICAL', 'FC', 'INLINE', '129,25 M³/H', '80MCA', NULL, NULL, NULL FROM elevatorias WHERE nome = 'CHATUBA'
 UNION ALL SELECT id AS elevatoria_id, '10CV', '3535 RPM', 'WEG', '132S', 'RJB-21460', '220V / 380V / 440V', '25.0 / 14.5 / 12.5', '6309-Z-C3', '6207-ZZ', 'THS-18 TRIF IP5', 'RJB-21480', 'EBARA', '2', '179mm', 'ABRIGADA', NULL, NULL, 'HORIZONTAL', NULL, 'CONVENSIONAL', '30m3/h', '55mca', NULL, 'placa', NULL FROM elevatorias WHERE nome = 'CITROPOLIS'
 UNION ALL SELECT id AS elevatoria_id, '7,5cv', '3515', 'WEG', '112M', 'RJB-21481', '220V / 380V / 440V', '19.4 / 11.3 / 9.72', NULL, NULL, 'PX-15/2', 'RJB-21482', 'THEBE', '2', '138mm', 'ABRIGADA', 'NÃO', NULL, 'HORIZONTAL', NULL, 'INLINE', '10,55M3/H', '50MCA', NULL, NULL, NULL FROM elevatorias WHERE nome = 'DANON'
 UNION ALL SELECT id AS elevatoria_id, '15cv', '3530', 'WEG', '132M', 'RJB-21901', '220V / 380V / 440V', '36.8 / 21.3 / 18.4A', NULL, NULL, 'Megablock', 'RJB-21902', NULL, '2', '161', 'ABRIGADA', NULL, NULL, 'HORIZONTAL', NULL, 'CONVENSIONAL', '33M3/h', '54MCA', NULL, 'SAP', '5513316' FROM elevatorias WHERE nome = 'DAS ROSAS'
 UNION ALL SELECT id AS elevatoria_id, '20CV', '3530', 'WEG', '160M', 'RJB-22369', '220V / 380V / 440V', '49.8 / 28.8 / 24.9', NULL, NULL, NULL, NULL, NULL, '2', NULL, 'ABRIGADA', 'NÃO', NULL, 'VERTICAL', NULL, 'INLINE', NULL, '60mca', NULL, 'Preventiva', NULL FROM elevatorias WHERE nome = 'DA SERRA'
 UNION ALL SELECT id AS elevatoria_id, '20CV', '3545', 'WEG', '160M', 'RJB-22359', '220V / 380V / 440V', '49.8 / 28.8 / 24.9', '6309-ZZ-C3', '6209-ZZ-C3', 'VOLUTA', NULL, NULL, '2', '165mm', 'TUBULÂO', 'SIM', 'JM', 'VERTICAL', 'FC', 'HORIZONTAL', NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'DINAMARCO REIS'
 UNION ALL SELECT id AS elevatoria_id, '20CV', '3545rpm', 'WEG', '160m', 'RJB-21949', '220V / 380V / 440V', '49.8/28.8/24.9', NULL, NULL, NULL, 'RJB-21913', 'W22 premium', NULL, NULL, 'ABRIGADA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'DIVINO'
 UNION ALL SELECT id AS elevatoria_id, '5CV', '3475rpm', 'WEG', '100L', 'RJB-23738', '220V / 380V / 440V', '12.8 / 7.39 / 6.38', NULL, NULL, NULL, 'RJB-20022', 'DANCOR', '2', NULL, 'CASINHA', 'NÃO', NULL, 'HORIZONTAL', 'FC', 'CONVENSIONAL', NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'DORALICE'
 UNION ALL SELECT id AS elevatoria_id, '5CV', '3515', 'HERCULES', NULL, 'RJB-23803', '220V / 380V / 440V', '13.84 / 7.99 / 6.02A', NULL, NULL, NULL, 'RJB-05478', 'DANCOR', NULL, NULL, 'ABRIGADA', 'NÃO', NULL, 'HORIZONTAL', NULL, 'CONVENSIONAL', NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'EDNA'
 UNION ALL SELECT id AS elevatoria_id, '10CV', '3510rpm', 'WEG', '132S', 'RJA-11604', '220V / 380V', '25.7 / 14.9', NULL, NULL, '660', 'RJB-07208', 'DANCOR', '2', NULL, 'CASINHA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'EDUARDO CELIDÔNIO'
 UNION ALL SELECT id AS elevatoria_id, '4,5cv', '3450 rpm', 'LEÃO', 'R28A', 'RJB-21452', NULL, NULL, NULL, NULL, '20E8H', 'RJB-21452', 'LEÃO', NULL, '98.5mm', 'SUBMERSA', 'NÃO', NULL, 'SUBMERSA VERTICAL', NULL, NULL, '20 A 36M³/H', '37MCA', NULL, NULL, NULL FROM elevatorias WHERE nome = 'EL SHADAY'
 UNION ALL SELECT id AS elevatoria_id, '14CV', '3450rpm', 'EBARA', NULL, 'RJB-20955', NULL, NULL, NULL, NULL, '650-04', 'RJB-20955', NULL, NULL, NULL, 'SUBMERSA', NULL, NULL, 'SUBMERSA VERTICAL', NULL, 'SUBMERSA', '50 m³/h', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'ENGENHARIA'
 UNION ALL SELECT id AS elevatoria_id, '25CV', '3530rpm', 'WEG', NULL, 'RJB-30617', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ABRIGADA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'ESPLANADA'
 UNION ALL SELECT id AS elevatoria_id, '12cv', NULL, NULL, NULL, 'RJB-30616', '221 / 219', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SUBMERSA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'EXPEDICIONARIOS'
 UNION ALL SELECT id AS elevatoria_id, '25cv', NULL, 'WEG', NULL, 'RJB-12623', NULL, NULL, NULL, NULL, NULL, 'RJA-15138', 'WEG', NULL, NULL, 'ABRIGADA', NULL, NULL, 'VERTICAL', NULL, 'SUBMERSA', NULL, NULL, '11,7 L/S', NULL, NULL FROM elevatorias WHERE nome = 'ETE LAGOINHA'
 UNION ALL SELECT id AS elevatoria_id, '5CV', '3510rpm', 'DANCOR', '100L', 'RJB-00199', '220/380V', '12.8 / 7.39', NULL, NULL, 'W22 Premium', 'RJB-18145', 'WEG', NULL, NULL, 'ABRIGADA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'FLORESTA MIRANDA'
 UNION ALL SELECT id AS elevatoria_id, '7.5CV', '3515rpm', 'WEG', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ABRIGADA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'FRANCISCO XAVIER'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, 'FICTÍCIA', NULL, NULL, NULL, NULL, NULL, 'NÃO TEM', NULL, NULL, NULL, 'SUBMERSA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'GAMA'
 UNION ALL SELECT id AS elevatoria_id, '7.5CV', '1765rpm', 'WEG', '132S', 'RJA-10229', '220/380/440', '19.2 / 11.1 / 9.60', NULL, NULL, NULL, NULL, NULL, '4', '132mm', 'TUBULÂO', 'SIM', NULL, NULL, 'Fc-184', NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'GOLDEN GATE'
 UNION ALL SELECT id AS elevatoria_id, '15cv', '3540rpm', 'VOGES', NULL, 'RJB-19111', '220V / 380V', NULL, '6309 ZZC3', '6309 ZZC', NULL, 'RJB-30608', NULL, '2', NULL, 'TUBULÂO', 'NÃO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'GRAMA'
 UNION ALL SELECT id AS elevatoria_id, '7.5 (10cv)', '3535 RPM', 'Weg', '132S', 'RJB-18367', '220V / 380V / 440V', '25.0/14.5/12.5', NULL, NULL, 'PX-15/3 KN BR T', 'RJB-18368', 'THEBE', '2', NULL, 'ABRIGADA', NULL, NULL, NULL, 'FF-265', NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'GRANJA ROSALINA'
 UNION ALL SELECT id AS elevatoria_id, '7.5CV', '1793rpm', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CASINHA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'HADDOCK LOBO'
 UNION ALL SELECT id AS elevatoria_id, '15CV', '3530rpm', 'WEG', '132M', 'RJB-21995', '220V / 380V / 440V', '36.8 / 21.3 / 18.4', NULL, NULL, NULL, 'RJB-21996', 'WEG', '2', NULL, 'ABRIGADA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'IARA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SUBMERSA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'INDIA PORTUGUESA'
 UNION ALL SELECT id AS elevatoria_id, '20cv', '3530rpm', 'WEG', '160M', 'RJB-04092', '220 / 380V', '49,8 / 28,8', NULL, NULL, NULL, 'RJB-30641', NULL, '2', NULL, 'ABRIGADA', 'NÃO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'ITAPEMIRIM'
 UNION ALL SELECT id AS elevatoria_id, '5.5 (7.5cv)', '3515rpm', 'Weg', '112M', 'RJB-21476', '220V / 380V / 440V', '19.4/11.3/9.72', NULL, NULL, 'PX-15/2', 'RJB-21477', 'W22 Premium', '2', '112mm', 'ABRIGADA', NULL, NULL, NULL, 'FF-215', NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'ITAPAGE'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, 'FICTÍCIA', NULL, NULL, NULL, NULL, NULL, 'FICTÍCIA', NULL, NULL, NULL, 'SUBMERSA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'ITORORÓ'
 UNION ALL SELECT id AS elevatoria_id, '10 CV', '3535 RPM', NULL, NULL, 'NÃO TEM', NULL, NULL, NULL, NULL, NULL, 'FICTÍCIA', NULL, NULL, NULL, 'SUBMERSA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'IVO MIRANDA'
 UNION ALL SELECT id AS elevatoria_id, '10CV', NULL, 'WEG', NULL, 'RJB-14880', '220V / 380V / 440V', NULL, NULL, NULL, NULL, 'RJB-14837', NULL, NULL, NULL, 'CASINHA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'JOSE VIRGILIO DO PRADO'
 UNION ALL SELECT id AS elevatoria_id, NULL, '1750rpm', NULL, NULL, 'NÃO TEM', NULL, NULL, NULL, NULL, 'RGB 801T-EI', 'RJB-30664', NULL, NULL, NULL, 'ABRIGADA', NULL, NULL, NULL, NULL, NULL, '66m³/h', '13.3mca', NULL, NULL, NULL FROM elevatorias WHERE nome = 'LAGOINHA'
 UNION ALL SELECT id AS elevatoria_id, '2,0CV', '1750rpm', 'ABS', NULL, 'RJB-22575', '220V', '10A', NULL, NULL, 'ZULZER EJ20BX', 'RJB-22575', 'ZULZER', NULL, NULL, 'ABRIGADA', NULL, NULL, 'SUBMERSA VERTICAL', NULL, 'SUBMERSIVEL', '18m³/h', '10mca', NULL, NULL, '5539980' FROM elevatorias WHERE nome = 'LAGOINHA II'
 UNION ALL SELECT id AS elevatoria_id, '6 CV', '3330 RPM', NULL, NULL, 'NÃO TEM', '220V', '22A / 23A / 19A', NULL, NULL, NULL, 'RJB-04936', NULL, '2', NULL, 'SUBMERSA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'LIBANEA'
 UNION ALL SELECT id AS elevatoria_id, '7,5 cv', NULL, NULL, NULL, 'RJB-00461', NULL, NULL, NULL, NULL, NULL, 'RJB-00460', NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'LIBERDADE'
 UNION ALL SELECT id AS elevatoria_id, NULL, '3535 RPM', NULL, NULL, 'NÃO TEM', NULL, NULL, NULL, NULL, NULL, 'NÃO TEM', NULL, NULL, NULL, 'SUBMERSA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'LUCIO TAVARES'
 UNION ALL SELECT id AS elevatoria_id, '15cv', NULL, 'WEG', NULL, 'RJA-01036', NULL, NULL, NULL, NULL, NULL, 'RJB-03110', 'DANCOR', NULL, NULL, 'ABRIGADA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MACIEL'
 UNION ALL SELECT id AS elevatoria_id, '5cv', '3450rpm', NULL, NULL, 'NÃO TEM', '220V / 380V', '18A / 18A / 18A', NULL, NULL, 'VBSP67.1782 T', 'RJB-19615', 'VAMBRO', '4', NULL, 'TUBULÂO', NULL, NULL, NULL, NULL, NULL, '27m³/h', '14mca', NULL, NULL, NULL FROM elevatorias WHERE nome = 'MANOEL REIS'
 UNION ALL SELECT id AS elevatoria_id, NULL, '3450rpm', NULL, NULL, 'NÃO TEM', NULL, NULL, NULL, NULL, 'VBOP64 . 6097 T', 'RJB-16423', 'Bombas Vanbro LTDA', '4', NULL, 'CASINHA', NULL, NULL, NULL, NULL, NULL, '13 a 17m³/h', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MAURICIA BORGES'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, 'RJB-18602', NULL, '221A / 22A', NULL, NULL, NULL, 'RJB-18603', NULL, NULL, NULL, 'SUBMERSA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MELVIN JONES'
 UNION ALL SELECT id AS elevatoria_id, '12cv', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SUBMERSA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MENA BARRETO'
 UNION ALL SELECT id AS elevatoria_id, '100cv', '3510rpm', 'WEG', NULL, 'RJB-02885', '220V / 380V', '228 / 132 A', NULL, NULL, NULL, 'RJB-11656', NULL, NULL, NULL, 'ABRIGADA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MESQUITA G1'
 UNION ALL SELECT id AS elevatoria_id, '4,5 CV', '3500 RPM', NULL, NULL, 'NÃO TEM', NULL, NULL, NULL, NULL, NULL, 'NÃO TEM', NULL, NULL, NULL, 'SUBMERSA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MORRO DA COCADA'
 UNION ALL SELECT id AS elevatoria_id, '10', '3515rpm', 'WEG', '132S', 'RJB-07199', '220 / 380 / 440', '25.0 / 14.5 / 12.5', NULL, NULL, NULL, 'RJB-07185', 'DANCOR', '2', NULL, 'ABRIGADA', 'NÃO', NULL, 'HORIZONTAL', NULL, 'CONVENSIONAL', NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MORRO DA TORRE'
 UNION ALL SELECT id AS elevatoria_id, '8 cv', '3500rpm', 'LEAO', NULL, 'RJB-25663', '220V / 380V', '24.0 / 24.0 / 24.0', NULL, NULL, NULL, 'RJB-26857', 'LEAO', NULL, NULL, 'SUBMERSA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MORRO DA MOENDA'
 UNION ALL SELECT id AS elevatoria_id, '15 CV', '3545RPM', 'WEG W22 IR3 Premium', '132M/L', NULL, '220V / 380V / 440V', '36.8 / 21.3 / 18.4', '6207-ZZ', '6307-ZZ', 'FN2F-T-T15,0CV', 'NÃO TEM', 'FAMAC', '1,9', '172mm', 'CONTAINER', 'NÃO', NULL, NULL, NULL, NULL, '87 m³/h', '52mca', NULL, NULL, NULL FROM elevatorias WHERE nome = 'MORRO DO TEMPERO'
 UNION ALL SELECT id AS elevatoria_id, '10 CV', '3515 RPM', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ABRIGADA', NULL, NULL, NULL, NULL, 'CONVENSIONAL', '87 m³/h', '52mca', NULL, NULL, NULL FROM elevatorias WHERE nome = 'MORRO DOS 40'
 UNION ALL SELECT id AS elevatoria_id, '11 (15)CV', '3530rpm', NULL, '1332M', 'NÃO TEM', '220V / 380V / 440V', '36.8 / 21.3 / 18.4', NULL, NULL, NULL, 'RJB-21944', 'W22 Premium', NULL, NULL, 'ABRIGADA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'NESTOR MARINHO'
 UNION ALL SELECT id AS elevatoria_id, '200CV', '1351rpm', 'WEG W22 IR3 Premium', NULL, 'RJB-01827', '440', '258', NULL, NULL, '10 LR 18 A', 'RJB-01829', 'Worthington', '6', '420MM', 'ABRIGADA', 'NÃO', NULL, 'HORIZONTAL', NULL, 'HORIZONTAL', '1080M³/H', '26', NULL, NULL, NULL FROM elevatorias WHERE nome = 'NILÓPOLIS'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, 'NÃO TEM', NULL, NULL, NULL, NULL, NULL, 'FICTÍCIA', NULL, NULL, NULL, 'TUBULÂO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'NILO PECANHA (CEMITERIO)'
 UNION ALL SELECT id AS elevatoria_id, '20CV', '3540rpm', 'WEG', NULL, 'RJB-03134', '220 / 380 / 440', '50.3 / 29.1 / 25.2', NULL, NULL, NULL, NULL, NULL, '2', NULL, 'CASINHA', NULL, NULL, 'HORIZONTAL', NULL, 'HORIZONTAL', NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'ODILON BRAGA'
 UNION ALL SELECT id AS elevatoria_id, '22 (30)CV', '3555rpm', 'WEG', '180M', 'RJB-21997', '220V / 380V / 440V', NULL, NULL, NULL, NULL, 'RJB-23829', NULL, '2', NULL, 'TUBULÂO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'NOÊMIA VIEIRA'
 UNION ALL SELECT id AS elevatoria_id, '15CV', '3520rpm', 'WEG', '132M', 'RJA-00323', NULL, NULL, NULL, NULL, NULL, 'RJB-07285', NULL, NULL, NULL, 'CASINHA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'OLIVIA MARIA MACHADO'
 UNION ALL SELECT id AS elevatoria_id, '6CV', '3450rpm', 'VANBRO', '500/003/X', 'RJB-23689', '220V / 380V', '13.8 / 8.0 A', NULL, NULL, 'VBSP67.1781 T', 'RJB-30626', 'VANBRO', '2', NULL, 'SUBMERSA', NULL, NULL, NULL, NULL, NULL, '27m³/h', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'PADRE VIEIRA'
 UNION ALL SELECT id AS elevatoria_id, '10cv', '3450rpm', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SUBMERSA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'PAIOL'
 UNION ALL SELECT id AS elevatoria_id, '15CV', '3500rpm', 'WEG', '132S', 'RJB-18179', '220V / 380V / 440V', '36,8 A', NULL, NULL, NULL, 'FICTÍCIA', NULL, NULL, NULL, 'TUBULÂO', 'SIM', NULL, NULL, 'C-200', NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'PALHADA'
 UNION ALL SELECT id AS elevatoria_id, '5CV', '1750 RPM', 'WEG', NULL, 'NÃO TEM', '220V / 380V', NULL, NULL, NULL, NULL, 'FICTÍCIA', 'FLOWSERV', NULL, '7.10', 'TUBULÂO', 'SIM', NULL, NULL, NULL, NULL, '170m³/h', '43mca', NULL, NULL, NULL FROM elevatorias WHERE nome = 'PARQUE MARAVILHA'
 UNION ALL SELECT id AS elevatoria_id, '40CV', '3565 RPM', 'WEG', '200M', 'RJB-21937', '220V / 380V / 440V', '101/58.7/50.7 AMP', '6312-ZZ-C3', '6312-ZZ-C3', 'W22 PREMIUM', 'RJB-21938', 'KSB MEGABLOC 100-65-160GG', '1.9', '172MM', 'ABRIGADA', NULL, NULL, NULL, NULL, 'CONVENSIONAL', '170M³/H', '43MCA', NULL, NULL, NULL FROM elevatorias WHERE nome = 'PASTOR ANTONIO MARTINS'
 UNION ALL SELECT id AS elevatoria_id, '12.5cv', '3515rpm', 'WEG', '132m', 'RJB-03133', '220V / 380V / 440V', '30.0 / 17.4 / 15', NULL, NULL, 'BC-21', 'RJB-03119', 'SCHNEIDER', '2', NULL, 'CASINHA', 'NÃO', NULL, 'HORIZONTAL', NULL, 'CONVENSIONAL', NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'PRAÇA DA BÍBLIA'
 UNION ALL SELECT id AS elevatoria_id, '20cv', '3540rpm', 'Weg', '112M', 'RJB-21476', '220/380/440V', '19.4 / 11.3 / 9.72', NULL, NULL, 'MONOBLOCO', 'RJB-07160', NULL, '2', '112M', 'ABRIGADA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'QUEIMADOS'
 UNION ALL SELECT id AS elevatoria_id, '7.5', '3535RPM', 'WEG', '112M', 'RJB-20209', '220V / 380V / 440V', '18.8 / 10.9 / 9.38', '6307-ZZ', '6206-ZZ', NULL, 'RJB-23833', NULL, NULL, NULL, 'TUBULÂO', 'SIM', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'QUISSUCO'
 UNION ALL SELECT id AS elevatoria_id, '15CV', '3535rpm', 'WEG', '132M/L', 'RJB-21020', '220/380/440V', '36.8 / 21.3 / 18.4', NULL, NULL, 'D-1130', 'RJB-21021', 'FLOWSERVE', '2', '157mm', 'TUBULÂO', 'SIM', NULL, NULL, 'FF-265', NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'PINDORAMA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, 'NÃO TEM', NULL, NULL, NULL, NULL, NULL, 'NÃO TEM', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'RESERVATÓRIO CABUÇU ALTO'
 UNION ALL SELECT id AS elevatoria_id, '7,5 CV', '3480 RPM', 'WEG', NULL, 'RJB-00433', '220V / 380V', NULL, NULL, NULL, NULL, 'RJB-10612', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'RESERVATÓRIO NILÓPOLIS'
 UNION ALL SELECT id AS elevatoria_id, '65CV', NULL, NULL, NULL, 'RJB-19159', '220 / 380', '56.5 / 107.5', NULL, NULL, 'S140-4', 'RJB-17273', 'RANKLIN ELETRIC /LEÃO', NULL, '142.5mm', 'SUBMERSA', NULL, NULL, NULL, NULL, NULL, '100 a 190m³/h', '1075 a 565mca', NULL, NULL, NULL FROM elevatorias WHERE nome = 'RODILÂNDIA'
 UNION ALL SELECT id AS elevatoria_id, '20CV', NULL, NULL, NULL, 'RJB-18742', '380V', NULL, NULL, NULL, NULL, 'NÃO TEM', NULL, NULL, NULL, 'TUBULÂO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'ROLDAO GONCALVES'
 UNION ALL SELECT id AS elevatoria_id, '30CV', '1772rpm', 'WEG', '180M', 'RJB-20058', '220/380/440V', '76.2/44.1/38.1', NULL, NULL, 'E10SM', 'RJB-20064', 'IMBIL', '2', '375 mm', 'ABRIGADA', NULL, NULL, NULL, 'ALTERNADA', 'AUTOESCORVANTE', '216.00m³/h', '17.00mca', NULL, NULL, NULL FROM elevatorias WHERE nome = 'SANTO ELIAS'
 UNION ALL SELECT id AS elevatoria_id, '3,0 HP', NULL, 'LOBMAS LEÃO', NULL, 'RJB-19990', '220V / 380V / 440V', NULL, NULL, NULL, NULL, 'FICTÍCIA', NULL, NULL, NULL, 'SUBMERSA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'SANTO ANTÔNIO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, 'NÃO TEM', NULL, NULL, NULL, NULL, NULL, 'NÃO TEM', NULL, NULL, NULL, 'ABRIGADA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'SÃO JOAQUIM'
 UNION ALL SELECT id AS elevatoria_id, '7.5', '1745', 'WEG', NULL, 'RJB-186128', '214 / 212 / 213', '15 / 16 / 15', NULL, NULL, NULL, NULL, NULL, '2', NULL, 'ABRIGADA', NULL, NULL, NULL, NULL, 'SUBMERSIVEL', NULL, NULL, '7,4 l/s', NULL, NULL FROM elevatorias WHERE nome = 'SÃO JORGE'
 UNION ALL SELECT id AS elevatoria_id, '50CV', '3500RPM', 'WEG', '100L', 'RJB-21483', '220V / 380V / 440V', '12.8 / 7.39 / 6.38', NULL, NULL, 'THS-18', 'RJB-21484', 'EBARA BOMBAS AMERICA DO SUL LTDA', '2', '134mm', 'ABRIGADA', NULL, NULL, NULL, NULL, NULL, '180m³/h', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'SHEIK REJANE'
 UNION ALL SELECT id AS elevatoria_id, '3HP', '3450rpm', 'VANBRO', NULL, 'RJB-18708', '220 / 380', '15 / 14', NULL, NULL, NULL, 'RJB-18710', 'VANBRO', '2', NULL, 'SUBMERSA', NULL, NULL, NULL, NULL, NULL, '14m³/h a 22m³/h', '28 / 17', NULL, NULL, NULL FROM elevatorias WHERE nome = 'TABELIÃO MURILO COSTA'
 UNION ALL SELECT id AS elevatoria_id, '7.5CV', '3515rpm', 'Weg', '112M', 'RJB-21470', '220/380/440V', '19.4 / 11.3 / 9.72', NULL, NULL, 'PX-15/2', 'RJB-21471', 'Thebe', '2', '112mm', 'ABRIGADA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'TACIANO MANACÁ'
 UNION ALL SELECT id AS elevatoria_id, '15.CV', '3510rpm', 'HERCULES', 'IEC132', 'RJB-20011', '220/380/440V', '36,0 / 20,80 / 18,0', NULL, NULL, 'IR3', 'RJA-12644', 'DANCOR', '2', '132mm', 'ABRIGADA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'TIMBO'
 UNION ALL SELECT id AS elevatoria_id, '10CV', '3535rpm', 'Weg', '132S', 'RJB-21456', '220V / 380V / 440V', '25.0 / 14.5 / 12.5A', NULL, NULL, NULL, 'RJB-21459', 'thebe', '2', NULL, 'ABRIGADA', NULL, NULL, 'HORIZONTAL', 'FF', 'CONVENSIONAL', NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'VISTA ALEGRE'
 UNION ALL SELECT id AS elevatoria_id, '10CV', '3535rpm', 'WEG', '132s', 'RJB-16870', '220/380/440V', '25.0 / 14.5 / 12.5', NULL, NULL, NULL, 'RJB-16879', 'SCHENEIDER', '2', '171mm', 'ABRIGADA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'TRÊS CORAÇÕES'
 UNION ALL SELECT id AS elevatoria_id, '20cv', '3545rpm', 'WEG', '160M', 'RJB-21453', '220V / 380V / 440V', '49.8 / 28.8 / 24.9', NULL, NULL, 'GSD 32/200', 'RJB-21454', 'EBARA', '2', '219MM', 'ABRIGADA', 'NÃO', 'JP', 'HORIZONTAL', 'FF', 'INLINE', '30,5 M³/H', '76MCA', NULL, NULL, NULL FROM elevatorias WHERE nome = 'YOLANDA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SUBMERSA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'WALLACE PAES LEME'
 UNION ALL SELECT id AS elevatoria_id, '200CV', '1750rpm', 'HELIBOMBAS', NULL, 'NÃO TEM', '440V / 760v', '241A / 140A', NULL, NULL, 'HAR-200/390-1', 'RJB-26826', NULL, '4', '345mm', 'ABRIGADA', NULL, NULL, NULL, NULL, NULL, '792m³/h', '45m.c.a', NULL, 'Placa', NULL FROM elevatorias WHERE nome = '3º LINHA PRETA'
 UNION ALL SELECT id AS elevatoria_id, '6,0 CV', '3500 RPM', 'WEG', '112M', 'RJB-21466', '220V / 380V / 440V', '15,3V/8,88V/7,67V', '6307-ZZ', '6206ZZ', 'R-16(R) IP', 'NÃO TEM', 'EBARA', NULL, '154mm', 'ABRIGADA', 'NÃO', NULL, NULL, NULL, NULL, '15m³/h', '44mca', NULL, NULL, NULL FROM elevatorias WHERE nome = 'CLUBE 34'
 UNION ALL SELECT id AS elevatoria_id, '20 CV', '3545rpm', 'WEG', '160M', 'RJB-24624', '220/380/440v', '49.8 / 28.8 / 24.9', NULL, NULL, NULL, 'RJB-24237', NULL, '2', NULL, 'CONTAINER', NULL, '160mm', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MONTE LIBANO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ABRIGADA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'VILA NORMA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ABRIGADA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BANCO DE AREIA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, 'RJA-19617', NULL, NULL, NULL, NULL, NULL, 'RJB-30602', NULL, NULL, NULL, 'ABRIGADA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'VILA RORAIMA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'VILA RORAIMA 2'
 UNION ALL SELECT id AS elevatoria_id, '125,0 cv', '1750rpm', NULL, NULL, NULL, '440V / 760v', '158A/ 91A', NULL, NULL, NULL, NULL, NULL, '4', '345mm', 'CONTAINER', NULL, NULL, NULL, NULL, NULL, '425m³/h', NULL, NULL, 'Placa', NULL FROM elevatorias WHERE nome = 'SANTA RITA'
 UNION ALL SELECT id AS elevatoria_id, '30CV', '3550rpm', 'WEG', '160L', 'RJB-24403', '220V / 380V / 440V', '73.2 / 42.4 / 36.6A', '6309-ZZ-C3', '6209-ZZ-C3', 'GSD-80/160', 'RJB-23781', 'EBARA', '2', '150', 'CONTAINER', 'NÃO', NULL, 'HORIZONTAL', 'FC-184', 'CONVENSIONAL', '265.56', '49.29', NULL, 'Placa', NULL FROM elevatorias WHERE nome = 'BOOSTER BNH'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BIQUINHA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BAIXO PEDREIRA'
 UNION ALL SELECT id AS elevatoria_id, '60cv', '1780 rpm', 'weg', '224S/M', NULL, '220/380/440', '146/ 84.7 / 73.1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONVENSIONAL', '309.6', '40.5', NULL, NULL, NULL FROM elevatorias WHERE nome = 'BENTO RUBIÃO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'AMBAÍ'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'JAQUEIRA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MORRO DA PAZ'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'COLOMBO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'DONA AFRA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CARLOS MONSANTE'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BEIRA RIO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'ADIBE SAAD'
 UNION ALL SELECT id AS elevatoria_id, '30 (40) cv', '3565rpm', 'WEG', '200M', NULL, '220/380/440v', '101/58.7/50.7A', '6312-ZZ-C3', '6312-ZZ-C3', 'D-1130', NULL, 'FLOWSERVE', '2', '251.00mm', 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'SÃO SIMÃO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'NÉLIO CHAMBARELLI'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MESSIAS'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CHACRINHA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'NOVA CIDADE'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BOA ESPERANÇA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'TINGUAZINHO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BELA VISTA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'COMENDADOR SOARES'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MANOEL DIAS'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CAMBURI'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MORRO DO TINGUAZINHO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MORRO AGUDO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'AEROCLUBE'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BNH 2'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'Morro do Cruzeiro'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'Praça do Cabuçu'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'CONTAINER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'Paulo Miranda'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'DANON 2'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CIRILO'
ON CONFLICT (elevatoria_id) DO UPDATE SET
  potencia_motor_cv = EXCLUDED.potencia_motor_cv, rpm = EXCLUDED.rpm, marca_motor = EXCLUDED.marca_motor,
  carcaca_motor = EXCLUDED.carcaca_motor, tag_motor = EXCLUDED.tag_motor, tensao_v = EXCLUDED.tensao_v,
  corrente_a = EXCLUDED.corrente_a, mancais_la = EXCLUDED.mancais_la, mancais_loa = EXCLUDED.mancais_loa,
  modelo_bomba = EXCLUDED.modelo_bomba, tag_bomba = EXCLUDED.tag_bomba, marca_bomba = EXCLUDED.marca_bomba,
  diametro_rotor_pol = EXCLUDED.diametro_rotor_pol, diametro_rotor_mm = EXCLUDED.diametro_rotor_mm,
  tipo_construtivo_elevatoria = EXCLUDED.tipo_construtivo_elevatoria, bomba_dreno = EXCLUDED.bomba_dreno,
  ponta_eixo_motor = EXCLUDED.ponta_eixo_motor, sentido_montagem_motor = EXCLUDED.sentido_montagem_motor,
  flange = EXCLUDED.flange, forma_construtiva_bomba = EXCLUDED.forma_construtiva_bomba,
  vazao_aproximada_m3h = EXCLUDED.vazao_aproximada_m3h, amt_aproximada = EXCLUDED.amt_aproximada,
  capacidade_tratamento = EXCLUDED.capacidade_tratamento, procedencia_mca = EXCLUDED.procedencia_mca,
  cod_sap = EXCLUDED.cod_sap;

-- 3. Elétrica
INSERT INTO elevatoria_eletrica (elevatoria_id, bt_mt, trafo_kva, num_cliente, medidor, medidor_apurado, unidade_consumo, endereco_concessionaria, fusivel_pc, disjuntor_pc, regulagem_rele_termico_bimetálico, rele_tempo_delta_y, rele_eletrodo_nivel, monitor_corrente, tamanho_fusivel_nh, corrente_fusivel_nh, corrente_fusivel_dz, tag_painel, tipo_acionamento, fabricante_acionamento, modelo_acionamento, corrente_a_acionamento, tag_acionamento, clp, pcp, retaguarda_liga, retaguarda_desliga, recalque_setpoint)
SELECT id AS elevatoria_id, '220V', NULL, '420150274', '5241361', '0', 'AGUA - BOOSTER - ADOLFO BERGAMINI', 'R JOAO RODRIGUES DA CUNHA SN PX1195', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RJB-14411', 'INVERSOR DE FREQUÊNCIA', 'DANFOSS', 'VLT Aqua Drive', '88A', 'RJA-03553', 'SIM', NULL, '1 MCA', '< 1 MCA', '22 MCA' FROM elevatorias WHERE nome = 'ADOLFO BERGAMINI / ALTO MILITÂO'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '430248796', '169005', '0', 'AGUA - ELEV - AMAURI GUIMARÃES', 'RUA GENI SARAIVA E/F 1998', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'AMAURI GUIMARAES'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '420594529', '73520772', '0', 'AGUA - ELEV - ANGELA MARIA', 'R ANGELA MARIA SN EF127', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PARTIDA DIRETA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'ÂNGELA MARIA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '420630267', '8663425', '0', 'AGUA - BVOLANTE - ANTONIO WEINSCHENK', 'R ANTONIO VALDIGEM SN CA1 EF25', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RJB-23520', 'INVERSOR DE FREQUÊNCIA', 'ABB', 'ACO580-01-089A-2', '89/74,8 A', 'RJB-23544', 'SIM', NULL, '1 MCA', '0,2 MCA', '43 MCA' FROM elevatorias WHERE nome = 'ANTONIO VALDIGEM'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, '430086325', '8552185', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PARTIDA DIRETA', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BEIRA LINHA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '412787475', '5241353', '0', 'AGUA - BOOSTER - BELO HORIZONTE', 'AV BELO HORIZONTE SN FT840', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '1 MCA', '<1MCA', '0' FROM elevatorias WHERE nome = 'BELO HORIZONTE'
 UNION ALL SELECT id AS elevatoria_id, '13.8KV', '1000kvar', '0', '0', '0', '0', '0', NULL, '800A', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RJB-08633', 'INVERSOR DE FREQUÊNCIA', 'WEG', 'CFW11', '630A', NULL, 'SIM', NULL, '15 MCA', '10 MCA', '45 MCA' FROM elevatorias WHERE nome = 'BOOSTER AUSTIN'
 UNION ALL SELECT id AS elevatoria_id, '220v', NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, '6 mca', '4 mca', '100 MCA' FROM elevatorias WHERE nome = 'BOOSTER BRASÍLIA'
 UNION ALL SELECT id AS elevatoria_id, '440V', NULL, '430053078', '7891998', '0', 'AGUA - ELEV - CABUCU ALTO G1', 'RUA JOSE CABRAL S/NJOSE CABRAL S/N', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, '16 MCA', '14 MCA', '45 MCA' FROM elevatorias WHERE nome = 'BOOSTER CABUÇU ALTO'
 UNION ALL SELECT id AS elevatoria_id, '220V', '250', '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', 'POWER ELETRONICS', 'SD750', '250KW', 'RJB-18851', 'SIM', NULL, '7 MCA', '5 MCA', '99.9' FROM elevatorias WHERE nome = 'BOOSTER ENGENHEIRO PEDREIRA'
 UNION ALL SELECT id AS elevatoria_id, '440V', '1000kvar', '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', 'POWER ELETRONICS', 'SD750', NULL, NULL, 'SIM', NULL, '2', '2', '0' FROM elevatorias WHERE nome = 'BOOSTER JK'
 UNION ALL SELECT id AS elevatoria_id, '440V', '750kva', '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', 'ABB', 'ACQ580-430A', '430A', NULL, 'SIM', NULL, '4 mca', '3mca', '80MCA' FROM elevatorias WHERE nome = 'BOOSTER POSSE'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RJB-01927', 'PARTIDA DIRETA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'BURITI'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, '413110570', '5028144', '0', 'AGUA - BOOSTER - CAICARA', 'PCA OITICICA SN FT52', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RJB-18806', 'INVERSOR DE FREQUÊNCIA', 'DANFOSS', 'FC-101', '22KW/30HP', 'RJB-18807', 'NÃO', NULL, '1 MCA', '1 MCA', NULL FROM elevatorias WHERE nome = 'CAIÇARA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '411457794', '7516646', '0', 'AGUA - ELEV - BRASILIA', 'R TABE MURILO COSTA 141', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RJB-00159', 'INVERSOR DE FREQUÊNCIA', 'DANFOSS', 'VLT Aqua Drive', NULL, 'RJB-16854', 'SIM', NULL, '1 MCA', '1 MCA', '80MCA' FROM elevatorias WHERE nome = 'CAIXA VELHA'
 UNION ALL SELECT id AS elevatoria_id, '380V', NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RJB-23752', 'INVERSOR DE FREQUÊNCIA', 'ABB', NULL, '145/124 A', 'RJB-24088', 'SIM', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'CABUÇU BAIXO'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '420149824', '5404178', '0', 'AGUA - BOOSTER - UNIVERSAL CANADENSE', 'R JOAO DIEZ LIMA 97', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', 'WEG', 'SSW07', NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'CANADENSE'
 UNION ALL SELECT id AS elevatoria_id, '220v', NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'CARAMUJOS'
 UNION ALL SELECT id AS elevatoria_id, '220v', NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RJB-23645', 'INVERSOR DE FREQUÊNCIA', 'ABB', 'ACO580-01-145A-4', '145A', 'RJB-23646', 'SIM', NULL, '15 MCA', '8MCA', '70 MCA' FROM elevatorias WHERE nome = 'CARLOS SAMPAIO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'CAONZE'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PARTIDA DIRETA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'CASA DE CUSTÓDIA COTRIN NETO'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '420268697', '6617672-7', '0', 'AGUA - BOOSTER - CEFET', 'EST ADRIANOPOLIS SN EF2174', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', 'WEG', 'SSW07', NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'CEFET'
 UNION ALL SELECT id AS elevatoria_id, 'MT', NULL, '400139840', '1999622', '0', 'AGUA - BOOSTER - CHATUBA', 'R MARQUES DE CANARIO SN LT8', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RJB-11687', 'INVERSOR DE FREQUÊNCIA', 'WEG', 'SSW 11', '89A', 'RJB-11695', 'SIM', NULL, '< 1 MCA', '0', '0' FROM elevatorias WHERE nome = 'CHATUBA'
 UNION ALL SELECT id AS elevatoria_id, 'VERIFICAR', 'VERIFICAR', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RJB-23511', 'INVERSOR DE FREQUÊNCIA', 'ABB', 'ACS310-03E-34A1-2', '7,5KW - 10HP', 'RJB-23515', 'SIM', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'CITROPOLIS'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RJB-17683', 'INVERSOR DE FREQUÊNCIA', 'ABB', 'ACS8310-035E-26A8-2', '5.5 KW (7 1/2 HP)', NULL, 'SIM', NULL, '1 MCA', '< 1 MCA', '75 MCA' FROM elevatorias WHERE nome = 'DANON'
 UNION ALL SELECT id AS elevatoria_id, '220v', NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'DAS ROSAS'
 UNION ALL SELECT id AS elevatoria_id, '220v', NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RJB-23287', 'INVERSOR DE FREQUÊNCIA', 'SCHNEIDER', 'Atv320', '15kW', 'RJB-22284', 'SIM', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'DA SERRA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '413497046', '7667390', '0', 'AGUA - BOOSTER - DINAMARCO REIS', 'R DINAMARCO REIS SN', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RJB-20218', 'INVERSOR DE FREQUÊNCIA', 'DANFOSS', 'FC-202P18KT2E20H2', '68A', 'RJB-20218', 'NÃO', NULL, '1 MCA', '< 1 MCA', '0' FROM elevatorias WHERE nome = 'DINAMARCO REIS'
 UNION ALL SELECT id AS elevatoria_id, '220v', NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, '1 MCA', '< 1 MCA', 'SEM SENSOR' FROM elevatorias WHERE nome = 'DIVINO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PARTIDA DIRETA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'DORALICE'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, '413424336', '2417316', '0', 'AGUA - BOOSTER - EDNA', 'R EDNA SN EF16', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RJA-18531', 'INVERSOR DE FREQUÊNCIA', 'ABB', 'AC2310-03E-50A8-2', '11kW', 'RJA-18531', 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'EDNA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PARTIDA DIRETA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'EDUARDO CELIDÔNIO'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '420758197', '7802169', '0', 'AGUA - BOOSTER - ELSHADAI', 'R MARCIO VIEIRA DE OLIVEIRA SN EF370', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PARTIDA DIRETA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'EL SHADAY'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '420203527', '6277280', '0', 'AGUA - BOOSTER - ENGENHARIA', 'AV HENRIQUE DUQUE ESTRADA MEYER SN EF407', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', 'WEG', 'SSW05', NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'ENGENHARIA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '411189247', '5003079', '0', 'AGUA - ELEV - ESPLANADA  (CAIXA BAIXA) * E ANEXOS', 'R FAZENDA 256', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PARTIDA DIRETA', NULL, NULL, NULL, NULL, 'SIM', NULL, '1 MCA', '< 1MCA', '0' FROM elevatorias WHERE nome = 'ESPLANADA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '400379484', '5668080', '0', 'AGUA - ELEV - EXPEDICIONARIOS', 'EST EXPEDICIONARIOS SN EF1254', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', NULL, NULL, NULL, NULL, 'SIM', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'EXPEDICIONARIOS'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', NULL, NULL, NULL, NULL, 'SIM', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'ETE LAGOINHA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '411456713', '4454750', '0', 'AGUA - BOOSTER - FLORESTA MIRANDA', 'R FLORESTA MIRANDA 256', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', 'WEG', 'CFW500', NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'FLORESTA MIRANDA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '410417203', '8268575-4', '0', 'AGUA - ELEV - MARACANA (VILA CAVA)', 'R FRANCISCO XAVIER 810', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', 'ABB', NULL, NULL, NULL, 'NÃO', NULL, '1 MCA', '< 1MCA', '0' FROM elevatorias WHERE nome = 'FRANCISCO XAVIER'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '430171491', '9732192', '0', 'AGUA - ELEV - GAMA', 'R A SN SV BOMBA EQ R GAMA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', NULL, NULL, NULL, NULL, 'SIM', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'GAMA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '430001397', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'GOLDEN GATE'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, '420149935', '4784298', '0', 'AGUA - BOOSTER - GRAMA', 'EST GRAMA 333', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, '1 MCA', '< 1MCA', '0' FROM elevatorias WHERE nome = 'GRAMA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'GRANJA ROSALINA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PARTIDA DIRETA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'HADDOCK LOBO'
 UNION ALL SELECT id AS elevatoria_id, '220v', NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'IARA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '411112102', '2580837', '0', 'AGUA - BOOSTER - INDIA PORTUGUESA (CONSUMO BASE 2013)', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', NULL, 'SSW07', NULL, NULL, 'NÃO', 'SIM', '0', '0', '0' FROM elevatorias WHERE nome = 'INDIA PORTUGUESA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '413269259', '5027615', '0', 'AGUA - BOOSTER - ITAPEMIRIM', 'AV ITAPEMIRIM SN LD815', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RJB-20230', 'INVERSOR DE FREQUÊNCIA', 'DANFOSS', 'FC-202P18KT2E20H2', '18,5 KW / 25 HP', 'RJB-20232', 'SIM', NULL, '1 MCA', '< 1MCA', '0' FROM elevatorias WHERE nome = 'ITAPEMIRIM'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, '1 MCA', '<1 MCA', '0' FROM elevatorias WHERE nome = 'ITAPAGE'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RJB-16937', 'SOFT STARTER', 'WEG', 'SSW07', NULL, 'RJB-16049', 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'ITORORÓ'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '421142751', '8541558', '0', 'AGUA  - ELEV- IVO DE MIRANDA', 'R IVO MIRANDA MONTES SN CN.CEDAE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', 'WEG', 'SSW07', NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'IVO MIRANDA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PARTIDA DIRETA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'JOSE VIRGILIO DO PRADO'
 UNION ALL SELECT id AS elevatoria_id, 'VERIFICAR', 'VERIFICAR', '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'LAGOINHA'
 UNION ALL SELECT id AS elevatoria_id, 'VERIFICAR', 'VERIFICAR', '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'LAGOINHA II'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '420187783', '6144582', '0', 'AGUA - ELEV - LIBANEA', 'R LIBANIA SN EF15 EF15A', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PARTIDA DIRETA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'LIBANEA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PARTIDA DIRETA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'LIBERDADE'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '400380547', '6923505', '0', 'AGUA - ELEV - LUCIO TAVARES', 'R LUCIO TAVARES SN EF329', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PARTIDA DIRETA', NULL, NULL, NULL, NULL, 'NÃO', 'SIM', '0', '0', '0' FROM elevatorias WHERE nome = 'LUCIO TAVARES'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '420631920', '8878387', '0', 'AGUA - BVOLANTE - MACIEL', 'R MACIEL SN EF113', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PARTIDA DIRETA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '1 MCA', '< 1MCA', '0' FROM elevatorias WHERE nome = 'MACIEL'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '414605743', '5187019', '0', 'AGUA - ELEV - MANOEL REIS', 'EST DR MANOEL REIS SN EF395', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', 'WEG', 'SSW07', NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'MANOEL REIS'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '420187776', '6141673', '0', 'AGUA - ELEV - MAURICIA BORGES', 'TR MAURICIA BORGES SN PX303', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PARTIDA DIRETA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'MAURICIA BORGES'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '413730985', '5028143', '0', 'AGUA - BOOSTER - MELVIM JONES', 'TR MELVIM JONES SN LD41', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', NULL, 'SSW07', NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'MELVIN JONES'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '414857558', '5789840', '0', 'AGUA - BVOLANTE - MENA BARRETO', 'EST GAL MENA BARRETO SN EF863', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'MENA BARRETO'
 UNION ALL SELECT id AS elevatoria_id, '220V/MT', NULL, '400131474', '7267348', '0', 'AGUA - BOOSTER - MESQUITA', 'R AUGUSTO CARDOSO SN', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', 'WEG', 'SSW07', NULL, NULL, 'SIM', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'MESQUITA G1'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '0', '7254021', '0', 'AGUA - ELEV - MORRO DA COCADA', 'R DONA ORMINDA SN PX25', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', NULL, NULL, NULL, NULL, 'SIM', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'MORRO DA COCADA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, '0', '0', '0', '0', '0', NULL, NULL, 'NÃO', 'SIM', 'SIM', NULL, NULL, NULL, NULL, 'RJB-22285', 'INVERSOR DE FREQUÊNCIA', 'ABB', 'ACS355', '41A', 'RJB-23832', 'NÃO', NULL, '1 mca', '<1MCA', '0' FROM elevatorias WHERE nome = 'MORRO DA TORRE'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '420160768', '6098958', '0', 'AGUA - BOOSTER - MORRO DA MOENDA', 'R C SN EF21', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'MORRO DA MOENDA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, '5 MCA', '1 MCA', '0' FROM elevatorias WHERE nome = 'MORRO DO TEMPERO'
 UNION ALL SELECT id AS elevatoria_id, '220v', NULL, '0', '0', '0', NULL, '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', 'ABB', 'ACS310-03E-34A1-2', '7,5KW - 10HP', NULL, 'SIM', NULL, '0.5 MCA', '0.2 MCA', '0' FROM elevatorias WHERE nome = 'MORRO DOS 40'
 UNION ALL SELECT id AS elevatoria_id, '220v', NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'NESTOR MARINHO'
 UNION ALL SELECT id AS elevatoria_id, '440V', NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', 'WEG', 'CFW11', '370A', 'RJA-12938', 'SIM', NULL, '15 MCA', '0', '53.6 MCA' FROM elevatorias WHERE nome = 'NILÓPOLIS'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '400375870', '8402966', '0', 'AGUA - ELEV - NILO PECANHA', 'AV NILO PECANHA SN EF826', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PARTIDA DIRETA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'NILO PECANHA (CEMITERIO)'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'ODILON BRAGA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '413341469', '7596746', '0', 'AGUA - BOOSTER - NOEMIA VIEIRA', 'R DONA NOEMIA VIEIRA SN FT171', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', NULL, NULL, NULL, NULL, 'SIM', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'NOÊMIA VIEIRA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '430097071', '8576702', '0', 'AGUA - ELEV - OLIVIA MACHADO', 'R OLIVIA MARIA MACHADO 1SN FT9', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PARTIDA DIRETA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'OLIVIA MARIA MACHADO'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '430054507', '9464391', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', 'WEG', 'SSW07', NULL, NULL, 'SIM', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'PADRE VIEIRA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '414658235', '5411350', '0', 'AGUA - ELEV - JOAO DIAS DE LIMA', 'R JOAO DIEZ LIMA SN EF13', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', NULL, NULL, NULL, NULL, 'SIM', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'PAIOL'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '412957699', '5516825', '0', 'AGUA - BOOSTER - PALHADA', 'EST GOVR LEONEL BRIZOLA 2338 FT', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'PALHADA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '420398927', '8585236', '0', 'AGUA - BOOSTER - PARQUE MARAVILHA', 'EST GAMA SN EF813', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PARTIDA DIRETA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'PARQUE MARAVILHA'
 UNION ALL SELECT id AS elevatoria_id, '220v', NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', 'DANFOSS', 'VLT 102', '104A', NULL, 'SIM', NULL, '1 MCA', '<1 MCA', '0' FROM elevatorias WHERE nome = 'PASTOR ANTONIO MARTINS'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RJB-22567', 'INVERSOR DE FREQUÊNCIA', 'DANFOSS', 'VLT', NULL, 'RJB-20226', 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'PRAÇA DA BÍBLIA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '420227639', '6381594', '0', 'extraIdo no consumo custo ano base 2015. Cadastrado como Agua - ReservatOrio - Morro da Caixa D Agua (GRB)', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, '1 MCA', '< 1 MCA', '0' FROM elevatorias WHERE nome = 'QUEIMADOS'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '420395552', '6748339', '0', 'AGUA - BOOSTER - QUISSUCO', 'R ITAPERAVA SN EF712', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '1 MCA', '< 1 MCA', '0' FROM elevatorias WHERE nome = 'QUISSUCO'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '421230257', '9039847', '0', 'AGUA - BOOSTER - PINDORAMA', 'PCA PINDORAMA SN', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RJB-22282', 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, '1 MCA', '< 1 MCA', '0' FROM elevatorias WHERE nome = 'PINDORAMA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'RESERVATÓRIO CABUÇU ALTO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PARTIDA DIRETA', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'RESERVATÓRIO NILÓPOLIS'
 UNION ALL SELECT id AS elevatoria_id, 'VERIFICAR', 'VERIFICAR', '421063277', '8708755', '0', 'AGUA - ELEV - RODILANDIA', 'R S FRANCISCO DE ASSIS SN CN.CEDAE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', 'WEG', 'SSW07', NULL, NULL, 'SIM', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'RODILÂNDIA'
 UNION ALL SELECT id AS elevatoria_id, 'VERIFICAR', 'VERIFICAR', '420150243', '4896132', '0', 'AGUA - BOOSTER - ROLDAO GONCALVES', 'R JOAO RODRIGUES DA CUNHA SN', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'ROLDAO GONCALVES'
 UNION ALL SELECT id AS elevatoria_id, 'VERIFICAR', 'VERIFICAR', '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RJB-03339', 'INVERSOR DE FREQUÊNCIA', 'WEG', 'BRCFW110070T4SZ', NULL, 'RJB-03363', 'SIM', NULL, '6.800 METROS', '4.500 METROS', '0' FROM elevatorias WHERE nome = 'SANTO ELIAS'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '420400932', '6748009', '0', 'AGUA - BOOSTER - SANTO ANTONIO', 'R STO ANTONIO SN EF9', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PARTIDA DIRETA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'SANTO ANTÔNIO'
 UNION ALL SELECT id AS elevatoria_id, '220v', NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PARTIDA DIRETA', NULL, NULL, NULL, NULL, 'SIM', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'SÃO JOAQUIM'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'SÃO JORGE'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '420160761', '6098959', '0', 'AGUA - BOOSTER - SHEIK REJANE', 'R CEL EMIDIO LEMOS SN PX15', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RJB-23502', 'INVERSOR DE FREQUÊNCIA', 'ABB', 'ACS310-03E-19A4-2', '4KW - 5HP', 'RJB-23503', 'SIM', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'SHEIK REJANE'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PARTIDA DIRETA', NULL, NULL, NULL, NULL, 'SIM', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'TABELIÃO MURILO COSTA'
 UNION ALL SELECT id AS elevatoria_id, '220v', NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, '1 MCA', '< 1 MCA', '0' FROM elevatorias WHERE nome = 'TACIANO MANACÁ'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '430097043', '9434570', '0', 'AGUA - ELEV - TIMBO', 'RUA TIMBO', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'TIMBO'
 UNION ALL SELECT id AS elevatoria_id, '220v', NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RJB-23421', 'INVERSOR DE FREQUÊNCIA', 'ABB', 'ACS310', NULL, 'RJB-23425', 'SIM', NULL, '1 MCA', '< 1 MCA', '0' FROM elevatorias WHERE nome = 'VISTA ALEGRE'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '413142699', '5694464', '0', 'AGUA - BOOSTER - TRES CORACOES', 'R ESTEVAO PEREIRA DE ANDRADE 526', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'NÃO', NULL, '1 MCA', '< 1 MCA', '0' FROM elevatorias WHERE nome = 'TRÊS CORAÇÕES'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RJB-20440', 'INVERSOR DE FREQUÊNCIA', 'ABB', 'ACQ580-01-089A-2', '89/74.5 A', 'RJB-20464', 'SIM', NULL, '2 MCA', '< 2 MCA', '0' FROM elevatorias WHERE nome = 'YOLANDA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, '0', '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', 'WEG', 'SSW07', NULL, NULL, 'NÃO', NULL, '0', '0', '0' FROM elevatorias WHERE nome = 'WALLACE PAES LEME'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', 'ABB', 'ACQ580-01-293A-4', '293A', 'RJB-26820', 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = '3º LINHA PRETA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', NULL, NULL, NULL, NULL, 'NÃO', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CLUBE 34'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MONTE LIBANO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', 'ABB', NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'VILA NORMA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'NÃO', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BANCO DE AREIA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PARTIDA DIRETA', NULL, NULL, NULL, NULL, 'NÃO', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'VILA RORAIMA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'VILA RORAIMA 2'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', 'SCHNEIDER', NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'SANTA RITA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'RJB-24404', 'INVERSOR DE FREQUÊNCIA', 'SIEMENS', 'PM240-2', '80A', 'RJB-25393', 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BOOSTER BNH'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BIQUINHA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SOFT STARTER', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BAIXO PEDREIRA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BENTO RUBIÃO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'AMBAÍ'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'JAQUEIRA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MORRO DA PAZ'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'COLOMBO'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'DONA AFRA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CARLOS MONSANTE'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BEIRA RIO'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'ADIBE SAAD'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'SÃO SIMÃO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'NÉLIO CHAMBARELLI'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MESSIAS'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CHACRINHA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'NOVA CIDADE'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BOA ESPERANÇA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'TINGUAZINHO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BELA VISTA'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'COMENDADOR SOARES'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MANOEL DIAS'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CAMBURI'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MORRO DO TINGUAZINHO'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MORRO AGUDO'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'AEROCLUBE'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BNH 2'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'Morro do Cruzeiro'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'Praça do Cabuçu'
 UNION ALL SELECT id AS elevatoria_id, '220V', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'INVERSOR DE FREQUÊNCIA', NULL, NULL, NULL, NULL, 'SIM', NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'Paulo Miranda'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'DANON 2'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CIRILO'
ON CONFLICT (elevatoria_id) DO UPDATE SET
  bt_mt = EXCLUDED.bt_mt, trafo_kva = EXCLUDED.trafo_kva, num_cliente = EXCLUDED.num_cliente,
  medidor = EXCLUDED.medidor, medidor_apurado = EXCLUDED.medidor_apurado, unidade_consumo = EXCLUDED.unidade_consumo,
  endereco_concessionaria = EXCLUDED.endereco_concessionaria,
  fusivel_pc = EXCLUDED.fusivel_pc, disjuntor_pc = EXCLUDED.disjuntor_pc,
  regulagem_rele_termico_bimetálico = EXCLUDED.regulagem_rele_termico_bimetálico,
  rele_tempo_delta_y = EXCLUDED.rele_tempo_delta_y, rele_eletrodo_nivel = EXCLUDED.rele_eletrodo_nivel,
  monitor_corrente = EXCLUDED.monitor_corrente, tamanho_fusivel_nh = EXCLUDED.tamanho_fusivel_nh,
  corrente_fusivel_nh = EXCLUDED.corrente_fusivel_nh, corrente_fusivel_dz = EXCLUDED.corrente_fusivel_dz,
  tag_painel = EXCLUDED.tag_painel, tipo_acionamento = EXCLUDED.tipo_acionamento,
  fabricante_acionamento = EXCLUDED.fabricante_acionamento, modelo_acionamento = EXCLUDED.modelo_acionamento,
  corrente_a_acionamento = EXCLUDED.corrente_a_acionamento, tag_acionamento = EXCLUDED.tag_acionamento,
  clp = EXCLUDED.clp, pcp = EXCLUDED.pcp,
  retaguarda_liga = EXCLUDED.retaguarda_liga, retaguarda_desliga = EXCLUDED.retaguarda_desliga,
  recalque_setpoint = EXCLUDED.recalque_setpoint;

-- 4. Hidráulica
INSERT INTO elevatoria_hidraulica (elevatoria_id, succao, recalque, tronco, distancia_ate_elev, tomada_retaguarda, tomada_recalque, eletrodo_superior, eletrodo_inferior, tipo_recalque, cota_elevatoria, cota_maxima, distancia_elev_coordenacao)
SELECT id AS elevatoria_id, '100', '150', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'ADOLFO BERGAMINI / ALTO MILITÂO'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'AMAURI GUIMARAES'
 UNION ALL SELECT id AS elevatoria_id, 'DN 50 / 2 POL', 'DN 50 / 2 POL', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'ÂNGELA MARIA'
 UNION ALL SELECT id AS elevatoria_id, '2', '1.1/4', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'ANTONIO VALDIGEM'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BEIRA LINHA'
 UNION ALL SELECT id AS elevatoria_id, '100MM', '50MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BELO HORIZONTE'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BOOSTER AUSTIN'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BOOSTER BRASÍLIA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BOOSTER CABUÇU ALTO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BOOSTER ENGENHEIRO PEDREIRA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BOOSTER JK'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BOOSTER POSSE'
 UNION ALL SELECT id AS elevatoria_id, '2POL', '1.1/4', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BURITI'
 UNION ALL SELECT id AS elevatoria_id, '100MM', '75MMM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CAIÇARA'
 UNION ALL SELECT id AS elevatoria_id, '100MM', '150MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CAIXA VELHA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CABUÇU BAIXO'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CANADENSE'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CARAMUJOS'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CARLOS SAMPAIO'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CAONZE'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CASA DE CUSTÓDIA COTRIN NETO'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CEFET'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CHATUBA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CITROPOLIS'
 UNION ALL SELECT id AS elevatoria_id, '1.1/2', '1.1/2', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'DANON'
 UNION ALL SELECT id AS elevatoria_id, '2.1/2POL', '1.1/2POL', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'DAS ROSAS'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'DA SERRA'
 UNION ALL SELECT id AS elevatoria_id, '100MM', '100MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'DINAMARCO REIS'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'DIVINO'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'DORALICE'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'EDNA'
 UNION ALL SELECT id AS elevatoria_id, '2POL', '2POL', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'EDUARDO CELIDÔNIO'
 UNION ALL SELECT id AS elevatoria_id, '100MM', '100MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'EL SHADAY'
 UNION ALL SELECT id AS elevatoria_id, '100MM', '100MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'ENGENHARIA'
 UNION ALL SELECT id AS elevatoria_id, '150MM', '100MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'ESPLANADA'
 UNION ALL SELECT id AS elevatoria_id, '100MM', '100MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'EXPEDICIONARIOS'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'ETE LAGOINHA'
 UNION ALL SELECT id AS elevatoria_id, '2POL', '2POL', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'FLORESTA MIRANDA'
 UNION ALL SELECT id AS elevatoria_id, '75MM', '75MMM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'FRANCISCO XAVIER'
 UNION ALL SELECT id AS elevatoria_id, '100MM', '100MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'GAMA'
 UNION ALL SELECT id AS elevatoria_id, '100MM', '100MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'GOLDEN GATE'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'GRAMA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'GRANJA ROSALINA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'HADDOCK LOBO'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'IARA'
 UNION ALL SELECT id AS elevatoria_id, '100MM', '75MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'INDIA PORTUGUESA'
 UNION ALL SELECT id AS elevatoria_id, '75MM', '75MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'ITAPEMIRIM'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'ITAPAGE'
 UNION ALL SELECT id AS elevatoria_id, '100MM', '100MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'ITORORÓ'
 UNION ALL SELECT id AS elevatoria_id, '100MM', '100MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'IVO MIRANDA'
 UNION ALL SELECT id AS elevatoria_id, '2POL', '2POL', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'JOSE VIRGILIO DO PRADO'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'LAGOINHA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'LAGOINHA II'
 UNION ALL SELECT id AS elevatoria_id, '100MM', '100MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'LIBANEA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'LIBERDADE'
 UNION ALL SELECT id AS elevatoria_id, '150MM', '150MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'LUCIO TAVARES'
 UNION ALL SELECT id AS elevatoria_id, '2POL', '2POL', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MACIEL'
 UNION ALL SELECT id AS elevatoria_id, '75MM', '75MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MANOEL REIS'
 UNION ALL SELECT id AS elevatoria_id, '100MM', '100MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MAURICIA BORGES'
 UNION ALL SELECT id AS elevatoria_id, '75MM', '75MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MELVIN JONES'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MENA BARRETO'
 UNION ALL SELECT id AS elevatoria_id, 'DN45X200', 'DN45X200', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MESQUITA G1'
 UNION ALL SELECT id AS elevatoria_id, '150MM', '150MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MORRO DA COCADA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MORRO DA TORRE'
 UNION ALL SELECT id AS elevatoria_id, '100MM', '100MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MORRO DA MOENDA'
 UNION ALL SELECT id AS elevatoria_id, '150MM', '150MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MORRO DO TEMPERO'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MORRO DOS 40'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'NESTOR MARINHO'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'NILÓPOLIS'
 UNION ALL SELECT id AS elevatoria_id, '100MM', '150MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'NILO PECANHA (CEMITERIO)'
 UNION ALL SELECT id AS elevatoria_id, '2POL', '2POL', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'ODILON BRAGA'
 UNION ALL SELECT id AS elevatoria_id, '100MM', '100MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'NOÊMIA VIEIRA'
 UNION ALL SELECT id AS elevatoria_id, '2POL', '2POL', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'OLIVIA MARIA MACHADO'
 UNION ALL SELECT id AS elevatoria_id, '75MM', '100MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'PADRE VIEIRA'
 UNION ALL SELECT id AS elevatoria_id, '100MM', '100MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'PAIOL'
 UNION ALL SELECT id AS elevatoria_id, '100MM', '100MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'PALHADA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'PARQUE MARAVILHA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'PASTOR ANTONIO MARTINS'
 UNION ALL SELECT id AS elevatoria_id, '2POL', '2POL', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'PRAÇA DA BÍBLIA'
 UNION ALL SELECT id AS elevatoria_id, '2POL', '2POL', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'QUEIMADOS'
 UNION ALL SELECT id AS elevatoria_id, '100MM', '100MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'QUISSUCO'
 UNION ALL SELECT id AS elevatoria_id, '100MM', '100MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'PINDORAMA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'RESERVATÓRIO CABUÇU ALTO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'RESERVATÓRIO NILÓPOLIS'
 UNION ALL SELECT id AS elevatoria_id, '150MM', '200MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'RODILÂNDIA'
 UNION ALL SELECT id AS elevatoria_id, '100MM', '100MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'ROLDAO GONCALVES'
 UNION ALL SELECT id AS elevatoria_id, '250MM', '250MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'SANTO ELIAS'
 UNION ALL SELECT id AS elevatoria_id, '150MM', '100MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'SANTO ANTÔNIO'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'SÃO JOAQUIM'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'SÃO JORGE'
 UNION ALL SELECT id AS elevatoria_id, '2POL', '2POL', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'SHEIK REJANE'
 UNION ALL SELECT id AS elevatoria_id, '100MM', '100MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'TABELIÃO MURILO COSTA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'TACIANO MANACÁ'
 UNION ALL SELECT id AS elevatoria_id, '2POL', '2POL', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'TIMBO'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '75', '665', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'VISTA ALEGRE'
 UNION ALL SELECT id AS elevatoria_id, '75MM', '75MM', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'TRÊS CORAÇÕES'
 UNION ALL SELECT id AS elevatoria_id, '2', '1.1/4', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'YOLANDA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'WALLACE PAES LEME'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = '3º LINHA PRETA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CLUBE 34'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MONTE LIBANO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'VILA NORMA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BANCO DE AREIA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'VILA RORAIMA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'VILA RORAIMA 2'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'SANTA RITA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BOOSTER BNH'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BIQUINHA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BAIXO PEDREIRA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BENTO RUBIÃO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'AMBAÍ'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'JAQUEIRA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MORRO DA PAZ'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'COLOMBO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'DONA AFRA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CARLOS MONSANTE'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BEIRA RIO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'ADIBE SAAD'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'SÃO SIMÃO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'NÉLIO CHAMBARELLI'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MESSIAS'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CHACRINHA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'NOVA CIDADE'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BOA ESPERANÇA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'TINGUAZINHO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BELA VISTA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'COMENDADOR SOARES'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MANOEL DIAS'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CAMBURI'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MORRO DO TINGUAZINHO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MORRO AGUDO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'AEROCLUBE'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BNH 2'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'Morro do Cruzeiro'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'Praça do Cabuçu'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'Paulo Miranda'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'DANON 2'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CIRILO'
ON CONFLICT (elevatoria_id) DO UPDATE SET
  succao = EXCLUDED.succao, recalque = EXCLUDED.recalque,
  tronco = EXCLUDED.tronco, distancia_ate_elev = EXCLUDED.distancia_ate_elev;

-- 5. Área de Influência
INSERT INTO elevatoria_area_influencia (elevatoria_id, populacao_beneficiada_habitantes, domicilios, comunidades_hospitais_locais_importantes, area_influencia)
SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'ADOLFO BERGAMINI / ALTO MILITÂO'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'AMAURI GUIMARAES'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'ÂNGELA MARIA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'ANTONIO VALDIGEM'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BEIRA LINHA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'BELO HORIZONTE'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BOOSTER AUSTIN'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BOOSTER BRASÍLIA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BOOSTER CABUÇU ALTO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BOOSTER ENGENHEIRO PEDREIRA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BOOSTER JK'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BOOSTER POSSE'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'BURITI'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'CAIÇARA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'CAIXA VELHA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'CABUÇU BAIXO'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'CANADENSE'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'CARAMUJOS'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'CARLOS SAMPAIO'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'CAONZE'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'CASA DE CUSTÓDIA COTRIN NETO'
 UNION ALL SELECT id AS elevatoria_id, '1800', '0', NULL, NULL FROM elevatorias WHERE nome = 'CEFET'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'CHATUBA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'CITROPOLIS'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'DANON'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'DAS ROSAS'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'DA SERRA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'DINAMARCO REIS'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'DIVINO'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'DORALICE'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'EDNA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'EDUARDO CELIDÔNIO'
 UNION ALL SELECT id AS elevatoria_id, '475', '95', NULL, NULL FROM elevatorias WHERE nome = 'EL SHADAY'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'ENGENHARIA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'ESPLANADA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'EXPEDICIONARIOS'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'ETE LAGOINHA'
 UNION ALL SELECT id AS elevatoria_id, '0', '20', NULL, NULL FROM elevatorias WHERE nome = 'FLORESTA MIRANDA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'FRANCISCO XAVIER'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'GAMA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'GOLDEN GATE'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'GRAMA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'GRANJA ROSALINA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'HADDOCK LOBO'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'IARA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'INDIA PORTUGUESA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'ITAPEMIRIM'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'ITAPAGE'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'ITORORÓ'
 UNION ALL SELECT id AS elevatoria_id, '2860', '0', NULL, NULL FROM elevatorias WHERE nome = 'IVO MIRANDA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'JOSE VIRGILIO DO PRADO'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'LAGOINHA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'LAGOINHA II'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'LIBANEA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'LIBERDADE'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'LUCIO TAVARES'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'MACIEL'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'MANOEL REIS'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'MAURICIA BORGES'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'MELVIN JONES'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'MENA BARRETO'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'MESQUITA G1'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'MORRO DA COCADA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'MORRO DA TORRE'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'MORRO DA MOENDA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'MORRO DO TEMPERO'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'MORRO DOS 40'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'NESTOR MARINHO'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'NILÓPOLIS'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'NILO PECANHA (CEMITERIO)'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'ODILON BRAGA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'NOÊMIA VIEIRA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'OLIVIA MARIA MACHADO'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'PADRE VIEIRA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'PAIOL'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'PALHADA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'PARQUE MARAVILHA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'PASTOR ANTONIO MARTINS'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'PRAÇA DA BÍBLIA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'QUEIMADOS'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'QUISSUCO'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'PINDORAMA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'RESERVATÓRIO CABUÇU ALTO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'RESERVATÓRIO NILÓPOLIS'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'RODILÂNDIA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'ROLDAO GONCALVES'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'SANTO ELIAS'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'SANTO ANTÔNIO'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'SÃO JOAQUIM'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'SÃO JORGE'
 UNION ALL SELECT id AS elevatoria_id, '600', '0', NULL, NULL FROM elevatorias WHERE nome = 'SHEIK REJANE'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'TABELIÃO MURILO COSTA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'TACIANO MANACÁ'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'TIMBO'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'VISTA ALEGRE'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'TRÊS CORAÇÕES'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'YOLANDA'
 UNION ALL SELECT id AS elevatoria_id, '0', '0', NULL, NULL FROM elevatorias WHERE nome = 'WALLACE PAES LEME'
 UNION ALL SELECT id AS elevatoria_id, '35368', NULL, NULL, NULL FROM elevatorias WHERE nome = '3º LINHA PRETA'
 UNION ALL SELECT id AS elevatoria_id, '146', NULL, NULL, NULL FROM elevatorias WHERE nome = 'CLUBE 34'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MONTE LIBANO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'VILA NORMA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BANCO DE AREIA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'VILA RORAIMA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'VILA RORAIMA 2'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'SANTA RITA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BOOSTER BNH'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BIQUINHA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BAIXO PEDREIRA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BENTO RUBIÃO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'AMBAÍ'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'JAQUEIRA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MORRO DA PAZ'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'COLOMBO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'DONA AFRA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CARLOS MONSANTE'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BEIRA RIO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'ADIBE SAAD'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'SÃO SIMÃO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'NÉLIO CHAMBARELLI'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MESSIAS'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CHACRINHA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'NOVA CIDADE'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BOA ESPERANÇA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'TINGUAZINHO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BELA VISTA'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'COMENDADOR SOARES'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MANOEL DIAS'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CAMBURI'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MORRO DO TINGUAZINHO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'MORRO AGUDO'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'AEROCLUBE'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'BNH 2'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'Morro do Cruzeiro'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'Praça do Cabuçu'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'Paulo Miranda'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'DANON 2'
 UNION ALL SELECT id AS elevatoria_id, NULL, NULL, NULL, NULL FROM elevatorias WHERE nome = 'CIRILO'
ON CONFLICT (elevatoria_id) DO UPDATE SET
  populacao_beneficiada_habitantes = EXCLUDED.populacao_beneficiada_habitantes,
  domicilios = EXCLUDED.domicilios;

COMMIT;
-- Total: 138 elevatórias importadas
