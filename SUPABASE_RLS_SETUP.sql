-- ============================================
-- CONFIGURACIÓN DE RLS PARA BUCKET "pdfs"
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- Dashboard > SQL Editor > New Query
--
-- NOTA: Con la Netlify Function usando service_role key,
-- solo necesitamos permitir LECTURA pública.
-- La ESCRITURA se hace desde el servidor con service_role (bypass RLS).

-- 1. Primero, asegúrate de que el bucket "pdfs" existe y es público (para lectura)
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Eliminar políticas existentes (si las hay) para evitar conflictos
DROP POLICY IF EXISTS "Allow public uploads to pdfs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from pdfs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates to pdfs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes from pdfs bucket" ON storage.objects;

-- 3. Crear política para permitir SOLO lecturas públicas (SELECT)
-- Las subidas se hacen via Netlify Function con service_role key
CREATE POLICY "Allow public reads from pdfs bucket"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'pdfs');

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Después de ejecutar, verifica que las políticas se crearon:
SELECT * FROM pg_policies WHERE tablename = 'objects';

-- ============================================
-- CONFIGURACIÓN EN NETLIFY (REQUERIDO)
-- ============================================
-- 1. Ve a Netlify > Site settings > Environment variables
-- 2. Agrega las siguientes variables:
--    - SUPABASE_URL: tu URL de Supabase (ej: https://xxx.supabase.co)
--    - SUPABASE_SERVICE_ROLE_KEY: tu service_role key de Supabase
--      (Obtener de: Supabase Dashboard > Settings > API > service_role key)
--
-- IMPORTANTE: La service_role key NUNCA debe exponerse al cliente.
-- Solo debe usarse en funciones del servidor (Netlify Functions).

-- ============================================
-- ALTERNATIVA: Políticas permisivas (menos seguro)
-- ============================================
-- Si prefieres permitir subidas directas desde el cliente (NO recomendado),
-- descomenta las siguientes líneas:

-- CREATE POLICY "Allow public uploads to pdfs bucket"
-- ON storage.objects
-- FOR INSERT
-- TO public
-- WITH CHECK (
--     bucket_id = 'pdfs' 
--     AND (storage.foldername(name))[1] = 'public'
--     AND name ~ '^public/[A-Za-z0-9_-]+_[0-9]{4}-[0-9]{2}-[0-9]{2}\.pdf$'
-- );

-- CREATE POLICY "Allow public updates to pdfs bucket"
-- ON storage.objects
-- FOR UPDATE
-- TO public
-- USING (bucket_id = 'pdfs')
-- WITH CHECK (bucket_id = 'pdfs');
