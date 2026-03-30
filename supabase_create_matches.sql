-- =============================================
-- Tabla: matches
-- =============================================
CREATE TABLE IF NOT EXISTS public.matches (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  join_code  CHAR(4)  NOT NULL UNIQUE,
  score_a    INTEGER  NOT NULL DEFAULT 0,
  score_b    INTEGER  NOT NULL DEFAULT 0,
  sets_a     INTEGER  NOT NULL DEFAULT 0,
  sets_b     INTEGER  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para búsquedas rápidas por join_code
CREATE INDEX IF NOT EXISTS matches_join_code_idx
  ON public.matches (join_code);

-- =============================================
-- Row Level Security (RLS)
-- =============================================
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública (ajusta según tu lógica de auth)
CREATE POLICY "matches_select_public"
  ON public.matches FOR SELECT
  USING (true);

-- Política de inserción pública
CREATE POLICY "matches_insert_public"
  ON public.matches FOR INSERT
  WITH CHECK (true);

-- Política de actualización pública
CREATE POLICY "matches_update_public"
  ON public.matches FOR UPDATE
  USING (true);

-- =============================================
-- Realtime
-- =============================================
ALTER PUBLICATION supabase_realtime
  ADD TABLE public.matches;