-- SECURITY: close anonymous write access left over from the pre-auth prototype.
-- Found 2026-09-05: policies "Anyone can update cultivars" (USING true),
-- "Anyone can insert cultivars" (WITH CHECK true) and the cultivar_images
-- equivalents let ANY visitor rewrite or delete every record via PostgREST.
-- Verified by an anonymous PATCH that changed a live row.
--
-- The public site never writes to these tables directly: contributions go
-- through SECURITY DEFINER RPCs (insert_with_edit_key_hash,
-- update_with_edit_key_hash, delete_with_edit_key_hash, append_origin,
-- vote_on_image, cast_origin_vote). Only admin.html writes directly, as admin.

-- ---------- cultivars ----------
DROP POLICY IF EXISTS "Anyone can insert cultivars" ON public.cultivars;
DROP POLICY IF EXISTS "Anyone can update cultivars" ON public.cultivars;
DROP POLICY IF EXISTS "Anyone can read cultivars" ON public.cultivars;   -- redundant with "Public read"
DROP POLICY IF EXISTS "Anyone can delete cultivars" ON public.cultivars;

-- Owners may still edit their own rows directly (kept for the edit flow and
-- the private flag); everything else is admin-only.
DROP POLICY IF EXISTS "Owner update own cultivars" ON public.cultivars;
CREATE POLICY "Owner update own cultivars" ON public.cultivars
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "Owner delete own cultivars" ON public.cultivars;
CREATE POLICY "Owner delete own cultivars" ON public.cultivars
  FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ---------- cultivar_images ----------
DROP POLICY IF EXISTS "Anyone can insert images" ON public.cultivar_images;
DROP POLICY IF EXISTS "Anyone can update votes" ON public.cultivar_images;
DROP POLICY IF EXISTS "Anyone can delete images" ON public.cultivar_images;
DROP POLICY IF EXISTS "Anyone can update images" ON public.cultivar_images;

DROP POLICY IF EXISTS "Authenticated insert images" ON public.cultivar_images;
CREATE POLICY "Authenticated insert images" ON public.cultivar_images
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "Owner or admin update images" ON public.cultivar_images;
CREATE POLICY "Owner or admin update images" ON public.cultivar_images
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR (auth.uid() IS NOT NULL AND user_id = auth.uid()))
  WITH CHECK (public.is_admin() OR (auth.uid() IS NOT NULL AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Owner or admin delete images" ON public.cultivar_images;
CREATE POLICY "Owner or admin delete images" ON public.cultivar_images
  FOR DELETE TO authenticated
  USING (public.is_admin() OR (auth.uid() IS NOT NULL AND user_id = auth.uid()));

-- ---------- least privilege at the table level ----------
-- anon keeps read-only access; writes require a signed-in role or an RPC.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.cultivars FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.cultivar_images FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.cultivars FROM authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.cultivar_images FROM authenticated;
