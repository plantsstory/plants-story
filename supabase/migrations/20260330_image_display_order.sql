-- Add display_order column to cultivar_images for user-defined image ordering
ALTER TABLE cultivar_images ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;

-- Backfill existing images: set display_order based on created_at order per cultivar
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY cultivar_name ORDER BY created_at ASC) - 1 AS rn
  FROM cultivar_images
)
UPDATE cultivar_images SET display_order = ordered.rn
FROM ordered WHERE cultivar_images.id = ordered.id;
