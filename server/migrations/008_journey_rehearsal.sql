-- api/migrations/008_journey_rehearsal.sql
ALTER TABLE journey ADD COLUMN plan_backup jsonb;
