-- Rulare unică după prima pornire care a creat coloana `nr_pozitii` cu NULL pe posturi vechi.
-- În pgAdmin, DBeaver sau: psql -U <user> -d HR -f fix-posturi-nr-pozitii.sql

UPDATE posturi SET nr_pozitii = 1 WHERE nr_pozitii IS NULL;

ALTER TABLE posturi ALTER COLUMN nr_pozitii SET DEFAULT 1;
ALTER TABLE posturi ALTER COLUMN nr_pozitii SET NOT NULL;
