-- ═══════════════════════════════════════════════════════════════
-- MR HASAR v2.11 — POLİÇE FIX MIGRATION
-- 10.05.2026
-- ═══════════════════════════════════════════════════════════════
-- Bu migration sadece POLİÇE modülünü etkiler. Diğer tablolara dokunulmaz.
-- Her komut idempotenttir; defalarca çalıştırılabilir.
-- ═══════════════════════════════════════════════════════════════

/* 1) policeler tablosuna eksik kolonları idempotent ekle */
ALTER TABLE policeler
    ADD COLUMN IF NOT EXISTS belge_seri VARCHAR(50) DEFAULT '';
ALTER TABLE policeler
    ADD COLUMN IF NOT EXISTS dogum_tarihi DATE DEFAULT NULL;
ALTER TABLE policeler
    ADD COLUMN IF NOT EXISTS sase_no VARCHAR(50) DEFAULT '';
ALTER TABLE policeler
    ADD COLUMN IF NOT EXISTS personel VARCHAR(120) DEFAULT '';

/* 2) gelirler tablosu — daha önce tahsilat-ekle.php her istekte CREATE
 *    çalıştırıyordu. Burada bir kez yaratılır, runtime DDL kalkar. */
CREATE TABLE IF NOT EXISTS gelirler (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kasa_id INT DEFAULT NULL,
    tutar DECIMAL(12,2) NOT NULL DEFAULT 0,
    islem_tarihi DATE DEFAULT NULL,
    gelir_turu VARCHAR(60) DEFAULT NULL,
    aciklama TEXT DEFAULT NULL,
    kaynak VARCHAR(30) DEFAULT NULL,
    kaynak_id INT DEFAULT NULL,
    kullanici_id INT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_kaynak (kaynak, kaynak_id),
    INDEX idx_tarih (islem_tarihi)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

/* 3) Yetki matrisi: Mevcut tüm admin kullanıcılarına police-toplu-sil
 *    (henüz tanımlı değilse) ekle. has_yetki bu ID üzerinden kontrol ediyor.
 *    Kullanıcı bazlı yetki tanımı sistem üzerinden yapıldığı için INSERT
 *    IGNORE ile güvenli; mevcut kayıtlara dokunulmaz. */
INSERT IGNORE INTO yetkiler (kullanici_id, modul, islem, izin)
SELECT u.id, 'police', 'police-toplu-sil', 1
FROM users u
WHERE u.rol = 'admin' AND u.aktif = 1;

/* 4) İndeksler — yenileme/hatırlatma sorguları için bitis_tarihi index */
ALTER TABLE policeler
    ADD INDEX IF NOT EXISTS idx_police_bitis (bitis_tarihi);
ALTER TABLE policeler
    ADD INDEX IF NOT EXISTS idx_police_durum_tahsilat (durum, tahsilat_durumu);
