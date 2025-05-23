-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clients Table
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    solana_wallet TEXT,
    bnb_wallet TEXT,
    pgc_balance NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE clients IS 'Stores information about clients using the Petgas portal.';
COMMENT ON COLUMN clients.pgc_balance IS 'Petgas Coin balance for the client.';

-- Plastic Mitigation Entries Table
CREATE TABLE plastic_mitigation_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    mitigated_plastic_kg NUMERIC NOT NULL CHECK (mitigated_plastic_kg > 0),
    created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE plastic_mitigation_entries IS 'Records plastic mitigation activities by clients.';

-- Mitigation Activity Images Table
CREATE TABLE mitigation_activity_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_id UUID NOT NULL REFERENCES plastic_mitigation_entries(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL, -- Should point to the Supabase Storage URL
    uploaded_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE mitigation_activity_images IS 'Stores URLs of images uploaded for mitigation activities.';
COMMENT ON COLUMN mitigation_activity_images.image_url IS 'Public URL of the image stored in Supabase Storage.';

-- Petgas Consumption Entries Table
CREATE TABLE petgas_consumption_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    liters_consumed NUMERIC NOT NULL CHECK (liters_consumed > 0),
    transaction_date TIMESTAMPTZ DEFAULT now() -- Or a user-specified date
);
COMMENT ON TABLE petgas_consumption_entries IS 'Records Petgas consumption by clients.';

-- Rewards Table
CREATE TABLE rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    pgc_amount NUMERIC NOT NULL CHECK (pgc_amount > 0),
    criteria_plastic_kg NUMERIC CHECK (criteria_plastic_kg IS NULL OR criteria_plastic_kg > 0),
    criteria_petgas_liters NUMERIC CHECK (criteria_petgas_liters IS NULL OR criteria_petgas_liters > 0),
    created_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE rewards IS 'Defines available rewards and their criteria.';
COMMENT ON COLUMN rewards.pgc_amount IS 'PGC amount awarded for this reward.';
COMMENT ON COLUMN rewards.criteria_plastic_kg IS 'Minimum plastic (kg) to mitigate to be eligible for this reward.';
COMMENT ON COLUMN rewards.criteria_petgas_liters IS 'Minimum Petgas (liters) to consume to be eligible for this reward.';

-- Client Rewards Table (Junction table for many-to-many relationship between clients and rewards)
CREATE TABLE client_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE RESTRICT, -- Prevent deleting a reward if it has been awarded
    awarded_at TIMESTAMPTZ DEFAULT now(),
    notes TEXT -- e.g., specific campaign or reason for manual award
);
COMMENT ON TABLE client_rewards IS 'Tracks rewards awarded to clients.';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for clients table
CREATE TRIGGER set_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Example of RLS policies (to be refined based on actual auth logic)
-- Ensure to enable RLS on each table in the Supabase dashboard.

-- For clients table:
-- Users can only see and update their own client record.
-- ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow individual read access" ON clients FOR SELECT USING (auth.uid() = id);
-- CREATE POLICY "Allow individual update access" ON clients FOR UPDATE USING (auth.uid() = id);

-- For plastic_mitigation_entries:
-- Users can CRUD their own entries. Admins can do anything.
-- ALTER TABLE plastic_mitigation_entries ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow individual CRUD access" ON plastic_mitigation_entries FOR ALL USING (client_id = (SELECT id FROM clients WHERE auth.uid() = clients.id));

-- For mitigation_activity_images:
-- Users can CRUD images linked to their own mitigation entries.
-- ALTER TABLE mitigation_activity_images ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow individual CRUD access for images" ON mitigation_activity_images FOR ALL
-- USING (
--   entry_id IN (SELECT id FROM plastic_mitigation_entries WHERE client_id = (SELECT id FROM clients WHERE auth.uid() = clients.id))
-- );

-- For petgas_consumption_entries:
-- Users can CRUD their own consumption entries.
-- ALTER TABLE petgas_consumption_entries ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow individual CRUD access" ON petgas_consumption_entries FOR ALL USING (client_id = (SELECT id FROM clients WHERE auth.uid() = clients.id));

-- For client_rewards:
-- Users can see their own rewards. Admins can CRUD.
-- ALTER TABLE client_rewards ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow individual read access for rewards" ON client_rewards FOR SELECT USING (client_id = (SELECT id FROM clients WHERE auth.uid() = clients.id));

-- For rewards table:
-- All authenticated users can view rewards. Admins can CRUD.
-- ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow read access for authenticated users" ON rewards FOR SELECT USING (auth.role() = 'authenticated');


-- Supabase Storage bucket policy for 'mitigation-images' (conceptual - actual policies set in Supabase dashboard)
-- 1. Public read access for all files in the bucket.
--    - This allows images to be displayed in the client and admin portals without requiring authentication for the image URL itself.
-- 2. Authenticated users can upload images.
--    - This ensures only logged-in clients can upload images.
--    - Optionally, further restrict uploads to only the client associated with the mitigation entry,
--      which would require more complex RLS policies on the storage objects, possibly using custom functions.

-- Example Storage RLS (this is more advanced and typically configured in the Supabase dashboard, not pure SQL for buckets):
-- For inserts on storage.objects in the 'mitigation-images' bucket:
-- (auth.role() = 'authenticated') AND (bucket_id = 'mitigation-images')
-- AND ( (storage.foldername(name))[1] = auth.uid()::text ) --  To ensure user can only upload to their own folder if using user_id as folder name

-- Remember to create the 'mitigation-images' bucket in the Supabase Storage dashboard.
-- And set appropriate policies there.
-- Public access for reads is usually a checkbox.
-- For uploads, you can define policies based on authenticated role. More granular control (e.g., user can only upload to their own folder) often involves setting policies on the `storage.objects` table with conditions on `bucket_id` and `auth.uid()`.

-- Seed data (Optional - for testing)
-- INSERT INTO clients (email, full_name, solana_wallet, bnb_wallet) VALUES
-- ('testuser@example.com', 'Test User', 'solana_wallet_address_1', 'bnb_wallet_address_1');

-- Note: The RLS policies provided are examples and need to be carefully reviewed and tested
-- based on the specific authentication and authorization requirements of the application.
-- The client_id in Supabase auth.uid() might not directly map to clients.id if you are using Supabase Auth for clients
-- and an internal clients table. You might need a mapping or use custom claims.
-- If Supabase Auth `users.id` (auth.uid()) is the same as `clients.id`, then the policies are more straightforward.
-- The current schema assumes `clients.id` is the primary link.
-- If you're using Firebase for admin and Supabase for client auth, the RLS for admin actions would need
-- a different mechanism, possibly by checking a custom claim or a separate admin users table.
-- For now, these RLS policies are geared towards client-side operations on their own data.
-- Admin operations would typically bypass RLS or use a service role key on the server-side.
