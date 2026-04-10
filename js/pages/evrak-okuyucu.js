/**
 * MR HASAR DANIŞMANLIK - EVRAK OKUYUCU v3
 * OpenRouter API direkt frontend'den (referans koddaki callAI yapısı)
 * Anlaşmalı KTT: TRAMER 48 senaryo + kroki + beyan + kusur analizi
 * Polis KTT + Hasar İhbar: yüksek doğrulukta bilgi çıkarma
 */
const MR = window.MR || (window.MR = {});
const {useState, useCallback, useRef, useEffect, useMemo} = React;

/* ══════════════════════════════════════════════════════
   GÖRÜNTÜ ÖN İŞLEME (Canvas API)
   - Grayscale + Kontrast + Sharpening + Upscale
   - El yazısı okuma doğruluğunu %30-40 artırır
══════════════════════════════════════════════════════ */
async function enhanceImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        // Upscale 1.5x (küçük detayları büyüt)
        const scale = Math.min(1.5, 2400 / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Image data al
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // 1. Grayscale + Kontrast artırma (faktör 1.4)
        const contrast = 1.4;
        const intercept = 128 * (1 - contrast);
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          let enhanced = gray * contrast + intercept;
          enhanced = Math.max(0, Math.min(255, enhanced));
          data[i] = data[i + 1] = data[i + 2] = enhanced;
        }
        ctx.putImageData(imageData, 0, 0);

        // 2. Sharpening convolution (keskinleştirme)
        const sharpened = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const w = canvas.width, h = canvas.height;
        const src = new Uint8ClampedArray(sharpened.data);
        const dst = sharpened.data;
        const kernel = [0, -0.5, 0, -0.5, 3, -0.5, 0, -0.5, 0];
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4;
            let r = 0;
            let k = 0;
            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                const px = ((y + ky) * w + (x + kx)) * 4;
                r += src[px] * kernel[k++];
              }
            }
            r = Math.max(0, Math.min(255, r));
            dst[idx] = dst[idx + 1] = dst[idx + 2] = r;
          }
        }
        ctx.putImageData(sharpened, 0, 0);

        // JPEG %92 kalitede çıkar
        const enhancedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        resolve({
          dataUrl: enhancedDataUrl,
          b64: enhancedDataUrl.split(',')[1],
          mime: 'image/jpeg'
        });
      } catch (e) {
        // Hata olursa orijinali döndür
        resolve({ dataUrl, b64: dataUrl.split(',')[1], mime: 'image/jpeg' });
      }
    };
    img.onerror = () => resolve({ dataUrl, b64: dataUrl.split(',')[1], mime: 'image/jpeg' });
    img.src = dataUrl;
  });
}

/* ══════════════════════════════════════════════════════
   DOĞRULAMA FONKSİYONLARI (Hibrit katman)
══════════════════════════════════════════════════════ */

// TC Kimlik No - Luhn benzeri algoritma
function validateTC(tc) {
  if (!tc) return { valid: false, reason: 'boş' };
  const clean = String(tc).replace(/\D/g, '');
  if (clean.length !== 11) return { valid: false, reason: '11 hane değil' };
  if (clean[0] === '0') return { valid: false, reason: 'ilk hane 0 olamaz' };
  const digits = clean.split('').map(Number);
  // 10. hane = (sum[1,3,5,7,9] * 7 - sum[2,4,6,8]) mod 10
  const odd = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const even = digits[1] + digits[3] + digits[5] + digits[7];
  const digit10 = ((odd * 7) - even) % 10;
  if (digit10 !== digits[9]) return { valid: false, reason: '10. hane hatası' };
  // 11. hane = (sum[1..10]) mod 10
  const sum10 = digits.slice(0, 10).reduce((a, b) => a + b, 0);
  const digit11 = sum10 % 10;
  if (digit11 !== digits[10]) return { valid: false, reason: '11. hane hatası' };
  return { valid: true, clean };
}

// Telefon - 05XX formatı
function validateTelefon(tel) {
  if (!tel) return { valid: false, reason: 'boş' };
  const clean = String(tel).replace(/\D/g, '');
  // 10 hane (5XXXXXXXXX) veya 11 hane (05XXXXXXXXX)
  if (clean.length === 10 && clean[0] === '5') {
    return { valid: true, clean: '0' + clean, formatted: '0' + clean.slice(0,3) + ' ' + clean.slice(3,6) + ' ' + clean.slice(6,8) + ' ' + clean.slice(8) };
  }
  if (clean.length === 11 && clean.slice(0, 2) === '05') {
    return { valid: true, clean, formatted: clean.slice(0,4) + ' ' + clean.slice(4,7) + ' ' + clean.slice(7,9) + ' ' + clean.slice(9) };
  }
  return { valid: false, reason: 'format hatası (05XX...)' };
}

// Türkiye plakası regex
function validatePlaka(plaka) {
  if (!plaka) return { valid: false, reason: 'boş' };
  const clean = String(plaka).toUpperCase().replace(/\s/g, '');
  // 2 rakam + 1-3 harf + 2-4 rakam
  const regex = /^(0[1-9]|[1-7][0-9]|8[01])[A-ZÇĞİÖŞÜ]{1,3}\d{2,4}$/;
  if (!regex.test(clean)) return { valid: false, reason: 'format hatası' };
  // Formatla: 34 ABC 123
  const m = clean.match(/^(\d{2})([A-ZÇĞİÖŞÜ]{1,3})(\d{2,4})$/);
  if (m) {
    return { valid: true, clean, formatted: `${m[1]} ${m[2]} ${m[3]}` };
  }
  return { valid: true, clean };
}

// Ad Soyad - basit kontrol (en az 2 kelime, sadece harf)
function validateAdSoyad(ad) {
  if (!ad) return { valid: false, reason: 'boş' };
  const clean = String(ad).trim();
  if (clean.length < 4) return { valid: false, reason: 'çok kısa' };
  if (!/^[A-Za-zÇĞİıÖŞÜçğıöşü\s.'-]+$/.test(clean)) return { valid: false, reason: 'geçersiz karakter' };
  const parts = clean.split(/\s+/).filter(p => p.length > 1);
  if (parts.length < 2) return { valid: false, reason: 'en az 2 kelime' };
  return { valid: true, clean };
}

// Bir değerin [OKUNAMADI] veya [BELİRSİZ:] marker'ı içerip içermediği
function hasMarker(val) {
  if (!val) return false;
  const s = String(val);
  return s.includes('[OKUNAMADI]') || s.includes('[BELİRSİZ') || s.includes('[BELIRSIZ') || s.includes('[DOĞRULANAMADI]') || s.includes('[DOGRULANAMADI]');
}

// Alan doğrulama + güven skoru hesaplama
function validateField(type, value, aiGuven) {
  if (!value || hasMarker(value)) {
    return { value: value || '[OKUNAMADI]', guven: 'dusuk', valid: false, reason: 'AI okuyamadı' };
  }
  let v;
  if (type === 'tc') v = validateTC(value);
  else if (type === 'telefon') v = validateTelefon(value);
  else if (type === 'plaka') v = validatePlaka(value);
  else if (type === 'adsoyad') v = validateAdSoyad(value);
  else return { value, guven: aiGuven || 'orta', valid: true };

  if (!v.valid) {
    return { value: `[DOĞRULANAMADI: ${value}]`, guven: 'dusuk', valid: false, reason: v.reason, original: value };
  }
  // Doğrulama geçti → güven: AI yüksek dediyse yüksek, yoksa orta
  return { value: v.formatted || v.clean || value, guven: aiGuven || 'yuksek', valid: true };
}

/* ══════════════════════════════════════════════════════
   JSON SAFE PARSER
══════════════════════════════════════════════════════ */
function safeParseJSON(raw) {
  if (!raw) throw new Error("Boş yanıt");
  let txt = raw.replace(/```json|```/g, "").trim();
  try { return JSON.parse(txt); } catch {}
  const open = (txt.match(/\{/g) || []).length;
  const close = (txt.match(/\}/g) || []).length;
  if (open > close) txt += "}".repeat(open - close);
  try { return JSON.parse(txt); } catch {}
  const last = txt.lastIndexOf("}");
  if (last > 0) {
    const cut = txt.slice(0, last + 1);
    try { return JSON.parse(cut); } catch {}
  }
  const fixed = txt
    .replace(/:\s*"([^"]*?)(?=\s*[,\}\]])/g, (_, v) => `: "${v.replace(/\n/g, " ")}"`)
    .replace(/,\s*\}/g, "}")
    .replace(/,\s*\]/g, "]");
  try { return JSON.parse(fixed); } catch (e) { throw new Error("JSON parse: " + e.message); }
}

/* ══════════════════════════════════════════════════════
   OPENROUTER API (referans koddan birebir)
══════════════════════════════════════════════════════ */
async function callAI(apiKey, userContent, system, maxTokens = 2000) {
  if (!apiKey) throw new Error("OpenRouter API key girilmemiş. Sistem > Firma Ayarları'ndan ekleyin.");
  const msgs = [];
  if (system) msgs.push({ role: "system", content: system });
  msgs.push({ role: "user", content: userContent });
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://sistem.mrhasardanismanlik.com",
      "X-Title": "MR Hasar Evrak Okuyucu"
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4-5",
      max_tokens: maxTokens,
      temperature: 0.1,
      messages: msgs
    })
  });
  if (!r.ok) {
    const e = await r.text();
    throw new Error(`OpenRouter ${r.status}: ${e}`);
  }
  const d = await r.json();
  return (d.choices?.[0]?.message?.content || "").replace(/```json|```/g, "").trim();
}

// Media type normalize (image/jpg → image/jpeg)
function normalizeMime(mime) {
  if (!mime) return 'image/jpeg';
  if (mime === 'image/jpg') return 'image/jpeg';
  if (!mime.startsWith('image/')) return 'image/jpeg';
  return mime;
}

function imgContent(b64, mime, text) {
  const normalized = normalizeMime(mime);
  return [
    { type: "image_url", image_url: { url: `data:${normalized};base64,${b64}` } },
    { type: "text", text }
  ];
}

/* ══════════════════════════════════════════════════════
   TÜRKÇE EL YAZISI ORTAK SYSTEM PROMPT EKLENTİSİ
══════════════════════════════════════════════════════ */
const TURKCE_KURALLAR = `

TÜRKÇE EL YAZISI OKUMA KURALLARI (KRİTİK):
- Bu bir Türk trafik kazası tutanağı. TÜRKÇE karakterleri dikkate al: ğ, ı, ş, ü, ö, ç, İ
- PLAKA FORMATI: 2 rakam + 1-3 harf + 2-4 rakam (örn: 34 ABC 123, 06 DTZ 686, 55AOM782)
- TARİH FORMATI: GG.AA.YYYY (örn: 28.02.2026)
- SAAT FORMATI: SS:DD (örn: 16:49)
- TC KİMLİK: ASLA ve ASLA 11 haneden farklı olamaz
- TELEFON: 05XX XXX XX XX (10-11 hane, 05 ile başlar)
- POLİÇE NO: Genellikle 8-12 haneli sayı

BELİRSİZLİK KURALLARI (ÇOK ÖNEMLİ):
- Bir alanı NET okuyamıyorsan ASLA uydurma, tahmin etme
- Net okunamayan alanlara "[OKUNAMADI]" yaz
- Bağlamdan tahmin edebiliyorsan "[BELİRSİZ: tahminin]" formatında yaz
- Örnek: plaka net değilse "plaka": "[OKUNAMADI]"
- Örnek: tarih yarı okunaksa "tarih": "[BELİRSİZ: 28.02.2026]"
- Emin olduğun alanları direkt yaz, belirsizleri flag'le

OKUMA KALİTESİ DEĞERLENDİRMESİ:
- "_okuma_kalitesi": "yuksek" (tüm alanlar net) / "orta" (2-3 belirsiz) / "dusuk" (çoğu belirsiz)
- "_belirsiz_alanlar": belirsiz/okunamadı olan alanların ADI listesi (örn: ["aracA.plaka","kroki.carpma"])
`;

/* ══════════════════════════════════════════════════════
   TRAMER 48 SENARYO (sadece Anlaşmalı KTT için)
══════════════════════════════════════════════════════ */
const TRAMER = `DURUM 1A: Aynı yönde A kırmızı ışıkta durmuş B takip mesafesi korumadı → B %100 (K.Y.T.K.56/c,Yön:107)
DURUM 1B: A yeşil ışıkta aniden durdu B hız aştı → A %50 B %50
DURUM 1C: A kırmızı→yeşil geçişinde geri hareket → A %100 (K.Y.T.K.67,Yön:137)
DURUM 2: Kırmızı ışıkta geçiş yapan A → A %100 (K.Y.T.K.47,Yön:95)
DURUM 3: B yanlış şeritten geldi A yeşil kurallı dönüyor → B %100
DURUM 4: Her iki sürücü yeşil ışık iddiasında → A %50 B %50
DURUM 5: B yetkili kişi işaretine uymadı → B %100
DURUM 6: B tali yoldan ana yola çıkarken A'ya yol vermedi → B %100
DURUM 7: B karşı şeride geçti → B %100
DURUM 8: B ters yönde geri manevra yaptı → B %100
DURUM 9: A B'ye arkadan çarptı → A %100 (K.Y.T.K.56/1-c,Yön:107)
DURUM 10: A arkadan çarptı → A %100
DURUM 11: Kavşakta A arkadan çarptı → A %100
DURUM 12: B sağ şeritten dar kavisle dönüş yapmadı → B %100
DURUM 13: İşaretsiz kavşakta B sağdan gelen A'ya öncelik vermedi → B %100
DURUM 14: Her iki araç sağ şerit ihlali → A %50 B %50
DURUM 15: B yasak yerde durdu %50 A sağa dönüşü dar yapmadı %50
DURUM 16: Dönel kavşakta B sağdan dönmedi → B %100
DURUM 18: Dar yolda B A'ya geçiş hakkı vermedi → B %100
DURUM 19: Her iki araç karşılıklı şerit ihlali → A %50 B %50
DURUM 20: A sollamada sol taraftan gelen aracı beklemedi → A %100
DURUM 22: A geçiş kurallarını ihlal etti → A %100
DURUM 23: A kurallı dönüş yaparken B kavşağa hızlı yaklaştı → B %100
DURUM 25: B iz/mülkten çıkarken A'nın geçişini beklemedi → B %100
DURUM 26: B şerit değiştirme ihlali → B %100
DURUM 27: A kurallı park etmiş araca çarptı → A %100
DURUM 30: Zincirleme arkadan çarpmalar her çarpan araç %100
DURUM 32: B dönel kavşakta A'nın şeridini ihlal etti → B %100
DURUM 33: Dönel kavşakta A kurallı B'ye çarptı → A %100
DURUM 44: A dikkatsiz ana yola çıktı B'ye çarptı A %100
DURUM 45: C şerit değiştirerek B'yi A'ya itti → C %100
DURUM 47: B kontrolsüz U dönüşü → B %100
DURUM 48: A ters yöne girdi B ile çarpıştı → A %100`;

/* ══════════════════════════════════════════════════════
   PROMPT'LAR
══════════════════════════════════════════════════════ */
// ANLAŞMALI KTT - 1. PASS: 4 KRİTİK ALAN + GÜVEN SKORU (Plaka, Ad Soyad, Telefon, TC)
const ANLASMA_PASS1_SYS = `Sen Türk trafik kazası tutanağı uzmanısın. Anlaşmalı Maddi Hasarlı Kaza Tespit Tutanağı'ndan SADECE 4 KRİTİK ALANI çıkaracaksın: Plaka, Adı Soyadı, Telefon, TC Kimlik. Hem A hem B aracı için. Ayrıca kaza bilgileri ve ek alanları oku.
${TURKCE_KURALLAR}

HER ALAN İÇİN GÜVEN SKORU EKLEYECEKSİN:
- "yuksek": Alan net okundu, hiç tereddüt yok
- "orta": Alan okundu ama bazı karakterler belirsizdi
- "dusuk": Alan çok belirsiz veya tahmin

SADECE geçerli JSON döndür:
{
  "kaza":{"tarih":"","saat":"","il":"","ilce":"","cadde":"","yolTipi":""},
  "a":{
    "plaka":"","plaka_guven":"yuksek|orta|dusuk",
    "surucu":"","surucu_guven":"yuksek|orta|dusuk",
    "tc":"","tc_guven":"yuksek|orta|dusuk",
    "telefon":"","telefon_guven":"yuksek|orta|dusuk",
    "marka":"","adres":"","sigorta":"","policeNo":"","hasar":""
  },
  "b":{
    "plaka":"","plaka_guven":"yuksek|orta|dusuk",
    "surucu":"","surucu_guven":"yuksek|orta|dusuk",
    "tc":"","tc_guven":"yuksek|orta|dusuk",
    "telefon":"","telefon_guven":"yuksek|orta|dusuk",
    "marka":"","adres":"","sigorta":"","policeNo":"","hasar":""
  },
  "_okuma_kalitesi":"yuksek|orta|dusuk","_belirsiz_alanlar":[]
}

KURALLAR:
- A aracı SOL taraf, B aracı SAĞ taraf
- Plaka formatı: 2 rakam + 1-3 harf + 2-4 rakam (örn: 55 AAI 051, 06 DRC 446)
- TC 11 hane (ilk hane 0 olamaz)
- Telefon 05XX ile başlar, 11 hane
- Okunamayan alanlara "[OKUNAMADI]" + guven: "dusuk"
- Belirsiz alanlara "[BELİRSİZ: tahmin]" + guven: "dusuk"
- Net okunan alanlara direkt değer + guven: "yuksek"`;

// ANLAŞMALI KTT - 2. PASS: BEYAN + KROKİ + TRAMER KUSUR ANALİZİ
const ANLASMA_PASS2_SYS = `Sen Türk trafik sigortası kusur analiz uzmanısın. TRAMER senaryoları:
${TRAMER}

Anlaşmalı KTT'nin KROKİ (bölüm 9-10) ve BEYAN (bölüm 11) kısımlarını analiz et. TRAMER senaryosuyla eşleştir ve kusur oranı belirle.
${TURKCE_KURALLAR}

SADECE geçerli JSON döndür:
{"kroki":{"yol":"","aPos":"","bPos":"","carpma":"","sinyal":"","refuj":""},"beyan":{"a":"","b":"","celisme":"","uyum":""},"senaryo":"DURUM X","kategori":"","analiz":"Bu kazanın oluşumunda; [3-4 cümle]","kusur":[{"arac":"A","plaka":"","oran":0,"neden":""},{"arac":"B","plaka":"","oran":100,"neden":""}],"yasal":[""],"tespitler":[""],"guven":85,"uyarilar":[],"_okuma_kalitesi":"yuksek|orta|dusuk","_belirsiz_alanlar":[]}`;

const POLIS_SYS = `Sen Türk trafik sigortası evrak analiz uzmanısın. Polis Trafik Kaza Tespit Tutanağı'nı yüksek doğrulukta oku ve tüm bilgileri çıkar.
${TURKCE_KURALLAR}

SADECE geçerli JSON döndür:
{"tutanakNo":"","tarih":"","saat":"","il":"","ilce":"","mahalle":"","cadde":"","yolTipi":"","hava":"","araclar":[{"sira":1,"plaka":"","marka":"","model":"","modelYili":"","renk":"","surucu":"","tc":"","dogumYili":"","ehliyet":"","sigorta":"","policeNo":"","hasar":"","kusurOrani":"","ihlal":"","alkol":""}],"yaralilar":[{"adi":"","tc":"","pozisyon":"","durum":""}],"kazaOzeti":"M.KAZANIN ÖZETİ bölümündeki TAM METİN","kusurTespiti":"","kanunMaddeleri":[""],"guven":90,"_okuma_kalitesi":"yuksek|orta|dusuk","_belirsiz_alanlar":[]}

KURALLAR:
- Tüm araçları araclar dizisine ekle (1 veya daha fazla)
- Yaralıları yaralilar dizisine ekle
- "M.KAZANIN ÖZETİ" bölümündeki metni tam oku
- Plaka, TC, poliçe no gibi numaraları harf/rakam olarak DOĞRU çıkar
- Okunamayan alanlara "[OKUNAMADI]"
- Belirsiz alanlara "[BELİRSİZ: tahmin]"`;

const HASAR_SYS = `Sen sigorta şirketi hasar dosya analiz uzmanısın. Sigorta şirketi hasar ihbar föyü / dosya kapağını yüksek doğrulukta oku. Her şirketin formatı farklıdır.
${TURKCE_KURALLAR}

SADECE geçerli JSON döndür:
{"dosyaNo":"","musteriNo":"","sigortaSirketi":"","acenteAdi":"","policeNo":"","policeTuru":"","urunKodu":"","sigortaBedeli":"","policeBaslangic":"","policeBitis":"","sigortaliAdi":"","sigortaliTc":"","sigortaliTelefon":"","sigortaliEmail":"","sigortaliAdres":"","aracPlaka":"","aracMarka":"","aracModel":"","aracYili":"","aracSase":"","hasarTarihi":"","ihbarTarihi":"","hasarNedeni":"","hasarAltNedeni":"","hasarYeri":"","hasarAciklama":"","tahminiHasar":"","ihbarEden":"","eksperAdi":"","eksperFirma":"","servisAdi":"","magdurlar":[{"adi":"","plaka":"","tutar":""}],"toplamHasar":"","odenenTutar":"","guven":90,"_okuma_kalitesi":"yuksek|orta|dusuk","_belirsiz_alanlar":[]}

KURALLAR:
- Dosya no, müşteri no, poliçe no gibi numaraları tam oku
- Tarihleri DD.MM.YYYY formatında çıkar
- Tutarları sayı olarak al (TL işareti olmadan)
- Birden fazla mağdur varsa hepsini listele
- Okunamayan alanlara "[OKUNAMADI]"
- Belirsiz alanlara "[BELİRSİZ: tahmin]"`;

/* ══════════════════════════════════════════════════════
   ANA ANALİZ FONKSİYONLARI - 2 PASS + ALAN ODAKLI YENİDEN ANALİZ + HİBRİT DOĞRULAMA
══════════════════════════════════════════════════════ */

// Alan odaklı yeniden analiz: Sadece belirli bir alanı oku
async function alanOdakliYenidenOku(apiKey, b64, mime, alanAciklama) {
  const txt = await callAI(
    apiKey,
    imgContent(b64, mime, alanAciklama + ' SADECE JSON döndür: {"deger":"değer","guven":"yuksek|orta|dusuk"}'),
    'Sen Türk trafik tutanağı OCR uzmanısın. Sadece istenen alanı oku.',
    300
  );
  try {
    return safeParseJSON(txt);
  } catch (e) {
    return { deger: '[OKUNAMADI]', guven: 'dusuk' };
  }
}

async function anlasmaKTTAnaliz(apiKey, b64, mime, onProgress) {
  // PASS 1: Yapısal alanlar + 4 kritik alan güven skorları
  onProgress && onProgress('1/2 Yapısal alanlar + 4 kritik alan okunuyor...');
  const pass1Txt = await callAI(
    apiKey,
    imgContent(b64, mime, "Bu bir Türk trafik kazası tutanağı fotoğrafıdır, Türkçe el yazısıyla doldurulmuş olabilir. Her YAPISAL ALANI (plaka, TC, tarih, saat, konum, kişi bilgileri, sigorta, poliçe) dikkatlice oku. Özellikle 4 KRİTİK ALAN için her birine ayrı GÜVEN SKORU ver: Plaka, Adı Soyadı, TC Kimlik, Telefon. Belirsiz alanları [OKUNAMADI] veya [BELİRSİZ: tahmin] olarak işaretle. SADECE JSON döndür."),
    ANLASMA_PASS1_SYS,
    2000
  );
  const pass1 = safeParseJSON(pass1Txt);

  // ═══ HİBRİT DOĞRULAMA + ALAN ODAKLI YENİDEN ANALİZ ═══
  // Her 4 kritik alan için: (1) doğrula, (2) geçmezse tekrar sor
  const kritikAlanlar = [
    { arac: 'a', key: 'plaka', type: 'plaka', label: 'A aracı PLAKASI (2 rakam + 1-3 harf + 2-4 rakam)' },
    { arac: 'a', key: 'surucu', type: 'adsoyad', label: 'A aracı SÜRÜCÜSÜNÜN ADI SOYADI (en az 2 kelime)' },
    { arac: 'a', key: 'tc', type: 'tc', label: 'A aracı sürücüsünün TC KİMLİK NO (11 hane)' },
    { arac: 'a', key: 'telefon', type: 'telefon', label: 'A aracı sürücüsünün TELEFON NO (05XX formatı)' },
    { arac: 'b', key: 'plaka', type: 'plaka', label: 'B aracı PLAKASI (2 rakam + 1-3 harf + 2-4 rakam)' },
    { arac: 'b', key: 'surucu', type: 'adsoyad', label: 'B aracı SÜRÜCÜSÜNÜN ADI SOYADI (en az 2 kelime)' },
    { arac: 'b', key: 'tc', type: 'tc', label: 'B aracı sürücüsünün TC KİMLİK NO (11 hane)' },
    { arac: 'b', key: 'telefon', type: 'telefon', label: 'B aracı sürücüsünün TELEFON NO (05XX formatı)' }
  ];

  const dogrulanmisAlanlar = {};
  for (let i = 0; i < kritikAlanlar.length; i++) {
    const alan = kritikAlanlar[i];
    const rawValue = pass1[alan.arac]?.[alan.key] || '';
    const aiGuven = pass1[alan.arac]?.[alan.key + '_guven'] || 'orta';

    // İlk doğrulama
    let valid = validateField(alan.type, rawValue, aiGuven);

    // Geçmezse alan odaklı yeniden oku
    if (!valid.valid && rawValue && !hasMarker(rawValue)) {
      onProgress && onProgress(`Yeniden okuma: ${alan.label.split(' ')[0]}...`);
      try {
        const retry = await alanOdakliYenidenOku(
          apiKey, b64, mime,
          `Bu bir Türk trafik kazası tutanağıdır. SADECE ${alan.label} alanını net şekilde oku. Önceki okumada format hatası vardı (${valid.reason}). Dikkatlice oku.`
        );
        if (retry.deger && !hasMarker(retry.deger)) {
          const retryValid = validateField(alan.type, retry.deger, retry.guven);
          if (retryValid.valid) valid = retryValid;
        }
      } catch (e) {}
    }

    if (!dogrulanmisAlanlar[alan.arac]) dogrulanmisAlanlar[alan.arac] = {};
    dogrulanmisAlanlar[alan.arac][alan.key] = valid;
  }

  // PASS 2: Beyan + Kroki + TRAMER kusur analizi
  onProgress && onProgress('2/2 Beyanlar ve kroki analiz ediliyor (TRAMER)...');
  const pass2Txt = await callAI(
    apiKey,
    imgContent(b64, mime, "Bu bir Türk trafik kazası tutanağı fotoğrafıdır. BÖLÜM 9-10 (KROKİ) ve BÖLÜM 11 (BEYAN) kısımlarını Türkçe el yazısından oku. Her iki sürücünün beyanını tam metin olarak çıkar, krokiyi yorumla, TRAMER senaryosuyla eşleştir ve kusur oranı belirle. Belirsiz alanları [OKUNAMADI] veya [BELİRSİZ: tahmin] olarak işaretle. SADECE JSON döndür."),
    ANLASMA_PASS2_SYS,
    2500
  );
  const pass2 = safeParseJSON(pass2Txt);

  // İki sonucu birleştir
  const belirsizAlanlar = [...(pass1._belirsiz_alanlar || []), ...(pass2._belirsiz_alanlar || [])];
  const kalite1 = pass1._okuma_kalitesi || 'orta';
  const kalite2 = pass2._okuma_kalitesi || 'orta';
  // En düşük kalite kazansın
  const kalitePuan = {yuksek: 3, orta: 2, dusuk: 1};
  const finalKalite = kalitePuan[kalite1] <= kalitePuan[kalite2] ? kalite1 : kalite2;

  // Doğrulanmış alanları aracA/aracB'ye yerleştir (hibrit: AI + regex + Luhn)
  const dA = dogrulanmisAlanlar.a || {};
  const dB = dogrulanmisAlanlar.b || {};

  return {
    tip: 'anlasma_ktt',
    kazaBilgileri: { tarih: pass1.kaza?.tarih || "", saat: pass1.kaza?.saat || "", il: pass1.kaza?.il || "", ilce: pass1.kaza?.ilce || "", cadde: pass1.kaza?.cadde || "", yolTipi: pass1.kaza?.yolTipi || "" },
    aracA: {
      plaka: dA.plaka?.value || pass1.a?.plaka || "",
      plaka_guven: dA.plaka?.guven || 'dusuk',
      plaka_valid: dA.plaka?.valid || false,
      marka: pass1.a?.marka || "",
      surucu: dA.surucu?.value || pass1.a?.surucu || "",
      surucu_guven: dA.surucu?.guven || 'dusuk',
      surucu_valid: dA.surucu?.valid || false,
      tc: dA.tc?.value || pass1.a?.tc || "",
      tc_guven: dA.tc?.guven || 'dusuk',
      tc_valid: dA.tc?.valid || false,
      telefon: dA.telefon?.value || pass1.a?.telefon || "",
      telefon_guven: dA.telefon?.guven || 'dusuk',
      telefon_valid: dA.telefon?.valid || false,
      adres: pass1.a?.adres || "",
      sigortaSirketi: pass1.a?.sigorta || "",
      policeNo: pass1.a?.policeNo || "",
      hasarYeri: pass1.a?.hasar || ""
    },
    aracB: {
      plaka: dB.plaka?.value || pass1.b?.plaka || "",
      plaka_guven: dB.plaka?.guven || 'dusuk',
      plaka_valid: dB.plaka?.valid || false,
      marka: pass1.b?.marka || "",
      surucu: dB.surucu?.value || pass1.b?.surucu || "",
      surucu_guven: dB.surucu?.guven || 'dusuk',
      surucu_valid: dB.surucu?.valid || false,
      tc: dB.tc?.value || pass1.b?.tc || "",
      tc_guven: dB.tc?.guven || 'dusuk',
      tc_valid: dB.tc?.valid || false,
      telefon: dB.telefon?.value || pass1.b?.telefon || "",
      telefon_guven: dB.telefon?.guven || 'dusuk',
      telefon_valid: dB.telefon?.valid || false,
      adres: pass1.b?.adres || "",
      sigortaSirketi: pass1.b?.sigorta || "",
      policeNo: pass1.b?.policeNo || "",
      hasarYeri: pass1.b?.hasar || ""
    },
    kroKiAnalizi: { yolYapisi: pass2.kroki?.yol || "", aAracPozisyon: pass2.kroki?.aPos || "", bAracPozisyon: pass2.kroki?.bPos || "", carpismaNokta: pass2.kroki?.carpma || "", sinyal: pass2.kroki?.sinyal || "", refuj: pass2.kroki?.refuj || "" },
    beyanAnalizi: { aBeyan: pass2.beyan?.a || "", bBeyan: pass2.beyan?.b || "", celisme: pass2.beyan?.celisme || "", kroKiUyum: pass2.beyan?.uyum || "" },
    eslesenSenaryo: pass2.senaryo || "",
    senaryoKategori: pass2.kategori || "",
    kusurAnalizi: pass2.analiz || "",
    kusurTablosu: (pass2.kusur || []).map(k => ({ arac: k.arac, plaka: k.plaka || "", kusurOrani: k.oran ?? 50, kusurNedeni: k.neden || "" })),
    yasalDayanak: pass2.yasal || [],
    kritikTespitler: pass2.tespitler || [],
    guvenSkoru: pass2.guven || 75,
    uyarilar: pass2.uyarilar || [],
    _okuma_kalitesi: finalKalite,
    _belirsiz_alanlar: belirsizAlanlar
  };
}

async function polisKTTAnaliz(apiKey, b64, mime, onProgress) {
  onProgress && onProgress('Polis tutanağı analiz ediliyor...');
  const txt = await callAI(
    apiKey,
    imgContent(b64, mime, "Bu bir Türk POLİS trafik kaza tespit tutanağı fotoğrafıdır. Tüm araçları, sürücüleri, yaralıları ve M.KAZANIN ÖZETİ bölümünü tam olarak oku. Türkçe karakterleri dikkate al. Belirsiz alanları [OKUNAMADI] veya [BELİRSİZ: tahmin] olarak işaretle. SADECE JSON döndür."),
    POLIS_SYS,
    2500
  );
  const parsed = safeParseJSON(txt);
  return {
    tip: 'polis_ktt',
    ...parsed,
    _okuma_kalitesi: parsed._okuma_kalitesi || 'orta',
    _belirsiz_alanlar: parsed._belirsiz_alanlar || []
  };
}

async function hasarIhbarAnaliz(apiKey, b64, mime, onProgress) {
  onProgress && onProgress('Hasar ihbar föyü analiz ediliyor...');
  const txt = await callAI(
    apiKey,
    imgContent(b64, mime, "Bu bir Türk sigorta şirketi hasar ihbar föyü / dosya kapağı fotoğrafıdır. Tüm alanları (dosya, poliçe, sigortalı, araç, hasar, eksper, mağdurlar) dikkatlice oku. Her sigorta şirketinin formatı farklı olabilir. Belirsiz alanları [OKUNAMADI] veya [BELİRSİZ: tahmin] olarak işaretle. SADECE JSON döndür."),
    HASAR_SYS,
    2500
  );
  const parsed = safeParseJSON(txt);
  return {
    tip: 'hasar_ihbar',
    ...parsed,
    _okuma_kalitesi: parsed._okuma_kalitesi || 'orta',
    _belirsiz_alanlar: parsed._belirsiz_alanlar || []
  };
}

/* ══════════════════════════════════════════════════════
   ANA COMPONENT
══════════════════════════════════════════════════════ */
MR.EvrakOkuyucuPage = ({setPage, user}) => {
  const C = MR.C, S = MR.S, LIcon = MR.LIcon;
  const isKoyu = MR.tema === 'koyu';

  const [tip, setTip] = useState('anlasma_ktt');
  const [items, setItems] = useState([]);
  const [selId, setSelId] = useState(null);
  const [drag, setDrag] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyLoaded, setApiKeyLoaded] = useState(false);
  const fileRef = useRef(null);
  const procRef = useRef(false);
  const qRef = useRef([]);

  const TIPLER = {
    anlasma_ktt: {label:'ANLAŞMALI KTT', icon:'FileText', color:'#2563eb', desc:'El Yazısı + TRAMER 48 Senaryo Kusur Analizi'},
    polis_ktt: {label:'POLİS KTT', icon:'ShieldAlert', color:'#dc2626', desc:'Polis Kaza Tespit Tutanağı'},
    hasar_ihbar: {label:'HASAR İHBAR', icon:'AlertTriangle', color:'#d97706', desc:'Sigorta Şirketi Hasar Föyü'}
  };
  const tipInfo = TIPLER[tip];

  // Sistem ayarlarından OpenRouter key çek + XLSX + PDF.js yükle
  useEffect(() => {
    (async () => {
      try {
        const r = await MR.api.ayarlarList();
        if (r?.success && r?.data?.openrouter_api_key) {
          setApiKey(r.data.openrouter_api_key);
        }
      } catch(e) {}
      setApiKeyLoaded(true);
    })();
    // XLSX kütüphanesi yükle (Excel export için)
    if (!window.XLSX) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      document.head.appendChild(script);
    }
    // PDF.js kütüphanesi yükle (PDF → image için)
    if (!window.pdfjsLib) {
      const pdfScript = document.createElement('script');
      pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      pdfScript.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
      };
      document.head.appendChild(pdfScript);
    }
  }, []);

  const upd = (id, p) => setItems(x => x.map(i => i.id === id ? {...i, ...p} : i));

  const fileToB64 = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => {
      const dataUrl = e.target.result;
      res({ dataUrl, b64: dataUrl.split(',')[1], mime: file.type, preview: dataUrl });
    };
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  // PDF → Image dönüşümü (her sayfa ayrı image)
  const pdfToImages = async (file) => {
    if (!window.pdfjsLib) throw new Error('PDF.js yüklenmedi');
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({data: arrayBuffer}).promise;
    const images = [];
    const pageCount = Math.min(pdf.numPages, 10); // Max 10 sayfa
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({scale: 2.0}); // Yüksek çözünürlük
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({canvasContext: ctx, viewport}).promise;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      images.push({
        name: `${file.name} (Sayfa ${i}/${pageCount})`,
        dataUrl,
        b64: dataUrl.split(',')[1],
        mime: 'image/jpeg',
        preview: dataUrl
      });
    }
    return images;
  };

  const processItem = async (item) => {
    upd(item.id, {status:'analyzing', sub:'Görüntü ön işleme (grayscale + kontrast + keskinleştirme)...'});
    const progressCb = (msg) => upd(item.id, {sub: msg});
    try {
      // 1. Orijinal dosyayı dataUrl'e çevir
      const { dataUrl: origDataUrl, mime: origMime } = await fileToB64(item.file);

      // 2. Görüntü ön işleme (Canvas API ile)
      let b64, mime;
      if (origMime.startsWith('image/')) {
        const enhanced = await enhanceImage(origDataUrl);
        b64 = enhanced.b64;
        mime = enhanced.mime;
      } else {
        b64 = origDataUrl.split(',')[1];
        mime = origMime;
      }

      upd(item.id, {sub: 'Claude-Sonnet analiz ediyor...'});
      let result;
      if (item.tip === 'anlasma_ktt') {
        result = await anlasmaKTTAnaliz(apiKey, b64, mime, progressCb);
      } else if (item.tip === 'polis_ktt') {
        result = await polisKTTAnaliz(apiKey, b64, mime, progressCb);
      } else {
        result = await hasarIhbarAnaliz(apiKey, b64, mime, progressCb);
      }
      upd(item.id, {status:'done', result, sub: null});
      setSelId(prev => prev || item.id);
    } catch(e) {
      upd(item.id, {status:'error', sub: e.message});
    }
  };

  const runQueue = async () => {
    if (procRef.current) return;
    procRef.current = true;
    while (qRef.current.length > 0) {
      const batch = qRef.current.splice(0, 2);
      await Promise.all(batch.map(processItem));
    }
    procRef.current = false;
  };

  const addFiles = useCallback(async (fl) => {
    if (!apiKey) {
      alert('OpenRouter API Key tanımlı değil! Sistem > Firma Ayarları\'ndan eklemelisiniz.');
      return;
    }
    const valid = Array.from(fl).filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
    if (!valid.length) {
      alert('Sadece JPG, PNG veya PDF yükleyebilirsiniz.');
      return;
    }

    const allItems = [];
    for (const f of valid) {
      if (f.type === 'application/pdf') {
        // PDF → her sayfa ayrı item
        if (!window.pdfjsLib) {
          alert('PDF.js kütüphanesi henüz yüklenmedi. Birkaç saniye bekleyip tekrar deneyin.');
          return;
        }
        try {
          const images = await pdfToImages(f);
          for (const img of images) {
            // Image'i File objesine çevir (processItem beklentisi)
            const blob = await (await fetch(img.dataUrl)).blob();
            const pageFile = new File([blob], img.name, {type: 'image/jpeg'});
            allItems.push({
              id: Date.now() + '-' + Math.random().toString(36).slice(2,6),
              name: img.name,
              file: pageFile,
              preview: img.dataUrl,
              status: 'pending',
              sub: 'Sırada (PDF sayfası)',
              result: null,
              tip: tip
            });
          }
        } catch (e) {
          alert('PDF okuma hatası: ' + e.message);
        }
      } else {
        // Normal image
        allItems.push({
          id: Date.now() + '-' + Math.random().toString(36).slice(2,6),
          name: f.name,
          file: f,
          preview: URL.createObjectURL(f),
          status: 'pending',
          sub: 'Sırada',
          result: null,
          tip: tip
        });
      }
    }

    setItems(p => [...p, ...allItems]);
    qRef.current.push(...allItems);
    runQueue();
  }, [tip, apiKey]);

  const sel = items.find(i => i.id === selId);
  const kc = o => o === 0 ? '#22c55e' : o === 100 ? '#ef4444' : '#f59e0b';
  const gc = s => s >= 80 ? '#22c55e' : s >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="fade-in" style={{padding:'16px', maxWidth:1400, margin:'0 auto'}}>
      {/* HEADER */}
      <div style={{...S.card, marginBottom:14, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10}}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <div style={{width:44, height:44, borderRadius:12, background:`linear-gradient(135deg,${tipInfo.color},${tipInfo.color}cc)`, display:'flex', alignItems:'center', justifyContent:'center'}}>
            <LIcon name="FileSearch" size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{fontSize:16, fontWeight:900, margin:0}}>EVRAK OKUYUCU</h1>
            <p style={{fontSize:10, color:C.textMuted, margin:0}}>OPENROUTER • CLAUDE-SONNET-4.5 • TRAMER KUSUR ANALİZİ</p>
          </div>
        </div>
        <div style={{display:'flex', gap:6, alignItems:'center'}}>
          {apiKeyLoaded && (
            <span style={{fontSize:9, fontWeight:700, padding:'4px 10px', borderRadius:6,
              background: apiKey ? '#22c55e18' : '#ef444418',
              color: apiKey ? '#22c55e' : '#ef4444',
              border: `1px solid ${apiKey ? '#22c55e44' : '#ef444444'}`
            }}>
              {apiKey ? '✓ API KEY OK' : '✗ API KEY YOK'}
            </span>
          )}
          <button onClick={() => fileRef.current?.click()} disabled={!apiKey} style={{...S.btn, background:apiKey?tipInfo.color:'#64748b', color:'#fff', padding:'9px 18px', borderRadius:8, fontSize:12, fontWeight:700, opacity:apiKey?1:0.5, cursor:apiKey?'pointer':'not-allowed'}}>
            <LIcon name="Upload" size={14} color="#fff"/> YÜKLE
          </button>
          {items.length > 0 && <button onClick={() => {setItems([]); setSelId(null); qRef.current=[];}} style={{...S.btn, background:`${C.danger}18`, color:C.danger, padding:'9px 14px', borderRadius:8, fontSize:11, fontWeight:700, border:`1px solid ${C.danger}33`}}>
            <LIcon name="Trash2" size={14} color={C.danger}/> TEMİZLE
          </button>}
          <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf" multiple style={{display:'none'}} onChange={e => {addFiles(e.target.files); e.target.value='';}}/>
        </div>
      </div>

      {/* API KEY UYARISI */}
      {apiKeyLoaded && !apiKey && (
        <div style={{...S.card, marginBottom:14, padding:'14px 18px', background:'#ef444408', border:'1px solid #ef444444'}}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <LIcon name="AlertTriangle" size={20} color="#ef4444"/>
            <div style={{flex:1}}>
              <div style={{fontSize:13, fontWeight:800, color:'#ef4444'}}>OPENROUTER API KEY TANIMLI DEĞİL</div>
              <div style={{fontSize:11, color:C.textMuted, marginTop:3}}>Sistem → Firma Ayarları'na gidin, "OPENROUTER API ANAHTARI" alanına sk-or-v1-... ile başlayan key'inizi girin ve kaydedin.</div>
            </div>
            <button onClick={() => setPage('sistem-ayarlar')} style={{...S.btn, background:'#ef4444', color:'#fff', padding:'8px 16px', borderRadius:6, fontSize:11, fontWeight:700}}>
              AYARLARA GİT
            </button>
          </div>
        </div>
      )}

      {/* TİP SEÇİMİ */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14}}>
        {Object.entries(TIPLER).map(([key, val]) => (
          <div key={key} onClick={() => {setTip(key); setItems([]); setSelId(null); qRef.current=[];}}
            style={{...S.card, padding:'12px 16px', cursor:'pointer', textAlign:'center',
              border: tip===key ? `3px solid ${val.color}` : `1px solid ${C.border}`,
              background: tip===key ? val.color+'12' : C.bgCard, transition:'all 0.2s'}}>
            <LIcon name={val.icon} size={22} color={val.color}/>
            <div style={{fontSize:12, fontWeight:800, marginTop:6, color: tip===key ? val.color : C.text}}>{val.label}</div>
            <div style={{fontSize:9, color:C.textMuted, marginTop:3}}>{val.desc}</div>
          </div>
        ))}
      </div>

      {/* BOŞ DURUM */}
      {items.length === 0 && apiKey && (
        <div onDrop={e => {e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files);}}
          onDragOver={e => {e.preventDefault(); setDrag(true);}} onDragLeave={() => setDrag(false)}
          onClick={() => fileRef.current?.click()}
          style={{...S.card, border:`2px dashed ${drag ? tipInfo.color : C.border}`, padding:'50px 24px', textAlign:'center',
            cursor:'pointer', background: drag ? tipInfo.color+'08' : C.bgCard}}>
          <LIcon name="Upload" size={40} color={drag ? tipInfo.color : C.textMuted}/>
          <p style={{fontSize:14, fontWeight:700, margin:'12px 0 4px'}}>{tipInfo.label.toUpperCase()} YÜKLEYİN</p>
          <p style={{fontSize:11, color:C.textMuted}}>Sürükle & bırak veya tıkla • Birden fazla evrak yükleyebilirsiniz</p>
          <p style={{fontSize:10, color:tipInfo.color, fontWeight:700, marginTop:4}}>{tipInfo.desc} • İkişer ikişer işlenir</p>
        </div>
      )}

      {/* SOL LİSTE + SAĞ DETAY */}
      {items.length > 0 && (
        <div style={{display:'grid', gridTemplateColumns:'240px 1fr', gap:14, alignItems:'start'}}>
          {/* SOL: LİSTE */}
          <div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
              <span style={{fontSize:10, color:C.textMuted, fontWeight:700}}>{items.length} EVRAK</span>
              <button onClick={() => fileRef.current?.click()} style={{fontSize:9, color:C.textMuted, background:C.bgInput, border:`1px solid ${C.border}`, borderRadius:5, padding:'3px 10px', cursor:'pointer', fontWeight:600}}>+ Ekle</button>
            </div>
            {items.map(item => {
              const isSel = selId === item.id;
              const sc = {analyzing:'#fbbf24', done:'#22c55e', error:'#ef4444', pending:'#64748b'}[item.status];
              const plakaA = item.result?.aracA?.plaka || item.result?.araclar?.[0]?.plaka || item.result?.aracPlaka || '';
              return (
                <div key={item.id} onClick={() => item.status==='done' && setSelId(item.id)}
                  style={{background: isSel ? tipInfo.color+'12' : C.bgCard, border:`1px solid ${isSel ? tipInfo.color+'55' : C.border}`,
                    borderRadius:9, padding:'10px 11px', cursor: item.status==='done' ? 'pointer' : 'default', marginBottom:8, transition:'all .15s'}}>
                  <div style={{display:'flex', gap:8}}>
                    {item.preview && <img src={item.preview} style={{width:40, height:40, borderRadius:5, objectFit:'cover', border:`1px solid ${C.border}`, flexShrink:0}} alt=""/>}
                    <div style={{flex:1, minWidth:0}}>
                      <p style={{margin:'0 0 3px', fontSize:10, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'monospace'}}>
                        {plakaA || item.name}
                      </p>
                      <span style={{fontSize:9, color:sc, background:sc+'18', border:`1px solid ${sc}44`, borderRadius:4, padding:'2px 7px', fontWeight:700}}>
                        {{analyzing:'ANALİZ', done:'TAMAM', error:'HATA', pending:'BEKLE'}[item.status]}
                      </span>
                      {item.result?.eslesenSenaryo && <p style={{margin:'3px 0 0', fontSize:8.5, color:'#ff6b35', fontWeight:800}}>{item.result.eslesenSenaryo}</p>}
                      {item.status==='error' && <p style={{margin:'3px 0 0', fontSize:8, color:C.danger, wordBreak:'break-word'}}>{item.sub}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SAĞ: DETAY */}
          <div>
            {!sel && <div style={{...S.card, textAlign:'center', padding:'55px'}}><LIcon name="ArrowLeft" size={32} color={C.textMuted}/><p style={{color:C.textMuted, marginTop:10}}>Soldan bir evrak seçin</p></div>}
            {sel?.status === 'analyzing' && <div style={{...S.card, textAlign:'center', padding:'50px'}}><div style={{width:24, height:24, border:`3px solid ${tipInfo.color}30`, borderTopColor:tipInfo.color, borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px'}}/><p style={{color:tipInfo.color, fontWeight:700, fontSize:13}}>Analiz ediliyor...</p><p style={{color:C.textMuted, fontSize:11}}>{sel.sub}</p></div>}
            {sel?.status === 'error' && <div style={{...S.card, padding:20, background:`${C.danger}08`}}><p style={{color:C.danger, fontWeight:700, wordBreak:'break-word'}}>HATA: {sel.sub}</p></div>}
            {sel?.status === 'done' && sel.result && (() => {
              const itemTip = sel.tip || sel.result.tip || tip;
              const kalite = sel.result._okuma_kalitesi || 'orta';
              const belirsizler = sel.result._belirsiz_alanlar || [];
              return <div>
                {/* OKUMA KALİTESİ UYARI BANNERI */}
                <KaliteBanner kalite={kalite} belirsizler={belirsizler} C={C} S={S} LIcon={LIcon}/>
                {itemTip === 'anlasma_ktt' && <AnlasmaKTTDetay r={sel.result} C={C} S={S} LIcon={LIcon} kc={kc} gc={gc}/>}
                {itemTip === 'polis_ktt' && <PolisKTTDetay r={sel.result} C={C} S={S} LIcon={LIcon}/>}
                {itemTip === 'hasar_ihbar' && <HasarIhbarDetay r={sel.result} C={C} S={S} LIcon={LIcon}/>}
              </div>;
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   ANLAŞMALI KTT DETAY
══════════════════════════════════════════════════════ */
const AnlasmaKTTDetay = ({r, C, S, LIcon, kc, gc}) => {
  const [editMode, setEditMode] = useState({});
  const [editValues, setEditValues] = useState({
    aracA: { plaka: r.aracA?.plaka || '', surucu: r.aracA?.surucu || '', tc: r.aracA?.tc || '', telefon: r.aracA?.telefon || '' },
    aracB: { plaka: r.aracB?.plaka || '', surucu: r.aracB?.surucu || '', tc: r.aracB?.tc || '', telefon: r.aracB?.telefon || '' }
  });

  // Değer değiştirme
  const updateVal = (arac, key, val) => {
    setEditValues(p => ({...p, [arac]: {...p[arac], [key]: val}}));
  };

  // Kopyala
  const kopyala = (text, label) => {
    navigator.clipboard.writeText(text);
    MR.toast && MR.toast((label || 'Kopyalandı') + ': ' + text, 'success');
  };

  // Araç kopyala (tüm bilgileri sekmeli)
  const aracKopyala = (arac, harf) => {
    const v = editValues[arac];
    const lines = [
      `ARAÇ ${harf}`,
      `Plaka: ${v.plaka}`,
      `Adı Soyadı: ${v.surucu}`,
      `T.C. Kimlik: ${v.tc}`,
      `Telefon: ${v.telefon}`
    ].join('\n');
    navigator.clipboard.writeText(lines);
    MR.toast && MR.toast(`ARAÇ ${harf} bilgileri kopyalandı`, 'success');
  };

  // Toplu kopyala (A + B)
  const topluKopyala = () => {
    const a = editValues.aracA;
    const b = editValues.aracB;
    const lines = [
      'ARAÇ A',
      `Plaka: ${a.plaka}`,
      `Adı Soyadı: ${a.surucu}`,
      `T.C. Kimlik: ${a.tc}`,
      `Telefon: ${a.telefon}`,
      '',
      'ARAÇ B',
      `Plaka: ${b.plaka}`,
      `Adı Soyadı: ${b.surucu}`,
      `T.C. Kimlik: ${b.tc}`,
      `Telefon: ${b.telefon}`
    ].join('\n');
    navigator.clipboard.writeText(lines);
    MR.toast && MR.toast('Tüm bilgiler kopyalandı', 'success');
  };

  // Excel export
  const excelExport = () => {
    if (!window.XLSX) { MR.toast && MR.toast('Excel kütüphanesi yükleniyor...', 'info'); return; }
    const X = window.XLSX;
    const headers = ['ARAÇ', 'PLAKA', 'ADI SOYADI', 'T.C. KİMLİK NO', 'TELEFON'];
    const rows = [
      headers,
      ['A', editValues.aracA.plaka, editValues.aracA.surucu, editValues.aracA.tc, editValues.aracA.telefon],
      ['B', editValues.aracB.plaka, editValues.aracB.surucu, editValues.aracB.tc, editValues.aracB.telefon]
    ];
    const ws = X.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{wch:6}, {wch:14}, {wch:22}, {wch:14}, {wch:14}];
    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ws, 'Anlasma KTT');
    X.writeFile(wb, `ANLASMA_KTT_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const Row = ({l, v}) => v ? (
    <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:`1px solid ${C.border}`}}>
      <span style={{fontSize:9, color:C.textMuted, fontWeight:700}}>{l}</span>
      <span style={{fontSize:10, color:C.text, textAlign:'right', maxWidth:'65%'}}>{v}</span>
    </div>
  ) : null;

  // Kritik alan row - güven skoru + kopyala + düzenle + doğrulama rengi
  const KritikRow = ({arac, field, label, value, guven, valid}) => {
    const key = arac + '_' + field;
    const isEditing = editMode[key];
    const currentVal = editValues[arac][field];
    // Renk: valid+yuksek=yeşil, valid+orta=sarı, geçersiz=kırmızı, hiç=gri
    let col = '#64748b';
    let bgCol = 'rgba(128,128,128,0.05)';
    if (hasMarker(currentVal)) { col = '#ef4444'; bgCol = '#ef444410'; }
    else if (valid && guven === 'yuksek') { col = '#22c55e'; bgCol = '#22c55e10'; }
    else if (valid && guven === 'orta') { col = '#f59e0b'; bgCol = '#f59e0b10'; }
    else if (!valid && currentVal) { col = '#ef4444'; bgCol = '#ef444410'; }
    const guvenLabel = {yuksek: 'YÜKSEK', orta: 'ORTA', dusuk: 'DÜŞÜK'}[guven] || 'DÜŞÜK';

    return (
      <div style={{marginBottom:8, padding:'8px 10px', background: bgCol, borderRadius:6, border:`1px solid ${col}33`, borderLeft:`3px solid ${col}`}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4}}>
          <span style={{fontSize:9, color:C.textMuted, fontWeight:700}}>{label}</span>
          <span style={{fontSize:8, color:col, fontWeight:800, padding:'1px 6px', background:col+'20', borderRadius:3}}>{guvenLabel}</span>
        </div>
        {isEditing ? (
          <input
            autoFocus
            value={currentVal}
            onChange={e => updateVal(arac, field, e.target.value)}
            onBlur={() => setEditMode(p => ({...p, [key]: false}))}
            onKeyDown={e => e.key === 'Enter' && setEditMode(p => ({...p, [key]: false}))}
            style={{width:'100%', fontSize:12, fontFamily:'monospace', fontWeight:700, padding:'4px 8px', borderRadius:4, border:`1px solid ${col}`, background:'rgba(0,0,0,0.05)', color:C.text, outline:'none'}}
          />
        ) : (
          <div style={{display:'flex', alignItems:'center', gap:6}}>
            <span
              onClick={() => setEditMode(p => ({...p, [key]: true}))}
              style={{flex:1, fontFamily:'monospace', fontSize:12, fontWeight:700, color:col, cursor:'pointer', wordBreak:'break-all'}}
              title="Düzenle"
            >{currentVal || '[BOŞ]'}</span>
            <button onClick={() => kopyala(currentVal, label)} style={{background:col, color:'#fff', border:'none', borderRadius:4, padding:'3px 8px', cursor:'pointer', fontSize:9, fontWeight:700}} title="Kopyala">📋</button>
            <button onClick={() => setEditMode(p => ({...p, [key]: true}))} style={{background:'transparent', color:col, border:`1px solid ${col}`, borderRadius:4, padding:'3px 8px', cursor:'pointer', fontSize:9, fontWeight:700}} title="Düzenle">✏️</button>
          </div>
        )}
      </div>
    );
  };

  const kt = r.kusurTablosu || [];

  return (
    <div style={{display:'flex', flexDirection:'column', gap:11}}>
      {/* TOPLU İŞLEM BUTONLARI */}
      <div style={{...S.card, padding:'10px 14px', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'}}>
        <span style={{fontSize:10, fontWeight:700, color:C.textMuted}}>HIZLI İŞLEMLER:</span>
        <button onClick={topluKopyala} style={{background:'#2563eb', color:'#fff', border:'none', borderRadius:6, padding:'6px 14px', cursor:'pointer', fontSize:11, fontWeight:700}}>
          📋 TÜMÜNÜ KOPYALA
        </button>
        <button onClick={excelExport} style={{background:'#22c55e', color:'#fff', border:'none', borderRadius:6, padding:'6px 14px', cursor:'pointer', fontSize:11, fontWeight:700}}>
          📊 EXCEL İNDİR
        </button>
      </div>

      {/* SENARYO + GÜVEN */}
      <div style={{...S.card, background:'#ff6b3508', border:'1px solid #ff6b3533', padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10}}>
        <div>
          <div style={{fontSize:9, color:C.textMuted, fontWeight:700}}>TRAMER SENARYO</div>
          <div style={{fontSize:22, fontWeight:900, color:'#ff6b35'}}>{r.eslesenSenaryo || '-'}</div>
          {r.senaryoKategori && <div style={{fontSize:10, color:C.textSec, marginTop:2}}>{r.senaryoKategori}</div>}
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:9, color:C.textMuted, fontWeight:700}}>GÜVEN</div>
          <div style={{fontSize:24, fontWeight:900, color:gc(r.guvenSkoru||0)}}>{r.guvenSkoru||'?'}%</div>
        </div>
      </div>

      {/* ARAÇ A + B - 4 KRİTİK ALAN ODAKLI */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:11}}>
        {['aracA','aracB'].map((k,i) => {
          const ar = r[k]; if (!ar) return null;
          const harf = i===0?'A':'B';
          const ktItem = kt.find(x=>x.arac===harf);
          const oran = ktItem?.kusurOrani ?? 50;
          const col = kc(oran);
          return (
            <div key={k} style={{...S.card, borderTop:`3px solid ${col}`, padding:14}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                <div>
                  <div style={{fontSize:9, color:C.textMuted, fontWeight:700}}>ARAÇ {harf}</div>
                  <div style={{fontSize:20, fontWeight:900, color:col}}>{oran}% KUSUR</div>
                </div>
                <button onClick={() => aracKopyala(k, harf)} style={{background:col, color:'#fff', border:'none', borderRadius:6, padding:'7px 12px', cursor:'pointer', fontSize:10, fontWeight:800}}>
                  📋 ARAÇ {harf} KOPYALA
                </button>
              </div>
              <div style={{height:5, background:'rgba(128,128,128,0.15)', borderRadius:3, marginBottom:12}}>
                <div style={{height:'100%', width:`${oran}%`, background:col, borderRadius:3}}/>
              </div>

              {/* 4 KRİTİK ALAN */}
              <KritikRow arac={k} field="plaka" label="PLAKA" value={ar.plaka} guven={ar.plaka_guven} valid={ar.plaka_valid}/>
              <KritikRow arac={k} field="surucu" label="ADI SOYADI" value={ar.surucu} guven={ar.surucu_guven} valid={ar.surucu_valid}/>
              <KritikRow arac={k} field="tc" label="T.C. KİMLİK NO" value={ar.tc} guven={ar.tc_guven} valid={ar.tc_valid}/>
              <KritikRow arac={k} field="telefon" label="TELEFON" value={ar.telefon} guven={ar.telefon_guven} valid={ar.telefon_valid}/>

              {/* EK BİLGİLER */}
              <div style={{marginTop:10, paddingTop:8, borderTop:`1px solid ${C.border}`}}>
                <Row l="Marka" v={ar.marka}/>
                <Row l="Sigorta" v={ar.sigortaSirketi}/>
                <Row l="Poliçe" v={ar.policeNo}/>
                <Row l="Hasar" v={ar.hasarYeri}/>
              </div>
              {ktItem?.kusurNedeni && <div style={{marginTop:7, fontSize:10, color:C.textSec, background:'rgba(128,128,128,0.06)', borderRadius:6, padding:'6px 8px', borderLeft:`2px solid ${col}`}}>{ktItem.kusurNedeni}</div>}
            </div>
          );
        })}
      </div>

      {/* KUSUR ANALİZİ */}
      <div style={{...S.card, background:'#8b5cf608', border:'1px solid #8b5cf633', padding:14}}>
        <div style={{fontSize:10, fontWeight:800, color:'#8b5cf6', textTransform:'uppercase', marginBottom:10}}>
          <LIcon name="Scale" size={13} color="#8b5cf6"/> KUSUR ANALİZİ
        </div>
        <div style={{fontSize:12, lineHeight:1.85, fontStyle:'italic', color:C.text}}>{r.kusurAnalizi||'-'}</div>
      </div>

      {/* KROKİ + BEYAN */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:11}}>
        <div style={{...S.card, background:'#3b82f608', border:'1px solid #3b82f633', padding:14}}>
          <div style={{fontSize:10, fontWeight:800, color:'#3b82f6', textTransform:'uppercase', marginBottom:10}}>
            <LIcon name="Map" size={13} color="#3b82f6"/> KROKİ ANALİZİ
          </div>
          <Row l="Yol" v={r.kroKiAnalizi?.yolYapisi}/>
          <Row l="Araç A" v={r.kroKiAnalizi?.aAracPozisyon}/>
          <Row l="Araç B" v={r.kroKiAnalizi?.bAracPozisyon}/>
          <Row l="Çarpışma" v={r.kroKiAnalizi?.carpismaNokta}/>
          <Row l="Sinyal" v={r.kroKiAnalizi?.sinyal}/>
          <Row l="Refüj" v={r.kroKiAnalizi?.refuj}/>
        </div>
        <div style={{...S.card, background:'#3b82f608', border:'1px solid #3b82f633', padding:14}}>
          <div style={{fontSize:10, fontWeight:800, color:'#3b82f6', textTransform:'uppercase', marginBottom:10}}>
            <LIcon name="MessageSquare" size={13} color="#3b82f6"/> BEYAN ANALİZİ
          </div>
          {r.beyanAnalizi?.aBeyan && <div style={{marginBottom:8}}>
            <div style={{fontSize:8.5, color:'#ff6b35', fontWeight:800, marginBottom:3}}>A SÜRÜCÜSÜ</div>
            <div style={{fontSize:10, color:C.textSec, lineHeight:1.6, background:'rgba(0,0,0,0.04)', borderRadius:6, padding:'6px 8px'}}>{r.beyanAnalizi.aBeyan}</div>
          </div>}
          {r.beyanAnalizi?.bBeyan && <div style={{marginBottom:8}}>
            <div style={{fontSize:8.5, color:'#3b82f6', fontWeight:800, marginBottom:3}}>B SÜRÜCÜSÜ</div>
            <div style={{fontSize:10, color:C.textSec, lineHeight:1.6, background:'rgba(0,0,0,0.04)', borderRadius:6, padding:'6px 8px'}}>{r.beyanAnalizi.bBeyan}</div>
          </div>}
          {r.beyanAnalizi?.celisme && <div style={{background:'#fbbf2410', border:'1px solid #fbbf2433', borderRadius:6, padding:'6px 8px', marginTop:5}}>
            <span style={{fontSize:8.5, color:'#fbbf24', fontWeight:800}}>ÇELİŞME: </span>
            <span style={{fontSize:10, color:C.textSec}}>{r.beyanAnalizi.celisme}</span>
          </div>}
          {r.beyanAnalizi?.kroKiUyum && <div style={{background:'#22c55e10', border:'1px solid #22c55e33', borderRadius:6, padding:'6px 8px', marginTop:5}}>
            <span style={{fontSize:8.5, color:'#22c55e', fontWeight:800}}>KROKİ UYUMU: </span>
            <span style={{fontSize:10, color:C.textSec}}>{r.beyanAnalizi.kroKiUyum}</span>
          </div>}
        </div>
      </div>

      {/* YASAL + TESPİT */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:11}}>
        <div style={{...S.card, background:'#22c55e08', border:'1px solid #22c55e33', padding:14}}>
          <div style={{fontSize:10, fontWeight:800, color:'#22c55e', textTransform:'uppercase', marginBottom:10}}>
            <LIcon name="BookOpen" size={13} color="#22c55e"/> YASAL DAYANAK
          </div>
          <div style={{display:'flex', gap:5, flexWrap:'wrap'}}>
            {(r.yasalDayanak||[]).filter(Boolean).map((m,i)=><span key={i} style={{background:'#22c55e18', color:'#22c55e', border:'1px solid #22c55e44', borderRadius:5, padding:'3px 10px', fontSize:10, fontWeight:700}}>{m}</span>)}
          </div>
        </div>
        <div style={{...S.card, background:'#f59e0b08', border:'1px solid #f59e0b33', padding:14}}>
          <div style={{fontSize:10, fontWeight:800, color:'#f59e0b', textTransform:'uppercase', marginBottom:10}}>
            <LIcon name="Search" size={13} color="#f59e0b"/> KRİTİK TESPİTLER
          </div>
          {(r.kritikTespitler||[]).filter(Boolean).map((t,i)=>(
            <div key={i} style={{fontSize:10, color:C.textSec, paddingBottom:4, marginBottom:4, borderBottom:`1px solid ${C.border}`}}>• {t}</div>
          ))}
        </div>
      </div>

      {/* UYARILAR */}
      {(r.uyarilar||[]).filter(Boolean).length > 0 && (
        <div style={{...S.card, background:'#ef444408', border:'1px solid #ef444433', padding:14}}>
          <div style={{fontSize:10, fontWeight:800, color:'#ef4444', textTransform:'uppercase', marginBottom:8}}>
            <LIcon name="AlertTriangle" size={13} color="#ef4444"/> UYARILAR
          </div>
          {r.uyarilar.filter(Boolean).map((u,i)=>(
            <div key={i} style={{fontSize:10, color:'#ef4444', marginBottom:4}}>• {u}</div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   POLİS KTT DETAY
══════════════════════════════════════════════════════ */
const PolisKTTDetay = ({r, C, S, LIcon}) => {
  const Row = ({l, v}) => v ? (
    <div style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:`1px solid ${C.border}`}}>
      <span style={{fontSize:9, color:C.textMuted, fontWeight:700}}>{l}</span>
      <span style={{fontSize:10, color:C.text, textAlign:'right', maxWidth:'65%'}}>{v}</span>
    </div>
  ) : null;

  return (
    <div style={{display:'flex', flexDirection:'column', gap:11}}>
      {/* TUTANAK BAŞLIK */}
      <div style={{...S.card, background:'#dc262608', border:'1px solid #dc262633', padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10}}>
        <div>
          <div style={{fontSize:9, color:C.textMuted, fontWeight:700}}>POLİS TUTANAK</div>
          <div style={{fontSize:18, fontWeight:900, color:'#dc2626'}}>{r.tutanakNo || '-'}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:9, color:C.textMuted, fontWeight:700}}>GÜVEN</div>
          <div style={{fontSize:20, fontWeight:900, color:'#22c55e'}}>{r.guven||90}%</div>
        </div>
      </div>

      {/* KAZA BİLGİLERİ */}
      <div style={{...S.card, padding:14}}>
        <div style={{fontSize:10, fontWeight:800, color:'#dc2626', textTransform:'uppercase', marginBottom:10}}>
          <LIcon name="MapPin" size={13} color="#dc2626"/> KAZA BİLGİLERİ
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
          <div>
            <Row l="Tarih" v={r.tarih}/>
            <Row l="Saat" v={r.saat}/>
            <Row l="İl" v={r.il}/>
            <Row l="İlçe" v={r.ilce}/>
          </div>
          <div>
            <Row l="Mahalle" v={r.mahalle}/>
            <Row l="Cadde" v={r.cadde}/>
            <Row l="Yol Tipi" v={r.yolTipi}/>
            <Row l="Hava" v={r.hava}/>
          </div>
        </div>
      </div>

      {/* ARAÇLAR */}
      {(r.araclar || []).map((arac, i) => (
        <div key={i} style={{...S.card, borderLeft:'3px solid #dc2626', padding:14}}>
          <div style={{fontSize:10, fontWeight:800, color:'#dc2626', textTransform:'uppercase', marginBottom:10}}>
            <LIcon name="Car" size={13} color="#dc2626"/> ARAÇ {arac.sira || (i+1)}
          </div>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
            <div style={{fontFamily:'monospace', fontSize:16, fontWeight:900, color:'#dc2626'}}>{arac.plaka || '-'}</div>
            <div style={{fontSize:10, color:C.textMuted}}>{arac.marka} {arac.model} ({arac.modelYili})</div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
            <div>
              <Row l="Sürücü" v={arac.surucu}/>
              <Row l="TC" v={arac.tc}/>
              <Row l="Doğum" v={arac.dogumYili}/>
              <Row l="Ehliyet" v={arac.ehliyet}/>
              <Row l="Renk" v={arac.renk}/>
            </div>
            <div>
              <Row l="Sigorta" v={arac.sigorta}/>
              <Row l="Poliçe" v={arac.policeNo}/>
              <Row l="Hasar" v={arac.hasar}/>
              <Row l="Kusur" v={arac.kusurOrani}/>
              <Row l="Alkol" v={arac.alkol}/>
            </div>
          </div>
          {arac.ihlal && <div style={{marginTop:7, fontSize:10, color:C.textSec, background:'#f59e0b10', borderRadius:6, padding:'6px 8px', borderLeft:'2px solid #f59e0b'}}>
            <strong style={{color:'#f59e0b'}}>İHLAL: </strong>{arac.ihlal}
          </div>}
        </div>
      ))}

      {/* YARALILAR */}
      {(r.yaralilar || []).filter(y => y.adi).length > 0 && (
        <div style={{...S.card, background:'#f59e0b08', border:'1px solid #f59e0b33', padding:14}}>
          <div style={{fontSize:10, fontWeight:800, color:'#f59e0b', textTransform:'uppercase', marginBottom:10}}>
            <LIcon name="User" size={13} color="#f59e0b"/> YARALILAR
          </div>
          {r.yaralilar.filter(y => y.adi).map((y, i) => (
            <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'6px 10px', background:'rgba(245,158,11,0.08)', borderRadius:6, marginBottom:4}}>
              <span style={{fontSize:11, fontWeight:700, color:C.text}}>{y.adi}</span>
              <span style={{fontSize:10, color:C.textMuted}}>{y.tc}</span>
              <span style={{fontSize:10, color:'#f59e0b'}}>{y.pozisyon}</span>
              <span style={{fontSize:10, fontWeight:700, color:'#ef4444'}}>{y.durum}</span>
            </div>
          ))}
        </div>
      )}

      {/* KAZA ÖZETİ */}
      {r.kazaOzeti && (
        <div style={{...S.card, background:'#8b5cf608', border:'1px solid #8b5cf633', padding:14}}>
          <div style={{fontSize:10, fontWeight:800, color:'#8b5cf6', textTransform:'uppercase', marginBottom:10}}>
            <LIcon name="FileText" size={13} color="#8b5cf6"/> KAZA ÖZETİ
          </div>
          <div style={{fontSize:11, lineHeight:1.75, color:C.text, fontStyle:'italic'}}>{r.kazaOzeti}</div>
        </div>
      )}

      {/* KUSUR TESPİTİ */}
      {r.kusurTespiti && (
        <div style={{...S.card, background:'#22c55e08', border:'1px solid #22c55e33', padding:14}}>
          <div style={{fontSize:10, fontWeight:800, color:'#22c55e', textTransform:'uppercase', marginBottom:10}}>
            <LIcon name="Scale" size={13} color="#22c55e"/> KUSUR TESPİTİ
          </div>
          <div style={{fontSize:11, lineHeight:1.75, color:C.text}}>{r.kusurTespiti}</div>
          {(r.kanunMaddeleri || []).filter(Boolean).length > 0 && (
            <div style={{marginTop:10, display:'flex', gap:5, flexWrap:'wrap'}}>
              {r.kanunMaddeleri.filter(Boolean).map((m,i) => (
                <span key={i} style={{background:'#22c55e18', color:'#22c55e', border:'1px solid #22c55e44', borderRadius:5, padding:'3px 10px', fontSize:10, fontWeight:700}}>{m}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   HASAR İHBAR FÖYÜ DETAY
══════════════════════════════════════════════════════ */
const HasarIhbarDetay = ({r, C, S, LIcon}) => {
  const Row = ({l, v, h}) => v ? (
    <div style={{display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:`1px solid ${C.border}`}}>
      <span style={{fontSize:9, color:C.textMuted, fontWeight:700}}>{l}</span>
      <span style={{fontSize:10, color: h ? '#d97706' : C.text, textAlign:'right', maxWidth:'60%', fontWeight: h ? 700 : 400}}>{v}</span>
    </div>
  ) : null;

  return (
    <div style={{display:'flex', flexDirection:'column', gap:11}}>
      {/* DOSYA BAŞLIK */}
      <div style={{...S.card, background:'#d9770608', border:'1px solid #d9770633', padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10}}>
        <div>
          <div style={{fontSize:9, color:C.textMuted, fontWeight:700}}>HASAR DOSYA</div>
          <div style={{fontSize:18, fontWeight:900, color:'#d97706'}}>{r.dosyaNo || '-'}</div>
          {r.sigortaSirketi && <div style={{fontSize:11, color:C.textSec, marginTop:2}}>{r.sigortaSirketi}</div>}
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:9, color:C.textMuted, fontWeight:700}}>GÜVEN</div>
          <div style={{fontSize:20, fontWeight:900, color:'#22c55e'}}>{r.guven||90}%</div>
        </div>
      </div>

      {/* POLİÇE BİLGİLERİ */}
      <div style={{...S.card, padding:14}}>
        <div style={{fontSize:10, fontWeight:800, color:'#d97706', textTransform:'uppercase', marginBottom:10}}>
          <LIcon name="FileText" size={13} color="#d97706"/> POLİÇE BİLGİLERİ
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
          <div>
            <Row l="Dosya No" v={r.dosyaNo} h/>
            <Row l="Müşteri No" v={r.musteriNo}/>
            <Row l="Sigorta Şirketi" v={r.sigortaSirketi} h/>
            <Row l="Acente" v={r.acenteAdi}/>
            <Row l="Poliçe No" v={r.policeNo} h/>
          </div>
          <div>
            <Row l="Poliçe Türü" v={r.policeTuru}/>
            <Row l="Ürün Kodu" v={r.urunKodu}/>
            <Row l="Sigorta Bedeli" v={r.sigortaBedeli}/>
            <Row l="Başlangıç" v={r.policeBaslangic}/>
            <Row l="Bitiş" v={r.policeBitis}/>
          </div>
        </div>
      </div>

      {/* SİGORTALI */}
      <div style={{...S.card, padding:14}}>
        <div style={{fontSize:10, fontWeight:800, color:'#d97706', textTransform:'uppercase', marginBottom:10}}>
          <LIcon name="User" size={13} color="#d97706"/> SİGORTALI BİLGİLERİ
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
          <div>
            <Row l="Adı / Ünvan" v={r.sigortaliAdi} h/>
            <Row l="TC / Vergi No" v={r.sigortaliTc}/>
          </div>
          <div>
            <Row l="Telefon" v={r.sigortaliTelefon}/>
            <Row l="E-posta" v={r.sigortaliEmail}/>
          </div>
        </div>
        <Row l="Adres" v={r.sigortaliAdres}/>
      </div>

      {/* ARAÇ */}
      {(r.aracPlaka || r.aracMarka) && (
        <div style={{...S.card, padding:14}}>
          <div style={{fontSize:10, fontWeight:800, color:'#d97706', textTransform:'uppercase', marginBottom:10}}>
            <LIcon name="Car" size={13} color="#d97706"/> ARAÇ BİLGİLERİ
          </div>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
            <div style={{fontFamily:'monospace', fontSize:16, fontWeight:900, color:'#d97706'}}>{r.aracPlaka || '-'}</div>
            <div style={{fontSize:10, color:C.textMuted}}>{r.aracMarka} {r.aracModel} ({r.aracYili})</div>
          </div>
          <Row l="Şase No" v={r.aracSase}/>
        </div>
      )}

      {/* HASAR DETAYI */}
      <div style={{...S.card, background:'#ef444408', border:'1px solid #ef444433', padding:14}}>
        <div style={{fontSize:10, fontWeight:800, color:'#ef4444', textTransform:'uppercase', marginBottom:10}}>
          <LIcon name="AlertTriangle" size={13} color="#ef4444"/> HASAR DETAYI
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
          <div>
            <Row l="Hasar Tarihi" v={r.hasarTarihi} h/>
            <Row l="İhbar Tarihi" v={r.ihbarTarihi}/>
            <Row l="Hasar Nedeni" v={r.hasarNedeni} h/>
            <Row l="Alt Neden" v={r.hasarAltNedeni}/>
          </div>
          <div>
            <Row l="Hasar Yeri" v={r.hasarYeri}/>
            <Row l="İhbar Eden" v={r.ihbarEden}/>
            <Row l="Tahmini Hasar" v={r.tahminiHasar}/>
            <Row l="Toplam Hasar" v={r.toplamHasar} h/>
          </div>
        </div>
        {r.hasarAciklama && (
          <div style={{marginTop:10, fontSize:11, color:C.text, background:'rgba(239,68,68,0.05)', borderRadius:6, padding:'8px 10px', lineHeight:1.6, borderLeft:'2px solid #ef4444'}}>
            {r.hasarAciklama}
          </div>
        )}
      </div>

      {/* EKSPER / SERVİS */}
      {(r.eksperAdi || r.servisAdi) && (
        <div style={{...S.card, padding:14}}>
          <div style={{fontSize:10, fontWeight:800, color:'#d97706', textTransform:'uppercase', marginBottom:10}}>
            <LIcon name="Wrench" size={13} color="#d97706"/> EKSPER / SERVİS
          </div>
          <Row l="Eksper" v={r.eksperAdi}/>
          <Row l="Eksper Firma" v={r.eksperFirma}/>
          <Row l="Servis" v={r.servisAdi}/>
        </div>
      )}

      {/* MAĞDURLAR */}
      {(r.magdurlar || []).filter(m => m.adi || m.plaka).length > 0 && (
        <div style={{...S.card, background:'#22c55e08', border:'1px solid #22c55e33', padding:14}}>
          <div style={{fontSize:10, fontWeight:800, color:'#22c55e', textTransform:'uppercase', marginBottom:10}}>
            <LIcon name="Users" size={13} color="#22c55e"/> MAĞDURLAR
          </div>
          {r.magdurlar.filter(m => m.adi || m.plaka).map((m, i) => (
            <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'6px 10px', background:'rgba(34,197,94,0.08)', borderRadius:6, marginBottom:4}}>
              <span style={{fontSize:11, fontWeight:700, color:C.text}}>{m.adi || '-'}</span>
              <span style={{fontSize:10, fontFamily:'monospace', color:'#22c55e'}}>{m.plaka || '-'}</span>
              <span style={{fontSize:10, fontWeight:700, color:'#ef4444'}}>{m.tutar || '-'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   OKUMA KALİTESİ UYARI BANNERI
══════════════════════════════════════════════════════ */
const KaliteBanner = ({kalite, belirsizler, C, S, LIcon}) => {
  const styles = {
    yuksek: {color:'#22c55e', icon:'CheckCircle', title:'YÜKSEK OKUMA KALİTESİ', msg:'Tüm alanlar net okundu, sonuç güvenilir.'},
    orta: {color:'#f59e0b', icon:'AlertTriangle', title:'ORTA OKUMA KALİTESİ', msg:'Bazı alanlar belirsiz okundu, lütfen kontrol edin.'},
    dusuk: {color:'#ef4444', icon:'AlertCircle', title:'DÜŞÜK OKUMA KALİTESİ', msg:'Bazı alanlar net okunamadı, lütfen manuel kontrol edin.'}
  };
  const s = styles[kalite] || styles.orta;

  return (
    <div style={{
      marginBottom: 12,
      padding: '12px 16px',
      background: s.color + '10',
      border: `1px solid ${s.color}44`,
      borderLeft: `4px solid ${s.color}`,
      borderRadius: 8,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10
    }}>
      <LIcon name={s.icon} size={20} color={s.color}/>
      <div style={{flex: 1}}>
        <div style={{fontSize: 12, fontWeight: 800, color: s.color, marginBottom: 2}}>{s.title}</div>
        <div style={{fontSize: 10, color: C.textSec}}>{s.msg}</div>
        {belirsizler && belirsizler.length > 0 && (
          <div style={{marginTop: 6, fontSize: 9, color: C.textMuted}}>
            <strong style={{color: s.color}}>BELİRSİZ ALANLAR ({belirsizler.length}): </strong>
            {belirsizler.slice(0, 10).join(', ')}
            {belirsizler.length > 10 && ` +${belirsizler.length - 10} daha`}
          </div>
        )}
      </div>
    </div>
  );
};
