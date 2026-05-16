<?php
/**
 * GET /api/v1/personel/dosya-listesi.php?personel_id=X&donem=YYYY-MM
 *
 * v2.19: Bir personelin belirli bir dönemde SORUMLU olduğu dosyaları satır satır
 * listeler. Her dosya için: dosya_no, musteri_adi, dosya_turu, asama, açılış tarihi,
 * ve o dosyaya karşılık gelen prim tutarı (personel.prim_adk veya prim_bh).
 *
 * Bu endpoint sayesinde HAKEDİŞ TAKİBİ ekranında bir hakediş satırına tıklandığında
 * o personelin o ay sorumlu olduğu tüm dosyalar açıklanabilir.
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

$personelId = (int)($_GET['personel_id'] ?? 0);
$donem = clean($_GET['donem'] ?? '');

if (!$personelId) json_error('personel_id zorunlu', 422);
if ($donem === '' || !preg_match('/^\d{4}-\d{2}$/', $donem)) json_error('donem (YYYY-MM) zorunlu', 422);

/* Personel kaydını al — user_id ve prim alanları için */
$stmt = $db->prepare('SELECT id, ad_soyad, user_id, prim_adk, prim_bh FROM personel WHERE id = ? LIMIT 1');
$stmt->execute([$personelId]);
$personel = $stmt->fetch();
if (!$personel) json_error('Personel bulunamadı', 404);

$userId = (int)($personel['user_id'] ?? 0);
if (!$userId) {
    /* user_id yoksa hiç dosya bağlanamaz — boş liste döner */
    json_success([
        'personel' => $personel,
        'donem' => $donem,
        'dosyalar' => [],
        'toplam_adk' => 0,
        'toplam_bh' => 0,
        'toplam_prim' => 0
    ]);
}

$primAdk = (float)($personel['prim_adk'] ?? 0);
$primBh  = (float)($personel['prim_bh']  ?? 0);

$donemBaslangic = $donem . '-01';
$donemBitis = date('Y-m-t', strtotime($donemBaslangic));

/* Bu personelin sorumlu olduğu dosyalar
 * COALESCE(sorumlu_id, created_by) — sorumlu yoksa created_by'a sayar.
 * Hakediş hesaplaması da bu mantığı kullanır (hakedis-hesapla.php:56-66) */
$sql = "SELECT
    d.id,
    d.dosya_no,
    d.dosya_turu,
    d.asama,
    d.acilis_tarihi,
    d.kaza_tarihi,
    d.sigorta_sirket,
    d.hasar_no,
    d.plaka,
    m.ad_soyad AS musteri_adi,
    m.tc_kimlik AS musteri_tc,
    CASE WHEN d.dosya_turu = 'BH' THEN ? ELSE ? END AS prim_tutari
FROM dosyalar d
LEFT JOIN magdurlar m ON m.dosya_id = d.id
WHERE COALESCE(d.sorumlu_id, d.created_by) = ?
  AND d.acilis_tarihi BETWEEN ? AND ?
  AND (d.silindi IS NULL OR d.silindi = 0)
ORDER BY d.acilis_tarihi ASC, d.id ASC";

$stmt = $db->prepare($sql);
$stmt->execute([$primBh, $primAdk, $userId, $donemBaslangic, $donemBitis]);
$dosyalar = $stmt->fetchAll();

$toplamAdk = 0;
$toplamBh = 0;
$toplamPrim = 0;
foreach ($dosyalar as $d) {
    if ($d['dosya_turu'] === 'BH') {
        $toplamBh++;
        $toplamPrim += $primBh;
    } else {
        $toplamAdk++;
        $toplamPrim += $primAdk;
    }
}

json_success([
    'personel' => [
        'id' => (int)$personel['id'],
        'ad_soyad' => $personel['ad_soyad'],
        'user_id' => $userId,
        'prim_adk' => $primAdk,
        'prim_bh' => $primBh
    ],
    'donem' => $donem,
    'donem_baslangic' => $donemBaslangic,
    'donem_bitis' => $donemBitis,
    'dosyalar' => $dosyalar,
    'toplam_adk' => $toplamAdk,
    'toplam_bh' => $toplamBh,
    'toplam_dosya' => count($dosyalar),
    'toplam_prim' => $toplamPrim
]);
