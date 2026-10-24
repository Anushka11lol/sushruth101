-- Additive, rerunnable normalized duplicate prevention. Never deletes or merges rows.
ALTER TABLE registered_patients
  ADD COLUMN IF NOT EXISTS normalized_phone text,
  ADD COLUMN IF NOT EXISTS normalized_sushruth_id text;

-- Read-only conflict report, including values previously backfilled.
SELECT key_type, normalized_value, array_agg(id ORDER BY id) AS conflicting_patient_ids
FROM (
  SELECT 'phone' AS key_type, id,
         NULLIF(COALESCE(normalized_phone, regexp_replace(phone, '\D', '', 'g')), '') AS normalized_value
  FROM registered_patients
  UNION ALL
  SELECT 'sushruth_id', id,
         NULLIF(COALESCE(normalized_sushruth_id, upper(trim(sushruth_id))), '')
  FROM registered_patients
) candidates
WHERE normalized_value IS NOT NULL
GROUP BY key_type, normalized_value
HAVING count(*) > 1;

-- Clear every ambiguous key first so a prior partial backfill cannot block reruns.
WITH ambiguous AS (
  SELECT key_type, normalized_value
  FROM (
    SELECT 'phone' AS key_type, NULLIF(COALESCE(normalized_phone, regexp_replace(phone, '\D', '', 'g')), '') AS normalized_value
    FROM registered_patients
    UNION ALL
    SELECT 'sushruth_id', NULLIF(COALESCE(normalized_sushruth_id, upper(trim(sushruth_id))), '')
    FROM registered_patients
  ) values_by_key
  WHERE normalized_value IS NOT NULL
  GROUP BY key_type, normalized_value
  HAVING count(*) > 1
)
UPDATE registered_patients p
SET normalized_phone = CASE WHEN a.key_type = 'phone' THEN NULL ELSE p.normalized_phone END,
    normalized_sushruth_id = CASE WHEN a.key_type = 'sushruth_id' THEN NULL ELSE p.normalized_sushruth_id END
FROM ambiguous a
WHERE (a.key_type = 'phone' AND NULLIF(COALESCE(p.normalized_phone, regexp_replace(p.phone, '\D', '', 'g')), '') = a.normalized_value)
   OR (a.key_type = 'sushruth_id' AND NULLIF(COALESCE(p.normalized_sushruth_id, upper(trim(p.sushruth_id))), '') = a.normalized_value);

-- Backfill only groups that are unique after the ambiguity reset.
WITH candidates AS (
  SELECT id, NULLIF(regexp_replace(phone, '\D', '', 'g'), '') AS value FROM registered_patients
), unique_values AS (
  SELECT value FROM candidates WHERE value IS NOT NULL GROUP BY value HAVING count(*) = 1
)
UPDATE registered_patients p SET normalized_phone = c.value
FROM candidates c JOIN unique_values u ON u.value = c.value
WHERE p.id = c.id;

WITH candidates AS (
  SELECT id, NULLIF(upper(trim(sushruth_id)), '') AS value FROM registered_patients
), unique_values AS (
  SELECT value FROM candidates WHERE value IS NOT NULL GROUP BY value HAVING count(*) = 1
)
UPDATE registered_patients p SET normalized_sushruth_id = c.value
FROM candidates c JOIN unique_values u ON u.value = c.value
WHERE p.id = c.id;

CREATE UNIQUE INDEX IF NOT EXISTS registered_patients_normalized_phone_unique
  ON registered_patients (normalized_phone) WHERE normalized_phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS registered_patients_normalized_sushruth_unique
  ON registered_patients (normalized_sushruth_id) WHERE normalized_sushruth_id IS NOT NULL;