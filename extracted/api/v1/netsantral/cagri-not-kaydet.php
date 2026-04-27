<?php
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('POST', 'PUT');

$user = auth_required();
$data = get_json_body();

ensure_arama_log_live_columns();

$arama_log_id = isset($data['arama_log_id']) ? intval($data['arama_log_id']) : 0;
$numara = isset($data['numara']) ? trim($data['numara']) : '';
$yon = isset($data['yon']) ? $data['yon'] : 'giden';
$not_text = isset($data['not_text']) ? trim($data['not_text']) : '';
$gorusme_sonucu = isset($data['gorusme_sonucu']) ? trim($data['gorusme_sonucu']) : null;
$crm_id = isset($data['crm_id']) ? intval($data['crm_id']) : null;
$yonlendirme_id = isset($data['yonlendirme_id']) ? intval($data['yonlendirme_id']) : null;
$canli = isset($data['canli']) && $data['canli'] ? true : false;

if ($not_text === '' && !$canli) {
    json_error('Not bos olamaz', 422);
}

$db = getDB();
$db->beginTransaction();

try {
    // 1) arama_log kaydı varsa güncelle, yoksa oluştur
    if ($arama_log_id > 0) {
        if ($canli) {
            // Görüşme devam ederken canlı not güncellenir
            $stmt = $db->prepare("UPDATE arama_loglari SET live_not = ?, not_sync_durumu = 'canli' WHERE id = ?");
            $stmt->execute(array($not_text, $arama_log_id));
        } else {
            // Görüşme bitti — final not kaydet
            $stmt = $db->prepare("UPDATE arama_loglari SET notlar = ?, live_not = NULL, not_sync_durumu = 'kaydedildi' WHERE id = ?");
            $stmt->execute(array($not_text, $arama_log_id));
        }
    } else {
        // Yeni arama_log kaydı — gelen/giden ama henüz arama-log/setup tarafından oluşmamışsa
        $stmt = $db->prepare("INSERT INTO arama_loglari (kullanici_id, yon, numara, " . ($canli ? "live_not" : "notlar") . ", crm_id, yonlendirme_id, baslangic_zamani, not_sync_durumu)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)");
        $stmt->execute(array(
            $user['id'], $yon, $numara, $not_text,
            $crm_id ?: null, $yonlendirme_id ?: null,
            $canli ? 'canli' : 'kaydedildi'
        ));
        $arama_log_id = $db->lastInsertId();
    }

    // 2) Görüşme bittiğinde (canli=false) ve crm_id varsa crm_notlari'ya da kopyala
    $crm_not_id_yeni = null;
    if (!$canli && $not_text !== '' && $crm_id) {
        try {
            $stmtN = $db->prepare("INSERT INTO crm_notlari (crm_id, not_text, gorusme_sonucu, kullanici_id) VALUES (?, ?, ?, ?)");
            $stmtN->execute(array($crm_id, $not_text, $gorusme_sonucu, $user['id']));
            $crm_not_id_yeni = $db->lastInsertId();

            // arama_loglari.crm_not_id ile bağ kur
            $stmtL = $db->prepare("UPDATE arama_loglari SET crm_not_id = ? WHERE id = ?");
            $stmtL->execute(array($crm_not_id_yeni, $arama_log_id));
        } catch (Exception $e) { /* crm_notlari yoksa sessizce geç */ }
    }

    // 3) yonlendirme_id varsa yönlendirme not_ekle benzeri davranış
    if (!$canli && $not_text !== '' && $yonlendirme_id) {
        try {
            $stmtY = $db->prepare("UPDATE yonlendirme SET notlar = CONCAT(IFNULL(notlar, ''), ?, ?) WHERE id = ?");
            $tarih = date('Y-m-d H:i') . ' [' . $user['ad_soyad'] . ']: ';
            $stmtY->execute(array("\n" . $tarih, $not_text, $yonlendirme_id));
        } catch (Exception $e) { /* yönlendirme kayıt yoksa sessiz */ }
    }

    $db->commit();

    json_success(array(
        'arama_log_id' => intval($arama_log_id),
        'crm_not_id' => $crm_not_id_yeni,
        'canli' => $canli
    ), $canli ? 'Canli not guncellendi' : 'Not kaydedildi');
} catch (Exception $e) {
    $db->rollBack();
    json_error('Not kayit hatasi: ' . $e->getMessage(), 500);
}
