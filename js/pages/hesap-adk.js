const MR = window.MR || (window.MR = {});
const {useState, useEffect, useCallback, useRef} = React;

/* ═══════════════════════════════════════════════════════════
   ADK HESAPLAMA - GERÇEK PİYASA RAYİÇ + 3 YÖNTEM HESAPLAMA
   sahibinden.com + araban.com İLAN ARAŞTIRMASI
   TAHKİM FORMÜLÜ + YARGITAY İÇTİHADI + TAHKİM EMSAL
   ═══════════════════════════════════════════════════════════ */

/* ──────── YARDIMCI ──────── */
const fmtM = n => (n || 0).toLocaleString('tr-TR') + ' TL';
const pct = n => (n * 100).toFixed(1) + '%';

/* ──────── 1. TAHKİM FORMÜLÜ (2024-2026 Güncel Katsayılar) ──────── */
const hesaplaTahkim = (rayic, onarim, yil, km, onceki, bolge, kusur) => {
  const aracYasi = new Date().getFullYear() - yil;
  const hasarOrani = rayic > 0 ? onarim / rayic : 0;

  // BAZ DEĞER KAYBI ORANI (2024-2026 Tahkim kararları güncel)
  const bazOran = hasarOrani <= 0.03 ? 0.03
    : hasarOrani <= 0.05 ? 0.05
    : hasarOrani <= 0.10 ? 0.07
    : hasarOrani <= 0.15 ? 0.10
    : hasarOrani <= 0.20 ? 0.13
    : hasarOrani <= 0.25 ? 0.15
    : hasarOrani <= 0.30 ? 0.17
    : hasarOrani <= 0.40 ? 0.19
    : 0.22;

  // YAŞ KATSAYISI (0-15 yıl detaylı)
  const yasK = aracYasi <= 0 ? 1.00
    : aracYasi <= 1 ? 1.00
    : aracYasi <= 2 ? 0.96
    : aracYasi <= 3 ? 0.91
    : aracYasi <= 4 ? 0.86
    : aracYasi <= 5 ? 0.80
    : aracYasi <= 6 ? 0.73
    : aracYasi <= 7 ? 0.66
    : aracYasi <= 8 ? 0.58
    : aracYasi <= 9 ? 0.50
    : aracYasi <= 10 ? 0.43
    : aracYasi <= 12 ? 0.35
    : aracYasi <= 15 ? 0.25
    : 0.18;

  // KM KATSAYISI (detaylı kademelendirme)
  const kmK = km < 10000 ? 1.00
    : km < 30000 ? 0.98
    : km < 50000 ? 0.95
    : km < 75000 ? 0.90
    : km < 100000 ? 0.85
    : km < 130000 ? 0.78
    : km < 160000 ? 0.70
    : km < 200000 ? 0.60
    : km < 250000 ? 0.50
    : 0.40;

  // BÖLGE KATSAYISI (çoklu bölge desteği)
  const bolgeK = {on: 1.00, on_yan: 0.95, yan: 0.90, arka: 0.85, arka_yan: 0.82, tavan: 0.75, alt: 0.70}[bolge] || 0.90;

  // ÖNCEKİ HASAR (0-5+ seviye)
  const oncekiK = onceki === 0 ? 1.00 : onceki === 1 ? 0.82 : onceki === 2 ? 0.68 : onceki === 3 ? 0.55 : onceki === 4 ? 0.42 : 0.30;

  const degerKaybi = Math.round(rayic * bazOran * yasK * kmK * bolgeK * oncekiK);
  const kusurSonrasi = Math.round(degerKaybi * (kusur / 100));

  return {
    ad: 'TAHKİM FORMÜLÜ',
    aciklama: 'Sigorta Tahkim Komisyonu hesaplama yöntemi (2024-2026 güncel)',
    degerKaybi, kusurSonrasi, bazOran, yasK, kmK, bolgeK, oncekiK, hasarOrani, aracYasi,
    formul: `DK = Rayiç (${fmtM(rayic)}) × Baz Oran (%${(bazOran*100).toFixed(1)}) × Yaş K. (${yasK.toFixed(2)}) × KM K. (${kmK.toFixed(2)}) × Bölge K. (${bolgeK.toFixed(2)}) × Önceki K. (${oncekiK.toFixed(2)})`
  };
};

/* ──────── 2. YARGITAY İÇTİHADI (17. HD / 4. HD Güncel) ──────── */
const hesaplaYargitay = (rayic, onarim, yil, km, onceki, bolge, kusur) => {
  const aracYasi = new Date().getFullYear() - yil;
  const hasarOrani = rayic > 0 ? onarim / rayic : 0;

  // HASAR ETKİ ORANI (Yargıtay 17. HD / 4. HD kararları - 2024-2026 güncel)
  const hasarEtkisi = hasarOrani <= 0.03 ? 0.04
    : hasarOrani <= 0.05 ? 0.06
    : hasarOrani <= 0.10 ? 0.09
    : hasarOrani <= 0.15 ? 0.12
    : hasarOrani <= 0.20 ? 0.15
    : hasarOrani <= 0.25 ? 0.18
    : hasarOrani <= 0.30 ? 0.20
    : hasarOrani <= 0.40 ? 0.23
    : 0.26;

  // YIPRANMA PAYI (yaş + km bazlı - 2026 güncel oranlar)
  const yasYipranma = Math.min(aracYasi * 0.035, 0.40);
  const kmYipranma = Math.min(Math.floor(km / 50000) * 0.025, 0.20);
  const toplamYipranma = Math.min(yasYipranma + kmYipranma, 0.50);

  // BÖLGE KATSAYISI (Yargıtay)
  const bolgeK = {on: 1.00, on_yan: 0.96, yan: 0.92, arka: 0.88, arka_yan: 0.85, tavan: 0.78, alt: 0.72}[bolge] || 0.90;

  // ÖNCEKİ HASAR (Yargıtay)
  const oncekiK = onceki === 0 ? 1.00 : onceki === 1 ? 0.82 : onceki === 2 ? 0.68 : onceki === 3 ? 0.55 : onceki === 4 ? 0.42 : 0.30;

  const degerKaybi = Math.round(rayic * hasarEtkisi * (1 - toplamYipranma) * bolgeK * oncekiK);
  const kusurSonrasi = Math.round(degerKaybi * (kusur / 100));

  return {
    ad: 'YARGITAY İÇTİHADI',
    aciklama: 'Yargıtay 17. HD / 4. HD Kesinti Yöntemi',
    degerKaybi, kusurSonrasi, hasarEtkisi, yasYipranma, kmYipranma, toplamYipranma, bolgeK, oncekiK, hasarOrani: onarim/rayic, aracYasi,
    formul: `DK = Rayiç (${fmtM(rayic)}) × Hasar Etkisi (%${(hasarEtkisi*100).toFixed(0)}) × (1 - Yıpranma %${(toplamYipranma*100).toFixed(0)}) × Bölge K. (${bolgeK.toFixed(2)}) × Önceki K. (${oncekiK.toFixed(2)})`
  };
};

/* ═══════════════════════════════════════════════════════════
   ANA COMPONENT
   ═══════════════════════════════════════════════════════════ */
MR.HesapADKPage = ({setPage, user}) => {
  const C = MR.C, S = MR.S;
  const hy = (k) => MR.hasYetki(user, 'hesaplamalar', k);

  /* FORM */
  const [marka, setMarka] = useState('');
  const [model, setModel] = useState('');
  const [yil, setYil] = useState('');
  const [km, setKm] = useState('');
  const [kazaTarihi, setKazaTarihi] = useState('');
  const [onarim, setOnarim] = useState('');
  const [kusur, setKusur] = useState('100');
  const [onceki, setOnceki] = useState('0');
  const [bolge, setBolge] = useState('on');
  const [plaka, setPlaka] = useState('');

  /* RAYİÇ ARAŞTIRMA */
  const [rayicLoading, setRayicLoading] = useState(false);
  const [rayicData, setRayicData] = useState(null);
  const [rayicDeger, setRayicDeger] = useState('');

  /* TAHKİM EMSAL */
  const [emsalLoading, setEmsalLoading] = useState(false);
  const [emsalData, setEmsalData] = useState(null);

  /* HESAPLAMA SONUÇLARI */
  const [tahkimSonuc, setTahkimSonuc] = useState(null);
  const [yargitaySonuc, setYargitaySonuc] = useState(null);
  const [emsalSonuc, setEmsalSonuc] = useState(null);
  const [hesapLoading, setHesapLoading] = useState(false);

  /* AI */
  const [aiAnaliz, setAiAnaliz] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  /* PDF */
  const [pdfLoading, setPdfLoading] = useState(false);

  /* modeller artık AracModelSelect ile yükleniyor */
  const yillar = [];
  for (let y = new Date().getFullYear(); y >= 2005; y--) yillar.push(y);

  /* ──────── RAYİÇ ARAŞTIR ──────── */
  const rayicArastir = async () => {
    if (!marka || !model || !yil || !km) { alert('MARKA, MODEL, YIL VE KM GİRİNİZ'); return; }
    setRayicLoading(true);
    setRayicData(null);
    try {
      const r = await MR.api.rayicArastir({
        marka, model, yil: parseInt(yil), km: MR.parseNum(km),
        kaza_tarihi: kazaTarihi || new Date(Date.now() - 180*86400000).toISOString().split('T')[0]
      });
      if (r?.success && r.data) {
        setRayicData(r.data);
        // Ortalama varsa direkt ata, yoksa ilanlardan hesapla
        let rayicDegerHesap = r.data.ortalama || 0;
        if (!rayicDegerHesap && r.data.ilanlar?.length > 0) {
          const fiyatlar = r.data.ilanlar.map(il => il.fiyat || 0).filter(f => f > 0).sort((a,b) => b-a).slice(0,5);
          if (fiyatlar.length > 0) rayicDegerHesap = Math.round(fiyatlar.reduce((t,f) => t+f, 0) / fiyatlar.length);
        }
        if (!rayicDegerHesap && r.data.en_yuksek > 0) {
          rayicDegerHesap = Math.round((r.data.en_yuksek + (r.data.en_dusuk || r.data.en_yuksek)) / 2);
        }
        if (rayicDegerHesap > 0) {
          setRayicDeger(MR.fmtInput(String(rayicDegerHesap)));
        }
      } else {
        alert(r?.error || 'RAYİÇ ARAŞTIRMA HATASI');
      }
    } catch (e) { alert('RAYİÇ ARAŞTIRMA HATASI: ' + e.message); }
    setRayicLoading(false);
  };

  /* ──────── HESAPLA (3 YÖNTEM + EMSAL) ──────── */
  const hesapla = async () => {
    const r = MR.parseNum(rayicDeger), o = MR.parseNum(onarim);
    if (!marka || !yil || !r || !o) { alert('MARKA, YIL, RAYİÇ DEĞER VE ONARIM BEDELİ GEREKLİ'); return; }
    if (parseInt(kusur) === 0) { alert('TAM KUSURLU OLDUĞUNUZDA DEĞER KAYBI TALEP EDEMEZSİNİZ'); return; }

    setHesapLoading(true);
    setEmsalLoading(true);

    // 1. TAHKİM FORMÜLÜ
    const t = hesaplaTahkim(r, o, parseInt(yil), MR.parseNum(km), parseInt(onceki), bolge, parseInt(kusur));
    setTahkimSonuc(t);

    // 2. YARGITAY İÇTİHADI
    const y = hesaplaYargitay(r, o, parseInt(yil), MR.parseNum(km), parseInt(onceki), bolge, parseInt(kusur));
    setYargitaySonuc(y);

    setHesapLoading(false);

    // 3. TAHKİM EMSAL (paralel - AI arama)
    try {
      const eR = await MR.api.tahkimEmsalAra({ marka, model, yil: parseInt(yil) });
      if (eR?.success && eR.data) {
        setEmsalData(eR.data);
        setEmsalSonuc({
          ad: 'TAHKİM EMSAL ORTALAMASI',
          aciklama: 'Aynı marka/model/yaş tahkim kararları ortalaması',
          degerKaybi: eR.data.ortalama_dk || 0,
          kusurSonrasi: Math.round((eR.data.ortalama_dk || 0) * (parseInt(kusur) / 100)),
          kararSayisi: eR.data.toplam_bulunan || 0,
          formul: `En yüksek ${eR.data.toplam_bulunan || 0} tahkim kararının ortalaması`
        });
      }
    } catch (e) { console.error('EMSAL HATA:', e); }
    setEmsalLoading(false);

    // AI ANALİZ (arka planda)
    setAiLoading(true);
    try {
      const aiR = await MR.api.adkAiAnaliz({
        marka, model, yil: parseInt(yil), km: MR.parseNum(km), rayic: r, onarim: o,
        kusur: parseInt(kusur), onceki: parseInt(onceki), bolge,
        nisbi: t.degerKaybi, piyasa: y.degerKaybi, tsb: 0,
        fullRight: t.degerKaybi, kusurApplied: t.kusurSonrasi
      });
      if (aiR?.success && aiR.data?.analiz) setAiAnaliz(aiR.data.analiz);
    } catch(e) {}
    setAiLoading(false);
  };

  /* ──────── TEMİZLE ──────── */
  const temizle = () => {
    setMarka(''); setModel(''); setYil(''); setKm(''); setKazaTarihi('');
    setOnarim(''); setKusur('100'); setOnceki('0'); setBolge('on'); setPlaka('');
    setRayicData(null); setRayicDeger(''); setEmsalData(null);
    setTahkimSonuc(null); setYargitaySonuc(null); setEmsalSonuc(null);
    setAiAnaliz('');
  };

  /* ──────── PDF İNDİR - PROFESYONEL RAPOR ──────── */
  const pdfIndir = () => {
    if (!tahkimSonuc && !yargitaySonuc) return;
    setPdfLoading(true);
    const raporNo = 'MR-ADK-' + Date.now().toString().slice(-8);
    const tarih = new Date().toLocaleDateString('tr-TR');
    const saat = new Date().toLocaleTimeString('tr-TR', {hour:'2-digit',minute:'2-digit'});
    const r = MR.parseNum(rayicDeger), o = MR.parseNum(onarim);
    const aracYasi = new Date().getFullYear() - parseInt(yil);
    const hasarOrani = r > 0 ? ((o/r)*100).toFixed(1) : '0';
    const yontemler = [tahkimSonuc, yargitaySonuc, emsalSonuc].filter(Boolean);
    const ilanlar = (rayicData?.ilanlar || []).slice(0,5);
    const kararlar = emsalData?.kararlar || [];
    const bolgeLabel = {on:'ÖN KISIM',on_yan:'ÖN+YAN',yan:'YAN KISIM',arka:'ARKA KISIM',arka_yan:'ARKA+YAN',tavan:'TAVAN',alt:'ALT KISIM'}[bolge]||bolge;

    let ilanRows = '';
    ilanlar.forEach((il, i) => {
      ilanRows += '<tr style="background:'+(i%2===0?'#ffffff':'#f8fafc')+';border-bottom:1px solid #e2e8f0;">'
        +'<td style="padding:6px 8px;font-size:9px;color:#64748b;">'+(i+1)+'</td>'
        +'<td style="padding:6px 8px;font-size:9px;font-weight:600;">'+((il.kaynak||'').substring(0,15))+'</td>'
        +'<td style="padding:6px 8px;font-size:9px;">'+((il.baslik||'').substring(0,35))+'</td>'
        +'<td style="padding:6px 8px;font-size:9px;font-weight:700;color:#1e40af;text-align:right;">'+fmtM(il.fiyat)+'</td>'
        +'<td style="padding:6px 8px;font-size:9px;text-align:right;">'+((il.km||0)/1000).toFixed(0)+'K</td>'
        +'<td style="padding:6px 8px;font-size:9px;">'+((il.sehir||'').substring(0,10))+'</td></tr>';
    });

    let emsalRows = '';
    kararlar.forEach((k, i) => {
      emsalRows += '<tr style="background:'+(i%2===0?'#ffffff':'#fffbeb')+';border-bottom:1px solid #e2e8f0;">'
        +'<td style="padding:6px 8px;font-size:9px;font-weight:600;">'+(k.dosya_no||'-')+'</td>'
        +'<td style="padding:6px 8px;font-size:9px;">'+((k.marka||'')+' '+(k.model||'')+' ('+(k.yil||'')+')')+'</td>'
        +'<td style="padding:6px 8px;font-size:9px;text-align:right;">'+fmtM(k.rayic)+'</td>'
        +'<td style="padding:6px 8px;font-size:9px;font-weight:700;color:#1e40af;text-align:right;">'+fmtM(k.deger_kaybi)+'</td></tr>';
    });

    const yRenk = ['#1e40af','#6d28d9','#b45309'];
    const yBg = ['#eff6ff','#f5f3ff','#fffbeb'];
    const yBorder = ['#93c5fd','#c4b5fd','#fcd34d'];

    const html = '<div style="font-family:Arial,Helvetica,sans-serif;padding:0;color:#1e293b;line-height:1.4;background:#ffffff;">'
      + '<table style="width:100%;margin-bottom:12px;border-collapse:collapse;"><tr>'
      + '<td style="background:#0f172a;color:#fff;padding:16px 20px;border-radius:8px 0 0 8px;width:65%;">'
      + '<div style="font-size:18px;font-weight:900;letter-spacing:1px;">MR HASAR DANIŞMANLIK</div>'
      + '<div style="font-size:10px;opacity:0.85;margin-top:4px;letter-spacing:0.5px;">ARAÇ DEĞER KAYBI HESAPLAMA RAPORU</div></td>'
      + '<td style="background:#1e40af;color:#fff;padding:16px 20px;border-radius:0 8px 8px 0;text-align:right;">'
      + '<div style="font-size:9px;opacity:0.8;">RAPOR NO</div><div style="font-size:12px;font-weight:800;">'+raporNo+'</div>'
      + '<div style="font-size:9px;opacity:0.8;margin-top:6px;">TARİH</div><div style="font-size:11px;font-weight:700;">'+tarih+' '+saat+'</div></td></tr></table>'

      + '<table style="width:100%;margin-bottom:12px;border-collapse:separate;border-spacing:8px 0;"><tr>'
      + '<td style="width:50%;vertical-align:top;background:#f0f9ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 14px;">'
      + '<div style="font-size:11px;font-weight:800;color:#1e40af;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #bfdbfe;">ARAÇ BİLGİLERİ</div>'
      + '<table style="width:100%;font-size:10px;">'
      + '<tr><td style="padding:4px 0;color:#64748b;width:40%;">MARKA / MODEL</td><td style="padding:4px 0;font-weight:700;">'+marka+' '+model+'</td></tr>'
      + '<tr><td style="padding:4px 0;color:#64748b;">MODEL YILI / YAŞI</td><td style="padding:4px 0;font-weight:600;">'+yil+' ('+aracYasi+' YAŞ)</td></tr>'
      + '<tr><td style="padding:4px 0;color:#64748b;">KİLOMETRE</td><td style="padding:4px 0;font-weight:600;">'+MR.parseNum(km).toLocaleString('tr-TR')+' KM</td></tr>'
      + '<tr><td style="padding:4px 0;color:#64748b;">PLAKA</td><td style="padding:4px 0;font-weight:700;font-size:12px;">'+(plaka||'-')+'</td></tr>'
      + '<tr><td style="padding:4px 0;color:#64748b;">KAZA TARİHİ</td><td style="padding:4px 0;font-weight:600;">'+(kazaTarihi||'-')+'</td></tr></table></td>'
      + '<td style="width:50%;vertical-align:top;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 14px;">'
      + '<div style="font-size:11px;font-weight:800;color:#dc2626;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #fecaca;">HASAR BİLGİLERİ</div>'
      + '<table style="width:100%;font-size:10px;">'
      + '<tr><td style="padding:4px 0;color:#64748b;width:40%;">RAYİÇ DEĞER</td><td style="padding:4px 0;font-weight:800;color:#1e40af;font-size:12px;">'+fmtM(r)+'</td></tr>'
      + '<tr><td style="padding:4px 0;color:#64748b;">ONARIM BEDELİ</td><td style="padding:4px 0;font-weight:700;color:#dc2626;">'+fmtM(o)+'</td></tr>'
      + '<tr><td style="padding:4px 0;color:#64748b;">HASAR ORANI</td><td style="padding:4px 0;font-weight:600;">%'+hasarOrani+'</td></tr>'
      + '<tr><td style="padding:4px 0;color:#64748b;">KUSUR ORANI</td><td style="padding:4px 0;font-weight:700;color:#059669;">%'+kusur+(parseInt(kusur)===100?' (KUSURSUZ)':'')+'</td></tr>'
      + '<tr><td style="padding:4px 0;color:#64748b;">ÖNCEKİ HASAR</td><td style="padding:4px 0;font-weight:600;">'+(parseInt(onceki)===0?'YOK':onceki+' ADET')+'</td></tr>'
      + '<tr><td style="padding:4px 0;color:#64748b;">HASARLI BÖLGE</td><td style="padding:4px 0;font-weight:600;">'+bolgeLabel+'</td></tr></table></td></tr></table>'

      + '<div style="background:#f8fafc;border:2px solid #1e40af;border-radius:8px;padding:14px;margin-bottom:12px;">'
      + '<div style="font-size:12px;font-weight:800;color:#1e40af;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #dbeafe;text-align:center;">HESAPLAMA SONUÇLARI - '+yontemler.length+' YÖNTEM KARŞILAŞTIRMASI</div>'
      + '<table style="width:100%;border-collapse:separate;border-spacing:8px 0;"><tr>'
      + yontemler.map((s,i) => '<td style="background:'+yBg[i]+';border:2px solid '+yBorder[i]+';border-radius:8px;padding:12px 8px;text-align:center;width:'+Math.round(100/yontemler.length)+'%;">'
        + '<div style="font-size:9px;font-weight:700;color:'+yRenk[i]+';letter-spacing:0.5px;margin-bottom:6px;">'+s.ad+'</div>'
        + '<div style="font-size:18px;font-weight:900;color:'+yRenk[i]+';">'+fmtM(s.kusurSonrasi)+'</div>'
        + '<div style="font-size:8px;color:#94a3b8;margin-top:4px;">%100 Değer Kaybı: '+fmtM(s.degerKaybi)+'</div></td>').join('')
      + '</tr></table></div>'

      + '<table style="width:100%;border-collapse:separate;border-spacing:8px 0;margin-bottom:12px;"><tr>'
      + yontemler.map((y,i) => '<td style="vertical-align:top;background:'+yBg[i]+';border:1px solid '+yBorder[i]+';border-radius:6px;padding:8px 10px;width:'+Math.round(100/yontemler.length)+'%;">'
        + '<div style="font-size:9px;font-weight:700;color:'+yRenk[i]+';margin-bottom:4px;">'+y.ad+'</div>'
        + '<div style="font-size:8px;color:#475569;line-height:1.5;">'+y.formul+'</div></td>').join('')
      + '</tr></table>'

      + (ilanlar.length > 0 ? '<div style="border:1px solid #bfdbfe;border-radius:8px;overflow:hidden;margin-bottom:12px;">'
        + '<div style="background:#1e40af;color:#fff;padding:8px 12px;font-size:11px;font-weight:700;">PİYASA RAYİÇ ANALİZİ - EN YÜKSEK '+ilanlar.length+' İLAN</div>'
        + '<table style="width:100%;border-collapse:collapse;">'
        + '<tr style="background:#f0f4ff;"><th style="padding:6px 8px;font-size:8px;color:#64748b;text-align:left;">#</th><th style="padding:6px 8px;font-size:8px;color:#64748b;text-align:left;">KAYNAK</th><th style="padding:6px 8px;font-size:8px;color:#64748b;text-align:left;">İLAN</th><th style="padding:6px 8px;font-size:8px;color:#64748b;text-align:right;">FİYAT</th><th style="padding:6px 8px;font-size:8px;color:#64748b;text-align:right;">KM</th><th style="padding:6px 8px;font-size:8px;color:#64748b;text-align:left;">ŞEHİR</th></tr>'
        + ilanRows + '</table>'
        + '<div style="background:#eff6ff;padding:8px 12px;text-align:center;font-size:10px;font-weight:700;color:#1e40af;">ORTALAMA: '+fmtM(rayicData?.ortalama||0)+' | EN DÜŞÜK: '+fmtM(rayicData?.en_dusuk||0)+' | EN YÜKSEK: '+fmtM(rayicData?.en_yuksek||0)+'</div></div>' : '')

      + (kararlar.length > 0 ? '<div style="border:1px solid #fcd34d;border-radius:8px;overflow:hidden;margin-bottom:12px;">'
        + '<div style="background:#b45309;color:#fff;padding:8px 12px;font-size:11px;font-weight:700;">TAHKİM EMSAL KARARLARI - '+kararlar.length+' KARAR</div>'
        + '<table style="width:100%;border-collapse:collapse;">'
        + '<tr style="background:#fffbeb;"><th style="padding:6px 8px;font-size:8px;color:#64748b;text-align:left;">DOSYA NO</th><th style="padding:6px 8px;font-size:8px;color:#64748b;text-align:left;">ARAÇ</th><th style="padding:6px 8px;font-size:8px;color:#64748b;text-align:right;">RAYİÇ</th><th style="padding:6px 8px;font-size:8px;color:#64748b;text-align:right;">DEĞER KAYBI</th></tr>'
        + emsalRows + '</table>'
        + '<div style="background:#fef3c7;padding:8px 12px;text-align:center;font-size:10px;font-weight:700;color:#b45309;">EMSAL ORTALAMA: '+fmtM(emsalData?.ortalama_dk||0)+'</div></div>' : '')

      + (aiAnaliz ? '<div style="border:1px solid #c4b5fd;border-radius:8px;overflow:hidden;margin-bottom:12px;">'
        + '<div style="background:#6d28d9;color:#fff;padding:8px 12px;font-size:11px;font-weight:700;">UZMAN ANALİZ RAPORU</div>'
        + '<div style="padding:10px 12px;font-size:9px;line-height:1.7;color:#334155;background:#faf5ff;">'+aiAnaliz.replace(/\n/g,'<br>')+'</div></div>' : '')

      + '<div style="border-top:2px solid #e2e8f0;padding-top:10px;margin-top:8px;">'
      + '<table style="width:100%;"><tr>'
      + '<td style="font-size:8px;color:#94a3b8;line-height:1.4;">Bu rapor bilgilendirme amaçlıdır. Resmi işlemlerde Sigorta Tahkim Komisyonu<br>ve mahkeme kararları esas alınır. © '+new Date().getFullYear()+' MR Hasar Danışmanlık</td>'
      + '<td style="text-align:right;"><div style="font-size:12px;font-weight:900;color:#1e40af;letter-spacing:0.5px;">MR HASAR</div><div style="font-size:8px;color:#64748b;">DANIŞMANLIK</div></td></tr></table></div>'
      + '</div>';

    const el = document.createElement('div');
    el.innerHTML = html;
    el.style.width = '780px';
    el.style.background = '#ffffff';
    el.style.color = '#1e293b';
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    el.style.top = '0';
    document.body.appendChild(el);
    setTimeout(() => {
      html2pdf().set({
        margin: [6, 6, 6, 6],
        filename: 'MR_ADK_Rapor_' + raporNo + '.pdf',
        image: {type:'jpeg', quality:0.98},
        html2canvas: {scale:2, useCORS:true, scrollY:0, scrollX:0, windowWidth:800, backgroundColor:'#ffffff', logging:false},
        jsPDF: {unit:'mm', format:'a4', orientation:'portrait'},
        pagebreak: {mode:['avoid-all','css','legacy']}
      }).from(el).save().then(() => { document.body.removeChild(el); setPdfLoading(false); }).catch(() => { document.body.removeChild(el); setPdfLoading(false); });
    }, 200);
  };

  /* ═══════════════ RENDER ═══════════════ */
  const gridS = {display:'grid', gridTemplateColumns:'1fr 1fr', gap:12};
  const fullS = {gridColumn:'span 2'};
  const sonucVar = tahkimSonuc || yargitaySonuc;

  const SonucKutu = ({sonuc, renk, ikon}) => {
    if (!sonuc) return null;
    return (
      <div style={{background:renk+'12', border:'2px solid '+renk+'44', borderRadius:12, padding:16, marginBottom:12}}>
        <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:10}}>
          <MR.LIcon name={ikon} size={16} color={renk}/>
          <span style={{fontSize:12, fontWeight:800, color:renk}}>{sonuc.ad}</span>
        </div>
        <div style={{fontSize:10, color:C.textMuted, marginBottom:8}}>{sonuc.aciklama}</div>
        <div style={{display:'flex', gap:12, marginBottom:10}}>
          <div style={{flex:1, textAlign:'center', padding:12, background:renk+'18', borderRadius:8}}>
            <div style={{fontSize:9, color:C.textMuted}}>DEĞER KAYBI</div>
            <div style={{fontSize:20, fontWeight:800, color:renk}}>{fmtM(sonuc.degerKaybi)}</div>
          </div>
          <div style={{flex:1, textAlign:'center', padding:12, background:C.success+'18', borderRadius:8}}>
            <div style={{fontSize:9, color:C.textMuted}}>KUSUR SONRASI (%{kusur})</div>
            <div style={{fontSize:20, fontWeight:800, color:C.success}}>{fmtM(sonuc.kusurSonrasi)}</div>
          </div>
        </div>
        <div style={{padding:10, background:C.bgInput, borderRadius:8, fontSize:10, color:C.textSec, lineHeight:1.6}}>
          <div style={{fontWeight:700, color:C.purple, marginBottom:4}}>FORMÜL:</div>
          {sonuc.formul}
        </div>
      </div>
    );
  };

  return (
    <div className="fade-in">
      {/* HEADER */}
      <div style={{...S.card, marginBottom:16}}>
        <div style={{padding:'14px 18px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10, borderBottom:'1px solid '+C.border, background:'linear-gradient(135deg,'+C.accent+'11,'+C.purple+'11)'}}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <div style={{width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,'+C.purple+','+C.accent+')', display:'flex', alignItems:'center', justifyContent:'center'}}>
              <MR.LIcon name="Calculator" size={18} color="#fff"/>
            </div>
            <div>
              <div style={{fontSize:14, fontWeight:800}}>ADK HESAPLAMA - GERÇEK PİYASA VERİSİ</div>
              <div style={{fontSize:10, color:C.textMuted}}>SAHİBİNDEN.COM + ARABAN.COM İLAN ANALİZİ + 3 YÖNTEM HESAPLAMA</div>
            </div>
          </div>
          <div style={{display:'flex', gap:4, flexWrap:'wrap'}}>
            <span style={S.badge(C.success)}>GERÇEK İLAN</span>
            <span style={S.badge(C.gold)}>TAHKİM EMSAL</span>
            <span style={S.badge(C.purple)}>3 YÖNTEM</span>
            <span style={S.badge(C.cyan)}>PDF RAPOR</span>
          </div>
        </div>
      </div>

      {/* ANA İÇERİK */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1.3fr', gap:16}}>

        {/* ══════ SOL PANEL: FORM ══════ */}
        <div>
          {/* ARAÇ BİLGİLERİ */}
          <div style={{...S.card, marginBottom:14}}>
            <MR.SectionTitle icon="Car" title="ARAÇ BİLGİLERİ"/>
            <div style={{...S.cardBody, paddingTop:12}}>
              <div style={gridS}>
                <MR.FormGroup label="MARKA *">
                  <MR.AracMarkaSelect value={marka} onChange={v => {setMarka(v); setModel('');}}/>
                </MR.FormGroup>
                <MR.FormGroup label="MODEL / PAKET *">
                  <MR.AracModelSelect marka={marka} value={model} onChange={v => setModel(v)}/>
                </MR.FormGroup>
                <MR.FormGroup label="MODEL YILI *">
                  <select value={yil} onChange={e => setYil(e.target.value)} style={S.select}>
                    <option value="">SEÇİNİZ</option>
                    {yillar.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </MR.FormGroup>
                <MR.FormGroup label="KİLOMETRE *">
                  <input value={km} onChange={e => setKm(MR.fmtInput(e.target.value))} placeholder="150.000" style={S.input}/>
                </MR.FormGroup>
                <MR.FormGroup label="KAZA TARİHİ">
                  <MR.DateInput value={kazaTarihi} onChange={v => setKazaTarihi(v)}/>
                </MR.FormGroup>
                <MR.FormGroup label="PLAKA">
                  <input value={plaka} onChange={e => setPlaka(e.target.value.toUpperCase())} placeholder="34 XX 000" style={S.input}/>
                </MR.FormGroup>
              </div>

              {/* RAYİÇ ARAŞTIR BUTONU */}
              {hy('hesap-rayic') && <button onClick={rayicArastir} disabled={rayicLoading || !marka || !model || !yil || !km}
                style={{...S.btn, width:'100%', justifyContent:'center', marginTop:12, padding:12, fontSize:12, fontWeight:700, background:'linear-gradient(135deg,'+C.accent+','+C.purple+')', color:'#fff', opacity:(!marka||!model||!yil||!km||rayicLoading)?0.5:1}}>
                {rayicLoading ? 'SAHİBİNDEN.COM + ARABAN.COM TARANIYOR...' : 'RAYİÇ DEĞER ARAŞTIR (SAHİBİNDEN + ARABAN)'}
              </button>}
            </div>
          </div>

          {/* RAYİÇ SONUÇ */}
          {rayicData && (
            <div style={{...S.card, marginBottom:14, border:'2px solid '+C.success+'44'}}>
              <div style={{padding:'10px 14px', background:C.success+'08', borderBottom:'1px solid '+C.border, display:'flex', alignItems:'center', gap:8}}>
                <MR.LIcon name="TrendingUp" size={14} color={C.success}/>
                <span style={{fontSize:12, fontWeight:700, color:C.success}}>PİYASA RAYİÇ ANALİZİ</span>
                <span style={S.badge(C.accent)}>{rayicData.toplam_bulunan || 0} İLAN</span>
              </div>
              <div style={{padding:12}}>
                {/* ORTALAMA */}
                <div style={{textAlign:'center', padding:14, background:C.success+'12', borderRadius:10, marginBottom:10}}>
                  <div style={{fontSize:9, color:C.textMuted, marginBottom:2}}>ORTALAMA RAYİÇ DEĞER (EN YÜKSEK {rayicData.ilanlar?.length || 0} İLAN)</div>
                  <div style={{fontSize:24, fontWeight:800, color:C.success}}>{fmtM(rayicData.ortalama)}</div>
                  <div style={{fontSize:10, color:C.textMuted}}>EN DÜŞÜK: {fmtM(rayicData.en_dusuk)} — EN YÜKSEK: {fmtM(rayicData.en_yuksek)}</div>
                </div>
                {/* İLAN LİSTESİ */}
                {rayicData.ilanlar?.length > 0 && (
                  <div style={{maxHeight:200, overflowY:'auto'}}>
                    {rayicData.ilanlar.map((il, i) => (
                      <div key={i} style={{display:'flex', alignItems:'center', gap:8, padding:'6px 8px', background:i%2===0?C.bgInput:'transparent', borderRadius:6, fontSize:10}}>
                        <span style={{width:18, height:18, borderRadius:'50%', background:C.accent+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700, flexShrink:0, color:C.accent}}>{i+1}</span>
                        <div style={{flex:1, minWidth:0}}>
                          <div style={{fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{il.baslik || (marka+' '+model)}</div>
                          <div style={{fontSize:9, color:C.textMuted}}>{il.kaynak} • {(il.km||0).toLocaleString('tr-TR')} KM • {il.sehir||''}</div>
                        </div>
                        <span style={{fontWeight:700, color:C.success, whiteSpace:'nowrap'}}>{fmtM(il.fiyat)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {rayicData.analiz_notu && <div style={{marginTop:8, fontSize:10, color:C.textMuted, fontStyle:'italic'}}>{rayicData.analiz_notu}</div>}
              </div>
            </div>
          )}

          {/* HASAR BİLGİLERİ */}
          <div style={{...S.card, marginBottom:14}}>
            <MR.SectionTitle icon="AlertCircle" title="HASAR BİLGİLERİ"/>
            <div style={{...S.cardBody, paddingTop:12}}>
              <div style={gridS}>
                <MR.FormGroup label="RAYİÇ DEĞER *">
                  <input value={rayicDeger} onChange={e => setRayicDeger(MR.fmtInput(e.target.value))} placeholder={rayicData ? 'OTOMATİK DOLDURULDU' : 'RAYİÇ ARAŞTIR İLE DOLDUR'} style={{...S.input, borderColor: rayicData ? C.success+'88' : C.borderLight, fontWeight:700}}/>
                </MR.FormGroup>
                <MR.FormGroup label="ONARIM BEDELİ *">
                  <input value={onarim} onChange={e => setOnarim(MR.fmtInput(e.target.value))} placeholder="75.000" style={S.input}/>
                </MR.FormGroup>
                <MR.FormGroup label="KUSUR ORANI">
                  <select value={kusur} onChange={e => setKusur(e.target.value)} style={S.select}>
                    <option value="100">%100 HAKLI (KUSURSUZ)</option>
                    <option value="75">%75 HAKLI</option>
                    <option value="50">%50 HAKLI</option>
                    <option value="25">%25 HAKLI</option>
                    <option value="0">%0 (TAM KUSURLU)</option>
                  </select>
                </MR.FormGroup>
                <MR.FormGroup label="ÖNCEKİ HASAR">
                  <select value={onceki} onChange={e => setOnceki(e.target.value)} style={S.select}>
                    <option value="0">YOK</option>
                    <option value="1">1 ADET</option>
                    <option value="2">2 ADET</option>
                    <option value="3">3 ADET</option>
                    <option value="4">4 ADET</option>
                    <option value="5">5+ ADET</option>
                  </select>
                </MR.FormGroup>
                <div style={fullS}>
                  <MR.FormGroup label="HASARLI BÖLGE">
                    <select value={bolge} onChange={e => setBolge(e.target.value)} style={S.select}>
                      <option value="on">ÖN KISIM</option>
                      <option value="on_yan">ÖN + YAN</option>
                      <option value="yan">YAN KISIM</option>
                      <option value="arka">ARKA KISIM</option>
                      <option value="arka_yan">ARKA + YAN</option>
                      <option value="tavan">TAVAN</option>
                      <option value="alt">ALT KISIM</option>
                    </select>
                  </MR.FormGroup>
                </div>
              </div>
              <div style={{display:'flex', gap:8, marginTop:14}}>
                <button onClick={temizle} style={{...S.btn, ...S.btnG, flex:1, justifyContent:'center'}}>
                  <MR.LIcon name="RotateCcw" size={13}/> TEMİZLE
                </button>
                <button onClick={hesapla} disabled={hesapLoading}
                  style={{...S.btn, flex:2, justifyContent:'center', background:'linear-gradient(135deg,'+C.success+','+C.cyan+')', color:'#fff', fontWeight:700, fontSize:12, padding:12, opacity:hesapLoading?0.5:1}}>
                  {hesapLoading ? 'HESAPLANIYOR...' : 'HESAPLA + TAHKİM EMSAL ARA'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ══════ SAĞ PANEL: SONUÇLAR ══════ */}
        <div>
          {!sonucVar && !hesapLoading && (
            <div style={{...S.card}}>
              <MR.SectionTitle icon="BarChart3" title="HESAPLAMA SONUÇLARI" sub="3 YÖNTEM KARŞILAŞTIRMASI"/>
              <div style={S.cardBody}>
                <MR.EmptyState icon="Calculator" title="HESAPLAMA BEKLENİYOR" desc="1. ARAÇ BİLGİLERİNİ GİRİP RAYİÇ ARAŞTIRIN. 2. HASAR BİLGİLERİNİ GİRİP HESAPLAYIN."/>
              </div>
            </div>
          )}

          {hesapLoading && <div style={{...S.card, padding:40}}><MR.Loading/></div>}

          {sonucVar && (
            <div>
              {/* KARŞILAŞTIRMA TABLOSU */}
              <div style={{...S.card, marginBottom:14}}>
                <div style={{padding:'10px 14px', background:C.accent+'08', borderBottom:'1px solid '+C.border, display:'flex', alignItems:'center', gap:8}}>
                  <MR.LIcon name="BarChart3" size={14} color={C.accent}/>
                  <span style={{fontSize:12, fontWeight:700}}>3 YÖNTEM KARŞILAŞTIRMASI</span>
                </div>
                <div style={{padding:12}}>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12}}>
                    {[tahkimSonuc, yargitaySonuc, emsalSonuc].filter(Boolean).map((s, i) => {
                      const renkler = [C.accent, C.purple, C.gold];
                      return (
                        <div key={i} style={{textAlign:'center', padding:14, background:renkler[i]+'12', borderRadius:10, border:'2px solid '+renkler[i]+'33'}}>
                          <div style={{fontSize:9, color:C.textMuted, fontWeight:600, marginBottom:6}}>{s.ad}</div>
                          <div style={{fontSize:18, fontWeight:800, color:renkler[i]}}>{fmtM(s.kusurSonrasi)}</div>
                          <div style={{fontSize:9, color:C.textMuted, marginTop:4}}>%100: {fmtM(s.degerKaybi)}</div>
                        </div>
                      );
                    })}
                  </div>
                  {/* ARAÇ BİLGİ BAR */}
                  <div style={{display:'flex', gap:8, flexWrap:'wrap', padding:'8px 10px', background:C.bgInput, borderRadius:8, fontSize:10}}>
                    <span style={{fontWeight:700}}>{marka} {model}</span>
                    <span style={{color:C.textMuted}}>YIL: {yil}</span>
                    <span style={{color:C.textMuted}}>KM: {MR.parseNum(km).toLocaleString('tr-TR')}</span>
                    <span style={{color:C.accent, fontWeight:700}}>RAYİÇ: {fmtM(MR.parseNum(rayicDeger))}</span>
                    <span style={{color:C.danger}}>ONARIM: {fmtM(MR.parseNum(onarim))}</span>
                  </div>
                </div>
              </div>

              {/* 1. TAHKİM FORMÜLÜ */}
              <SonucKutu sonuc={tahkimSonuc} renk={C.accent} ikon="Scale"/>

              {/* 2. YARGITAY İÇTİHADI */}
              <SonucKutu sonuc={yargitaySonuc} renk={C.purple} ikon="Gavel"/>

              {/* 3. TAHKİM EMSAL */}
              {emsalLoading && (
                <div style={{padding:20, textAlign:'center', color:C.textMuted, fontSize:11}}>
                  <div style={{width:20,height:20,border:'2px solid '+C.border,borderTopColor:C.gold,borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 8px'}}/>
                  TAHKİM EMSAL KARARLARI ARANIYOR...
                </div>
              )}
              {emsalSonuc && <SonucKutu sonuc={emsalSonuc} renk={C.gold} ikon="Scale"/>}

              {/* EMSAL KARARLAR DETAY */}
              {emsalData?.kararlar?.length > 0 && (
                <div style={{background:C.gold+'08', border:'1px solid '+C.gold+'33', borderRadius:12, padding:14, marginBottom:14}}>
                  <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:10}}>
                    <MR.LIcon name="FileText" size={14} color={C.gold}/>
                    <span style={{fontSize:11, fontWeight:700, color:C.gold}}>TAHKİM EMSAL KARARLARI ({emsalData.kararlar.length} KARAR)</span>
                  </div>
                  {emsalData.kararlar.map((k, i) => (
                    <div key={i} style={{padding:10, background:'rgba(0,0,0,0.08)', borderRadius:8, marginBottom:6}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4}}>
                        <span style={{fontSize:10, fontWeight:700, color:C.gold}}>{k.dosya_no}</span>
                        <span style={{fontSize:12, fontWeight:800, color:C.success}}>{fmtM(k.deger_kaybi)}</span>
                      </div>
                      <div style={{fontSize:9, color:C.textMuted}}>
                        {k.marka} {k.model} ({k.yil}) • {(k.km||0).toLocaleString('tr-TR')} KM • RAYİÇ: {fmtM(k.rayic)}
                      </div>
                      {k.ozet && <div style={{fontSize:9, color:C.textSec, marginTop:4}}>{k.ozet}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* AI ANALİZ */}
              <div style={{background:C.purple+'08', border:'1px solid '+C.purple+'33', borderRadius:12, padding:14, marginBottom:14}}>
                <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
                  <MR.LIcon name="Sparkles" size={14} color={C.purple}/>
                  <span style={{fontSize:11, fontWeight:700, color:C.purple}}>AI ANALİZ RAPORU</span>
                </div>
                {aiLoading ? (
                  <div style={{display:'flex', alignItems:'center', gap:8, padding:10, color:C.textMuted, fontSize:11}}>
                    <div style={{width:14,height:14,border:'2px solid '+C.border,borderTopColor:C.purple,borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
                    AI ANALİZ YAPILIYOR...
                  </div>
                ) : (
                  <div style={{fontSize:11, lineHeight:1.7, color:C.textSec, whiteSpace:'pre-wrap'}}>{aiAnaliz || 'HESAPLAMA YAPINCA AI ANALİZ OTOMATİK BAŞLAR.'}</div>
                )}
              </div>

              {/* PDF BUTON */}
              {MR.hasYetki(user,'hesaplamalar','hesap-adk-rapor') && <button onClick={pdfIndir} disabled={pdfLoading}
                style={{...S.btn, width:'100%', justifyContent:'center', padding:14, fontSize:13, fontWeight:800, background:'linear-gradient(135deg,'+C.success+','+C.cyan+')', color:'#fff', opacity:pdfLoading?0.5:1}}>
                {pdfLoading ? 'PDF OLUŞTURULUYOR...' : 'PDF RAPOR İNDİR (TÜM DETAYLAR)'}
              </button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
