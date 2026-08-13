/*
  # Fix Contact Submissions RLS Performance Issues

  1. Changes
    - Drop and recreate RLS policies with optimized auth.uid() calls
    - Replace `auth.uid()` with `(select auth.uid())` to prevent re-evaluation per row
    - Improves query performance at scale by evaluating auth function once per query

  2. Security Notes
    - The "Anyone can submit contact form" policy intentionally allows anonymous users to submit
    - This is by design for public contact forms
    - Admin policies are properly restricted to authenticated admin users only
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admin users can view all submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Admin users can update submissions" ON contact_submissions;

-- Recreate policies with optimized auth.uid() calls
CREATE POLICY "Admin users can view all submissions"
  ON contact_submissions
  FOR SELECT
  TO authenticated
  USING (is_admin((select auth.uid())));

CREATE POLICY "Admin users can update submissions"
  ON contact_submissions
  FOR UPDATE
  TO authenticated
  USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));