-- Rename progress status value and drop legacy transfer_school column.

UPDATE student_progress SET status = 'transferred_to_local' WHERE status = 'transferred';

ALTER TABLE student_progress DROP COLUMN IF EXISTS transfer_school;