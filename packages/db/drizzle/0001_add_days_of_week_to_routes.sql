-- Add days_of_week column to routes table
ALTER TABLE routes ADD COLUMN days_of_week text[] NOT NULL DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
