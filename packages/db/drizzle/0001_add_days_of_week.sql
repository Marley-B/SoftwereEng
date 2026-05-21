-- Existing databases may have been created before days_of_week was added to routes.
ALTER TABLE "routes" ADD COLUMN IF NOT EXISTS "days_of_week" text[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']::text[] NOT NULL;
