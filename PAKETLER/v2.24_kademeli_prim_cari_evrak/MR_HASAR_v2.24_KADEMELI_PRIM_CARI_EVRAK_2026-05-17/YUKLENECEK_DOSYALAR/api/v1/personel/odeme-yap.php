<?php
/**
 * POST /api/v1/personel/odeme-yap.php
 *
 * v2.24 — PERSONEL CARİ ÖDEME (maaş/prim/avans/...) + KASA HAREKETİ
 * Transaction'lı: personel_odemeler + kasalar.bakiye düşüşü +
 * kasa_hareketleri kaydı tek atomik işlem.
 *
 * Body:
 *   {
 *     personel_id: 7,
 *     odeme_turu: 'maas'|'prim'|'avans'|'ikramiye'|'mesai'|'diger',
 *     tutar: 5000,
 *     kasa_id: 3,
 *     donem: '2026-05',      // opsiyonel (prim/maaş için)
 *     odeme_tarihi: '2026-05-17',  // opsiyonel, default bugün
 *     aciklama: '...'
 *   }
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');
$user = auth_required();
$db = getDB();

$body = json_decode(file_get_contents('php://input'), true) ?: $_POST;

$personelId = (int)($body['personel_id'] ?? 0);
$odemeTuru  = (string)($body['odeme_turu'] ?? 'maas');
$tutar      = (float)($body['tutar'] ?? 0);
$kasaId     = (int)($body['kasa_id'] ?? 0);
$donem      = trim((string)($body['donem'] ?? ''));
$odTarih    = trim((string)($body['odeme_tarihi'] ?? date('Y-m-d')));
$aciklama   = trim((string)($body['aciklama'] ?? ''));

if (!$personelId) json_error('personel_id zorunlu', 422);
if ($tutar <= 0)  json_error('Tutar 0\'dan büyük olmalı', 422);
if (!$kasaId)     json_error('kasa_id zorunlu', 422);
if (!in_array($odemeTuru, ['maas','prim','avans','ikramiye','mesai','diger'], true)) {
    json_error('Geçersiz odeme_turu', 422);
}
if ($donem !== '' && !preg_match('/^\d{4}-\d{2}$/', $donem)) json_error('donem formatı YYYY-MM', 422);
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $odTarih)) $odTarih = date('Y-m-d');

$stmt = $db->prepare('SELECT id, ad_soyad FROM personel WHERE id = ?');
$stmt->execute([$personelId]);
$pers = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$pers) json_error('Personel bulunamadı', 404);

try {
    $db->beginTransaction();

    /* Kasa bakiyesi FOR UPDATE — race koruması */
    $stmt = $db->prepare('SELECT id, ad, bakiye FROM kasalar WHERE id = ? FOR UPDATE');
    $stmt->execute([$kasaId]);
    $kasa = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$kasa) { $db->rollBack(); json_error('Kasa bulunamadı', 404); }

    $yeniBakiye = (float)$kasa['bakiye'] - $tutar;
    $stmt = $db->prepare('UPDATE kasalar SET bakiye = ? WHERE id = ?');
    $stmt->execute([$yeniBakiye, $kasaId]);

    $defaultAck = strtoupper($odemeTuru) . ' ÖDEMESİ - ' . $pers['ad_soyad']
        . ($donem ? ' - DÖNEM ' . $donem : '');
    $hareketAck = $aciklama !== '' ? $aciklama : $defaultAck;

    $stmt = $db->prepare("INSERT INTO kasa_hareketleri
        (kasa_id, islem_turu, tutar, bakiye_sonrasi, aciklama, kullanici_id)
        VALUES (?, 'gider', ?, ?, ?, ?)");
    $stmt->execute([$kasaId, $tutar, $yeniBakiye, $hareketAck, (int)($user['id'] ?? 0)]);
    $kasaHrkId = (int)$db->lastInsertId();

    /* personel_odemeler kaydı */
    $stmt = $db->prepare('
        INSERT INTO personel_odemeler
          (personel_id, odeme_turu, tutar, donem, odeme_tarihi, kasa_id, aciklama,
           kasa_hareket_id, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ');
    $stmt->execute([
        $personelId, $odemeTuru, $tutar, ($donem !== '' ? $donem : null),
        $odTarih, $kasaId, ($aciklama !== '' ? $aciklama : null),
        $kasaHrkId, (int)($user['id'] ?? 0)
    ]);
    $odemeId = (int)$db->lastInsertId();

    /* Prim/maaş ödemesinde, o dönemdeki BEKLEYEN prim kayıtlarını 'sayildi' yap */
    if (in_array($odemeTuru, ['maas','prim'], true) && $donem !== '') {
        $stmt = $db->prepare('
            UPDATE personel_prim_kayitlari
            SET durum = "sayildi"
            WHERE personel_id = ? AND donem = ? AND durum = "bekliyor"
        ');
        $stmt->execute([$personelId, $donem]);
    }

    $db->commit();
    json_success([
        'id' => $odemeId,
        'kasa_hareket_id' => $kasaHrkId,
        'kasa_yeni_bakiye' => round($yeniBakiye, 2),
        'mesaj' => 'Ödeme kaydedildi ve kasadan düşüldü'
    ]);
} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    json_error('Ödeme yapılamadı: ' . $e->getMessage(), 500);
}
