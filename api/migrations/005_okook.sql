-- api/migrations/005_okook.sql
UPDATE stops SET year = 2005, year_end = 2008 WHERE slug = 'okook';
