# MR HASAR — v2.1.3 MESAJLAR ROUTING DÜZELTME
**Tarih:** 2026-04-29
**Risk:** Çok düşük (1 dosya, sadece JS, DB/auth/PHP yok)
**Çalışma süresi:** 3 dakika

---

## SORUN

Sistem Bildirimleri sayfasına girildiğinde 4 sekme görünüyordu:
- GELEN KUTUSU
- GİDEN KUTUSU
- YENİ MESAJ
- SİSTEM BİLDİRİMLERİ

**SİSTEM BİLDİRİMLERİ** sekmesi çalışıyordu ama diğer 3 sekmeye tıklandığında **sayfa boş geliyordu**.

## KÖK SEBEP

`app.js` içindeki `PageRouter` sadece `page === 'mesajlar-sistem'` rotasını yakalıyordu. Sayfa içindeki sekmeler `setPage('mesajlar-gelen')`, `setPage('mesajlar-giden')`, `setPage('mesajlar-yeni')` çağrılarını yapıyordu ama router bu rotaları bilmediği için sayfa boş düşüyordu.

## ÇÖZÜM

Router'a tüm `mesajlar` alt rotalarını yakalayacak şekilde:
```js
if (page.startsWith('mesajlar')) {
  let sub = page === 'mesajlar' ? 'gelen' : page.replace('mesajlar-', '');
  if (!['gelen', 'giden', 'yeni', 'sistem'].includes(sub)) sub = 'gelen';
  return <MR.MesajlarPage subPage={sub} ... />;
}
```

Ayrıca breadcrumb da güncellendi — "MESAJLAR > GELEN KUTUSU" gibi yol gösterimi.

---

## DEĞİŞEN

Tek dosya: `js/app.js` (router + breadcrumb)

DOKUNULMAYAN: Mesajlar sayfasının kendi kodu (`mesajlar.js`), API endpoint'leri, hiçbir veri.

---

## YÜKLEME (3 dakika)

1. cPanel → Dosya Yöneticisi → `/home/mrhasard/sistem.mrhasardanismanlik.com/`
2. **"Yükle"** → `mr_hasar_yama_v2.1.3_mesajlar_routing_2026-04-29.zip` (19 KB)
3. ZIP'e sağ tık → **"Çıkart"** → **"Mevcut dosyaların üzerine yaz"** işaretli
4. ZIP'i sil
5. Tarayıcıda **Ctrl+F5** ile sert yenileme

**Üzerine yazılan tek dosya:** `js/app.js`

---

## TEST

1. Sistem menüsünden "Sistem Bildirimleri" tıkla → açıldı, sistem sekmesi aktif
2. **"GELEN KUTUSU"** sekmesine tıkla → açılmalı (boş veya mesaj listesi)
3. **"GİDEN KUTUSU"** sekmesine tıkla → açılmalı
4. **"YENİ MESAJ"** sekmesine tıkla → mesaj gönderme formu açılmalı
5. **"SİSTEM BİLDİRİMLERİ"** sekmesine geri tıkla → çalışmaya devam etmeli
6. Breadcrumb'ta "MESAJLAR > GELEN KUTUSU" gibi yol görünmeli

---

## ROLLBACK

Yedeğindeki orijinal `js/app.js` dosyasını geri yükle. Başka hiçbir şey etkilenmedi.

---

## SIRALAMA

| Yama | Durum |
|---|---|
| v2.1.1 (çağrı widget + ses) | ✓ Yüklü |
| v2.1.2 (bildirim aktivasyon) | ✓ Yüklü |
| **v2.1.3 (mesajlar routing) — BU** | ⏸ Yüklenecek |
| v2.1 (güvenlik paketi) | ⏸ Mesai sonrası |

Hepsi bağımsız, çakışmaz.
