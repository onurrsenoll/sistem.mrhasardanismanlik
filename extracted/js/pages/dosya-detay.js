const MR = window.MR || (window.MR = {});
const {useState, useEffect} = React;

const ASAMALAR = MR.ASAMALAR || [];
const KAYNAKLAR = ['OFİS CRM','YÖNLENDİREN','SAHA PERSONEL'];

const asamaRenk = (a) => {
  if (!a) return '#6b7280';
  const s = a.toUpperCase();
  if (s.includes('KAPANDI') || s.includes('TAHSİL KABİLİYETİ YOK')) return '#6b7280';
  if (s.includes('ÖDEME ALINDI')) return '#22c55e';
  if (s.includes('ÖDEME BEKLEN')) return '#84cc16';
  if (s.includes('AÇIK') || s.includes('EVRAK BEKLEN')) return '#3b82f6';
  if (s.includes('TAHKİM') || s.includes('HAKEM')) return '#6366f1';
  if (s.includes('DAVA') || s.includes('HUKUK')) return '#ef4444';
  if (s.includes('BİLİRKİŞİ') || s.includes('HESAP') || s.includes('AKTÜER')) return '#d97706';
  if (s.includes('KARAR') || s.includes('TEMYİZ') || s.includes('İSTİNAF')) return '#ec4899';
  if (s.includes('ADLİ TIP') || s.includes('MALULİYET') || s.includes('KUSUR') || s.includes('SAKATLIK')) return '#a855f7';
  if (s.includes('ARABULUCULUK')) return '#14b8a6';
  if (s.includes('BAŞVURU') || s.includes('SİGORTA')) return '#06b6d4';
  if (s.includes('İCRA') || s.includes('TAKİP') || s.includes('AZİLNAME')) return '#f97316';
  if (s.includes('İTİRAZ')) return '#e11d48';
  if (s.includes('KEŞİF') || s.includes('SEVK') || s.includes('ÖN İNCELEME')) return '#8b5cf6';
  return '#6b7280';
};

const EvrakPreviewIframe = ({evrakId}) => {
  const [blobUrl, setBlobUrl] = React.useState(null);
  const [mimeType, setMimeType] = React.useState('');
  const [hata, setHata] = React.useState('');
  const urlRef = React.useRef(null);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    let iptal = false;
    setBlobUrl(null);
    setMimeType('');
    setHata('');

    const yukle = async () => {
      try {
        const token = MR.api.token;
        if (!token) { if (!iptal) setHata('OTURUM BULUNAMADI. LÜTFEN YENİDEN GİRİŞ YAPIN.'); return; }

        const apiBase = MR.api.base || '/api/v1';
        const fetchUrl = apiBase + '/evrak/download.php?id=' + evrakId + '&mode=inline';

        const r = await fetch(fetchUrl, {
          headers: { 'Authorization': 'Bearer ' + token },
          cache: 'no-cache'
        });

        if (iptal) return;

        if (!r.ok) {
          let hataMesaj = 'SUNUCU HATASI: ' + r.status;
          try { const j = await r.json(); hataMesaj = j.error || hataMesaj; } catch(e) {}
          setHata(hataMesaj);
          return;
        }

        const ct = r.headers.get('content-type') || 'application/pdf';
        const ab = await r.arrayBuffer();
        if (iptal) return;

        if (ab.byteLength === 0) { setHata('EVRAK DOSYASI BOŞ'); return; }

        const blob = new Blob([ab], { type: ct });
        const objectUrl = URL.createObjectURL(blob);

        /* Önceki URL varsa temizle */
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = objectUrl;
        setMimeType(ct.toLowerCase());
        setBlobUrl(objectUrl);
      } catch(e) {
        console.error('EVRAK ÖNIZLEME HATASI:', e);
        if (!iptal) setHata('EVRAK YÜKLENİRKEN HATA: ' + (e.message || 'Bağlantı hatası'));
      }
    };
    yukle();

    return () => {
      iptal = true;
      if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null; }
    };
  }, [evrakId]);

  if (hata) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#ef4444',fontSize:13,flexDirection:'column',gap:8,padding:20,textAlign:'center'}}>
      <MR.LIcon name="AlertTriangle" size={28} color="#ef4444"/>
      <div style={{fontWeight:700}}>EVRAK YÜKLENEMEDİ</div>
      <div style={{fontSize:10,color:'#6b7280',maxWidth:300}}>{hata}</div>
    </div>
  );

  if (!blobUrl) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#6b7280',fontSize:12,flexDirection:'column',gap:8}}>
      <div style={{width:24,height:24,border:'3px solid transparent',borderTopColor:'#2563eb',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
      EVRAK YÜKLENİYOR...
    </div>
  );

  /* Resim dosyaları için <img> kullan */
  if (mimeType.startsWith('image/')) {
    return <div style={{width:'100%',height:'100%',overflow:'auto',display:'flex',alignItems:'center',justifyContent:'center',background:'#f3f4f6',padding:10}}>
      <img src={blobUrl} alt="EVRAK" style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain',borderRadius:4,boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}/>
    </div>;
  }

  /* PDF ve diğer dosyalar için <object> + <embed> + <iframe> fallback zinciri */
  return <div ref={containerRef} style={{width:'100%',height:'100%',background:'#f3f4f6'}}>
    <object data={blobUrl} type={mimeType || 'application/pdf'} style={{width:'100%',height:'100%',border:'none'}}>
      <embed src={blobUrl} type={mimeType || 'application/pdf'} style={{width:'100%',height:'100%',border:'none'}}/>
    </object>
  </div>;
};

MR.DosyaDetayPage = ({dosyaId, setPage, user}) => {
  const {C, S, LIcon, Badge, SectionTitle, EmptyState, Loading, Modal, FormGroup, Confirm, api, fmt, MASRAF_K, EVRAK_T, ILLER, ILCELER, SIGORTA, today} = MR;
  const [dosya, setDosya] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('bilgi');
  const [masrafM, setMasrafM] = useState(false);
  const [evrakM, setEvrakM] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editM, setEditM] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [dosyaSilConfirm, setDosyaSilConfirm] = useState(false);
  const [ortaklar, setOrtaklar] = useState([]);
  const [previewEvrak, setPreviewEvrak] = useState(null);

  // DOSYA KAPAT STATE
  const [kapatModal, setKapatModal] = useState(false);
  const [kapatForm, setKapatForm] = useState({
    tazminat: '', vekalet_ucreti: '', faiz: '', stopaj: '', kdv_oran: '20',
    noter_masrafi: '', cezaevi_harci: '', diger_masraf: '',
    dosya_basi_odenen: '0', kasa_id: 1, pay_orani: '50'
  });
  const [kapatLoading, setKapatLoading] = useState(false);
  const [kasalar, setKasalar] = useState([]);

  const load = async () => {
    setLoading(true);
    const r = await api.dosyaGet(dosyaId);
    if (r?.success) setDosya(r.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [dosyaId]);

  const [personeller, setPersoneller] = useState([]);
  const [paydaslar, setPaydaslar] = useState([]);

  // İŞ ORTAKLARI (AVUKATLAR) LİSTESİNİ YÜKLE
  useEffect(() => {
    api.ortakList({durum:'aktif', limit:200}).then(r => {
      if (r?.success) setOrtaklar(r.data?.items || r.data || []);
    });
    api.personelList({durum:'aktif'}).then(r => {
      if (r?.success) setPersoneller(r.data?.items || r.data || []);
    });
    api.paydasList({durum:'aktif', limit:200}).then(r => {
      if (r?.success) setPaydaslar(r.data?.items || r.data || []);
    });
  }, []);

  const [smsBildirim, setSmsBildirim] = useState(null);

  const asamaDegistir = async (yeniAsama) => {
    const r = await api.dosyaUpdate({id: dosya.id, asama: yeniAsama});
    if (r?.success) {
      load();
      // SMS GÖNDERİM SONUCUNU GÖSTER
      if (r.data?.sms_gonderildi) {
        setSmsBildirim({type:'success', text:'DURUM DEĞİŞTİRİLDİ VE MAĞDURA SMS GÖNDERİLDİ'});
      } else if (r.data?.sms_sonuc && !r.data.sms_sonuc.basarili) {
        setSmsBildirim({type:'warning', text:'DURUM DEĞİŞTİRİLDİ - SMS: ' + (r.data.sms_sonuc.mesaj || 'GÖNDERİLEMEDİ')});
      } else {
        setSmsBildirim({type:'info', text:'DURUM DEĞİŞTİRİLDİ'});
      }
      setTimeout(() => setSmsBildirim(null), 5000);
    }
  };

  const masrafSil = async (id) => {
    const r = await api.masrafDelete(id);
    if (r?.success) { load(); setDeleteConfirm(null); }
  };

  const evrakSil = async (id) => {
    const r = await api.evrakDelete(id);
    if (r?.success) { load(); setDeleteConfirm(null); }
  };

  const getPlaka = () => dosya?.plaka || dosya?.araclar?.find(a=>a.taraf==='magdur')?.plaka || '';

  const openEditModal = () => {
    const magdur = dosya.magdur || {};
    setEditForm({
      dosya_turu: dosya.dosya_turu || 'ADK',
      sigorta_sirket: dosya.sigorta_sirket || '',
      hasar_no: dosya.hasar_no || '',
      dosya_kaynagi: dosya.dosya_kaynagi || '',
      kaza_tarihi: dosya.kaza_tarihi || '',
      kaza_il: dosya.kaza_il || '',
      haklilik: dosya.haklilik || 100,
      komisyon_orani: dosya.komisyon_orani || 0,
      hak_mahrumiyet: dosya.hak_mahrumiyet ? 1 : 0,
      plaka: getPlaka(),
      notlar: dosya.notlar || '',
      ortak_id: dosya.ortak_id ? String(dosya.ortak_id) : '',
      magdur_ad_soyad: magdur.ad_soyad || '',
      magdur_tc_kimlik: magdur.tc_kimlik || '',
      magdur_telefon: magdur.telefon || '',
      magdur_telefon2: magdur.telefon2 || '',
      magdur_il: magdur.il || '',
      magdur_ilce: magdur.ilce || '',
      magdur_dogum_tarihi: magdur.dogum_tarihi || '',
      magdur_meslek: magdur.meslek || '',
      magdur_iban: magdur.iban || '',
      sorumlu_id: dosya.sorumlu_id ? String(dosya.sorumlu_id) : '',
      paydas_id: dosya.paydas_id ? String(dosya.paydas_id) : ''
    });
    setEditError('');
    setEditM(true);
  };

  const dosyaGuncelle = async () => {
    setEditLoading(true);
    setEditError('');
    const r = await api.dosyaUpdate({
      id: dosya.id,
      dosya_turu: editForm.dosya_turu,
      sigorta_sirket: editForm.sigorta_sirket,
      hasar_no: editForm.hasar_no,
      dosya_kaynagi: editForm.dosya_kaynagi,
      kaza_tarihi: editForm.kaza_tarihi || null,
      kaza_il: editForm.kaza_il,
      haklilik: parseInt(editForm.haklilik) || 100,
      komisyon_orani: parseFloat(editForm.komisyon_orani) || 0,
      hak_mahrumiyet: parseInt(editForm.hak_mahrumiyet) || 0,
      plaka: editForm.plaka,
      notlar: editForm.notlar,
      ortak_id: editForm.ortak_id ? parseInt(editForm.ortak_id) : null,
      magdur_ad_soyad: editForm.magdur_ad_soyad,
      magdur_tc_kimlik: editForm.magdur_tc_kimlik,
      magdur_telefon: editForm.magdur_telefon,
      magdur_telefon2: editForm.magdur_telefon2,
      magdur_il: editForm.magdur_il,
      magdur_ilce: editForm.magdur_ilce,
      magdur_dogum_tarihi: editForm.magdur_dogum_tarihi || null,
      magdur_meslek: editForm.magdur_meslek,
      magdur_iban: editForm.magdur_iban,
      sorumlu_id: editForm.sorumlu_id ? parseInt(editForm.sorumlu_id) : null,
      paydas_id: editForm.paydas_id ? parseInt(editForm.paydas_id) : null
    });
    if (r?.success) { load(); setEditM(false); }
    else setEditError(r?.error || 'GÜNCELLEME HATASI');
    setEditLoading(false);
  };

  const dosyaSil = async () => {
    const r = await api.dosyaDelete(dosya.id);
    if (r?.success) { setDosyaSilConfirm(false); setPage('dosya-liste'); }
  };

  if (loading) return <Loading/>;
  if (!dosya) return <EmptyState icon="AlertCircle" title="DOSYA BULUNAMADI" desc=""/>;

  const magdur = dosya.magdur || {};
  const arac = dosya.araclar?.find(a=>a.taraf==='magdur') || {};
  const karsiArac = dosya.araclar?.find(a=>a.taraf==='karsi') || {};
  const ac = asamaRenk(dosya.asama);
  const u = (k, v) => setEditForm(p => ({...p, [k]: v}));

  // Bilgi satır bileşeni
  const InfoRow = ({label, value, mono, bold, color}) => (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:`1px solid ${C.border}22`}}>
      <span style={{fontSize:10,color:C.textMuted,fontWeight:500,minWidth:90}}>{label}</span>
      <span style={{fontSize:11,fontWeight:bold?700:500,color:color||C.text,fontFamily:mono?'monospace':'inherit',textAlign:'right',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{value || '-'}</span>
    </div>
  );

  const tabs = [
    {id:'bilgi', l:'DOSYA BİLGİLERİ', ic:'FileText'},
    {id:'masraf', l:`MASRAFLAR (${dosya.masraflar?.length || 0})`, ic:'Receipt'},
    {id:'evrak', l:`EVRAKLAR (${dosya.evraklar?.length || 0})`, ic:'Folder'},
    {id:'hesap', l:'DOSYA HESABI', ic:'Calculator'}
  ];

  return (
    <div className="fade-in">
      {/* SMS BİLDİRİM TOAST */}
      {smsBildirim && (
        <div style={{position:'fixed', top:80, right:20, zIndex:9999, padding:'12px 20px', borderRadius:10,
          background: smsBildirim.type==='success' ? C.success : smsBildirim.type==='warning' ? C.warning : C.accent,
          color:'#fff', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:8,
          boxShadow:'0 4px 20px rgba(0,0,0,0.3)', animation:'fadeIn 0.3s ease',maxWidth:420}}>
          <LIcon name={smsBildirim.type==='success' ? 'CheckCircle' : smsBildirim.type==='warning' ? 'AlertTriangle' : 'MessageSquare'} size={16} color="#fff"/>
          {smsBildirim.text}
          <span style={{marginLeft:8, cursor:'pointer', opacity:0.7}} onClick={() => setSmsBildirim(null)}>✕</span>
        </div>
      )}

      {/* ÜST BAR */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <button style={{...S.btn,...S.btnG,fontSize:10,padding:'6px 14px'}} onClick={() => setPage('dosya-liste')}>
          <LIcon name="ArrowLeft" size={13}/> LİSTEYE DÖN
        </button>
      </div>

      {/* DOSYA HEADER */}
      <div style={{...S.card,marginBottom:12}}>
        <div style={{padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:42,height:42,borderRadius:10,background:`${C.accent}18`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <LIcon name="FolderOpen" size={20} color={C.accent}/>
            </div>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:18,fontWeight:800}}>{dosya.dosya_no}</span>
                <span style={{padding:'2px 8px',borderRadius:4,fontSize:9,fontWeight:700,
                  background:dosya.dosya_turu==='ADK'?`${C.accent}18`:`${C.purple}18`,
                  color:dosya.dosya_turu==='ADK'?C.accent:C.purple}}>
                  {dosya.dosya_turu}
                </span>
                <span style={{padding:'2px 8px',borderRadius:4,fontSize:8,fontWeight:600,background:ac+'18',color:ac,border:`1px solid ${ac}33`}}>
                  {dosya.asama}
                </span>
              </div>
              <div style={{fontSize:11,color:C.textSec,marginTop:2}}>
                {magdur.ad_soyad || '-'} {dosya.sigorta_sirket ? `• ${dosya.sigorta_sirket}` : ''} {dosya.hasar_no ? `• ${dosya.hasar_no}` : ''}
              </div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <select value={dosya.asama} onChange={e => asamaDegistir(e.target.value)}
              style={{...S.select,minWidth:180,maxWidth:500,fontSize:10,padding:'6px 10px',background:`${ac}11`,border:`1px solid ${ac}33`,color:ac,fontWeight:600}}>
              {ASAMALAR.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button style={{...S.btn,...S.btnP,fontSize:10,padding:'6px 12px'}} onClick={openEditModal}>
              <LIcon name="Edit2" size={12} color="#fff"/> DÜZENLE
            </button>
            <button style={{...S.btn,fontSize:10,padding:'6px 12px',background:`${C.danger}18`,color:C.danger,border:`1px solid ${C.danger}33`,borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}
              onClick={() => setDosyaSilConfirm(true)}>
              <LIcon name="Trash2" size={12} color={C.danger}/> SİL
            </button>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{display:'flex',gap:4,marginBottom:12}}>
        {tabs.map(t => (
          <div key={t.id} onClick={() => setTab(t.id)}
            style={{display:'flex',alignItems:'center',gap:5,padding:'8px 16px',borderRadius:8,fontSize:11,fontWeight:tab===t.id?700:400,cursor:'pointer',
              background:tab===t.id?`${C.accent}18`:'transparent',color:tab===t.id?C.accent:C.textSec,border:`1px solid ${tab===t.id?C.accent+'33':C.border}`,transition:'all .2s'}}>
            <LIcon name={t.ic} size={13} color={tab===t.id?C.accent:C.textSec}/>{t.l}
          </div>
        ))}
      </div>

      {/* DOSYA BİLGİLERİ TAB */}
      {tab === 'bilgi' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {/* SOL: DOSYA BİLGİLERİ */}
          <div style={S.card}>
            <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8,background:`${C.accent}06`}}>
              <LIcon name="FileText" size={14} color={C.accent}/>
              <span style={{fontSize:12,fontWeight:700}}>DOSYA BİLGİLERİ</span>
            </div>
            <div style={{padding:'10px 14px'}}>
              <InfoRow label="DOSYA NO" value={dosya.dosya_no} bold mono/>
              <InfoRow label="DOSYA TÜRÜ" value={dosya.dosya_turu} bold/>
              <InfoRow label="SİGORTA ŞİRKETİ" value={dosya.sigorta_sirket}/>
              <InfoRow label="HASAR DOSYA NO" value={dosya.hasar_no} mono/>
              <InfoRow label="DOSYA KAYNAĞI" value={dosya.dosya_kaynagi}/>
              <InfoRow label="AVUKAT" value={dosya.avukat_adi} bold color={C.purple}/>
              {dosya.avukat_firma && <InfoRow label="AVUKAT FİRMA" value={dosya.avukat_firma}/>}
              {dosya.avukat_baro && <InfoRow label="BARO" value={dosya.avukat_baro}/>}
              {dosya.avukat_odeme_orani != null && dosya.avukat_odeme_orani > 0 && <InfoRow label="AVUKAT ÖDEME ORANI" value={`%${dosya.avukat_odeme_orani}`} bold color={C.purple}/>}
              <InfoRow label="SORUMLU" value={dosya.sorumlu_adi}/>
              <InfoRow label="AÇILIŞ TARİHİ" value={dosya.acilis_tarihi}/>
              <InfoRow label="KAZA TARİHİ" value={dosya.kaza_tarihi}/>
              <InfoRow label="KAZA İLİ" value={dosya.kaza_il}/>
              <InfoRow label="HAKLILIK" value={`%${dosya.haklilik || 0}`} bold color={C.success}/>
              <InfoRow label="KOMİSYON" value={`%${dosya.komisyon_orani || 0}`}/>
              <InfoRow label="HAK MAHRUMİYET TALEP" value={dosya.hak_mahrumiyet ? 'VAR' : 'YOK'} bold color={dosya.hak_mahrumiyet ? C.success : C.textMuted}/>
              {dosya.notlar && <div style={{marginTop:8,padding:8,background:C.bgInput,borderRadius:6,fontSize:10,color:C.textSec}}>{dosya.notlar}</div>}
            </div>
          </div>

          {/* SAĞ: MAĞDUR + ARAÇ + FİNANSAL */}
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {/* MAĞDUR BİLGİLERİ */}
            <div style={S.card}>
              <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8,background:`${C.cyan}06`}}>
                <LIcon name="User" size={14} color={C.cyan}/>
                <span style={{fontSize:12,fontWeight:700}}>MAĞDUR BİLGİLERİ</span>
              </div>
              <div style={{padding:'10px 14px'}}>
                <InfoRow label="AD SOYAD" value={magdur.ad_soyad} bold/>
                <InfoRow label="T.C. KİMLİK" value={magdur.tc_kimlik} mono/>
                <InfoRow label="TELEFON" value={magdur.telefon} mono/>
                {magdur.telefon2 && <InfoRow label="TELEFON 2" value={magdur.telefon2} mono/>}
                <InfoRow label="İL" value={magdur.il}/>
                {magdur.ilce && <InfoRow label="İLÇE" value={magdur.ilce}/>}
                {magdur.meslek && <InfoRow label="MESLEK" value={magdur.meslek}/>}
                {magdur.dogum_tarihi && <InfoRow label="DOĞUM TARİHİ" value={magdur.dogum_tarihi}/>}
              </div>
            </div>

            {/* ARAÇ BİLGİLERİ (ADK) */}
            {dosya.dosya_turu === 'ADK' && (
              <div style={S.card}>
                <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8,background:`${C.warning}06`}}>
                  <LIcon name="Truck" size={14} color={C.warning}/>
                  <span style={{fontSize:12,fontWeight:700}}>ARAÇ BİLGİLERİ</span>
                </div>
                <div style={{padding:'10px 14px'}}>
                  <InfoRow label="PLAKA" value={getPlaka()} bold mono/>
                  <InfoRow label="MARKA" value={arac.marka}/>
                  <InfoRow label="MODEL" value={arac.model}/>
                  {arac.model_yili && <InfoRow label="MODEL YILI" value={arac.model_yili}/>}
                  {karsiArac.plaka && (
                    <>
                      <div style={{margin:'8px 0 4px',fontSize:9,color:C.textMuted,fontWeight:600,borderTop:`1px solid ${C.border}`,paddingTop:6}}>KARŞI ARAÇ</div>
                      <InfoRow label="PLAKA" value={karsiArac.plaka} mono/>
                      {karsiArac.marka && <InfoRow label="MARKA" value={karsiArac.marka}/>}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* FİNANSAL ÖZET */}
            <div style={S.card}>
              <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8,background:`${C.danger}06`}}>
                <LIcon name="DollarSign" size={14} color={C.danger}/>
                <span style={{fontSize:12,fontWeight:700}}>FİNANSAL ÖZET</span>
              </div>
              <div style={{padding:'10px 14px'}}>
                <InfoRow label="TOPLAM MASRAF" value={fmt(dosya.toplam_masraf || 0)} bold color={C.danger}/>
                <InfoRow label="MASRAF SAYISI" value={dosya.masraflar?.length || 0}/>
                <InfoRow label="EVRAK SAYISI" value={dosya.evraklar?.length || 0}/>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MASRAFLAR TAB */}
      {tab === 'masraf' && (
        <div style={S.card}>
          <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:`${C.accent}06`}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <LIcon name="Receipt" size={14} color={C.accent}/>
              <span style={{fontSize:12,fontWeight:700}}>MASRAFLAR</span>
              <span style={{fontSize:10,color:C.textMuted}}>TOPLAM: {fmt(dosya.toplam_masraf || 0)}</span>
            </div>
            <button style={{...S.btn,...S.btnP,fontSize:10,padding:'5px 12px'}} onClick={() => setMasrafM(true)}>
              <LIcon name="Plus" size={12} color="#fff"/> YENİ MASRAF
            </button>
          </div>
          <div>
            {dosya.masraflar?.length > 0 ? (
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead>
                  <tr style={{background:C.bgHover}}>
                    {['#','MASRAF KALEMİ','TUTAR','KASA','TARİH','KULLANICI','İŞLEM'].map(h =>
                      <th key={h} style={{padding:'8px 10px',textAlign:'left',color:C.textMuted,fontWeight:600,fontSize:9,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {dosya.masraflar.map((m, i) => (
                    <tr key={i} style={{borderBottom:`1px solid ${C.border}22`}}>
                      <td style={{padding:'8px 10px',color:C.textMuted,fontSize:10}}>{i+1}</td>
                      <td style={{padding:'8px 10px',fontWeight:600,fontSize:11}}>{m.masraf_kalemi}</td>
                      <td style={{padding:'8px 10px',fontWeight:700,color:C.danger,fontSize:11}}>{fmt(m.tutar)}</td>
                      <td style={{padding:'8px 10px'}}><Badge text={m.kasa_adi || '-'} color={C.cyan}/></td>
                      <td style={{padding:'8px 10px',color:C.textMuted,fontSize:10}}>{m.islem_tarihi}</td>
                      <td style={{padding:'8px 10px',color:C.textSec,fontSize:10}}>{m.kullanici_adi || '-'}</td>
                      <td style={{padding:'8px 10px'}}>
                        <span style={{cursor:'pointer',display:'flex',padding:2,borderRadius:4,background:`${C.danger}11`,width:'fit-content'}}
                          onClick={() => setDeleteConfirm({type:'masraf', id:m.id, text:m.masraf_kalemi})}>
                          <LIcon name="Trash2" size={12} color={C.danger}/>
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr style={{background:`${C.accent}06`}}>
                    <td colSpan={2} style={{padding:'10px 12px',fontWeight:800,textAlign:'right',fontSize:11}}>TOPLAM:</td>
                    <td style={{padding:'10px 12px',fontWeight:800,fontSize:13,color:C.danger}}>{fmt(dosya.toplam_masraf || 0)}</td>
                    <td colSpan={4}/>
                  </tr>
                </tbody>
              </table>
            ) : <EmptyState icon="Receipt" title="MASRAF YOK" desc="YENİ MASRAF EKLE BUTONUYLA MASRAF GİREBİLİRSİNİZ"/>}
          </div>
        </div>
      )}

      {/* EVRAKLAR TAB */}
      {tab === 'evrak' && (
        <div style={S.card}>
          <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:`${C.accent}06`}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <LIcon name="Folder" size={14} color={C.accent}/>
              <span style={{fontSize:12,fontWeight:700}}>EVRAKLAR</span>
              <span style={{fontSize:10,color:C.textMuted}}>
                ({dosya.evraklar?.length || 0} / {(MR.EVRAK_T||[]).length} YÜKLÜ)
              </span>
            </div>
            {dosya.evraklar?.length > 0 && (
              <button style={{...S.btn,...S.btnP,fontSize:10,padding:'5px 12px'}}
                onClick={async () => {
                  const token = MR.api.token;
                  const apiBase = MR.api.base || '/api/v1';
                  for (let i = 0; i < dosya.evraklar.length; i++) {
                    const e = dosya.evraklar[i];
                    try {
                      const r = await fetch(apiBase + '/evrak/download.php?id=' + e.id, {
                        headers: token ? {'Authorization': 'Bearer ' + token} : {}
                      });
                      if (!r.ok) {
                        let hataMesaj = 'HATA ' + r.status;
                        try { const j = await r.json(); hataMesaj = j.error || hataMesaj; } catch(ex){}
                        console.warn('EVRAK İNDİRİLEMEDİ (' + e.dosya_adi + '):', hataMesaj);
                        continue;
                      }
                      const blob = await r.blob();
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = e.dosya_adi || ('evrak_' + e.id + '.pdf');
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
                      /* Tarayıcı indirme arasında kısa bekleme */
                      if (i < dosya.evraklar.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 800));
                      }
                    } catch(err) {
                      console.error('EVRAK İNDİRME HATASI:', err);
                    }
                  }
                }}>
                <LIcon name="Download" size={12} color="#fff"/> TOPLU İNDİR ({dosya.evraklar?.length})
              </button>
            )}
          </div>
          <div style={{maxHeight:600,overflowY:'auto'}}>
            {(() => {
              const tumTurler = MR.EVRAK_T || [];
              const evraklar = dosya.evraklar || [];
              // Yüklü türleri üste çıkar, yüklenme tarihine göre sırala
              const yukluTurler = [];
              const beklenenTurler = [];
              tumTurler.forEach(tur => {
                const yuklenen = evraklar.filter(e => e.evrak_turu === tur);
                if (yuklenen.length > 0) yukluTurler.push(tur);
                else beklenenTurler.push(tur);
              });
              // Yüklü olanları yüklenme tarihine göre sırala (en yeni önce)
              yukluTurler.sort((a, b) => {
                const aEvrak = evraklar.find(e => e.evrak_turu === a);
                const bEvrak = evraklar.find(e => e.evrak_turu === b);
                const aDate = aEvrak?.created_at || '';
                const bDate = bEvrak?.created_at || '';
                return bDate.localeCompare(aDate);
              });
              const sirali = [...yukluTurler, ...beklenenTurler];
              return sirali.map((tur, idx) => {
              const yuklenen = (dosya.evraklar||[]).filter(e => e.evrak_turu === tur);
              const yukluMu = yuklenen.length > 0;
              return (
                <div key={idx} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 14px',
                  borderBottom:`1px solid ${C.border}22`,
                  background:yukluMu ? `${C.success}08` : 'transparent'}}>
                  {/* SIRA NO */}
                  <span style={{fontSize:9,color:C.textMuted,minWidth:22,textAlign:'center',fontWeight:600}}>{idx+1}</span>
                  {/* DURUM İKONU */}
                  <div style={{width:22,height:22,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
                    background:yukluMu ? `${C.success}22` : `${C.border}44`}}>
                    <LIcon name={yukluMu ? 'Check' : 'Minus'} size={12} color={yukluMu ? C.success : C.textMuted}/>
                  </div>
                  {/* EVRAK TÜRÜ ADI */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:10,fontWeight:yukluMu?700:500,color:yukluMu?C.text:C.textSec,
                      overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tur}</div>
                    {yukluMu && (
                      <div style={{fontSize:8,color:C.textMuted,marginTop:1}}>
                        {yuklenen.map(y => `${y.dosya_adi} (${(y.dosya_boyutu/1024).toFixed(0)}KB)`).join(', ')}
                        {yuklenen[0]?.kullanici_adi ? ` • ${yuklenen[0].kullanici_adi}` : ''}
                        {yuklenen[0]?.created_at ? ` • ${yuklenen[0].created_at.split(' ')[0]}` : ''}
                      </div>
                    )}
                  </div>
                  {/* DURUM BADGE */}
                  {yukluMu ? (
                    <span style={{fontSize:8,fontWeight:800,color:C.success,background:`${C.success}18`,padding:'3px 8px',borderRadius:4,flexShrink:0}}>
                      YÜKLENDİ
                    </span>
                  ) : (
                    <span style={{fontSize:8,fontWeight:600,color:C.textMuted,padding:'3px 8px',flexShrink:0}}>
                      BEKLİYOR
                    </span>
                  )}
                  {/* BUTONLAR */}
                  <div style={{display:'flex',gap:3,flexShrink:0}}>
                    {yukluMu && yuklenen.map(y => (
                      <React.Fragment key={y.id}>
                        <button title="ÖN İZLEME" onClick={() => setPreviewEvrak(y)}
                          style={{...S.btn,padding:'3px 6px',fontSize:8,background:`${C.accent}18`,color:C.accent,border:`1px solid ${C.accent}33`,borderRadius:4,cursor:'pointer',display:'flex',alignItems:'center',gap:2}}>
                          <LIcon name="Eye" size={10} color={C.accent}/>
                        </button>
                        <button title="İNDİR" onClick={async () => {
                          try {
                            const token = MR.api.token;
                            const apiBase = MR.api.base || '/api/v1';
                            const r = await fetch(apiBase + '/evrak/download.php?id=' + y.id, {
                              headers: token ? {'Authorization': 'Bearer ' + token} : {}
                            });
                            if (!r.ok) { alert('İNDİRME HATASI'); return; }
                            const blob = await r.blob();
                            const a = document.createElement('a');
                            a.href = URL.createObjectURL(blob);
                            a.download = y.dosya_adi || 'evrak.pdf';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
                          } catch(e) { alert('İNDİRME HATASI: ' + e.message); }
                        }}
                          style={{...S.btn,padding:'3px 6px',fontSize:8,background:`${C.success}18`,color:C.success,border:`1px solid ${C.success}33`,borderRadius:4,cursor:'pointer',display:'flex',alignItems:'center',gap:2}}>
                          <LIcon name="Download" size={10} color={C.success}/>
                        </button>
                        <button title="SİL" onClick={() => setDeleteConfirm({type:'evrak', id:y.id, text:y.dosya_adi})}
                          style={{...S.btn,padding:'3px 6px',fontSize:8,background:`${C.danger}18`,color:C.danger,border:`1px solid ${C.danger}33`,borderRadius:4,cursor:'pointer',display:'flex',alignItems:'center',gap:2}}>
                          <LIcon name="Trash2" size={10} color={C.danger}/>
                        </button>
                      </React.Fragment>
                    ))}
                    {/* YÜKLE BUTONU - her zaman göster (aynı türe birden fazla yüklenebilir) */}
                    <label title="PDF YÜKLE" style={{...S.btn,padding:'3px 6px',fontSize:8,
                      background:yukluMu ? `${C.warning}18` : `${C.accent}18`,
                      color:yukluMu ? C.warning : C.accent,
                      border:`1px solid ${yukluMu ? C.warning+'33' : C.accent+'33'}`,
                      borderRadius:4,cursor:'pointer',display:'flex',alignItems:'center',gap:2}}>
                      <LIcon name="Upload" size={10} color={yukluMu ? C.warning : C.accent}/>
                      <input type="file" accept=".pdf" style={{display:'none'}} onChange={async (ev) => {
                        const f = ev.target.files[0];
                        if (!f) return;
                        if (f.type !== 'application/pdf') { alert('SADECE PDF DOSYA YÜKLENEBİLİR'); return; }
                        const r = await api.evrakUpload(dosya.id, tur, f);
                        if (r?.success) load();
                        else alert(r?.error || 'YÜKLEME HATASI');
                        ev.target.value = '';
                      }}/>
                    </label>
                  </div>
                </div>
              );
            });})()}
          </div>
        </div>
      )}

      {/* DOSYA HESABI TAB */}
      {tab === 'hesap' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {/* MASRAF ÖZETİ */}
          <div style={S.card}>
            <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8,background:`${C.danger}06`}}>
              <LIcon name="Receipt" size={14} color={C.danger}/>
              <span style={{fontSize:12,fontWeight:700}}>DOSYA MASRAFLARI</span>
            </div>
            <div style={{padding:'10px 14px'}}>
              {dosya.masraflar?.length > 0 ? dosya.masraflar.map((m,i) => (
                <InfoRow key={i} label={m.masraf_kalemi} value={fmt(m.tutar)} color={C.danger}/>
              )) : <div style={{fontSize:11,color:C.textMuted,padding:10,textAlign:'center'}}>MASRAF KAYDI YOK</div>}
              <div style={{marginTop:8,paddingTop:8,borderTop:`2px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:12,fontWeight:800}}>TOPLAM MASRAF</span>
                <span style={{fontSize:14,fontWeight:800,color:C.danger}}>{fmt(dosya.toplam_masraf || 0)}</span>
              </div>
            </div>
          </div>

          {/* DOSYA KAPAT */}
          <div style={S.card}>
            <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:`${C.success}06`}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <LIcon name="CheckCircle" size={14} color={C.success}/>
                <span style={{fontSize:12,fontWeight:700}}>DOSYA KAPAT - HESAP ÖZETİ</span>
              </div>
              {dosya.asama !== 'DOSYA KAPANDI' && (
                <button style={{...S.btn,...S.btnS,fontSize:10,padding:'5px 12px'}} onClick={() => {
                  api.kasaList().then(r => { if(r?.success) setKasalar(r.data||[]); });
                  // Avukat ödeme oranı: ortak varsa onun odeme_orani, yoksa komisyon_orani veya 50
                  const avukatOran = dosya.avukat_odeme_orani || dosya.komisyon_orani || 50;
                  setKapatForm({
                    tazminat:'', vekalet_ucreti:'', faiz:'', stopaj:'', kdv_oran:'20',
                    noter_masrafi:'', cezaevi_harci:'', diger_masraf:'',
                    dosya_basi_odenen:'0', kasa_id:1, pay_orani: String(dosya.komisyon_orani || 50),
                    avukat_pay_orani: String(avukatOran)
                  });
                  setKapatModal(true);
                }}>
                  <LIcon name="Lock" size={12} color="#fff"/> DOSYAYI KAPAT
                </button>
              )}
            </div>
            <div style={{padding:'14px'}}>
              {dosya.asama === 'DOSYA KAPANDI' ? (
                <div style={{textAlign:'center',padding:20}}>
                  <div style={{width:60,height:60,borderRadius:'50%',background:`${C.success}22`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
                    <LIcon name="Check" size={28} color={C.success}/>
                  </div>
                  <div style={{fontSize:16,fontWeight:800,color:C.success,marginBottom:4}}>DOSYA KAPANDI</div>
                  <div style={{fontSize:11,color:C.textMuted}}>KAPANMA TARİHİ: {dosya.kapanma_tarihi || '-'}</div>
                </div>
              ) : (
                <div style={{textAlign:'center',padding:30,color:C.textMuted}}>
                  <LIcon name="Calculator" size={36} color={C.textMuted} style={{opacity:0.3,marginBottom:10}}/>
                  <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>DOSYA HENÜZ KAPANMADI</div>
                  <div style={{fontSize:11}}>DOSYAYI KAPATMAK İÇİN YUKARIDAKI BUTONA TIKLAYIN</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DOSYA KAPAT MODAL */}
      <Modal open={kapatModal} onClose={() => setKapatModal(false)} title="DOSYA KAPAT - HESAP ÖZETİ" width="700px">
        {(() => {
          const t = parseFloat(kapatForm.tazminat) || 0;
          const sozlesmeOran = parseFloat(kapatForm.pay_orani) || 0;
          const sozlesme = t * sozlesmeOran / 100;
          const noter = parseFloat(kapatForm.noter_masrafi) || 0;
          const cezaevi = parseFloat(kapatForm.cezaevi_harci) || 0;
          const digerM = parseFloat(kapatForm.diger_masraf) || 0;
          const toplamEkMasraf = noter + cezaevi + digerM;
          const muvekkileHavale = t - sozlesme - toplamEkMasraf;
          const vekalet = parseFloat(kapatForm.vekalet_ucreti) || 0;
          const faiz = parseFloat(kapatForm.faiz) || 0;
          const stopaj = parseFloat(kapatForm.stopaj) || 0;
          const kdvOran = parseFloat(kapatForm.kdv_oran) || 0;
          const kdv = sozlesme * kdvOran / 100;
          const toplamKazanc = sozlesme + vekalet + faiz;
          const netKazanc = toplamKazanc - stopaj;
          const dosyaBasi = parseFloat(kapatForm.dosya_basi_odenen) || 0;
          const dosyaMasraflari = dosya.toplam_masraf || 0;

          /* PAY BÖLÜŞÜMÜ: AVUKAT ÖDEME ORANINA GÖRE DİNAMİK */
          const avukatPayYuzde = parseFloat(kapatForm.avukat_pay_orani) || 50;
          const mrPayYuzde = 100 - avukatPayYuzde;
          const mrBrutPay = netKazanc * mrPayYuzde / 100;
          const avukatHakedis = netKazanc * avukatPayYuzde / 100;
          const mrHakedis = mrBrutPay - dosyaBasi;
          const kasayaAktarilacak = mrHakedis;
          const kF = (k,v) => setKapatForm(p=>({...p,[k]:v}));

          const hesapRow = (label, val, opts={}) => (
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',
              borderBottom:opts.border?`2px solid ${C.border}`:`1px solid ${C.border}22`}}>
              <span style={{fontSize:11,fontWeight:opts.bold?800:500,color:opts.color||C.text}}>{label}</span>
              <span style={{fontSize:opts.big?16:12,fontWeight:opts.bold?800:600,color:opts.color||C.text,fontFamily:'monospace'}}>
                {fmt(val)}
              </span>
            </div>
          );

          const dosyaKapat = async () => {
            if (!t || t <= 0) { alert('TAZMİNAT TUTARI GİRMENİZ GEREKLİ'); return; }
            setKapatLoading(true);
            const gelirR = await api.gelirCreate({
              dosya_id: dosya.id, gelir_turu: 'TAZMİNAT ÖDEMESİ',
              tutar: kasayaAktarilacak,
              kasa_id: parseInt(kapatForm.kasa_id),
              aciklama: `${dosya.dosya_no} DOSYA KAPATMA - TAZMİNAT: ${fmt(t)}, NET KAZANÇ: ${fmt(netKazanc)}, MR HAKEDİŞ: ${fmt(mrHakedis)}, AVUKAT HAKEDİŞ: ${fmt(avukatHakedis)}`,
              tahsilat_durumu: 'tahsil_edildi'
            });
            const kapatR = await api.dosyaUpdate({
              id: dosya.id, asama: 'DOSYA KAPANDI',
              kapanma_tarihi: new Date().toISOString().split('T')[0]
            });
            if (kapatR?.success) { load(); setKapatModal(false); }
            else alert(kapatR?.error || 'DOSYA KAPATMA HATASI');
            setKapatLoading(false);
          };

          return (
            <div>
              {/* GİRİŞ ALANLARI */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                <FormGroup label="SİGORTA TAZMİNATI (ÇIKAN ÖDEME) *">
                  <input type="number" value={kapatForm.tazminat} onChange={e=>kF('tazminat',e.target.value)} placeholder="17.635,00" style={{...S.input,padding:'8px 10px',fontSize:12,fontWeight:700}}/>
                </FormGroup>
                <FormGroup label={`SÖZLEŞME ORANI (%${sozlesmeOran})`}>
                  <input type="number" min="0" max="100" value={kapatForm.pay_orani} onChange={e=>kF('pay_orani',e.target.value)} placeholder="20" style={{...S.input,padding:'8px 10px',fontSize:12}}/>
                </FormGroup>
                <FormGroup label="KARŞI VEKALET ÜCRETİ">
                  <input type="number" value={kapatForm.vekalet_ucreti} onChange={e=>kF('vekalet_ucreti',e.target.value)} placeholder="8.817,00" style={{...S.input,padding:'8px 10px',fontSize:12}}/>
                </FormGroup>
                <FormGroup label="FAİZ">
                  <input type="number" value={kapatForm.faiz} onChange={e=>kF('faiz',e.target.value)} placeholder="580,00" style={{...S.input,padding:'8px 10px',fontSize:12}}/>
                </FormGroup>
                <FormGroup label="STOPAJ">
                  <input type="number" value={kapatForm.stopaj} onChange={e=>kF('stopaj',e.target.value)} placeholder="2.939,00" style={{...S.input,padding:'8px 10px',fontSize:12}}/>
                </FormGroup>
                <FormGroup label="KDV ORANI (%)">
                  <input type="number" value={kapatForm.kdv_oran} onChange={e=>kF('kdv_oran',e.target.value)} placeholder="20" style={{...S.input,padding:'8px 10px',fontSize:12}}/>
                </FormGroup>
                <FormGroup label="NOTER MASRAFI">
                  <input type="number" value={kapatForm.noter_masrafi} onChange={e=>kF('noter_masrafi',e.target.value)} placeholder="0" style={{...S.input,padding:'8px 10px',fontSize:12}}/>
                </FormGroup>
                <FormGroup label="CEZAEVİ HARCI">
                  <input type="number" value={kapatForm.cezaevi_harci} onChange={e=>kF('cezaevi_harci',e.target.value)} placeholder="0" style={{...S.input,padding:'8px 10px',fontSize:12}}/>
                </FormGroup>
                <FormGroup label="DİĞER MASRAF">
                  <input type="number" value={kapatForm.diger_masraf} onChange={e=>kF('diger_masraf',e.target.value)} placeholder="0" style={{...S.input,padding:'8px 10px',fontSize:12}}/>
                </FormGroup>
                <FormGroup label="DOSYA BAŞI ÖDENEN">
                  <input type="number" value={kapatForm.dosya_basi_odenen} onChange={e=>kF('dosya_basi_odenen',e.target.value)} placeholder="0" style={{...S.input,padding:'8px 10px',fontSize:12}}/>
                </FormGroup>
                <FormGroup label={`AVUKAT PAY ORANI (%${avukatPayYuzde})`}>
                  <input type="number" min="0" max="100" value={kapatForm.avukat_pay_orani} onChange={e=>kF('avukat_pay_orani',e.target.value)} placeholder="50" style={{...S.input,padding:'8px 10px',fontSize:12,fontWeight:700,color:C.purple}}/>
                </FormGroup>
              </div>

              {/* AVUKAT BİLGİ BANNER */}
              {dosya.avukat_adi && (
                <div style={{padding:10,background:`${C.purple}11`,borderRadius:8,marginBottom:16,display:'flex',alignItems:'center',gap:12,border:`1px solid ${C.purple}33`}}>
                  <LIcon name="Scale" size={16} color={C.purple}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:700}}>{dosya.avukat_adi}</div>
                    <div style={{fontSize:9,color:C.textSec}}>
                      {dosya.avukat_firma ? `${dosya.avukat_firma} • ` : ''}{dosya.avukat_baro || ''}
                    </div>
                  </div>
                  <div style={{textAlign:'center',padding:'6px 10px',background:`${C.purple}22`,borderRadius:6}}>
                    <div style={{fontSize:8,color:C.textMuted,fontWeight:600}}>KAYITLI ÖDEME ORANI</div>
                    <div style={{fontSize:16,fontWeight:900,color:C.purple}}>%{dosya.avukat_odeme_orani || '-'}</div>
                  </div>
                </div>
              )}

              {/* HESAP ÖZETİ */}
              <div style={{background:C.bgInput,borderRadius:10,padding:16,border:`1px solid ${C.border}`,marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:800,color:C.accent,marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
                  <LIcon name="Calculator" size={14} color={C.accent}/> HESAP ÖZETİ
                </div>
                {hesapRow('SİGORTA ÖDEMESİ (TAZMİNAT)', t, {bold:true,color:C.accent})}
                {hesapRow(`SÖZLEŞME (%${sozlesmeOran})`, sozlesme)}
                {noter > 0 && hesapRow('NOTER MASRAFI', noter, {color:C.danger})}
                {cezaevi > 0 && hesapRow('CEZAEVİ HARCI', cezaevi, {color:C.danger})}
                {digerM > 0 && hesapRow('DİĞER MASRAF', digerM, {color:C.danger})}
                {hesapRow('MÜVEKKİLE HAVALE', muvekkileHavale, {bold:true,border:true})}

                <div style={{marginTop:10}}/>
                {hesapRow('NET VEKALET ÜCRETİ', vekalet)}
                {hesapRow('FAİZ', faiz)}
                {hesapRow('STOPAJ', stopaj, {color:C.danger})}
                <div style={{marginTop:6}}/>
                {hesapRow(`KDV %${kdvOran}`, kdv)}

                <div style={{marginTop:10,paddingTop:10,borderTop:`2px solid ${C.accent}44`}}/>
                {hesapRow('TOPLAM KAZANÇ', toplamKazanc, {bold:true,color:C.success})}
                {hesapRow('NET TOPLAM KAZANÇ', netKazanc, {bold:true,color:C.success,big:true})}

                <div style={{marginTop:10,paddingTop:10,borderTop:`2px solid ${C.warning}44`}}/>
                {hesapRow('DOSYA MASRAFLARI (SİSTEMDEN)', dosyaMasraflari, {color:C.danger})}
                {hesapRow('DOSYA BAŞI ÖDENEN (MR HASAR\'A)', dosyaBasi, {color:C.warning})}

                <div style={{marginTop:10,paddingTop:10,borderTop:`2px solid ${C.purple}44`}}/>
                <div style={{fontSize:10,fontWeight:700,color:C.purple,marginBottom:6,display:'flex',alignItems:'center',gap:4}}>
                  PAY BÖLÜŞÜMÜ (MR HASAR %{mrPayYuzde} / AVUKAT %{avukatPayYuzde})
                </div>
                {hesapRow(`AVUKAT HAKEDİŞİ (%${avukatPayYuzde})`, avukatHakedis, {bold:true,color:'#8b5cf6'})}
                {hesapRow(`MR HASAR BRÜT PAY (%${mrPayYuzde})`, mrBrutPay, {color:C.textSec})}
                {hesapRow('DOSYA BAŞI ÖDENEN (DÜŞÜLEN)', dosyaBasi, {color:C.danger})}
                {hesapRow('MR HASAR HAKEDİŞİ', mrHakedis, {bold:true,color:C.success,big:true,border:true})}
              </div>

              {/* KASA SEÇİMİ */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                <FormGroup label="KAZANÇ AKTARILACAK KASA">
                  <select value={kapatForm.kasa_id} onChange={e=>kF('kasa_id',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:12}}>
                    {kasalar.map(k => <option key={k.id} value={k.id}>{k.ad} ({fmt(k.bakiye)})</option>)}
                  </select>
                </FormGroup>
                <div style={{display:'flex',alignItems:'flex-end',paddingBottom:2}}>
                  <div style={{padding:'10px 16px',background:`${C.success}11`,borderRadius:8,border:`1px solid ${C.success}33`,width:'100%'}}>
                    <div style={{fontSize:9,color:C.textMuted,marginBottom:2}}>MR HASAR HAKEDİŞİ (KASAYA)</div>
                    <div style={{fontSize:16,fontWeight:800,color:C.success}}>{fmt(kasayaAktarilacak)}</div>
                  </div>
                </div>
              </div>

              {/* ONAYLA */}
              <button onClick={dosyaKapat} disabled={kapatLoading || !t}
                style={{...S.btn,...S.btnS,justifyContent:'center',padding:14,width:'100%',fontSize:13,fontWeight:800}}>
                <LIcon name="CheckCircle" size={16} color="#fff"/>
                {kapatLoading ? 'KAPATILIYOR...' : 'DOSYAYI KAPAT VE KAZANCI KASAYA AKTAR'}
              </button>
            </div>
          );
        })()}
      </Modal>

      {/* MODALLER */}
      <MR.MasrafEkle open={masrafM} onClose={() => setMasrafM(false)} dosyaId={dosya.id} onOk={load}/>

      {/* EVRAK ÖNİZLEME MODAL (3:2 ORAN - ORTALI) */}
      {previewEvrak && (
        <div onClick={() => setPreviewEvrak(null)} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.75)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
          <div onClick={e => e.stopPropagation()} style={{
            width:'min(900px, 85vw)', height:'min(600px, 80vh)',
            background:C.bgCard, borderRadius:14, overflow:'hidden',
            display:'flex', flexDirection:'column', cursor:'default',
            boxShadow:'0 25px 60px rgba(0,0,0,0.6)'
          }}>
            <div style={{padding:'10px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:`${C.accent}08`,flexShrink:0}}>
              <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0,flex:1}}>
                <LIcon name="Eye" size={14} color={C.accent}/>
                <span style={{fontSize:12,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{previewEvrak.evrak_turu || previewEvrak.dosya_adi}</span>
                <span style={{fontSize:9,color:C.textMuted,flexShrink:0}}>({(previewEvrak.dosya_boyutu/1024).toFixed(0)}KB)</span>
              </div>
              <div style={{display:'flex',gap:6,flexShrink:0}}>
                <button onClick={async () => {
                  try {
                    const token = MR.api.token;
                    const apiBase = MR.api.base || '/api/v1';
                    const r = await fetch(apiBase + '/evrak/download.php?id=' + previewEvrak.id, {
                      headers: token ? {'Authorization': 'Bearer ' + token} : {}
                    });
                    if (!r.ok) { alert('İNDİRME HATASI'); return; }
                    const blob = await r.blob();
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = previewEvrak.dosya_adi || 'evrak.pdf';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
                  } catch(e) { alert('İNDİRME HATASI: ' + e.message); }
                }}
                  style={{padding:'5px 12px',fontSize:9,background:`${C.success}18`,color:C.success,border:`1px solid ${C.success}33`,borderRadius:6,cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontWeight:700}}>
                  <LIcon name="Download" size={11} color={C.success}/> İNDİR
                </button>
                <button onClick={() => setPreviewEvrak(null)}
                  style={{padding:'5px 12px',fontSize:9,background:`${C.danger}18`,color:C.danger,border:`1px solid ${C.danger}33`,borderRadius:6,cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontWeight:700}}>
                  <LIcon name="X" size={11} color={C.danger}/> KAPAT
                </button>
              </div>
            </div>
            <div style={{flex:1,overflow:'hidden'}}>
              <EvrakPreviewIframe evrakId={previewEvrak.id}/>
            </div>
          </div>
        </div>
      )}

      {/* MASRAF / EVRAK SİL */}
      <Confirm open={!!deleteConfirm} message={deleteConfirm ? `"${deleteConfirm.text}" SİLİNSİN Mİ?` : ''}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm.type === 'masraf') masrafSil(deleteConfirm.id);
          else if (deleteConfirm.type === 'evrak') evrakSil(deleteConfirm.id);
        }}/>

      {/* DOSYA SİL */}
      <Confirm open={dosyaSilConfirm} message={`"${dosya.dosya_no}" DOSYASI TAMAMEN SİLİNSİN Mİ? BU İŞLEM GERİ ALINAMAZ!`}
        onCancel={() => setDosyaSilConfirm(false)}
        onConfirm={dosyaSil}/>

      {/* DÜZENLEME MODAL */}
      <Modal open={editM} onClose={() => setEditM(false)} title="DOSYA BİLGİLERİ DÜZENLE" width="680px">
        {editError && <div style={{padding:8,background:`${C.danger}18`,borderRadius:6,marginBottom:10,fontSize:11,color:C.danger,border:`1px solid ${C.danger}33`}}>{editError}</div>}

        {/* DOSYA BİLGİLERİ BÖLÜMÜ */}
        <div style={{fontSize:10,fontWeight:700,color:C.accent,marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
          <LIcon name="FileText" size={12} color={C.accent}/> DOSYA BİLGİLERİ
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
          <FormGroup label="DOSYA TÜRÜ">
            <select value={editForm.dosya_turu} onChange={e => u('dosya_turu',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="ADK">ADK</option>
              <option value="BH">BH</option>
            </select>
          </FormGroup>
          <FormGroup label="SİGORTA ŞİRKETİ">
            <select value={editForm.sigorta_sirket} onChange={e => u('sigorta_sirket',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="">SEÇİNİZ</option>
              {(SIGORTA || []).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="HASAR DOSYA NO">
            <input value={editForm.hasar_no||''} onChange={e => u('hasar_no',e.target.value)} placeholder="HASAR DOSYA NO" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="DOSYA KAYNAĞI">
            <select value={editForm.dosya_kaynagi} onChange={e => u('dosya_kaynagi',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="">SEÇİNİZ</option>
              {KAYNAKLAR.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="PLAKA">
            <input value={editForm.plaka||''} onChange={e => u('plaka',e.target.value)} placeholder="34 XX 0000" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="KAZA TARİHİ">
            <input type="date" value={editForm.kaza_tarihi||''} onChange={e => u('kaza_tarihi',e.target.value)} style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="KAZA İLİ">
            <select value={editForm.kaza_il} onChange={e => u('kaza_il',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="">SEÇİNİZ</option>
              {(ILLER || []).map(il => <option key={il} value={il}>{il}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="HAKLILIK (%)">
            <input type="number" min="0" max="100" value={editForm.haklilik} onChange={e => u('haklilik',e.target.value)} style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="KOMİSYON (%)">
            <input type="number" min="0" max="100" step="0.1" value={editForm.komisyon_orani} onChange={e => u('komisyon_orani',e.target.value)} style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="HAK MAHRUMİYET TALEP">
            <div style={{display:'flex',gap:8,alignItems:'center',paddingTop:4}}>
              <div onClick={() => u('hak_mahrumiyet', 1)}
                style={{padding:'6px 16px',borderRadius:6,fontSize:11,fontWeight:700,cursor:'pointer',
                  background:editForm.hak_mahrumiyet==1?`${C.success}22`:'transparent',
                  color:editForm.hak_mahrumiyet==1?C.success:C.textMuted,
                  border:`1px solid ${editForm.hak_mahrumiyet==1?C.success+'66':C.border}`}}>VAR</div>
              <div onClick={() => u('hak_mahrumiyet', 0)}
                style={{padding:'6px 16px',borderRadius:6,fontSize:11,fontWeight:700,cursor:'pointer',
                  background:editForm.hak_mahrumiyet==0?`${C.danger}22`:'transparent',
                  color:editForm.hak_mahrumiyet==0?C.danger:C.textMuted,
                  border:`1px solid ${editForm.hak_mahrumiyet==0?C.danger+'66':C.border}`}}>YOK</div>
            </div>
          </FormGroup>
        </div>

        {/* AVUKAT SEÇİMİ BÖLÜMÜ */}
        <div style={{fontSize:10,fontWeight:700,color:C.purple,marginBottom:8,marginTop:4,display:'flex',alignItems:'center',gap:6,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
          <LIcon name="Scale" size={12} color={C.purple}/> AVUKAT ATAMASI
        </div>
        <div style={{marginBottom:14}}>
          <FormGroup label="AVUKAT (İŞ ORTAĞI)">
            <select value={editForm.ortak_id || ''} onChange={e => u('ortak_id', e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11,fontWeight:600}}>
              <option value="">AVUKAT SEÇİNİZ</option>
              {ortaklar.map(o => (
                <option key={o.id} value={o.id}>
                  {o.ad_soyad}{o.firma ? ` - ${o.firma}` : ''}{o.baro ? ` (${o.baro})` : ''} — %{o.odeme_orani || 0}
                </option>
              ))}
            </select>
          </FormGroup>
          {(() => {
            const secili = ortaklar.find(o => String(o.id) === String(editForm.ortak_id));
            return secili ? (
              <div style={{marginTop:8,padding:10,background:`${C.purple}11`,borderRadius:8,border:`1px solid ${C.purple}33`,display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:36,height:36,borderRadius:8,background:`${C.purple}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <LIcon name="Scale" size={16} color={C.purple}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700}}>{secili.ad_soyad}</div>
                  <div style={{fontSize:9,color:C.textSec}}>
                    {secili.firma ? `${secili.firma} • ` : ''}{secili.baro || ''}{secili.sicil_no ? ` • SİCİL: ${secili.sicil_no}` : ''}
                  </div>
                </div>
                <div style={{textAlign:'center',padding:'6px 12px',background:`${C.purple}22`,borderRadius:6}}>
                  <div style={{fontSize:8,color:C.textMuted,fontWeight:600}}>ÖDEME ORANI</div>
                  <div style={{fontSize:18,fontWeight:900,color:C.purple}}>%{secili.odeme_orani || 0}</div>
                </div>
              </div>
            ) : null;
          })()}
        </div>

        {/* DOSYA SORUMLUSU & PAYDAŞ ATAMASI */}
        <div style={{fontSize:10,fontWeight:700,color:C.success,marginBottom:8,marginTop:4,display:'flex',alignItems:'center',gap:6,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
          <LIcon name="UserCheck" size={12} color={C.success}/> DOSYA SORUMLUSU & PAYDAS
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
          <FormGroup label="DOSYA SORUMLUSU (PERSONEL)">
            <select value={editForm.sorumlu_id || ''} onChange={e => u('sorumlu_id', e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="">SORUMLU SEÇİNİZ</option>
              {personeller.map(p => (
                <option key={p.id} value={p.user_id || p.id}>
                  {p.ad_soyad}{p.departman ? ` (${p.departman})` : ''}
                </option>
              ))}
            </select>
          </FormGroup>
          <FormGroup label="PAYDAŞ (YÖNLENDİREN)">
            <select value={editForm.paydas_id || ''} onChange={e => u('paydas_id', e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="">PAYDAŞ SEÇİNİZ</option>
              {paydaslar.map(p => (
                <option key={p.id} value={p.id}>
                  {p.ad}{p.yetkili ? ` - ${p.yetkili}` : ''}{p.tur ? ` (${p.tur})` : ''}
                </option>
              ))}
            </select>
          </FormGroup>
        </div>

        {/* MAĞDUR BİLGİLERİ BÖLÜMÜ */}
        <div style={{fontSize:10,fontWeight:700,color:C.cyan,marginBottom:8,display:'flex',alignItems:'center',gap:6,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
          <LIcon name="User" size={12} color={C.cyan}/> MAĞDUR BİLGİLERİ
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
          <FormGroup label="AD SOYAD">
            <input value={editForm.magdur_ad_soyad||''} onChange={e => u('magdur_ad_soyad',e.target.value)} placeholder="AD SOYAD" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="T.C. KİMLİK NO">
            <input value={editForm.magdur_tc_kimlik||''} onChange={e => u('magdur_tc_kimlik',e.target.value)} placeholder="T.C. KİMLİK" maxLength={11} style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="TELEFON">
            <input value={editForm.magdur_telefon||''} onChange={e => u('magdur_telefon',e.target.value)} placeholder="05XX XXX XX XX" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="TELEFON 2">
            <input value={editForm.magdur_telefon2||''} onChange={e => u('magdur_telefon2',e.target.value)} placeholder="TELEFON 2" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="IBAN">
            <input value={editForm.magdur_iban||''} onChange={e => u('magdur_iban',e.target.value)} placeholder="TR00 0000 ..." style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="İL">
            <select value={editForm.magdur_il} onChange={e => {u('magdur_il',e.target.value);u('magdur_ilce','');}} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="">SEÇİNİZ</option>
              {(ILLER || []).map(il => <option key={il} value={il}>{il}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="İLÇE">
            <select value={editForm.magdur_ilce||''} onChange={e => u('magdur_ilce',e.target.value)} disabled={!editForm.magdur_il} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="">SEÇİNİZ</option>
              {((ILCELER||{})[editForm.magdur_il]||[]).map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="DOĞUM TARİHİ">
            <input type="date" value={editForm.magdur_dogum_tarihi||''} onChange={e => u('magdur_dogum_tarihi',e.target.value)} style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="MESLEK">
            <input value={editForm.magdur_meslek||''} onChange={e => u('magdur_meslek',e.target.value)} placeholder="MESLEK" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
        </div>

        {/* NOTLAR */}
        <div style={{fontSize:10,fontWeight:700,color:C.textSec,marginBottom:8,display:'flex',alignItems:'center',gap:6,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
          <LIcon name="Edit3" size={12} color={C.textSec}/> NOTLAR
        </div>
        <textarea value={editForm.notlar||''} onChange={e => u('notlar',e.target.value)} placeholder="DOSYA İLE İLGİLİ NOTLAR..."
          style={{...S.input,minHeight:60,padding:'8px 10px',fontSize:11,resize:'vertical',marginBottom:14}}/>

        {/* KAYDET */}
        <button onClick={dosyaGuncelle} disabled={editLoading}
          style={{...S.btn,...S.btnS,justifyContent:'center',padding:12,width:'100%',fontSize:12}}>
          {editLoading ? 'KAYDEDİLİYOR...' : 'DEĞİŞİKLİKLERİ KAYDET'}
        </button>
      </Modal>
    </div>
  );
};

// MASRAF EKLEME MODAL
MR.MasrafEkle = ({open, onClose, dosyaId, onOk}) => {
  const {C, S, Modal, FormGroup, api, MASRAF_K, today} = MR;
  const [f, sF] = useState({masraf_kalemi:'',tutar:'',kasa_id:1,aciklama:'',islem_tarihi:today()});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [kasalar, setKasalar] = useState([]);

  useEffect(() => {
    if (open) {
      api.kasaList().then(r => { if (r?.success) setKasalar(r.data || []); });
    }
  }, [open]);

  const go = async () => {
    if (!f.masraf_kalemi || !f.tutar) { setError('KALEM VE TUTAR GEREKLİ'); return; }
    setLoading(true); setError('');
    const r = await api.masrafCreate({...f, dosya_id:dosyaId, tutar:parseFloat(f.tutar)});
    if (r?.success) { onOk(); onClose(); sF({masraf_kalemi:'',tutar:'',kasa_id:1,aciklama:'',islem_tarihi:today()}); }
    else setError(r?.error || 'HATA');
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="MASRAF EKLE" width="480px">
      {error && <div style={{padding:8,background:`${C.danger}18`,borderRadius:6,marginBottom:10,fontSize:11,color:C.danger}}>{error}</div>}
      <div style={{display:'grid',gap:10}}>
        <FormGroup label="MASRAF KALEMİ">
          <select value={f.masraf_kalemi} onChange={e => sF({...f,masraf_kalemi:e.target.value})} style={{...S.select,padding:'8px 10px',fontSize:11}}>
            <option value="">SEÇİNİZ</option>
            {MASRAF_K.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </FormGroup>
        <FormGroup label="TUTAR (₺)">
          <input type="number" value={f.tutar} onChange={e => sF({...f,tutar:e.target.value})} placeholder="0.00" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
        </FormGroup>
        <FormGroup label="KASA">
          <select value={f.kasa_id} onChange={e => sF({...f,kasa_id:parseInt(e.target.value)})} style={{...S.select,padding:'8px 10px',fontSize:11}}>
            {kasalar.map(k => <option key={k.id} value={k.id}>{k.ad} ({MR.fmt(k.bakiye)})</option>)}
          </select>
        </FormGroup>
        <FormGroup label="TARİH">
          <input type="date" value={f.islem_tarihi} onChange={e => sF({...f,islem_tarihi:e.target.value})} style={{...S.input,padding:'8px 10px',fontSize:11}}/>
        </FormGroup>
        <FormGroup label="AÇIKLAMA">
          <input value={f.aciklama} onChange={e => sF({...f,aciklama:e.target.value})} placeholder="İSTEĞE BAĞLI" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
        </FormGroup>
        <div style={{padding:8,background:`${C.warning}11`,borderRadius:6,fontSize:10,color:C.warning}}>
          MASRAF TUTARI KASA BAKİYESİNDEN OTOMATİK DÜŞÜLECEK.
        </div>
        <button onClick={go} disabled={loading} style={{...S.btn,...S.btnS,justifyContent:'center',padding:12,fontSize:12}}>
          {loading ? 'KAYDEDİLİYOR...' : 'MASRAFI KAYDET'}
        </button>
      </div>
    </Modal>
  );
};

// EVRAK YÜKLEME - ARTIK İNLİNE (EVRAK TAB İÇİNDE SATIR SATIR YÜKLEME)
