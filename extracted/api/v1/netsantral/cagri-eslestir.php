<?php
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$numara = isset($_GET['numara']) ? trim($_GET['numara']) : '';
if ($numara === '') {
    json_error('Numara parametresi gerekli', 422);
}

$normalize = function($num) {
    return preg_replace('/[^0-9]/', '', $num);
};
$arNorm = $normalize($numara);
$arSon10 = substr($arNorm, -10);

$db = getDB();
$result = array(
    'numara' => $numara,
    'crm' => array(),
    'yonlendirme' => array(),
    'son_aramalar' => array()
);

try {
    // 1) CRM tablosunda telefon eşleşmesi (son 10 hane)
    $stmt = $db->prepare("SELECT id, ad_soyad, telefon, email, sehir, etiketler FROM crm
        WHERE REPLACE(REPLACE(REPLACE(telefon, ' ', ''), '-', ''), '+', '') LIKE ?
        ORDER BY id DESC LIMIT 5");
    $stmt->execute(array('%' . $arSon10));
    $result['crm'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) { $result['crm'] = array(); }

try {
    // 2) Yönlendirme tablosunda telefon eşleşmesi
    $stmt = $db->prepare("SELECT id, magdur_ad_soyad as ad_soyad, magdur_telefon as telefon, magdur_il as sehir, durum
        FROM yonlendirme
        WHERE REPLACE(REPLACE(REPLACE(magdur_telefon, ' ', ''), '-', ''), '+', '') LIKE ?
        ORDER BY id DESC LIMIT 5");
    $stmt->execute(array('%' . $arSon10));
    $result['yonlendirme'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) { $result['yonlendirme'] = array(); }

try {
    // 3) Son aramalar (arama_loglari)
    $stmt = $db->prepare("SELECT id, yon, baslangic_zamani, sure_saniye, durum, notlar
        FROM arama_loglari
        WHERE REPLACE(REPLACE(REPLACE(numara, ' ', ''), '-', ''), '+', '') LIKE ?
        ORDER BY id DESC LIMIT 5");
    $stmt->execute(array('%' . $arSon10));
    $result['son_aramalar'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) { $result['son_aramalar'] = array(); }

// En iyi eşleşmeyi belirle
$result['eslestirme'] = null;
if (!empty($result['crm'])) {
    $result['eslestirme'] = array('kaynak' => 'CRM', 'kayit' => $result['crm'][0]);
} elseif (!empty($result['yonlendirme'])) {
    $result['eslestirme'] = array('kaynak' => 'YONLENDIRME', 'kayit' => $result['yonlendirme'][0]);
}

json_success($result);
