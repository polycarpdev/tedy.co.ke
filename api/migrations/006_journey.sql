-- api/migrations/006_journey.sql
CREATE TABLE journey (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  title text NOT NULL DEFAULT 'Bringing Tedy home',
  depart_at timestamptz NOT NULL,
  arrive_at timestamptz NOT NULL,
  show_from timestamptz,
  show_until timestamptz,
  stopped boolean NOT NULL DEFAULT false,
  stopped_at timestamptz,
  paused_seconds int NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE journey_points (
  id serial PRIMARY KEY,
  position int NOT NULL,
  name text NOT NULL,
  km numeric NOT NULL,
  planned_at timestamptz NOT NULL,
  passed_at timestamptz
);

INSERT INTO journey (depart_at, arrive_at, show_from, show_until)
VALUES ('2026-12-03 06:00+03', '2026-12-03 17:00+03', '2026-12-02 00:00+03', '2026-12-05 00:00+03');

INSERT INTO journey_points (position, name, km, planned_at) VALUES
  (0, 'Defence Forces Memorial Hospital', 0, '2026-12-03 06:00+03'),
  (1, 'Naivasha', 90, '2026-12-03 07:45+03'),
  (2, 'Nakuru', 160, '2026-12-03 09:00+03'),
  (3, 'Kericho', 265, '2026-12-03 11:00+03'),
  (4, 'Kisumu', 345, '2026-12-03 12:45+03'),
  (5, 'Busia', 465, '2026-12-03 15:15+03'),
  (6, 'Amairo, Teso South', 495, '2026-12-03 17:00+03');
