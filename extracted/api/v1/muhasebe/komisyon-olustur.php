<?php
/**
 * POST /api/v1/muhasebe/komisyon-olustur.php
 * Yeni komisyon kaydı oluştur
 * Body: { "ilgili_tip": "ortak|paydas", "ilgili_id": 1, "tutar": 2000, "dosya_id": null,
 *         "oran": 10, "aciklama": "..." }
 * Eski format da desteklenir: { "komisyon_turu": "...", "ortak_id": 1, ... }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'muhasebe']);
$body = get_json_body();

// Frontend 'ilgili_tip' + 'ilgili_id' gönderir → backend alanlarına map et
if (isset($body['ilgili_tip']) && isset($body['ilgili_id'])) {
    $ilgiliTip = strtolower($body['ilgili_tip']);
    $ilgiliId = (int)$body['ilgili_id'];
    if ($ilgiliTip === 'ortak') {
        $body['komisyon_turu'] = $body['komisyon_turu'] ?? 'ortak_pay';
        $body['ortak_id'] = $ilgiliId;
    } elseif ($ilgiliTip === 'paydas') {
        $body['komisyon_turu'] = $body['komisyon_turu'] ?? 'paydas_komisyon';
        $body['paydas_id'] = $ilgiliId;
    } else {
        $body['komisyon_turu'] = $body['komisyon_turu'] ?? 'personel_prim';
        $body['personel_id'] = $ilgiliId;
    }
}

require_fields($body, ['komisyon_turu', 'tutar']);

$db = getDB();
$komisyonTuru = clean($body['komisyon_turu']);
$tutar = (float)$body['tutar'];
$dosyaId = !empty($body['dosya_id']) ? (int)$body['dosya_id'] : null;
$ortakId = !empty($body['ortak_id']) ? (int)$body['ortak_id'] : null;
$paydasId = !empty($body['paydas_id']) ? (int)$body['paydas_id'] : null;
$personelId = !empty($body['personel_id']) ? (int)$body['personel_id'] : null;
$oran = isset($body['oran']) ? (float)$body['oran'] : null;
$aciklama = clean($body['aciklama'] ?? '');
$beklenenTarih = !empty($body['beklenen_tarih']) ? clean($body['beklenen_tarih']) : null;

if ($tutar <= 0) json_error('Tutar 0\'dan büyük olmalı', 422);

// beklenen_tarih kolonu yoksa ekle (güvenli DDL)
try { $db->exec("ALTER TABLE komisyonlar ADD COLUMN IF NOT EXISTS beklenen_tarih DATE DEFAULT NULL"); } catch (\Exception $e) {}

// Dosya kontrolü
if ($dosyaId) {
    $stmt = $db->prepare('SELECT id, dosya_no FROM dosyalar WHERE id = ?');
    $stmt->execute([$dosyaId]);
    $dosya = $stmt->fetch();
    if (!$dosya) json_error('Dosya bulunamadı', 404);
}

// Ortak kontrolü (ortaklar tablosundan)
if ($ortakId) {
    $stmt = $db->prepare('SELECT id, ad_soyad FROM ortaklar WHERE id = ?');
    $stmt->execute([$ortakId]);
    if (!$stmt->fetch()) {
        // users tablosundan da dene
        $stmt = $db->prepare('SELECT id, ad_soyad FROM users WHERE id = ?');
        $stmt->execute([$ortakId]);
        if (!$stmt->fetch()) json_error('Ortak bulunamadı', 404);
    }
}

// Paydaş kontrolü (paydaslar tablosundan)
if ($paydasId) {
    $stmt = $db->prepare('SELECT id, ad FROM paydaslar WHERE id = ?');
    $stmt->execute([$paydasId]);
    if (!$stmt->fetch()) {
        $stmt = $db->prepare('SELECT id, ad_soyad FROM users WHERE id = ?');
        $stmt->execute([$paydasId]);
        if (!$stmt->fetch()) json_error('Paydaş bulunamadı', 404);
    }
}

// Personel kontrolü
if ($personelId) {
    $stmt = $db->prepare('SELECT id, ad_soyad FROM users WHERE id = ?');
    $stmt->execute([$personelId]);
    if (!$stmt->fetch()) json_error('Personel bulunamadı', 404);
}

try {
    $stmt = $db->prepare('INSERT INTO komisyonlar (dosya_id, komisyon_turu, tutar, oran, ortak_id, paydas_id, personel_id, aciklama, beklenen_tarih, odendi, kullanici_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)');
    $stmt->execute([
        $dosyaId,
        $komisyonTuru,
        $tutar,
        $oran,
        $ortakId,
        $paydasId,
        $personelId,
        $aciklama,
        $beklenenTarih,
        $user['id']
    ]);
    $komisyonId = (int)$db->lastInsertId();

    log_action($user['id'], 'komisyon_olustur', "Komisyon: $komisyonTuru, Tutar: $tutar ₺", 'komisyonlar', $komisyonId);

    json_success(['id' => $komisyonId], 'Komisyon kaydı oluşturuldu', 201);

} catch (\Exception $e) {
    json_error('İşlem hatası: ' . $e->getMessage(), 500);
}
