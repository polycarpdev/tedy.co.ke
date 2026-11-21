-- api/migrations/001_init.sql
CREATE TABLE admins (
  id serial PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE stops (
  id serial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  position int NOT NULL,
  year int NOT NULL,
  title text NOT NULL,
  line text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  outfit text NOT NULL DEFAULT 'casual' CHECK (outfit IN ('jersey', 'army', 'casual')),
  accessory text NOT NULL DEFAULT 'none' CHECK (accessory IN ('none', 'camera', 'headphones')),
  published boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE media (
  id serial PRIMARY KEY,
  stop_id int REFERENCES stops(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'photo' CHECK (kind IN ('photo', 'audio')),
  file text NOT NULL,
  width int,
  height int,
  caption text NOT NULL DEFAULT '',
  alt text NOT NULL DEFAULT '',
  position int NOT NULL DEFAULT 0,
  is_cover boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX media_stop_idx ON media (stop_id, position);

CREATE TABLE condolences (
  id serial PRIMARY KEY,
  name text NOT NULL,
  relation text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
CREATE INDEX condolences_status_idx ON condolences (status, created_at DESC);

CREATE TABLE candles (
  id serial PRIMARY KEY,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id serial PRIMARY KEY,
  kind text NOT NULL,
  title text NOT NULL,
  link text NOT NULL DEFAULT '',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE builds (
  id serial PRIMARY KEY,
  status text NOT NULL DEFAULT 'queued',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
