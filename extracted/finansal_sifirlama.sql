-- ═══════════════════════════════════════════════════════════════
-- MR HASAR DANIŞMANLIK - FİNANSAL VERİ SIFIRLAMA
-- Tarih: 2026-03-02
--
-- BU DOSYA SADECE FİNANSAL / MUHASEBE VERİLERİNİ SIFIRLAR
-- KORUNAN VERİLER:
--   ✓ users (Kullanıcılar)
--   ✓ personel (Personel kayıtları)
--   ✓ paydaslar (İş paydaşları)
--   ✓ ortaklar (İş ortakları)
--   ✓ servisler (Servis tanımları)
--   ✓ kasalar (Kasa tanımları - bakiyeler sıfırlanır)
--   ✓ tanimlamalar (Sistem tanımlamaları)
--   ✓ ayarlar (Sistem ayarları)
--   ✓ yetkiler (Kullanıcı yetkileri)
--   ✓ sablonlar (Matbu evrak şablonları)
--
-- KULLANIM:
-- 1. phpMyAdmin → SQL sekmesi
-- 2. Bu dosyanın TAMAMINI yapıştırın
-- 3. Çalıştır butonuna tıklayın
-- ═══════════════════════════════════════════════════════════════

SET FOREIGN_KEY_CHECKS = 0;

-- ═══ FİNANSAL İŞLEM TABLOLARI ═══
TRUNCATE TABLE kasa_hareketleri;
TRUNCATE TABLE gelirler;
TRUNCATE TABLE giderler;
TRUNCATE TABLE komisyonlar;
TRUNCATE TABLE paydas_komisyonlari;
TRUNCATE TABLE ortak_hareketleri;
TRUNCATE TABLE personel_hakedis;
TRUNCATE TABLE police_tahsilatlar;
TRUNCATE TABLE policeler;

-- ═══ DOSYA İLİŞKİLİ TABLOLAR ═══
TRUNCATE TABLE dosya_surecler;
TRUNCATE TABLE evraklar;
TRUNCATE TABLE masraflar;
TRUNCATE TABLE hesaplamalar;
TRUNCATE TABLE magdurlar;
TRUNCATE TABLE araclar;
TRUNCATE TABLE servis_ihbarlari;

-- ═══ CRM TABLOLARI ═══
TRUNCATE TABLE crm_notlari;
TRUNCATE TABLE crm_ekler;
TRUNCATE TABLE crm;

-- ═══ YÖNLENDİRME TABLOLARI ═══
TRUNCATE TABLE yonlendirme_notlar;
TRUNCATE TABLE yonlendirme;

-- ═══ SAHA TABLOLARI ═══
TRUNCATE TABLE saha_dosya_medya;
TRUNCATE TABLE saha_dosyalar;

-- ═══ PORTAL TABLOLARI ═══
TRUNCATE TABLE portal_mesajlar;
TRUNCATE TABLE portal_loglar;
TRUNCATE TABLE portal_otp;
TRUNCATE TABLE portal_erisim;

-- ═══ ANA DOSYA TABLOSU (EN SON) ═══
TRUNCATE TABLE dosyalar;

-- ═══ KASA BAKİYELERİNİ SIFIRLA (TANIMLARI KORU) ═══
UPDATE kasalar SET bakiye = 0.00;

-- ═══ LOG VE BİLDİRİM TABLOLARI (OPSİYONEL) ═══
TRUNCATE TABLE bildirimler;
TRUNCATE TABLE ajanda;
TRUNCATE TABLE mesajlar;
TRUNCATE TABLE log_kayitlari;
TRUNCATE TABLE oturumlar;
TRUNCATE TABLE arama_loglari;
TRUNCATE TABLE sms_loglari;
TRUNCATE TABLE gelen_smsler;
TRUNCATE TABLE bekleyen_cagrilar;
TRUNCATE TABLE konum_kayitlari;

SET FOREIGN_KEY_CHECKS = 1;

-- ═══════════════════════════════════════════════════════════════
-- SIFIRLAMA TAMAMLANDI!
-- Kontrol: SELECT COUNT(*) FROM dosyalar;  → 0 kayıt olmalı
-- Kontrol: SELECT COUNT(*) FROM users;     → Mevcut kullanıcılar korundu
-- Kontrol: SELECT COUNT(*) FROM personel;  → Mevcut personel korundu
-- ═══════════════════════════════════════════════════════════════
