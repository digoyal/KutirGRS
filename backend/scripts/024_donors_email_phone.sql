-- Split donors.contact into separate email + phone columns.
ALTER TABLE donors
  ADD COLUMN IF NOT EXISTS email VARCHAR(254),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Migrate legacy contact: values with '@' → email; everything else → phone (truncated).
UPDATE donors
SET
  email = CASE
    WHEN contact IS NOT NULL AND position('@' IN contact) > 0
      THEN left(trim(contact), 254)
    ELSE email
  END,
  phone = CASE
    WHEN contact IS NOT NULL AND position('@' IN contact) = 0 AND trim(contact) <> ''
      THEN left(trim(contact), 20)
    ELSE phone
  END
WHERE contact IS NOT NULL AND trim(contact) <> '';

ALTER TABLE donors
  DROP COLUMN IF EXISTS contact;
