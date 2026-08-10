-- Configuração por conta: tamanho de página da lista de atendimentos no módulo Registros
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tamanho_pagina_atendimentos INTEGER NOT NULL DEFAULT 500
  CHECK (tamanho_pagina_atendimentos > 0);
