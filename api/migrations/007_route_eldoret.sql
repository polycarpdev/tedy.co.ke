-- api/migrations/007_route_eldoret.sql
DELETE FROM journey_points;

INSERT INTO journey_points (position, name, km, planned_at) VALUES
  (0, 'Defence Forces Memorial Hospital', 0, '2026-12-03 06:00+03'),
  (1, 'Naivasha', 90, '2026-12-03 07:45+03'),
  (2, 'Nakuru', 160, '2026-12-03 09:00+03'),
  (3, 'Eldoret', 310, '2026-12-03 12:00+03'),
  (4, 'Bungoma', 415, '2026-12-03 14:45+03'),
  (5, 'Malaba', 460, '2026-12-03 16:15+03'),
  (6, 'Amairo, Teso South', 480, '2026-12-03 17:00+03');

UPDATE journey SET stopped = false, stopped_at = NULL, paused_seconds = 0, note = '', updated_at = now() WHERE id = 1;
