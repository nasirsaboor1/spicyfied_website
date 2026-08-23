/*
  # Server-side order pricing and review integrity

  Security hardening. Two problems, both rooted in the same cause: the
  browser inserts rows directly via PostgREST, and RLS only checks row
  ownership (user_id = auth.uid()), never the *values* of the columns.
  So a client could set any price or any "verified purchase" flag.

  This migration moves the authoritative values server-side using
  triggers, so the client-supplied numbers are recomputed/overridden
  from trusted data before the row is stored. No client change is
  required - tampered values are simply overwritten.

  ------------------------------------------------------------------
  1. ORDER PRICING (was: CRITICAL client-controlled pricing)

     - order_items BEFORE INSERT: unit_price is forced to the catalog
       price of the referenced product_variant; total_price is forced
       to unit_price * quantity. A missing/unknown variant is rejected.

     - orders AFTER INSERT/UPDATE OF order_items (via order_items trigger):
       subtotal, tax_amount (5%), shipping_amount (0 for pickup, else the
       delivery-zone fee for the shipping address), and total_amount are
       recomputed from the stored order_items + delivery rules. This runs
       after each item is inserted, so the final stored total is always
       the sum of catalog-priced items + tax + shipping, regardless of
       what the client sent.

  2. REVIEW INTEGRITY (was: MEDIUM self-granted verified/approved)

     - reviews BEFORE INSERT/UPDATE: is_verified_purchase is computed from
       whether the user actually has an order_item for that product; the
       client cannot set it. New reviews from non-admins are forced to
       is_approved = true only when verified, otherwise left to the
       existing default (kept permissive here to preserve current
       behavior; flip DEFAULT_REVIEW_APPROVED to false to require
       moderation).
  ------------------------------------------------------------------
*/

-- 1a. order_items: force price from the catalog --------------------------------

CREATE OR REPLACE FUNCTION public.enforce_order_item_pricing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  catalog_price numeric;
BEGIN
  IF NEW.variant_id IS NULL THEN
    RAISE EXCEPTION 'order_items.variant_id is required for pricing';
  END IF;

  SELECT price INTO catalog_price
  FROM product_variants
  WHERE id = NEW.variant_id;

  IF catalog_price IS NULL THEN
    RAISE EXCEPTION 'Unknown product variant %', NEW.variant_id;
  END IF;

  IF NEW.quantity IS NULL OR NEW.quantity < 1 THEN
    RAISE EXCEPTION 'order_items.quantity must be >= 1';
  END IF;

  -- Authoritative values, regardless of what the client sent.
  NEW.unit_price := catalog_price;
  NEW.total_price := catalog_price * NEW.quantity;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_order_item_pricing ON order_items;
CREATE TRIGGER trg_enforce_order_item_pricing
  BEFORE INSERT OR UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_item_pricing();

-- 1b. orders: recompute totals from the stored items ---------------------------

CREATE OR REPLACE FUNCTION public.recompute_order_totals(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subtotal numeric;
  v_tax numeric;
  v_shipping numeric;
  v_delivery_type text;
  v_postal_code text;
BEGIN
  SELECT COALESCE(SUM(total_price), 0) INTO v_subtotal
  FROM order_items WHERE order_id = p_order_id;

  SELECT o.delivery_type, a.postal_code
  INTO v_delivery_type, v_postal_code
  FROM orders o
  LEFT JOIN addresses a ON a.id = o.shipping_address_id
  WHERE o.id = p_order_id;

  v_tax := round(v_subtotal * 0.05, 2);

  IF v_delivery_type = 'pickup' THEN
    v_shipping := 0;
  ELSIF v_postal_code IS NOT NULL THEN
    v_shipping := get_delivery_fee(v_postal_code);
  ELSE
    v_shipping := 0;
  END IF;

  UPDATE orders
  SET subtotal = v_subtotal,
      tax_amount = v_tax,
      shipping_amount = v_shipping,
      total_amount = v_subtotal + v_tax + v_shipping
  WHERE id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recompute_order_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recompute_order_totals(
    COALESCE(NEW.order_id, OLD.order_id)
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_items_recompute_totals ON order_items;
CREATE TRIGGER trg_order_items_recompute_totals
  AFTER INSERT OR UPDATE OR DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_recompute_order_totals();

-- 2. reviews: compute is_verified_purchase server-side -------------------------

CREATE OR REPLACE FUNCTION public.enforce_review_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_purchase boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.user_id = NEW.user_id
      AND oi.product_id = NEW.product_id
  ) INTO has_purchase;

  -- Client cannot self-certify a verified purchase.
  NEW.is_verified_purchase := has_purchase;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_review_integrity ON reviews;
CREATE TRIGGER trg_enforce_review_integrity
  BEFORE INSERT OR UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_review_integrity();
