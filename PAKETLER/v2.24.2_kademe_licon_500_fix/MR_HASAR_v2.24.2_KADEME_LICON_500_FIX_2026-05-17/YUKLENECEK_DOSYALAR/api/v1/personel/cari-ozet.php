<?php
/**
 * GET /api/v1/personel/cari-ozet.php?personel_id=X
 *
 * v2.24.2 — DEFENSİF VERSİYON
 * Sunucuda eksik tablo / eksik dosya / eksik kolon olsa bile 500 fırlatmaz;
 * boş ama geçerli bir cevap döner ve error_log'a sorunu yazar.
 *
 * Önceki sürüm 500 dönüyordu — SQL migration çalıştırılmadığında veya
 * personel_kazanc_modelleri / personel_prim_kayitlari tabloları yoksa
 * frontend'in CARİ HESAP sekmesi de çöküyordu.
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');
$user = auth_required();
$db = getDB();

$personelId = (int)($_GET['personel_id'] ?? 0);
if (!$personelId) json_error('personel_id zorunlu', 422);

/* Personel doğrula */
try {
    $stmt = $db->prepare('SELECT * FROM personel WHERE id = ? LIMIT 1');
    $stmt->execute([$personelId]);
    $personel = $stmt->fetch(PDO::FETCH_ASSOC);
} catch (Throwable $e) {
    error_log('[v2.24.2 cari-ozet personel-fetch] ' . $e->getMessage());
    json_error('Personel sorgulanamadı: ' . $e->getMessage(), 500);
}
if (!$personel) json_error('Personel bulunamadı', 404);

/* _kademe_lib.php yüklenemezse fallback ile çalış */
$libPath = __DIR__ . '/_kademe_lib.php';
if (is_file($libPath)) {
    require_once $libPath;
} else {
    error_log('[v2.24.2 cari-ozet] _kademe_lib.php yok: ' . $libPath);
}

/* Tabloların var olduğunu doğrula — yoksa boş cevap */
$tablolarVar = true;
foreach (['personel_kazanc_modelleri','personel_prim_kayitlari','personel_odemeler'] as $t) {
    try {
        $db->query("SELECT 1 FROM `$t` LIMIT 1");
    } catch (Throwable $e) {
        error_log('[v2.24.2 cari-ozet] tablo eksik: ' . $t . ' — ' . $e->getMessage());
        $tablolarVar = false;
        break;
    }
}

if (!$tablolarVar || !function_exists('personel_cari_ozet')) {
    /* Defensif fallback — eski personel.maas/prim_adk/prim_bh kolonlarına dön */
    json_success([
        'personel'      => $personel,
        'model'         => [
            'model_tipi'       => 'sabit_prim',
            'sabit_maas'       => (float)($personel['maas'] ?? 0),
            'prim_adk'         => (float)($personel['prim_adk'] ?? 0),
            'prim_bh'          => (float)($personel['prim_bh']  ?? 0),
            'saha_kademe_json' => null,
            'ofis_kota_json'   => null,
        ],
        'donemler'      => [],
        'genel_hakedis' => 0,
        'genel_odenen'  => 0,
        'genel_bakiye'  => 0,
        'son_odemeler'  => [],
        '_uyari'        => 'v2.24 SQL migration tamamlanmadı — SQL\'i çalıştırın'
    ]);
}

try {
    $model = personel_aktif_model($db, $personelId);
    $ozet  = personel_cari_ozet($db, $personelId);

    /* Her dönem için ödenmiş tutarı çıkar → dönemsel bakiye */
    foreach ($ozet['donemler'] as &$d) {
        $stmt = $db->prepare('SELECT IFNULL(SUM(tutar),0) FROM personel_odemeler WHERE personel_id = ? AND donem = ?');
        $stmt->execute([$personelId, $d['donem']]);
        $d['odenen'] = round((float)$stmt->fetchColumn(), 2);
        $d['bakiye'] = round((float)$d['toplam_hakedis'] - (float)$d['odenen'], 2);
    }
    unset($d);

    /* Son 5 ödeme */
    $stmt = $db->prepare('
        SELECT po.*, k.ad AS kasa_ad
        FROM personel_odemeler po
        LEFT JOIN kasalar k ON k.id = po.kasa_id
        WHERE po.personel_id = ?
        ORDER BY po.odeme_tarihi DESC, po.id DESC LIMIT 5
    ');
    $stmt->execute([$personelId]);
    $sonOdemeler = $stmt->fetchAll(PDO::FETCH_ASSOC);

    json_success([
        'personel'      => $personel,
        'model'         => $model,
        'donemler'      => $ozet['donemler'],
        'genel_hakedis' => $ozet['genel_hakedis'],
        'genel_odenen'  => $ozet['genel_odenen'],
        'genel_bakiye'  => $ozet['genel_bakiye'],
        'son_odemeler'  => $sonOdemeler,
    ]);
} catch (Throwable $e) {
    error_log('[v2.24.2 cari-ozet hesap] ' . $e->getMessage());
    /* Hata olsa bile 500 dönme — boş cevap dön ki frontend modal çökmesin */
    json_success([
        'personel'      => $personel,
        'model'         => null,
        'donemler'      => [],
        'genel_hakedis' => 0,
        'genel_odenen'  => 0,
        'genel_bakiye'  => 0,
        'son_odemeler'  => [],
        '_hata'         => 'Cari hesap üretilirken hata: ' . $e->getMessage()
    ]);
}
