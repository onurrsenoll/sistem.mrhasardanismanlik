/**
 * MR HASAR DANIŞMANLIK - QR RUHSAT OKUYUCU v3.0
 * Gelişmiş OCR + QR + Gemini AI hibrit ruhsat okuma sistemi
 * Sıra: 1) Gemini AI (birincil) → 2) QR Kod → 3) Tesseract OCR (tam metin, yedek)
 * v3.0: Sabit bölge bazlı OCR kaldırıldı - gerçek ruhsat fotoğrafları standart
 * boyut/açıda olmadığından sabit koordinatlar yanlış sonuç üretiyordu.
 * Artık Tesseract sadece tam metin OCR + regex ile alan çıkarma kullanır.
 */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useCallback, useRef, useMemo} = React;

/* ═══════════════════════════════════════════════════════════════
   BÖLÜM 1: QR KOD FONKSİYONLARI
   ═══════════════════════════════════════════════════════════════ */

// QR kod verisinden ruhsat bilgilerini parse et
const parseQrData = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  const d = raw.trim();
  let tc = '', plaka = '', belgeSeri = '', sase = '';

  // URL formatı kontrolü
  if (d.includes('http') || d.includes('egm.gov.tr') || d.includes('tescil')) {
    const params = new URLSearchParams(d.split('?')[1] || '');
    tc = params.get('tc') || params.get('vkn') || params.get('kimlikno') || '';
    plaka = params.get('plaka') || params.get('pl') || '';
    belgeSeri = params.get('seri') || params.get('belge') || params.get('belgeno') || '';
    sase = params.get('sase') || params.get('saseno') || '';
  }

  // Pipe/virgül ayrık format
  if (!tc && !plaka) {
    const sep = d.includes('|') ? '|' : d.includes(';') ? ';' : null;
    if (sep) {
      const parts = d.split(sep).map(s => s.trim());
      parts.forEach(p => {
        const clean = p.replace(/[^A-Za-z0-9ÇçĞğİıÖöŞşÜü\s\-\/]/g, '').trim();
        if (!tc && /^\d{11}$/.test(clean)) tc = clean;
        if (!tc && /^\d{10}$/.test(clean)) tc = clean;
        if (!plaka && /^\d{2}\s?[A-ZÇĞİÖŞÜ]{1,4}\s?\d{1,4}$/.test(clean.toUpperCase())) plaka = clean.toUpperCase();
        if (!belgeSeri && /^[A-Z]{2}\s?\d{5,7}$/.test(clean.toUpperCase())) belgeSeri = clean.toUpperCase();
        if (!sase && /^[A-Z0-9]{17}$/i.test(clean)) sase = clean.toUpperCase();
      });
    }
  }

  // Satır bazlı veya tek blok metin
  if (!tc && !plaka) {
    const fullText = d.toUpperCase();
    const tcMatch = fullText.match(/(?:TC|VERGİ|VERGI|KİMLİK|KIMLIK|VKN)[^\d]*(\d{10,11})/i) || fullText.match(/(\d{11})/);
    if (tcMatch) tc = tcMatch[1];
    if (!tc) { const vknMatch = fullText.match(/(\d{10})/); if (vknMatch) tc = vknMatch[1]; }

    const plakaMatch = fullText.match(/(?:PLAKA)[^\d]*(\d{2}\s?[A-ZÇĞİÖŞÜ]{1,4}\s?\d{1,4})/i) || fullText.match(/(\d{2}\s?[A-ZÇĞİÖŞÜ]{1,4}\s?\d{1,4})/);
    if (plakaMatch) plaka = plakaMatch[1].replace(/\s+/g, '');

    const seriMatch = fullText.match(/(?:SERİ|SERI|BELGE)[^\w]*([A-Z]{2})\s*(?:NO|№)?\s*(\d{5,7})/i) || fullText.match(/([A-Z]{2})\s*(\d{6})/);
    if (seriMatch) belgeSeri = seriMatch[1] + ' ' + seriMatch[2];

    const saseMatch = fullText.match(/(?:ŞASE|SASE)[^\w]*([A-Z0-9]{17})/i) || fullText.match(/([A-HJ-NPR-Z0-9]{17})/i);
    if (saseMatch) sase = saseMatch[1].toUpperCase();
  }

  return { tc: tc || '', plaka: plaka || '', belgeSeri: belgeSeri || '', sase: sase || '', raw: d };
};

// Canvas üzerinden QR kodu oku (jsQR)
const readQrFromImage = (imgElement) => {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = imgElement.naturalWidth || imgElement.width;
      canvas.height = imgElement.naturalHeight || imgElement.height;
      ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (typeof jsQR !== 'function') {
        resolve({ success: false, error: 'jsQR KÜTÜPHANESİ YÜKLENEMEDİ' });
        return;
      }

      // Ana tarama
      let code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
      if (code) { resolve({ success: true, data: code.data, location: code.location }); return; }

      // Bölgesel tarama (sağ alt, sağ üst, sol alt, sol üst)
      const regions = [
        { x: Math.floor(canvas.width * 0.5), y: Math.floor(canvas.height * 0.5), w: Math.floor(canvas.width * 0.5), h: Math.floor(canvas.height * 0.5) },
        { x: Math.floor(canvas.width * 0.5), y: 0, w: Math.floor(canvas.width * 0.5), h: Math.floor(canvas.height * 0.5) },
        { x: 0, y: Math.floor(canvas.height * 0.5), w: Math.floor(canvas.width * 0.5), h: Math.floor(canvas.height * 0.5) },
        { x: 0, y: 0, w: Math.floor(canvas.width * 0.5), h: Math.floor(canvas.height * 0.5) },
      ];
      for (const r of regions) {
        const regionData = ctx.getImageData(r.x, r.y, r.w, r.h);
        code = jsQR(regionData.data, r.w, r.h, { inversionAttempts: 'attemptBoth' });
        if (code) { resolve({ success: true, data: code.data, location: code.location }); return; }
      }

      // Kontrast artırarak tekrar dene
      const enhanced = _enhanceForQR(ctx, canvas.width, canvas.height);
      code = jsQR(enhanced.data, enhanced.width, enhanced.height, { inversionAttempts: 'attemptBoth' });
      if (code) { resolve({ success: true, data: code.data, location: code.location }); return; }

      // Farklı ölçeklerde dene
      for (const scale of [1.5, 2, 0.75]) {
        const sw = Math.floor(canvas.width * scale);
        const sh = Math.floor(canvas.height * scale);
        const sCanvas = document.createElement('canvas');
        sCanvas.width = sw; sCanvas.height = sh;
        const sCtx = sCanvas.getContext('2d');
        sCtx.drawImage(imgElement, 0, 0, sw, sh);
        const sData = sCtx.getImageData(0, 0, sw, sh);
        code = jsQR(sData.data, sw, sh, { inversionAttempts: 'attemptBoth' });
        if (code) { resolve({ success: true, data: code.data, location: code.location }); return; }
      }

      resolve({ success: false, error: 'QR KOD BULUNAMADI' });
    } catch (e) {
      resolve({ success: false, error: 'QR İŞLEME HATASI: ' + e.message });
    }
  });
};

// QR için basit kontrast artırma
const _enhanceForQR = (ctx, w, h) => {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    let gray = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114;
    gray = gray > 128 ? 255 : 0;
    data[i] = data[i+1] = data[i+2] = gray;
  }
  return imgData;
};

/* ═══════════════════════════════════════════════════════════════
   BÖLÜM 2: GELİŞMİŞ GÖRÜNTÜ ÖN İŞLEME (TESSERACT İÇİN)
   ═══════════════════════════════════════════════════════════════ */

// Otsu eşikleme - optimum threshold hesapla
const _computeOtsuThreshold = (grayPixels, totalPixels) => {
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < grayPixels.length; i++) histogram[grayPixels[i]]++;

  let sumTotal = 0;
  for (let i = 0; i < 256; i++) sumTotal += i * histogram[i];

  let sumB = 0, wB = 0, wF = 0, maxVariance = 0, threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    wF = totalPixels - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const meanB = sumB / wB;
    const meanF = (sumTotal - sumB) / wF;
    const variance = wB * wF * (meanB - meanF) * (meanB - meanF);

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }
  return threshold;
};

// 3x3 Median filtre (gürültü azaltma)
const _applyMedianFilter = (pixels, w, h) => {
  const output = new Uint8ClampedArray(pixels.length);
  output.set(pixels);
  const neighbors = [];

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      neighbors.length = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          neighbors.push(pixels[((y + dy) * w + (x + dx)) * 4]);
        }
      }
      neighbors.sort((a, b) => a - b);
      const median = neighbors[4];
      const idx = (y * w + x) * 4;
      output[idx] = output[idx+1] = output[idx+2] = median;
    }
  }
  return output;
};

// Keskinleştirme (unsharp mask 3x3)
const _applySharpen = (pixels, w, h) => {
  const output = new Uint8ClampedArray(pixels.length);
  output.set(pixels);
  // Kernel: [0,-1,0],[-1,5,-1],[0,-1,0]
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      const val = -pixels[((y-1)*w+x)*4] - pixels[(y*w+x-1)*4] + 5*pixels[idx] - pixels[(y*w+x+1)*4] - pixels[((y+1)*w+x)*4];
      const clamped = Math.max(0, Math.min(255, val));
      output[idx] = output[idx+1] = output[idx+2] = clamped;
    }
  }
  return output;
};

// Ana ön işleme: Grayscale → Adaptif Kontrast → Otsu Eşikleme → Median Filtre → Keskinleştirme
const preprocessForOcr = (sourceCanvas) => {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;

  // Küçük görselleri büyüt (min 1500px genişlik)
  let workCanvas = sourceCanvas;
  if (w < 1500) {
    const scale = Math.max(1500 / w, 1.5);
    const nw = Math.floor(w * scale);
    const nh = Math.floor(h * scale);
    workCanvas = document.createElement('canvas');
    workCanvas.width = nw;
    workCanvas.height = nh;
    const wCtx = workCanvas.getContext('2d');
    wCtx.drawImage(sourceCanvas, 0, 0, nw, nh);
  }

  const ww = workCanvas.width;
  const wh = workCanvas.height;
  const ctx = workCanvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, ww, wh);
  const data = imgData.data;

  // 1. Grayscale dönüşümü (ITU-R BT.709)
  const grayPixels = new Uint8Array(ww * wh);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const gray = Math.round(data[i] * 0.2126 + data[i+1] * 0.7152 + data[i+2] * 0.0722);
    grayPixels[j] = gray;
    data[i] = data[i+1] = data[i+2] = gray;
  }

  // 2. Adaptif kontrast (histogram stretching %5-%95 percentile)
  const sorted = Array.from(grayPixels).sort((a,b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.05)] || 0;
  const hi = sorted[Math.floor(sorted.length * 0.95)] || 255;
  const range = hi - lo || 1;
  for (let i = 0; i < data.length; i += 4) {
    const stretched = Math.max(0, Math.min(255, Math.round((data[i] - lo) / range * 255)));
    data[i] = data[i+1] = data[i+2] = stretched;
    grayPixels[i/4] = stretched;
  }

  // 3. Otsu eşikleme
  const otsuThreshold = _computeOtsuThreshold(grayPixels, ww * wh);
  for (let i = 0; i < data.length; i += 4) {
    const binary = data[i] > otsuThreshold ? 255 : 0;
    data[i] = data[i+1] = data[i+2] = binary;
  }

  // 4. Median filtre (gürültü azaltma)
  const filtered = _applyMedianFilter(data, ww, wh);

  // 5. Keskinleştirme
  const sharpened = _applySharpen(filtered, ww, wh);

  // Sonucu canvas'a yaz
  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = ww;
  resultCanvas.height = wh;
  const rCtx = resultCanvas.getContext('2d');
  const resultData = rCtx.createImageData(ww, wh);
  for (let i = 0; i < sharpened.length; i += 4) {
    resultData.data[i] = sharpened[i];
    resultData.data[i+1] = sharpened[i+1];
    resultData.data[i+2] = sharpened[i+2];
    resultData.data[i+3] = 255;
  }
  rCtx.putImageData(resultData, 0, 0);

  return resultCanvas;
};

/* ═══════════════════════════════════════════════════════════════
   BÖLÜM 3: TESSERACT OCR (GELİŞMİŞ + BÖLGE BAZLI)
   ═══════════════════════════════════════════════════════════════ */

// v3.0 NOT: Sabit bölge haritası (RUHSAT_REGIONS) kaldırıldı.
// Neden: Gerçek ruhsat fotoğrafları farklı açı, kırpma, eğim, boyut ve
// perspektifle çekildiğinden sabit yüzde koordinatları yanlış bölgeleri
// okuyordu (ör: "KOLTUK SAYISI" soyad olarak, "TOKAT" marka olarak).
// Artık tam metin OCR + regex tabanlı akıllı alan çıkarma kullanılıyor.

// v3.0 NOT: FIELD_VALIDATORS kaldırıldı - bölge bazlı OCR artık kullanılmıyor.
// Tüm alan doğrulama parseOcrText() içindeki regex'ler tarafından yapılıyor.

// Singleton Tesseract worker
let _tesseractWorker = null;
let _tesseractReady = false;

const initTesseractWorker = async (onProgress) => {
  if (_tesseractReady && _tesseractWorker) return _tesseractWorker;
  if (typeof Tesseract === 'undefined') throw new Error('TESSERACT KÜTÜPHANESİ BULUNAMADI');
  _tesseractWorker = await Tesseract.createWorker('tur', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress);
      if (m.status === 'loading language traineddata' && onProgress) onProgress(m.progress * 0.3);
    }
  });
  _tesseractReady = true;
  return _tesseractWorker;
};

// v3.0 NOT: _ocrRegion fonksiyonu kaldırıldı - sabit koordinat tabanlı
// bölge okuma, standart olmayan görüntülerde güvenilir değil.

// Ruhsat alan etiketleri - bunlar veri değil etiket, OCR sonuçlarından filtrelenmeli
const RUHSAT_LABEL_WORDS = [
  'PLAKA', 'MARKASI', 'MARKA', 'MODEL', 'YILI', 'ŞASE', 'SASE', 'NUMARASI',
  'SOYADI', 'SOYADLARI', 'ADI', 'ADLARI', 'TİCARİ', 'ÜNVANI', 'UNVANI',
  'BELGE', 'SERİ', 'SERI', 'TESCIL', 'TARİHİ', 'TARIHI', 'KİMLİK', 'KIMLIK',
  'VERGİ', 'VERGI', 'KOLTUK', 'SAYISI', 'RENK', 'RENGİ', 'RENGI', 'CİNSİ',
  'CINSI', 'TİPİ', 'TIPI', 'MOTOR', 'GÜCÜ', 'GUCU', 'SİLİNDİR', 'SILINDIR',
  'HACİM', 'HACIM', 'NET', 'AĞIRLIK', 'AGIRLIK', 'AZAMI', 'YÜKLÜ', 'YUKLU',
  'İLK', 'ILK', 'ÖRN', 'ORN', 'ÖRNEK', 'ORNEK', 'NO'
];

// OCR sonucundaki alan etiketlerini temizle
const cleanOcrValue = (val) => {
  if (!val) return '';
  let cleaned = val.trim().toUpperCase().replace(/\s+/g, ' ');
  // Tamamen etiket kelimelerinden oluşuyorsa boş döndür
  const words = cleaned.split(/\s+/);
  const nonLabelWords = words.filter(w => !RUHSAT_LABEL_WORDS.includes(w.replace(/[:\-\(\)\.]/g, '')));
  if (nonLabelWords.length === 0) return '';
  return nonLabelWords.join(' ').trim();
};

// Bilinen araç markaları (OCR doğrulama için)
const KNOWN_BRANDS = [
  'TOYOTA', 'HONDA', 'FORD', 'FIAT', 'RENAULT', 'PEUGEOT', 'CITROEN', 'VOLKSWAGEN',
  'VW', 'BMW', 'MERCEDES', 'AUDI', 'OPEL', 'HYUNDAI', 'KIA', 'NISSAN', 'MAZDA',
  'SUZUKI', 'MITSUBISHI', 'SUBARU', 'VOLVO', 'SKODA', 'SEAT', 'DACIA', 'CHEVROLET',
  'JEEP', 'LAND ROVER', 'RANGE ROVER', 'PORSCHE', 'MINI', 'ALFA ROMEO', 'LANCIA',
  'CHRYSLER', 'DODGE', 'CADILLAC', 'LEXUS', 'INFINITI', 'ACURA', 'ISUZU', 'MAN',
  'IVECO', 'SCANIA', 'DAF', 'TEMSA', 'OTOKAR', 'BMC', 'KARSAN', 'TOFAŞ', 'TOFAS',
  'TOGG', 'TESLA', 'BYD', 'CHERY', 'MG', 'GEELY', 'HAVAL', 'GREAT WALL', 'SSANGYONG',
  'CUPRA', 'DS', 'SMART', 'JAGUAR', 'BENTLEY', 'MASERATI', 'FERRARI', 'LAMBORGHINI',
  'ASTON MARTIN', 'LOTUS', 'MCLAREN', 'BUGATTI', 'ROLLS ROYCE', 'LINCOLN',
  'CITROEN', 'CITROËN', 'MERCEDES BENZ', 'MERCEDES-BENZ'
];

// Tam metin OCR'dan 8 alanı çıkar (v3.0 - gelişmiş regex + etiket filtreleme)
const parseOcrText = (text) => {
  if (!text) return {};
  const t = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  let plaka='', marka='', modelYili='', sase='', tc='', soyad='', ad='', belgeSeri='';

  // PLAKA: (A) etiketi veya XX YYY ZZZZ formatı
  const plakaM = t.match(/\(?A\)?\s*(?:PLAKA)?\s*[:\-]?\s*(\d{2}\s?[A-ZÇĞİÖŞÜ]{1,4}\s?\d{1,4})/i) || t.match(/PLAKA\s*[:\-]?\s*(\d{2}\s?[A-ZÇĞİÖŞÜ]{1,4}\s?\d{1,4})/i) || t.match(/(\d{2}\s?[A-ZÇĞİÖŞÜ]{1,4}\s?\d{2,4})/);
  if (plakaM) plaka = plakaM[1].replace(/\s+/g,'').toUpperCase();

  // MARKA: (D.1) etiketi ile, alan etiketlerini filtrele
  const markaM = t.match(/\(?D[\.\s]?1\)?\s*[:\-]?\s*(?:MARKA(?:SI)?)?[:\-]?\s*([A-ZÇĞİÖŞÜa-zçğıöşü\s\-]{2,25}?)(?=\s*\(?[A-Z][\.\s]?\d|\s{2,}|\d{4}|$)/i) || t.match(/MARKA(?:SI)?\s*[:\-]?\s*([A-ZÇĞİÖŞÜ\s\-]{2,25}?)(?=\s*\(?[A-Z][\.\s]?\d|\s{2,}|\d{4}|$)/i);
  if (markaM) {
    let raw = markaM[1].trim().toUpperCase().replace(/\s+/g,' ');
    // Etiket kelimelerini temizle
    raw = cleanOcrValue(raw);
    // Bilinen marka ile eşleşme kontrolü
    if (raw) {
      const matchedBrand = KNOWN_BRANDS.find(b => raw.includes(b));
      marka = matchedBrand || raw;
    }
  }

  // MODEL YILI: (D.4) etiketi veya "MODEL YILI" + 4 haneli yıl
  // "ÖRN:" gibi örnek metinlerini filtrele
  const modelM = t.match(/\(?D[\.\s]?4\)?\s*[:\-]?\s*(?:MODEL\s*Y[İI]L[İI]?)?\s*[:\-]?\s*(?:ÖRN[:\s]*)?((?:19|20)\d{2})/i) || t.match(/MODEL\s*Y[İI]L[İI]?\s*[:\-]?\s*(?:ÖRN[:\s]*)?((?:19|20)\d{2})/i);
  if (modelM) modelYili = modelM[1];

  // ŞASE NO: (E) etiketi + 17 haneli VIN
  const saseM = t.match(/\(?E\)?\s*[:\-]?\s*(?:ŞASE|SASE)?\s*(?:NO|NUMARASI)?\s*[:\-]?\s*([A-HJ-NPR-Z0-9]{17})/i) || t.match(/(?:ŞASE|SASE)\s*(?:NO|NUMARASI)?\s*[:\-]?\s*([A-HJ-NPR-Z0-9]{17})/i) || t.match(/([A-HJ-NPR-Z0-9]{17})/i);
  if (saseM) { let vin = saseM[1].toUpperCase(); sase = vin.replace(/[OQ]/g,'0').replace(/[IL]/g,'1'); }

  // TC / VERGİ NO: (Y.4) etiketi + 10-11 haneli numara
  const tcM = t.match(/\(?Y[\.\s]?4\)?\s*[:\-]?\s*(?:T\.?C\.?\s*K[İI]ML[İI]K|VERG[İI])\s*(?:NO|NUMARASI)?\s*[:\-]?\s*(\d{10,11})/i) || t.match(/(?:T\.?C\.?\s*(?:K[İI]ML[İI]K)?|VERG[İI])\s*(?:NO|NUMARASI)?\s*[:\-]?\s*(\d{10,11})/i) || t.match(/(\d{11})/);
  if (tcM) tc = tcM[1] || tcM[2] || '';
  if (!tc) { const vknM = t.match(/(\d{10})/); if (vknM) tc = vknM[1]; }

  // SOYADI: (C.1.1) etiketi, alan etiketlerini filtrele
  const soyadM = t.match(/\(?C[\.\s]?1[\.\s]?1\)?\s*[:\-]?\s*(?:SOYADI?|T[İI]CAR[İI]\s*[ÜU]NVANI?)\s*[:\-]?\s*([A-ZÇĞİÖŞÜ\s]{2,50}?)(?=\s*\(?[A-Z][\.\s]?\d|\s{2,}|$)/i);
  if (soyadM) {
    soyad = cleanOcrValue(soyadM[1]);
  }

  // ADI: (C.1.2) etiketi, alan etiketlerini filtrele
  const adM = t.match(/\(?C[\.\s]?1[\.\s]?2\)?\s*[:\-]?\s*(?:ADI)?\s*[:\-]?\s*([A-ZÇĞİÖŞÜ\s]{2,30}?)(?=\s*\(?[A-Z][\.\s]?\d|\s{2,}|$)/i);
  if (adM) {
    ad = cleanOcrValue(adM[1]);
  }

  // BELGE SERİ NO: XX + 5-7 haneli numara
  const belgeM = t.match(/(?:BELGE\s*)?SER[İI]\s*(?:NO)?\s*[:\-]?\s*([A-Z]{2})\s*(?:NO|№)?\s*[:\-]?\s*(\d{5,7})/i) || t.match(/([A-Z]{2})\s*(\d{6})/);
  if (belgeM) belgeSeri = belgeM[1].toUpperCase() + ' ' + belgeM[2];

  return { plaka, marka, modelYili, sase, tc, soyad, ad, belgeSeri };
};

// Gelişmiş OCR: ön işleme + TAM METİN TABANLI alan çıkarma
// NOT: v3.0'da bölge bazlı OCR kaldırıldı. Gerçek ruhsat fotoğrafları standart
// boyut/açıda olmadığından sabit koordinatlar (%x, %y) yanlış bölgeleri okuyordu.
// Örn: "KOLTUK SAYISI" soyadı olarak, "TOKAT" marka olarak okunuyordu.
// Artık tüm metin okunup regex ile alanlar çıkarılıyor.
const runEnhancedOcrOnImage = async (imgElement, onProgress) => {
  const worker = await initTesseractWorker(onProgress);

  // Kaynak canvas oluştur
  const srcCanvas = document.createElement('canvas');
  const srcCtx = srcCanvas.getContext('2d');
  srcCanvas.width = imgElement.naturalWidth || imgElement.width;
  srcCanvas.height = imgElement.naturalHeight || imgElement.height;
  srcCtx.drawImage(imgElement, 0, 0, srcCanvas.width, srcCanvas.height);

  // Gelişmiş ön işleme uygula
  if (onProgress) onProgress(0.05);
  const preprocessed = preprocessForOcr(srcCanvas);
  if (onProgress) onProgress(0.20);

  // TAM GÖRÜNTÜ OCR + REGEX TABANLI ALAN ÇIKARMA
  // Bölge bazlı yerine tüm metni okuyup akıllı regex ile alanları çıkar
  let fullResult = {};
  let fullText = '';
  let confidence = 0;
  try {
    const { data: fullOcr } = await worker.recognize(preprocessed);
    fullText = (fullOcr.text || '').toUpperCase();
    confidence = fullOcr.confidence || 0;
    if (onProgress) onProgress(0.80);
    if (confidence >= 20) {
      fullResult = parseOcrText(fullText);
    }
  } catch (e) {
    console.warn('TAM OCR HATASI:', e.message);
  }
  if (onProgress) onProgress(0.95);

  const merged = {};
  const allFields = ['plaka','marka','modelYili','sase','tc','soyad','ad','belgeSeri'];
  allFields.forEach(k => {
    merged[k] = fullResult[k] || '';
  });

  if (onProgress) onProgress(1);

  return {
    ...merged,
    rawText: fullText,
    confidence: confidence,
    regionFields: [],
    source: 'tesseract'
  };
};

/* ═══════════════════════════════════════════════════════════════
   BÖLÜM 4: GEMİNİ VİSİON API (SON ÇARE)
   ═══════════════════════════════════════════════════════════════ */

const runGeminiOcr = async (fileObj, onProgress, customApiKey) => {
  try {
    if (onProgress) onProgress(0.1);
    const fd = new FormData();
    fd.append('dosya_0', fileObj);
    fd.append('dosya_sayisi', '1');
    fd.append('tip', 'ruhsat');
    if (customApiKey) fd.append('api_key', customApiKey);

    const headers = {};
    if (MR.api && MR.api.token) headers['Authorization'] = 'Bearer ' + MR.api.token;

    if (onProgress) onProgress(0.3);
    const resp = await fetch('/api/v1/hesap/ocr-analiz.php', { method: 'POST', headers, body: fd });
    if (onProgress) onProgress(0.7);
    const data = await resp.json();
    if (onProgress) onProgress(0.9);

    if (data.success && data.data) {
      const d = data.data;
      return {
        success: true,
        plaka: (d.plaka || '').toUpperCase().replace(/\s+/g, ''),
        marka: (d.marka || '').toUpperCase(),
        model: (d.model || '').toUpperCase(),
        modelYili: d.modelyili ? String(d.modelyili) : (d.model_yili ? String(d.model_yili) : ''),
        sase: (d.sase || d.sasi_no || '').toUpperCase(),
        tc: d.tc ? String(d.tc) : '',
        soyad: (d.soyad || '').toUpperCase(),
        ad: (d.ad || '').toUpperCase(),
        belgeSeri: (d.belgeseri || d.belge_seri || '').toUpperCase(),
        confidence: d.guven || 85,
        source: 'gemini'
      };
    }
    return { success: false, error: data.error || 'API YANIT HATASI' };
  } catch (e) {
    return { success: false, error: 'API BAĞLANTI HATASI: ' + e.message };
  }
};

/* ═══════════════════════════════════════════════════════════════
   BÖLÜM 5: ANA SAYFA BİLEŞENİ
   ═══════════════════════════════════════════════════════════════ */

MR.QrRuhsatPage = ({setPage, user}) => {
  const {C, S, toast, ICONS} = MR;
  const LIcon = ({name, size=18, color}) => {
    const p = ICONS?.[name];
    return p ? React.createElement('svg', {width:size, height:size, viewBox:'0 0 24 24', fill:'none', stroke:color||'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', dangerouslySetInnerHTML:{__html:p}}) : null;
  };

  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // ═══ MODÜL BAZLI API KEY STATE ═══
  const [ruhsatApiKey, setRuhsatApiKey] = useState('');
  const [apiKeyLoaded, setApiKeyLoaded] = useState(false);
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  // Mount'ta API key yükle
  useEffect(() => {
    (async () => {
      try {
        const r = await MR.api.ayarlarList();
        if (r?.success && r?.data?.qr_ruhsat_gemini_key) {
          setRuhsatApiKey(r.data.qr_ruhsat_gemini_key);
        }
      } catch(e) {}
      setApiKeyLoaded(true);
    })();
  }, []);

  // API key kaydet
  const saveApiKey = useCallback(async () => {
    setApiKeySaving(true);
    try {
      const r = await MR.api.ayarlarGuncelle({ qr_ruhsat_gemini_key: ruhsatApiKey });
      if (r?.success) {
        toast('GEMİNİ API ANAHTARI KAYDEDİLDİ', 'success');
      } else {
        toast(r?.error || 'API ANAHTARI KAYDEDİLEMEDİ', 'error');
      }
    } catch(e) {
      toast('API ANAHTARI KAYDEDİLEMEDİ: ' + e.message, 'error');
    }
    setApiKeySaving(false);
  }, [ruhsatApiKey]);

  // Dosya yükleme
  const handleFiles = useCallback((fileList) => {
    const imgs = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (!imgs.length) { toast('LÜTFEN GÖRSEL DOSYA YÜKLEYİN (JPG, PNG)', 'warning'); return; }
    const newFiles = imgs.map(f => ({
      id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      file: f, name: f.name,
      preview: URL.createObjectURL(f),
      status: 'pending', result: null
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  // Drag & Drop
  const onDragOver = useCallback((e) => { e.preventDefault(); setDragOver(true); }, []);
  const onDragLeave = useCallback(() => setDragOver(false), []);
  const onDrop = useCallback((e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }, [handleFiles]);

  /* ═══ ANA İŞLEM AKIŞI: GEMİNİ (birincil) → QR → OCR (yedek) ═══ */
  const processAll = useCallback(async () => {
    const pending = files.filter(f => f.status === 'pending' || f.status === 'error');
    if (!pending.length) { toast('İŞLENECEK RUHSAT BULUNMUYOR', 'warning'); return; }

    setProcessing(true);

    for (const item of pending) {
      const hasApiKey = !!(ruhsatApiKey && ruhsatApiKey.trim());
      const initSubstatus = hasApiKey ? 'ai' : 'ocr';
      setFiles(prev => prev.map(f => f.id === item.id ? {...f, status: 'processing', substatus: initSubstatus, ocrProgress: 0} : f));

      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = item.preview; });

        const merged = {
          plaka: '', marka: '', modelYili: '', sase: '', tc: '', soyad: '', ad: '', belgeSeri: '',
          raw: '', ocrText: '', ocrConfidence: 0, source: {}
        };
        const allFields = ['plaka','marka','modelYili','sase','tc','soyad','ad','belgeSeri'];

        // ═══ ADIM 1: GEMİNİ AI (API KEY VARSA - BİRİNCİL YÖNTEM) ═══
        let geminiUsed = false;
        if (hasApiKey) {
          try {
            const geminiResult = await Promise.race([
              runGeminiOcr(item.file, (progress) => {
                setFiles(prev => prev.map(f => f.id === item.id ? {...f, ocrProgress: progress} : f));
              }, ruhsatApiKey),
              new Promise((_, reject) => setTimeout(() => reject(new Error('AI ZAMAN AŞIMI')), 45000))
            ]);

            if (geminiResult.success) {
              allFields.forEach(k => {
                if (geminiResult[k]) { merged[k] = geminiResult[k]; merged.source[k] = 'gemini'; }
              });
              merged.ocrConfidence = geminiResult.confidence || 85;
              geminiUsed = true;
            }
          } catch (geminiErr) {
            console.warn('GEMİNİ HATASI:', geminiErr.message);
          }
        }

        // ═══ ADIM 2: QR KOD TARAMA (her zaman - QR kritik alanları override eder) ═══
        setFiles(prev => prev.map(f => f.id === item.id ? {...f, substatus: 'qr', ocrProgress: 0.95} : f));
        const qrResult = await readQrFromImage(img);
        let qrParsed = null;
        if (qrResult.success) {
          qrParsed = parseQrData(qrResult.data);
          merged.raw = qrResult.data;
        }
        if (qrParsed) {
          ['plaka','sase','tc','belgeSeri'].forEach(k => {
            if (qrParsed[k]) { merged[k] = qrParsed[k]; merged.source[k] = 'qr'; }
          });
        }

        // ═══ ADIM 3: TESSERACT OCR (API KEY YOKSA veya Gemini başarısızsa) ═══
        let ocrText = '';
        let ocrConfidence = 0;
        const fieldCountAfterGemini = allFields.filter(k => merged[k]).length;
        const needsOcr = !geminiUsed || fieldCountAfterGemini < 4;

        if (needsOcr) {
          setFiles(prev => prev.map(f => f.id === item.id ? {...f, substatus: 'ocr', ocrProgress: 0} : f));
          try {
            const ocrResult = await Promise.race([
              runEnhancedOcrOnImage(img, (progress) => {
                setFiles(prev => prev.map(f => f.id === item.id ? {...f, ocrProgress: progress} : f));
              }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('OCR ZAMAN AŞIMI')), 60000))
            ]);
            ocrText = ocrResult.rawText || '';
            ocrConfidence = ocrResult.confidence || 0;
            // OCR sadece boş alanları doldurur (Gemini/QR verilerini ezmez)
            allFields.forEach(k => {
              if (!merged[k] && ocrResult[k]) { merged[k] = ocrResult[k]; merged.source[k] = 'ocr'; }
            });
            if (!merged.ocrConfidence) merged.ocrConfidence = ocrConfidence;
          } catch (ocrErr) {
            console.warn('TESSERACT OCR HATASI:', ocrErr.message);
          }
        }

        // ═══ ADIM 4: API KEY YOKSA ve OCR yetersizse Gemini dene ═══
        if (!geminiUsed) {
          const fcAfterOcr = allFields.filter(k => merged[k]).length;
          if (fcAfterOcr < 6 || ocrConfidence < 65) {
            setFiles(prev => prev.map(f => f.id === item.id ? {...f, substatus: 'ai', ocrProgress: 0} : f));
            try {
              const geminiResult = await Promise.race([
                runGeminiOcr(item.file, (progress) => {
                  setFiles(prev => prev.map(f => f.id === item.id ? {...f, ocrProgress: progress} : f));
                }, null),
                new Promise((_, reject) => setTimeout(() => reject(new Error('AI ZAMAN AŞIMI')), 45000))
              ]);
              if (geminiResult.success) {
                allFields.forEach(k => {
                  if (!merged[k] && geminiResult[k]) { merged[k] = geminiResult[k]; merged.source[k] = 'gemini'; }
                });
                merged.ocrConfidence = Math.max(ocrConfidence, geminiResult.confidence || 0);
              }
            } catch (geminiErr) {
              console.warn('GEMİNİ HATASI:', geminiErr.message);
            }
          }
        }

        // ═══ SONUÇ KAYDET ═══
        merged.qrRaw = qrResult.success ? qrResult.data : '';
        merged.ocrText = ocrText;
        const finalFieldCount = allFields.filter(k => merged[k]).length;

        if (finalFieldCount > 0) {
          setFiles(prev => prev.map(f => f.id === item.id ? {
            ...f, status: 'success', substatus: null, ocrProgress: 1, result: merged
          } : f));
        } else {
          setFiles(prev => prev.map(f => f.id === item.id ? {
            ...f, status: 'error', substatus: null,
            result: { error: 'HİÇBİR YÖNTEMLE BİLGİ ÇIKARILAMADI. GÖRSEL KALİTESİNİ KONTROL EDİN.', ocrText, ocrConfidence }
          } : f));
        }
      } catch (e) {
        setFiles(prev => prev.map(f => f.id === item.id ? {
          ...f, status: 'error', substatus: null,
          result: { error: 'GÖRÜNTÜ YÜKLENEMEDİ: ' + e.message }
        } : f));
      }
    }

    setProcessing(false);
    toast('TARAMA TAMAMLANDI', 'success');
  }, [files, ruhsatApiKey]);

  // Tek dosya sil
  const removeFile = useCallback((id) => {
    setFiles(prev => { const f = prev.find(x => x.id === id); if (f?.preview) URL.revokeObjectURL(f.preview); return prev.filter(x => x.id !== id); });
  }, []);

  // Tümünü temizle
  const clearAll = useCallback(() => {
    files.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
    setFiles([]);
  }, [files]);

  // Sonuçları kopyala
  const copyResults = useCallback(() => {
    const success = files.filter(f => f.status === 'success' && f.result);
    if (!success.length) { toast('KOPYALANACAK SONUÇ YOK', 'warning'); return; }
    const text = success.map((f, i) => {
      const r = f.result;
      return `${i+1}. RUHSAT\n` +
        `   (A) PLAKA                       : ${r.plaka || '-'}\n` +
        `   (D.1) MARKASI                   : ${r.marka || '-'}\n` +
        `   (D.4) MODEL YILI                : ${r.modelYili || '-'}\n` +
        `   (E) ŞASE NUMARASI               : ${r.sase || '-'}\n` +
        `   (Y.4) T.C. / VERGİ NO           : ${r.tc || '-'}\n` +
        `   (C.1.1) SOYADI / TİCARİ ÜNVANI  : ${r.soyad || '-'}\n` +
        `   (C.1.2) ADI                      : ${r.ad || '-'}\n` +
        `   BELGE SERİ NO                    : ${r.belgeSeri || '-'}`;
    }).join('\n\n');
    navigator.clipboard.writeText(text).then(() => toast('SONUÇLAR PANOYA KOPYALANDI', 'success'));
  }, [files]);

  // Excel'e aktar
  const exportExcel = useCallback(() => {
    const success = files.filter(f => f.status === 'success' && f.result);
    if (!success.length) { toast('AKTARILACAK SONUÇ YOK', 'warning'); return; }
    const data = success.map((f, i) => ({
      'SIRA': i + 1, '(A) PLAKA': f.result.plaka || '', '(D.1) MARKASI': f.result.marka || '',
      '(D.4) MODEL YILI': f.result.modelYili || '', '(E) ŞASE NUMARASI': f.result.sase || '',
      '(Y.4) T.C. / VERGİ NO': f.result.tc || '', '(C.1.1) SOYADI': f.result.soyad || '',
      '(C.1.2) ADI': f.result.ad || '', 'BELGE SERİ NO': f.result.belgeSeri || '',
      'KAYNAK': Object.values(f.result.source || {}).join(', '),
      'GÜVENİLİRLİK %': f.result.ocrConfidence ? Math.round(f.result.ocrConfidence) : ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{wch:6},{wch:15},{wch:18},{wch:12},{wch:22},{wch:20},{wch:25},{wch:18},{wch:18},{wch:18},{wch:16}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RUHSAT SONUÇLARI');
    XLSX.writeFile(wb, `RUHSAT_SONUC_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast('EXCEL DOSYASI İNDİRİLDİ', 'success');
  }, [files]);

  // Manuel düzenleme
  const updateResult = useCallback((id, field, value) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, result: { ...f.result, [field]: value } } : f));
  }, []);

  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const pendingCount = files.filter(f => f.status === 'pending').length;

  // İşlem durumu metni
  const getStatusText = (item) => {
    if (item.status === 'pending') return 'TARANMAYI BEKLİYOR';
    if (item.status === 'processing') {
      if (item.substatus === 'ocr') return `OCR METİN TANIMA... %${Math.round((item.ocrProgress || 0) * 100)}`;
      if (item.substatus === 'qr') return 'QR KOD TARANIYOR...';
      if (item.substatus === 'ai') return `GEMİNİ AI ANALİZ... %${Math.round((item.ocrProgress || 0) * 100)}`;
      return 'İŞLENİYOR...';
    }
    if (item.status === 'success') return `BAŞARILI - ${['plaka','marka','modelYili','sase','tc','soyad','ad','belgeSeri'].filter(k => item.result?.[k]).length}/8 ALAN OKUNDU`;
    return 'HATA - ' + (item.result?.error || 'BİLGİ ÇIKARILAMADI');
  };

  /* ═══ RENDER ═══ */
  return React.createElement('div', {style: {padding: '24px 20px', maxWidth: 1400, margin: '0 auto'}},

    /* BAŞLIK */
    React.createElement('div', {style: {display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 24, flexWrap:'wrap', gap: 12}},

      /* Sol: İkon + Başlık */
      React.createElement('div', {style: {display:'flex', alignItems:'center', gap: 12}},
        React.createElement('div', {style: {
          width: 48, height: 48, borderRadius: 14,
          background: `linear-gradient(135deg, ${C.accent}, ${C.accentHover || C.accent})`,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow: `0 8px 24px ${C.accent}33`
        }}, React.createElement(LIcon, {name:'QrCode', size:26, color:'#fff'})),
        React.createElement('div', null,
          React.createElement('h1', {style: {fontSize: 22, fontWeight: 900, color: C.text, margin: 0}}, 'QR RUHSAT OKUYUCU'),
          React.createElement('p', {style: {fontSize: 12, color: C.textMuted, margin: 0, fontWeight: 600}}, 'GEMİNİ AI + QR + OCR RUHSAT BİLGİ ÇIKARMA')
        )
      ),

      /* Orta: Gemini API Key Alanı */
      React.createElement('div', {style: {
        display:'flex', alignItems:'center', gap: 6,
        background: C.bgCard, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: '8px 12px',
        flex: '0 1 auto', maxWidth: 420
      }},
        React.createElement(LIcon, {name:'Key', size:14, color: ruhsatApiKey ? (C.success || '#10b981') : C.textMuted}),
        React.createElement('input', {
          value: ruhsatApiKey,
          onChange: (e) => setRuhsatApiKey(e.target.value),
          placeholder: 'Gemini API Key (aistudio.google.com)',
          type: apiKeyVisible ? 'text' : 'password',
          style: {
            background: 'transparent', border: 'none', outline: 'none',
            fontSize: 11, fontFamily: 'monospace', color: C.text,
            padding: '4px 6px', width: 220, letterSpacing: 0.5
          }
        }),
        React.createElement('button', {
          onClick: () => setApiKeyVisible(!apiKeyVisible),
          style: {background:'transparent', border:'none', cursor:'pointer', padding:2, display:'flex'}
        }, React.createElement(LIcon, {name: apiKeyVisible ? 'EyeOff' : 'Eye', size:13, color: C.textMuted})),
        React.createElement('button', {
          onClick: saveApiKey,
          disabled: apiKeySaving,
          style: {
            background: C.accent, color:'#fff', border:'none', borderRadius:6,
            padding:'5px 10px', fontSize:10, fontWeight:800, cursor:'pointer',
            display:'flex', alignItems:'center', gap:3, whiteSpace:'nowrap',
            opacity: apiKeySaving ? 0.6 : 1
          }
        },
          React.createElement(LIcon, {name:'Save', size:11, color:'#fff'}),
          apiKeySaving ? '...' : 'KAYDET'
        )
      ),

      /* Sağ: Aksiyon butonları */
      files.length > 0 && React.createElement('div', {style: {display:'flex', gap: 8, flexWrap:'wrap'}},
        React.createElement('button', {
          onClick: copyResults, disabled: !successCount,
          style: {...S.btn, ...(S.btnSuccess || {background: C.success || '#10b981'}), padding:'10px 18px', borderRadius:10, color:'#fff', fontSize:12, fontWeight:800, cursor: successCount ? 'pointer' : 'not-allowed', opacity: successCount ? 1 : 0.5, border:'none', display:'flex', alignItems:'center', gap:6}
        }, React.createElement(LIcon, {name:'Copy', size:15, color:'#fff'}), 'KOPYALA'),
        React.createElement('button', {
          onClick: exportExcel, disabled: !successCount,
          style: {...S.btn, background:'#059669', padding:'10px 18px', borderRadius:10, color:'#fff', fontSize:12, fontWeight:800, cursor: successCount ? 'pointer' : 'not-allowed', opacity: successCount ? 1 : 0.5, border:'none', display:'flex', alignItems:'center', gap:6}
        }, React.createElement(LIcon, {name:'FileSpreadsheet', size:15, color:'#fff'}), 'EXCEL İNDİR'),
        React.createElement('button', {
          onClick: clearAll,
          style: {...S.btn, background: C.danger || '#ef4444', padding:'10px 18px', borderRadius:10, color:'#fff', fontSize:12, fontWeight:800, cursor:'pointer', border:'none', display:'flex', alignItems:'center', gap:6}
        }, React.createElement(LIcon, {name:'Trash2', size:15, color:'#fff'}), 'TEMİZLE')
      )
    ),

    /* İSTATİSTİK KARTLARI */
    files.length > 0 && React.createElement('div', {style: {display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:12, marginBottom:20}},
      [{label:'TOPLAM', val: files.length, color: C.accent, icon:'Image'},
       {label:'BAŞARILI', val: successCount, color: C.success || '#10b981', icon:'CheckCircle'},
       {label:'HATA', val: errorCount, color: C.danger || '#ef4444', icon:'AlertCircle'},
       {label:'BEKLEYEN', val: pendingCount, color: C.warning || '#f59e0b', icon:'Clock'}
      ].map((s, i) => React.createElement('div', {key:i, style: {
        ...S.card, padding:'16px 18px', display:'flex', alignItems:'center', gap:12
      }},
        React.createElement('div', {style: {
          width:40, height:40, borderRadius:10,
          background: s.color + '18', display:'flex', alignItems:'center', justifyContent:'center'
        }}, React.createElement(LIcon, {name:s.icon, size:20, color:s.color})),
        React.createElement('div', null,
          React.createElement('div', {style: {fontSize:22, fontWeight:900, color:s.color}}, s.val),
          React.createElement('div', {style: {fontSize:10, fontWeight:700, color:C.textMuted}}, s.label)
        )
      ))
    ),

    /* YÜKLEME ALANI */
    React.createElement('div', {
      onDragOver, onDragLeave, onDrop,
      onClick: () => fileInputRef.current?.click(),
      style: {
        ...S.card, padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
        border: `2px dashed ${dragOver ? C.accent : C.border}`,
        background: dragOver ? (C.accent + '08') : C.bgCard,
        transition: 'all 0.3s ease', marginBottom: 20
      }
    },
      React.createElement('input', { ref: fileInputRef, type: 'file', accept: 'image/*', multiple: true, style: {display:'none'}, onChange: (e) => { handleFiles(e.target.files); e.target.value = ''; } }),
      React.createElement('input', { ref: cameraInputRef, type: 'file', accept: 'image/*', capture: 'environment', style: {display:'none'}, onChange: (e) => { handleFiles(e.target.files); e.target.value = ''; } }),
      React.createElement('div', {style: {
        width: 72, height: 72, borderRadius: '50%', background: C.accent + '15',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
      }}, React.createElement(LIcon, {name:'Upload', size:32, color: C.accent})),
      React.createElement('div', {style: {fontSize: 16, fontWeight: 900, color: C.text, marginBottom: 6}}, 'ARAÇ RUHSATI GÖRSELLERİNİ YÜKLEYİN'),
      React.createElement('div', {style: {fontSize: 12, color: C.textMuted, fontWeight: 600, marginBottom: 16}}, 'SÜRÜKLE & BIRAK VEYA TIKLA • TOPLU YÜKLEME DESTEKLİ • JPG, PNG, WEBP'),
      React.createElement('div', {style: {display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap'}},
        React.createElement('button', {
          onClick: (e) => { e.stopPropagation(); fileInputRef.current?.click(); },
          style: {background: C.accent, color:'#fff', border:'none', borderRadius:10, padding:'12px 24px', fontSize:13, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:8}
        }, React.createElement(LIcon, {name:'Image', size:18, color:'#fff'}), 'DOSYA SEÇ'),
        React.createElement('button', {
          onClick: (e) => { e.stopPropagation(); cameraInputRef.current?.click(); },
          style: {background: C.success || '#10b981', color:'#fff', border:'none', borderRadius:10, padding:'12px 24px', fontSize:13, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:8}
        }, React.createElement(LIcon, {name:'Camera', size:18, color:'#fff'}), 'KAMERA ÇEK')
      )
    ),

    /* TARA BUTONU */
    files.length > 0 && pendingCount > 0 && React.createElement('div', {style: {textAlign:'center', marginBottom: 20}},
      React.createElement('button', {
        onClick: processAll, disabled: processing,
        style: {
          background: processing ? C.textMuted : `linear-gradient(135deg, ${C.accent}, ${C.accentHover || '#3b82f6'})`,
          color:'#fff', border:'none', borderRadius:14, padding:'16px 48px', fontSize:15, fontWeight:900,
          cursor: processing ? 'not-allowed' : 'pointer',
          boxShadow: `0 8px 32px ${C.accent}44`,
          display:'inline-flex', alignItems:'center', gap:10, transition:'all 0.3s ease'
        }
      },
        processing
          ? React.createElement('div', {style: {width:20, height:20, border:'3px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.8s linear infinite'}})
          : React.createElement(LIcon, {name:'ScanLine', size:22, color:'#fff'}),
        processing ? `TARANIYOR... (${files.filter(f=>f.status==='processing').length}/${pendingCount})` : `${pendingCount} RUHSATI TARA (OCR → QR → AI)`
      )
    ),

    /* SONUÇLAR LİSTESİ */
    files.length > 0 && React.createElement('div', {style: {display:'grid', gap: 16}},
      files.map((item, idx) => React.createElement('div', {
        key: item.id,
        style: {
          ...S.card,
          border: `1px solid ${item.status === 'success' ? (C.success || '#10b981') + '40' : item.status === 'error' ? (C.danger || '#ef4444') + '40' : item.status === 'processing' ? C.accent + '40' : C.border}`,
          animation: 'fadeIn 0.3s ease'
        }
      },
        /* KART BAŞLIĞI */
        React.createElement('div', {style: {
          ...S.cardHead,
          background: item.status === 'success' ? (C.success || '#10b981') + '08' : item.status === 'error' ? (C.danger || '#ef4444') + '08' : 'transparent'
        }},
          React.createElement('div', {style: {
            width:32, height:32, borderRadius:8,
            background: item.status === 'success' ? (C.success||'#10b981')+'20' : item.status === 'error' ? (C.danger||'#ef4444')+'20' : item.status === 'processing' ? C.accent+'20' : C.border+'40',
            display:'flex', alignItems:'center', justifyContent:'center'
          }},
            item.status === 'processing'
              ? React.createElement('div', {style: {width:16, height:16, border:`2px solid ${C.accent}40`, borderTopColor:C.accent, borderRadius:'50%', animation:'spin 0.8s linear infinite'}})
              : React.createElement(LIcon, { name: item.status === 'success' ? 'CheckCircle' : item.status === 'error' ? 'AlertCircle' : 'Image', size:16, color: item.status === 'success' ? (C.success||'#10b981') : item.status === 'error' ? (C.danger||'#ef4444') : C.textMuted })
          ),
          React.createElement('div', {style: {flex:1}},
            React.createElement('div', {style: {fontSize:13, fontWeight:800, color:C.text}}, `${idx+1}. ${item.name}`),
            React.createElement('div', {style: {fontSize:10, fontWeight:600, color:C.textMuted}}, getStatusText(item))
          ),
          React.createElement('button', {
            onClick: () => removeFile(item.id),
            style: {background:'transparent', border:'none', cursor:'pointer', padding:4}
          }, React.createElement(LIcon, {name:'X', size:18, color: C.danger || '#ef4444'}))
        ),

        /* İÇERİK: Görsel + Sonuç */
        React.createElement('div', {style: {
          ...S.cardBody,
          display: 'grid',
          gridTemplateColumns: window.innerWidth > 768 ? '200px 1fr' : '1fr',
          gap: 20
        }},
          /* Görsel önizleme */
          React.createElement('div', {style: {
            borderRadius:12, overflow:'hidden', border:`1px solid ${C.border}`,
            background: C.bgInput || '#1e293b',
            display:'flex', alignItems:'center', justifyContent:'center', minHeight:140
          }},
            React.createElement('img', { src: item.preview, style: {width:'100%', height:'auto', maxHeight:260, objectFit:'contain', display:'block'} })
          ),

          /* Sonuç alanları */
          item.status === 'success' && item.result
            ? React.createElement('div', {style: {display:'grid', gap: 12}},
                [
                  {key:'plaka',     label:'(A) PLAKA',                       icon:'Car',        placeholder:'Örn: 34ABC123'},
                  {key:'marka',     label:'(D.1) MARKASI',                   icon:'Tag',        placeholder:'Örn: TOYOTA'},
                  {key:'modelYili', label:'(D.4) MODEL YILI',                icon:'Calendar',   placeholder:'Örn: 2020'},
                  {key:'sase',      label:'(E) ŞASE NUMARASI',              icon:'Hash',       placeholder:'17 karakterli şase numarası'},
                  {key:'tc',        label:'(Y.4) T.C. / VERGİ NO',          icon:'CreditCard', placeholder:'10-11 haneli'},
                  {key:'soyad',     label:'(C.1.1) SOYADI / TİCARİ ÜNVANI', icon:'User',       placeholder:'Soyadı veya ticari ünvan'},
                  {key:'ad',        label:'(C.1.2) ADI',                     icon:'User',       placeholder:'Adı'},
                  {key:'belgeSeri', label:'BELGE SERİ NO',                   icon:'FileText',   placeholder:'Örn: HD 120077'}
                ].map(field => React.createElement('div', {key:field.key},
                  React.createElement('label', {style: {fontSize:10, fontWeight:800, color:C.textMuted, marginBottom:4, display:'flex', alignItems:'center', gap:4}},
                    React.createElement(LIcon, {name:field.icon, size:12, color:C.accent}),
                    field.label,
                    /* Kaynak rozeti (QR / OCR / AI) */
                    item.result.source?.[field.key] === 'qr'
                      ? React.createElement('span', {style: {fontSize:8, fontWeight:900, background:(C.success||'#10b981')+'25', color:C.success||'#10b981', padding:'1px 5px', borderRadius:4, marginLeft:4}}, 'QR')
                      : item.result.source?.[field.key] === 'gemini'
                        ? React.createElement('span', {style: {fontSize:8, fontWeight:900, background:'#8b5cf6'+'25', color:'#8b5cf6', padding:'1px 5px', borderRadius:4, marginLeft:4}}, 'AI')
                        : item.result.source?.[field.key] === 'ocr'
                          ? React.createElement('span', {style: {fontSize:8, fontWeight:900, background:C.accent+'25', color:C.accent, padding:'1px 5px', borderRadius:4, marginLeft:4}}, 'OCR')
                          : null
                  ),
                  React.createElement('input', {
                    value: item.result[field.key] || '',
                    onChange: (e) => updateResult(item.id, field.key, e.target.value),
                    placeholder: field.placeholder,
                    style: {
                      ...S.input, fontSize:14, fontWeight:800, padding:'10px 14px',
                      background: item.result[field.key] ? (C.success || '#10b981') + '08' : C.bgInput,
                      borderColor: item.result[field.key] ? (C.success || '#10b981') + '30' : C.border
                    }
                  })
                )),
                /* QR Ham Veri */
                item.result.qrRaw && React.createElement('details', {style: {marginTop:4}},
                  React.createElement('summary', {style: {fontSize:10, fontWeight:700, color:C.textMuted, cursor:'pointer', userSelect:'none'}}, 'QR HAM VERİ'),
                  React.createElement('pre', {style: { fontSize:10, color:C.textMuted, marginTop:6, padding:10, borderRadius:8, background:C.bgInput||'#1e293b', border:`1px solid ${C.border}`, whiteSpace:'pre-wrap', wordBreak:'break-all', maxHeight:120, overflow:'auto' }}, item.result.qrRaw || '-')
                ),
                /* OCR Ham Metin */
                item.result.ocrText && React.createElement('details', {style: {marginTop:4}},
                  React.createElement('summary', {style: {fontSize:10, fontWeight:700, color:C.textMuted, cursor:'pointer', userSelect:'none'}},
                    `OCR HAM METİN (GÜVENİLİRLİK: %${Math.round(item.result.ocrConfidence || 0)})`
                  ),
                  React.createElement('pre', {style: { fontSize:10, color:C.textMuted, marginTop:6, padding:10, borderRadius:8, background:C.bgInput||'#1e293b', border:`1px solid ${C.border}`, whiteSpace:'pre-wrap', wordBreak:'break-all', maxHeight:120, overflow:'auto' }}, item.result.ocrText || '-')
                )
              )
            : item.status === 'error'
              ? React.createElement('div', {style: {display:'flex', alignItems:'center', justifyContent:'center', color: C.danger || '#ef4444', fontSize:13, fontWeight:700, gap:8}},
                  React.createElement(LIcon, {name:'AlertTriangle', size:20, color: C.danger || '#ef4444'}),
                  React.createElement('div', null,
                    React.createElement('div', null, item.result?.error || 'BİLGİ ÇIKARILAMADI'),
                    React.createElement('div', {style: {fontSize:10, color:C.textMuted, marginTop:4, fontWeight:600}}, 'GÖRSEL KALİTESİNİ KONTROL EDİN, NET VE AYDINLIK BİR FOTOĞRAF YÜKLEYİN')
                  )
                )
              : item.status === 'processing'
                ? React.createElement('div', {style: {display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, padding:20}},
                    React.createElement('div', {style: {display:'flex', alignItems:'center', gap:10}},
                      React.createElement('div', {style: {width:24, height:24, border:`3px solid ${C.accent}30`, borderTopColor:C.accent, borderRadius:'50%', animation:'spin 0.8s linear infinite'}}),
                      React.createElement('span', {style: {fontSize:13, fontWeight:700, color:C.accent}}, getStatusText(item))
                    ),
                    (item.substatus === 'ocr' || item.substatus === 'ai') && React.createElement('div', {style: {width:'100%', maxWidth:300}},
                      React.createElement('div', {style: {height:6, borderRadius:3, background:C.accent+'20', overflow:'hidden'}},
                        React.createElement('div', {style: {height:'100%', borderRadius:3, background:C.accent, width:`${Math.round((item.ocrProgress || 0) * 100)}%`, transition:'width 0.3s ease'}})
                      ),
                      React.createElement('div', {style: {display:'flex', justifyContent:'space-between', marginTop:4, fontSize:9, color:C.textMuted, fontWeight:600}},
                        React.createElement('span', null, item.substatus === 'ocr' ? 'ADIM 1/3: OCR' : item.substatus === 'qr' ? 'ADIM 2/3: QR' : 'ADIM 3/3: AI'),
                        React.createElement('span', null, `%${Math.round((item.ocrProgress || 0) * 100)}`)
                      )
                    )
                  )
                : React.createElement('div', {style: {display:'flex', alignItems:'center', justifyContent:'center', color:C.textMuted, fontSize:12, fontWeight:600}},
                    '"TARA" BUTONUNA BASARAK OKUMA BAŞLATIN'
                  )
        )
      ))
    ),

    /* BOŞ DURUM */
    files.length === 0 && React.createElement('div', {style: { ...S.card, padding:'60px 20px', textAlign:'center' }},
      React.createElement('div', {style: {
        width:80, height:80, borderRadius:'50%', background:C.accent+'12',
        display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px'
      }}, React.createElement(LIcon, {name:'QrCode', size:36, color:C.accent})),
      React.createElement('div', {style: {fontSize:16, fontWeight:900, color:C.text, marginBottom:8}}, 'ARAÇ RUHSATI OKUYUCU'),
      React.createElement('div', {style: {fontSize:12, color:C.textMuted, fontWeight:600, maxWidth:500, margin:'0 auto', lineHeight:1.8}},
        'ARAÇ RUHSATI GÖRSELLERİNİ YÜKLEYİN. SİSTEM ÜÇ AŞAMALI TARAMA YAPAR: 1) GELİŞMİŞ OCR (ÖN İŞLEME + BÖLGE BAZLI) 2) QR KOD OKUMA 3) GEMİNİ AI ANALİZİ. TOPLU YÜKLEME İLE BİRDEN FAZLA RUHSATI AYNI ANDA İŞLEYEBİLİRSİNİZ.'
      ),
      React.createElement('div', {style: {display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:12, marginTop:28, maxWidth:650, margin:'28px auto 0'}},
        [
          {icon:'ScanLine', text:'GELİŞMİŞ OCR TANIMA', desc:'Otsu eşikleme + bölge bazlı'},
          {icon:'QrCode', text:'QR KOD OKUMA', desc:'Çoklu bölge tarama'},
          {icon:'Sparkles', text:'GEMİNİ AI ANALİZ', desc:'Son çare yapay zeka'},
          {icon:'Upload', text:'TOPLU YÜKLEME', desc:'Sürükle bırak destekli'},
          {icon:'FileSpreadsheet', text:'EXCEL AKTARIM', desc:'Sonuçları dışa aktar'},
          {icon:'Key', text:'ÖZEL API KEY', desc:'Modül bazlı Gemini key'}
        ].map((f, i) => React.createElement('div', {key:i, style: {
          padding:'14px 12px', borderRadius:12,
          background: C.accent + '08', border: `1px solid ${C.accent}15`,
          display:'flex', alignItems:'center', gap:8
        }},
          React.createElement(LIcon, {name:f.icon, size:16, color:C.accent}),
          React.createElement('div', null,
            React.createElement('div', {style: {fontSize:11, fontWeight:700, color:C.text}}, f.text),
            React.createElement('div', {style: {fontSize:9, fontWeight:600, color:C.textMuted}}, f.desc)
          )
        ))
      )
    )
  );
};
