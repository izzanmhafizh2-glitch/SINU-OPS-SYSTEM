-- =====================================================
-- AUTO ALPHA SYSTEM v2
-- Menggunakan attendance_schedule_rows (schema baru)
-- =====================================================

-- ══════════════════════════════════════════════════════
-- FUNCTION: Auto Insert ALPA untuk yang tidak absen
-- ══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION auto_insert_alpha_for_missing_attendance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_inserted_count INT := 0;
BEGIN
  -- Insert ALPA untuk user yang:
  -- 1. Punya jadwal PUBLISHED di hari ini (schedule_date = today)
  -- 2. Belum ada record absensi hari ini
  -- 3. Bukan OFF/LIBUR

  WITH scheduled_users AS (
    SELECT DISTINCT
      asr.username,
      asr.employee_name  AS nama,
      asr.role,
      asr.shift_code
    FROM attendance_schedule_rows asr
    INNER JOIN attendance_schedule_periods asp ON asp.id = asr.period_id
    WHERE asp.status = 'PUBLISHED'
      AND asr.schedule_date = v_today
      AND asr.shift_code NOT IN ('OFF', 'LIBUR')
  ),
  missing_attendance AS (
    SELECT su.*
    FROM scheduled_users su
    LEFT JOIN absensi a
      ON (
           LOWER(a.username) = LOWER(su.username)
        OR LOWER(a.nama)     = LOWER(su.nama)
      )
      AND a.tanggal = v_today
    WHERE a.id IS NULL
  )
  INSERT INTO absensi (
    nama,
    username,
    role,
    shift,
    tanggal,
    status_kehadiran,
    point,
    created_at
  )
  SELECT
    nama,
    username,
    role,
    shift_code,
    v_today,
    'ALPA',
    0,
    NOW()
  FROM missing_attendance;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  RAISE NOTICE 'Auto-alpha inserted: % records for date %', v_inserted_count, v_today;
END;
$$;

-- ══════════════════════════════════════════════════════
-- GRANT PERMISSION
-- ══════════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION auto_insert_alpha_for_missing_attendance() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_insert_alpha_for_missing_attendance() TO service_role;
GRANT EXECUTE ON FUNCTION auto_insert_alpha_for_missing_attendance() TO anon;

-- ══════════════════════════════════════════════════════
-- MANUAL TEST (jalankan di SQL Editor untuk tes)
-- ══════════════════════════════════════════════════════
-- SELECT auto_insert_alpha_for_missing_attendance();

-- Cek hasil:
-- SELECT nama, status_kehadiran, tanggal FROM absensi
-- WHERE tanggal = CURRENT_DATE AND status_kehadiran = 'ALPA'
-- ORDER BY nama;

-- ══════════════════════════════════════════════════════
-- SETUP CRON JOB (pg_cron - tersedia di Supabase Pro)
-- ══════════════════════════════════════════════════════
-- Jalankan sekali untuk aktifkan:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule(
--   'auto-alpha-daily',
--   '30 16 * * *',   -- 23:30 WIB = 16:30 UTC
--   $$SELECT auto_insert_alpha_for_missing_attendance();$$
-- );

-- ══════════════════════════════════════════════════════
-- ALTERNATIF: Trigger manual dari Super Admin (JS)
-- Fungsi ini bisa dipanggil dari browser via RPC:
-- await supa.rpc('auto_insert_alpha_for_missing_attendance')
-- ══════════════════════════════════════════════════════
