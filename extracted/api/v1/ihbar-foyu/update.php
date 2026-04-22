<?php
/**
 * PUT /api/v1/ihbar-foyu/update.php
 * İhbar Föyü güncelle (ve parçalar varsa yenile).
 * Body: { id, ...fields, parcalar: [...] (opsiyonel - yerine koy) }
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('PUT');

$user = auth_required(['admin','uzman','avukat','personel','muhasebe']);
$body = get_json_body();
require_fields($body, ['id']);

$db = getDB();
ensure_ihbar_foyu_tables();
$id = (int)$body['id'];

// Mevcut kaydı al
$stmt = $db->prepare('SELECT * FROM hasar_ihbar WHERE id = ?');
$stmt->execute([$id]);
$mevcut = $stmt->fetch();
if (!$mevcut) json_error('KAYIT BULUNAMADI', 404);

// Yetki: admin/uzman/avukat/muhasebe hepsini; diğerleri sadece kendilerinin
if (!in_array($user['rol'], ['admin','uzman','avukat','muhasebe'], true)
    && (int)$mevcut['kullanici_id'] !== (int)$user['id']) {
    json_error('BU KAYIT İÇİN YETKİNİZ YOK', 403);
}

$allowed = ['plaka','marka','sasi','kilometre','sahip_ad','sahip_tel','iban',
    'sigorta','dosya_no','dosya_turu','police_no',
    'eksper_adi','eksper_iletisim','servis_adi','servis_yetkili','servis_tel',
    'kaza_tarihi','kaza_yeri','kaza_aciklama','notlar','dosya_id','iscilik','kdv_dahil'];

$sets = [];
$params = [];
foreach ($allowed as $f) {
    if (!array_key_exists($f, $body)) continue;
    $sets[] = "$f = ?";
    if ($f === 'dosya_id') {
        $params[] = !empty($body[$f]) ? (int)$body[$f] : null;
    } elseif ($f === 'kaza_tarihi') {
        $params[] = !empty($body[$f]) ? $body[$f] : null;
    } elseif ($f === 'kdv_dahil') {
        $params[] = !empty($body[$f]) ? 1 : 0;
    } elseif ($f === 'iscilik') {
        $params[] = (float)$body[$f];
    } else {
        $params[] = clean($body[$f]);
    }
}
// JSON alanları
if (isset($body['evraklar'])) {
    $sets[] = 'evraklar = ?';
    $params[] = is_array($body['evraklar']) ? json_encode($body['evraklar'], JSON_UNESCAPED_UNICODE) : (string)$body['evraklar'];
}
if (isset($body['islemler'])) {
    $sets[] = 'islemler = ?';
    $params[] = is_array($body['islemler']) ? json_encode($body['islemler'], JSON_UNESCAPED_UNICODE) : (string)$body['islemler'];
}

try {
    $db->beginTransaction();

    if (!empty($sets)) {
        $params[] = $id;
        $stmt = $db->prepare('UPDATE hasar_ihbar SET ' . implode(', ', $sets) . ' WHERE id = ?');
        $stmt->execute($params);
    }

    // Parça listesi replace-strategy: gönderildiyse eskilerini silip yenile
    if (isset($body['parcalar']) && is_array($body['parcalar'])) {
        $db->prepare('DELETE FROM hasar_ihbar_parcalar WHERE ihbar_id = ?')->execute([$id]);
        $pStmt = $db->prepare('INSERT INTO hasar_ihbar_parcalar (ihbar_id, sira, ad, oem, fiyat, miktar) VALUES (?, ?, ?, ?, ?, ?)');
        foreach ($body['parcalar'] as $i => $p) {
            $pStmt->execute([
                $id, $i + 1,
                clean($p['name'] ?? $p['ad'] ?? ''),
                clean($p['oem'] ?? ''),
                (float)($p['original'] ?? $p['fiyat'] ?? 0),
                (int)($p['quantity'] ?? $p['miktar'] ?? 1)
            ]);
        }
    }

    $db->commit();
    log_action($user['id'], 'ihbar_foyu_update', 'İhbar föyü güncellendi', 'hasar_ihbar', $id);
    json_success(null, 'İHBAR FÖYÜ GÜNCELLENDİ');
} catch (\Exception $e) {
    $db->rollBack();
    json_error('GÜNCELLEME HATASI: ' . $e->getMessage(), 500);
}
