<?php
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();

$crm_id = isset($_GET['crm_id']) ? intval($_GET['crm_id']) : 0;
$yonlendirme_id = isset($_GET['yonlendirme_id']) ? intval($_GET['yonlendirme_id']) : 0;
$numara = isset($_GET['numara']) ? trim($_GET['numara']) : '';

if (!$crm_id && !$yonlendirme_id && !$numara) {
    json_error('crm_id, yonlendirme_id veya numara parametresi gerekli', 422);
}

$db = getDB();
$timeline = array();

try {
    // 1) CRM notları
    if ($crm_id) {
        $stmt = $db->prepare("SELECT n.id, n.not_text, n.gorusme_sonucu, n.created_at, u.ad_soyad as kullanici_adi
            FROM crm_notlari n
            LEFT JOIN users u ON u.id = n.kullanici_id
            WHERE n.crm_id = ?
            ORDER BY n.created_at DESC");
        $stmt->execute(array($crm_id));
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $timeline[] = array(
                'tip' => 'crm-not',
                'icon' => 'StickyNote',
                'tarih' => $r['created_at'],
                'baslik' => 'Görüşme Notu',
                'metin' => $r['not_text'],
                'sonuc' => $r['gorusme_sonucu'],
                'kullanici' => $r['kullanici_adi'],
                'id' => $r['id']
            );
        }
    }
} catch (Exception $e) {}

try {
    // 2) Arama logları - hem crm_id ile hem numara ile
    $whereParts = array();
    $params = array();
    if ($crm_id) {
        $whereParts[] = 'crm_id = ?';
        $params[] = $crm_id;
    }
    if ($yonlendirme_id) {
        $whereParts[] = 'yonlendirme_id = ?';
        $params[] = $yonlendirme_id;
    }
    if ($numara) {
        $arNorm = preg_replace('/[^0-9]/', '', $numara);
        $arSon10 = substr($arNorm, -10);
        $whereParts[] = "REPLACE(REPLACE(REPLACE(numara, ' ', ''), '-', ''), '+', '') LIKE ?";
        $params[] = '%' . $arSon10;
    }
    $where = $whereParts ? 'WHERE ' . implode(' OR ', $whereParts) : '';
    $stmt = $db->prepare("SELECT a.id, a.yon, a.numara, a.durum, a.baslangic_zamani, a.sure_saniye, a.notlar, a.kayit_url, u.ad_soyad as kullanici_adi
        FROM arama_loglari a
        LEFT JOIN users u ON u.id = a.kullanici_id
        $where
        ORDER BY a.baslangic_zamani DESC LIMIT 100");
    $stmt->execute($params);
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $sure = '';
        if ($r['sure_saniye'] > 0) {
            $m = intdiv($r['sure_saniye'], 60); $s = $r['sure_saniye'] % 60;
            $sure = sprintf('%d:%02d', $m, $s);
        }
        $timeline[] = array(
            'tip' => 'arama-' . $r['yon'],
            'icon' => $r['yon'] === 'gelen' ? 'PhoneIncoming' : 'PhoneOutgoing',
            'tarih' => $r['baslangic_zamani'],
            'baslik' => ($r['yon'] === 'gelen' ? 'GELEN ÇAĞRI' : 'GİDEN ÇAĞRI') . ($sure ? ' (' . $sure . ')' : ''),
            'metin' => $r['notlar'] ?: ('Durum: ' . ($r['durum'] ?: 'Belirsiz')),
            'sure' => $r['sure_saniye'],
            'numara' => $r['numara'],
            'kayit_url' => $r['kayit_url'],
            'kullanici' => $r['kullanici_adi'],
            'id' => $r['id']
        );
    }
} catch (Exception $e) {}

try {
    // 3) Yönlendirme notları (eğer yonlendirme_id varsa)
    if ($yonlendirme_id) {
        $stmt = $db->prepare("SELECT notlar, updated_at FROM yonlendirme WHERE id = ?");
        $stmt->execute(array($yonlendirme_id));
        $row = $stmt->fetch();
        if ($row && $row['notlar']) {
            $timeline[] = array(
                'tip' => 'yonlendirme-not',
                'icon' => 'FileText',
                'tarih' => $row['updated_at'],
                'baslik' => 'Yönlendirme Notları',
                'metin' => $row['notlar']
            );
        }
    }
} catch (Exception $e) {}

// Tarihe göre sırala (en yeni üstte)
usort($timeline, function($a, $b) {
    return strcmp($b['tarih'], $a['tarih']);
});

json_success(array(
    'timeline' => $timeline,
    'toplam' => count($timeline)
));
