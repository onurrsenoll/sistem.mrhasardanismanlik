-- ═══════════════════════════════════════════════════════════════
-- MR HASAR v2.17 — ARAÇ KOLON BACKFILL
-- 15.05.2026
-- ═══════════════════════════════════════════════════════════════
-- DOSYA YENİ ile DOSYA DETAY DÜZENLE arasındaki anahtar uyumsuzluğunu çözer.
-- Eski uygulama bazı verileri kısa kolonlara (ruhsat, tc, yil, belge_tescil,
-- onarim_gun, trafik, ruhsat_surucu, surucu_tc) yazıyordu. Yeni uygulama
-- uzun kolonlardan (ruhsat_sahibi, tc_kimlik, model_yili, belge_tescil_no,
-- onarim_gun_suresi, trafik_sirket, ruhsat_sahibi_surucu, surucu_tc_kimlik)
-- okuyor. Bu migration eski kolonlardaki veriyi yeni kolonlara KOPYALAR.
--
-- GÜVENLİK:
--  - Sadece YENİ kolon BOŞ ise eski kolondan kopyalanır (COALESCE/IFNULL)
--  - Eski kolonlar SİLİNMEZ (geriye uyumluluk + güvenlik)
--  - Idempotent: tekrar çalıştırılabilir, zarar vermez
--  - Mevcut doğru veri korunur
-- ═══════════════════════════════════════════════════════════════

-- ── 1) Eski kolonlar var mı emin ol (yoksa hiç birey yapma) ──
-- Mağdur araç kolonları
ALTER TABLE araclar ADD COLUMN IF NOT EXISTS ruhsat_sahibi VARCHAR(150) DEFAULT NULL;
ALTER TABLE araclar ADD COLUMN IF NOT EXISTS tc_kimlik VARCHAR(11) DEFAULT NULL;
ALTER TABLE araclar ADD COLUMN IF NOT EXISTS model_yili INT DEFAULT NULL;
ALTER TABLE araclar ADD COLUMN IF NOT EXISTS belge_tescil_no VARCHAR(50) DEFAULT NULL;
ALTER TABLE araclar ADD COLUMN IF NOT EXISTS onarim_gun_suresi INT DEFAULT NULL;
ALTER TABLE araclar ADD COLUMN IF NOT EXISTS gecmis_hasar VARCHAR(20) DEFAULT NULL;
ALTER TABLE araclar ADD COLUMN IF NOT EXISTS trafik_sirket VARCHAR(100) DEFAULT NULL;
ALTER TABLE araclar ADD COLUMN IF NOT EXISTS trafik_police VARCHAR(50) DEFAULT NULL;
ALTER TABLE araclar ADD COLUMN IF NOT EXISTS ruhsat_sahibi_surucu VARCHAR(20) DEFAULT NULL;
ALTER TABLE araclar ADD COLUMN IF NOT EXISTS surucu_ad VARCHAR(150) DEFAULT NULL;
ALTER TABLE araclar ADD COLUMN IF NOT EXISTS surucu_tc_kimlik VARCHAR(11) DEFAULT NULL;
ALTER TABLE araclar ADD COLUMN IF NOT EXISTS kasko TINYINT(1) DEFAULT 0;

-- Eski kolon adları (varsa kullanılır, yoksa SQL hata vermesin diye IF NOT EXISTS)
ALTER TABLE araclar ADD COLUMN IF NOT EXISTS ruhsat VARCHAR(150) DEFAULT NULL;
ALTER TABLE araclar ADD COLUMN IF NOT EXISTS tc VARCHAR(11) DEFAULT NULL;
ALTER TABLE araclar ADD COLUMN IF NOT EXISTS yil INT DEFAULT NULL;
ALTER TABLE araclar ADD COLUMN IF NOT EXISTS belge_tescil VARCHAR(50) DEFAULT NULL;
ALTER TABLE araclar ADD COLUMN IF NOT EXISTS onarim_gun INT DEFAULT NULL;
ALTER TABLE araclar ADD COLUMN IF NOT EXISTS trafik VARCHAR(100) DEFAULT NULL;
ALTER TABLE araclar ADD COLUMN IF NOT EXISTS ruhsat_surucu VARCHAR(20) DEFAULT NULL;
ALTER TABLE araclar ADD COLUMN IF NOT EXISTS surucu_tc VARCHAR(11) DEFAULT NULL;

-- ── 2) BACKFILL: yeni kolon boşsa eski kolondan kopyala ──
-- Mağdur ve karşı araç hepsi tek tabloda (taraf alanı ile ayırt edilir)

-- 2a) ruhsat_sahibi
UPDATE araclar
SET ruhsat_sahibi = ruhsat
WHERE (ruhsat_sahibi IS NULL OR ruhsat_sahibi = '')
  AND ruhsat IS NOT NULL AND ruhsat <> '';

-- 2b) tc_kimlik
UPDATE araclar
SET tc_kimlik = tc
WHERE (tc_kimlik IS NULL OR tc_kimlik = '')
  AND tc IS NOT NULL AND tc <> '';

-- 2c) model_yili
UPDATE araclar
SET model_yili = yil
WHERE model_yili IS NULL
  AND yil IS NOT NULL AND yil > 0;

-- 2d) belge_tescil_no
UPDATE araclar
SET belge_tescil_no = belge_tescil
WHERE (belge_tescil_no IS NULL OR belge_tescil_no = '')
  AND belge_tescil IS NOT NULL AND belge_tescil <> '';

-- 2e) onarim_gun_suresi (sadece mağdur araç)
UPDATE araclar
SET onarim_gun_suresi = onarim_gun
WHERE onarim_gun_suresi IS NULL
  AND onarim_gun IS NOT NULL AND onarim_gun > 0;

-- 2f) trafik_sirket (sadece karşı araç)
UPDATE araclar
SET trafik_sirket = trafik
WHERE (trafik_sirket IS NULL OR trafik_sirket = '')
  AND trafik IS NOT NULL AND trafik <> '';

-- 2g) ruhsat_sahibi_surucu (sadece karşı araç)
UPDATE araclar
SET ruhsat_sahibi_surucu = ruhsat_surucu
WHERE (ruhsat_sahibi_surucu IS NULL OR ruhsat_sahibi_surucu = '')
  AND ruhsat_surucu IS NOT NULL AND ruhsat_surucu <> '';

-- 2h) surucu_tc_kimlik (sadece karşı araç)
UPDATE araclar
SET surucu_tc_kimlik = surucu_tc
WHERE (surucu_tc_kimlik IS NULL OR surucu_tc_kimlik = '')
  AND surucu_tc IS NOT NULL AND surucu_tc <> '';

-- ── 3) noter_vekalet kolonu garantisi ──
ALTER TABLE dosyalar ADD COLUMN IF NOT EXISTS noter_vekalet DECIMAL(12,2) DEFAULT NULL;

-- ═══════════════════════════════════════════════════════════════
-- BİTTİ. Eski kolonlar yerinde kalır (silmiyoruz).
-- Yeni dosyalar artık doğru kolonlara yazılacak.
-- Eski dosyalar şimdi DOSYA DETAY DÜZENLE'de doğru veriyle açılacak.
-- ═══════════════════════════════════════════════════════════════
