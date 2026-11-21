-- api/migrations/004_story.sql
ALTER TABLE stops
  ADD COLUMN place text NOT NULL DEFAULT '',
  ADD COLUMN year_end int,
  ADD COLUMN year_label text NOT NULL DEFAULT '';

ALTER TABLE media ADD COLUMN by_tedy boolean NOT NULL DEFAULT false;
ALTER TABLE media DROP CONSTRAINT IF EXISTS media_kind_check;
ALTER TABLE media ADD CONSTRAINT media_kind_check CHECK (kind IN ('photo', 'audio', 'page'));

UPDATE stops SET title = 'Born in Amairo', place = 'Amairo, Teso South, Busia',
  line = 'Son of Titus Etyang and Janeros Orodi. Brother to Davis, Mercy, Felix and Polycarp.'
WHERE slug = 'born' AND line = 'Thadeus Esirom Etyang. 7 July 1999. To all of us, just Tedy.';

UPDATE stops SET slug = 'isegere', title = 'Isegere Toto School', place = 'Isegere',
  year = 2009, year_end = 2013, outfit = 'jersey',
  line = 'Primary school, the No. 6 shirt in the first team, and graduation day.'
WHERE slug = 'number-six' AND line = 'Number 6 in the primary school first team. Manchester United for life.';

UPDATE stops SET year = 2021,
  line = 'Recruit training began in 2021. He wore the uniform with pride.'
WHERE slug = 'army' AND line = 'He signed up, stood tall, and wore it with pride.';

UPDATE stops SET slug = 'life', title = 'Life with Tedy', year = 2024, year_label = 'Always',
  accessory = 'none', line = 'Hikes, football, coffee and grills. If there was a plan, Tedy made it.'
WHERE slug = 'gatherings' AND line = 'Coffee, grills, hikes. If there was a plan, Tedy made it.';

UPDATE stops SET slug = 'dream', title = 'The Dream', year = 2025, year_label = 'His dream',
  accessory = 'headphones',
  line = 'He loved music, video and photography, and dreamed of opening a free recording studio in his hometown.'
WHERE slug = 'lens' AND line = 'He saw the world through a camera, and made all of us look good in it.';

DELETE FROM stops
WHERE slug = 'studio' AND line = 'Late nights making music. Him and me.'
  AND NOT EXISTS (SELECT 1 FROM media WHERE media.stop_id = stops.id);

UPDATE stops SET
  line = 'In March 2026 he fell ill with a rare blood cell disease and spent months in and out of hospital. He rested on 11 November 2026.'
WHERE slug = 'campfire' AND line = 'The trail ends here, with everyone he brought together.';

INSERT INTO stops (slug, position, year, year_end, title, place, line, outfit, accessory) VALUES
  ('okook', 0, 2002, 2009, 'Okook Primary', 'Okook', 'Where school began.', 'jersey', 'none'),
  ('nambale', 0, 2014, 2017, 'Nambale High School', 'Nambale', 'Four years of high school.', 'casual', 'none'),
  ('nairobi', 0, 2018, 2019, 'The Nairobi hustle', 'Nairobi', 'Two years finding his way in the city.', 'casual', 'none'),
  ('sensei', 0, 2020, NULL, 'Sensei Institute', '', 'Trained as a Plant Operator.', 'casual', 'none'),
  ('some', 0, 2022, NULL, 'School of Military Engineering', '', 'Further training at the School of Military Engineering.', 'army', 'none')
ON CONFLICT (slug) DO NOTHING;

UPDATE stops s SET position = o.pos
FROM (VALUES
  ('born', 1), ('okook', 2), ('isegere', 3), ('nambale', 4), ('nairobi', 5), ('sensei', 6),
  ('army', 7), ('some', 8), ('life', 9), ('dream', 10), ('campfire', 11)
) AS o(slug, pos)
WHERE s.slug = o.slug;

UPDATE stops SET position = position + 100
WHERE slug NOT IN ('born', 'okook', 'isegere', 'nambale', 'nairobi', 'sensei', 'army', 'some', 'life', 'dream', 'campfire');
