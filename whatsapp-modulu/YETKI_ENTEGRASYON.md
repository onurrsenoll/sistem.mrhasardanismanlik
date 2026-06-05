# Yetki Yönetimine Kamera + WhatsApp Eklendi

`js/pages/sistem.js` içindeki `MODUL_YETKILERI` dizisinin başına (yapı bozulmadan) eklendi:

```js
{modul: 'kamera', label: 'KAMERA İZLEME', icon: 'Camera', islemler: [
  {key: 'goruntule', label: 'KAMERALARI GÖRÜNTÜLE'}
]},
{modul: 'whatsapp', label: 'WHATSAPP', icon: 'MessageCircle', islemler: [
  {key: 'goruntule', label: 'WHATSAPP PANELİNİ GÖRÜNTÜLE'},
  {key: 'gonder', label: 'MESAJ / TOPLU GÖNDERİM'},
  {key: 'ayarlar', label: 'AYARLARI DÜZENLE'}
]},
```

Yetki tablosu anahtarları (me.php → user.yetkiler):
`kamera_goruntule`, `whatsapp_goruntule`, `whatsapp_gonder`, `whatsapp_ayarlar`.

Paneller (`kameralar.js`, `whatsapp.js`) `me.php`'den yetkiyi okur; buton sadece
`admin` veya ilgili `*_goruntule` izni olan kullanıcıya görünür. WhatsApp sekmeleri
de `whatsapp_gonder` / `whatsapp_ayarlar` iznine göre gösterilir.
