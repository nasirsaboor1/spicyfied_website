/*
  # Close a payment-bypass hole: customers can directly UPDATE their own orders

  "Users can update own pending orders" (from 20260115145211) lets any
  authenticated customer UPDATE any column on their own order while it is
  still 'pending', as long as the WITH CHECK (customer_id = auth.uid())
  still holds. It does not restrict which columns can change.

  That means a customer can bypass Razorpay entirely with a single
  supabase.from('orders').update(...) client call before/instead of paying:
  set payment_status = 'paid' and status = 'confirmed' directly, or lower
  total_amount before create-razorpay-order reads it to charge a trivial
  amount for a full order.

  No legitimate feature relies on this policy: the only direct
  orders.update() in the app is in the admin panel (covered by the
  separate "Admins can manage orders" policy), and the one customer-facing
  mutation outside INSERT is cancel_empty_order(), a narrowly-scoped
  SECURITY DEFINER function - whose own comment already states customers
  have no DELETE grant on orders. All real status/payment transitions go
  through the create-razorpay-order / verify-razorpay-payment edge
  functions, which use the service-role key and are unaffected by RLS.

  Dropping it removes customer UPDATE access to orders entirely; INSERT
  (order creation) and SELECT (viewing own orders) are untouched.
*/

DROP POLICY IF EXISTS "Users can update own pending orders" ON orders;
