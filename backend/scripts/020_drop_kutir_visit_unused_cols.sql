-- Remove four fields from kutir_visits that are no longer tracked:
-- avg_attendance_last_week (replaced by morning/evening split)
-- regular_students (replaced by regular_students_morning/evening)
-- follow_monthly_plan (removed from visit form)
-- timeslot_utilization (removed from visit form)
ALTER TABLE kutir_visits
  DROP COLUMN IF EXISTS avg_attendance_last_week,
  DROP COLUMN IF EXISTS regular_students,
  DROP COLUMN IF EXISTS follow_monthly_plan,
  DROP COLUMN IF EXISTS timeslot_utilization;
