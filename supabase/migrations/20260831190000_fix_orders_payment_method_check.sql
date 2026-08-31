/*
  # Fix orders_payment_method_check constraint

  The live `orders_payment_method_check` constraint (added directly against
  the database, outside of any tracked migration) rejects values the
  checkout flow actually sends, so every online checkout currently fails
  with:

    new row for relation "orders" violates check constraint "orders_payment_method_check"

  The frontend (src/pages/CheckoutPage.tsx) only ever sends one of
  'cod', 'card', 'upi'. Redefine the constraint to match that exactly.
*/

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('cod', 'card', 'upi'));
