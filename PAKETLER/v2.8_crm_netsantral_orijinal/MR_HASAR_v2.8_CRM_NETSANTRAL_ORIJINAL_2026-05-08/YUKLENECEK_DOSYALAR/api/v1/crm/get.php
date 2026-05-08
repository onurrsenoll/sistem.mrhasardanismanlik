<?php
/**
 * GET /api/v1/crm/get.php?id=1
 * CRM kayıt detayı (notlarıyla birlikte)
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

$id = (int)($_GET['id'] ?? 0);
if (!$id) json_error('CRM ID gerekli', 422);

$stmt = $db->prepare('SELECT c.*, u.ad_soyad as atanan_adi, cb.ad_soyad as olusturan_adi
    FROM crm c
    LEFT JOIN users u ON u.id = c.atanan_id
    LEFT JOIN users cb ON cb.id = c.created_by
    WHERE c.id = ?');
$stmt->execute([$id]);
$crm = $stmt->fetch();
if (!$crm) json_error('CRM kaydı bulunamadı', 404);

// Notlari getir
$stmt = $db->prepare('SELECT cn.*, u.ad_soyad as ekleyen_adi FROM crm_notlari cn LEFT JOIN users u ON u.id = cn.kullanici_id WHERE cn.crm_id = ? ORDER BY cn.created_at DESC');
$stmt->execute([$id]);
$crm['notlar'] = $stmt->fetchAll();

/* BIRLESIK TIMELINE - CRM notlari + arama_loglari (ayni kisinin telefon numarasiyla) + crm_id ile baglanan loglar */
$crm['timeline'] = [];
try {
    foreach ($crm['notlar'] as $n) {
        $crm['timeline'][] = [
            'tip' => 'crm-not',
            'icon' => 'StickyNote',
            'tarih' => $n['created_at'],
            'baslik' => 'GORUSME NOTU',
            'metin' => $n['not_text'],
            'sonuc' => $n['gorusme_sonucu'] ?? null,
            'kullanici' => $n['ekleyen_adi'] ?? null,
            'id' => $n['id']
        ];
    }
    // Arama loglari (crm_id eslesmesi VEYA telefon eslesmesi)
    $arNorm = preg_replace('/[^0-9]/', '', $crm['telefon'] ?? '');
    $arSon10 = substr($arNorm, -10);
    $stmt = $db->prepare("SELECT a.*, u.ad_soyad as kullanici_adi FROM arama_loglari a
        LEFT JOIN users u ON u.id = a.kullanici_id
        WHERE a.crm_id = ?
           OR REPLACE(REPLACE(REPLACE(a.numara, ' ', ''), '-', ''), '+', '') LIKE ?
        ORDER BY a.baslangic_zamani DESC LIMIT 100");
    $stmt->execute([$id, '%' . $arSon10]);
    foreach ($stmt->fetchAll() as $a) {
        $sure = '';
        if (!empty($a['sure_saniye'])) {
            $m = intdiv((int)$a['sure_saniye'], 60); $s = (int)$a['sure_saniye'] % 60;
            $sure = sprintf('%d:%02d', $m, $s);
        }
        $crm['timeline'][] = [
            'tip' => 'arama-' . ($a['yon'] ?? 'giden'),
            'icon' => ($a['yon'] === 'gelen' ? 'PhoneIncoming' : 'PhoneOutgoing'),
            'tarih' => $a['baslangic_zamani'],
            'baslik' => (($a['yon'] ?? '') === 'gelen' ? 'GELEN CAGRI' : 'GIDEN CAGRI') . ($sure ? ' (' . $sure . ')' : ''),
            'metin' => $a['notlar'] ?: ('Durum: ' . ($a['durum'] ?: 'Belirsiz')),
            'sure' => (int)($a['sure_saniye'] ?? 0),
            'numara' => $a['numara'],
            'kayit_url' => $a['kayit_dosya'] ?? ($a['kayit_url'] ?? null),
            'kullanici' => $a['kullanici_adi'],
            'id' => $a['id']
        ];
    }
    // Tarihe gore sirala (yeni ustte)
    usort($crm['timeline'], function($a, $b) { return strcmp($b['tarih'] ?? '', $a['tarih'] ?? ''); });
} catch (Exception $e) {
    // sessiz - timeline yoksa eski notlar zaten dondu
}

// Donusen dosya bilgisi
if ($crm['donusen_dosya_id']) {
    $stmt = $db->prepare('SELECT dosya_no, dosya_turu, asama FROM dosyalar WHERE id = ?');
    $stmt->execute([$crm['donusen_dosya_id']]);
    $crm['donusen_dosya'] = $stmt->fetch() ?: null;
}

json_success($crm);
