<?php
/**
 * POST /api/v1/sozlesme/update.php
 * Sözleşme güncelle
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST');
$user = auth_required(['admin']);
$db = getDB();

$body = get_json_body();
require_fields($body, ['id']);
$id = (int)$body['id'];

$stmt = $db->prepare('SELECT * FROM mr_sozlesmeler WHERE id = ?');
$stmt->execute([$id]);
$mevcut = $stmt->fetch();
if (!$mevcut) json_error('Sözleşme bulunamadı', 404);

$fields = ['departman','ad_soyad','tc_kimlik','dogum_tarihi','dogum_yeri','adres','telefon','eposta',
    'iban','kan_grubu','egitim','ehliyet_no','ehliyet_sinif','ehliyet_gecerlilik','pozisyon',
    'ise_baslama','deneme_ay','sabit_maas_net','yemek_ucreti','calisma_saati','ozel_notlar','durum','personel_id'];

$sets = [];
$params = [];

foreach ($fields as $f) {
    if (array_key_exists($f, $body)) {
        $sets[] = "$f = ?";
        if (in_array($f, ['dogum_tarihi','ehliyet_gecerlilik','ise_baslama'])) {
            $params[] = !empty($body[$f]) ? $body[$f] : null;
        } elseif (in_array($f, ['deneme_ay','personel_id'])) {
            $params[] = !empty($body[$f]) ? (int)$body[$f] : null;
        } elseif (in_array($f, ['sabit_maas_net','yemek_ucreti'])) {
            $params[] = (float)$body[$f];
        } else {
            $params[] = clean($body[$f] ?? '');
        }
    }
}

// JSON alanları
if (array_key_exists('prim_json', $body)) {
    $sets[] = "prim_json = ?";
    $params[] = !empty($body['prim_json']) ? json_encode($body['prim_json'], JSON_UNESCAPED_UNICODE) : null;
}
if (array_key_exists('ek_haklar_json', $body)) {
    $sets[] = "ek_haklar_json = ?";
    $params[] = !empty($body['ek_haklar_json']) ? json_encode($body['ek_haklar_json'], JSON_UNESCAPED_UNICODE) : null;
}

if (!empty($sets)) {
    $params[] = $id;
    $db->prepare("UPDATE mr_sozlesmeler SET " . implode(', ', $sets) . " WHERE id = ?")->execute($params);
}

// Araç zimmet güncelle
if (array_key_exists('arac_zimmet', $body)) {
    $az = $body['arac_zimmet'];
    // Mevcut kaydı sil ve yeniden oluştur
    $db->prepare("DELETE FROM mr_sozlesme_arac_zimmet WHERE sozlesme_id = ?")->execute([$id]);
    if ($az && !empty($az['plaka'])) {
        $stmt = $db->prepare("INSERT INTO mr_sozlesme_arac_zimmet
            (sozlesme_id, plaka, marka_model, sasi_no, motor_no, model_yili, renk, muayene_tarihi, kasko_police, km_zimmet)
            VALUES (?,?,?,?,?,?,?,?,?,?)");
        $stmt->execute([
            $id,
            clean($az['plaka'] ?? ''),
            clean($az['marka_model'] ?? ''),
            clean($az['sasi_no'] ?? ''),
            clean($az['motor_no'] ?? ''),
            !empty($az['model_yili']) ? (int)$az['model_yili'] : null,
            clean($az['renk'] ?? ''),
            !empty($az['muayene_tarihi']) ? $az['muayene_tarihi'] : null,
            clean($az['kasko_police'] ?? ''),
            !empty($az['km_zimmet']) ? (int)$az['km_zimmet'] : null
        ]);
    }
}

log_action($user['id'], 'sozlesme_guncelle', "Sözleşme güncellendi: " . $mevcut['belge_no'], 'mr_sozlesmeler', $id);
json_success(['id' => $id], 'Sözleşme güncellendi');
