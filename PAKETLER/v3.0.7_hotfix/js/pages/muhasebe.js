/* ============================================================
   MR HASAR DANIŞMANLIK – MUHASEBE MODÜLÜ (muhasebe.js)
   GELİR, GİDER, KOMİSYON, KASA, MALİYET ANALİZİ, RAPORLAR
   ============================================================ */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useRef, useMemo} = React;

/* ═══════════════════════════════════════════════════════════
   ANA SAYFA BİLEŞENİ – SEKME YAPISI
   ═══════════════════════════════════════════════════════════ */
MR.MuhasebePage = ({setPage, user, subPage}) => {
  const {C, S, LIcon} = MR;
  const aktifSekme = subPage || 'gelir';

  const sekmeler = [
    {key:'gelir',    label:'GELİR YÖNETİMİ',     icon:'TrendingUp'},
    {key:'gider',    label:'GİDER YÖNETİMİ',      icon:'TrendingDown'},
    {key:'komisyon', label:'KOMİSYON / PRİM',      icon:'Percent'},
    {key:'kasa',     label:'KASA / BANKA',          icon:'Wallet'},
    {key:'maliyet',  label:'MALİYET ANALİZİ',      icon:'PieChart'},
    {key:'rapor',    label:'FİNANSAL RAPORLAR',     icon:'BarChart3'},
    {key:'mutabakat',label:'AY SONU RAPORU',        icon:'FileSpreadsheet'}
  ];

  return (
    <div className="fade-in">
      {/* SEKME BAR */}
      <div style={{display:'flex',gap:4,marginBottom:20,background:C.bgCard,borderRadius:12,padding:6,border:`1px solid ${C.border}`}}>
        {sekmeler.map(s => {
          const aktif = aktifSekme === s.key;
          return (
            <div key={s.key} onClick={() => setPage('muhasebe-' + s.key)}
              style={{
                flex:1, padding:'12px 8px', borderRadius:8, cursor:'pointer', textAlign:'center',
                background: aktif ? `${C.accent}22` : 'transparent',
                border: `1px solid ${aktif ? C.accent + '44' : 'transparent'}`,
                transition:'all .2s'
              }}
              onMouseEnter={e => { if(!aktif) e.currentTarget.style.background = C.bgHover; }}
              onMouseLeave={e => { if(!aktif) e.currentTarget.style.background = 'transparent'; }}>
              <LIcon name={s.icon} size={16} color={aktif ? C.accent : C.textMuted} style={{marginBottom:4}}/>
              <div style={{fontSize:11,fontWeight:aktif?700:500,color:aktif?C.accent:C.textSec,marginTop:4,letterSpacing:0.5}}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* SEKME İÇERİKLERİ */}
      {aktifSekme === 'gelir'    && <GelirYonetimi setPage={setPage} user={user}/>}
      {aktifSekme === 'gider'    && <GiderYonetimi setPage={setPage} user={user}/>}
      {aktifSekme === 'komisyon' && <KomisyonPrim  setPage={setPage} user={user}/>}
      {aktifSekme === 'kasa'     && <KasaBanka     setPage={setPage} user={user}/>}
      {aktifSekme === 'maliyet'  && <MaliyetAnalizi setPage={setPage} user={user}/>}
      {aktifSekme === 'rapor'    && <FinansalRaporlar setPage={setPage} user={user}/>}
      {aktifSekme === 'mutabakat'&& <AylikMutabakat setPage={setPage} user={user}/>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   YARDIMCI: TL Input — basamak ayrımı + ₺ otomatik (canlı format)
   ═══════════════════════════════════════════════════════════ */
const TLInput = ({value, onChange, placeholder, style}) => {
  const {C, S} = MR;
  const [focus, setFocus] = useState(false);
  const num = parseFloat(value);
  const isEmpty = value === '' || value === null || value === undefined || isNaN(num);

  const formatGoster = (v) => {
    if (v === '' || v === null || v === undefined) return '';
    const n = parseFloat(v);
    if (isNaN(n)) return '';
    const isInt = Number.isInteger(n);
    return n.toLocaleString('tr-TR', {
      minimumFractionDigits: isInt ? 0 : 2,
      maximumFractionDigits: 2
    });
  };

  const goruntu = focus
    ? (isEmpty ? '' : String(value))
    : (isEmpty ? '' : formatGoster(value) + ' ₺');

  return (
    <input
      type="text"
      inputMode="decimal"
      value={goruntu}
      placeholder={placeholder || '0 ₺'}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      onChange={e => {
        let raw = e.target.value;
        // Sadece rakam, virgül, nokta kabul et
        raw = raw.replace(/[^\d.,-]/g, '').replace(',', '.');
        // Birden fazla nokta varsa ilkini bırak
        const parts = raw.split('.');
        if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
        onChange(raw);
      }}
      style={{...S.input, padding:'8px 10px', fontSize:12, fontFamily:'monospace', textAlign:'right', ...(style||{})}}
    />
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 7 – AY SONU RAPORU (v3.0.7 — Sayfa içi canlı rapor + Kaydet/Liste/Düzenle)
   ═══════════════════════════════════════════════════════════ */
const AylikMutabakat = ({setPage, user}) => {
  const {C, S, LIcon, SectionTitle} = MR;
  const buYil = new Date().getFullYear();
  const onAy = new Date(); onAy.setDate(1); onAy.setMonth(onAy.getMonth() - 1);

  // Form state
  const [duzenlemeId, setDuzenlemeId] = useState(null); // varsa edit modu
  const [yil, setYil] = useState(onAy.getFullYear());
  const [ay, setAy] = useState(String(onAy.getMonth() + 1).padStart(2, '0'));
  const [durum, setDurum] = useState('taslak');
  const [loading, setLoading] = useState(false);
  const [savedData, setSavedData] = useState(null); // çekilen ham veri (firma, hazirlayan)
  const [dosyalar, setDosyalar] = useState([]);
  const [devir, setDevir] = useState('');
  const [ayIci, setAyIci] = useState('');
  const [sbm, setSbm] = useState('');
  const [ekran, setEkran] = useState('');
  const [atk, setAtk] = useState('');
  const [pozAdet, setPozAdet] = useState(0);
  const [pozToplam, setPozToplam] = useState('');
  const [mahsupAdet, setMahsupAdet] = useState(0);
  const [mahsupToplam, setMahsupToplam] = useState('');
  const [notMetni, setNotMetni] = useState('');
  const [kayitlar, setKayitlar] = useState([]);
  const [mesaj, setMesaj] = useState(null); // {tip:'success'|'error', text}
  const [silOnay, setSilOnay] = useState(null);

  const tok = () => localStorage.getItem('mr_token') || localStorage.getItem('token') || localStorage.getItem('jwt') || '';
  const apiCall = async (path, options = {}) => {
    const headers = {'Content-Type': 'application/json', ...(options.headers||{})};
    const t = tok(); if (t) headers['Authorization'] = 'Bearer ' + t;
    try {
      const r = await fetch(path, {...options, headers, credentials:'include'});
      return await r.json();
    } catch(e) { return {success:false, error: e.message}; }
  };

  // Sistemden veriyi çek (canlı dosyalar + kapanışlar)
  const veriCek = async () => {
    setLoading(true);
    setMesaj(null);
    const j = await apiCall(`/api/v1/muhasebe/aylik-mutabakat-data.php?donem=${yil}-${ay}`);
    if (j?.success) {
      setSavedData(j.data);
      setDosyalar(j.data.dosyalar || []);
      setPozAdet(j.data.kapanis?.poz_adet || 0);
      setPozToplam(j.data.kapanis?.poz_toplam || '');
      setMahsupAdet(j.data.kapanis?.mahsup_adet || 0);
      setMahsupToplam(j.data.kapanis?.mahsup_toplam || '');
      setMesaj({tip:'info', text: `${j.data.dosyalar?.length || 0} dosya + ${(j.data.kapanis?.poz_adet||0)+(j.data.kapanis?.mahsup_adet||0)} kapanış sistemden çekildi`});
    } else {
      setMesaj({tip:'error', text: j?.error || 'Veri çekilemedi'});
    }
    setLoading(false);
  };

  // Kayıtlı raporları listele
  const listeleKayitli = async () => {
    const j = await apiCall('/api/v1/muhasebe/mutabakat-list.php');
    if (j?.success) setKayitlar(j.data?.items || []);
  };

  useEffect(() => { veriCek(); listeleKayitli(); }, []);

  // Kaydet
  const kaydet = async (yeniDurum) => {
    setLoading(true);
    setMesaj(null);
    const payload = {
      donem: `${yil}-${ay}`,
      durum: yeniDurum || durum,
      devir: parseFloat(devir) || 0,
      ay_ici_odemeler: parseFloat(ayIci) || 0,
      sbm_sorgu: parseFloat(sbm) || 0,
      ekran_odeme: parseFloat(ekran) || 0,
      atk_masrafi: parseFloat(atk) || 0,
      poz_adet: parseInt(pozAdet) || 0,
      poz_toplam: parseFloat(pozToplam) || 0,
      mahsup_adet: parseInt(mahsupAdet) || 0,
      mahsup_toplam: parseFloat(mahsupToplam) || 0,
      dosyalar: dosyalar.map(d => ({...d, tutar: parseFloat(d.tutar)||0})),
      not_metni: notMetni
    };
    const j = await apiCall('/api/v1/muhasebe/mutabakat-kaydet.php', {method:'POST', body: JSON.stringify(payload)});
    setLoading(false);
    if (j?.success) {
      setMesaj({tip:'success', text: j.message || 'Kaydedildi'});
      setDuzenlemeId(j.data?.id);
      if (yeniDurum) setDurum(yeniDurum);
      listeleKayitli();
    } else {
      setMesaj({tip:'error', text: j?.error || 'Kayıt hatası'});
    }
  };

  // Mevcut kaydı düzenle (form'a yükle)
  const duzenle = async (kaydId) => {
    setLoading(true);
    const j = await apiCall(`/api/v1/muhasebe/mutabakat-getir.php?id=${kaydId}`);
    setLoading(false);
    if (j?.success) {
      const r = j.data;
      setDuzenlemeId(r.id);
      setYil(r.donem.split('-')[0]);
      setAy(r.donem.split('-')[1]);
      setDurum(r.durum);
      setDevir(r.devir);
      setAyIci(r.ay_ici_odemeler);
      setSbm(r.sbm_sorgu);
      setEkran(r.ekran_odeme);
      setAtk(r.atk_masrafi);
      setPozAdet(r.poz_adet);
      setPozToplam(r.poz_toplam);
      setMahsupAdet(r.mahsup_adet);
      setMahsupToplam(r.mahsup_toplam);
      setNotMetni(r.not_metni || '');
      setDosyalar(r.dosyalar || []);
      setMesaj({tip:'info', text: r.baslik + ' düzenleme moduna alındı'});
      window.scrollTo({top:0, behavior:'smooth'});
    } else {
      setMesaj({tip:'error', text: j?.error || 'Yüklenemedi'});
    }
  };

  // Sil
  const sil = async (kaydId) => {
    const j = await apiCall('/api/v1/muhasebe/mutabakat-sil.php', {method:'POST', body: JSON.stringify({id: kaydId})});
    if (j?.success) {
      setMesaj({tip:'success', text: j.message});
      listeleKayitli();
      if (duzenlemeId === kaydId) {
        setDuzenlemeId(null);
        veriCek();
      }
    } else {
      setMesaj({tip:'error', text: j?.error || 'Silme hatası'});
    }
    setSilOnay(null);
  };

  // Yeni rapor moduna dön
  const yeniRapor = () => {
    setDuzenlemeId(null);
    setDurum('taslak');
    setDevir(''); setAyIci(''); setSbm(''); setEkran(''); setAtk('');
    setNotMetni('');
    veriCek();
    setMesaj({tip:'info', text: 'Yeni rapor modu — sistemden güncel veri çekildi'});
  };

  const aylar = [
    {v:'01',l:'OCAK'},{v:'02',l:'ŞUBAT'},{v:'03',l:'MART'},{v:'04',l:'NİSAN'},
    {v:'05',l:'MAYIS'},{v:'06',l:'HAZİRAN'},{v:'07',l:'TEMMUZ'},{v:'08',l:'AĞUSTOS'},
    {v:'09',l:'EYLÜL'},{v:'10',l:'EKİM'},{v:'11',l:'KASIM'},{v:'12',l:'ARALIK'}
  ];
  const yillar = []; for (let y = buYil + 1; y >= buYil - 5; y--) yillar.push(y);
  const ayAdi = aylar.find(a => a.v === ay)?.l || ay;

  // Hesaplamalar
  const num = v => parseFloat(v) || 0;
  const dev = num(devir), ayi = num(ayIci);
  const sb = num(sbm), ek = num(ekran), at = num(atk);
  const dosyaTop = dosyalar.reduce((s,d) => s + num(d.tutar), 0);
  const adkLst = dosyalar.filter(d => (d.tipKisa==='ADK') || (d.tip||'').toUpperCase().includes('ARAÇ'));
  const bhLst  = dosyalar.filter(d => (d.tipKisa==='BH')  || (d.tip||'').toUpperCase().includes('BEDENİ'));
  const mdkLst = dosyalar.filter(d => (d.tipKisa==='MDK') || (d.tip||'').toUpperCase().includes('MADDİ'));
  const adkTop = adkLst.reduce((s,d) => s + num(d.tutar), 0);
  const bhTop  = bhLst.reduce((s,d) => s + num(d.tutar), 0);
  const mdkTop = mdkLst.reduce((s,d) => s + num(d.tutar), 0);

  const b1 = dosyaTop - dev - ayi;
  const b2 = (sb / 2) + (ek / 2) + at;
  const b3 = num(pozToplam) - num(mahsupToplam);
  const final = b1 + b2 + b3;
  const b1Pos = b1 >= 0;
  const b3Pos = b3 >= 0;
  const fPos = final >= 0;

  // Format
  const fmt = n => {
    if (n === 0) return '₺0';
    const sign = n < 0 ? '−' : '';
    const abs = Math.abs(n);
    const isInt = Number.isInteger(abs);
    return sign + '₺' + abs.toLocaleString('tr-TR', {minimumFractionDigits: isInt ? 0 : 2, maximumFractionDigits: 2});
  };
  const fmtPlain = n => {
    const isInt = Number.isInteger(Math.abs(n));
    return Math.abs(n).toLocaleString('tr-TR', {minimumFractionDigits: isInt ? 0 : 2, maximumFractionDigits: 2});
  };

  // Dosya tablosu düzenleme
  const updateDosya = (idx, key, val) => setDosyalar(p => p.map((d,i) => i === idx ? {...d, [key]: val} : d));
  const removeDosya = (idx) => setDosyalar(p => p.filter((_,i) => i !== idx));
  const addDosya = () => setDosyalar(p => [...p, {date:'', name:'', tip:'ARAÇ DEĞER KAYBI', kanal:'YÖNLENDİREN', tutar:0}]);

  // Yazdır
  const yazdir = () => {
    document.body.classList.add('mutabakat-printing');
    setTimeout(() => {
      window.print();
      setTimeout(() => document.body.classList.remove('mutabakat-printing'), 500);
    }, 100);
  };

  // Rapor stili
  const raporStyles = `
    .mt-rapor { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; background: #ECEFF1; padding: 20px; color: #2C3E50; }
    .mt-rapor * { text-transform: uppercase; box-sizing: border-box; }
    .mt-page { max-width: 880px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .mt-head { background: #2C3E50; color: #fff; padding: 36px 40px; display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
    .mt-head h1 { font-size: 24px; font-weight: 700; line-height: 1.3; max-width: 60%; margin: 0; }
    .mt-head .month { text-align: right; color: #F39C12; font-weight: 800; font-size: 32px; line-height: 1; letter-spacing: 1px; }
    .mt-body { padding: 32px 40px; }
    .mt-info-box { background: #EAF4FB; border-left: 4px solid #3498DB; border-radius: 6px; padding: 16px 20px; margin-bottom: 28px; }
    .mt-info-box h3 { color: #C0392B; font-size: 14px; margin-bottom: 8px; font-weight: 700; }
    .mt-info-box p { font-size: 13px; margin-bottom: 3px; color: #34495E; }
    .mt-info-box p strong { color: #2C3E50; }
    .mt-section-title { font-size: 17px; font-weight: 700; color: #2C3E50; border-bottom: 2px solid #ECF0F1; padding-bottom: 8px; margin-bottom: 16px; margin-top: 8px; }
    .mt-subsection-title { font-size: 13px; font-weight: 700; color: #34495E; margin: 18px 0 8px; letter-spacing: 0.3px; }
    .mt-table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 6px; }
    .mt-table thead { background: #2C3E50; color: #fff; }
    .mt-table thead th { padding: 9px 12px; text-align: left; font-weight: 600; font-size: 11px; letter-spacing: 0.5px; }
    .mt-table thead th.right { text-align: right; }
    .mt-table tbody td { padding: 7px 12px; border-bottom: 1px solid #ECEFF1; color: #34495E; }
    .mt-table tbody td.right { text-align: right; font-weight: 600; }
    .mt-table tbody tr:nth-child(even) { background: #FAFBFC; }
    .mt-table tbody tr.totals { background: #ECF0F1 !important; font-weight: 700; }
    .mt-table tbody tr.totals td { color: #2C3E50; font-weight: 700; font-size: 13px; padding: 10px 12px; }
    .mt-table tbody tr.totals .red { color: #C0392B; }
    .mt-table tbody tr.totals .green { color: #27AE60; }
    .mt-table tbody tr.totals .blue { color: #2980B9; }
    .mt-table tbody tr.totals .orange { color: #E67E22; }
    .mt-red { color: #C0392B; font-weight: 600; }
    .mt-green { color: #27AE60; font-weight: 600; }
    .mt-blue { color: #2980B9; font-weight: 600; }
    .mt-result-box { border-radius: 10px; padding: 24px 22px; text-align: center; margin: 18px 0 8px; color: #fff; }
    .mt-result-box .lbl { font-size: 12px; letter-spacing: 0.5px; opacity: 0.9; }
    .mt-result-box .amt { font-size: 34px; font-weight: 800; margin: 8px 0 5px; letter-spacing: -0.5px; }
    .mt-result-box .nt { font-size: 12px; opacity: 0.9; }
    .mt-rb-red { background: #C0392B; }
    .mt-rb-orange { background: #E67E22; }
    .mt-rb-blue { background: #2980B9; }
    .mt-rb-green { background: #27AE60; }
    .mt-rb-final { background: linear-gradient(135deg, #2C3E50 0%, #34495E 100%); padding: 32px 24px; }
    .mt-rb-final .amt { font-size: 44px; }
    .mt-divider { border: 0; border-top: 1px dashed #BDC3C7; margin: 32px 0; }
    .mt-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0 18px; }
    .mt-card { border-radius: 8px; padding: 14px 12px; text-align: center; color: #fff; }
    .mt-card .lbl { font-size: 11px; opacity: 0.92; letter-spacing: 0.4px; font-weight: 600; }
    .mt-card .val { font-size: 20px; font-weight: 800; margin-top: 6px; }
    .mt-card-red    { background: #C0392B; }
    .mt-card-orange { background: #E67E22; }
    .mt-card-blue   { background: #2980B9; }
    .mt-card-green  { background: #27AE60; }
    .mt-final-table thead th { text-align: center; }
    .mt-final-table tbody td { text-align: center; padding: 12px; font-size: 13px; font-weight: 600; }
    .mt-final-table tbody tr.row-red    { background: #FDECEA !important; }
    .mt-final-table tbody tr.row-red    td { color: #C0392B; }
    .mt-final-table tbody tr.row-orange { background: #FDF1E5 !important; }
    .mt-final-table tbody tr.row-orange td { color: #E67E22; }
    .mt-final-table tbody tr.row-blue   { background: #E8F1FB !important; }
    .mt-final-table tbody tr.row-blue   td { color: #2980B9; }
    .mt-final-table tbody tr.row-green  { background: #E6F7EE !important; }
    .mt-final-table tbody tr.row-green  td { color: #27AE60; }
    .mt-final-table tbody tr.totals     { background: #2C3E50 !important; }
    .mt-final-table tbody tr.totals td  { color: #fff; font-size: 15px; font-weight: 800; padding: 14px; }
    .mt-footer { background: #2C3E50; color: #BDC3C7; padding: 16px 40px; text-align: center; font-size: 11px; }
    .mt-footer strong { color: #fff; }

    @media print {
      @page { size: A4 portrait; margin: 8mm; }
      body.mutabakat-printing > * { display: none !important; }
      body.mutabakat-printing #mutabakat-rapor-onizleme { display: block !important; }
      body.mutabakat-printing #mutabakat-rapor-onizleme { position: absolute !important; left: 0; top: 0; width: 100%; }
      body.mutabakat-printing #mutabakat-rapor-onizleme .mt-rapor { background: #fff; padding: 0; }
      body.mutabakat-printing #mutabakat-rapor-onizleme .mt-page { box-shadow: none; border-radius: 0; max-width: 100%; }
    }
  `;

  const FIRMA = savedData?.firma_adi || 'MR HASAR DANIŞMANLIK';
  const HAZIRLAYAN = savedData?.hazirlayan || (user?.ad_soyad || 'SİSTEM').toUpperCase();
  const baslik = `${ayAdi} ${yil} AY SONU RAPORU`;

  return (
    <div className="fade-in">
      <style>{raporStyles}</style>

      {/* ═══ KONTROL PANELİ ═══ */}
      <div style={{...S.card, marginBottom:18}}>
        <SectionTitle icon="FileSpreadsheet" title={duzenlemeId ? `DÜZENLE: ${baslik}` : 'YENİ AY SONU RAPORU'} sub={duzenlemeId ? `KAYIT ID: ${duzenlemeId} · DURUM: ${durum.toUpperCase()}` : 'CANLI ÖNİZLEME · KAYDET · YAZDIR'}/>
        <div style={{padding:'16px 20px'}}>

          {/* MESAJ */}
          {mesaj && (
            <div style={{padding:10,marginBottom:12,borderRadius:8,fontSize:12,fontWeight:600,display:'flex',alignItems:'center',gap:8,
              background: mesaj.tip==='error'?`${C.danger}22`:(mesaj.tip==='success'?`${C.success}22`:`${C.accent}22`),
              color: mesaj.tip==='error'?C.danger:(mesaj.tip==='success'?C.success:C.accent),
              border:`1px solid ${mesaj.tip==='error'?C.danger:(mesaj.tip==='success'?C.success:C.accent)}44`}}>
              <LIcon name={mesaj.tip==='error'?'AlertTriangle':(mesaj.tip==='success'?'CheckCircle':'Info')} size={14}/>
              {mesaj.text}
            </div>
          )}

          {/* AKSİYON SATIRI */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto auto auto auto',gap:10,alignItems:'flex-end',marginBottom:14}}>
            <div>
              <label style={{...S.label,marginBottom:4,display:'block'}}>YIL</label>
              <select value={yil} onChange={e=>setYil(e.target.value)} disabled={duzenlemeId} style={{...S.select,padding:'10px 12px',fontSize:13}}>
                {yillar.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label style={{...S.label,marginBottom:4,display:'block'}}>AY</label>
              <select value={ay} onChange={e=>setAy(e.target.value)} disabled={duzenlemeId} style={{...S.select,padding:'10px 12px',fontSize:13}}>
                {aylar.map(a => <option key={a.v} value={a.v}>{a.l}</option>)}
              </select>
            </div>
            <button onClick={veriCek} disabled={loading} title="Sistemden güncel dosyaları çek" style={{...S.btn,padding:'11px 14px',fontSize:12,fontWeight:700,background:C.accent,color:'#fff',border:0}}>
              <LIcon name="RefreshCw" size={13} color="#fff"/> {loading ? '...' : 'VERİYİ ÇEK'}
            </button>
            <button onClick={()=>kaydet('taslak')} disabled={loading || durum==='kesin'} style={{...S.btn,padding:'11px 14px',fontSize:12,fontWeight:800,background:C.success,color:'#fff',border:0}}>
              <LIcon name="Save" size={13} color="#fff"/> {duzenlemeId?'GÜNCELLE':'KAYDET'}
            </button>
            {duzenlemeId && durum==='taslak' && (
              <button onClick={()=>kaydet('kesin')} disabled={loading} title="Raporu KESİN olarak kilitler" style={{...S.btn,padding:'11px 14px',fontSize:12,fontWeight:800,background:C.purple,color:'#fff',border:0}}>
                <LIcon name="Lock" size={13} color="#fff"/> KESİNLEŞTİR
              </button>
            )}
            <button onClick={yazdir} style={{...S.btn,padding:'11px 14px',fontSize:12,fontWeight:800,background:'#27AE60',color:'#fff',border:0}}>
              <LIcon name="Printer" size={13} color="#fff"/> PDF
            </button>
            {duzenlemeId && (
              <button onClick={yeniRapor} title="Yeni rapor moduna dön" style={{...S.btn,padding:'11px 14px',fontSize:12,fontWeight:700,background:C.bgInput,color:C.text,border:`1px solid ${C.border}`}}>
                <LIcon name="Plus" size={13} color={C.text}/> YENİ
              </button>
            )}
          </div>

          {/* MANUEL KALEMLER (TL formatlı) */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:14}}>
            <div><label style={{...S.label,marginBottom:4,display:'block'}}>ÖNCEKİ AY DEVİR</label><TLInput value={devir} onChange={setDevir}/></div>
            <div><label style={{...S.label,marginBottom:4,display:'block'}}>AY İÇİ ÖDEMELER</label><TLInput value={ayIci} onChange={setAyIci}/></div>
            <div><label style={{...S.label,marginBottom:4,display:'block'}}>SBM SORGU</label><TLInput value={sbm} onChange={setSbm}/></div>
            <div><label style={{...S.label,marginBottom:4,display:'block'}}>EKRAN ÖDEME</label><TLInput value={ekran} onChange={setEkran}/></div>
            <div><label style={{...S.label,marginBottom:4,display:'block'}}>ATK MASRAFI</label><TLInput value={atk} onChange={setAtk}/></div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
            <div>
              <label style={{...S.label,marginBottom:4,display:'block'}}>POZİTİF ADET</label>
              <input type="number" value={pozAdet} onChange={e=>setPozAdet(e.target.value)} style={{...S.input,padding:'8px 10px',fontSize:12,textAlign:'center'}}/>
            </div>
            <div><label style={{...S.label,marginBottom:4,display:'block'}}>POZİTİF TOPLAM</label><TLInput value={pozToplam} onChange={setPozToplam}/></div>
            <div>
              <label style={{...S.label,marginBottom:4,display:'block'}}>MAHSUP ADET</label>
              <input type="number" value={mahsupAdet} onChange={e=>setMahsupAdet(e.target.value)} style={{...S.input,padding:'8px 10px',fontSize:12,textAlign:'center'}}/>
            </div>
            <div><label style={{...S.label,marginBottom:4,display:'block'}}>MAHSUP TOPLAM</label><TLInput value={mahsupToplam} onChange={setMahsupToplam}/></div>
          </div>

          <div style={{marginBottom:14}}>
            <label style={{...S.label,marginBottom:4,display:'block'}}>NOT (opsiyonel)</label>
            <textarea value={notMetni} onChange={e=>setNotMetni(e.target.value)} rows={2} style={{...S.input,padding:'8px 10px',fontSize:12,resize:'vertical',width:'100%'}}/>
          </div>

          {/* DOSYA TABLOSU — düzenlenebilir */}
          <div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
              <div style={{fontSize:11,fontWeight:700,color:C.textSec,letterSpacing:0.5}}>
                DOSYA LİSTESİ ({dosyalar.length}) · {duzenlemeId ? 'snapshot' : 'sistemden çekildi'} · düzenlenebilir
              </div>
              <button onClick={addDosya} style={{...S.btn,padding:'5px 10px',fontSize:11,background:'#3498DB',color:'#fff',border:0,borderRadius:4}}>+ EKLE</button>
            </div>
            <div style={{maxHeight:280,overflow:'auto',border:`1px solid ${C.border}`,borderRadius:6}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead style={{position:'sticky',top:0,background:'#F5F7F8'}}>
                  <tr>
                    <th style={{padding:'6px 8px',textAlign:'left',fontSize:10,fontWeight:700,color:C.textSec,borderBottom:`1px solid ${C.border}`}}>TARİH</th>
                    <th style={{padding:'6px 8px',textAlign:'left',fontSize:10,fontWeight:700,color:C.textSec,borderBottom:`1px solid ${C.border}`}}>MÜŞTERİ</th>
                    <th style={{padding:'6px 8px',textAlign:'left',fontSize:10,fontWeight:700,color:C.textSec,borderBottom:`1px solid ${C.border}`}}>TÜR</th>
                    <th style={{padding:'6px 8px',textAlign:'left',fontSize:10,fontWeight:700,color:C.textSec,borderBottom:`1px solid ${C.border}`}}>KAYNAK</th>
                    <th style={{padding:'6px 8px',textAlign:'right',fontSize:10,fontWeight:700,color:C.textSec,borderBottom:`1px solid ${C.border}`}}>TUTAR</th>
                    <th style={{width:36,borderBottom:`1px solid ${C.border}`}}></th>
                  </tr>
                </thead>
                <tbody>
                  {dosyalar.length === 0 && (
                    <tr><td colSpan={6} style={{padding:18,textAlign:'center',color:C.textMuted,fontStyle:'italic',fontSize:11}}>DOSYA YOK</td></tr>
                  )}
                  {dosyalar.map((d,i) => (
                    <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}>
                      <td style={{padding:3}}><input value={d.date||''} onChange={e=>updateDosya(i,'date',e.target.value)} style={{width:'100%',padding:'4px 6px',fontSize:11,border:`1px solid ${C.border}`,borderRadius:3}}/></td>
                      <td style={{padding:3}}><input value={d.name||''} onChange={e=>updateDosya(i,'name',e.target.value)} style={{width:'100%',padding:'4px 6px',fontSize:11,border:`1px solid ${C.border}`,borderRadius:3}}/></td>
                      <td style={{padding:3}}><input value={d.tip||''} onChange={e=>updateDosya(i,'tip',e.target.value)} style={{width:'100%',padding:'4px 6px',fontSize:11,border:`1px solid ${C.border}`,borderRadius:3}}/></td>
                      <td style={{padding:3}}><input value={d.kanal||''} onChange={e=>updateDosya(i,'kanal',e.target.value)} style={{width:'100%',padding:'4px 6px',fontSize:11,border:`1px solid ${C.border}`,borderRadius:3}}/></td>
                      <td style={{padding:3}}><TLInput value={d.tutar} onChange={v=>updateDosya(i,'tutar',v)} style={{padding:'4px 6px',fontSize:11}}/></td>
                      <td style={{padding:3,textAlign:'center'}}><button onClick={()=>removeDosya(i)} style={{padding:'2px 6px',fontSize:10,background:'#C0392B',color:'#fff',border:0,borderRadius:3,cursor:'pointer'}}>SİL</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* ═══ KAYITLI RAPORLAR LİSTESİ ═══ */}
      <div style={{...S.card, marginBottom:18}}>
        <SectionTitle icon="Archive" title="KAYITLI RAPORLAR" sub={`${kayitlar.length} kayıtlı rapor · DÜZENLE ile yüklenir`}/>
        <div style={{padding:'10px 20px 16px'}}>
          {kayitlar.length === 0 ? (
            <div style={{padding:24,textAlign:'center',color:C.textMuted,fontSize:12,fontStyle:'italic'}}>
              Henüz kayıtlı rapor yok. Yukarıdan oluştur ve KAYDET'e bas.
            </div>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{borderBottom:`2px solid ${C.border}`}}>
                  <th style={{padding:'8px 6px',textAlign:'left',fontSize:10,fontWeight:700,color:C.textSec}}>DÖNEM</th>
                  <th style={{padding:'8px 6px',textAlign:'left',fontSize:10,fontWeight:700,color:C.textSec}}>BAŞLIK</th>
                  <th style={{padding:'8px 6px',textAlign:'center',fontSize:10,fontWeight:700,color:C.textSec}}>DURUM</th>
                  <th style={{padding:'8px 6px',textAlign:'right',fontSize:10,fontWeight:700,color:C.textSec}}>BÖLÜM 1</th>
                  <th style={{padding:'8px 6px',textAlign:'right',fontSize:10,fontWeight:700,color:C.textSec}}>BÖLÜM 2</th>
                  <th style={{padding:'8px 6px',textAlign:'right',fontSize:10,fontWeight:700,color:C.textSec}}>BÖLÜM 3</th>
                  <th style={{padding:'8px 6px',textAlign:'right',fontSize:10,fontWeight:700,color:C.textSec}}>FİNAL</th>
                  <th style={{padding:'8px 6px',textAlign:'left',fontSize:10,fontWeight:700,color:C.textSec}}>OLUŞTURAN</th>
                  <th style={{padding:'8px 6px',textAlign:'center',fontSize:10,fontWeight:700,color:C.textSec}}>İŞLEM</th>
                </tr>
              </thead>
              <tbody>
                {kayitlar.map(k => {
                  const fNum = parseFloat(k.final_bakiye)||0;
                  return (
                    <tr key={k.id} style={{borderBottom:`1px solid ${C.border}`,background: duzenlemeId === k.id ? `${C.accent}11` : 'transparent'}}>
                      <td style={{padding:'8px 6px',fontWeight:700,fontFamily:'monospace'}}>{k.donem}</td>
                      <td style={{padding:'8px 6px'}}>{k.baslik}</td>
                      <td style={{padding:'8px 6px',textAlign:'center'}}>
                        <span style={{padding:'3px 8px',borderRadius:4,fontSize:10,fontWeight:700,background: k.durum==='kesin'?`${C.purple}22`:`${C.warning}22`,color: k.durum==='kesin'?C.purple:C.warning}}>
                          {k.durum.toUpperCase()}
                        </span>
                      </td>
                      <td style={{padding:'8px 6px',textAlign:'right',fontFamily:'monospace',color: parseFloat(k.bolum1_net)>=0?C.danger:C.warning}}>{fmt(parseFloat(k.bolum1_net))}</td>
                      <td style={{padding:'8px 6px',textAlign:'right',fontFamily:'monospace',color:C.cyan}}>{fmt(parseFloat(k.bolum2_net))}</td>
                      <td style={{padding:'8px 6px',textAlign:'right',fontFamily:'monospace',color: parseFloat(k.bolum3_net)>=0?C.success:C.danger}}>{fmt(parseFloat(k.bolum3_net))}</td>
                      <td style={{padding:'8px 6px',textAlign:'right',fontFamily:'monospace',fontWeight:800,fontSize:13,color: fNum>=0?C.success:C.danger}}>{fmt(fNum)}</td>
                      <td style={{padding:'8px 6px',fontSize:11,color:C.textSec}}>{k.olusturan_adi || '-'}</td>
                      <td style={{padding:'8px 6px',textAlign:'center'}}>
                        <button onClick={()=>duzenle(k.id)} title="Düzenle" style={{padding:'5px 10px',fontSize:10,background:C.accent,color:'#fff',border:0,borderRadius:4,cursor:'pointer',marginRight:4}}>
                          DÜZENLE
                        </button>
                        <button onClick={()=>setSilOnay(k)} title="Sil" disabled={k.durum==='kesin'} style={{padding:'5px 10px',fontSize:10,background:k.durum==='kesin'?C.bgInput:C.danger,color:k.durum==='kesin'?C.textMuted:'#fff',border:0,borderRadius:4,cursor:k.durum==='kesin'?'not-allowed':'pointer'}}>
                          SİL
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* SİL ONAY MODAL */}
      {silOnay && (
        <div onClick={()=>setSilOnay(null)} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.bgCard,padding:24,borderRadius:12,maxWidth:420,boxShadow:'0 10px 40px rgba(0,0,0,0.3)'}}>
            <div style={{fontSize:14,fontWeight:800,marginBottom:8,color:C.danger}}>RAPOR SİLİNECEK</div>
            <div style={{fontSize:12,color:C.textSec,marginBottom:16}}><strong>{silOnay.baslik}</strong> kalıcı olarak silinecek. Onaylıyor musunuz?</div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button onClick={()=>setSilOnay(null)} style={{padding:'8px 14px',fontSize:11,background:C.bgInput,color:C.text,border:`1px solid ${C.border}`,borderRadius:6,cursor:'pointer'}}>İPTAL</button>
              <button onClick={()=>sil(silOnay.id)} style={{padding:'8px 14px',fontSize:11,fontWeight:700,background:C.danger,color:'#fff',border:0,borderRadius:6,cursor:'pointer'}}>EVET, SİL</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CANLI RAPOR ÖNİZLEMESİ ═══ */}
      <div id="mutabakat-rapor-onizleme">
        <div className="mt-rapor">
          <div className="mt-page">
            <div className="mt-head">
              <h1>{FIRMA}<br/>KAPSAMLI AY SONU RAPORU</h1>
              <div className="month">{ayAdi}<br/>{yil}</div>
            </div>
            <div className="mt-body">

              <div className="mt-info-box">
                <h3>📌 RAPOR AÇIKLAMASI</h3>
                <p>BU RAPOR, {ayAdi} {yil} AY SONU İTİBARIYLA <strong>{FIRMA} CARİ HESAP MUTABAKATINI</strong> ÇIKARMAK AMACIYLA HAZIRLANMIŞTIR.</p>
                <p><strong>1. BÖLÜM:</strong> AYLIK DOSYA MASRAFLARI VE ÖDEMELER</p>
                <p><strong>2. BÖLÜM:</strong> ORTAK MASRAFLARDA {FIRMA} ALACAĞI</p>
                <p><strong>3. BÖLÜM:</strong> KAPANAN DOSYALARDAN MR HAK EDİŞİ</p>
                <p><strong>FİNAL BAKİYE:</strong> {ayAdi} AYI NET POZİSYON</p>
              </div>

              <h2 className="mt-section-title">📋 BÖLÜM 1 — AYLIK HESAP</h2>
              <div className="mt-subsection-title">DOSYA LİSTESİ ({dosyalar.length} DOSYA)</div>
              <table className="mt-table">
                <thead><tr><th>TARİH</th><th>MÜŞTERİ</th><th>DOSYA TÜRÜ</th><th>KAYNAK</th><th className="right">MASRAF</th></tr></thead>
                <tbody>
                  {dosyalar.length === 0 && <tr><td colSpan={5} style={{textAlign:'center',color:'#95A5A6',fontStyle:'italic',padding:14}}>DOSYA YOK</td></tr>}
                  {dosyalar.map((d,i) => (
                    <tr key={i}><td>{d.date}</td><td>{d.name}</td><td>{d.tip}</td><td>{d.kanal}</td><td className="right">{fmt(num(d.tutar))}</td></tr>
                  ))}
                  <tr className="totals"><td colSpan={4}>DOSYA MASRAFLARI TOPLAMI</td><td className="right red">{fmt(dosyaTop)}</td></tr>
                </tbody>
              </table>

              <div className="mt-subsection-title">DOSYA TÜRÜ DAĞILIMI</div>
              <table className="mt-table">
                <thead><tr><th>DOSYA TÜRÜ</th><th className="right">ADET</th><th className="right">TUTAR</th></tr></thead>
                <tbody>
                  {adkLst.length > 0 && <tr><td>ARAÇ DEĞER KAYBI (ADK)</td><td className="right">{adkLst.length}</td><td className="right">{fmt(adkTop)}</td></tr>}
                  {bhLst.length > 0 && <tr><td>BEDENİ HASAR (BH)</td><td className="right">{bhLst.length}</td><td className="right">{fmt(bhTop)}</td></tr>}
                  {mdkLst.length > 0 && <tr><td>MADDİ HASAR / KAZA (MDK)</td><td className="right">{mdkLst.length}</td><td className="right">{fmt(mdkTop)}</td></tr>}
                  <tr className="totals"><td>TOPLAM</td><td className="right">{dosyalar.length}</td><td className="right">{fmt(dosyaTop)}</td></tr>
                </tbody>
              </table>

              <div className="mt-subsection-title">BÖLÜM 1 ÖZET</div>
              <table className="mt-table">
                <thead><tr><th>AÇIKLAMA</th><th className="right">TUTAR</th></tr></thead>
                <tbody>
                  <tr><td>ÖNCEKİ AYDAN DEVİR</td><td className="right mt-green">{fmt(dev)}</td></tr>
                  <tr><td>{ayAdi} AY İÇİ ÖDEMELER</td><td className="right mt-green">{fmt(ayi)}</td></tr>
                  <tr><td>{ayAdi} {yil} DOSYA MASRAFLARI</td><td className="right mt-red">{fmt(dosyaTop)}</td></tr>
                  <tr className="totals"><td>BÖLÜM 1 NET</td><td className={'right ' + (b1Pos?'red':'orange')}>{fmt(b1)}</td></tr>
                </tbody>
              </table>

              <div className={'mt-result-box ' + (b1Pos ? 'mt-rb-red' : 'mt-rb-orange')}>
                <div className="lbl">BÖLÜM 1 — DOSYA MASRAFI HESABI</div>
                <div className="amt">{fmt(b1)}</div>
                <div className="nt">{b1Pos ? `(${FIRMA}'A TAHSİL EDİLECEK)` : `(FAZLA ÖDEME — ${FIRMA}'IN BORCU)`}</div>
              </div>

              <hr className="mt-divider"/>

              <h2 className="mt-section-title">⚖️ BÖLÜM 2 — ORTAK MASRAFLAR</h2>
              <table className="mt-table">
                <thead><tr><th>AÇIKLAMA</th><th className="right">TUTAR</th></tr></thead>
                <tbody>
                  {sb > 0 && <tr><td>SBM SORGU (PAYLAŞIMLI)</td><td className="right">{fmt(sb)}</td></tr>}
                  {ek > 0 && <tr><td>EKRAN ÖDEME (PAYLAŞIMLI)</td><td className="right">{fmt(ek)}</td></tr>}
                  {at > 0 && <tr><td>ATK MASRAFI (TAMAMI)</td><td className="right">{fmt(at)}</td></tr>}
                  {(sb+ek+at)===0 && <tr><td colSpan={2} style={{textAlign:'center',color:'#95A5A6',fontStyle:'italic',padding:10}}>ORTAK MASRAF YOK</td></tr>}
                  <tr className="totals"><td>{FIRMA}'IN ÖDEDİĞİ TOPLAM</td><td className="right">{fmt(sb+ek+at)}</td></tr>
                </tbody>
              </table>

              <div className="mt-subsection-title">{FIRMA} ALACAĞI</div>
              <table className="mt-table">
                <thead><tr><th>KALEM</th><th className="right">TUTAR</th><th className="right">MR ALACAĞI</th></tr></thead>
                <tbody>
                  {sb > 0 && <tr><td>SBM SORGU</td><td className="right">{fmt(sb)}</td><td className="right mt-blue">{fmt(sb/2)} (½)</td></tr>}
                  {ek > 0 && <tr><td>EKRAN ÖDEME</td><td className="right">{fmt(ek)}</td><td className="right mt-blue">{fmt(ek/2)} (½)</td></tr>}
                  {at > 0 && <tr><td>ATK MASRAFI</td><td className="right">{fmt(at)}</td><td className="right mt-blue">{fmt(at)}</td></tr>}
                  <tr className="totals"><td>TOPLAM</td><td className="right">{fmt(sb+ek+at)}</td><td className="right blue">{fmt(b2)}</td></tr>
                </tbody>
              </table>

              <div className="mt-result-box mt-rb-blue">
                <div className="lbl">BÖLÜM 2 — ORTAK MASRAF ALACAĞI</div>
                <div className="amt">+{fmtPlain(b2)} ₺</div>
                <div className="nt">({FIRMA}'A TAHSİL EDİLECEK)</div>
              </div>

              <hr className="mt-divider"/>

              <h2 className="mt-section-title">💼 BÖLÜM 3 — KAPANAN DOSYALAR</h2>
              <table className="mt-table">
                <thead><tr><th>AÇIKLAMA</th><th className="right">DOSYA</th><th className="right">TUTAR</th></tr></thead>
                <tbody>
                  <tr><td>POZİTİF (KAZANÇ)</td><td className="right">{pozAdet}</td><td className="right mt-green">{fmt(num(pozToplam))}</td></tr>
                  <tr><td>MAHSUPLAR (KESİNTİ)</td><td className="right">{mahsupAdet}</td><td className="right mt-red">−{fmtPlain(num(mahsupToplam))} ₺</td></tr>
                  <tr className="totals"><td>BÖLÜM 3 NET</td><td className="right">{num(pozAdet)+num(mahsupAdet)}</td><td className={'right ' + (b3Pos?'green':'red')}>{fmt(b3)}</td></tr>
                </tbody>
              </table>

              <div className={'mt-result-box ' + (b3Pos ? 'mt-rb-green' : 'mt-rb-red')}>
                <div className="lbl">BÖLÜM 3 — KAPANAN DOSYA HAK EDİŞİ</div>
                <div className="amt">{fmt(b3)}</div>
                <div className="nt">{b3Pos ? `(${FIRMA}'A TAHSİL EDİLECEK)` : '(NEGATİF — MAHSUPLAR KAZANCI AŞTI)'}</div>
              </div>

              <hr className="mt-divider"/>

              <h2 className="mt-section-title">🧮 FİNAL BAKİYE</h2>
              <div className="mt-cards">
                <div className={'mt-card ' + (b1Pos ? 'mt-card-red' : 'mt-card-orange')}>
                  <div className="lbl">BÖLÜM 1</div><div className="val">{fmt(b1)}</div>
                </div>
                <div className="mt-card mt-card-blue">
                  <div className="lbl">BÖLÜM 2</div><div className="val">+{fmtPlain(b2)} ₺</div>
                </div>
                <div className={'mt-card ' + (b3Pos ? 'mt-card-green' : 'mt-card-red')}>
                  <div className="lbl">BÖLÜM 3</div><div className="val">{fmt(b3)}</div>
                </div>
              </div>

              <table className="mt-table mt-final-table">
                <thead><tr><th>AÇIKLAMA</th><th>TUTAR</th></tr></thead>
                <tbody>
                  <tr className={b1Pos ? 'row-red' : 'row-orange'}><td>BÖLÜM 1</td><td>{fmt(b1)}</td></tr>
                  <tr className="row-blue"><td>BÖLÜM 2</td><td>+{fmtPlain(b2)} ₺</td></tr>
                  <tr className={b3Pos ? 'row-green' : 'row-red'}><td>BÖLÜM 3</td><td>{fmt(b3)}</td></tr>
                  <tr className="totals"><td>FİNAL BAKİYE — {fPos ? `${FIRMA}'IN NET ALACAĞI` : `${FIRMA}'IN NET BORCU`}</td><td>{fmt(final)}</td></tr>
                </tbody>
              </table>

              <div className="mt-result-box mt-rb-final">
                <div className="lbl">{ayAdi} {yil} FİNAL BAKİYE</div>
                <div className="amt">{fmt(final)}</div>
                <div className="nt">{fPos ? `${FIRMA}'A KALAN NET ÖDEME` : `${FIRMA}'IN NET BORCU (SONRAKİ AYA DEVİR)`}</div>
              </div>

              {notMetni && (
                <div style={{marginTop:18,padding:14,background:'#FEF6E0',borderLeft:'4px solid #F39C12',borderRadius:6,fontSize:12,color:'#6E5223'}}>
                  <strong>NOT:</strong> {notMetni}
                </div>
              )}

              <p style={{fontSize:11,color:'#7F8C8D',marginTop:16,lineHeight:1.5,textAlign:'center'}}>
                BU RAPOR; AY SONU CARİ HESAP MUTABAKATI İÇİN HAZIRLANMIŞTIR.
              </p>

            </div>
            <div className="mt-footer">
              <strong>{FIRMA}</strong> · {ayAdi} {yil} · HAZIRLAYAN: {HAZIRLAYAN}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   YARDIMCI: UYARI / BAŞARI MESAJLARI
   ═══════════════════════════════════════════════════════════ */
const HataMesaji = ({mesaj}) => {
  const {C, LIcon} = MR;
  if (!mesaj) return null;
  return (
    <div style={{padding:10,background:`${C.danger}22`,borderRadius:8,marginBottom:16,fontSize:12,color:C.danger,border:`1px solid ${C.danger}44`}}>
      <LIcon name="AlertTriangle" size={14} color={C.danger} style={{marginRight:6}}/>{mesaj}
    </div>
  );
};
const BasariMesaji = ({mesaj}) => {
  const {C, LIcon} = MR;
  if (!mesaj) return null;
  return (
    <div style={{padding:10,background:`${C.success}22`,borderRadius:8,marginBottom:16,fontSize:12,color:C.success,border:`1px solid ${C.success}44`}}>
      <LIcon name="CheckCircle" size={14} color={C.success} style={{marginRight:6}}/>{mesaj}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 1 – GELİR YÖNETİMİ
   ═══════════════════════════════════════════════════════════ */
const GelirYonetimi = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, Loading, EmptyState, Modal, FormGroup, api, fmt, fmtInput, parseNum} = MR;
  const [gelirler, setGelirler] = useState([]);
  const [kasalar, setKasalar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAcik, setModalAcik] = useState(false);
  const [form, setForm] = useState({kasa_id:'', dosya_id:'', tur:'DANIŞMANLIK ÜCRETİ', tutar:'', aciklama:'', tarih:''});
  const [kayitLoading, setKayitLoading] = useState(false);
  const [hata, setHata] = useState('');
  const [basari, setBasari] = useState('');

  /* FİLTRELER */
  const [kasaF, setKasaF] = useState('');
  const [baslangic, setBaslangic] = useState('');
  const [bitis, setBitis] = useState('');
  const [aramaF, setAramaF] = useState('');

  const yukle = async () => {
    setLoading(true);
    const p = {};
    if (kasaF) p.kasa_id = kasaF;
    if (baslangic) p.baslangic = baslangic;
    if (bitis) p.bitis = bitis;
    const [gR, kR] = await Promise.all([api.gelirList(p), api.kasaList()]);
    if (gR?.success) setGelirler(gR.data?.items || gR.data || []);
    if (kR?.success) setKasalar(kR.data || []);
    setLoading(false);
  };

  useEffect(() => { yukle(); }, [kasaF, baslangic, bitis]);

  const aktifKasalar = useMemo(() => kasalar.filter(k => k.aktif !== false && k.aktif !== 0), [kasalar]);
  const kasaAdi = (id) => { const k = kasalar.find(k => k.id == id); return k ? k.ad : '-'; };

  /* İSTATİSTİKLER */
  const istatistik = useMemo(() => {
    const buAy = new Date().toISOString().slice(0,7);
    const gecenAyD = new Date(); gecenAyD.setMonth(gecenAyD.getMonth()-1);
    const gecenAy = gecenAyD.toISOString().slice(0,7);
    let toplam = 0, buAyT = 0, gecenAyT = 0;
    gelirler.forEach(g => {
      const t = parseFloat(g.tutar) || 0;
      toplam += t;
      const tarih = (g.tarih || g.created_at || '').slice(0,7);
      if (tarih === buAy) buAyT += t;
      if (tarih === gecenAy) gecenAyT += t;
    });
    const ort = gelirler.length > 0 ? toplam / gelirler.length : 0;
    return {toplam, buAyT, gecenAyT, ort};
  }, [gelirler]);

  /* FİLTRELENMİŞ LİSTE */
  const filtrelenmis = useMemo(() => {
    if (!aramaF) return gelirler;
    const a = aramaF.toUpperCase();
    return gelirler.filter(g =>
      (g.aciklama || '').toUpperCase().includes(a) ||
      (g.dosya_no || '').toUpperCase().includes(a) ||
      (g.tur || '').toUpperCase().includes(a) ||
      (g.kasa_adi || kasaAdi(g.kasa_id)).toUpperCase().includes(a)
    );
  }, [gelirler, aramaF]);

  /* TOPLAM */
  const toplamTutar = useMemo(() => filtrelenmis.reduce((t, g) => t + (parseFloat(g.tutar) || 0), 0), [filtrelenmis]);

  const [gelirTurleri, setGelirTurleri] = useState(['DANIŞMANLIK ÜCRETİ','SİGORTA TAHSİLATI','MAHKEME TAZMİNATI','KOMİSYON','DİĞER GELİR']);
  useEffect(() => { api.tanimList({kategori:'gelir_turu'}).then(r => { if(r?.success && Array.isArray(r.data) && r.data.length > 0) setGelirTurleri(r.data.map(t=>t.deger)); }); }, []);

  /* YENİ GELİR MODAL */
  const yeniGelirAc = () => {
    setForm({kasa_id: aktifKasalar.length > 0 ? String(aktifKasalar[0].id) : '', dosya_id:'', tur:'DANIŞMANLIK ÜCRETİ', tutar:'', aciklama:'', tarih: new Date().toISOString().slice(0,10)});
    setHata(''); setBasari('');
    setModalAcik(true);
  };

  const kaydet = async () => {
    if (!form.kasa_id) { setHata('KASA SEÇİMİ ZORUNLUDUR'); return; }
    const tutarNum = parseNum(form.tutar);
    if (tutarNum <= 0) { setHata('TUTAR 0\'DAN BÜYÜK OLMALIDIR'); return; }
    setKayitLoading(true); setHata('');
    const gonder = {
      kasa_id: parseInt(form.kasa_id),
      tur: form.tur,
      tutar: tutarNum,
      aciklama: form.aciklama,
      tarih: form.tarih || undefined
    };
    if (form.dosya_id) gonder.dosya_id = parseInt(form.dosya_id);
    const r = await api.gelirCreate(gonder);
    if (r?.success) {
      setModalAcik(false);
      setBasari('GELİR BAŞARIYLA KAYDEDİLDİ');
      yukle();
      setTimeout(() => setBasari(''), 3000);
    } else {
      setHata(r?.error || 'KAYIT HATASI');
    }
    setKayitLoading(false);
  };

  if (loading) return <Loading/>;

  return (
    <div>
      <BasariMesaji mesaj={basari}/>

      {/* İSTATİSTİK KARTLARI */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        <StatCard icon="TrendingUp" label="TOPLAM GELİR" value={fmt(istatistik.toplam)} color={C.success}/>
        <StatCard icon="Calendar" label="BU AY" value={fmt(istatistik.buAyT)} color={C.accent}/>
        <StatCard icon="CalendarDays" label="GEÇEN AY" value={fmt(istatistik.gecenAyT)} color={C.cyan}/>
        <StatCard icon="Activity" label="ORTALAMA" value={fmt(istatistik.ort)} color={C.purple}/>
      </div>

      {/* GELİR LİSTESİ */}
      <div style={S.card}>
        <SectionTitle icon="TrendingUp" title="GELİR KAYITLARI"
          sub={`TOPLAM ${gelirler.length} KAYIT`}
          right={
            <button style={{...S.btn,...S.btnS,fontSize:11}} onClick={yeniGelirAc}>
              <LIcon name="Plus" size={14} color="#fff"/> YENİ GELİR
            </button>
          }/>

        {/* FİLTRE BARI */}
        <div style={{padding:'14px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <div>
            <label style={{...S.label,marginBottom:4}}>KASA</label>
            <select style={{...S.select,width:180,fontSize:11}} value={kasaF} onChange={e => setKasaF(e.target.value)}>
              <option value="">TÜMÜ</option>
              {kasalar.map(k => <option key={k.id} value={k.id}>{k.ad}</option>)}
            </select>
          </div>
          <div>
            <label style={{...S.label,marginBottom:4}}>BAŞLANGIÇ</label>
            <input type="date" style={{...S.input,width:150,fontSize:11}} value={baslangic} onChange={e => setBaslangic(e.target.value)}/>
          </div>
          <div>
            <label style={{...S.label,marginBottom:4}}>BİTİŞ</label>
            <input type="date" style={{...S.input,width:150,fontSize:11}} value={bitis} onChange={e => setBitis(e.target.value)}/>
          </div>
          <div>
            <label style={{...S.label,marginBottom:4}}>ARAMA</label>
            <input style={{...S.input,width:200,fontSize:11}} value={aramaF} onChange={e => setAramaF(e.target.value)} placeholder="AÇIKLAMA, DOSYA NO..."/>
          </div>
          <div style={{marginLeft:'auto',alignSelf:'flex-end'}}>
            <button style={{...S.btn,...S.btnG,fontSize:11}} onClick={() => {setKasaF('');setBaslangic('');setBitis('');setAramaF('');}}>
              <LIcon name="RotateCcw" size={13} color={C.textSec}/> TEMİZLE
            </button>
          </div>
        </div>

        {/* TABLO */}
        <div style={{overflowX:'auto'}}>
          {filtrelenmis.length === 0 ? (
            <EmptyState icon="TrendingUp" title="GELİR KAYDI BULUNAMADI" desc="SEÇİLEN FİLTRELERE UYGUN GELİR KAYDI BULUNMAMAKTADIR"/>
          ) : (
            <>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:800}}>
                <thead>
                  <tr style={{background:C.bgHover}}>
                    {['TARİH','KASA','DOSYA NO','TÜR','TUTAR','AÇIKLAMA'].map(h =>
                      <th key={h} style={{padding:'12px 14px',textAlign:'left',color: MR.tema==='koyu' ? '#cbd5e1' : C.textMuted,fontWeight:800,fontSize:12,borderBottom:`2px solid ${C.border}`,letterSpacing:0.3}}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtrelenmis.map((g, i) => (
                    <tr key={g.id || i} style={{borderBottom:`1px solid ${C.border}`}}
                      onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{padding:'10px 12px',color:C.textSec,fontSize:11}}>{g.tarih || g.created_at?.split(' ')[0] || '-'}</td>
                      <td style={{padding:'10px 12px',fontWeight:600}}>{g.kasa_adi || kasaAdi(g.kasa_id)}</td>
                      <td style={{padding:'10px 12px'}}>
                        {g.dosya_no ? (
                          <span style={{color:C.accent,fontWeight:600,cursor:'pointer'}} onClick={() => g.dosya_id && setPage('dosya-detay-' + g.dosya_id)}>
                            {g.dosya_no}
                          </span>
                        ) : <span style={{color:C.textMuted}}>-</span>}
                      </td>
                      <td style={{padding:'10px 12px'}}><Badge text={(g.tur || 'GELİR').toUpperCase()} color={C.success}/></td>
                      <td style={{padding:'10px 12px',fontWeight:700,color:C.success,fontSize:12}}>+{fmt(parseFloat(g.tutar) || 0)}</td>
                      <td style={{padding:'10px 12px',color:C.textSec,maxWidth:250,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.aciklama || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* ALT TOPLAM */}
              <div style={{padding:'14px 20px',borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:`${C.success}08`}}>
                <div style={{fontSize:12,fontWeight:700,color:C.textSec}}>
                  TOPLAM: <span style={{color:C.success,fontSize:14}}>{fmt(toplamTutar)}</span>
                </div>
                <div style={{fontSize:11,color:C.textMuted}}>{filtrelenmis.length} KAYIT</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* YENİ GELİR MODAL */}
      <Modal open={modalAcik} onClose={() => setModalAcik(false)} title="YENİ GELİR KAYDI" width="560px">
        <HataMesaji mesaj={hata}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="KASA SEÇİMİ *">
            <select style={S.select} value={form.kasa_id} onChange={e => setForm(p => ({...p, kasa_id: e.target.value}))}>
              <option value="">KASA SEÇİNİZ</option>
              {aktifKasalar.map(k => <option key={k.id} value={k.id}>{k.ad} ({k.tur === 'nakit' ? 'NAKİT' : 'BANKA'})</option>)}
            </select>
          </FormGroup>
          <FormGroup label="DOSYA NO (OPSİYONEL)">
            <input style={S.input} value={form.dosya_id} onChange={e => setForm(p => ({...p, dosya_id: e.target.value}))} placeholder="DOSYA ID"/>
          </FormGroup>
          <FormGroup label="GELİR TÜRÜ *">
            <select style={S.select} value={form.tur} onChange={e => setForm(p => ({...p, tur: e.target.value}))}>
              {gelirTurleri.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="TUTAR *">
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:C.textMuted,fontSize:14,fontWeight:700}}>₺</span>
              <input style={{...S.input,paddingLeft:30,fontSize:16,fontWeight:700}} value={form.tutar}
                onChange={e => setForm(p => ({...p, tutar: fmtInput(e.target.value)}))} placeholder="0,00"/>
            </div>
          </FormGroup>
          <FormGroup label="TARİH">
            <input type="date" style={S.input} value={form.tarih} onChange={e => setForm(p => ({...p, tarih: e.target.value}))}/>
          </FormGroup>
          <FormGroup label="AÇIKLAMA" full>
            <textarea style={{...S.input,minHeight:70}} value={form.aciklama} onChange={e => setForm(p => ({...p, aciklama: e.target.value.toUpperCase()}))} placeholder="GELİR AÇIKLAMASI..."/>
          </FormGroup>
        </div>
        <div style={{marginTop:24,display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setModalAcik(false)}>İPTAL</button>
          <button style={{...S.btn,...S.btnS}} onClick={kaydet} disabled={kayitLoading}>
            <LIcon name="Plus" size={14} color="#fff"/> {kayitLoading ? 'KAYDEDİLİYOR...' : 'GELİR KAYDET'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 2 – GİDER YÖNETİMİ
   ═══════════════════════════════════════════════════════════ */
const GiderYonetimi = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, Loading, EmptyState, Modal, FormGroup, api, fmt, fmtInput, parseNum} = MR;
  const [giderler, setGiderler] = useState([]);
  const [kasalar, setKasalar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAcik, setModalAcik] = useState(false);
  const [form, setForm] = useState({kasa_id:'', dosya_id:'', kategori:'OFİS GİDERİ', tutar:'', aciklama:'', tarih:''});
  const [kayitLoading, setKayitLoading] = useState(false);
  const [hata, setHata] = useState('');
  const [basari, setBasari] = useState('');

  /* FİLTRELER */
  const [kasaF, setKasaF] = useState('');
  const [kategoriF, setKategoriF] = useState('');
  const [baslangic, setBaslangic] = useState('');
  const [bitis, setBitis] = useState('');

  const [giderKategorileri, setGiderKategorileri] = useState(['OFİS GİDERİ','PERSONEL GİDERİ','ULAŞIM','YAKIT','BİLİRKİŞİ ÜCRETİ','AVUKAT ÜCRETİ','KİRA','VERGİ / HARÇ','DOSYA MASRAFI','DİĞER GİDER']);
  useEffect(() => { api.tanimList({kategori:'gider_turu'}).then(r => { if(r?.success && Array.isArray(r.data) && r.data.length > 0) setGiderKategorileri(r.data.map(t=>t.deger)); }); }, []);

  const yukle = async () => {
    setLoading(true);
    const p = {};
    if (kasaF) p.kasa_id = kasaF;
    if (kategoriF) p.kategori = kategoriF;
    if (baslangic) p.baslangic = baslangic;
    if (bitis) p.bitis = bitis;
    const [gR, kR] = await Promise.all([api.giderList(p), api.kasaList()]);
    if (gR?.success) setGiderler(gR.data?.items || gR.data || []);
    if (kR?.success) setKasalar(kR.data || []);
    setLoading(false);
  };

  useEffect(() => { yukle(); }, [kasaF, kategoriF, baslangic, bitis]);

  const aktifKasalar = useMemo(() => kasalar.filter(k => k.aktif !== false && k.aktif !== 0), [kasalar]);
  const kasaAdi = (id) => { const k = kasalar.find(k => k.id == id); return k ? k.ad : '-'; };

  /* İSTATİSTİKLER */
  const istatistik = useMemo(() => {
    const buAy = new Date().toISOString().slice(0,7);
    const gecenAyD = new Date(); gecenAyD.setMonth(gecenAyD.getMonth()-1);
    const gecenAy = gecenAyD.toISOString().slice(0,7);
    let toplam = 0, buAyT = 0, gecenAyT = 0;
    giderler.forEach(g => {
      const t = parseFloat(g.tutar) || 0;
      toplam += t;
      const tarih = (g.tarih || g.created_at || '').slice(0,7);
      if (tarih === buAy) buAyT += t;
      if (tarih === gecenAy) gecenAyT += t;
    });
    const ort = giderler.length > 0 ? toplam / giderler.length : 0;
    return {toplam, buAyT, gecenAyT, ort};
  }, [giderler]);

  /* TOPLAM */
  const toplamTutar = useMemo(() => giderler.reduce((t, g) => t + (parseFloat(g.tutar) || 0), 0), [giderler]);

  const yeniGiderAc = () => {
    setForm({kasa_id: aktifKasalar.length > 0 ? String(aktifKasalar[0].id) : '', dosya_id:'', kategori:'OFİS GİDERİ', tutar:'', aciklama:'', tarih: new Date().toISOString().slice(0,10)});
    setHata(''); setBasari('');
    setModalAcik(true);
  };

  const kaydet = async () => {
    if (!form.kasa_id) { setHata('KASA SEÇİMİ ZORUNLUDUR'); return; }
    const tutarNum = parseNum(form.tutar);
    if (tutarNum <= 0) { setHata('TUTAR 0\'DAN BÜYÜK OLMALIDIR'); return; }
    if (!form.kategori) { setHata('KATEGORİ SEÇİMİ ZORUNLUDUR'); return; }
    setKayitLoading(true); setHata('');
    const gonder = {
      kasa_id: parseInt(form.kasa_id),
      kategori: form.kategori,
      tutar: tutarNum,
      aciklama: form.aciklama,
      tarih: form.tarih || undefined
    };
    if (form.dosya_id) gonder.dosya_id = parseInt(form.dosya_id);
    const r = await api.giderCreate(gonder);
    if (r?.success) {
      setModalAcik(false);
      setBasari('GİDER BAŞARIYLA KAYDEDİLDİ');
      yukle();
      setTimeout(() => setBasari(''), 3000);
    } else {
      setHata(r?.error || 'KAYIT HATASI');
    }
    setKayitLoading(false);
  };

  if (loading) return <Loading/>;

  return (
    <div>
      <BasariMesaji mesaj={basari}/>

      {/* İSTATİSTİK KARTLARI */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        <StatCard icon="TrendingDown" label="TOPLAM GİDER" value={fmt(istatistik.toplam)} color={C.danger}/>
        <StatCard icon="Calendar" label="BU AY" value={fmt(istatistik.buAyT)} color={C.warning}/>
        <StatCard icon="CalendarDays" label="GEÇEN AY" value={fmt(istatistik.gecenAyT)} color={C.cyan}/>
        <StatCard icon="Activity" label="ORTALAMA" value={fmt(istatistik.ort)} color={C.purple}/>
      </div>

      {/* GİDER LİSTESİ */}
      <div style={S.card}>
        <SectionTitle icon="TrendingDown" title="GİDER KAYITLARI"
          sub={`TOPLAM ${giderler.length} KAYIT`}
          right={
            <button style={{...S.btn,...S.btnD,fontSize:11}} onClick={yeniGiderAc}>
              <LIcon name="Plus" size={14} color="#fff"/> YENİ GİDER
            </button>
          }/>

        {/* FİLTRE BARI */}
        <div style={{padding:'14px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <div>
            <label style={{...S.label,marginBottom:4}}>KASA</label>
            <select style={{...S.select,width:180,fontSize:11}} value={kasaF} onChange={e => setKasaF(e.target.value)}>
              <option value="">TÜMÜ</option>
              {kasalar.map(k => <option key={k.id} value={k.id}>{k.ad}</option>)}
            </select>
          </div>
          <div>
            <label style={{...S.label,marginBottom:4}}>KATEGORİ</label>
            <select style={{...S.select,width:180,fontSize:11}} value={kategoriF} onChange={e => setKategoriF(e.target.value)}>
              <option value="">TÜMÜ</option>
              {giderKategorileri.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label style={{...S.label,marginBottom:4}}>BAŞLANGIÇ</label>
            <input type="date" style={{...S.input,width:150,fontSize:11}} value={baslangic} onChange={e => setBaslangic(e.target.value)}/>
          </div>
          <div>
            <label style={{...S.label,marginBottom:4}}>BİTİŞ</label>
            <input type="date" style={{...S.input,width:150,fontSize:11}} value={bitis} onChange={e => setBitis(e.target.value)}/>
          </div>
          <div style={{marginLeft:'auto',alignSelf:'flex-end'}}>
            <button style={{...S.btn,...S.btnG,fontSize:11}} onClick={() => {setKasaF('');setKategoriF('');setBaslangic('');setBitis('');}}>
              <LIcon name="RotateCcw" size={13} color={C.textSec}/> TEMİZLE
            </button>
          </div>
        </div>

        {/* TABLO */}
        <div style={{overflowX:'auto'}}>
          {giderler.length === 0 ? (
            <EmptyState icon="TrendingDown" title="GİDER KAYDI BULUNAMADI" desc="SEÇİLEN FİLTRELERE UYGUN GİDER KAYDI BULUNMAMAKTADIR"/>
          ) : (
            <>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:800}}>
                <thead>
                  <tr style={{background:C.bgHover}}>
                    {['TARİH','KASA','DOSYA NO','KATEGORİ','TUTAR','AÇIKLAMA'].map(h =>
                      <th key={h} style={{padding:'12px 14px',textAlign:'left',color: MR.tema==='koyu' ? '#cbd5e1' : C.textMuted,fontWeight:800,fontSize:12,borderBottom:`2px solid ${C.border}`,letterSpacing:0.3}}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {giderler.map((g, i) => (
                    <tr key={g.id || i} style={{borderBottom:`1px solid ${C.border}`}}
                      onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{padding:'10px 12px',color:C.textSec,fontSize:11}}>{g.tarih || g.created_at?.split(' ')[0] || '-'}</td>
                      <td style={{padding:'10px 12px',fontWeight:600}}>{g.kasa_adi || kasaAdi(g.kasa_id)}</td>
                      <td style={{padding:'10px 12px'}}>
                        {g.dosya_no ? (
                          <span style={{color:C.accent,fontWeight:600,cursor:'pointer'}} onClick={() => g.dosya_id && setPage('dosya-detay-' + g.dosya_id)}>
                            {g.dosya_no}
                          </span>
                        ) : <span style={{color:C.textMuted}}>-</span>}
                      </td>
                      <td style={{padding:'10px 12px'}}><Badge text={(g.kategori || 'GİDER').toUpperCase()} color={C.warning}/></td>
                      <td style={{padding:'10px 12px',fontWeight:700,color:C.danger,fontSize:12}}>-{fmt(parseFloat(g.tutar) || 0)}</td>
                      <td style={{padding:'10px 12px',color:C.textSec,maxWidth:250,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.aciklama || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* ALT TOPLAM */}
              <div style={{padding:'14px 20px',borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:`${C.danger}08`}}>
                <div style={{fontSize:12,fontWeight:700,color:C.textSec}}>
                  TOPLAM: <span style={{color:C.danger,fontSize:14}}>{fmt(toplamTutar)}</span>
                </div>
                <div style={{fontSize:11,color:C.textMuted}}>{giderler.length} KAYIT</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* YENİ GİDER MODAL */}
      <Modal open={modalAcik} onClose={() => setModalAcik(false)} title="YENİ GİDER KAYDI" width="560px">
        <HataMesaji mesaj={hata}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="KASA SEÇİMİ *">
            <select style={S.select} value={form.kasa_id} onChange={e => setForm(p => ({...p, kasa_id: e.target.value}))}>
              <option value="">KASA SEÇİNİZ</option>
              {aktifKasalar.map(k => <option key={k.id} value={k.id}>{k.ad} ({k.tur === 'nakit' ? 'NAKİT' : 'BANKA'})</option>)}
            </select>
          </FormGroup>
          <FormGroup label="DOSYA NO (OPSİYONEL)">
            <input style={S.input} value={form.dosya_id} onChange={e => setForm(p => ({...p, dosya_id: e.target.value}))} placeholder="DOSYA ID"/>
          </FormGroup>
          <FormGroup label="KATEGORİ *">
            <select style={S.select} value={form.kategori} onChange={e => setForm(p => ({...p, kategori: e.target.value}))}>
              {giderKategorileri.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="TUTAR *">
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:C.textMuted,fontSize:14,fontWeight:700}}>₺</span>
              <input style={{...S.input,paddingLeft:30,fontSize:16,fontWeight:700}} value={form.tutar}
                onChange={e => setForm(p => ({...p, tutar: fmtInput(e.target.value)}))} placeholder="0,00"/>
            </div>
          </FormGroup>
          <FormGroup label="TARİH">
            <input type="date" style={S.input} value={form.tarih} onChange={e => setForm(p => ({...p, tarih: e.target.value}))}/>
          </FormGroup>
          <FormGroup label="AÇIKLAMA" full>
            <textarea style={{...S.input,minHeight:70}} value={form.aciklama} onChange={e => setForm(p => ({...p, aciklama: e.target.value.toUpperCase()}))} placeholder="GİDER AÇIKLAMASI..."/>
          </FormGroup>
        </div>
        <div style={{marginTop:24,display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setModalAcik(false)}>İPTAL</button>
          <button style={{...S.btn,...S.btnD}} onClick={kaydet} disabled={kayitLoading}>
            <LIcon name="Plus" size={14} color="#fff"/> {kayitLoading ? 'KAYDEDİLİYOR...' : 'GİDER KAYDET'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 3 – KOMİSYON / PRİM
   ═══════════════════════════════════════════════════════════ */
const KomisyonPrim = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, Loading, EmptyState, Modal, FormGroup, Confirm, api, fmt, fmtInput, parseNum} = MR;
  const [komisyonlar, setKomisyonlar] = useState([]);
  const [kasalar, setKasalar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAcik, setModalAcik] = useState(false);
  const [odeModalAcik, setOdeModalAcik] = useState(false);
  const [secilenKomisyon, setSecilenKomisyon] = useState(null);
  const [form, setForm] = useState({ilgili_tip:'ortak', ilgili_id:'', dosya_id:'', tutar:'', oran:'', aciklama:''});
  const [odeForm, setOdeForm] = useState({kasa_id:''});
  const [kayitLoading, setKayitLoading] = useState(false);
  const [hata, setHata] = useState('');
  const [basari, setBasari] = useState('');
  const [confirm, setConfirm] = useState({open:false, msg:'', cb:null});

  /* FİLTRELER */
  const [durumF, setDurumF] = useState('');
  const [tipF, setTipF] = useState('');

  const yukle = async () => {
    setLoading(true);
    const p = {};
    if (durumF) p.durum = durumF;
    if (tipF) p.ilgili_tip = tipF;
    const [kR, kaR] = await Promise.all([api.komisyonList(p), api.kasaList()]);
    if (kR?.success) setKomisyonlar(kR.data?.items || kR.data || []);
    if (kaR?.success) setKasalar(kaR.data || []);
    setLoading(false);
  };

  useEffect(() => { yukle(); }, [durumF, tipF]);

  const aktifKasalar = useMemo(() => kasalar.filter(k => k.aktif !== false && k.aktif !== 0), [kasalar]);

  /* İSTATİSTİKLER */
  const istatistik = useMemo(() => {
    let toplam = 0, bekleyen = 0, onayli = 0, odenen = 0;
    komisyonlar.forEach(k => {
      const t = parseFloat(k.tutar) || 0;
      toplam += t;
      if (k.durum === 'bekliyor') bekleyen += t;
      if (k.durum === 'onaylandi') onayli += t;
      if (k.durum === 'odendi') odenen += t;
    });
    return {toplam, bekleyen, onayli, odenen};
  }, [komisyonlar]);

  const durumRenk = (d) => {
    if (d === 'bekliyor') return C.warning;
    if (d === 'onaylandi') return C.cyan;
    if (d === 'odendi') return C.success;
    return C.textMuted;
  };
  const durumLabel = (d) => {
    if (d === 'bekliyor') return 'BEKLİYOR';
    if (d === 'onaylandi') return 'ONAYLANDI';
    if (d === 'odendi') return 'ÖDENDİ';
    return (d || '').toUpperCase();
  };

  /* YENİ KOMİSYON */
  const yeniKomisyonAc = () => {
    setForm({ilgili_tip:'ortak', ilgili_id:'', dosya_id:'', tutar:'', oran:'', aciklama:''});
    setHata(''); setBasari('');
    setModalAcik(true);
  };

  const kaydet = async () => {
    if (!form.ilgili_id) { setHata('İLGİLİ KİŞİ ID ZORUNLUDUR'); return; }
    const tutarNum = parseNum(form.tutar);
    if (tutarNum <= 0) { setHata('TUTAR 0\'DAN BÜYÜK OLMALIDIR'); return; }
    setKayitLoading(true); setHata('');
    const gonder = {
      ilgili_tip: form.ilgili_tip,
      ilgili_id: parseInt(form.ilgili_id),
      tutar: tutarNum,
      oran: form.oran ? parseFloat(form.oran.replace(',','.')) : undefined,
      aciklama: form.aciklama
    };
    if (form.dosya_id) gonder.dosya_id = parseInt(form.dosya_id);
    const r = await api.komisyonOlustur(gonder);
    if (r?.success) {
      setModalAcik(false);
      setBasari('KOMİSYON BAŞARIYLA OLUŞTURULDU');
      yukle();
      setTimeout(() => setBasari(''), 3000);
    } else {
      setHata(r?.error || 'KAYIT HATASI');
    }
    setKayitLoading(false);
  };

  /* ONAYLA */
  const onayla = (kom) => {
    setConfirm({
      open: true,
      msg: `${fmt(parseFloat(kom.tutar) || 0)} TUTARINDAKI KOMİSYONU ONAYLAMAK İSTİYOR MUSUNUZ?`,
      cb: async () => {
        setConfirm({open:false, msg:'', cb:null});
        const r = await api.komisyonOde({id: kom.id, durum:'onaylandi'});
        if (r?.success) { setBasari('KOMİSYON ONAYLANDI'); yukle(); setTimeout(() => setBasari(''), 3000); }
      }
    });
  };

  /* ÖDE MODAL */
  const odeAc = (kom) => {
    setSecilenKomisyon(kom);
    setOdeForm({kasa_id: aktifKasalar.length > 0 ? String(aktifKasalar[0].id) : ''});
    setHata('');
    setOdeModalAcik(true);
  };

  const odeKaydet = async () => {
    if (!odeForm.kasa_id) { setHata('KASA SEÇİMİ ZORUNLUDUR'); return; }
    if (!secilenKomisyon) return;
    setKayitLoading(true); setHata('');
    const r = await api.komisyonOde({id: secilenKomisyon.id, kasa_id: parseInt(odeForm.kasa_id)});
    if (r?.success) {
      setOdeModalAcik(false);
      setBasari('KOMİSYON ÖDEMESİ BAŞARIYLA GERÇEKLEŞTİRİLDİ');
      yukle();
      setTimeout(() => setBasari(''), 3000);
    } else {
      setHata(r?.error || 'ÖDEME HATASI');
    }
    setKayitLoading(false);
  };

  if (loading) return <Loading/>;

  return (
    <div>
      <BasariMesaji mesaj={basari}/>

      {/* İSTATİSTİK KARTLARI */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        <StatCard icon="Percent" label="TOPLAM KOMİSYON" value={fmt(istatistik.toplam)} color={C.accent}/>
        <StatCard icon="Clock" label="BEKLEYEN" value={fmt(istatistik.bekleyen)} color={C.warning}/>
        <StatCard icon="CheckCircle" label="ONAYLI" value={fmt(istatistik.onayli)} color={C.cyan}/>
        <StatCard icon="TurkishLira" label="ÖDENEN" value={fmt(istatistik.odenen)} color={C.success}/>
      </div>

      {/* KOMİSYON LİSTESİ */}
      <div style={S.card}>
        <SectionTitle icon="Percent" title="KOMİSYON / PRİM KAYITLARI"
          sub={`TOPLAM ${komisyonlar.length} KAYIT`}
          right={
            <button style={{...S.btn,...S.btnP,fontSize:11}} onClick={yeniKomisyonAc}>
              <LIcon name="Plus" size={14} color="#fff"/> YENİ KOMİSYON
            </button>
          }/>

        {/* FİLTRE BARI */}
        <div style={{padding:'14px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <div>
            <label style={{...S.label,marginBottom:4}}>DURUM</label>
            <select style={{...S.select,width:160,fontSize:11}} value={durumF} onChange={e => setDurumF(e.target.value)}>
              <option value="">TÜMÜ</option>
              <option value="bekliyor">BEKLİYOR</option>
              <option value="onaylandi">ONAYLANDI</option>
              <option value="odendi">ÖDENDİ</option>
            </select>
          </div>
          <div>
            <label style={{...S.label,marginBottom:4}}>İLGİLİ TİP</label>
            <select style={{...S.select,width:160,fontSize:11}} value={tipF} onChange={e => setTipF(e.target.value)}>
              <option value="">TÜMÜ</option>
              <option value="ortak">ORTAK</option>
              <option value="paydas">PAYDAŞ</option>
            </select>
          </div>
          <div style={{marginLeft:'auto',alignSelf:'flex-end'}}>
            <button style={{...S.btn,...S.btnG,fontSize:11}} onClick={() => {setDurumF('');setTipF('');}}>
              <LIcon name="RotateCcw" size={13} color={C.textSec}/> TEMİZLE
            </button>
          </div>
        </div>

        {/* TABLO */}
        <div style={{overflowX:'auto'}}>
          {komisyonlar.length === 0 ? (
            <EmptyState icon="Percent" title="KOMİSYON KAYDI BULUNAMADI" desc="SEÇİLEN FİLTRELERE UYGUN KOMİSYON KAYDI BULUNMAMAKTADIR"/>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:900}}>
              <thead>
                <tr style={{background:C.bgHover}}>
                  {['İLGİLİ','TİP','DOSYA NO','TUTAR','ORAN','DURUM','ÖDEME TARİHİ','İŞLEM'].map(h =>
                    <th key={h} style={{padding:'12px 14px',textAlign:'left',color: MR.tema==='koyu' ? '#cbd5e1' : C.textMuted,fontWeight:800,fontSize:12,borderBottom:`2px solid ${C.border}`,letterSpacing:0.3}}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {komisyonlar.map((k, i) => (
                  <tr key={k.id || i} style={{borderBottom:`1px solid ${C.border}`}}
                    onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{padding:'10px 12px',fontWeight:600}}>{k.ilgili_adi || k.ilgili_id || '-'}</td>
                    <td style={{padding:'10px 12px'}}>
                      <Badge text={k.ilgili_tip === 'ortak' ? 'ORTAK' : 'PAYDAŞ'} color={k.ilgili_tip === 'ortak' ? C.purple : C.cyan}/>
                    </td>
                    <td style={{padding:'10px 12px'}}>
                      {k.dosya_no ? (
                        <span style={{color:C.accent,fontWeight:600,cursor:'pointer'}} onClick={() => k.dosya_id && setPage('dosya-detay-' + k.dosya_id)}>
                          {k.dosya_no}
                        </span>
                      ) : <span style={{color:C.textMuted}}>-</span>}
                    </td>
                    <td style={{padding:'10px 12px',fontWeight:700,fontSize:12}}>{fmt(parseFloat(k.tutar) || 0)}</td>
                    <td style={{padding:'10px 12px',color:C.textSec}}>{k.oran ? `%${k.oran}` : '-'}</td>
                    <td style={{padding:'10px 12px'}}><Badge text={durumLabel(k.durum)} color={durumRenk(k.durum)}/></td>
                    <td style={{padding:'10px 12px',color:C.textSec,fontSize:11}}>{k.odeme_tarihi || '-'}</td>
                    <td style={{padding:'10px 12px'}}>
                      <div style={{display:'flex',gap:6}}>
                        {k.durum === 'bekliyor' && (
                          <div onClick={() => onayla(k)} style={{width:28,height:28,borderRadius:7,background:'linear-gradient(180deg, #22d3ee 0%, #06b6d4 40%, #0891b2 100%)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 2px 8px -1px rgba(6,182,212,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',borderBottom:'1px solid #0e7490'}} title="ONAYLA">
                            <LIcon name="CheckCircle" size={13} color="#fff"/>
                          </div>
                        )}
                        {(k.durum === 'bekliyor' || k.durum === 'onaylandi') && (
                          <div onClick={() => odeAc(k)} style={{width:28,height:28,borderRadius:7,background:'linear-gradient(180deg, #34d399 0%, #10b981 40%, #059669 100%)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 2px 8px -1px rgba(16,185,129,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',borderBottom:'1px solid #047857'}} title="ÖDE">
                            <LIcon name="Banknote" size={13} color="#fff"/>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* YENİ KOMİSYON MODAL */}
      <Modal open={modalAcik} onClose={() => setModalAcik(false)} title="YENİ KOMİSYON OLUŞTUR" width="560px">
        <HataMesaji mesaj={hata}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="İLGİLİ TİP *">
            <select style={S.select} value={form.ilgili_tip} onChange={e => setForm(p => ({...p, ilgili_tip: e.target.value}))}>
              <option value="ortak">ORTAK</option>
              <option value="paydas">PAYDAŞ</option>
            </select>
          </FormGroup>
          <FormGroup label="İLGİLİ ID *">
            <input style={S.input} value={form.ilgili_id} onChange={e => setForm(p => ({...p, ilgili_id: e.target.value}))} placeholder="ORTAK / PAYDAŞ ID"/>
          </FormGroup>
          <FormGroup label="DOSYA NO (OPSİYONEL)">
            <input style={S.input} value={form.dosya_id} onChange={e => setForm(p => ({...p, dosya_id: e.target.value}))} placeholder="DOSYA ID"/>
          </FormGroup>
          <FormGroup label="TUTAR *">
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:C.textMuted,fontSize:14,fontWeight:700}}>₺</span>
              <input style={{...S.input,paddingLeft:30,fontSize:16,fontWeight:700}} value={form.tutar}
                onChange={e => setForm(p => ({...p, tutar: fmtInput(e.target.value)}))} placeholder="0,00"/>
            </div>
          </FormGroup>
          <FormGroup label="ORAN (%)">
            <input style={S.input} value={form.oran} onChange={e => setForm(p => ({...p, oran: e.target.value}))} placeholder="ÖRN: 10"/>
          </FormGroup>
          <FormGroup label="AÇIKLAMA" full>
            <textarea style={{...S.input,minHeight:70}} value={form.aciklama} onChange={e => setForm(p => ({...p, aciklama: e.target.value.toUpperCase()}))} placeholder="KOMİSYON AÇIKLAMASI..."/>
          </FormGroup>
        </div>
        <div style={{marginTop:24,display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setModalAcik(false)}>İPTAL</button>
          <button style={{...S.btn,...S.btnP}} onClick={kaydet} disabled={kayitLoading}>
            <LIcon name="Plus" size={14} color="#fff"/> {kayitLoading ? 'KAYDEDİLİYOR...' : 'KOMİSYON OLUŞTUR'}
          </button>
        </div>
      </Modal>

      {/* ÖDEME MODAL */}
      <Modal open={odeModalAcik} onClose={() => setOdeModalAcik(false)} title="KOMİSYON ÖDEMESİ" width="440px">
        <HataMesaji mesaj={hata}/>
        {secilenKomisyon && (
          <div style={{marginBottom:20,padding:16,background:C.bgHover,borderRadius:10,border:`1px solid ${C.border}`}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
              <span style={{fontSize:11,color:C.textMuted}}>İLGİLİ</span>
              <span style={{fontSize:12,fontWeight:600}}>{secilenKomisyon.ilgili_adi || secilenKomisyon.ilgili_id}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <span style={{fontSize:11,color:C.textMuted}}>ÖDENECEK TUTAR</span>
              <span style={{fontSize:16,fontWeight:800,color:C.success}}>{fmt(parseFloat(secilenKomisyon.tutar) || 0)}</span>
            </div>
          </div>
        )}
        <FormGroup label="ÖDEME KASASI *">
          <select style={S.select} value={odeForm.kasa_id} onChange={e => setOdeForm({kasa_id: e.target.value})}>
            <option value="">KASA SEÇİNİZ</option>
            {aktifKasalar.map(k => <option key={k.id} value={k.id}>{k.ad} ({k.tur === 'nakit' ? 'NAKİT' : 'BANKA'}) - BAKİYE: {fmt(parseFloat(k.bakiye) || 0)}</option>)}
          </select>
        </FormGroup>
        <div style={{marginTop:24,display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setOdeModalAcik(false)}>İPTAL</button>
          <button style={{...S.btn,...S.btnS}} onClick={odeKaydet} disabled={kayitLoading}>
            <LIcon name="Banknote" size={14} color="#fff"/> {kayitLoading ? 'ÖDENİYOR...' : 'ÖDEMEYİ ONAYLA'}
          </button>
        </div>
      </Modal>

      {/* ONAY DİALOG */}
      <Confirm open={confirm.open} message={confirm.msg}
        onConfirm={() => confirm.cb && confirm.cb()}
        onCancel={() => setConfirm({open:false, msg:'', cb:null})}/>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 4 – KASA / BANKA
   ═══════════════════════════════════════════════════════════ */
const KasaBanka = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, Loading, EmptyState, Modal, FormGroup, Confirm, api, fmt, fmtInput, parseNum} = MR;
  const isAdmin = user?.rol === 'admin';
  const [kasalar, setKasalar] = useState([]);
  const [hareketler, setHareketler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kasaModalAcik, setKasaModalAcik] = useState(false);
  const [transferModalAcik, setTransferModalAcik] = useState(false);
  const [duzenle, setDuzenle] = useState(null);
  const [kasaForm, setKasaForm] = useState({ad:'', tur:'nakit', banka_adi:'', iban:''});
  const [transferForm, setTransferForm] = useState({kaynak_id:'', hedef_id:'', tutar:'', aciklama:''});
  const [kayitLoading, setKayitLoading] = useState(false);
  const [hata, setHata] = useState('');
  const [basari, setBasari] = useState('');
  const [confirm, setConfirm] = useState({open:false, msg:'', cb:null});
  /* BAKİYE DÜZELTME (SADECE ADMİN) */
  const [duzeltmeModal, setDuzeltmeModal] = useState(null);
  const [duzeltmeForm, setDuzeltmeForm] = useState({yeni_bakiye:'', aciklama:''});

  /* HAREKET FİLTRELERİ */
  const [hKasaF, setHKasaF] = useState('');
  const [hTurF, setHTurF] = useState('');
  const [hBaslangic, setHBaslangic] = useState('');
  const [hBitis, setHBitis] = useState('');
  const [hLoading, setHLoading] = useState(false);

  const kasaYukle = async () => {
    setLoading(true);
    const r = await api.kasaList();
    if (r?.success) setKasalar(r.data || []);
    setLoading(false);
  };

  const hareketYukle = async () => {
    setHLoading(true);
    const p = {limit: 30};
    if (hKasaF) p.kasa_id = hKasaF;
    if (hTurF) p.tur = hTurF;
    if (hBaslangic) p.baslangic = hBaslangic;
    if (hBitis) p.bitis = hBitis;
    const r = await api.kasaHareketler(p);
    if (r?.success) setHareketler(r.data?.items || r.data || []);
    setHLoading(false);
  };

  useEffect(() => { kasaYukle(); }, []);
  useEffect(() => { hareketYukle(); }, [hKasaF, hTurF, hBaslangic, hBitis]);

  const aktifKasalar = useMemo(() => kasalar.filter(k => k.aktif !== false && k.aktif !== 0), [kasalar]);

  /* İSTATİSTİKLER */
  const istatistik = useMemo(() => {
    const aktifler = kasalar.filter(k => k.aktif !== false && k.aktif !== 0);
    const topBakiye = aktifler.reduce((t, k) => t + (parseFloat(k.bakiye) || 0), 0);
    const nakitBakiye = aktifler.filter(k => k.tur === 'nakit').reduce((t, k) => t + (parseFloat(k.bakiye) || 0), 0);
    const bankaBakiye = aktifler.filter(k => k.tur === 'banka').reduce((t, k) => t + (parseFloat(k.bakiye) || 0), 0);
    return {topBakiye, nakitBakiye, bankaBakiye, sayi: kasalar.length};
  }, [kasalar]);

  /* KASA YENİ / DÜZENLE */
  const yeniKasaAc = () => {
    setDuzenle(null);
    setKasaForm({ad:'', tur:'nakit', banka_adi:'', iban:''});
    setHata('');
    setKasaModalAcik(true);
  };

  const duzenleAc = (kasa) => {
    setDuzenle(kasa);
    setKasaForm({ad: kasa.ad || '', tur: kasa.tur || 'nakit', banka_adi: kasa.banka_adi || '', iban: kasa.iban || ''});
    setHata('');
    setKasaModalAcik(true);
  };

  const kasaKaydet = async () => {
    if (!kasaForm.ad.trim()) { setHata('KASA ADI ZORUNLUDUR'); return; }
    if (kasaForm.tur === 'banka' && !kasaForm.banka_adi.trim()) { setHata('BANKA ADI ZORUNLUDUR'); return; }
    setKayitLoading(true); setHata('');
    let r;
    if (duzenle) {
      r = await api.kasaUpdate({id: duzenle.id, ad: kasaForm.ad, banka_adi: kasaForm.banka_adi, iban: kasaForm.iban, aktif: duzenle.aktif});
    } else {
      r = await api.kasaCreate({ad: kasaForm.ad, tur: kasaForm.tur, banka_adi: kasaForm.banka_adi, iban: kasaForm.iban});
    }
    if (r?.success) {
      setKasaModalAcik(false);
      setBasari(duzenle ? 'KASA GÜNCELLENDİ' : 'KASA OLUŞTURULDU');
      kasaYukle();
      setTimeout(() => setBasari(''), 3000);
    } else {
      setHata(r?.error || 'KAYIT HATASI');
    }
    setKayitLoading(false);
  };

  /* AKTİF / PASİF TOGGLE */
  const toggleAktif = (kasa) => {
    const yeniDurum = kasa.aktif === false || kasa.aktif === 0 ? true : false;
    const mesaj = yeniDurum ? `"${kasa.ad}" KASASINI AKTİF ETMEK İSTİYOR MUSUNUZ?` : `"${kasa.ad}" KASASINI PASİF YAPMAK İSTİYOR MUSUNUZ?`;
    setConfirm({
      open: true,
      msg: mesaj,
      cb: async () => {
        setConfirm({open:false, msg:'', cb:null});
        const r = await api.kasaUpdate({id: kasa.id, ad: kasa.ad, banka_adi: kasa.banka_adi, iban: kasa.iban, aktif: yeniDurum});
        if (r?.success) kasaYukle();
      }
    });
  };

  /* TRANSFER */
  const transferAc = () => {
    setTransferForm({kaynak_id:'', hedef_id:'', tutar:'', aciklama:''});
    setHata('');
    setTransferModalAcik(true);
  };

  const kaynakKasa = kasalar.find(k => k.id == transferForm.kaynak_id);
  const hedefKasa = kasalar.find(k => k.id == transferForm.hedef_id);

  const transferKaydet = async () => {
    if (!transferForm.kaynak_id) { setHata('KAYNAK KASA SEÇİMİ ZORUNLUDUR'); return; }
    if (!transferForm.hedef_id) { setHata('HEDEF KASA SEÇİMİ ZORUNLUDUR'); return; }
    if (transferForm.kaynak_id === transferForm.hedef_id) { setHata('KAYNAK VE HEDEF KASA AYNI OLAMAZ'); return; }
    const tutarNum = parseNum(transferForm.tutar);
    if (tutarNum <= 0) { setHata('TUTAR 0\'DAN BÜYÜK OLMALIDIR'); return; }
    setKayitLoading(true); setHata('');
    const r = await api.kasaTransfer({
      kaynak_id: parseInt(transferForm.kaynak_id),
      hedef_id: parseInt(transferForm.hedef_id),
      tutar: tutarNum,
      aciklama: transferForm.aciklama
    });
    if (r?.success) {
      setTransferModalAcik(false);
      setBasari('TRANSFER BAŞARIYLA GERÇEKLEŞTİRİLDİ');
      kasaYukle(); hareketYukle();
      setTimeout(() => setBasari(''), 3000);
    } else {
      setHata(r?.error || 'TRANSFER HATASI');
    }
    setKayitLoading(false);
  };

  const kasaAdi = (id) => { const k = kasalar.find(k => k.id == id); return k ? k.ad : '-'; };

  const turRenk = (tur) => {
    if (tur === 'giris' || tur === 'gelir' || tur === 'komisyon') return C.success;
    if (tur === 'cikis' || tur === 'gider') return C.danger;
    if (tur === 'transfer') return C.warning;
    return C.textSec;
  };
  const turLabel = (tur) => {
    const map = {giris:'GİRİŞ', cikis:'ÇIKIŞ', gelir:'GELİR', gider:'GİDER', komisyon:'KOMİSYON', transfer:'TRANSFER'};
    return map[tur] || (tur || '').toUpperCase();
  };

  if (loading) return <Loading/>;

  return (
    <div>
      <BasariMesaji mesaj={basari}/>

      {/* İSTATİSTİK KARTLARI */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        <StatCard icon="Wallet" label="TOPLAM BAKİYE" value={fmt(istatistik.topBakiye)} color={C.accent}/>
        <StatCard icon="Banknote" label="NAKİT BAKİYE" value={fmt(istatistik.nakitBakiye)} color={C.success}/>
        <StatCard icon="Building2" label="BANKA BAKİYE" value={fmt(istatistik.bankaBakiye)} color={C.cyan}/>
        <StatCard icon="Hash" label="KASA SAYISI" value={istatistik.sayi} color={C.purple}/>
      </div>

      {/* KASA KARTLARI */}
      <div style={S.card}>
        <SectionTitle icon="Wallet" title="KASALAR"
          sub={`${kasalar.length} KASA TANIMLI`}
          right={isAdmin ? (
            <div style={{display:'flex',gap:8}}>
              <button style={{...S.btn,...S.btnD,fontSize:11}} onClick={()=>setConfirm({open:true,msg:'TÜM KASA BAKİYELERİNİ SIFIRLAMAK İSTEDİĞİNİZE EMİN MİSİNİZ? BU İŞLEM GERİ ALINAMAZ!',cb:async()=>{setConfirm({open:false,msg:'',cb:null});const r=await api.bakiyeSifirla();if(r?.success){setBasari('TÜM BAKİYELER SIFIRLANDI');kasaYukle();hareketYukle();setTimeout(()=>setBasari(''),4000);}else{setHata(r?.error||'SIFIRLAMA HATASI');setTimeout(()=>setHata(''),4000);}}})}>
                <LIcon name="RotateCcw" size={14} color="#fff"/> BAKİYELERİ SIFIRLA
              </button>
              <button style={{...S.btn,...S.btnW,fontSize:11}} onClick={transferAc}>
                <LIcon name="ArrowRightLeft" size={14} color="#000"/> TRANSFER
              </button>
              <button style={{...S.btn,...S.btnP,fontSize:11}} onClick={yeniKasaAc}>
                <LIcon name="Plus" size={14} color="#fff"/> YENİ KASA
              </button>
            </div>
          ) : null}/>
        <div style={S.cardBody}>
          {kasalar.length === 0 ? (
            <EmptyState icon="Wallet" title="KASA BULUNAMADI" desc="YENİ KASA OLUŞTURMAK İÇİN YUKARIDAKI BUTONA TIKLAYIN"/>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
              {kasalar.map((kasa, idx) => {
                const pasif = kasa.aktif === false || kasa.aktif === 0;
                const bakiye = parseFloat(kasa.bakiye) || 0;
                const turRenk = kasa.tur === 'nakit' ? C.success : C.cyan;
                return (
                  <div key={kasa.id || idx} style={{
                    background: pasif ? `${C.bgHover}88` : C.bgCard,
                    borderRadius:12, border:`1px solid ${pasif ? C.border : turRenk + '33'}`,
                    padding:20, position:'relative', opacity: pasif ? 0.6 : 1, transition:'all .2s'
                  }}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
                      <div>
                        <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>{kasa.ad}</div>
                        <Badge text={kasa.tur === 'nakit' ? 'NAKİT' : 'BANKA'} color={turRenk}/>
                        {pasif && <span style={{marginLeft:6}}><Badge text="PASİF" color={C.danger}/></span>}
                      </div>
                      {isAdmin && (
                        <div style={{display:'flex',gap:6}}>
                          <div onClick={() => duzenleAc(kasa)} style={{width:30,height:30,borderRadius:7,background:'linear-gradient(180deg, #60a5fa 0%, #3b82f6 40%, #2563eb 100%)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 2px 8px -1px rgba(37,99,235,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',borderBottom:'1px solid #1d4ed8'}} title="DÜZENLE">
                            <LIcon name="Pencil" size={13} color="#fff"/>
                          </div>
                          <div onClick={() => {setDuzeltmeModal(kasa);setDuzeltmeForm({yeni_bakiye:String(Math.round(parseFloat(kasa.bakiye)||0)),aciklama:''});}} style={{width:30,height:30,borderRadius:7,background:'linear-gradient(180deg, #fcd34d 0%, #f59e0b 40%, #d97706 100%)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 2px 8px -1px rgba(245,158,11,0.4), inset 0 1px 0 rgba(255,255,255,0.25)',borderBottom:'1px solid #b45309'}} title="BAKİYE DÜZELT">
                            <LIcon name="Calculator" size={13} color="#000"/>
                          </div>
                          <div onClick={() => toggleAktif(kasa)} style={{width:30,height:30,borderRadius:7,background: pasif ? 'linear-gradient(180deg, #34d399 0%, #10b981 40%, #059669 100%)' : 'linear-gradient(180deg, #f87171 0%, #ef4444 40%, #dc2626 100%)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow: pasif ? '0 2px 8px -1px rgba(16,185,129,0.45), inset 0 1px 0 rgba(255,255,255,0.2)' : '0 2px 8px -1px rgba(239,68,68,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',borderBottom: pasif ? '1px solid #047857' : '1px solid #b91c1c'}} title={pasif ? 'AKTİF ET' : 'PASİF YAP'}>
                            <LIcon name={pasif ? 'ToggleRight' : 'ToggleLeft'} size={13} color="#fff"/>
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{fontSize:26,fontWeight:800,color: bakiye >= 0 ? C.success : C.danger, marginBottom:16, letterSpacing:-0.5}}>
                      {fmt(bakiye)}
                    </div>
                    {kasa.tur === 'banka' && (
                      <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12}}>
                        {kasa.banka_adi && (
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                            <LIcon name="Building2" size={12} color={C.textMuted}/>
                            <span style={{fontSize:11,color:C.textSec}}>{kasa.banka_adi}</span>
                          </div>
                        )}
                        {kasa.iban && (
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <LIcon name="CreditCard" size={12} color={C.textMuted}/>
                            <span style={{fontSize:10,color:C.textMuted,fontFamily:'monospace',letterSpacing:1}}>{kasa.iban}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* HAREKET LİSTESİ */}
      <div style={{...S.card, marginTop:20}}>
        <SectionTitle icon="ArrowLeftRight" title="KASA HAREKETLERİ" sub="SON 30 HAREKET"/>

        {/* FİLTRE BARI */}
        <div style={{padding:'14px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <div>
            <label style={{...S.label,marginBottom:4}}>KASA</label>
            <select style={{...S.select,width:180,fontSize:11}} value={hKasaF} onChange={e => setHKasaF(e.target.value)}>
              <option value="">TÜMÜ</option>
              {kasalar.map(k => <option key={k.id} value={k.id}>{k.ad}</option>)}
            </select>
          </div>
          <div>
            <label style={{...S.label,marginBottom:4}}>TÜR</label>
            <select style={{...S.select,width:140,fontSize:11}} value={hTurF} onChange={e => setHTurF(e.target.value)}>
              <option value="">TÜMÜ</option>
              <option value="giris">GİRİŞ</option>
              <option value="cikis">ÇIKIŞ</option>
              <option value="transfer">TRANSFER</option>
              <option value="gelir">GELİR</option>
              <option value="gider">GİDER</option>
            </select>
          </div>
          <div>
            <label style={{...S.label,marginBottom:4}}>BAŞLANGIÇ</label>
            <input type="date" style={{...S.input,width:150,fontSize:11}} value={hBaslangic} onChange={e => setHBaslangic(e.target.value)}/>
          </div>
          <div>
            <label style={{...S.label,marginBottom:4}}>BİTİŞ</label>
            <input type="date" style={{...S.input,width:150,fontSize:11}} value={hBitis} onChange={e => setHBitis(e.target.value)}/>
          </div>
          <div style={{marginLeft:'auto',alignSelf:'flex-end'}}>
            <button style={{...S.btn,...S.btnG,fontSize:11}} onClick={() => {setHKasaF('');setHTurF('');setHBaslangic('');setHBitis('');}}>
              <LIcon name="RotateCcw" size={13} color={C.textSec}/> TEMİZLE
            </button>
          </div>
        </div>

        <div style={{overflowX:'auto'}}>
          {hLoading ? <Loading/> : hareketler.length === 0 ? (
            <EmptyState icon="ArrowLeftRight" title="HAREKET BULUNAMADI" desc="SEÇİLEN FİLTRELERE UYGUN HAREKET BULUNMAMAKTADIR"/>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:800}}>
              <thead>
                <tr style={{background:C.bgHover}}>
                  {['TARİH','KASA','TÜR','TUTAR','AÇIKLAMA','DOSYA NO'].map(h =>
                    <th key={h} style={{padding:'12px 14px',textAlign:'left',color: MR.tema==='koyu' ? '#cbd5e1' : C.textMuted,fontWeight:800,fontSize:12,borderBottom:`2px solid ${C.border}`,letterSpacing:0.3}}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {hareketler.map((h, i) => {
                  const tutar = parseFloat(h.tutar) || 0;
                  const giris = h.tur === 'giris' || h.tur === 'gelir' || h.tur === 'komisyon';
                  return (
                    <tr key={h.id || i} style={{borderBottom:`1px solid ${C.border}`}}
                      onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{padding:'10px 12px',color:C.textSec,fontSize:11}}>{h.tarih || h.created_at?.split(' ')[0] || '-'}</td>
                      <td style={{padding:'10px 12px',fontWeight:600}}>{h.kasa_adi || kasaAdi(h.kasa_id)}</td>
                      <td style={{padding:'10px 12px'}}><Badge text={turLabel(h.tur)} color={turRenk(h.tur)}/></td>
                      <td style={{padding:'10px 12px',fontWeight:700,color: giris ? C.success : C.danger,fontSize:12}}>
                        {giris ? '+' : '-'}{fmt(tutar)}
                      </td>
                      <td style={{padding:'10px 12px',color:C.textSec,maxWidth:250,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.aciklama || '-'}</td>
                      <td style={{padding:'10px 12px'}}>
                        {h.dosya_no ? (
                          <span style={{color:C.accent,fontWeight:600,cursor:'pointer'}} onClick={() => h.dosya_id && setPage('dosya-detay-' + h.dosya_id)}>
                            {h.dosya_no}
                          </span>
                        ) : <span style={{color:C.textMuted}}>-</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* YENİ / DÜZENLE KASA MODAL */}
      <Modal open={kasaModalAcik} onClose={() => setKasaModalAcik(false)} title={duzenle ? 'KASA DÜZENLE' : 'YENİ KASA OLUŞTUR'} width="500px">
        <HataMesaji mesaj={hata}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="KASA ADI *">
            <input style={S.input} value={kasaForm.ad} onChange={e => setKasaForm(p => ({...p, ad: e.target.value.toUpperCase()}))} placeholder="KASA ADI"/>
          </FormGroup>
          <FormGroup label="TÜR *">
            <select style={S.select} value={kasaForm.tur} onChange={e => setKasaForm(p => ({...p, tur: e.target.value}))} disabled={!!duzenle}>
              <option value="nakit">NAKİT</option>
              <option value="banka">BANKA</option>
            </select>
          </FormGroup>
          {kasaForm.tur === 'banka' && (
            <>
              <FormGroup label="BANKA ADI">
                <input style={S.input} value={kasaForm.banka_adi} onChange={e => setKasaForm(p => ({...p, banka_adi: e.target.value.toUpperCase()}))} placeholder="BANKA ADI"/>
              </FormGroup>
              <FormGroup label="IBAN">
                <MR.IBANInput value={kasaForm.iban} onChange={v => setKasaForm(p => ({...p, iban: v}))}/>
              </FormGroup>
            </>
          )}
        </div>
        <div style={{marginTop:24,display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setKasaModalAcik(false)}>İPTAL</button>
          <button style={{...S.btn,...S.btnP}} onClick={kasaKaydet} disabled={kayitLoading}>
            <LIcon name="Save" size={14} color="#fff"/> {kayitLoading ? 'KAYDEDİLİYOR...' : 'KAYDET'}
          </button>
        </div>
      </Modal>

      {/* BAKİYE DÜZELTME MODAL (SADECE ADMİN) */}
      <Modal open={!!duzeltmeModal} onClose={()=>setDuzeltmeModal(null)} title="BAKİYE DÜZELT" width="500px">
        {duzeltmeModal && (
          <div>
            <HataMesaji mesaj={hata}/>
            <div style={{padding:12,borderRadius:8,background:`${C.warning}11`,border:`1px solid ${C.warning}33`,marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700}}>{duzeltmeModal.ad}</div>
              <div style={{fontSize:11,color:C.textSec,marginTop:4}}>MEVCUT BAKİYE: <strong style={{color:C.text,fontSize:16}}>{fmt(parseFloat(duzeltmeModal.bakiye)||0)}</strong></div>
            </div>
            <FormGroup label="YENİ BAKİYE (₺) *">
              <input style={{...S.input,fontSize:18,fontWeight:700}} value={duzeltmeForm.yeni_bakiye}
                onChange={e=>setDuzeltmeForm(f=>({...f,yeni_bakiye:e.target.value.replace(/[^0-9.,\-]/g,'')}))}
                placeholder="0"/>
            </FormGroup>
            <FormGroup label="DÜZELTME NEDENİ">
              <input style={S.input} value={duzeltmeForm.aciklama}
                onChange={e=>setDuzeltmeForm(f=>({...f,aciklama:e.target.value.toUpperCase()}))}
                placeholder="DÜZELTME NEDENİNİ YAZINIZ"/>
            </FormGroup>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:20}}>
              <button style={{...S.btn,...S.btnG}} onClick={()=>setDuzeltmeModal(null)}>İPTAL</button>
              <button style={{...S.btn,...S.btnW}} onClick={async()=>{
                const yb = parseNum(duzeltmeForm.yeni_bakiye);
                const r = await api.bakiyeDuzelt({kasa_id:duzeltmeModal.id, yeni_bakiye:yb, aciklama:duzeltmeForm.aciklama||'MANUEL DÜZELTME'});
                if(r?.success){setDuzeltmeModal(null);setBasari('BAKİYE DÜZELTİLDİ');kasaYukle();hareketYukle();setTimeout(()=>setBasari(''),4000);}
                else{setHata(r?.error||'DÜZELTME HATASI');setTimeout(()=>setHata(''),4000);}
              }}>
                <LIcon name="Calculator" size={14} color="#000"/> BAKİYE DÜZELT
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* TRANSFER MODAL */}
      <Modal open={transferModalAcik} onClose={() => setTransferModalAcik(false)} title="KASALAR ARASI TRANSFER" width="600px">
        <HataMesaji mesaj={hata}/>

        {/* GÖRSEL TRANSFER BÖLÜMÜ */}
        <div style={{display:'flex',alignItems:'stretch',gap:20,marginBottom:24}}>
          {/* KAYNAK KASA */}
          <div style={{flex:1,background:C.bgHover,borderRadius:12,padding:20,border:`1px solid ${C.border}`}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
              <div style={{width:36,height:36,borderRadius:10,background:`${C.danger}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <LIcon name="ArrowUpRight" size={18} color={C.danger}/>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:700}}>KAYNAK KASA</div>
                <div style={{fontSize:10,color:C.textMuted}}>PARA ÇIKIŞI</div>
              </div>
            </div>
            <select style={S.select} value={transferForm.kaynak_id} onChange={e => setTransferForm(p => ({...p, kaynak_id: e.target.value}))}>
              <option value="">KASA SEÇİNİZ</option>
              {aktifKasalar.filter(k => k.id != transferForm.hedef_id).map(k =>
                <option key={k.id} value={k.id}>{k.ad} ({k.tur === 'nakit' ? 'NAKİT' : 'BANKA'})</option>
              )}
            </select>
            {kaynakKasa && (
              <div style={{marginTop:12,padding:10,background:C.bgCard,borderRadius:8,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:10,color:C.textMuted,marginBottom:4}}>MEVCUT BAKİYE</div>
                <div style={{fontSize:20,fontWeight:800,color:C.text}}>{fmt(parseFloat(kaynakKasa.bakiye) || 0)}</div>
              </div>
            )}
          </div>

          {/* OK İŞARETİ */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,minWidth:60}}>
            <div style={{width:48,height:48,borderRadius:'50%',background:`${C.warning}22`,border:`2px solid ${C.warning}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <LIcon name="ArrowRight" size={24} color={C.warning}/>
            </div>
            {transferForm.tutar && (
              <div style={{fontSize:14,fontWeight:800,color:C.warning}}>
                ₺{fmtInput(transferForm.tutar)}
              </div>
            )}
          </div>

          {/* HEDEF KASA */}
          <div style={{flex:1,background:C.bgHover,borderRadius:12,padding:20,border:`1px solid ${C.border}`}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
              <div style={{width:36,height:36,borderRadius:10,background:`${C.success}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <LIcon name="ArrowDownLeft" size={18} color={C.success}/>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:700}}>HEDEF KASA</div>
                <div style={{fontSize:10,color:C.textMuted}}>PARA GİRİŞİ</div>
              </div>
            </div>
            <select style={S.select} value={transferForm.hedef_id} onChange={e => setTransferForm(p => ({...p, hedef_id: e.target.value}))}>
              <option value="">KASA SEÇİNİZ</option>
              {aktifKasalar.filter(k => k.id != transferForm.kaynak_id).map(k =>
                <option key={k.id} value={k.id}>{k.ad} ({k.tur === 'nakit' ? 'NAKİT' : 'BANKA'})</option>
              )}
            </select>
            {hedefKasa && (
              <div style={{marginTop:12,padding:10,background:C.bgCard,borderRadius:8,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:10,color:C.textMuted,marginBottom:4}}>MEVCUT BAKİYE</div>
                <div style={{fontSize:20,fontWeight:800,color:C.text}}>{fmt(parseFloat(hedefKasa.bakiye) || 0)}</div>
              </div>
            )}
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <FormGroup label="TRANSFER TUTARI *">
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:C.textMuted,fontSize:14,fontWeight:700}}>₺</span>
              <input style={{...S.input,paddingLeft:30,fontSize:16,fontWeight:700}} value={transferForm.tutar}
                onChange={e => setTransferForm(p => ({...p, tutar: fmtInput(e.target.value)}))} placeholder="0,00"/>
            </div>
          </FormGroup>
          <FormGroup label="AÇIKLAMA">
            <input style={S.input} value={transferForm.aciklama} onChange={e => setTransferForm(p => ({...p, aciklama: e.target.value.toUpperCase()}))} placeholder="TRANSFER AÇIKLAMASI"/>
          </FormGroup>
        </div>

        <div style={{marginTop:24,display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button style={{...S.btn,...S.btnG}} onClick={() => setTransferModalAcik(false)}>İPTAL</button>
          <button style={{...S.btn,...S.btnW}} onClick={transferKaydet} disabled={kayitLoading}>
            <LIcon name="ArrowRightLeft" size={14} color="#000"/> {kayitLoading ? 'TRANSFER EDİLİYOR...' : 'TRANSFER YAP'}
          </button>
        </div>
      </Modal>

      {/* ONAY DİALOG */}
      <Confirm open={confirm.open} message={confirm.msg}
        onConfirm={() => confirm.cb && confirm.cb()}
        onCancel={() => setConfirm({open:false, msg:'', cb:null})}/>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 5 – MALİYET ANALİZİ
   ═══════════════════════════════════════════════════════════ */
const MaliyetAnalizi = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, Badge, SectionTitle, Loading, EmptyState, api, fmt} = MR;
  const [veriler, setVeriler] = useState([]);
  const [loading, setLoading] = useState(true);

  const yukle = async () => {
    setLoading(true);
    const r = await api.maliyetAnaliz();
    if (r?.success) {
      /* Backend dosyalar dizisi döner - alan adlarını frontend'e uyumlu yap */
      const raw = r.data?.dosyalar || r.data?.items || (Array.isArray(r.data) ? r.data : []);
      const mapped = raw.map(d => ({
        ...d,
        dosya_id: d.id || d.dosya_id,
        gelir: (parseFloat(d.toplam_gelir || d.gelir) || 0),
        gider: (parseFloat(d.toplam_gider || d.gider) || 0) + (parseFloat(d.toplam_masraf || d.masraf) || 0),
        komisyon: (parseFloat(d.toplam_komisyon || d.komisyon) || 0),
        musteri: d.musteri || d.musteri_adi || d.sigorta_sirket || d.dosya_turu || '-'
      }));
      setVeriler(mapped);
    }
    setLoading(false);
  };

  useEffect(() => { yukle(); }, []);

  /* ÖZET İSTATİSTİKLER */
  const istatistik = useMemo(() => {
    let topGelir = 0, topGider = 0, topKomisyon = 0, karli = 0, zarari = 0;
    veriler.forEach(d => {
      const gelir = parseFloat(d.gelir) || 0;
      const gider = parseFloat(d.gider) || 0;
      const komisyon = parseFloat(d.komisyon) || 0;
      topGelir += gelir;
      topGider += gider;
      topKomisyon += komisyon;
      const net = gelir - gider - komisyon;
      if (net >= 0) karli++; else zarari++;
    });
    const netKar = topGelir - topGider - topKomisyon;
    const karMarji = topGelir > 0 ? ((netKar / topGelir) * 100).toFixed(1) : '0.0';
    return {topGelir, topGider, topKomisyon, netKar, karMarji, karli, zarari, toplam: veriler.length};
  }, [veriler]);

  if (loading) return <Loading/>;

  return (
    <div>
      {/* İSTATİSTİK KARTLARI */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        <StatCard icon="TrendingUp" label="TOPLAM GELİR" value={fmt(istatistik.topGelir)} color={C.success}/>
        <StatCard icon="TrendingDown" label="TOPLAM GİDER" value={fmt(istatistik.topGider)} color={C.danger}/>
        <StatCard icon="Activity" label="NET KAR" value={fmt(istatistik.netKar)} color={istatistik.netKar >= 0 ? C.success : C.danger}/>
        <StatCard icon="PieChart" label="KAR MARJI" value={`%${istatistik.karMarji}`} color={C.purple}/>
      </div>

      {/* ÖZET BANNER */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:20}}>
        <div style={{background:`${C.success}11`,borderRadius:12,border:`1px solid ${C.success}33`,padding:16,textAlign:'center'}}>
          <div style={{fontSize:28,fontWeight:900,color:C.success}}>{istatistik.karli}</div>
          <div style={{fontSize:11,color:C.textSec,marginTop:4}}>KARLI DOSYA</div>
        </div>
        <div style={{background:`${C.danger}11`,borderRadius:12,border:`1px solid ${C.danger}33`,padding:16,textAlign:'center'}}>
          <div style={{fontSize:28,fontWeight:900,color:C.danger}}>{istatistik.zarari}</div>
          <div style={{fontSize:11,color:C.textSec,marginTop:4}}>ZARARDA DOSYA</div>
        </div>
        <div style={{background:`${C.accent}11`,borderRadius:12,border:`1px solid ${C.accent}33`,padding:16,textAlign:'center'}}>
          <div style={{fontSize:28,fontWeight:900,color:C.accent}}>{istatistik.toplam}</div>
          <div style={{fontSize:11,color:C.textSec,marginTop:4}}>TOPLAM DOSYA</div>
        </div>
      </div>

      {/* MALİYET TABLOSU */}
      <div style={S.card}>
        <SectionTitle icon="PieChart" title="DOSYA BAZLI MALİYET ANALİZİ"
          sub={`${veriler.length} DOSYA ANALİZ EDİLDİ`}
          right={
            <button style={{...S.btn,...S.btnG,fontSize:11}} onClick={yukle}>
              <LIcon name="RefreshCw" size={13} color={C.textSec}/> YENİLE
            </button>
          }/>

        <div style={{overflowX:'auto'}}>
          {veriler.length === 0 ? (
            <EmptyState icon="PieChart" title="MALİYET VERİSİ YOK" desc="ANALİZ EDİLECEK DOSYA BULUNMAMAKTADIR"/>
          ) : (
            <>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,minWidth:900}}>
                <thead>
                  <tr style={{background:C.bgHover}}>
                    {['DOSYA NO','MÜŞTERİ','GELİR','GİDER','KOMİSYON','NET KAR','KAR MARJI %'].map(h =>
                      <th key={h} style={{padding:'12px 14px',textAlign:'left',color: MR.tema==='koyu' ? '#cbd5e1' : C.textMuted,fontWeight:800,fontSize:12,borderBottom:`2px solid ${C.border}`,letterSpacing:0.3}}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {veriler.map((d, i) => {
                    const gelir = parseFloat(d.gelir) || 0;
                    const gider = parseFloat(d.gider) || 0;
                    const komisyon = parseFloat(d.komisyon) || 0;
                    const net = gelir - gider - komisyon;
                    const marj = gelir > 0 ? ((net / gelir) * 100).toFixed(1) : '0.0';
                    const pozitif = net >= 0;
                    return (
                      <tr key={d.dosya_id || i} style={{borderBottom:`1px solid ${C.border}`,background: pozitif ? 'transparent' : `${C.danger}06`}}
                        onMouseEnter={e=>e.currentTarget.style.background= pozitif ? C.bgHover : `${C.danger}11`}
                        onMouseLeave={e=>e.currentTarget.style.background= pozitif ? 'transparent' : `${C.danger}06`}>
                        <td style={{padding:'10px 12px'}}>
                          <span style={{color:C.accent,fontWeight:600,cursor:'pointer'}} onClick={() => d.dosya_id && setPage('dosya-detay-' + d.dosya_id)}>
                            {d.dosya_no || d.dosya_id || '-'}
                          </span>
                        </td>
                        <td style={{padding:'10px 12px',fontWeight:600}}>{d.musteri || d.musteri_adi || '-'}</td>
                        <td style={{padding:'10px 12px',color:C.success,fontWeight:600}}>{fmt(gelir)}</td>
                        <td style={{padding:'10px 12px',color:C.danger,fontWeight:600}}>{fmt(gider)}</td>
                        <td style={{padding:'10px 12px',color:C.warning,fontWeight:600}}>{fmt(komisyon)}</td>
                        <td style={{padding:'10px 12px',fontWeight:700,color: pozitif ? C.success : C.danger,fontSize:12}}>
                          {pozitif ? '+' : ''}{fmt(net)}
                        </td>
                        <td style={{padding:'10px 12px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <div style={{flex:1,height:6,background:C.bgHover,borderRadius:3,overflow:'hidden',maxWidth:80}}>
                              <div style={{width: `${Math.min(Math.abs(parseFloat(marj)), 100)}%`, height:'100%', background: pozitif ? C.success : C.danger, borderRadius:3, transition:'width .3s'}}/>
                            </div>
                            <span style={{fontSize:11,fontWeight:700,color: pozitif ? C.success : C.danger}}>%{marj}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{background:`${C.accent}08`,borderTop:`2px solid ${C.border}`}}>
                    <td style={{padding:'12px',fontWeight:800,fontSize:12}} colSpan={2}>GENEL TOPLAM</td>
                    <td style={{padding:'12px',fontWeight:800,color:C.success,fontSize:12}}>{fmt(istatistik.topGelir)}</td>
                    <td style={{padding:'12px',fontWeight:800,color:C.danger,fontSize:12}}>{fmt(istatistik.topGider)}</td>
                    <td style={{padding:'12px',fontWeight:800,color:C.warning,fontSize:12}}>{fmt(istatistik.topKomisyon)}</td>
                    <td style={{padding:'12px',fontWeight:800,color: istatistik.netKar >= 0 ? C.success : C.danger,fontSize:12}}>{fmt(istatistik.netKar)}</td>
                    <td style={{padding:'12px',fontWeight:800,color:C.purple,fontSize:12}}>%{istatistik.karMarji}</td>
                  </tr>
                </tfoot>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SEKME 6 – FİNANSAL RAPORLAR
   ═══════════════════════════════════════════════════════════ */
const FinansalRaporlar = ({setPage, user}) => {
  const {C, S, LIcon, StatCard, SectionTitle, Badge, Loading, EmptyState, api, fmt} = MR;
  const [loading, setLoading] = useState(true);
  const [rapor, setRapor] = useState(null);
  const [baslangic, setBaslangic] = useState('');
  const [bitis, setBitis] = useState('');

  const yukle = async () => {
    setLoading(true);
    const p = {};
    if (baslangic) p.baslangic = baslangic;
    if (bitis) p.bitis = bitis;
    let data = null;
    const r = await api.finansalRapor(p);
    if (r?.success) data = r.data;
    else {
      const r2 = await api.muhasebeRapor(p);
      if (r2?.success) data = r2.data;
    }
    if (data) {
      /* Backend genel_ozet döner - düzleştir */
      const ozet = data.genel_ozet || {};
      const mapped = {
        toplam_gelir: ozet.toplam_gelir ?? data.toplam_gelir ?? 0,
        toplam_gider: (parseFloat(ozet.toplam_gider ?? data.toplam_gider ?? 0)) + (parseFloat(ozet.toplam_masraf ?? data.toplam_masraf ?? 0)),
        toplam_komisyon: ozet.toplam_komisyon ?? data.toplam_komisyon ?? 0,
        dosya_sayisi: (data.kaynak_analiz || []).reduce((t, k) => t + (parseInt(k.dosya_sayisi) || 0), 0) || data.dosya_sayisi || 0,
        /* aylik_trend → aylik */
        aylik: (data.aylik_trend || data.aylik || []).map(a => ({
          ...a,
          donem: a.ay || a.donem,
          gelir: parseFloat(a.gelir) || 0,
          gider: (parseFloat(a.gider) || 0) + (parseFloat(a.masraf) || 0)
        })),
        /* gider_ozet + gelir_ozet → kategoriler */
        kategoriler: [
          ...(data.gelir_ozet || []).map(g => ({kategori: g.gelir_turu || 'GELİR', tutar: parseFloat(g.toplam) || 0, tip:'gelir'})),
          ...(data.gider_ozet || []).map(g => ({kategori: g.gider_turu || 'GİDER', tutar: parseFloat(g.toplam) || 0, tip:'gider'})),
          ...(data.masraf_ozet || []).map(g => ({kategori: g.masraf_kalemi || 'MASRAF', tutar: parseFloat(g.toplam) || 0, tip:'masraf'})),
          ...(data.komisyon_ozet || []).map(g => ({kategori: g.komisyon_turu || 'KOMİSYON', tutar: parseFloat(g.toplam) || 0, tip:'komisyon'}))
        ].filter(k => k.tutar > 0).sort((a, b) => b.tutar - a.tutar),
        /* aylik_trend detay olarak kullan */
        detay: (data.aylik_trend || data.aylik || data.detay || []).map(a => ({
          donem: a.ay || a.donem,
          gelir: parseFloat(a.gelir) || 0,
          gider: (parseFloat(a.gider) || 0) + (parseFloat(a.masraf) || 0),
          komisyon: 0,
          dosya_sayisi: a.dosya_sayisi || ''
        })),
        kaynak_analiz: data.kaynak_analiz || [],
        kasalar: data.kasalar || []
      };
      setRapor(mapped);
    }
    setLoading(false);
  };

  useEffect(() => { yukle(); }, []);

  const raporGetir = () => { yukle(); };

  /* ÖZET BİLGİLER */
  const toplamGelir = parseFloat(rapor?.toplam_gelir) || 0;
  const toplamGider = parseFloat(rapor?.toplam_gider) || 0;
  const toplamKomisyon = parseFloat(rapor?.toplam_komisyon) || 0;
  const netKar = toplamGelir - toplamGider - toplamKomisyon;
  const dosyaSayisi = rapor?.dosya_sayisi || 0;

  /* AYLIK VERİLER */
  const aylikVeriler = rapor?.aylik || [];
  const maxAylikDeger = useMemo(() => {
    if (!aylikVeriler.length) return 1;
    return Math.max(...aylikVeriler.map(a => Math.max(parseFloat(a.gelir) || 0, parseFloat(a.gider) || 0)), 1);
  }, [aylikVeriler]);

  /* KATEGORİ DAĞILIMI */
  const kategoriler = rapor?.kategoriler || [];
  const kategoriToplam = useMemo(() => {
    return kategoriler.reduce((t, k) => t + (parseFloat(k.tutar) || 0), 0) || 1;
  }, [kategoriler]);

  const kategoriRenkler = [C.accent, C.success, C.warning, C.purple, C.cyan, C.pink, C.gold, C.danger];

  /* DETAY VERİLERİ */
  const detaylar = rapor?.detay || [];

  return (
    <div>
      {/* TARİH FİLTRE */}
      <div style={{...S.card, marginBottom:20}}>
        <div style={{padding:'14px 20px',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <LIcon name="Calendar" size={16} color={C.accent}/>
            <span style={{fontSize:13,fontWeight:700}}>RAPOR DÖNEMİ</span>
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <div>
              <label style={{...S.label,marginBottom:2}}>BAŞLANGIÇ</label>
              <input type="date" style={{...S.input,width:160,fontSize:11}} value={baslangic} onChange={e => setBaslangic(e.target.value)}/>
            </div>
            <div style={{paddingTop:16,color:C.textMuted}}>—</div>
            <div>
              <label style={{...S.label,marginBottom:2}}>BİTİŞ</label>
              <input type="date" style={{...S.input,width:160,fontSize:11}} value={bitis} onChange={e => setBitis(e.target.value)}/>
            </div>
          </div>
          <button style={{...S.btn,...S.btnP,fontSize:11,marginLeft:8}} onClick={raporGetir}>
            <LIcon name="Search" size={14} color="#fff"/> RAPOR GETİR
          </button>
          <button style={{...S.btn,...S.btnG,fontSize:11}} onClick={() => {setBaslangic('');setBitis('');setRapor(null);setTimeout(yukle,100);}}>
            <LIcon name="RotateCcw" size={13} color={C.textSec}/> TEMİZLE
          </button>
        </div>
      </div>

      {loading ? <Loading/> : !rapor ? (
        <EmptyState icon="BarChart3" title="RAPOR VERİSİ YOK" desc="RAPOR VERİLERİ YÜKLENEMEDİ"/>
      ) : (
        <>
          {/* ÖZET KARTLAR */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
            <StatCard icon="TrendingUp" label="TOPLAM GELİR" value={fmt(toplamGelir)} color={C.success}/>
            <StatCard icon="TrendingDown" label="TOPLAM GİDER" value={fmt(toplamGider)} color={C.danger}/>
            <StatCard icon="Activity" label="NET KAR / ZARAR" value={fmt(netKar)} color={netKar >= 0 ? C.success : C.danger}/>
            <StatCard icon="FileText" label="DOSYA SAYISI" value={dosyaSayisi} color={C.purple}/>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:20}}>
            {/* AYLIK TREND GRAFİĞİ */}
            <div style={S.card}>
              <SectionTitle icon="BarChart3" title="AYLIK TREND" sub="GELİR / GİDER KARŞILAŞTIRMASI"/>
              <div style={S.cardBody}>
                {aylikVeriler.length === 0 ? (
                  <EmptyState icon="BarChart3" title="AYLIK VERİ YOK" desc="SEÇİLEN DÖNEMDE AYLIK VERİ BULUNMAMAKTADIR"/>
                ) : (
                  <div>
                    {/* LEJANT */}
                    <div style={{display:'flex',gap:20,marginBottom:20,justifyContent:'center'}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{width:12,height:12,borderRadius:3,background:C.success}}/>
                        <span style={{fontSize:11,color:C.textSec,fontWeight:600}}>GELİR</span>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{width:12,height:12,borderRadius:3,background:C.danger}}/>
                        <span style={{fontSize:11,color:C.textSec,fontWeight:600}}>GİDER</span>
                      </div>
                    </div>

                    {/* BAR GRAFİĞİ */}
                    <div style={{display:'flex',alignItems:'flex-end',gap:8,height:200,padding:'0 10px'}}>
                      {aylikVeriler.map((ay, i) => {
                        const gelir = parseFloat(ay.gelir) || 0;
                        const gider = parseFloat(ay.gider) || 0;
                        const gelirH = Math.max((gelir / maxAylikDeger) * 160, 2);
                        const giderH = Math.max((gider / maxAylikDeger) * 160, 2);
                        return (
                          <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                            <div style={{display:'flex',alignItems:'flex-end',gap:3,height:170}}>
                              <div title={`GELİR: ${fmt(gelir)}`} style={{
                                width:16, height:gelirH, background:`linear-gradient(to top, ${C.success}, ${C.success}cc)`,
                                borderRadius:'4px 4px 0 0', cursor:'pointer', transition:'all .3s', minHeight:2
                              }}
                              onMouseEnter={e => e.currentTarget.style.opacity='0.8'}
                              onMouseLeave={e => e.currentTarget.style.opacity='1'}/>
                              <div title={`GİDER: ${fmt(gider)}`} style={{
                                width:16, height:giderH, background:`linear-gradient(to top, ${C.danger}, ${C.danger}cc)`,
                                borderRadius:'4px 4px 0 0', cursor:'pointer', transition:'all .3s', minHeight:2
                              }}
                              onMouseEnter={e => e.currentTarget.style.opacity='0.8'}
                              onMouseLeave={e => e.currentTarget.style.opacity='1'}/>
                            </div>
                            <div style={{fontSize:9,color:C.textMuted,fontWeight:600,marginTop:4,whiteSpace:'nowrap'}}>
                              {ay.ay || ay.donem || `AY ${i+1}`}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* SKALA */}
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:12,paddingTop:8,borderTop:`1px solid ${C.border}`}}>
                      <span style={{fontSize:9,color:C.textMuted}}>₺0</span>
                      <span style={{fontSize:9,color:C.textMuted}}>{fmt(maxAylikDeger / 2)}</span>
                      <span style={{fontSize:9,color:C.textMuted}}>{fmt(maxAylikDeger)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* KATEGORİ DAĞILIMI */}
            <div style={S.card}>
              <SectionTitle icon="PieChart" title="KATEGORİ DAĞILIMI" sub="GELİR / GİDER KATEGORİLERİ"/>
              <div style={S.cardBody}>
                {kategoriler.length === 0 ? (
                  <EmptyState icon="PieChart" title="KATEGORİ VERİSİ YOK" desc="KATEGORİ BAZLI VERİ BULUNMAMAKTADIR"/>
                ) : (
                  <div>
                    {/* HALKA GRAFİĞİ */}
                    <div style={{display:'flex',justifyContent:'center',marginBottom:20}}>
                      <div style={{width:120,height:120,borderRadius:'50%',background:`conic-gradient(${
                        kategoriler.map((k, i) => {
                          const yuzde = ((parseFloat(k.tutar) || 0) / kategoriToplam) * 100;
                          const oncekiToplam = kategoriler.slice(0, i).reduce((t, kk) => t + ((parseFloat(kk.tutar) || 0) / kategoriToplam) * 100, 0);
                          return `${kategoriRenkler[i % kategoriRenkler.length]} ${oncekiToplam}% ${oncekiToplam + yuzde}%`;
                        }).join(', ')
                      })`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <div style={{width:70,height:70,borderRadius:'50%',background:C.bgCard,display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <span style={{fontSize:11,fontWeight:700,color:C.textSec}}>TOPLAM</span>
                        </div>
                      </div>
                    </div>

                    {/* KATEGORİ LİSTESİ */}
                    {kategoriler.map((k, i) => {
                      const tutar = parseFloat(k.tutar) || 0;
                      const yuzde = ((tutar / kategoriToplam) * 100).toFixed(1);
                      const renk = kategoriRenkler[i % kategoriRenkler.length];
                      return (
                        <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:`1px solid ${C.border}`}}>
                          <div style={{width:10,height:10,borderRadius:3,background:renk,flexShrink:0}}/>
                          <div style={{flex:1}}>
                            <div style={{fontSize:11,fontWeight:600}}>{(k.kategori || k.tur || 'DİĞER').toUpperCase()}</div>
                          </div>
                          <div style={{textAlign:'right'}}>
                            <div style={{fontSize:12,fontWeight:700,color:renk}}>{fmt(tutar)}</div>
                            <div style={{fontSize:9,color:C.textMuted}}>%{yuzde}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DETAYLI RAPOR TABLOSU */}
          {detaylar.length > 0 && (
            <div style={{...S.card, marginTop:20}}>
              <SectionTitle icon="FileText" title="DETAYLI RAPOR" sub="DÖNEM BAZLI GELİR-GİDER DETAYI"/>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                  <thead>
                    <tr style={{background:C.bgHover}}>
                      {['DÖNEM','GELİR','GİDER','KOMİSYON','NET','DOSYA SAYISI'].map(h =>
                        <th key={h} style={{padding:'12px 14px',textAlign:'left',color: MR.tema==='koyu' ? '#cbd5e1' : C.textMuted,fontWeight:800,fontSize:12,borderBottom:`2px solid ${C.border}`,letterSpacing:0.3}}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {detaylar.map((d, i) => {
                      const gelir = parseFloat(d.gelir) || 0;
                      const gider = parseFloat(d.gider) || 0;
                      const komisyon = parseFloat(d.komisyon) || 0;
                      const net = gelir - gider - komisyon;
                      return (
                        <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}
                          onMouseEnter={e=>e.currentTarget.style.background=C.bgHover}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <td style={{padding:'10px 12px',fontWeight:600}}>{d.donem || d.ay || '-'}</td>
                          <td style={{padding:'10px 12px',color:C.success,fontWeight:600}}>{fmt(gelir)}</td>
                          <td style={{padding:'10px 12px',color:C.danger,fontWeight:600}}>{fmt(gider)}</td>
                          <td style={{padding:'10px 12px',color:C.warning,fontWeight:600}}>{fmt(komisyon)}</td>
                          <td style={{padding:'10px 12px',fontWeight:700,color: net >= 0 ? C.success : C.danger}}>{fmt(net)}</td>
                          <td style={{padding:'10px 12px',color:C.textSec}}>{d.dosya_sayisi || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{background:`${C.accent}08`,borderTop:`2px solid ${C.border}`}}>
                      <td style={{padding:'12px',fontWeight:800,fontSize:12}}>TOPLAM</td>
                      <td style={{padding:'12px',fontWeight:800,color:C.success,fontSize:12}}>{fmt(toplamGelir)}</td>
                      <td style={{padding:'12px',fontWeight:800,color:C.danger,fontSize:12}}>{fmt(toplamGider)}</td>
                      <td style={{padding:'12px',fontWeight:800,color:C.warning,fontSize:12}}>{fmt(toplamKomisyon)}</td>
                      <td style={{padding:'12px',fontWeight:800,color:netKar >= 0 ? C.success : C.danger,fontSize:12}}>{fmt(netKar)}</td>
                      <td style={{padding:'12px',fontWeight:600,color:C.textSec}}>{dosyaSayisi || '-'}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* NET KAR/ZARAR BANNER */}
          <div style={{marginTop:20,background: netKar >= 0 ? `${C.success}11` : `${C.danger}11`,borderRadius:12,border:`1px solid ${netKar >= 0 ? C.success + '33' : C.danger + '33'}`,padding:24,textAlign:'center'}}>
            <div style={{fontSize:12,color:C.textSec,fontWeight:600,marginBottom:8,letterSpacing:1}}>
              {baslangic || bitis ? 'SEÇİLEN DÖNEM' : 'GENEL'} NET SONUÇ
            </div>
            <div style={{fontSize:36,fontWeight:900,color: netKar >= 0 ? C.success : C.danger,letterSpacing:-1}}>
              {fmt(netKar)}
            </div>
            <div style={{marginTop:8}}>
              <Badge text={netKar >= 0 ? 'KAR' : 'ZARAR'} color={netKar >= 0 ? C.success : C.danger}/>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
