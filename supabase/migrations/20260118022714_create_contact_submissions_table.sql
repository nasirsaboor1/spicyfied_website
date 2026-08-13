/*
  # Create Contact Submissions Table

  1. New Tables
    - `contact_submissions`
      - `id` (uuid, primary key) - Unique identifier for each submission
      - `name` (text) - Name of the person contacting
      - `email` (text) - Email address for response
      - `phone` (text, optional) - Contact phone number
      - `message` (text) - The message content
      - `status` (text) - Status of the submission (new, read, replied)
      - `created_at` (timestamptz) - Timestamp of submission

  2. Security
    - Enable RLS on `contact_submissions` table
    - Add policy for anonymous users to insert submissions
    - Add policy for authenticated admin users to view all submissions
    - Add policy for authenticated admin users to update submission status

  3. Performance
    - Add index on created_at for efficient sorting
    - Add index on status for filtering
*/

-- Create contact submissions table
CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can submit a contact form (anonymous users)
CREATE POLICY "Anyone can submit contact form"
  ON contact_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Admin users can view all submissions
CREATE POLICY "Admin users can view all submissions"
  ON contact_submissions
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Policy: Admin users can update submission status
CREATE POLICY "Admin users can update submissions"
  ON contact_submissions
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);