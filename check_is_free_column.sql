-- Check if is_free column exists in exams table
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'exams'
  AND column_name IN ('is_free', 'free_attempts', 'credits_required');
