/*
  # Add carrier column to orders

  The admin "mark as shipped" flow captures a carrier name alongside the
  existing tracking_number column so the WhatsApp shipping notification
  has something to point the customer at ("Shipped via Delhivery,
  tracking ABC123").
*/

ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier text;
