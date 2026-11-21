-- api/migrations/002_seed_stops.sql
INSERT INTO stops (slug, position, year, title, line, outfit, accessory) VALUES
  ('born', 1, 1999, 'Born', 'Thadeus Esirom Etyang. 7 July 1999. To all of us, just Tedy.', 'jersey', 'none'),
  ('number-six', 2, 2011, 'No. 6', 'Number 6 in the primary school first team. Manchester United for life.', 'jersey', 'none'),
  ('army', 3, 2019, 'Kenya Army', 'He signed up, stood tall, and wore it with pride.', 'army', 'none'),
  ('gatherings', 4, 2021, 'The Gatherings', 'Coffee, grills, hikes. If there was a plan, Tedy made it.', 'casual', 'none'),
  ('lens', 5, 2023, 'Through the Lens', 'He saw the world through a camera, and made all of us look good in it.', 'casual', 'camera'),
  ('studio', 6, 2025, 'The Studio', 'Late nights making music. Him and me.', 'casual', 'headphones'),
  ('campfire', 7, 2026, 'The Campfire', 'The trail ends here, with everyone he brought together.', 'casual', 'none');
