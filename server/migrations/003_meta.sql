-- api/migrations/003_meta.sql
CREATE TABLE meta (
  key text PRIMARY KEY,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO meta (key) VALUES ('content_changed_at');
