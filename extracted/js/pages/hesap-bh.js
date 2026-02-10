/* ============================================================
   MR HASAR DANIŞMANLIK – BH HESAPLAMA SAYFASI (hesap-bh.js)
   BEDENİ HASAR (MALULİYET) TAZMİNATI HESAPLAYICI
   ============================================================ */

const MR = window.MR || (window.MR = {});
const {useState, useMemo, useRef} = React;

MR.HesapBHPage = ({setPage, user}) => {
  const {C, S, LIcon, Badge, SectionTitle, FormGroup, EmptyState, fmt, fmtK, parseNum, fmtInput, BH_EMSAL, yasHesapla, asgariUcretBul, pmfDeger, progresifRant} = MR;

  /* ---------- SABİTLER ---------- */
  const EMEKLILIK_YASI = 65;
  const PMF_TABLOLARI = ['TRH2010', 'CSO1980', 'PMF1931'];

  /* ---------- FORM STATE ---------- */
  const [form, setForm] = useState({
    magdurAdi: '',
    dogumTarihi: '',
    cinsiyet: '',
    kazaTarihi: '',
    maluliyetOrani: '',
    meslek: '',
    aylikGelir: '',
    asgariUcretKullan: false,
    pmfTablosu: 'TRH2010',
    teknikFaiz: '10',
    kusurOrani: '100'
  });

  const [sonuc, setSonuc] = useState(null);
  const [hata, setHata] = useState('');
  const sonucRef = useRef(null);

  const u = (k, v) => setForm(p => ({...p, [k]: v}));

  /* ---------- ASGARİ ÜCRET BİLGİSİ ---------- */
  const asgariUcretBilgi = useMemo(() => {
    if (form.kazaTarihi) return asgariUcretBul(form.kazaTarihi);
    return asgariUcretBul(MR.today());
  }, [form.kazaTarihi]);

  /* ---------- HESAPLAMA ---------- */
  const hesapla = () => {
    setHata('');
    setSonuc(null);

    /* VALİDASYON */
    if (!form.magdurAdi.trim()) { setHata('MAĞDUR ADI SOYADI GİRİNİZ'); return; }
    if (!form.dogumTarihi) { setHata('DOĞUM TARİHİ GİRİNİZ'); return; }
    if (!form.cinsiyet) { setHata('CİNSİYET SEÇİNİZ'); return; }
    if (!form.kazaTarihi) { setHata('KAZA TARİHİ GİRİNİZ'); return; }

    const maluliyet = Number(form.maluliyetOrani);
    if (!maluliyet || maluliyet < 1 || maluliyet > 100) { setHata('MALULİYET ORANI 1-100 ARASI OLMAILIDIR'); return; }

    const teknikFaiz = Number(form.teknikFaiz);
    if (isNaN(teknikFaiz) || teknikFaiz < 0) { setHata('TEKNİK FAİZ ORANI GEÇERSİZ'); return; }

    const kusur = Number(form.kusurOrani) || 100;

    /* GELİR BELİRLEME */
    let aylikGelir = 0;
    let gelirKaynagi = '';

    if (form.asgariUcretKullan) {
      const au = asgariUcretBul(form.kazaTarihi);
      if (au) {
        aylikGelir = au.ucret;
        gelirKaynagi = 'ASGARİ ÜCRET (' + au.donem + ')';
      } else {
        setHata('ASGARİ ÜCRET BİLGİSİ BULUNAMADI');
        return;
      }
    } else {
      aylikGelir = parseNum(form.aylikGelir);
      if (aylikGelir <= 0) { setHata('AYLIK GELİR GİRİNİZ VEYA ASGARİ ÜCRET SEÇİNİZ'); return; }
      gelirKaynagi = 'BEYAN EDİLEN GELİR';
    }

    /* YAŞ HESAPLAMA */
    const yas = yasHesapla(form.dogumTarihi, form.kazaTarihi);
    if (yas <= 0) { setHata('YAŞ HESAPLANAMADI - TARİHLERİ KONTROL EDİNİZ'); return; }

    /* PMF - KALAN ÖMÜR */
    const cinsiyetKod = form.cinsiyet === 'ERKEK' ? 'E' : 'K';
    const kalanOmur = pmfDeger(form.pmfTablosu, cinsiyetKod, yas);

    if (kalanOmur <= 0) { setHata('PMF TABLOSUNDAN DEĞER ALINAMADI'); return; }

    /* AKTİF DÖNEM (ŞİMDİDEN EMEKLİLİĞE KADAR) */
    const aktifKalanYil = Math.max(0, EMEKLILIK_YASI - yas);

    /* PASİF DÖNEM (EMEKLİLİKTEN SONRA) */
    const pasifKalanYil = Math.max(0, kalanOmur - aktifKalanYil);

    /* RANT KATSAYILARI */
    const faizOrani = teknikFaiz / 100;
    const aktifRant = progresifRant(aktifKalanYil, faizOrani);
    const pasifRant = progresifRant(pasifKalanYil, faizOrani);

    /* PASİF DÖNEM İÇİN İSKONTO FAKTÖRÜ (AKTİF DÖNEM SONRASINA ERTELENMİŞ) */
    const pasifIskonto = aktifKalanYil > 0 ? (1 / Math.pow(1 + faizOrani, aktifKalanYil)) : 1;

    /* AKTİF DÖNEM GELİR KAYBI */
    const yillikGelir = aylikGelir * 12;
    const aktifGelirKaybi = yillikGelir * (maluliyet / 100) * aktifRant;

    /* PASİF DÖNEM GELİR KAYBI (ASGARİ ÜCRET ÜZERİNDEN) */
    const pasifAylikGelir = (asgariUcretBilgi ? asgariUcretBilgi.ucret : aylikGelir);
    const pasifYillikGelir = pasifAylikGelir * 12;
    const pasifGelirKaybi = pasifYillikGelir * (maluliyet / 100) * pasifRant * pasifIskonto;

    /* TOPLAM */
    const toplamGelirKaybi = aktifGelirKaybi + pasifGelirKaybi;

    /* KUSUR ORANI UYGULA */
    const aktifKusurlu = aktifGelirKaybi * (kusur / 100);
    const pasifKusurlu = pasifGelirKaybi * (kusur / 100);
    const toplamKusurlu = Math.round(aktifKusurlu + pasifKusurlu);

    const sonucObj = {
      magdurAdi: form.magdurAdi,
      dogumTarihi: form.dogumTarihi,
      cinsiyet: form.cinsiyet,
      cinsiyetKod,
      kazaTarihi: form.kazaTarihi,
      yas,
      maluliyet,
      meslek: form.meslek || '-',
      aylikGelir,
      gelirKaynagi,
      yillikGelir,
      pmfTablosu: form.pmfTablosu,
      teknikFaiz,
      kalanOmur,
      aktifKalanYil,
      pasifKalanYil,
      aktifRant: Math.round(aktifRant * 10000) / 10000,
      pasifRant: Math.round(pasifRant * 10000) / 10000,
      pasifIskonto: Math.round(pasifIskonto * 10000) / 10000,
      aktifGelirKaybi: Math.round(aktifGelirKaybi),
      pasifGelirKaybi: Math.round(pasifGelirKaybi),
      pasifAylikGelir,
      toplamGelirKaybi: Math.round(toplamGelirKaybi),
      kusurOrani: kusur,
      aktifKusurlu: Math.round(aktifKusurlu),
      pasifKusurlu: Math.round(pasifKusurlu),
      toplamKusurlu
    };

    setSonuc(sonucObj);

    /* SONUÇ ALANINA KAYDIRMA */
    setTimeout(() => {
      if (sonucRef.current) sonucRef.current.scrollIntoView({behavior: 'smooth', block: 'start'});
    }, 100);
  };

  /* ---------- TEMİZLE ---------- */
  const temizle = () => {
    setForm({
      magdurAdi: '', dogumTarihi: '', cinsiyet: '', kazaTarihi: '',
      maluliyetOrani: '', meslek: '', aylikGelir: '', asgariUcretKullan: false,
      pmfTablosu: 'TRH2010', teknikFaiz: '10', kusurOrani: '100'
    });
    setSonuc(null);
    setHata('');
  };

  /* ---------- PDF ÇIKTI ---------- */
  const pdfCikti = () => {
    if (!sonuc) return;
    const tarih = new Date().toLocaleDateString('tr-TR');
    const saat = new Date().toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'});

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>BH HESAPLAMA RAPORU - ${sonuc.magdurAdi}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI','Arial',sans-serif;color:#1a1a1a;font-size:12px;line-height:1.5;padding:20px 30px}
.header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #7c3aed;padding-bottom:12px;margin-bottom:16px}
.header h1{font-size:16px;color:#7c3aed;letter-spacing:1px}
.header .info{text-align:right;font-size:10px;color:#666}
.section{margin-bottom:14px;border:1px solid #e0e0e0;border-radius:6px;overflow:hidden}
.section-head{background:#7c3aed;color:#fff;padding:8px 14px;font-weight:700;font-size:11px;letter-spacing:0.5px}
.section-head.green{background:#059669}
.section-head.orange{background:#d97706}
.section-body{padding:10px 14px}
table{width:100%;border-collapse:collapse}
table th,table td{padding:6px 10px;border-bottom:1px solid #eee;text-align:left;font-size:11px}
table th{background:#f8fafc;font-weight:600;color:#475569;font-size:10px}
.val{font-weight:700;text-align:right}
.big{font-size:24px;font-weight:900;color:#7c3aed;text-align:center;padding:16px 0}
.sub{font-size:10px;color:#666;text-align:center}
.badge{display:inline-block;padding:2px 10px;border-radius:20px;font-weight:700;font-size:10px}
.badge-green{background:#d1fae5;color:#059669}
.badge-cyan{background:#cffafe;color:#0891b2}
.badge-red{background:#fee2e2;color:#dc2626}
.footer{text-align:center;font-size:9px;color:#999;border-top:1px solid #e0e0e0;padding-top:10px;margin-top:16px}
.note{background:#f5f3ff;border:1px solid #c4b5fd;border-radius:6px;padding:8px 12px;font-size:10px;color:#5b21b6;margin-top:10px}
@media print{body{padding:10px 20px}@page{size:A4;margin:10mm}}
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>MR HASAR DANISMANLIK</h1>
    <div style="font-size:10px;color:#666;margin-top:2px">BEDENI HASAR (MALULIYET) TAZMINAT HESAPLAMA RAPORU</div>
  </div>
  <div class="info">
    <div>TARIH: ${tarih}</div>
    <div>SAAT: ${saat}</div>
    <div>RAPOR NO: BH-${Date.now().toString(36).toUpperCase()}</div>
  </div>
</div>

<div class="section">
  <div class="section-head">MAGDUR BILGILERI</div>
  <div class="section-body">
    <table>
      <tr><td>ADI SOYADI</td><td class="val">${sonuc.magdurAdi}</td></tr>
      <tr><td>DOGUM TARIHI</td><td class="val">${sonuc.dogumTarihi}</td></tr>
      <tr><td>CINSIYET</td><td class="val">${sonuc.cinsiyet}</td></tr>
      <tr><td>KAZA TARIHI</td><td class="val">${sonuc.kazaTarihi}</td></tr>
      <tr><td>KAZA ANI YASI</td><td class="val">${sonuc.yas} YAS</td></tr>
      <tr><td>MESLEK</td><td class="val">${sonuc.meslek}</td></tr>
      <tr><td>MALULIYET ORANI</td><td class="val"><span class="badge badge-red">%${sonuc.maluliyet}</span></td></tr>
    </table>
  </div>
</div>

<div class="section">
  <div class="section-head orange">HESAPLAMA PARAMETRELERI</div>
  <div class="section-body">
    <table>
      <tr><td>AYLIK GELIR (${sonuc.gelirKaynagi})</td><td class="val">${MR.fmtK(sonuc.aylikGelir)}</td></tr>
      <tr><td>YILLIK GELIR</td><td class="val">${MR.fmtK(sonuc.yillikGelir)}</td></tr>
      <tr><td>PMF TABLOSU</td><td class="val">${sonuc.pmfTablosu}</td></tr>
      <tr><td>KALAN OMUR (PMF)</td><td class="val">${sonuc.kalanOmur.toFixed(2)} YIL</td></tr>
      <tr><td>TEKNIK FAIZ ORANI</td><td class="val">%${sonuc.teknikFaiz}</td></tr>
      <tr><td>AKTIF DONEM</td><td class="val">${sonuc.aktifKalanYil} YIL (65 YASA KADAR)</td></tr>
      <tr><td>AKTIF RANT KATSAYISI</td><td class="val">${sonuc.aktifRant.toFixed(4)}</td></tr>
      <tr><td>PASIF DONEM</td><td class="val">${sonuc.pasifKalanYil.toFixed(1)} YIL</td></tr>
      <tr><td>PASIF RANT KATSAYISI</td><td class="val">${sonuc.pasifRant.toFixed(4)}</td></tr>
      <tr><td>PASIF ISKONTO FAKTORU</td><td class="val">x${sonuc.pasifIskonto.toFixed(4)}</td></tr>
      <tr><td>PASIF DONEM GELIRI</td><td class="val">${MR.fmtK(sonuc.pasifAylikGelir)}/AY</td></tr>
      <tr><td>KUSUR ORANI</td><td class="val">%${sonuc.kusurOrani}</td></tr>
    </table>
  </div>
</div>

<div class="section">
  <div class="section-head green">HESAPLAMA SONUCU</div>
  <div class="section-body">
    <table>
      <tr><td>AKTIF DONEM GELIR KAYBI</td><td class="val" style="color:#059669;font-size:13px">${MR.fmtK(sonuc.aktifKusurlu)}</td></tr>
      <tr><td>PASIF DONEM GELIR KAYBI</td><td class="val" style="color:#0891b2;font-size:13px">${MR.fmtK(sonuc.pasifKusurlu)}</td></tr>
    </table>
    <div class="big">${MR.fmtK(sonuc.toplamKusurlu)}</div>
    <div class="sub">HESAPLANAN TOPLAM TAZMINAT TUTARI ${sonuc.kusurOrani < 100 ? '(KUSUR ORANI %' + sonuc.kusurOrani + ' UYGULANMISTIR)' : ''}</div>
    ${sonuc.kusurOrani < 100 ? '<div class="sub" style="margin-top:4px">TAM TUTAR: ' + MR.fmtK(sonuc.toplamGelirKaybi) + ' | INDIRIM: ' + MR.fmtK(sonuc.toplamGelirKaybi - sonuc.toplamKusurlu) + '</div>' : ''}
  </div>
</div>

<div class="note">
  <strong>ONEMLI NOT:</strong> BU RAPOR MR HASAR DANISMANLIK DOSYA TAKIP SISTEMI TARAFINDAN
  OTOMATIK OLARAK OLUSTURULMUSTUR. BEDENI HASAR TAZMINATI PROGRESIF RANT (1/LN) METODU
  ILE HESAPLANMISTIR. PMF TABLOSU: ${sonuc.pmfTablosu}. KESIN TUTAR MAHKEME VEYA
  TAHKIM KOMISYONU KARARIYLA BELIRLENIR.
</div>

<div class="footer">
  MR HASAR DANISMANLIK &copy; ${new Date().getFullYear()} - DOSYA TAKIP SISTEMI - HERZAMAN FARK EDER
</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=800,height=1000');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    } else {
      alert('PDF OLUSTURMAK ICIN POP-UP ENGELLEYICINIZI KAPATINIZ');
    }
  };

  /* ---------- DOSYAYA KAYDET ---------- */
  const dosyayaKaydet = async () => {
    if (!sonuc) return;
    const urlParts = (window.location.hash || '').split('dosya_id=');
    const dosyaId = urlParts.length > 1 ? urlParts[1] : null;
    if (!dosyaId) {
      alert('BU HESAPLAMAYI BİR DOSYAYA KAYDETMEK İÇİN DOSYA DETAY SAYFASINDAN ERİŞİNİZ.');
      return;
    }
    try {
      const r = await MR.api.req('/dosya/hesaplama-kaydet.php', {
        method: 'POST',
        body: JSON.stringify({
          dosya_id: dosyaId,
          hesap_turu: 'BH',
          sonuc: sonuc
        })
      });
      if (r?.success) alert('HESAPLAMA DOSYAYA KAYDEDİLDİ');
      else alert(r?.error || 'KAYDETME HATASI');
    } catch (e) {
      alert('BAĞLANTI HATASI');
    }
  };

  /* ---------- TABLO STİLLERİ ---------- */
  const thStyle = {padding: '10px 12px', textAlign: 'left', color: C.textMuted, fontWeight: 600, fontSize: 10, borderBottom: `1px solid ${C.border}`};
  const tdStyle = {padding: '10px 12px', fontSize: 12, borderBottom: `1px solid ${C.border}`};

  /* ---------- TOGGLE STİLİ ---------- */
  const toggleStyle = (aktif) => ({
    width: 44, height: 24, borderRadius: 12, padding: 2,
    background: aktif ? C.success : C.borderLight,
    cursor: 'pointer', transition: 'all .2s',
    display: 'flex', alignItems: 'center',
    justifyContent: aktif ? 'flex-end' : 'flex-start'
  });
  const toggleDot = {width: 20, height: 20, borderRadius: 10, background: '#fff', transition: 'all .2s'};

  /* ═══════════════════════════════════════════ RENDER ═══════════════════════════════════════════ */
  return (
    <div className="fade-in">
      {/* BAŞLIK */}
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
          <div style={{width: 44, height: 44, borderRadius: 12, background: `${C.purple}22`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <LIcon name="Heart" size={22} color={C.purple}/>
          </div>
          <div>
            <div style={{fontSize: 20, fontWeight: 800}}>BEDENİ HASAR HESAPLAMA</div>
            <div style={{fontSize: 11, color: C.textMuted, letterSpacing: 1}}>MALULİYET TAZMİNATI HESAPLAYICI</div>
          </div>
        </div>
        <button style={{...S.btn, ...S.btnG}} onClick={() => setPage('home')}>
          <LIcon name="ArrowLeft" size={14}/> ANA SAYFA
        </button>
      </div>

      {/* HATA MESAJI */}
      {hata && (
        <div style={{padding: '12px 16px', background: `${C.danger}22`, border: `1px solid ${C.danger}44`, borderRadius: 10, marginBottom: 16, fontSize: 12, color: C.danger, display: 'flex', alignItems: 'center', gap: 8}}>
          <LIcon name="AlertCircle" size={16} color={C.danger}/> {hata}
        </div>
      )}

      {/* ANA İÇERİK: SOL FORM + SAĞ SONUÇ */}
      <div style={{display: 'grid', gridTemplateColumns: sonuc ? '1fr 1fr' : '1fr', gap: 20}}>

        {/* ═══ SOL: HESAPLAMA FORMU ═══ */}
        <div style={S.card}>
          <SectionTitle icon="Stethoscope" title="MAĞDUR VE HESAPLAMA BİLGİLERİ" sub="BEDENİ HASAR PARAMETRELERİNİ GİRİNİZ"/>
          <div style={S.cardBody}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>

              {/* MAĞDUR ADI SOYADI */}
              <FormGroup label="MAĞDUR ADI SOYADI *" full>
                <input style={S.input} value={form.magdurAdi} placeholder="ADI SOYADI GİRİNİZ"
                  onChange={e => u('magdurAdi', e.target.value.toUpperCase())}/>
              </FormGroup>

              {/* DOĞUM TARİHİ */}
              <FormGroup label="DOĞUM TARİHİ *">
                <input type="date" style={S.input} value={form.dogumTarihi}
                  onChange={e => u('dogumTarihi', e.target.value)}/>
              </FormGroup>

              {/* CİNSİYET */}
              <FormGroup label="CİNSİYET *">
                <select style={S.select} value={form.cinsiyet} onChange={e => u('cinsiyet', e.target.value)}>
                  <option value="">CİNSİYET SEÇİNİZ</option>
                  <option value="ERKEK">ERKEK</option>
                  <option value="KADIN">KADIN</option>
                </select>
              </FormGroup>

              {/* KAZA TARİHİ */}
              <FormGroup label="KAZA TARİHİ *">
                <input type="date" style={S.input} value={form.kazaTarihi}
                  onChange={e => u('kazaTarihi', e.target.value)}/>
              </FormGroup>

              {/* MALULİYET ORANI */}
              <FormGroup label="MALULİYET ORANI (%) *">
                <input type="number" style={S.input} value={form.maluliyetOrani} min="1" max="100"
                  onChange={e => u('maluliyetOrani', e.target.value)} placeholder="ÖRN: 15"/>
              </FormGroup>

              {/* MESLEK */}
              <FormGroup label="MESLEK">
                <input style={S.input} value={form.meslek} placeholder="MESLEK GİRİNİZ"
                  onChange={e => u('meslek', e.target.value.toUpperCase())}/>
              </FormGroup>

              {/* ASGARİ ÜCRET TOGGLE */}
              <FormGroup label="ASGARİ ÜCRET KULLAN" full>
                <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                  <div style={toggleStyle(form.asgariUcretKullan)} onClick={() => u('asgariUcretKullan', !form.asgariUcretKullan)}>
                    <div style={toggleDot}/>
                  </div>
                  <span style={{fontSize: 12, color: form.asgariUcretKullan ? C.success : C.textMuted, fontWeight: 600}}>
                    {form.asgariUcretKullan ? 'AKTİF' : 'PASİF'}
                    {form.asgariUcretKullan && asgariUcretBilgi && (
                      <span style={{color: C.textSec, fontWeight: 400}}> - {fmtK(asgariUcretBilgi.ucret)} ({asgariUcretBilgi.donem})</span>
                    )}
                  </span>
                </div>
              </FormGroup>

              {/* AYLIK GELİR */}
              {!form.asgariUcretKullan && (
                <FormGroup label="AYLIK GELİR (₺) *" full>
                  <input style={S.input} value={form.aylikGelir} placeholder="ÖRN: 25.000"
                    onChange={e => u('aylikGelir', fmtInput(e.target.value))}/>
                </FormGroup>
              )}
            </div>

            {/* HESAPLAMA PARAMETRELERİ */}
            <div style={{marginTop: 20, padding: '16px', background: `${C.accent}08`, borderRadius: 10, border: `1px solid ${C.accent}22`}}>
              <div style={{fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 12, letterSpacing: 0.5}}>HESAPLAMA PARAMETRELERİ</div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14}}>

                {/* PMF TABLOSU */}
                <FormGroup label="PMF TABLOSU">
                  <select style={S.select} value={form.pmfTablosu} onChange={e => u('pmfTablosu', e.target.value)}>
                    {PMF_TABLOLARI.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </FormGroup>

                {/* TEKNİK FAİZ */}
                <FormGroup label="TEKNİK FAİZ (%)">
                  <input type="number" style={S.input} value={form.teknikFaiz} min="0" max="30"
                    onChange={e => u('teknikFaiz', e.target.value)} placeholder="10"/>
                </FormGroup>

                {/* KUSUR ORANI */}
                <FormGroup label="KUSUR ORANI (%)">
                  <input type="number" style={S.input} value={form.kusurOrani} min="0" max="100"
                    onChange={e => u('kusurOrani', e.target.value)} placeholder="100"/>
                </FormGroup>
              </div>
            </div>

            {/* BUTONLAR */}
            <div style={{display: 'flex', gap: 10, marginTop: 24}}>
              <button style={{...S.btn, ...S.btnP, flex: 1, justifyContent: 'center'}} onClick={hesapla}>
                <LIcon name="Calculator" size={16} color="#fff"/> HESAPLA
              </button>
              <button style={{...S.btn, ...S.btnG}} onClick={temizle}>
                <LIcon name="RefreshCw" size={14}/> TEMİZLE
              </button>
              {sonuc && (
                <button style={{...S.btn, ...S.btnW}} onClick={pdfCikti}>
                  <LIcon name="Printer" size={14}/> PDF ÇIKTI
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ═══ SAĞ: SONUÇLAR PANELİ ═══ */}
        {sonuc && (
          <div ref={sonucRef}>
            {/* ANA SONUÇ KARTI */}
            <div style={{...S.card, marginBottom: 16, border: `1px solid ${C.purple}44`}}>
              <div style={{...S.cardHead, background: `${C.purple}11`}}>
                <LIcon name="Heart" size={18} color={C.purple}/>
                <span style={{fontWeight: 700, fontSize: 14, color: C.purple}}>TAZMİNAT HESABI SONUCU</span>
              </div>
              <div style={S.cardBody}>
                {/* BÜYÜK TUTAR */}
                <div style={{textAlign: 'center', padding: '20px 0'}}>
                  <div style={{fontSize: 11, color: C.textMuted, letterSpacing: 1, marginBottom: 6}}>TOPLAM TAZMİNAT</div>
                  <div style={{fontSize: 40, fontWeight: 900, color: C.purple, letterSpacing: -1}}>{fmtK(sonuc.toplamKusurlu)}</div>
                  {sonuc.kusurOrani < 100 && (
                    <div style={{fontSize: 11, color: C.textMuted, marginTop: 4}}>
                      TAM TUTAR: {fmtK(sonuc.toplamGelirKaybi)} | KUSUR: %{sonuc.kusurOrani}
                    </div>
                  )}
                </div>

                {/* AKTİF VE PASİF DÖNEM KUTULARI */}
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16}}>
                  {/* AKTİF DÖNEM */}
                  <div style={{padding: '16px', background: `${C.success}11`, borderRadius: 10, border: `1px solid ${C.success}22`, textAlign: 'center'}}>
                    <div style={{fontSize: 10, color: C.textMuted, letterSpacing: 0.5, marginBottom: 4}}>AKTİF DÖNEM</div>
                    <div style={{fontSize: 22, fontWeight: 800, color: C.success}}>{fmtK(sonuc.aktifKusurlu)}</div>
                    <div style={{fontSize: 11, color: C.textMuted, marginTop: 4}}>{sonuc.aktifKalanYil} YIL</div>
                  </div>
                  {/* PASİF DÖNEM */}
                  <div style={{padding: '16px', background: `${C.cyan}11`, borderRadius: 10, border: `1px solid ${C.cyan}22`, textAlign: 'center'}}>
                    <div style={{fontSize: 10, color: C.textMuted, letterSpacing: 0.5, marginBottom: 4}}>PASİF DÖNEM</div>
                    <div style={{fontSize: 22, fontWeight: 800, color: C.cyan}}>{fmtK(sonuc.pasifKusurlu)}</div>
                    <div style={{fontSize: 11, color: C.textMuted, marginTop: 4}}>{sonuc.pasifKalanYil.toFixed(1)} YIL</div>
                  </div>
                </div>

                {/* MAĞDUR BİLGİLERİ */}
                <div style={{padding: '12px 16px', background: `${C.accent}11`, borderRadius: 8, marginBottom: 16}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8}}>
                    <LIcon name="User" size={16} color={C.accent}/>
                    <span style={{fontSize: 13, fontWeight: 700}}>{sonuc.magdurAdi}</span>
                    <Badge text={sonuc.cinsiyet} color={sonuc.cinsiyet === 'ERKEK' ? C.accent : C.pink}/>
                    <Badge text={'%' + sonuc.maluliyet + ' MALULİYET'} color={C.danger}/>
                  </div>
                  <div style={{fontSize: 11, color: C.textMuted}}>
                    {sonuc.yas} YAŞ | MESLEK: {sonuc.meslek} | KAZA: {sonuc.kazaTarihi}
                  </div>
                </div>

                {/* HESAPLAMA DETAYLARI */}
                <div style={{fontSize: 12}}>
                  <div style={{fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 10, letterSpacing: 0.5}}>HESAPLAMA DETAYLARI</div>

                  {[
                    {label: 'KAZA ANI YAŞI', value: sonuc.yas + ' YAŞ', icon: 'User', color: C.accent},
                    {label: 'MALULİYET ORANI', value: '%' + sonuc.maluliyet, icon: 'Heart', color: C.danger},
                    {label: 'AYLIK GELİR (' + sonuc.gelirKaynagi + ')', value: fmtK(sonuc.aylikGelir), icon: 'TurkishLira', color: C.success},
                    {label: 'YILLIK GELİR', value: fmtK(sonuc.yillikGelir), icon: 'TrendingUp', color: C.success},
                    {label: 'PMF TABLOSU', value: sonuc.pmfTablosu, icon: 'Database', color: C.purple},
                    {label: 'KALAN ÖMÜR (PMF)', value: sonuc.kalanOmur.toFixed(2) + ' YIL', icon: 'Clock', color: C.cyan},
                    {label: 'TEKNİK FAİZ', value: '%' + sonuc.teknikFaiz, icon: 'Percent', color: C.warning},
                    {label: 'AKTİF DÖNEM KALAN YIL', value: sonuc.aktifKalanYil + ' YIL (EMEKLİLİK YAŞI: ' + EMEKLILIK_YASI + ')', icon: 'Activity', color: C.success},
                    {label: 'AKTİF DÖNEM RANT KATSAYISI', value: sonuc.aktifRant.toFixed(4), icon: 'BarChart3', color: C.success},
                    {label: 'PASİF DÖNEM KALAN YIL', value: sonuc.pasifKalanYil.toFixed(1) + ' YIL', icon: 'Clock', color: C.cyan},
                    {label: 'PASİF DÖNEM RANT KATSAYISI', value: sonuc.pasifRant.toFixed(4), icon: 'BarChart3', color: C.cyan},
                    {label: 'PASİF DÖNEM İSKONTO', value: 'x' + sonuc.pasifIskonto.toFixed(4), icon: 'TrendingDown', color: C.warning},
                    {label: 'PASİF DÖNEM GELİRİ (ASGARİ ÜCRET)', value: fmtK(sonuc.pasifAylikGelir) + '/AY', icon: 'Wallet', color: C.cyan}
                  ].map((row, i) => (
                    <div key={i} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${C.border}`}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                        <LIcon name={row.icon} size={13} color={row.color}/>
                        <span style={{color: C.textSec, fontSize: 11}}>{row.label}</span>
                      </div>
                      <span style={{fontWeight: 700, fontSize: 12}}>{row.value}</span>
                    </div>
                  ))}

                  {/* DÖNEM TUTARLARI */}
                  <div style={{marginTop: 10}}>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: `${C.success}11`, borderRadius: 8, marginBottom: 6}}>
                      <span style={{fontWeight: 700, color: C.success, fontSize: 12}}>AKTİF DÖNEM GELİR KAYBI</span>
                      <span style={{fontWeight: 800, fontSize: 14, color: C.success}}>{fmtK(sonuc.aktifKusurlu)}</span>
                    </div>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: `${C.cyan}11`, borderRadius: 8, marginBottom: 6}}>
                      <span style={{fontWeight: 700, color: C.cyan, fontSize: 12}}>PASİF DÖNEM GELİR KAYBI</span>
                      <span style={{fontWeight: 800, fontSize: 14, color: C.cyan}}>{fmtK(sonuc.pasifKusurlu)}</span>
                    </div>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: `${C.purple}15`, borderRadius: 8}}>
                      <span style={{fontWeight: 800, color: C.purple}}>TOPLAM TAZMİNAT</span>
                      <span style={{fontWeight: 900, fontSize: 18, color: C.purple}}>{fmtK(sonuc.toplamKusurlu)}</span>
                    </div>
                  </div>

                  {/* KUSUR BİLGİSİ */}
                  {sonuc.kusurOrani < 100 && (
                    <div style={{marginTop: 12, padding: '10px 14px', background: `${C.warning}15`, border: `1px solid ${C.warning}33`, borderRadius: 8}}>
                      <div style={{fontSize: 11, fontWeight: 700, color: C.warning, marginBottom: 4}}>KUSUR İNDİRİMİ UYGULANMIŞTIR</div>
                      <div style={{fontSize: 12, color: C.textSec}}>
                        TAM TUTAR: {fmtK(sonuc.toplamGelirKaybi)} | KUSUR ORANI: %{sonuc.kusurOrani} | İNDİRİM: {fmtK(sonuc.toplamGelirKaybi - sonuc.toplamKusurlu)}
                      </div>
                    </div>
                  )}
                </div>

                {/* DOSYAYA KAYDET BUTONU */}
                <div style={{marginTop: 16, display: 'flex', gap: 10}}>
                  <button style={{...S.btn, ...S.btnP, flex: 1, justifyContent: 'center'}} onClick={dosyayaKaydet}>
                    <LIcon name="Save" size={14} color="#fff"/> DOSYAYA KAYDET
                  </button>
                  <button style={{...S.btn, ...S.btnW}} onClick={pdfCikti}>
                    <LIcon name="Printer" size={14}/> PDF ÇIKTI
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ ALT: EMSAL KARARLAR ═══ */}
      <div style={{...S.card, marginTop: 20}}>
        <SectionTitle icon="Gavel" title="BEDENİ HASAR EMSAL KARARLARI" sub="TAHKİM KOMİSYONU VE YARGITAY KARARLARI"/>
        <div style={S.cardBody}>
          {BH_EMSAL && BH_EMSAL.length > 0 ? (
            <div style={{overflowX: 'auto'}}>
              <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead>
                  <tr>
                    {['KAYNAK', 'YIL', 'MALULİYET', 'TAZMİNAT TUTARI', 'DETAY'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BH_EMSAL.map((e, i) => (
                    <tr key={i} style={{transition: 'background .2s'}}
                      onMouseEnter={ev => ev.currentTarget.style.background = C.bgHover}
                      onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                      <td style={tdStyle}>
                        <Badge text={e.kaynak} color={e.kaynak === 'YARGITAY' ? C.danger : C.accent}/>
                      </td>
                      <td style={{...tdStyle, fontWeight: 600}}>{e.yil}</td>
                      <td style={{...tdStyle, textAlign: 'center'}}>
                        <Badge text={'%' + e.maluliyet} color={C.purple}/>
                      </td>
                      <td style={{...tdStyle, fontWeight: 700, color: C.success}}>{fmtK(e.tutar)}</td>
                      <td style={{...tdStyle, color: C.textSec}}>{e.detay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon="Gavel" title="EMSAL BULUNAMADI" desc="BEDENİ HASAR EMSAL KARARLARI BULUNAMAMIŞTIR"/>
          )}

          {/* PMF BİLGİ NOTU */}
          <div style={{marginTop: 16, padding: '12px 16px', background: `${C.purple}11`, borderRadius: 8, border: `1px solid ${C.purple}22`}}>
            <div style={{fontSize: 11, fontWeight: 700, color: C.purple, marginBottom: 6}}>PMF TABLOSU BİLGİLERİ</div>
            <div style={{fontSize: 12, color: C.textSec, lineHeight: 1.6}}>
              <strong>TRH2010:</strong> TÜRKİYE HAYAT TABLOLARI 2010 - EN GÜNCEL VE YAYGIN KULLANILAN TABLO.
              YARGITAY VE TAHKİM KOMİSYONU TARAFINDAN TERCİH EDİLMEKTEDİR.
            </div>
            <div style={{fontSize: 12, color: C.textSec, lineHeight: 1.6, marginTop: 4}}>
              <strong>CSO1980:</strong> COMMISSIONERS STANDARD ORDINARY 1980 - ULUSLARARASI STANDART TABLO.
            </div>
            <div style={{fontSize: 12, color: C.textSec, lineHeight: 1.6, marginTop: 4}}>
              <strong>PMF1931:</strong> POPULATION MASCULINE ET FEMININE 1931 - EN ESKİ TABLO. BAZI MAHKEMELER HALA KULLANMAKTADIR.
            </div>
          </div>

          {/* HESAPLAMA AÇIKLAMASI */}
          <div style={{marginTop: 12, padding: '12px 16px', background: `${C.accent}08`, borderRadius: 8, border: `1px solid ${C.accent}22`}}>
            <div style={{fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 6}}>HESAPLAMA YÖNTEMİ</div>
            <div style={{fontSize: 12, color: C.textSec, lineHeight: 1.6}}>
              BEDENİ HASAR TAZMİNATI PROGRESİF RANT (1/LN) METODU İLE HESAPLANMAKTADIR.
              AKTİF DÖNEM (KAZA YAŞINDAN EMEKLİLİK YAŞINA KADAR) VE PASİF DÖNEM
              (EMEKLİLİKTEN PMF TABLONUNA GÖRE BEKLENEN ÖMÜR SONUNA KADAR) AYRI AYRI
              HESAPLANARAK TOPLANIR. PASİF DÖNEM ASGARİ ÜCRET ÜZERİNDEN DEĞERLENDİRİLİR.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
