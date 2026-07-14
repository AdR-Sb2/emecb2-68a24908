-- Criar políticas de storage para o bucket manuais
-- O Supabase Storage tem RLS habilitado por padrão em storage.objects,
-- então precisamos de políticas explícitas para permitir upload/leitura.

-- Permitir SELECT público no bucket manuais (bucket é público)
CREATE POLICY "manuais_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'manuais');

-- Permitir INSERT público no bucket manuais (upload de PDFs)
CREATE POLICY "manuais_insert_public"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'manuais');

-- Permitir UPDATE público no bucket manuais
CREATE POLICY "manuais_update_public"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'manuais')
WITH CHECK (bucket_id = 'manuais');

-- Permitir DELETE público no bucket manuais
CREATE POLICY "manuais_delete_public"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'manuais');
