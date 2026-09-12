/*
  # Fix orders_status_check constraint

  The live `orders_status_check` constraint (added directly against the
  database, outside of any tracked migration) allowed only
  'pending', 'processing', 'shipped', 'delivered', 'cancelled' - missing
  'confirmed', which verify-razorpay-payment sets on a successful payment.

  This caused every successful online payment to fail silently: Razorpay
  captured the payment, but our own database update to mark the order
  confirmed/paid was rejected, leaving paid orders stuck showing "Pending".
*/

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'processing'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text]));
