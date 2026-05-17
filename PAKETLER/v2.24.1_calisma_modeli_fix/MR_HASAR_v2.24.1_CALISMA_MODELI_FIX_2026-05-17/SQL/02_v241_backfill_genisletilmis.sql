-- ═══════════════════════════════════════════════════════════════
-- MR HASAR v2.24.1 — BACKFILL GENİŞLETMESİ (idempotent, yeniden çalıştırılabilir)
-- Tarih: 2026-05-17
--
-- v2.24'teki BACKFILL sadece `pe.user_id = d.sorumlu_id` ile eşleşiyordu.
-- v2.20 dosya/create.php "user_id OR id" mantığı kullanıyor ve v2.19
-- dosya-listesi.php sorumlu_id boşsa created_by'a düşürüyor.
--
-- Bu BACKFILL üç eşleme yolunu da kapsar:
--   1) dosyalar.sorumlu_id ↔ personel.user_id   (en sık)
--   2) dosyalar.sorumlu_id ↔ personel.id        (eski veri tutarsızlığı)
--   3) sorumlu_id NULL ise dosyalar.created_by ↔ personel.user_id
--
-- INSERT IGNORE + UNIQUE KEY (personel_id, dosya_id) ile çift sayım yok.
-- Yeniden çalıştırılabilir.
-- ═══════════════════════════════════════════════════════════════

-- 1) sorumlu_id ↔ personel.user_id
INSERT IGNORE INTO personel_prim_kayitlari
  (personel_id, dosya_id, dosya_no, dosya_turu, donem, durum)
SELECT pe.id, d.id, d.dosya_no, d.dosya_turu,
       DATE_FORMAT(IFNULL(d.acilis_tarihi, d.created_at), '%Y-%m'),
       CASE WHEN LOWER(IFNULL(d.asama,'')) IN ('iptal','iptal_edildi','kapali_iptal')
            THEN 'iptal' ELSE 'bekliyor' END
FROM dosyalar d
INNER JOIN personel pe ON pe.user_id = d.sorumlu_id
WHERE d.sorumlu_id IS NOT NULL
  AND (d.silindi IS NULL OR d.silindi = 0);

-- 2) sorumlu_id ↔ personel.id (eski/tutarsız veri için)
INSERT IGNORE INTO personel_prim_kayitlari
  (personel_id, dosya_id, dosya_no, dosya_turu, donem, durum)
SELECT pe.id, d.id, d.dosya_no, d.dosya_turu,
       DATE_FORMAT(IFNULL(d.acilis_tarihi, d.created_at), '%Y-%m'),
       CASE WHEN LOWER(IFNULL(d.asama,'')) IN ('iptal','iptal_edildi','kapali_iptal')
            THEN 'iptal' ELSE 'bekliyor' END
FROM dosyalar d
INNER JOIN personel pe ON pe.id = d.sorumlu_id
WHERE d.sorumlu_id IS NOT NULL
  AND (d.silindi IS NULL OR d.silindi = 0)
  /* zaten 1) tarafından eklenmediyse */
  AND NOT EXISTS (
    SELECT 1 FROM personel_prim_kayitlari pk
    WHERE pk.dosya_id = d.id
  );

-- 3) sorumlu_id NULL ise created_by ↔ personel.user_id (fallback)
INSERT IGNORE INTO personel_prim_kayitlari
  (personel_id, dosya_id, dosya_no, dosya_turu, donem, durum)
SELECT pe.id, d.id, d.dosya_no, d.dosya_turu,
       DATE_FORMAT(IFNULL(d.acilis_tarihi, d.created_at), '%Y-%m'),
       CASE WHEN LOWER(IFNULL(d.asama,'')) IN ('iptal','iptal_edildi','kapali_iptal')
            THEN 'iptal' ELSE 'bekliyor' END
FROM dosyalar d
INNER JOIN personel pe ON pe.user_id = d.created_by
WHERE d.sorumlu_id IS NULL
  AND d.created_by IS NOT NULL
  AND (d.silindi IS NULL OR d.silindi = 0)
  AND NOT EXISTS (
    SELECT 1 FROM personel_prim_kayitlari pk
    WHERE pk.dosya_id = d.id
  );

-- ═══════════════════════════════════════════════════════════════
-- DOĞRULAMA SORGUSU (manuel — çıktıyı görmek için ayrıca çalıştırın)
-- ═══════════════════════════════════════════════════════════════
-- SELECT pe.ad_soyad, pk.donem, COUNT(*) as dosya_sayisi,
--        SUM(CASE WHEN pk.durum='bekliyor' THEN 1 ELSE 0 END) AS bekleyen,
--        SUM(CASE WHEN pk.durum='sayildi'  THEN 1 ELSE 0 END) AS sayilan,
--        SUM(CASE WHEN pk.durum IN ('iptal','iptal_mahsup') THEN 1 ELSE 0 END) AS iptal
-- FROM personel_prim_kayitlari pk
-- INNER JOIN personel pe ON pe.id = pk.personel_id
-- GROUP BY pe.ad_soyad, pk.donem
-- ORDER BY pe.ad_soyad, pk.donem DESC;
