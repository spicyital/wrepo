INSERT INTO "Department" ("id", "name", "slug", "shortCode", "about", "createdAt")
VALUES
  (
    'seed-dept-sils',
    'School of International Liberal Studies',
    'school-of-international-liberal-studies',
    'SILS',
    'Interdisciplinary studies across languages, cultures, and global systems.',
    CURRENT_TIMESTAMP
  ),
  (
    'seed-dept-political-science',
    'Political Science',
    'political-science',
    'PS',
    'Governance, political theory, and international relations.',
    CURRENT_TIMESTAMP
  ),
  (
    'seed-dept-computer-science',
    'Computer Science',
    'computer-science',
    'CS',
    'Systems, theory, and applied computing.',
    CURRENT_TIMESTAMP
  ),
  (
    'seed-dept-economics',
    'Economics',
    'economics',
    'ECON',
    'Micro, macro, econometrics, and policy.',
    CURRENT_TIMESTAMP
  ),
  (
    'seed-dept-literature',
    'Literature',
    'literature',
    'LIT',
    'Comparative literature and literary theory.',
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("slug") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "shortCode" = EXCLUDED."shortCode",
  "about" = EXCLUDED."about";
