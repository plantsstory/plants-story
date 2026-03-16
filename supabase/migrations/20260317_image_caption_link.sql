-- Add caption and link_url columns to cultivar_images
ALTER TABLE cultivar_images ADD COLUMN IF NOT EXISTS caption TEXT DEFAULT NULL;
ALTER TABLE cultivar_images ADD COLUMN IF NOT EXISTS link_url TEXT DEFAULT NULL;
