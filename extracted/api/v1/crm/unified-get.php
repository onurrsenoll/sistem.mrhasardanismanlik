<?php
/**
 * GET /api/v1/crm/unified-get.php?telefon=...&tc=...&crm_id=...
 * 360° BÜTÜNLEŞİK KİŞİ KARTI VERİSİ
 *
 * Tek bir sorguya cevap olarak: CRM kaydı + ilgili tüm yönlendirme(ler) +
 * birleşik notlar timeline + arama_loglari + ekler döner. Frontend bu veri
 * ile bütünleşik kişi kartı render eder.
 *
 * Anahtar mantığı:
 *   - crm_id verilirse → o CRM'in tüm timeline'ı
 *   - telefon verilirse → telefonla EŞLEŞEN CRM'i bul, yoksa null döner ama
 *     yönlendirme + arama_log telefonla aranır (yeni kayıt akışı için zenginleştirme)
 *   - tc verilirse → tc ile bul (telefon yoksa)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();
ensure_crm_columns();
ensure_yonlendirme_columns();

$crmId = (int)($_GET['crm_id'] ?? 0);
$telefon = clean($_GET['telefon'] ?? '');
$tc = clean($_GET['tc'] ?? '');

// Telefon normalize: sadece rakamlar, baştan 90 ve 0 temizle
$telNorm = '';
if ($telefon !== '') {
    $telNorm = preg_replace('/\D/', '', $telefon);
    if (strpos($telNorm, '90') === 0 && strlen($telNorm) === 12) $telNorm = substr($telNorm, 2);
    if (strpos($telNorm, '0') === 0 && strlen($telNorm) === 11) $telNorm = substr($telNorm, 1);
}

$result = ['crm' => null, 'yonlendirmeler' => [], 'notlar' => [], 'arama_loglari' => [], 'ekler' => []];

// ═══ CRM KAYDI BUL ═══
$crm = null;
if ($crmId > 0) {
    $stmt = $db->prepare('SELECT * FROM crm WHERE id = ?');
    $stmt->execute([$crmId]);
    $crm = $stmt->fetch();
} elseif ($telNorm !== '') {
    // Telefon ile ara (rakamlar bazında)
    $stmt = $db->prepare("SELECT * FROM crm WHERE REPLACE(REPLACE(REPLACE(REPLACE(telefon, ' ', ''), '-', ''), '(', ''), ')', '') LIKE ? ORDER BY id DESC LIMIT 1");
    $stmt->execute(['%' . $telNorm]);
    $crm = $stmt->fetch();
} elseif ($tc !== '') {
    $stmt = $db->prepare('SELECT * FROM crm WHERE tc_vergi_no = ? ORDER BY id DESC LIMIT 1');
    $stmt->execute([$tc]);
    $crm = $stmt->fetch();
}

if ($crm) {
    $result['crm'] = $crm;
    $crmId = (int)$crm['id'];
    if ($telNorm === '' && !empty($crm['telefon'])) {
        $telNorm = preg_replace('/\D/', '', $crm['telefon']);
        if (strpos($telNorm, '90') === 0 && strlen($telNorm) === 12) $telNorm = substr($telNorm, 2);
        if (strpos($telNorm, '0') === 0 && strlen($telNorm) === 11) $telNorm = substr($telNorm, 1);
    }
    if ($tc === '' && !empty($crm['tc_vergi_no'])) $tc = $crm['tc_vergi_no'];
}

// ═══ İLGİLİ YÖNLENDİRMELER ═══
$yonIds = [];
try {
    if ($crmId > 0 || $telNorm !== '' || $tc !== '') {
        $where = [];
        $params = [];
        if ($crmId > 0) { $where[] = 'donusen_crm_id = ?'; $params[] = $crmId; }
        if ($telNorm !== '') {
            $where[] = "REPLACE(REPLACE(REPLACE(REPLACE(magdur_telefon, ' ', ''), '-', ''), '(', ''), ')', '') LIKE ?";
            $params[] = '%' . $telNorm;
        }
        if ($tc !== '') { $where[] = 'magdur_tc = ?'; $params[] = $tc; }
        if (!empty($where)) {
            $stmt = $db->prepare('SELECT y.*, u.ad_soyad as atanan_adi FROM yonlendirme y LEFT JOIN users u ON u.id = y.atanan_id WHERE ' . implode(' OR ', $where) . ' ORDER BY y.created_at DESC LIMIT 50');
            $stmt->execute($params);
            $result['yonlendirmeler'] = $stmt->fetchAll();
            foreach ($result['yonlendirmeler'] as $y) $yonIds[] = (int)$y['id'];
        }
    }
} catch (\Exception $e) {}

// ═══ NOTLARI BİRLEŞİK TIMELINE ═══
$notlar = [];
try {
    if ($crmId > 0) {
        $stmt = $db->prepare("SELECT n.id, 'crm' as kaynak, ? as kaynak_id, n.not_text, n.gorusme_sonucu, n.durum_snapshot, n.kullanici_id as ekleyen_id, u.ad_soyad as ekleyen_adi, n.created_at FROM crm_notlari n LEFT JOIN users u ON u.id = n.kullanici_id WHERE n.crm_id = ? ORDER BY n.created_at DESC");
        $stmt->execute([$crmId, $crmId]);
        foreach ($stmt->fetchAll() as $n) $notlar[] = $n;
    }
    if (!empty($yonIds)) {
        $place = implode(',', array_fill(0, count($yonIds), '?'));
        $stmt = $db->prepare("SELECT yn.id, 'yonlendirme' as kaynak, yn.yonlendirme_id as kaynak_id, yn.not_text, yn.gorusme_durumu as gorusme_sonucu, yn.durum_snapshot, yn.ekleyen_id, u.ad_soyad as ekleyen_adi, yn.created_at, yn.alinmama_nedeni FROM yonlendirme_notlar yn LEFT JOIN users u ON u.id = yn.ekleyen_id WHERE yn.yonlendirme_id IN ($place) ORDER BY yn.created_at DESC");
        $stmt->execute($yonIds);
        foreach ($stmt->fetchAll() as $n) $notlar[] = $n;
    }
} catch (\Exception $e) {}

// snapshot JSON parse
foreach ($notlar as &$n) {
    $s = $n['durum_snapshot'] ?? null;
    $n['snapshot'] = null;
    if ($s && is_string($s)) {
        $parsed = json_decode($s, true);
        if (is_array($parsed)) $n['snapshot'] = $parsed;
    }
}
unset($n);
// Tarihe göre sırala (yeni → eski)
usort($notlar, function($a, $b) {
    return strcmp($b['created_at'] ?? '', $a['created_at'] ?? '');
});
$result['notlar'] = $notlar;

// ═══ ARAMA LOGLARI ═══
try {
    $where = []; $params = [];
    if ($crmId > 0) { $where[] = 'crm_id = ?'; $params[] = $crmId; }
    if (!empty($yonIds)) {
        $place = implode(',', array_fill(0, count($yonIds), '?'));
        $where[] = "yonlendirme_id IN ($place)";
        foreach ($yonIds as $yi) $params[] = $yi;
    }
    if ($telNorm !== '') {
        $where[] = "REPLACE(REPLACE(REPLACE(REPLACE(numara, ' ', ''), '-', ''), '(', ''), ')', '') LIKE ?";
        $params[] = '%' . $telNorm;
    }
    if (!empty($where)) {
        $stmt = $db->prepare('SELECT al.*, u.ad_soyad as kullanici_adi FROM arama_loglari al LEFT JOIN users u ON u.id = al.kullanici_id WHERE ' . implode(' OR ', $where) . ' ORDER BY al.baslangic_zamani DESC LIMIT 50');
        $stmt->execute($params);
        $result['arama_loglari'] = $stmt->fetchAll();
    }
} catch (\Exception $e) {}

// ═══ EKLER ═══
try {
    if ($crmId > 0) {
        $stmt = $db->prepare('SELECT e.*, u.ad_soyad as yukleyen_adi FROM crm_ekleri e LEFT JOIN users u ON u.id = e.yukleyen_id WHERE e.crm_id = ? ORDER BY e.created_at DESC');
        $stmt->execute([$crmId]);
        $result['ekler'] = $stmt->fetchAll();
    }
} catch (\Exception $e) {}

// İstatistik özeti (UI'da hızlı badge için)
$result['ozet'] = [
    'gorusme_sayisi' => count($result['arama_loglari']),
    'not_sayisi' => count($result['notlar']),
    'yonlendirme_sayisi' => count($result['yonlendirmeler']),
    'ek_sayisi' => count($result['ekler']),
    'son_arama' => !empty($result['arama_loglari']) ? $result['arama_loglari'][0]['baslangic_zamani'] : null
];

json_success($result);
