-- ═══════════════════════════════════════════════════════════════
-- MR HASAR — v2.5.6 YETKİ MATRİSİ — Yeni modüller için izin tanımları
-- Tarih: 2026-05-08
-- ═══════════════════════════════════════════════════════════════
-- ALTIN KURAL: Hiçbir mevcut yetki silinmez. Sadece eklenir.
-- NOT EXISTS kontrolü ile çift kayıt engellenir — tekrar çalıştırılabilir.
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1) PAYDAŞLAR > İŞ ORTAKLARI (paydaslar_is-ortaklari)
-- ─────────────────────────────────────────────────────────────
INSERT INTO yetkiler (kullanici_id, modul, islem, izin)
SELECT u.id, 'paydaslar', 'is-ortaklari', 1 FROM users u
WHERE u.rol = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM yetkiler y
    WHERE y.kullanici_id = u.id AND y.modul = 'paydaslar' AND y.islem = 'is-ortaklari'
  );

-- ─────────────────────────────────────────────────────────────
-- 2) PAYDAŞLAR > İŞ PAYDAŞLARI (paydaslar_is-paydaslari)
-- ─────────────────────────────────────────────────────────────
INSERT INTO yetkiler (kullanici_id, modul, islem, izin)
SELECT u.id, 'paydaslar', 'is-paydaslari', 1 FROM users u
WHERE u.rol = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM yetkiler y
    WHERE y.kullanici_id = u.id AND y.modul = 'paydaslar' AND y.islem = 'is-paydaslari'
  );

-- ─────────────────────────────────────────────────────────────
-- 3) PAYDAŞLAR > EKSPER & SİGORTA (paydaslar_paydaslar-eksper-sigorta)
-- ─────────────────────────────────────────────────────────────
INSERT INTO yetkiler (kullanici_id, modul, islem, izin)
SELECT u.id, 'paydaslar', 'paydaslar-eksper-sigorta', 1 FROM users u
WHERE u.rol = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM yetkiler y
    WHERE y.kullanici_id = u.id AND y.modul = 'paydaslar' AND y.islem = 'paydaslar-eksper-sigorta'
  );

-- ─────────────────────────────────────────────────────────────
-- 4) MUHASEBE > MAHSUP ZİNCİRİ (muhasebe_muhasebe-mahsup)
-- ─────────────────────────────────────────────────────────────
INSERT INTO yetkiler (kullanici_id, modul, islem, izin)
SELECT u.id, 'muhasebe', 'muhasebe-mahsup', 1 FROM users u
WHERE u.rol = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM yetkiler y
    WHERE y.kullanici_id = u.id AND y.modul = 'muhasebe' AND y.islem = 'muhasebe-mahsup'
  );

-- ─────────────────────────────────────────────────────────────
-- 5) ÇAĞRI WIDGET — santral kullanıcıları için
-- ─────────────────────────────────────────────────────────────
-- Frontend (webrtc-widget.js v2.5.6) admin/uzman/personel rollerini
-- otomatik olarak yetkili kabul eder. Diğer roller için açık yetki:
INSERT INTO yetkiler (kullanici_id, modul, islem, izin)
SELECT u.id, 'netsantral', 'netsantral_kullan', 1 FROM users u
WHERE u.rol IN ('admin','uzman','personel')
  AND NOT EXISTS (
    SELECT 1 FROM yetkiler y
    WHERE y.kullanici_id = u.id AND y.modul = 'netsantral' AND y.islem = 'netsantral_kullan'
  );

-- ─────────────────────────────────────────────────────────────
-- DOĞRULAMA (manuel çalıştırılabilir)
-- ─────────────────────────────────────────────────────────────
-- SELECT u.ad_soyad, u.rol, y.modul, y.islem, y.izin
-- FROM yetkiler y
-- JOIN users u ON u.id = y.kullanici_id
-- WHERE y.modul IN ('paydaslar','muhasebe','netsantral')
--   AND y.islem IN ('is-ortaklari','is-paydaslari','paydaslar-eksper-sigorta','muhasebe-mahsup','netsantral_kullan')
-- ORDER BY u.id, y.modul, y.islem;
