<?php
/**
 * /api/v1/personel/kazanc-model.php
 *   GET  ?personel_id=X       → aktif modeli döner
 *   POST                       → modeli kaydeder (aktif olanı bitirir, yeni aktif yaratır)
 *
 * v2.24 — KADEMELİ PRİM MODELİ YÖNETİMİ
 * Bir personelin AKTİF kazanç modelini okur/yazar. Geçmiş modeller saklanır
 * (audit trail). Yeni model kaydedilince eski aktif olan'a gecerlilik_bitis
 * konur ve aktif=0 yapılır; yeni satır aktif=1 olarak eklenir.
 *
 * POST body:
 *   {
 *     personel_id: 7,
 *     model_tipi: 'kademeli_ofis' | 'kademeli_saha' | 'sabit_prim' | 'sabit',
 *     sabit_maas: 25000,
 *     prim_adk: 0, prim_bh: 0,                              // sabit_prim için
 *     saha_kademe_json: '[...]',                             // kademeli_saha için
 *     ofis_kota_json:  '{"adk_kademe":[...],"bh_kademe":[...]}', // kademeli_ofis için
 *     yillik_bonus_json: '[...]',                            // opsiyonel
 *     gecerlilik_baslangic: '2026-05-01',
 *     notlar: '...'
 *   }
 */
require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
$user = auth_required();
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $personelId = (int)($_GET['personel_id'] ?? 0);
    if (!$personelId) json_error('personel_id zorunlu', 422);

    $stmt = $db->prepare('
        SELECT * FROM personel_kazanc_modelleri
        WHERE personel_id = ? AND aktif = 1
        ORDER BY gecerlilik_baslangic DESC, id DESC LIMIT 1
    ');
    $stmt->execute([$personelId]);
    $aktif = $stmt->fetch(PDO::FETCH_ASSOC);

    $stmt = $db->prepare('
        SELECT id, model_tipi, sabit_maas, gecerlilik_baslangic, gecerlilik_bitis,
               aktif, notlar, created_at
        FROM personel_kazanc_modelleri
        WHERE personel_id = ? ORDER BY id DESC LIMIT 50
    ');
    $stmt->execute([$personelId]);
    $gecmis = $stmt->fetchAll(PDO::FETCH_ASSOC);

    json_success(['aktif' => $aktif, 'gecmis' => $gecmis]);
}

if ($method !== 'POST') json_error('Geçersiz metod', 405);

$body = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$personelId = (int)($body['personel_id'] ?? 0);
if (!$personelId) json_error('personel_id zorunlu', 422);

$stmt = $db->prepare('SELECT id FROM personel WHERE id = ?');
$stmt->execute([$personelId]);
if (!$stmt->fetchColumn()) json_error('Personel bulunamadı', 404);

$modelTipi = $body['model_tipi'] ?? 'sabit';
if (!in_array($modelTipi, ['sabit','sabit_prim','kademeli_saha','kademeli_ofis'], true)) {
    json_error('Geçersiz model_tipi', 422);
}
$sabitMaas = (float)($body['sabit_maas'] ?? 0);
$primAdk   = (float)($body['prim_adk']   ?? 0);
$primBh    = (float)($body['prim_bh']    ?? 0);
$yemekG    = (float)($body['yemek_gunluk'] ?? 0);
$yemekN    = (int)  ($body['yemek_gun_sayisi'] ?? 22);

$sahaJ = $body['saha_kademe_json']  ?? null;
$ofisJ = $body['ofis_kota_json']    ?? null;
$bonusJ= $body['yillik_bonus_json'] ?? null;
foreach (['sahaJ','ofisJ','bonusJ'] as $v) {
    if ($$v !== null && !is_string($$v)) $$v = json_encode($$v, JSON_UNESCAPED_UNICODE);
    if ($$v !== null && trim($$v) === '') $$v = null;
    /* Sağlamlık: JSON parse edilebilir mi */
    if ($$v !== null && json_decode($$v, true) === null && trim($$v) !== 'null') {
        json_error("Geçersiz JSON: $v", 422);
    }
}

$gecBas = $body['gecerlilik_baslangic'] ?? date('Y-m-01');
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $gecBas)) $gecBas = date('Y-m-01');
$notlar = trim((string)($body['notlar'] ?? ''));

try {
    $db->beginTransaction();

    /* Mevcut aktif modeli bitir (bir gün öncesinde kapan) */
    $stmt = $db->prepare('
        UPDATE personel_kazanc_modelleri
        SET aktif = 0, gecerlilik_bitis = DATE_SUB(?, INTERVAL 1 DAY)
        WHERE personel_id = ? AND aktif = 1
    ');
    $stmt->execute([$gecBas, $personelId]);

    /* Yeni aktif modeli ekle */
    $stmt = $db->prepare('
        INSERT INTO personel_kazanc_modelleri
          (personel_id, model_tipi, sabit_maas, yemek_gunluk, yemek_gun_sayisi,
           prim_adk, prim_bh, saha_kademe_json, ofis_kota_json, yillik_bonus_json,
           gecerlilik_baslangic, aktif, notlar, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    ');
    $stmt->execute([
        $personelId, $modelTipi, $sabitMaas, $yemekG, $yemekN,
        $primAdk, $primBh, $sahaJ, $ofisJ, $bonusJ,
        $gecBas, ($notlar !== '' ? $notlar : null), (int)($user['id'] ?? 0)
    ]);
    $newId = (int)$db->lastInsertId();

    /* personel tablosundaki eski özet kolonları da güncelle (geriye uyum) */
    $stmt = $db->prepare('UPDATE personel SET maas = ?, prim_adk = ?, prim_bh = ? WHERE id = ?');
    $stmt->execute([$sabitMaas, $primAdk, $primBh, $personelId]);

    $db->commit();
    json_success(['id' => $newId, 'mesaj' => 'Çalışma modeli kaydedildi']);
} catch (Exception $e) {
    $db->rollBack();
    json_error('Model kaydedilemedi: ' . $e->getMessage(), 500);
}
