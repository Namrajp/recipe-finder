-- Bookmarks (per user)
CREATE TABLE public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  recipe_id text NOT NULL,
  recipe jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookmarks_select_own" ON public.bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "bookmarks_insert_own" ON public.bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bookmarks_update_own" ON public.bookmarks
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bookmarks_delete_own" ON public.bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- Search history (per user)
CREATE TABLE public.search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  ingredients jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX search_history_user_created ON public.search_history (user_id, created_at DESC);

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "search_history_select_own" ON public.search_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "search_history_insert_own" ON public.search_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "search_history_delete_own" ON public.search_history
  FOR DELETE USING (auth.uid() = user_id);

-- Shared recipe cache (server-only via service role)
CREATE TABLE public.recipe_cache (
  cache_key text PRIMARY KEY,
  language text NOT NULL,
  generate_images boolean NOT NULL,
  recipes jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.recipe_cache ENABLE ROW LEVEL SECURITY;

-- Shared recipe image metadata (server-only via service role)
CREATE TABLE public.recipe_images (
  hash text PRIMARY KEY,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.recipe_images ENABLE ROW LEVEL SECURITY;

-- Usage / free tier counter (server-only via service role)
CREATE TABLE public.usage (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  recipe_search_count int NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.increment_recipe_search_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usage (user_id, recipe_search_count, updated_at)
  VALUES (p_user_id, 1, now())
  ON CONFLICT (user_id) DO UPDATE
  SET
    recipe_search_count = public.usage.recipe_search_count + 1,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.increment_recipe_search_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_recipe_search_count(uuid) TO service_role;

-- Storage bucket for recipe images
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "recipe_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'recipe-images');
