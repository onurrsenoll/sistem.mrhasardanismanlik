<?php
/**
 * POST /api/v1/crm/donustur.php
 * CRM kaydını dosyaya dönüştür
 * Body: { "crm_id": 1, "dosya_turu": "ADK", ... (dosya create alanları) }
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');

$user = auth_required(['admin', 'uzman', 'personel']);
$body = get_json_body();
require_fields($body, ['crm_id', 'dosya_turu']);

$db = getDB();
$crmId = (int)$body['crm_id'];

$stmt = $db->prepare('SELECT * FROM crm WHERE id = ?');
$stmt->execute([$crmId]);
$crm = $stmt->fetch();
if (!$crm) json_error('CRM kaydı bulunamadı', 404);
if ($crm['donusen_dosya_id']) json_error('Bu kayıt zaten dosyaya dönüştürülmüş', 409);

try {
    $db->beginTransaction();

    // Dosya oluştur
    $dosyaNo = generate_dosya_no($db);
    $hasar_no = 'HSR-' . date('Y') . '-' . str_pad(mt_rand(1, 999), 3, '0', STR_PAD_LEFT);

    $stmt = $db->prepare('INSERT INTO dosyalar (dosya_no, dosya_turu, talep_turu, asama, sigorta_sirket, police_no, dosya_kaynagi, avukat_id, sorumlu_id, haklilik, kaza_tarihi, kaza_il, kaza_ilce, hasar_no, acilis_tarihi, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?)');
    $stmt->execute([
        $dosyaNo,
        clean($body['dosya_turu']),
        clean($body['talep_turu'] ?? ''),
        'Dosya Açık',
        clean($body['sigorta_sirket'] ?? ''),
        clean($body['police_no'] ?? ''),
        'Ofis CRM',
        !empty($body['avukat_id']) ? (int)$body['avukat_id'] : null,
        !empty($body['sorumlu_id']) ? (int)$body['sorumlu_id'] : $user['id'],
        (int)($body['haklilik'] ?? 100),
        !empty($body['kaza_tarihi']) ? $body['kaza_tarihi'] : null,
        clean($body['kaza_il'] ?? $crm['il']),
        clean($body['kaza_ilce'] ?? $crm['ilce']),
        $hasar_no,
        $user['id']
    ]);

    $dosyaId = (int)$db->lastInsertId();

    // CRM verisinden mağdur oluştur
    $stmt = $db->prepare('INSERT INTO magdurlar (dosya_id, ad_soyad, telefon, telefon2, email, il, ilce) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $dosyaId,
        $crm['ad_soyad'],
        $crm['telefon'],
        $crm['telefon2'],
        $crm['email'],
        $crm['il'],
        $crm['ilce']
    ]);

    // CRM kaydını güncelle
    $stmt = $db->prepare("UPDATE crm SET durum = 'Olumlu', donusen_dosya_id = ? WHERE id = ?");
    $stmt->execute([$dosyaId, $crmId]);

    $db->commit();

    log_action($user['id'], 'crm_donustur', "CRM → Dosya: {$crm['ad_soyad']} → $dosyaNo", 'crm', $crmId);

    json_success([
        'dosya_id' => $dosyaId,
        'dosya_no' => $dosyaNo,
        'hasar_no' => $hasar_no
    ], 'CRM kaydı dosyaya dönüştürüldü', 201);

} catch (\Exception $e) {
    $db->rollBack();
    json_error('Dönüştürme hatası: ' . $e->getMessage(), 500);
}
