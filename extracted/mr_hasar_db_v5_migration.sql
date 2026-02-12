-- ============================================================
-- MR HASAR DANIŞMANLIK - VERİTABANI V5 MİGRASYON
-- HAK MAHRUMİYET + DOSYA HESABI
-- ============================================================
-- phpMyAdmin'de SQL sekmesine yapıştırıp "Git" butonuna tıklayın
-- ============================================================

-- DOSYALAR TABLOSUNA HAK MAHRUMİYET SÜTUNU EKLE
ALTER TABLE dosyalar ADD COLUMN IF NOT EXISTS hak_mahrumiyet TINYINT(1) NOT NULL DEFAULT 0 AFTER komisyon_orani;

-- ============================================================
-- MİGRASYON TAMAMLANDI!
-- dosyalar tablosuna hak_mahrumiyet sütunu eklendi
-- ============================================================
