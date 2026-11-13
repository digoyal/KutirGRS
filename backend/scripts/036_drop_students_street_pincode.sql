-- Drop legacy student address columns (street, pincode). Validate-on-write for other fields;
-- existing rows may still have nulls until edited.
ALTER TABLE students DROP COLUMN IF EXISTS street;
ALTER TABLE students DROP COLUMN IF EXISTS pincode;
