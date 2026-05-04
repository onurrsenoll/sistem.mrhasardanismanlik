<?php
/**
 * MR HASAR — v3.0 VALİDASYON YARDIMCILARI
 *
 * helpers.php'ye SONRADAN eklenecek fonksiyonlar.
 * Bu dosya başka bir helper.php'de require_once ile dahil edilebilir
 * veya içeriği helpers.php'nin sonuna eklenir.
 */

/* ═══════════ VALİDASYON FONKSİYONLARI ═══════════ */

if (!function_exists('mr_validate_tc')) {
    /**
     * Türkiye TC Kimlik No algoritması doğrulaması
     * 11 hane, ilk hane 0 değil, son hane parite kontrolü
     */
    function mr_validate_tc($tc) {
        $tc = preg_replace('/[^0-9]/', '', (string)$tc);
        if (strlen($tc) !== 11) return false;
        if ($tc[0] === '0') return false;
        // Algoritma
        $odd  = $tc[0] + $tc[2] + $tc[4] + $tc[6] + $tc[8];
        $even = $tc[1] + $tc[3] + $tc[5] + $tc[7];
        $sum  = ($odd * 7 - $even);
        if ($sum < 0) return false;
        if (($sum % 10) != $tc[9]) return false;
        $sum10 = $tc[0] + $tc[1] + $tc[2] + $tc[3] + $tc[4] + $tc[5] + $tc[6] + $tc[7] + $tc[8] + $tc[9];
        if (($sum10 % 10) != $tc[10]) return false;
        return true;
    }
}

if (!function_exists('mr_validate_plaka')) {
    /**
     * Türkiye plaka format kontrolü
     * Örnekler: 06ABC123, 34A1234, 35XY12
     */
    function mr_validate_plaka($plaka) {
        $plaka = preg_replace('/\s+/', '', strtoupper((string)$plaka));
        return preg_match('/^[0-9]{2}[A-Z]{1,3}[0-9]{2,4}$/', $plaka);
    }
}

if (!function_exists('mr_validate_iban')) {
    /**
     * Türkiye IBAN format kontrolü (TR + 24 hane = 26 karakter)
     */
    function mr_validate_iban($iban) {
        $iban = preg_replace('/\s+/', '', strtoupper((string)$iban));
        if (strlen($iban) !== 26) return false;
        if (substr($iban, 0, 2) !== 'TR') return false;
        if (!preg_match('/^TR[0-9]{24}$/', $iban)) return false;
        return true;
    }
}

if (!function_exists('mr_validate_email')) {
    /**
     * E-posta format kontrolü (PHP filter_var)
     */
    function mr_validate_email($email) {
        if (empty($email)) return true; // boş kabul (zorunlu değil)
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
}

if (!function_exists('mr_validate_kaza_tarihi')) {
    /**
     * Kaza tarihi gelecek tarihte olmamalı, makul bir geçmişte olmalı
     * - Maksimum bugün
     * - Minimum 50 yıl önce (1976 öncesi reddedilir)
     */
    function mr_validate_kaza_tarihi($tarih) {
        if (empty($tarih)) return ['ok' => true]; // boş kabul edilir
        $ts = strtotime($tarih);
        if ($ts === false) return ['ok' => false, 'mesaj' => 'Geçersiz tarih formatı'];
        if ($ts > time()) return ['ok' => false, 'mesaj' => 'Kaza tarihi gelecek olamaz'];
        if ($ts < strtotime('-50 years')) return ['ok' => false, 'mesaj' => 'Kaza tarihi 50 yıldan eski olamaz'];
        return ['ok' => true];
    }
}

if (!function_exists('mr_normalize_phone')) {
    /**
     * Telefon numarasını normalleştir
     * - Boşluk, parantez, tire kaldır
     * - "+90" başını kaldır
     * - 10 hane bekle
     */
    function mr_normalize_phone($phone) {
        if (empty($phone)) return '';
        $phone = preg_replace('/[^0-9+]/', '', (string)$phone);
        if (substr($phone, 0, 3) === '+90') $phone = substr($phone, 3);
        if (substr($phone, 0, 1) === '0' && strlen($phone) === 11) $phone = substr($phone, 1);
        return $phone;
    }
}

if (!function_exists('mr_validate_phone')) {
    /**
     * Telefon kontrol — 10 hane ve 5 ile başlayan mobil veya 2-9 sabit
     */
    function mr_validate_phone($phone) {
        $p = mr_normalize_phone($phone);
        if (empty($p)) return true; // boş kabul
        if (strlen($p) !== 10) return false;
        if ($p[0] === '0') return false;
        return true;
    }
}

if (!function_exists('mr_validate_komisyon')) {
    /**
     * Komisyon oranı 0-100 arasında olmalı
     */
    function mr_validate_komisyon($komisyon) {
        $k = (float)$komisyon;
        return $k >= 0 && $k <= 100;
    }
}

if (!function_exists('mr_get_asgari_ucret')) {
    /**
     * Bulunulan yılın asgari ücretini ayarlar tablosundan oku
     * Yoksa default değer döner (2026 için 22104.67)
     */
    function mr_get_asgari_ucret($yil = null) {
        if ($yil === null) $yil = date('Y');
        try {
            $db = getDB();
            $stmt = $db->prepare('SELECT deger FROM ayarlar WHERE anahtar = ? LIMIT 1');
            $stmt->execute(['asgari_ucret_' . $yil]);
            $row = $stmt->fetch();
            if ($row && !empty($row['deger'])) {
                return (float)$row['deger'];
            }
        } catch (\Exception $e) {}
        // Default 2026 NET asgari ücret
        if ((int)$yil === 2026) return 28075.50;
        if ((int)$yil === 2025) return 22104.67;
        return 28075.50; // güncel
    }
}

/**
 * Toplu validasyon yardımcısı
 * Body içindeki alanları validasyon kurallarına göre kontrol eder
 * Hata varsa hata mesajını döndürür, yoksa null döner
 *
 * Kullanım:
 *   $hata = mr_validate_dosya_body($body);
 *   if ($hata) json_error($hata, 422);
 */
if (!function_exists('mr_validate_dosya_body')) {
    function mr_validate_dosya_body($body, $strict = false) {
        // Mağdur TC
        if (!empty($body['tc_kimlik']) || !empty($body['magdur_tc_kimlik'])) {
            $tc = $body['magdur_tc_kimlik'] ?? $body['tc_kimlik'];
            if (!mr_validate_tc($tc)) {
                return 'Geçersiz TC Kimlik No (algoritma hatası)';
            }
        }

        // Mağdur araç plaka (ma_plaka veya plaka)
        if (!empty($body['ma_plaka'])) {
            if (!mr_validate_plaka($body['ma_plaka'])) {
                return 'Geçersiz mağdur araç plakası (örn: 06ABC123)';
            }
        }
        if (!empty($body['plaka'])) {
            if (!mr_validate_plaka($body['plaka'])) {
                return 'Geçersiz dosya plakası (örn: 06ABC123)';
            }
        }

        // Karşı araç plaka
        if (!empty($body['ka_plaka'])) {
            if (!mr_validate_plaka($body['ka_plaka'])) {
                return 'Geçersiz karşı araç plakası (örn: 06ABC123)';
            }
        }

        // Komisyon oranı
        if (isset($body['komisyon_orani']) || isset($body['komisyon'])) {
            $k = $body['komisyon_orani'] ?? $body['komisyon'];
            if (!mr_validate_komisyon($k)) {
                return 'Komisyon oranı 0-100 arasında olmalı';
            }
        }

        // Kaza tarihi
        if (!empty($body['kaza_tarihi'])) {
            $kt = mr_validate_kaza_tarihi($body['kaza_tarihi']);
            if (!$kt['ok']) {
                return $kt['mesaj'];
            }
        }

        // IBAN
        if (!empty($body['iban']) || !empty($body['magdur_iban'])) {
            $iban = $body['magdur_iban'] ?? $body['iban'];
            if (!mr_validate_iban($iban)) {
                return 'Geçersiz IBAN (TR + 24 hane olmalı)';
            }
        }

        // Telefon
        $telefonlar = [
            'telefon' => $body['telefon'] ?? null,
            'magdur_telefon' => $body['magdur_telefon'] ?? null
        ];
        foreach ($telefonlar as $key => $val) {
            if (!empty($val) && !mr_validate_phone($val)) {
                return 'Geçersiz telefon numarası: ' . $key;
            }
        }

        return null; // hata yok
    }
}
