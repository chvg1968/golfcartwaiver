-- ============================================
-- CONFIGURACIÓN DE RLS PARA BUCKET "pdfs"
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- Dashboard > SQL Editor > New Query

-- 1. Primero, asegúrate de que el bucket "pdfs" existe y es público
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Eliminar políticas existentes (si las hay) para evitar conflictos
DROP POLICY IF EXISTS "Allow public uploads to pdfs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from pdfs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to pdfs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes from pdfs bucket" ON storage.objects;

-- 3. Crear política para permitir subidas públicas (INSERT)
CREATE POLICY "Allow public uploads to pdfs bucket"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'pdfs');

-- 4. Crear política para permitir lecturas públicas (SELECT)
CREATE POLICY "Allow public reads from pdfs bucket"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'pdfs');

-- 5. Crear política para permitir actualizaciones (UPDATE) - necesario para upsert
CREATE POLICY "Allow public updates to pdfs bucket"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'pdfs')
WITH CHECK (bucket_id = 'pdfs');

-- 6. Opcional: Crear política para eliminar archivos (DELETE)
CREATE POLICY "Allow public deletes from pdfs bucket"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'pdfs');

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Después de ejecutar, verifica que las políticas se crearon:
SELECT * FROM pg_policies WHERE tablename = 'objects';

-- ============================================
-- ALTERNATIVA: Si prefieres hacerlo desde el Dashboard
-- ============================================
-- 1. Ve a Storage > Buckets
-- 2. Haz clic en "pdfs" (o créalo si no existe)
-- 3. Ve a "Policies" 
-- 4. Crea las siguientes políticas:
--    - INSERT: Permitir a todos (anon, authenticated)
--    - SELECT: Permitir a todos (anon, authenticated)
--    - UPDATE: Permitir a todos (anon, authenticated)
-- 5. Asegúrate de que el bucket esté marcado como "Public"
