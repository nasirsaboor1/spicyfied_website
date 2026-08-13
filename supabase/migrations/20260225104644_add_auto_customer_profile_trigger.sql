/*
  # Add Automatic Customer Profile Creation

  ## Changes Made

  ### 1. Create Database Trigger
  Creates a database trigger that automatically inserts a customer profile
  when a new user is created in auth.users. This ensures every authenticated
  user always has a corresponding customer record.

  ### 2. Benefits
  - Eliminates race conditions during signup
  - Ensures data consistency between auth.users and customers
  - Simplifies application code by removing manual profile creation
  - Works even if the application fails to create the profile

  ### 3. Security
  - Trigger runs with appropriate permissions
  - Only creates customer records for new auth users
  - Preserves existing RLS policies
*/

-- Create function to automatically create customer profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customers (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
