<?php
/**
 * GET /api/v1/sistem/dashboard.php
 * Genel dashboard istatistikleri
 */

require_once __DIR__ . '/../../config/helpers.php';
require_once __DIR__ . '/../../config/auth.php';

setup_headers();
require_method('GET');

$user = auth_required();
$db = getDB();

/* ═══ EVRAK_TURU — EXCEL TABANLI ANA LİSTE MİGRATİON (B PLANI) ═══
 * Sentinel kontrolü ile SADECE BİR KEZ çalışır (idempotent).
 * - Mevcut evrak_turu tanımlarını SİLMEDEN aktif=0 yapar (arşiv olarak kalır).
 * - Excel kaynaklı 199 ismi aktif olarak ekler / mevcutsa aktif'e çeker.
 * - evraklar tablosu DEĞİŞMEZ (yüklü dosya metadataları korunur).
 *   Frontend "birleşim" stratejisi ile orphan evraklar liste sonunda görünür.
 */
try {
    $sentinel = 'KAZA TESPİT TUTANAĞI (KTT)';
    $chk = $db->prepare("SELECT id FROM tanimlamalar WHERE kategori='evrak_turu' AND deger=? AND aktif=1");
    $chk->execute([$sentinel]);
    if (!$chk->fetch()) {
        $db->exec("UPDATE tanimlamalar SET aktif=0 WHERE kategori='evrak_turu'");
        $excelList = [
            'KAZA TESPİT TUTANAĞI (KTT)','OLAY YERİ FOTOĞRAFLARI','ARAÇ TRAFİKTEN MEN VE YEDİEMİN TESLİM TUTANAĞI',
            'TRAFİK CEZASI','JANDARMA TUTANAĞI','POLİS TUTANAĞI','RUHSAT','EHLİYET',
            'ARAÇ FOTOĞRAFLARI / HASAR FOTOĞRAFLARI','ARAÇ KİLOMETRE FOTOĞRAFI','SBM HASAR SORGU EKRANI',
            'TRAFİK SİGORTASI POLİÇESİ','KASKO POLİÇESİ','HASAR İHBAR FORMU','EKSPERTİZ RAPORU',
            'ARAÇ HASARI EKSPERTİZ GÖRÜŞÜ','ONARIM FATURASI','TEKNİK İNCELEME RAPORU',
            'ARAÇ DEĞER - PARÇA ANALİZ BİLİRKİŞİ RAPORU','PERT MUTABAKAT EVRAKI',
            'OLAY YERİ GÖRGÜ VE TESPİT TUTANAĞI','OLAY YERİ İNCELEME RAPORU',
            'ALKOL ÖLÇÜM RAPORU / ADLİ ALKOL RAPORU','İFADE TUTANAĞI','GÖZALTI VEYA SALIVERME TUTANAĞI',
            'EHLİYET GERİ ALMA TUTANAĞI','ŞİKAYET DİLEKÇESİ','SUÇ DUYURUSU','ŞİKAYETTEN VAZGEÇME BEYANI',
            'FEZLEKE','VERASET İLAMI','GELİR BELGESİ / ÖĞRENCİ BELGESİ','MESLEK BELGESİ','TAPU KAYDI BİLGİSİ',
            'FERDİ KAZA POLİÇESİ','ZORUNLU KOLTUK FERDİ KAZA POLİÇESİ','GEÇİCİ ADLİ RAPOR',
            'KESİN ADLİ RAPOR / KATİ RAPOR','GENEL ADLİ MUAYENE RAPORU','EPİKRİZ RAPORU',
            'TABURCU BELGESİ / TABURCU ÖZETİ','AYAKTA TEDAVİ RAPORU','YATIŞ RAPORU','AMELİYAT RAPORU',
            'İLAÇ VE TEDAVİ REÇETELERİ','TETKİK SONUÇLARI','RADYOLOJİK GÖRÜNTÜLER (MR / BT / RÖNTGEN / USG)',
            'GÖRÜNTÜLEME CD','PATOLOJİ RAPORU','FİZİK TEDAVİ RAPORU','PSİKİYATRİ RAPORU','PROTEZ RAPORU',
            'SAĞLIK KURULU RAPORU','ERİŞKİNLER İÇİN ENGELLİLİK SAĞLIK KURULU RAPORU',
            'MALULİYET RAPORU / SAKATLIK RAPORU','MALULEN EMEKLİLİK RAPORU','SAKATLIK MÜTALAASI',
            'E-NABIZ KAYITLARI','SGK EVRAĞI','GEÇİCİ İŞ GÖREMEZLİK SORGU KAYDI (E-DEVLET)',
            'HASTANE ÜCRET FATURASI','İLAÇ FATURASI','TIBBİ MALZEME FATURASI','TEDAVİ EVRAKLARI',
            'ÖLÜ MUAYENE VE OTOPSİ RAPORU','AKTÜER RAPORU / AKTÜER BİLİRKİŞİ RAPORU','TIBBİ BİLİRKİŞİ RAPORU',
            'ADLİ TIP KURUMU İHTİSAS KURULU RAPORU','ADLİ TIP RAPORU','ADLİ TIPÇI ONAYI',
            'ADLİ KURUL RAPORU','ADLİ KURUL RAPOR MAKBUZU','İŞÇİ ALACAKLARI FORMU','CEZA MAHKEMESİ KARARI',
            'KOVUŞTURMAYA YER OLMADIĞINA DAİR KARAR / KYOK / TAKİPSİZLİK KARARI','İDDİANAME',
            'ESAS HAKKINDA MÜTALAA','KİMLİK FOTOKOPİSİ / NÜFUS CÜZDANI','NÜFUS KAYIT ÖRNEĞİ','İKAMETGAH',
            'E-DEVLET ŞİFRESİ','E-DEVLET BELGELERİ','IBAN BİLGİSİ','FİRMA BİLGİSİ','ŞİRKET İMZA SİRKÜSÜ',
            'VEKALETNAME','VEKALET İBRAZ DİLEKÇESİ','AZİLNAME','İÇ AZİLNAME','AZİLNAME İCRA TAKİP EVRAKLARI',
            'ÜCRET SÖZLEŞMESİ','RÜCU SÖZLEŞMESİ','HAK MAHRUMİYETİ RÜCU SÖZLEŞMESİ','HAK MAHRUMİYETİ BEYANI',
            'TEKLİF ONAY FORMU','BAŞVURU ALINDI DİLEKÇESİ','DOSYA KAPAĞI','TEMLİK','NOTER TEMLİĞİ',
            'NOTER MAKBUZU','NOTER ONAYLI SURET','SENET','AVUKAT ONAYI',
            'KİŞİSEL VERİLERİ KORUMA KANUNU AÇIK RIZA BEYANI','SESLİ ONAY SES KAYDI','BEYANLAR',
            'SİGORTA ŞİRKETİNE YAZILI BAŞVURU DİLEKÇESİ','SİGORTA BAŞVURU FORMU','SİGORTA RIZA BEYANI',
            'SİGORTA YAZIŞMALARI','EKSİK EVRAK BİLDİRİM YAZISI','SİGORTA KABUL YAZISI','SİGORTA RED YAZISI',
            'ÖDEME YAZISI','GÜVENCE HESABI BAŞVURU FORMU','GÜVENCE HESABI RED YAZISI','TEMİNAT MEKTUBU',
            'İPTAL MAİLİ','KUSUR TESPİT RAPORU / KUSUR BİLİRKİŞİ RAPORU','KUSUR MÜTALAASI',
            'KUSUR BİLİRKİŞİ ONAYI','HESAP BİLİRKİŞİ RAPORU','MALİ MÜŞAVİR BİLİRKİŞİ RAPORU',
            'EK BİLİRKİŞİ RAPORU','KÖK BİLİRKİŞİ RAPORU','BİLİRKİŞİ İTİRAZ DİLEKÇESİ',
            'BİLİRKİŞİ RAPOR MAKBUZU','ARABULUCULUK BAŞVURU FORMU','ARABULUCU ATAMA YAZISI',
            'ARABULUCULUK BİLGİLENDİRME TUTANAĞI','ARABULUCULUK İLK VE SON OTURUM TUTANAKLARI',
            'ARABULUCULUK TUTANAĞI','ARABULUCULUK ANLAŞMA BELGESİ / ANLAŞMA TUTANAĞI',
            'ARABULUCULUK ANLAŞAMAMA TUTANAĞI','ARABULUCU ÜCRET MAKBUZU','ARABULUCULUK DAİRE BAŞKANLIĞI YAZISI',
            'UZLAŞTIRMA TEKLİF FORMU / BELGESİ','UZLAŞTIRMA RAPORU / UZLAŞTIRMACI RAPORU',
            'UZLAŞMA TUTANAĞI','UZLAŞMA TUTANAKLARI - ADLİ','UZLAŞMA KABUL BEYANI','UZLAŞMA RED BEYANI',
            'İBRANAME','FERAGAT BEYANI','SULH SÖZLEŞMESİ','SİGORTA TAHKİM KOMİSYONU BAŞVURU FORMU',
            'TAHKİM BAŞVURU DİLEKÇESİ','TAHKİM BAŞVURU ÜCRETİ DEKONTU / HARÇ DEKONTU',
            'TAHKİM CEVAP DİLEKÇESİ','TAHKİM DELİL LİSTESİ','TAHKİM BİLİRKİŞİ RAPORU',
            'TAHKİM İTİRAZ DİLEKÇESİ','SİGORTA HAKEM KARARI / TAHKİM HAKEM KARARI','TAHKİM KABUL KARARI',
            'TAHKİM REDD KARARI','SİGORTA TAHKİM KOMİSYONU KARARI','İTİRAZ HAKEM HEYETİ KARARI',
            'TAHKİM MAKBUZU','DAVA DİLEKÇESİ','CEVAP DİLEKÇESİ','REPLİK DİLEKÇESİ','DÜPLİK DİLEKÇESİ',
            'BEYAN DİLEKÇESİ','ISLAH DİLEKÇESİ','FERAGAT DİLEKÇESİ','İHTARNAME','İDARİ DAVA FORMU',
            'İDARİ DAVA DİLEKÇESİ','TENSİP ZAPTI','DURUŞMA TUTANAĞI','MÜZEKKERE','MÜZEKKERE CEVABI',
            'HARÇ DEKONTU','GİDER AVANSI DEKONTU','BARO PULU','DAVA AÇILIŞ FİŞİ','DOSYA DERDESTLİK BELGESİ',
            'UYAP KAYITLARI / UYAP SORGU EKRANI / UYAP DOSYA BİLGİLERİ','DOSYA TEBLİĞ ZARFI',
            'TEBLİGAT MAZBATASI','PTT TEBLİGAT','ELEKTRONİK TEBLİGAT','GEREKÇELİ KARAR','İLAM',
            'HUKUK MAHKEMESİ KARARI','İSTİNAF BAŞVURU DİLEKÇESİ','İSTİNAF KARARI',
            'TEMYİZ BAŞVURU DİLEKÇESİ','YARGITAY KARARI','ANAYASA MAHKEMESİ KARARI','KESİNLEŞME ŞERHİ',
            'İCRA TAKİP DOSYASI','İCRA EMRİ','HACİZ TUTANAĞI','TAHSİLAT DEKONTU','ÖDEME DEKONTU / MAKBUZU',
            'ÖDEME BELGELERİ','DİĞER - HARİCİ BELGE','DİĞER ÖZEL BELGELER'
        ];
        $find = $db->prepare("SELECT id FROM tanimlamalar WHERE kategori='evrak_turu' AND deger=?");
        $upd  = $db->prepare("UPDATE tanimlamalar SET aktif=1, sira=? WHERE id=?");
        $ins  = $db->prepare("INSERT INTO tanimlamalar (kategori, deger, sira, aktif) VALUES ('evrak_turu', ?, ?, 1)");
        foreach ($excelList as $i => $deger) {
            $find->execute([$deger]);
            $row = $find->fetch();
            if ($row) $upd->execute([$i + 1, $row['id']]);
            else      $ins->execute([$deger, $i + 1]);
        }
    }
} catch (\Exception $e) {}

// Dosya istatistikleri
$stmt = $db->query('SELECT COUNT(*) as toplam FROM dosyalar');
$dosyaToplam = (int)$stmt->fetch()['toplam'];

$stmt = $db->query("SELECT COUNT(*) as c FROM dosyalar WHERE UPPER(asama) != 'DOSYA KAPANDI'");
$dosyaAcik = (int)$stmt->fetch()['c'];

$stmt = $db->query("SELECT dosya_turu, COUNT(*) as adet FROM dosyalar GROUP BY dosya_turu");
$dosyaTurDagilim = $stmt->fetchAll();

$stmt = $db->query("SELECT asama, COUNT(*) as adet FROM dosyalar GROUP BY asama ORDER BY adet DESC");
$asamaDagilim = $stmt->fetchAll();

// CRM istatistikleri
$stmt = $db->query('SELECT COUNT(*) as toplam FROM crm');
$crmToplam = (int)$stmt->fetch()['toplam'];

$stmt = $db->query("SELECT durum, COUNT(*) as adet FROM crm GROUP BY durum");
$crmDurumDagilim = $stmt->fetchAll();

// Mali istatistikler
$stmt = $db->query('SELECT SUM(bakiye) as toplam FROM kasalar WHERE aktif = 1');
$toplamBakiye = (float)$stmt->fetch()['toplam'];

$stmt = $db->prepare("SELECT COALESCE(SUM(tutar), 0) as toplam FROM masraflar WHERE islem_tarihi >= ?");
$stmt->execute([date('Y-m-01')]);
$aylikMasraf = (float)$stmt->fetch()['toplam'];

// Son aktiviteler
$stmt = $db->query("SELECT l.islem, l.detay, l.created_at, u.ad_soyad as kullanici_adi
    FROM log_kayitlari l
    LEFT JOIN users u ON u.id = l.kullanici_id
    ORDER BY l.id DESC LIMIT 10");
$sonAktiviteler = $stmt->fetchAll();

// Bu ay açılan dosyalar (eski sistem aktarımları hariç)
try { $db->exec("ALTER TABLE dosyalar ADD COLUMN IF NOT EXISTS eski_sistem TINYINT(1) DEFAULT 0"); } catch (\Exception $e) {}
$stmt = $db->prepare("SELECT COUNT(*) as c FROM dosyalar WHERE acilis_tarihi >= ? AND COALESCE(eski_sistem, 0) = 0");
$stmt->execute([date('Y-m-01')]);
$buAyDosya = (int)$stmt->fetch()['c'];

// Kullanıcı bazlı bildirim sayısı
$stmt = $db->prepare('SELECT COUNT(*) as c FROM bildirimler WHERE alici_id = ? AND okundu = 0');
$stmt->execute([$user['id']]);
$okunmamisBildirim = (int)$stmt->fetch()['c'];

// Kullanıcı görev sayısı
$stmt = $db->prepare('SELECT COUNT(*) as c FROM ajanda WHERE kullanici_id = ? AND tamamlandi = 0');
$stmt->execute([$user['id']]);
$bekleyenGorev = (int)$stmt->fetch()['c'];

json_success([
    'dosya' => [
        'toplam' => $dosyaToplam,
        'acik' => $dosyaAcik,
        'bu_ay' => $buAyDosya,
        'tur_dagilim' => $dosyaTurDagilim,
        'asama_dagilim' => $asamaDagilim
    ],
    'crm' => [
        'toplam' => $crmToplam,
        'durum_dagilim' => $crmDurumDagilim
    ],
    'mali' => [
        'toplam_bakiye' => $toplamBakiye,
        'aylik_masraf' => $aylikMasraf
    ],
    'kullanici' => [
        'okunmamis_bildirim' => $okunmamisBildirim,
        'bekleyen_gorev' => $bekleyenGorev
    ],
    'son_aktiviteler' => $sonAktiviteler
]);
