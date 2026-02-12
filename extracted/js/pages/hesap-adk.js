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

/* ──────── 1. TAHKİM FORMÜLÜ ──────── */
const hesaplaTahkim = (rayic, onarim, yil, km, onceki, bolge, kusur) => {
  const aracYasi = new Date().getFullYear() - yil;
  const hasarOrani = rayic > 0 ? onarim / rayic : 0;

  // BAZ DEĞER KAYBI ORANI (hasar oranına göre - Tahkim uygulaması)
  const bazOran = hasarOrani <= 0.05 ? 0.04 : hasarOrani <= 0.10 ? 0.06 : hasarOrani <= 0.15 ? 0.08 : hasarOrani <= 0.20 ? 0.10 : hasarOrani <= 0.30 ? 0.13 : 0.16;

  // YAŞ KATSAYISI
  const yasK = aracYasi <= 1 ? 1.00 : aracYasi <= 2 ? 0.95 : aracYasi <= 3 ? 0.90 : aracYasi <= 4 ? 0.85 : aracYasi <= 5 ? 0.78 : aracYasi <= 6 ? 0.70 : aracYasi <= 7 ? 0.62 : aracYasi <= 8 ? 0.53 : aracYasi <= 9 ? 0.44 : 0.35;

  // KM KATSAYISI
  const kmK = km < 30000 ? 1.00 : km < 60000 ? 0.95 : km < 100000 ? 0.88 : km < 150000 ? 0.78 : km < 200000 ? 0.65 : 0.50;

  // BÖLGE KATSAYISI (ön en yüksek etki)
  const bolgeK = {on: 1.00, yan: 0.90, arka: 0.85, tavan: 0.75}[bolge] || 0.90;

  // ÖNCEKİ HASAR
  const oncekiK = onceki === 0 ? 1.00 : onceki === 1 ? 0.85 : onceki === 2 ? 0.70 : 0.55;

  const degerKaybi = Math.round(rayic * bazOran * yasK * kmK * bolgeK * oncekiK);
  const kusurSonrasi = Math.round(degerKaybi * (kusur / 100));

  return {
    ad: 'TAHKİM FORMÜLÜ',
    aciklama: 'Sigorta Tahkim Komisyonu hesaplama yöntemi',
    degerKaybi, kusurSonrasi, bazOran, yasK, kmK, bolgeK, oncekiK, hasarOrani, aracYasi,
    formul: `DK = Rayiç (${fmtM(rayic)}) × Baz Oran (%${(bazOran*100).toFixed(0)}) × Yaş K. (${yasK.toFixed(2)}) × KM K. (${kmK.toFixed(2)}) × Bölge K. (${bolgeK.toFixed(2)}) × Önceki K. (${oncekiK.toFixed(2)})`
  };
};

/* ──────── 2. YARGITAY İÇTİHADI ──────── */
const hesaplaYargitay = (rayic, onarim, yil, km, onceki, bolge, kusur) => {
  const aracYasi = new Date().getFullYear() - yil;
  const hasarOrani = rayic > 0 ? onarim / rayic : 0;

  // HASAR ETKİ ORANI (Yargıtay 17. HD / 4. HD kararları bazında)
  const hasarEtkisi = hasarOrani <= 0.05 ? 0.05 : hasarOrani <= 0.10 ? 0.08 : hasarOrani <= 0.15 ? 0.11 : hasarOrani <= 0.20 ? 0.14 : hasarOrani <= 0.30 ? 0.18 : 0.22;

  // YIPRANMA PAYI (yaş + km bazlı)
  const yasYipranma = Math.min(aracYasi * 0.04, 0.40);
  const kmYipranma = Math.min(Math.floor(km / 50000) * 0.03, 0.20);
  const toplamYipranma = Math.min(yasYipranma + kmYipranma, 0.50);

  // BÖLGE KATSAYISI
  const bolgeK = {on: 1.00, yan: 0.92, arka: 0.88, tavan: 0.78}[bolge] || 0.90;

  // ÖNCEKİ HASAR
  const oncekiK = onceki === 0 ? 1.00 : onceki === 1 ? 0.85 : onceki === 2 ? 0.70 : 0.55;

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
MR.HesapADKPage = () => {
  const C = MR.C, S = MR.S;

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
        if (r.data.ortalama > 0) {
          setRayicDeger(MR.fmtInput(String(r.data.ortalama)));
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

  /* ──────── PDF İNDİR ──────── */
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
    const renkY = ['#2563eb','#7c3aed','#d97706'];
    const bgY = ['#eff6ff','#f5f3ff','#fffbeb'];
    const ilanlar = (rayicData?.ilanlar || []).slice(0,10);
    const kararlar = emsalData?.kararlar || [];

    // ═══ İLAN SATIRLARI ═══
    let ilanRows = '';
    ilanlar.forEach((il, i) => {
      ilanRows += '<tr style="background:'+(i%2===0?'#f8fafc':'#fff')+';"><td style="padding:2px 4px;font-size:6.5px;color:#94a3b8;">'+(i+1)+'</td><td style="padding:2px 4px;font-size:6.5px;">'+((il.kaynak||'').replace('.com','').replace('sahibinden','sahib.').replace('araban','araban'))+'</td><td style="padding:2px 4px;font-size:6.5px;max-width:120px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">'+((il.baslik||'').substring(0,40))+'</td><td style="padding:2px 4px;font-size:6.5px;font-weight:700;color:#059669;text-align:right;">'+fmtM(il.fiyat)+'</td><td style="padding:2px 4px;font-size:6.5px;text-align:right;color:#64748b;">'+((il.km||0)/1000).toFixed(0)+'K</td><td style="padding:2px 4px;font-size:6.5px;color:#64748b;">'+((il.sehir||'').substring(0,8))+'</td></tr>';
    });

    // ═══ EMSAL SATIRLARI ═══
    let emsalRows = '';
    kararlar.forEach((k, i) => {
      emsalRows += '<tr style="background:'+(i%2===0?'#fffbeb':'#fff')+';"><td style="padding:2px 4px;font-size:6.5px;font-weight:600;color:#b45309;">'+(k.dosya_no||'-')+'</td><td style="padding:2px 4px;font-size:6.5px;">'+((k.marka||'')+' '+(k.model||'')+' ('+(k.yil||'')+')').substring(0,25)+'</td><td style="padding:2px 4px;font-size:6.5px;text-align:right;">'+fmtM(k.rayic)+'</td><td style="padding:2px 4px;font-size:6.5px;font-weight:700;color:#059669;text-align:right;">'+fmtM(k.deger_kaybi)+'</td></tr>';
    });

    // html2pdf flex desteklemez, TABLE kullan
    const html = '<div style="font-family:Arial,Helvetica,sans-serif;padding:10px 14px;color:#1e293b;line-height:1.3;">'

      // ═══ HEADER ═══
      + '<table style="width:100%;margin-bottom:6px;"><tr>'
      + '<td style="background:#1e3a5f;color:#fff;padding:10px 14px;border-radius:6px 0 0 6px;">'
      + '<div style="font-size:14px;font-weight:800;letter-spacing:0.5px;">MR HASAR DANISMANLIK</div>'
      + '<div style="font-size:8px;opacity:0.8;margin-top:1px;">ARAC DEGER KAYBI HESAPLAMA RAPORU</div>'
      + '</td>'
      + '<td style="background:#2563eb;color:#fff;padding:10px 14px;border-radius:0 6px 6px 0;text-align:right;width:140px;">'
      + '<div style="font-size:7px;">RAPOR: <b>'+raporNo+'</b></div>'
      + '<div style="font-size:7px;">TARIH: <b>'+tarih+' '+saat+'</b></div>'
      + '</td>'
      + '</tr></table>'

      // ═══ ARAÇ + HASAR YAN YANA ═══
      + '<table style="width:100%;margin-bottom:6px;border-collapse:separate;border-spacing:6px 0;"><tr>'
      // Sol: Araç
      + '<td style="width:50%;vertical-align:top;background:#f0f9ff;border:1px solid #bfdbfe;border-radius:5px;padding:6px 8px;">'
      + '<div style="font-size:7.5px;font-weight:800;color:#2563eb;margin-bottom:4px;padding-bottom:2px;border-bottom:1px solid #bfdbfe;">ARAC BILGILERI</div>'
      + '<table style="width:100%;font-size:7px;">'
      + '<tr><td style="padding:2px 4px;color:#64748b;">MARKA/MODEL:</td><td style="padding:2px 4px;font-weight:700;">'+marka+' '+model+'</td></tr>'
      + '<tr><td style="padding:2px 4px;color:#64748b;">YILI / YASI:</td><td style="padding:2px 4px;font-weight:600;">'+yil+' ('+aracYasi+' YAS)</td></tr>'
      + '<tr><td style="padding:2px 4px;color:#64748b;">KILOMETRE:</td><td style="padding:2px 4px;font-weight:600;">'+MR.parseNum(km).toLocaleString('tr-TR')+' KM</td></tr>'
      + '<tr><td style="padding:2px 4px;color:#64748b;">PLAKA:</td><td style="padding:2px 4px;font-weight:600;">'+(plaka||'-')+'</td></tr>'
      + '<tr><td style="padding:2px 4px;color:#64748b;">KAZA TARIHI:</td><td style="padding:2px 4px;font-weight:600;">'+(kazaTarihi||'-')+'</td></tr>'
      + '</table></td>'
      // Sağ: Hasar
      + '<td style="width:50%;vertical-align:top;background:#fef2f2;border:1px solid #fecaca;border-radius:5px;padding:6px 8px;">'
      + '<div style="font-size:7.5px;font-weight:800;color:#dc2626;margin-bottom:4px;padding-bottom:2px;border-bottom:1px solid #fecaca;">HASAR BILGILERI</div>'
      + '<table style="width:100%;font-size:7px;">'
      + '<tr><td style="padding:2px 4px;color:#64748b;">RAYIC DEGER:</td><td style="padding:2px 4px;font-weight:700;color:#2563eb;">'+fmtM(r)+'</td></tr>'
      + '<tr><td style="padding:2px 4px;color:#64748b;">ONARIM BEDELI:</td><td style="padding:2px 4px;font-weight:700;color:#dc2626;">'+fmtM(o)+'</td></tr>'
      + '<tr><td style="padding:2px 4px;color:#64748b;">HASAR ORANI:</td><td style="padding:2px 4px;font-weight:600;">%'+hasarOrani+'</td></tr>'
      + '<tr><td style="padding:2px 4px;color:#64748b;">KUSUR ORANI:</td><td style="padding:2px 4px;font-weight:600;">%'+kusur+(parseInt(kusur)===100?' (KUSURSUZ)':'')+'</td></tr>'
      + '<tr><td style="padding:2px 4px;color:#64748b;">ONCEKI HASAR:</td><td style="padding:2px 4px;font-weight:600;">'+(parseInt(onceki)===0?'YOK':onceki+' ADET')+'</td></tr>'
      + '<tr><td style="padding:2px 4px;color:#64748b;">HASARLI BOLGE:</td><td style="padding:2px 4px;font-weight:600;">'+({on:'ON KISIM',arka:'ARKA KISIM',yan:'YAN KISIM',tavan:'TAVAN'}[bolge]||bolge)+'</td></tr>'
      + '</table></td>'
      + '</tr></table>'

      // ═══ 3 YÖNTEM KARŞILAŞTIRMA ═══
      + '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:5px;padding:6px 8px;margin-bottom:6px;">'
      + '<div style="font-size:7.5px;font-weight:800;color:#059669;margin-bottom:5px;padding-bottom:2px;border-bottom:1px solid #86efac;">HESAPLAMA SONUCLARI - '+yontemler.length+' YONTEM KARSILASTIRMASI</div>'
      + '<table style="width:100%;border-collapse:separate;border-spacing:5px 0;"><tr>'
      + yontemler.map((s,i) => '<td style="background:'+bgY[i]+';border:2px solid '+renkY[i]+'44;border-radius:5px;padding:6px 4px;text-align:center;width:'+Math.round(100/yontemler.length)+'%;">'
        + '<div style="font-size:6.5px;font-weight:700;color:'+renkY[i]+';letter-spacing:0.3px;margin-bottom:3px;">'+s.ad+'</div>'
        + '<div style="font-size:14px;font-weight:800;color:'+renkY[i]+';">'+fmtM(s.kusurSonrasi)+'</div>'
        + '<div style="font-size:6px;color:#94a3b8;margin-top:1px;">%100: '+fmtM(s.degerKaybi)+'</div>'
        + '</td>').join('')
      + '</tr></table>'
      + '</div>'

      // ═══ FORMÜLLER YAN YANA ═══
      + '<table style="width:100%;border-collapse:separate;border-spacing:5px 0;margin-bottom:6px;"><tr>'
      + yontemler.map((y,i) => '<td style="vertical-align:top;background:'+bgY[i]+';border:1px solid '+renkY[i]+'33;border-radius:4px;padding:4px 6px;width:'+Math.round(100/yontemler.length)+'%;">'
        + '<div style="font-size:6.5px;font-weight:700;color:'+renkY[i]+';margin-bottom:2px;">'+y.ad+'</div>'
        + '<div style="font-size:6px;color:#475569;line-height:1.4;">'+y.formul+'</div>'
        + '</td>').join('')
      + '</tr></table>'

      // ═══ İLANLAR + EMSAL YAN YANA ═══
      + '<table style="width:100%;border-collapse:separate;border-spacing:6px 0;margin-bottom:6px;"><tr>'
      // Sol: İlanlar
      + (ilanlar.length > 0 ? '<td style="vertical-align:top;width:'+(kararlar.length>0?'58':'100')+'%;border:1px solid #bfdbfe;border-radius:5px;overflow:hidden;">'
        + '<div style="background:#2563eb;color:#fff;padding:3px 6px;font-size:7px;font-weight:700;">PIYASA RAYIC ANALIZI ('+ilanlar.length+' ILAN)</div>'
        + '<table style="width:100%;border-collapse:collapse;">'+ilanRows+'</table>'
        + '<div style="background:#eff6ff;padding:3px 6px;text-align:center;font-size:7px;font-weight:700;color:#2563eb;">ORT: '+fmtM(rayicData?.ortalama||0)+' | MIN: '+fmtM(rayicData?.en_dusuk||0)+' | MAX: '+fmtM(rayicData?.en_yuksek||0)+'</div>'
        + '</td>' : '')
      // Sağ: Emsal
      + (kararlar.length > 0 ? '<td style="vertical-align:top;width:'+(ilanlar.length>0?'42':'100')+'%;border:1px solid #fcd34d;border-radius:5px;overflow:hidden;">'
        + '<div style="background:#d97706;color:#fff;padding:3px 6px;font-size:7px;font-weight:700;">TAHKIM EMSAL ('+kararlar.length+' KARAR)</div>'
        + '<table style="width:100%;border-collapse:collapse;">'
        + '<tr style="background:#fef3c7;"><th style="padding:2px 4px;font-size:6px;text-align:left;">DOSYA</th><th style="padding:2px 4px;font-size:6px;text-align:left;">ARAC</th><th style="padding:2px 4px;font-size:6px;text-align:right;">RAYIC</th><th style="padding:2px 4px;font-size:6px;text-align:right;">DK</th></tr>'
        + emsalRows+'</table>'
        + '<div style="background:#fef3c7;padding:3px 6px;text-align:center;font-size:7px;font-weight:700;color:#b45309;">EMSAL ORT: '+fmtM(emsalData?.ortalama_dk||0)+'</div>'
        + '</td>' : '')
      + '</tr></table>'

      // ═══ AI ANALİZ (kısa) ═══
      + (aiAnaliz ? '<div style="border:1px solid #c4b5fd;border-radius:5px;overflow:hidden;margin-bottom:6px;">'
        + '<div style="background:#7c3aed;color:#fff;padding:3px 6px;font-size:7px;font-weight:700;">AI ANALIZ RAPORU</div>'
        + '<div style="padding:4px 6px;font-size:6.5px;line-height:1.5;color:#334155;">'+aiAnaliz.substring(0,500).replace(/\n/g,'<br>')+'</div>'
        + '</div>' : '')

      // ═══ FOOTER ═══
      + '<table style="width:100%;border-top:1px solid #e2e8f0;"><tr>'
      + '<td style="padding-top:4px;font-size:6px;color:#94a3b8;">BU RAPOR BILGILENDIRME AMACLIDIR. RESMI ISLEMLERDE SIGORTA TAHKIM KOMISYONU KARARLARI ESAS ALINIR.</td>'
      + '<td style="padding-top:4px;font-size:6.5px;font-weight:700;color:#2563eb;text-align:right;white-space:nowrap;">MR HASAR DANISMANLIK</td>'
      + '</tr></table>'

      + '</div>';

    const el = document.createElement('div');
    el.innerHTML = html;
    el.style.width = '780px';
    el.style.background = '#fff';
    document.body.appendChild(el);
    html2pdf().set({
      margin: [4, 4, 4, 4],
      filename: 'MR_ADK_Rapor_' + raporNo + '.pdf',
      image: {type:'jpeg', quality:0.95},
      html2canvas: {scale:2, useCORS:true},
      jsPDF: {unit:'mm', format:'a4', orientation:'portrait'},
      pagebreak: {mode:['avoid-all']}
    }).from(el).save().then(() => { document.body.removeChild(el); setPdfLoading(false); }).catch(() => { document.body.removeChild(el); setPdfLoading(false); });
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
                  <input type="date" value={kazaTarihi} onChange={e => setKazaTarihi(e.target.value)} style={S.input}/>
                </MR.FormGroup>
                <MR.FormGroup label="PLAKA">
                  <input value={plaka} onChange={e => setPlaka(e.target.value.toUpperCase())} placeholder="34 XX 000" style={S.input}/>
                </MR.FormGroup>
              </div>

              {/* RAYİÇ ARAŞTIR BUTONU */}
              <button onClick={rayicArastir} disabled={rayicLoading || !marka || !model || !yil || !km}
                style={{...S.btn, width:'100%', justifyContent:'center', marginTop:12, padding:12, fontSize:12, fontWeight:700, background:'linear-gradient(135deg,'+C.accent+','+C.purple+')', color:'#fff', opacity:(!marka||!model||!yil||!km||rayicLoading)?0.5:1}}>
                {rayicLoading ? 'SAHİBİNDEN.COM + ARABAN.COM TARANIYOR...' : 'RAYİÇ DEĞER ARAŞTIR (SAHİBİNDEN + ARABAN)'}
              </button>
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
                    <option value="3">3+ ADET</option>
                  </select>
                </MR.FormGroup>
                <div style={fullS}>
                  <MR.FormGroup label="HASARLI BÖLGE">
                    <select value={bolge} onChange={e => setBolge(e.target.value)} style={S.select}>
                      <option value="on">ÖN KISIM</option>
                      <option value="arka">ARKA KISIM</option>
                      <option value="yan">YAN KISIM</option>
                      <option value="tavan">TAVAN</option>
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
              <button onClick={pdfIndir} disabled={pdfLoading}
                style={{...S.btn, width:'100%', justifyContent:'center', padding:14, fontSize:13, fontWeight:800, background:'linear-gradient(135deg,'+C.success+','+C.cyan+')', color:'#fff', opacity:pdfLoading?0.5:1}}>
                {pdfLoading ? 'PDF OLUŞTURULUYOR...' : 'PDF RAPOR İNDİR (TÜM DETAYLAR)'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
