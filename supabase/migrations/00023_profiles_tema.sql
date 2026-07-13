-- Adiciona coluna de preferência de tema ao perfil do usuário
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tema_preferido TEXT NOT NULL DEFAULT 'light' CHECK (tema_preferido IN ('light', 'dark'));
