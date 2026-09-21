/*
  # Free delivery for the base pincode only above a minimum order value

  Until now, the base pincode (221001, Varanasi GPO) was always free and
  every other pincode paid a flat outside-zone fee. This changes the base
  pincode's rule to be conditional on order value instead of always free:

    - 221001: free when the order subtotal is >= free_shipping_threshold
      (500), otherwise a flat base_zone_fee (25).
    - Every other pincode: unchanged - flat outside_zone_fee (50).

  `get_delivery_fee` gains a second, optional `p_subtotal` argument so it
  can apply the threshold. The old single-argument signature is dropped
  first (rather than just adding an overload) to avoid an ambiguous-call
  error when something invokes it with just the pincode.
*/

ALTER TABLE delivery_settings
  ADD COLUMN IF NOT EXISTS free_shipping_threshold numeric(10,2) NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS base_zone_fee numeric(10,2) NOT NULL DEFAULT 25;

UPDATE delivery_settings
SET free_shipping_threshold = 500,
    base_zone_fee = 25,
    outside_zone_fee = 50,
    updated_at = now()
WHERE id = true;

UPDATE delivery_zones
SET label = 'Varanasi GPO (base pincode) - Free above Rs 500, else Rs 25 delivery'
WHERE pincode = '221001';

DROP FUNCTION IF EXISTS get_delivery_fee(text);

CREATE OR REPLACE FUNCTION get_delivery_fee(p_postal_code text, p_subtotal numeric DEFAULT NULL)
RETURNS decimal
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  settings delivery_settings%ROWTYPE;
  zone_fee decimal;
  trimmed_code text := trim(p_postal_code);
BEGIN
  SELECT * INTO settings FROM delivery_settings WHERE id = true;

  IF settings.base_pincode IS NOT NULL AND trimmed_code = settings.base_pincode THEN
    IF p_subtotal IS NOT NULL AND p_subtotal >= settings.free_shipping_threshold THEN
      RETURN 0;
    END IF;
    RETURN settings.base_zone_fee;
  END IF;

  SELECT delivery_fee INTO zone_fee
  FROM delivery_zones
  WHERE pincode = trimmed_code;

  IF zone_fee IS NOT NULL THEN
    RETURN zone_fee;
  END IF;

  RETURN COALESCE(settings.outside_zone_fee, 50);
END;
$$;

REVOKE EXECUTE ON FUNCTION get_delivery_fee(text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_delivery_fee(text, numeric) TO anon, authenticated;
