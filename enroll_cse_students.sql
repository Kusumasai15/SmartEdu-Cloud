-- Link Rajesh E (51b5ac23-fe5d-4942-a495-c363e7d28b7d) to CS-002, CS-303, CS-306
INSERT INTO course_instructors (id, course_id, faculty_id, is_primary, created_at)
SELECT 
  gen_random_uuid()::text,
  c.id,
  '51b5ac23-fe5d-4942-a495-c363e7d28b7d',
  true,
  NOW()
FROM courses c
WHERE c.course_code IN ('CS-002', 'CS-303', 'CS-306')
  AND NOT EXISTS (
    SELECT 1 FROM course_instructors ci WHERE ci.course_id = c.id AND ci.faculty_id = '51b5ac23-fe5d-4942-a495-c363e7d28b7d'
  );

-- Link Sachin Kumar (21a59468-8a12-468d-acf2-33651d492aeb) to CS-306
INSERT INTO course_instructors (id, course_id, faculty_id, is_primary, created_at)
SELECT 
  gen_random_uuid()::text,
  c.id,
  '21a59468-8a12-468d-acf2-33651d492aeb',
  false,
  NOW()
FROM courses c
WHERE c.course_code = 'CS-306'
  AND NOT EXISTS (
    SELECT 1 FROM course_instructors ci WHERE ci.course_id = c.id AND ci.faculty_id = '21a59468-8a12-468d-acf2-33651d492aeb'
  );
