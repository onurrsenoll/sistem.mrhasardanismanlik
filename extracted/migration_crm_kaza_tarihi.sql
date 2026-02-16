-- ============================================================
-- CRM TABLOSUNA KAZA TARİHİ ALANI EKLEME
-- phpMyAdmin SQL sekmesinde çalıştırın
-- ============================================================

ALTER TABLE crm ADD COLUMN kaza_tarihi DATE DEFAULT NULL AFTER kaza_turu;
