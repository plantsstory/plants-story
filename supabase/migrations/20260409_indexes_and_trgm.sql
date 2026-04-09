-- ============================================
-- Performance indexes + pg_trgm for fuzzy search
-- ============================================

-- 1. Enable pg_trgm extension for fuzzy/substring search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Indexes on cultivar_images (frequently queried by cultivar_name)
CREATE INDEX IF NOT EXISTS idx_cultivar_images_cultivar_name
  ON cultivar_images(cultivar_name);

CREATE INDEX IF NOT EXISTS idx_cultivar_images_display_order
  ON cultivar_images(cultivar_name, display_order);

-- 3. Index on origin_votes (frequently queried by cultivar_name)
CREATE INDEX IF NOT EXISTS idx_origin_votes_cultivar_name
  ON origin_votes(cultivar_name);

-- 4. Index on cultivars.cultivar_name for fast lookup
CREATE INDEX IF NOT EXISTS idx_cultivars_cultivar_name
  ON cultivars(cultivar_name);

-- 5. GIN trigram index for fast substring/fuzzy search on cultivar_name
CREATE INDEX IF NOT EXISTS idx_cultivars_name_trgm
  ON cultivars USING gin(cultivar_name gin_trgm_ops);

-- 6. Index on favorites for user lookup
CREATE INDEX IF NOT EXISTS idx_favorites_user_id
  ON favorites(user_id);

-- 7. Index on image_votes for fast count queries
CREATE INDEX IF NOT EXISTS idx_image_votes_image_id
  ON image_votes(image_id);
