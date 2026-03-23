-- Enable Realtime for operating_rooms table
-- This allows all clients to receive instant updates when data changes

-- Enable replica identity for the table (required for UPDATE/DELETE events)
ALTER TABLE operating_rooms REPLICA IDENTITY FULL;

-- Add the table to the supabase_realtime publication if not already added
DO $$
BEGIN
  -- Check if publication exists, if not create it
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  
  -- Add operating_rooms to the publication if not already there
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'operating_rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE operating_rooms;
  END IF;
END $$;
