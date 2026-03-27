const MR = window.MR || (window.MR = {});
const {useState, useEffect} = React;

const ASAMALAR = MR.ASAMALAR || [];
const KAYNAKLAR = ['OFİS CRM','PAYDAŞ/YÖNLENDİREN'];

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
  const [yukleniyor, setYukleniyor] = React.useState(true);
  const urlRef = React.useRef(null);

  React.useEffect(() => {
    let iptal = false;
    setBlobUrl(null);
    setMimeType('');
    setHata('');
    setYukleniyor(true);

    const yukle = async () => {
      try {
        const token = MR.api.token;
        if (!token) { if (!iptal) setHata('OTURUM BULUNAMADI. LÜTFEN YENİDEN GİRİŞ YAPIN.'); return; }

        const apiBase = MR.api.base || '/api/v1';
        const fetchUrl = apiBase + '/evrak/download.php?id=' + evrakId + '&mode=inline';

        const r = await fetch(fetchUrl, {
          headers: { 'Authorization': 'Bearer ' + token },
          credentials: 'include',
          cache: 'no-cache'
        });

        if (iptal) return;

        if (!r.ok) {
          let hataMesaj = 'SUNUCU HATASI: ' + r.status;
          try {
            const txt = await r.text();
            try { const j = JSON.parse(txt); hataMesaj = j.error || hataMesaj; } catch(e) {}
          } catch(e) {}
          setHata(hataMesaj);
          setYukleniyor(false);
          return;
        }

        const ct = (r.headers.get('content-type') || 'application/pdf').split(';')[0].trim();
        const ab = await r.arrayBuffer();
        if (iptal) return;

        if (ab.byteLength === 0) { setHata('EVRAK DOSYASI BOŞ'); setYukleniyor(false); return; }

        // Gelen verinin JSON hata yanıtı olup olmadığını kontrol et
        if (ab.byteLength < 500 && ct.includes('json')) {
          try {
            const txt = new TextDecoder().decode(ab);
            const j = JSON.parse(txt);
            if (j.error) { setHata(j.error); setYukleniyor(false); return; }
          } catch(e) {}
        }

        const blob = new Blob([ab], { type: ct });
        const objectUrl = URL.createObjectURL(blob);

        /* Önceki URL varsa temizle */
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = objectUrl;
        setMimeType(ct.toLowerCase());
        setBlobUrl(objectUrl);
        setYukleniyor(false);
      } catch(e) {
        console.error('EVRAK ÖNIZLEME HATASI:', e);
        if (!iptal) {
          setHata('EVRAK YÜKLENİRKEN HATA: ' + (e.message || 'Bağlantı hatası'));
          setYukleniyor(false);
        }
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
      <button onClick={() => { setHata(''); setYukleniyor(true); setBlobUrl(null); }}
        style={{marginTop:8,padding:'6px 16px',fontSize:10,background:'#2563eb22',color:'#2563eb',border:'1px solid #2563eb33',borderRadius:6,cursor:'pointer',fontWeight:700}}>
        TEKRAR DENE
      </button>
    </div>
  );

  if (yukleniyor || !blobUrl) return (
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

  /* PDF dosyaları için <iframe> (en güvenilir yöntem, tüm tarayıcılarda çalışır) */
  if (mimeType === 'application/pdf') {
    return <iframe src={blobUrl + '#toolbar=1&navpanes=1&scrollbar=1'} title="PDF Önizleme"
      style={{width:'100%',height:'100%',border:'none',background:'#f3f4f6'}}/>;
  }

  /* Diğer dosyalar için (DOCX vb.) indirme bilgisi */
  return <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#f3f4f6',flexDirection:'column',gap:12,padding:20}}>
    <MR.LIcon name="FileText" size={48} color="#6b7280"/>
    <div style={{fontSize:13,fontWeight:700,color:'#374151'}}>BU DOSYA TÜRÜ TARAYICIDA ÖNİZLENEMİYOR</div>
    <div style={{fontSize:11,color:'#6b7280'}}>DOSYAYI İNDİREREK GÖRÜNTÜLEYEBİLİRSİNİZ</div>
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
  const [asamaOnay, setAsamaOnay] = useState(null);
  const [editM, setEditM] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [dosyaSilConfirm, setDosyaSilConfirm] = useState(false);
  const [ortaklar, setOrtaklar] = useState([]);
  const [portalCreating, setPortalCreating] = useState(false);
  const [portalModal, setPortalModal] = useState({open:false, link:'', erisimKodu:'', tc:'', telefon:'', adSoyad:'', mevcut:false});
  const [previewEvrak, setPreviewEvrak] = useState(null);

  // MASRAF ÖDEME MODAL STATE
  const [masrafOdeModal, setMasrafOdeModal] = useState(false);
  const [masrafOdeItem, setMasrafOdeItem] = useState(null);
  const [masrafOdeKasa, setMasrafOdeKasa] = useState('');
  const [masrafOdeLoading, setMasrafOdeLoading] = useState(false);

  // DOSYA KAPAT STATE
  const [kapatModal, setKapatModal] = useState(false);
  const [kapatForm, setKapatForm] = useState({
    tazminat: '', vekalet_ucreti: '', faiz: '', stopaj: '', kdv_oran: '20',
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
    api.kasaList().then(r => {
      if (r?.success) setKasalar((r.data || []).filter(k => k.aktif !== false && k.aktif !== 0));
    });
  }, []);

  const [smsBildirim, setSmsBildirim] = useState(null);

  const asamaDegistirOnay = (yeniAsama) => {
    if (yeniAsama === dosya.asama) return;
    setAsamaOnay(yeniAsama);
  };

  const asamaDegistirOnayla = async () => {
    if (!asamaOnay) return;
    const yeniAsama = asamaOnay;
    setAsamaOnay(null);
    const r = await api.dosyaUpdate({id: dosya.id, asama: yeniAsama});
    if (r?.success) {
      load();
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
    const maArac = dosya.araclar?.find(a=>a.taraf==='magdur') || {};
    const kaArac = dosya.araclar?.find(a=>a.taraf==='karsi') || {};
    setEditForm({
      dosya_turu: dosya.dosya_turu || 'ADK',
      sigorta_sirket: dosya.sigorta_sirket || '',
      hasar_no: dosya.hasar_no || '',
      dosya_kaynagi: dosya.dosya_kaynagi || '',
      kaza_tarihi: dosya.kaza_tarihi || '',
      kaza_il: dosya.kaza_il || '',
      kaza_ilce: dosya.kaza_ilce || '',
      acilis_tarihi: dosya.acilis_tarihi || '',
      police_no: dosya.police_no || '',
      sigorta_turu: dosya.sigorta_turu || '',
      talep_turu: dosya.talep_turu || '',
      sorumlu_sigorta: dosya.sorumlu_sigorta || '',
      sakatlik_aciklama: dosya.sakatlik_aciklama || '',
      surucu_ad: dosya.surucu_ad || '',
      surucu_ehliyet: dosya.surucu_ehliyet || '',
      surucu_kusur: dosya.surucu_kusur || '',
      haklilik: dosya.haklilik || 100,
      komisyon_orani: dosya.komisyon_orani || 0,
      hak_mahrumiyet: parseInt(dosya.hak_mahrumiyet) === 1 ? 1 : 0,
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
      magdur_adres: magdur.adres || '',
      magdur_gelir_durumu: magdur.gelir_durumu || '',
      sorumlu_id: dosya.sorumlu_id ? String(dosya.sorumlu_id) : '',
      paydas_id: dosya.paydas_id ? String(dosya.paydas_id) : '',
      // Mağdur araç alanları
      ma_ruhsat_sahibi: maArac.ruhsat_sahibi || '',
      ma_tc_kimlik: maArac.tc_kimlik || '',
      ma_belge_tescil_no: maArac.belge_tescil_no || '',
      ma_onarim_gun_suresi: maArac.onarim_gun_suresi || '',
      ma_gecmis_hasar: maArac.gecmis_hasar || '',
      ma_kasko: maArac.kasko ? 1 : 0,
      // Karşı araç alanları
      ka_ruhsat_sahibi: kaArac.ruhsat_sahibi || '',
      ka_tc_kimlik: kaArac.tc_kimlik || '',
      ka_marka: kaArac.marka || '',
      ka_model: kaArac.model || '',
      ka_model_yili: kaArac.model_yili ? String(kaArac.model_yili) : '',
      ka_belge_tescil_no: kaArac.belge_tescil_no || '',
      ka_trafik_sirket: kaArac.trafik_sirket || '',
      ka_trafik_police: kaArac.trafik_police || '',
      ka_kasko: kaArac.kasko ? 1 : 0,
      ka_ruhsat_sahibi_surucu: kaArac.ruhsat_sahibi_surucu || '',
      ka_surucu_ad: kaArac.surucu_ad || '',
      ka_surucu_tc_kimlik: kaArac.surucu_tc_kimlik || ''
    });
    setEditError('');
    setEditM(true);
  };

  const dosyaGuncelle = async () => {
    setEditLoading(true);
    setEditError('');
    const updateData = {
      id: dosya.id,
      dosya_turu: editForm.dosya_turu,
      sigorta_sirket: editForm.sigorta_sirket,
      hasar_no: editForm.hasar_no,
      dosya_kaynagi: editForm.dosya_kaynagi,
      kaza_tarihi: editForm.kaza_tarihi || null,
      kaza_il: editForm.kaza_il,
      kaza_ilce: editForm.kaza_ilce || '',
      acilis_tarihi: editForm.acilis_tarihi || null,
      police_no: editForm.police_no || '',
      sigorta_turu: editForm.sigorta_turu || '',
      talep_turu: editForm.talep_turu || '',
      sorumlu_sigorta: editForm.sorumlu_sigorta || '',
      sakatlik_aciklama: editForm.sakatlik_aciklama || '',
      surucu_ad: editForm.surucu_ad || '',
      surucu_ehliyet: editForm.surucu_ehliyet || '',
      surucu_kusur: editForm.surucu_kusur || '',
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
      magdur_adres: editForm.magdur_adres || '',
      magdur_gelir_durumu: editForm.magdur_gelir_durumu || '',
      sorumlu_id: editForm.sorumlu_id ? parseInt(editForm.sorumlu_id) : null,
      paydas_id: editForm.paydas_id ? parseInt(editForm.paydas_id) : null
    };
    // Mağdur araç alanları
    if (editForm.dosya_turu === 'ADK' || editForm.dosya_turu === 'MDK') {
      updateData.ma_ruhsat_sahibi = editForm.ma_ruhsat_sahibi || '';
      updateData.ma_tc_kimlik = editForm.ma_tc_kimlik || '';
      updateData.ma_belge_tescil_no = editForm.ma_belge_tescil_no || '';
      updateData.ma_onarim_gun_suresi = editForm.ma_onarim_gun_suresi ? parseInt(editForm.ma_onarim_gun_suresi) : null;
      updateData.ma_gecmis_hasar = editForm.ma_gecmis_hasar || '';
      updateData.ma_kasko = editForm.ma_kasko ? 1 : 0;
      // Karşı araç alanları
      updateData.ka_ruhsat_sahibi = editForm.ka_ruhsat_sahibi || '';
      updateData.ka_tc_kimlik = editForm.ka_tc_kimlik || '';
      updateData.ka_marka = editForm.ka_marka || '';
      updateData.ka_model = editForm.ka_model || '';
      updateData.ka_model_yili = editForm.ka_model_yili ? parseInt(editForm.ka_model_yili) : null;
      updateData.ka_belge_tescil_no = editForm.ka_belge_tescil_no || '';
      updateData.ka_trafik_sirket = editForm.ka_trafik_sirket || '';
      updateData.ka_trafik_police = editForm.ka_trafik_police || '';
      updateData.ka_kasko = editForm.ka_kasko ? 1 : 0;
      updateData.ka_ruhsat_sahibi_surucu = editForm.ka_ruhsat_sahibi_surucu || '';
      updateData.ka_surucu_ad = editForm.ka_surucu_ad || '';
      updateData.ka_surucu_tc_kimlik = editForm.ka_surucu_tc_kimlik || '';
    }
    const r = await api.dosyaUpdate(updateData);
    if (r?.success) { load(); setEditM(false); }
    else setEditError(r?.error || 'GÜNCELLEME HATASI');
    setEditLoading(false);
  };

  const dosyaSil = async () => {
    const r = await api.dosyaDelete(dosya.id);
    if (r?.success) { setDosyaSilConfirm(false); setPage('dosya-liste'); }
  };

  const portalOlustur = async () => {
    setPortalCreating(true);
    const r = await api.portalErisimOlustur({dosya_id: dosya.id, giris_yontemi: 'tc_telefon', sms_gonder: false});
    setPortalCreating(false);
    if (r?.success) {
      const d = r.data || {};
      const m = dosya.magdur || {};
      setPortalModal({
        open: true,
        link: d.portal_link || (window.location.origin + '/portal.html#kod=' + d.erisim_kodu),
        erisimKodu: d.erisim_kodu || '',
        tc: m.tc_kimlik || '',
        telefon: m.telefon || '',
        adSoyad: m.ad_soyad || '',
        mevcut: false
      });
    } else {
      // Eğer mevcut varsa bilgiyi göster
      if (r?.error?.includes('ZATEN AKTİF')) {
        const rList = await api.portalErisimList({dosya_id: dosya.id, aktif: 1});
        if (rList?.success) {
          const items = rList.data?.items || [];
          const e = items[0];
          if (e) {
            setPortalModal({
              open: true,
              link: window.location.origin + '/portal.html#kod=' + e.erisim_kodu,
              erisimKodu: e.erisim_kodu || '',
              tc: e.tc_kimlik || '',
              telefon: e.telefon || '',
              adSoyad: e.ad_soyad || '',
              mevcut: true
            });
            return;
          }
        }
        MR.toast?.(r?.error, 'warning');
      } else {
        MR.toast?.(r?.error || 'PORTAL OLUŞTURMA HATASI', 'error');
      }
    }
  };

  const kopyala = (text) => {
    navigator.clipboard.writeText(text).then(() => MR.toast?.('KOPYALANDI', 'success')).catch(() => {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      MR.toast?.('KOPYALANDI', 'success');
    });
  };

  if (loading) return <Loading/>;
  if (!dosya) return <EmptyState icon="AlertCircle" title="DOSYA BULUNAMADI" desc=""/>;

  const magdur = dosya.magdur || {};
  const arac = dosya.araclar?.find(a=>a.taraf==='magdur') || {};
  const karsiArac = dosya.araclar?.find(a=>a.taraf==='karsi') || {};
  const ac = asamaRenk(dosya.asama);
  const u = (k, v) => setEditForm(p => ({...p, [k]: v}));
  const isAvukat = user?.rol === 'avukat';

  // YETKİ KONTROL FONKSİYONU
  const hasYetki = (modul, islem) => {
    if (user?.rol === 'admin') return true;
    return user?.yetkiler?.[modul + '_' + islem] === 1 || user?.yetkiler?.[modul + '_' + islem] === true;
  };

  // Bilgi satır bileşeni
  const InfoRow = ({label, value, mono, bold, color}) => (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:`1px solid ${C.border}`}}>
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
                  background:dosya.dosya_turu==='ADK'?`${C.accent}18`:dosya.dosya_turu==='MDK'?`${C.gold||'#f59e0b'}18`:`${C.purple}18`,
                  color:dosya.dosya_turu==='ADK'?C.accent:dosya.dosya_turu==='MDK'?(C.gold||'#f59e0b'):C.purple}}>
                  {dosya.dosya_turu}
                </span>
                <span style={{padding:'2px 8px',borderRadius:4,fontSize:8,fontWeight:600,background:ac+'18',color:ac,border:`1px solid ${ac}33`}}>
                  {dosya.asama}
                </span>
              </div>
              <div style={{fontSize:14,color:C.text,marginTop:4,fontWeight:700,letterSpacing:0.3}}>
                {magdur.ad_soyad || '-'} {dosya.sigorta_sirket ? `• ${dosya.sigorta_sirket}` : ''} {dosya.hasar_no ? `• ${dosya.hasar_no}` : ''}
              </div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <select value={dosya.asama} onChange={e => asamaDegistirOnay(e.target.value)}
              style={{...S.select,minWidth:180,maxWidth:500,fontSize:10,padding:'6px 10px',background:`${ac}11`,border:`1px solid ${ac}33`,color:ac,fontWeight:600}}>
              {ASAMALAR.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            {hasYetki('dosya','dosya-duzenle') && <button style={{...S.btn,...S.btnP,fontSize:10,padding:'7px 14px'}} onClick={openEditModal}>
              <LIcon name="Edit2" size={12} color="#fff"/> DÜZENLE
            </button>}
            {hasYetki('dosya','dosya-portal') && <button style={{...S.btn,...S.btnS,fontSize:10,padding:'7px 14px'}} disabled={portalCreating}
              onClick={portalOlustur} title="MÜŞTERİ PORTAL ERİŞİMİ OLUŞTUR">
              <LIcon name="Globe" size={12} color="#fff"/> {portalCreating ? 'OLUŞTURULUYOR...' : 'PORTAL'}
            </button>}
            {hasYetki('dosya','dosya-sil') && <button style={{...S.btn,...S.btnD,fontSize:10,padding:'7px 14px'}}
              onClick={() => setDosyaSilConfirm(true)}>
              <LIcon name="Trash2" size={12} color="#fff"/> SİL
            </button>}
          </div>
        </div>
      </div>

      {/* TABS — 3D MAVİ */}
      <div style={{display:'flex',gap:6,marginBottom:12,justifyContent:'flex-start'}}>
        {tabs.map(t => (
          <div key={t.id} onClick={() => setTab(t.id)}
            style={{display:'flex',alignItems:'center',gap:5,padding:'9px 18px',borderRadius:10,fontSize:11,fontWeight:800,cursor:'pointer',
              transition:'all .15s ease', letterSpacing:0.3,
              ...(tab===t.id ? {
                background:'linear-gradient(180deg, #60a5fa 0%, #3b82f6 40%, #2563eb 100%)',
                color:'#fff', border:'none', borderBottom:'2px solid #1d4ed8',
                boxShadow:'0 4px 14px -2px rgba(37,99,235,0.5), 0 2px 4px -1px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.25)',
                textShadow:'0 1px 2px rgba(0,0,0,0.15)'
              } : {
                background:'linear-gradient(180deg, rgba(100,116,139,0.12) 0%, rgba(100,116,139,0.05) 100%)',
                color:C.textSec, border:`1px solid ${C.border}`,
                boxShadow:'0 2px 6px -1px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
                textShadow:'none'
              })}}>
            <LIcon name={t.ic} size={13} color={tab===t.id?'#fff':C.textSec}/>{t.l}
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
              <InfoRow label="DOSYA KAYNAĞI" value={isAvukat ? (dosya.dosya_kaynagi === 'PAYDAŞ/YÖNLENDİREN' ? 'YÖNLENDİRME' : 'CRM') : dosya.dosya_kaynagi}/>
              {!isAvukat && <InfoRow label="AVUKAT" value={dosya.avukat_adi} bold color={C.purple}/>}
              {!isAvukat && dosya.avukat_odeme_orani != null && dosya.avukat_odeme_orani > 0 && <InfoRow label="AVUKAT ÖDEME ORANI" value={`%${dosya.avukat_odeme_orani}`} bold color={C.purple}/>}
              {!isAvukat && <InfoRow label="SORUMLU" value={dosya.sorumlu_adi}/>}
              <InfoRow label="AÇILIŞ TARİHİ" value={dosya.acilis_tarihi}/>
              <InfoRow label="KAZA TARİHİ" value={dosya.kaza_tarihi}/>
              <InfoRow label="KAZA İLİ" value={dosya.kaza_il}/>
              <InfoRow label="KAZA İLÇE" value={dosya.kaza_ilce}/>
              {dosya.police_no && <InfoRow label="POLİÇE NO" value={dosya.police_no} mono/>}
              {dosya.sigorta_turu && <InfoRow label="SİGORTA TÜRÜ" value={dosya.sigorta_turu}/>}
              {dosya.talep_turu && <InfoRow label="TALEP TÜRÜ" value={dosya.talep_turu}/>}
              <InfoRow label="HAKLILIK" value={`%${dosya.haklilik || 0}`} bold color={C.success}/>
              <InfoRow label="KOMİSYON" value={`%${dosya.komisyon_orani || 0}`}/>
              <InfoRow label="HAK MAHRUMİYET TALEP" value={parseInt(dosya.hak_mahrumiyet) === 1 ? 'VAR' : 'YOK'} bold color={parseInt(dosya.hak_mahrumiyet) === 1 ? C.success : C.textMuted}/>
              {dosya.dosya_turu === 'BH' && dosya.sorumlu_sigorta && <InfoRow label="SORUMLU SİGORTA" value={dosya.sorumlu_sigorta}/>}
              {dosya.dosya_turu === 'BH' && dosya.sakatlik_aciklama && <InfoRow label="SAKATLIK AÇIKLAMASI" value={dosya.sakatlik_aciklama}/>}
              {dosya.dosya_turu === 'BH' && dosya.surucu_ad && <InfoRow label="SÜRÜCÜ ADI" value={dosya.surucu_ad}/>}
              {dosya.dosya_turu === 'BH' && dosya.surucu_ehliyet && <InfoRow label="SÜRÜCÜ EHLİYET" value={dosya.surucu_ehliyet}/>}
              {dosya.dosya_turu === 'BH' && dosya.surucu_kusur && <InfoRow label="SÜRÜCÜ KUSUR" value={dosya.surucu_kusur}/>}
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
                {magdur.iban && <InfoRow label="IBAN" value={magdur.iban} mono/>}
                {magdur.adres && <InfoRow label="ADRES" value={magdur.adres}/>}
                {magdur.gelir_durumu && <InfoRow label="GELİR DURUMU" value={magdur.gelir_durumu}/>}
              </div>
            </div>

            {/* MAĞDUR ARAÇ BİLGİLERİ (ADK/MDK) */}
            {(dosya.dosya_turu === 'ADK' || dosya.dosya_turu === 'MDK') && (arac.plaka || getPlaka()) && (
              <div style={S.card}>
                <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8,background:`${C.warning}06`}}>
                  <LIcon name="Truck" size={14} color={C.warning}/>
                  <span style={{fontSize:12,fontWeight:700}}>MAĞDUR ARAÇ</span>
                  <span style={{fontSize:12,fontWeight:800,fontFamily:'monospace',color:C.warning,marginLeft:'auto'}}>{getPlaka()}</span>
                </div>
                <div style={{padding:'10px 14px'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
                    <InfoRow label="ARAÇ SAHİBİ" value={arac.ruhsat_sahibi}/>
                    <InfoRow label="SAHİBİ TC KİMLİK" value={arac.tc_kimlik} mono/>
                    <InfoRow label="MARKA" value={arac.marka}/>
                    <InfoRow label="MODEL" value={arac.model}/>
                    <InfoRow label="MODEL YILI" value={arac.model_yili}/>
                    <InfoRow label="BELGE TESCİL NO" value={arac.belge_tescil_no} mono/>
                    <InfoRow label="ONARIM GÜN SÜRESİ" value={arac.onarim_gun_suresi ? `${arac.onarim_gun_suresi} GÜN` : '-'}/>
                    <InfoRow label="GEÇMİŞ HASAR" value={arac.gecmis_hasar ? arac.gecmis_hasar.toUpperCase() : '-'} bold color={arac.gecmis_hasar === 'var' ? C.danger : C.success}/>
                    <InfoRow label="KASKO" value={arac.kasko ? 'VAR' : 'YOK'} bold color={arac.kasko ? C.success : C.textMuted}/>
                  </div>
                </div>
              </div>
            )}

            {/* KARŞI ARAÇ BİLGİLERİ (ADK/MDK) */}
            {(dosya.dosya_turu === 'ADK' || dosya.dosya_turu === 'MDK') && karsiArac.plaka && (
              <div style={S.card}>
                <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:8,background:`${C.danger}06`}}>
                  <LIcon name="Truck" size={14} color={C.danger}/>
                  <span style={{fontSize:12,fontWeight:700}}>KARŞI ARAÇ</span>
                  <span style={{fontSize:12,fontWeight:800,fontFamily:'monospace',color:C.danger,marginLeft:'auto'}}>{karsiArac.plaka}</span>
                </div>
                <div style={{padding:'10px 14px'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
                    <InfoRow label="ARAÇ SAHİBİ" value={karsiArac.ruhsat_sahibi}/>
                    <InfoRow label="SAHİBİ TC KİMLİK" value={karsiArac.tc_kimlik} mono/>
                    <InfoRow label="MARKA" value={karsiArac.marka}/>
                    <InfoRow label="MODEL" value={karsiArac.model}/>
                    <InfoRow label="MODEL YILI" value={karsiArac.model_yili}/>
                    <InfoRow label="BELGE TESCİL NO" value={karsiArac.belge_tescil_no} mono/>
                    <InfoRow label="TRAFİK SİGORTA" value={karsiArac.trafik_sirket}/>
                    <InfoRow label="POLİÇE NO" value={karsiArac.trafik_police} mono/>
                    <InfoRow label="KASKO" value={karsiArac.kasko ? 'VAR' : 'YOK'} bold color={karsiArac.kasko ? C.success : C.textMuted}/>
                    <InfoRow label="RUHSAT SAHİBİ/SÜRÜCÜ" value={karsiArac.ruhsat_sahibi_surucu ? karsiArac.ruhsat_sahibi_surucu.toUpperCase() : '-'} bold color={karsiArac.ruhsat_sahibi_surucu === 'farkli' ? C.warning : C.success}/>
                    {karsiArac.ruhsat_sahibi_surucu === 'farkli' && (
                      <>
                        <InfoRow label="SÜRÜCÜ ADI SOYADI" value={karsiArac.surucu_ad}/>
                        <InfoRow label="SÜRÜCÜ TC KİMLİK" value={karsiArac.surucu_tc_kimlik} mono/>
                      </>
                    )}
                  </div>
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
                <InfoRow label="TOPLAM TAHSİLAT" value={fmt(dosya.tahsil_edilen || 0)} bold color={C.success}/>
                <InfoRow label="TOPLAM GELİR (BEKLENENLERle)" value={fmt(dosya.toplam_gelir || 0)} color={C.textSec}/>
                <InfoRow label="TOPLAM MASRAF" value={fmt(dosya.toplam_masraf || 0)} bold color={C.danger}/>
                <div style={{margin:'8px 0',borderTop:`1px dashed ${C.border}`}}/>
                <InfoRow label="NET KAR" value={fmt(dosya.net_kar || 0)} bold color={(dosya.net_kar || 0) >= 0 ? C.success : C.danger}/>
                <div style={{margin:'8px 0',padding:10,background:`${C.accent}08`,borderRadius:8,border:`1px solid ${C.accent}22`}}>
                  <div style={{fontSize:10,color:C.textMuted,fontWeight:600,marginBottom:6,letterSpacing:0.5}}>%50 - %50 PAYLAŞIM</div>
                  <InfoRow label="BENİM PAYIM (%50)" value={fmt(dosya.benim_payim || 0)} bold color={C.accent}/>
                  <InfoRow label="AVUKAT PAYI (%50)" value={fmt(dosya.avukat_payi || 0)} bold color={C.purple || '#8b5cf6'}/>
                </div>
                <div style={{margin:'8px 0',borderTop:`1px dashed ${C.border}`}}/>
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
            {hasYetki('dosya','dosya-masraf-ekle') && <button style={{...S.btn,...S.btnP,fontSize:10,padding:'5px 12px'}} onClick={() => setMasrafM(true)}>
              <LIcon name="Plus" size={12} color="#fff"/> YENİ MASRAF
            </button>}
          </div>
          <div>
            {dosya.masraflar?.length > 0 ? (
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead>
                  <tr style={{background:MR.tema==='koyu'?'#0f2342':'#1e40af'}}>
                    {((!hasYetki('dosya','dosya-masraf-ode') && !hasYetki('dosya','dosya-masraf-sil')) ? ['#','MASRAF KALEMİ','TUTAR','DURUM','TARİH'] : ['#','MASRAF KALEMİ','TUTAR','DURUM','KASA','TARİH','KULLANICI','İŞLEM']).map(h =>
                      <th key={h} style={{padding:'8px 10px',textAlign:'left',color:MR.tema==='koyu'?'#FFFFFF':'#1e293b',fontWeight:800,fontSize:'12px',borderBottom:`1px solid ${C.border}`}}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {dosya.masraflar.map((m, i) => {
                    const odenmedi = (m.odeme_durumu || 'odendi') === 'odenmedi';
                    return (
                      <tr key={i} style={{backgroundColor: odenmedi ? `${C.warning}06` : (MR.tema==='koyu'?(i%2===0?'#111827':'#0d1321'):(i%2===0?'#ffffff':'#f0f4ff')), borderBottom:MR.tema==='koyu'?'1px solid rgba(6,182,212,0.1)':'1px solid rgba(99,102,241,0.1)', borderLeft:MR.tema==='koyu'?'3px solid rgba(6,182,212,0.5)':'3px solid rgba(99,102,241,0.4)', boxShadow:MR.tema==='koyu'?'0 2px 8px rgba(0,0,0,0.3)':'0 1px 4px rgba(99,102,241,0.08)', transition:'all .2s', borderRadius:8}}>
                        <td style={{padding:'8px 10px',color:MR.tema==='koyu'?'#e2e8f0':'#1e293b',fontSize:'12px',fontWeight:600}}>{i+1}</td>
                        <td style={{padding:'8px 10px',color:MR.tema==='koyu'?'#e2e8f0':'#1e293b',fontSize:'12px',fontWeight:600}}>{m.masraf_kalemi}</td>
                        <td style={{padding:'8px 10px',fontWeight:700,color:C.danger,fontSize:'12px'}}>{fmt(m.tutar)}</td>
                        <td style={{padding:'8px 10px'}}>
                          {odenmedi ? (
                            <span style={{...S.btnMini,...S.btnMiniW, padding:'4px 12px', fontSize:9, cursor:hasYetki('dosya','dosya-masraf-ode')?'pointer':'default'}}
                              onClick={hasYetki('dosya','dosya-masraf-ode') ? () => { setMasrafOdeItem(m); setMasrafOdeKasa(''); setMasrafOdeModal(true); } : undefined}>
                              <LIcon name="Clock" size={10} color="#000"/> ÖDENMEDİ
                            </span>
                          ) : (
                            <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 10px',borderRadius:6,fontSize:9,fontWeight:700,
                              background:`${C.success}22`,color:C.success,border:`1px solid ${C.success}44`}}>
                              <LIcon name="Check" size={10} color={C.success}/> ÖDENDİ
                            </span>
                          )}
                        </td>
                        {(hasYetki('dosya','dosya-masraf-ode') || hasYetki('dosya','dosya-masraf-sil')) && <td style={{padding:'8px 10px',color:MR.tema==='koyu'?'#e2e8f0':'#1e293b',fontSize:'12px',fontWeight:600}}><Badge text={m.kasa_adi || (odenmedi ? 'BEKLİYOR' : '-')} color={odenmedi ? C.warning : C.cyan}/></td>}
                        <td style={{padding:'8px 10px',color:MR.tema==='koyu'?'#e2e8f0':'#1e293b',fontSize:'12px',fontWeight:600}}>{m.islem_tarihi}</td>
                        {(hasYetki('dosya','dosya-masraf-ode') || hasYetki('dosya','dosya-masraf-sil')) && <td style={{padding:'8px 10px',color:MR.tema==='koyu'?'#e2e8f0':'#1e293b',fontSize:'12px',fontWeight:600}}>{m.kullanici_adi || '-'}</td>}
                        {(hasYetki('dosya','dosya-masraf-ode') || hasYetki('dosya','dosya-masraf-sil')) && <td style={{padding:'8px 10px',color:MR.tema==='koyu'?'#e2e8f0':'#1e293b',fontSize:'12px',fontWeight:600}}>
                          <div style={{display:'flex',gap:4}}>
                            {odenmedi && hasYetki('dosya','dosya-masraf-ode') && (
                              <span style={{cursor:'pointer',display:'flex',padding:'3px 8px',borderRadius:4,background:`${C.success}18`,alignItems:'center',gap:3}}
                                onClick={() => { setMasrafOdeItem(m); setMasrafOdeKasa(''); setMasrafOdeModal(true); }}>
                                <LIcon name="Wallet" size={11} color={C.success}/><span style={{fontSize:9,fontWeight:700,color:C.success}}>ÖDE</span>
                              </span>
                            )}
                            {hasYetki('dosya','dosya-masraf-sil') && <span style={{cursor:'pointer',display:'flex',padding:2,borderRadius:4,background:`${C.danger}11`,width:'fit-content'}}
                              onClick={() => setDeleteConfirm({type:'masraf', id:m.id, text:m.masraf_kalemi})}>
                              <LIcon name="Trash2" size={12} color={C.danger}/>
                            </span>}
                          </div>
                        </td>}
                      </tr>
                    );
                  })}
                  <tr style={{background:MR.tema==='koyu'?'#0f2342':'#1e40af',borderRadius:8}}>
                    <td colSpan={2} style={{padding:'10px 12px',fontWeight:800,textAlign:'right',fontSize:'12px',color:MR.tema==='koyu'?'#FFFFFF':'#1e293b'}}>TOPLAM:</td>
                    <td style={{padding:'10px 12px',fontWeight:800,fontSize:13,color:MR.tema==='koyu'?'#FFFFFF':'#1e293b'}}>{fmt(dosya.toplam_masraf || 0)}</td>
                    <td colSpan={(!hasYetki('dosya','dosya-masraf-ode') && !hasYetki('dosya','dosya-masraf-sil')) ? 2 : 5}/>
                  </tr>
                </tbody>
              </table>
            ) : <EmptyState icon="Receipt" title="MASRAF YOK" desc="YENİ MASRAF EKLE BUTONUYLA MASRAF GİREBİLİRSİNİZ"/>}
          </div>
        </div>
      )}

      {/* EVRAKLAR TAB */}
      {tab === 'evrak' && (
        <div style={{...S.card, maxWidth:'66.67%', margin:'0 auto'}}>
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
                        headers: token ? {'Authorization': 'Bearer ' + token} : {},
                        credentials: 'include',
                        cache: 'no-cache'
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
                <div key={idx} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',
                  margin:'4px 8px',borderRadius:10,
                  border: yukluMu ? `1px solid ${C.success}33` : `1px solid ${C.border}44`,
                  background: yukluMu ? `linear-gradient(180deg, ${C.success}0A 0%, ${C.success}04 100%)` : `linear-gradient(180deg, ${C.bgCard} 0%, ${C.bgHover}44 100%)`,
                  boxShadow: yukluMu ? `0 2px 8px -2px ${C.success}22, 0 1px 3px -1px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.06)` : '0 2px 6px -2px rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.04)',
                  transition:'all .15s ease'}}>
                  {/* SIRA NO */}
                  <span style={{fontSize:9,color:C.textMuted,minWidth:22,textAlign:'center',fontWeight:600}}>{idx+1}</span>
                  {/* DURUM İKONU */}
                  <div style={{width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
                    background:yukluMu ? `${C.success}22` : `${C.border}44`}}>
                    <LIcon name={yukluMu ? 'Check' : 'Minus'} size={15} color={yukluMu ? C.success : C.textMuted}/>
                  </div>
                  {/* EVRAK TÜRÜ ADI */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:yukluMu?700:500,color:yukluMu?C.text:C.textSec,
                      overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tur}</div>
                    {yukluMu && (
                      <div style={{fontSize:8,color:C.textMuted,marginTop:1}}>
                        {yuklenen.map(y => `${y.dosya_adi} (${(y.dosya_boyutu/1024).toFixed(0)}KB)`).join(', ')}
                        {!isAvukat && yuklenen[0]?.kullanici_adi ? ` • ${yuklenen[0].kullanici_adi}` : ''}
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
                  {/* BUTONLAR — 3D MİNİ */}
                  <div style={{display:'flex',gap:4,flexShrink:0}}>
                    {yukluMu && yuklenen.map(y => (
                      <React.Fragment key={y.id}>
                        <button title="ÖN İZLEME" onClick={() => setPreviewEvrak(y)}
                          style={{...S.btnMini,...S.btnMiniP}}>
                          <LIcon name="Eye" size={10} color="#fff"/>
                        </button>
                        <button title="İNDİR" onClick={async () => {
                          try {
                            const token = MR.api.token;
                            const apiBase = MR.api.base || '/api/v1';
                            const r = await fetch(apiBase + '/evrak/download.php?id=' + y.id, {
                              headers: token ? {'Authorization': 'Bearer ' + token} : {},
                              credentials: 'include',
                              cache: 'no-cache'
                            });
                            if (!r.ok) {
                              let msg = 'İNDİRME HATASI: ' + r.status;
                              try { const j = await r.clone().json(); msg = j.error || msg; } catch(ex) {}
                              alert(msg); return;
                            }
                            const blob = await r.blob();
                            const a = document.createElement('a');
                            a.href = URL.createObjectURL(blob);
                            a.download = y.dosya_adi || 'evrak.pdf';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            setTimeout(() => URL.revokeObjectURL(a.href), 2000);
                          } catch(e) { alert('İNDİRME HATASI: ' + e.message); }
                        }}
                          style={{...S.btnMini,...S.btnMiniS}}>
                          <LIcon name="Download" size={10} color="#fff"/>
                        </button>
                        {hasYetki('dosya','dosya-evrak-sil') && <button title="SİL" onClick={() => setDeleteConfirm({type:'evrak', id:y.id, text:y.dosya_adi})}
                          style={{...S.btnMini,...S.btnMiniD}}>
                          <LIcon name="Trash2" size={10} color="#fff"/>
                        </button>}
                      </React.Fragment>
                    ))}
                    {/* YÜKLE BUTONU */}
                    <label title="DOSYA YÜKLE" style={{...S.btn,...(yukluMu ? S.btnW : S.btnP), fontSize:10, padding:'7px 14px', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5}}>
                      <LIcon name="Upload" size={12} color={yukluMu ? '#000' : '#fff'}/> YÜKLE
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.svg,.doc,.docx" style={{display:'none'}} onChange={async (ev) => {
                        const f = ev.target.files[0];
                        if (!f) return;
                        const izinli = ['application/pdf','image/jpeg','image/png','image/svg+xml','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
                        if (!izinli.includes(f.type)) { alert('DESTEKLENMEYEN DOSYA TÜRÜ. İZİN VERİLENLER: PDF, JPG, PNG, SVG, DOC, DOCX'); return; }
                        if (f.size > 20 * 1024 * 1024) { alert('DOSYA BOYUTU EN FAZLA 20MB OLABİLİR'); return; }
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
              {dosya.asama !== 'DOSYA KAPANDI' && hasYetki('dosya','dosya-kapat') && (
                <button style={{...S.btn,...S.btnS,fontSize:10,padding:'5px 12px'}} onClick={() => {
                  api.kasaList().then(r => { if(r?.success) setKasalar(r.data||[]); });
                  // Avukat ödeme oranı: ortak varsa onun odeme_orani, yoksa komisyon_orani veya 50
                  const avukatOran = dosya.avukat_odeme_orani || dosya.komisyon_orani || 50;
                  setKapatForm({
                    tazminat:'', vekalet_ucreti:'', faiz:'', stopaj:'', kdv_oran:'20',
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
          const muvekkileHavale = t - sozlesme;
          const vekalet = parseFloat(kapatForm.vekalet_ucreti) || 0;
          const faiz = parseFloat(kapatForm.faiz) || 0;
          const stopaj = parseFloat(kapatForm.stopaj) || 0;
          const kdvOran = parseFloat(kapatForm.kdv_oran) || 0;
          const kdv = sozlesme * kdvOran / 100;
          const toplamKazanc = sozlesme + vekalet + faiz;
          const dosyaBasi = parseFloat(kapatForm.dosya_basi_odenen) || 0;
          const dosyaMasraflari = dosya.toplam_masraf || 0;
          const netKazanc = toplamKazanc - dosyaMasraflari;

          /* PAY BÖLÜŞÜMÜ: SABİT %50 - %50 */
          const avukatPayYuzde = 50;
          const mrPayYuzde = 50;
          const avukatHakedis = netKazanc * 50 / 100;
          const mrHakedis = netKazanc * 50 / 100;
          const kasayaAktarilacak = netKazanc;
          const kF = (k,v) => setKapatForm(p=>({...p,[k]:v}));

          const hesapRow = (label, val, opts={}) => (
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',
              borderBottom:opts.border?`2px solid ${C.border}`:`1px solid ${C.border}`}}>
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
              aciklama: `${dosya.dosya_no} DOSYA KAPATMA - TAZMİNAT: ${fmt(t)}, NET KAZANÇ: ${fmt(netKazanc)}, AVUKAT HAKEDİŞ (%50): ${fmt(avukatHakedis)}, MR HAKEDİŞ (%50): ${fmt(mrHakedis)}`,
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
              </div>

              {/* AVUKAT BİLGİ BANNER */}
              {hasYetki('dosya','dosya-kapat') && dosya.avukat_adi && (
                <div style={{padding:10,background:`${C.purple}11`,borderRadius:8,marginBottom:16,display:'flex',alignItems:'center',gap:12,border:`1px solid ${C.purple}33`}}>
                  <LIcon name="Scale" size={16} color={C.purple}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:700}}>{dosya.avukat_adi}</div>
                    <div style={{fontSize:9,color:C.textSec}}>
                      {dosya.avukat_firma ? `${dosya.avukat_firma} • ` : ''}{dosya.avukat_baro || ''}
                    </div>
                  </div>
                  <div style={{textAlign:'center',padding:'6px 10px',background:`${C.purple}22`,borderRadius:6}}>
                    <div style={{fontSize:8,color:C.textMuted,fontWeight:600}}>PAY BÖLÜŞÜMÜ</div>
                    <div style={{fontSize:16,fontWeight:900,color:C.purple}}>%50 - %50</div>
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
                {hesapRow('MÜVEKKİLE HAVALE', muvekkileHavale, {bold:true,border:true})}

                <div style={{marginTop:10}}/>
                {hesapRow('NET VEKALET ÜCRETİ', vekalet)}
                {hesapRow('FAİZ', faiz)}
                {hesapRow('STOPAJ', stopaj, {color:C.danger})}
                <div style={{marginTop:6}}/>
                {hesapRow(`KDV %${kdvOran}`, kdv)}

                <div style={{marginTop:10,paddingTop:10,borderTop:`2px solid ${C.accent}44`}}/>
                {hesapRow('TOPLAM KAZANÇ', toplamKazanc, {bold:true,color:C.success})}
                {hesapRow('DOSYA MASRAFLARI (SİSTEMDEN)', dosyaMasraflari, {bold:true,color:C.danger})}
                <div style={{marginTop:6,paddingTop:6,borderTop:`2px solid ${C.success}66`}}/>
                {hesapRow('NET KAZANÇ', netKazanc, {bold:true,color:C.success,big:true})}

                {hasYetki('dosya','dosya-kapat') && <>
                <div style={{marginTop:10,paddingTop:10,borderTop:`2px solid ${C.purple}44`}}/>
                <div style={{fontSize:10,fontWeight:700,color:C.purple,marginBottom:6,display:'flex',alignItems:'center',gap:4}}>
                  PAY BÖLÜŞÜMÜ (%50 - %50)
                </div>
                {hesapRow('AVUKAT HAKEDİŞİ (%50)', avukatHakedis, {bold:true,color:'#8b5cf6'})}
                {hesapRow('MR HASAR HAKEDİŞİ (%50)', mrHakedis, {bold:true,color:C.success,big:true,border:true})}
                </>}
              </div>

              {/* KASA SEÇİMİ */}
              {hasYetki('dosya','dosya-kapat') && <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                <FormGroup label="KAZANÇ AKTARILACAK KASA">
                  <select value={kapatForm.kasa_id} onChange={e=>kF('kasa_id',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:12}}>
                    {kasalar.map(k => <option key={k.id} value={k.id}>{k.ad} ({fmt(k.bakiye)})</option>)}
                  </select>
                </FormGroup>
                <div style={{display:'flex',alignItems:'flex-end',paddingBottom:2}}>
                  <div style={{padding:'10px 16px',background:`${C.success}11`,borderRadius:8,border:`1px solid ${C.success}33`,width:'100%'}}>
                    <div style={{fontSize:9,color:C.textMuted,marginBottom:2}}>KASAYA AKTARILACAK (NET KAZANÇ)</div>
                    <div style={{fontSize:16,fontWeight:800,color:C.success}}>{fmt(kasayaAktarilacak)}</div>
                  </div>
                </div>
              </div>}

              {/* ONAYLA */}
              <button onClick={dosyaKapat} disabled={kapatLoading || !t}
                style={{...S.btn,...S.btnS,justifyContent:'center',padding:14,width:'100%',fontSize:13,fontWeight:800}}>
                <LIcon name="CheckCircle" size={16} color="#fff"/>
                {kapatLoading ? 'KAPATILIYOR...' : (isAvukat ? 'DOSYAYI KAPAT' : 'DOSYAYI KAPAT VE KAZANCI KASAYA AKTAR')}
              </button>
            </div>
          );
        })()}
      </Modal>

      {/* MODALLER */}
      <MR.MasrafEkle open={masrafM} onClose={() => setMasrafM(false)} dosyaId={dosya.id} onOk={load}/>

      {/* MASRAF ÖDEME MODAL */}
      <Modal open={masrafOdeModal} onClose={() => setMasrafOdeModal(false)} title="MASRAF ÖDEMESİ" width="420px">
        {masrafOdeItem && (
          <div style={{display:'grid',gap:12}}>
            <div style={{padding:12,background:`${C.accent}11`,borderRadius:8,border:`1px solid ${C.accent}33`}}>
              <div style={{fontSize:10,color:C.textMuted,marginBottom:4}}>MASRAF KALEMİ</div>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>{masrafOdeItem.masraf_kalemi}</div>
              <div style={{fontSize:10,color:C.textSec,marginTop:4}}>{masrafOdeItem.aciklama || ''}</div>
            </div>
            <div style={{padding:12,background:`${C.danger}11`,borderRadius:8,textAlign:'center'}}>
              <div style={{fontSize:9,color:C.textMuted}}>ÖDENECEK TUTAR</div>
              <div style={{fontSize:24,fontWeight:900,color:C.danger}}>{fmt(masrafOdeItem.tutar)}</div>
            </div>
            <FormGroup label="KASA SEÇİNİZ *">
              <select value={masrafOdeKasa} onChange={e => setMasrafOdeKasa(e.target.value)}
                style={{...S.select,padding:'10px 12px',fontSize:12}}>
                <option value="">KASA SEÇİNİZ</option>
                {kasalar.filter(k => k.aktif !== false && k.aktif !== 0).map(k =>
                  <option key={k.id} value={k.id}>{k.ad} ({fmt(k.bakiye)})</option>
                )}
              </select>
            </FormGroup>
            <div style={{padding:8,background:`${C.warning}11`,borderRadius:6,fontSize:10,color:C.warning}}>
              ÖDEME YAPILDIĞINDA TUTAR SEÇİLEN KASADAN DÜŞÜLECEK.
              {masrafOdeItem.paydas_komisyon_id && ' PAYDAŞ CARİSİNDE DE OTOMATİK ÖDENDİ OLARAK GÜNCELLENECEKTİR.'}
            </div>
            <button onClick={async () => {
              if (!masrafOdeKasa) return;
              setMasrafOdeLoading(true);
              const r = await api.masrafOde({id: masrafOdeItem.id, kasa_id: parseInt(masrafOdeKasa)});
              setMasrafOdeLoading(false);
              if (r?.success) {
                setMasrafOdeModal(false);
                setMasrafOdeItem(null);
                load();
              }
            }} disabled={masrafOdeLoading || !masrafOdeKasa}
              style={{...S.btn,...S.btnS,justifyContent:'center',padding:12,width:'100%',fontSize:12}}>
              <LIcon name="Wallet" size={14} color="#fff"/>
              {masrafOdeLoading ? 'ÖDENİYOR...' : 'ÖDEMEYİ ONAYLA'}
            </button>
          </div>
        )}
      </Modal>

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
                      headers: token ? {'Authorization': 'Bearer ' + token} : {},
                      credentials: 'include',
                      cache: 'no-cache'
                    });
                    if (!r.ok) {
                      let msg = 'İNDİRME HATASI: ' + r.status;
                      try { const j = await r.clone().json(); msg = j.error || msg; } catch(ex) {}
                      alert(msg); return;
                    }
                    const blob = await r.blob();
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = previewEvrak.dosya_adi || 'evrak.pdf';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
                  } catch(e) { alert('İNDİRME HATASI: ' + e.message); }
                }}
                  style={{...S.btn,...S.btnS,padding:'6px 14px',fontSize:10}}>
                  <LIcon name="Download" size={11} color="#fff"/> İNDİR
                </button>
                <button onClick={() => setPreviewEvrak(null)}
                  style={{...S.btn,...S.btnD,padding:'6px 14px',fontSize:10}}>
                  <LIcon name="X" size={11} color="#fff"/> KAPAT
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

      {/* PORTAL BİLGİ MODAL */}
      {portalModal.open && <Modal open={true} onClose={() => setPortalModal(p=>({...p,open:false}))} title={portalModal.mevcut ? 'MEVCUT PORTAL ERİŞİM BİLGİLERİ' : 'PORTAL ERİŞİMİ OLUŞTURULDU'} width="520px">
        <div style={{padding:4}}>
          {portalModal.mevcut && <div style={{padding:'8px 12px', background:`${C.warning}15`, border:`1px solid ${C.warning}33`, borderRadius:8, marginBottom:14, fontSize:11, color:C.warning, fontWeight:600}}>BU DOSYA İÇİN ZATEN AKTİF PORTAL ERİŞİMİ MEVCUT</div>}
          {!portalModal.mevcut && <div style={{padding:'8px 12px', background:`${C.success}15`, border:`1px solid ${C.success}33`, borderRadius:8, marginBottom:14, fontSize:11, color:C.success, fontWeight:600}}>PORTAL ERİŞİMİ BAŞARIYLA OLUŞTURULDU</div>}

          <div style={{fontSize:12, fontWeight:700, color:C.accent, marginBottom:10}}>MÜŞTERİ GİRİŞ BİLGİLERİ</div>

          <div style={{background:C.bgHover, borderRadius:8, padding:12, marginBottom:10, border:`1px solid ${C.border}`}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
              <span style={{fontSize:10, fontWeight:600, color:C.accent}}>MÜŞTERİ GİRİŞ SAYFASI LİNKİ</span>
              <button onClick={() => kopyala(portalModal.link.split('#')[0])} style={{...S.btn, padding:'3px 10px', fontSize:9, ...S.btnP}}>
                <LIcon name="Copy" size={10}/> KOPYALA
              </button>
            </div>
            <div style={{fontSize:9, color:C.textMuted, marginBottom:6}}>MÜŞTERİ BU LİNKTEN TC KİMLİK VE TELEFON İLE GİRİŞ YAPAR</div>
            <a href={portalModal.link.split('#')[0]} target="_blank" rel="noopener noreferrer" style={{display:'block', fontSize:11, color:C.accent, wordBreak:'break-all', fontFamily:'monospace', background:C.bgInput, padding:8, borderRadius:6, border:`1px solid ${C.borderLight}`, textDecoration:'underline', cursor:'pointer'}}>{portalModal.link.split('#')[0]}</a>
          </div>

          <div style={{background:C.bgHover, borderRadius:8, padding:12, marginBottom:10, border:`1px solid ${C.border}`}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
              <span style={{fontSize:10, fontWeight:600, color:C.warning}}>ADMİN İÇİN GÖRÜNTÜLEME LİNKİ</span>
              <button onClick={() => kopyala(portalModal.link)} style={{...S.btn, padding:'3px 10px', fontSize:9, ...S.btnP}}>
                <LIcon name="Copy" size={10}/> KOPYALA
              </button>
            </div>
            <div style={{fontSize:9, color:C.textMuted, marginBottom:6}}>BU LİNK DİREKT GİRİŞ SAĞLAR - SADECE ADMİN KULLANIMI İÇİN</div>
            <a href={portalModal.link} target="_blank" rel="noopener noreferrer" style={{display:'block', fontSize:11, color:C.warning, wordBreak:'break-all', fontFamily:'monospace', background:C.bgInput, padding:8, borderRadius:6, border:`1px solid ${C.borderLight}`, textDecoration:'underline', cursor:'pointer'}}>{portalModal.link}</a>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10}}>
            <div style={{background:C.bgHover, borderRadius:8, padding:12, border:`1px solid ${C.border}`}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4}}>
                <span style={{fontSize:10, fontWeight:600, color:C.textMuted}}>TC KİMLİK</span>
                <button onClick={() => kopyala(portalModal.tc)} style={{...S.btn, padding:'2px 8px', fontSize:9, ...S.btnG}}><LIcon name="Copy" size={9}/></button>
              </div>
              <div style={{fontSize:14, fontWeight:700, letterSpacing:1}}>{portalModal.tc || 'TANIMLI DEĞİL'}</div>
            </div>
            <div style={{background:C.bgHover, borderRadius:8, padding:12, border:`1px solid ${C.border}`}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4}}>
                <span style={{fontSize:10, fontWeight:600, color:C.textMuted}}>TELEFON</span>
                <button onClick={() => kopyala(portalModal.telefon)} style={{...S.btn, padding:'2px 8px', fontSize:9, ...S.btnG}}><LIcon name="Copy" size={9}/></button>
              </div>
              <div style={{fontSize:14, fontWeight:700}}>{portalModal.telefon || 'TANIMLI DEĞİL'}</div>
            </div>
          </div>

          <div style={{background:C.bgHover, borderRadius:8, padding:12, border:`1px solid ${C.border}`, marginBottom:14}}>
            <span style={{fontSize:10, fontWeight:600, color:C.textMuted}}>MÜŞTERİ</span>
            <div style={{fontSize:13, fontWeight:700, marginTop:2}}>{portalModal.adSoyad}</div>
          </div>

          <div style={{background:`${C.accent}08`, borderRadius:8, padding:12, border:`1px solid ${C.accent}22`}}>
            <div style={{fontSize:10, fontWeight:700, color:C.accent, marginBottom:6}}>MÜŞTERİ NASIL GİRİŞ YAPACAK?</div>
            <div style={{fontSize:11, color:C.textSec, lineHeight:1.6}}>
              1. <b>Giriş Sayfası Linkini</b> müşteriye iletin (WhatsApp, e-posta vb.)<br/>
              2. Müşteri TC Kimlik ve Telefon numarası ile giriş yapar<br/>
              3. <b>Admin Görüntüleme Linki</b> direkt giriş sağlar - sadece admin kullanımı içindir
            </div>
          </div>

          <div style={{marginTop:14, display:'flex', gap:8, justifyContent:'flex-end'}}>
            <button onClick={() => kopyala(`Portal Giriş Bilgileri:\nGiriş Sayfası: ${portalModal.link.split('#')[0]}\nDirekt Link (Admin): ${portalModal.link}\nTC Kimlik: ${portalModal.tc}\nTelefon: ${portalModal.telefon}`)} style={{...S.btn, ...S.btnS, fontSize:11}}>
              <LIcon name="Copy" size={12}/> TÜM BİLGİLERİ KOPYALA
            </button>
            <button onClick={() => setPortalModal(p=>({...p,open:false}))} style={{...S.btn, ...S.btnG, fontSize:11}}>KAPAT</button>
          </div>
        </div>
      </Modal>}

      {/* AŞAMA DEĞİŞTİRME ONAY */}
      {asamaOnay && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',animation:'fadeIn .2s ease'}}>
          <div style={{background:C.bgCard,borderRadius:16,padding:0,width:480,maxWidth:'90vw',border:`1px solid ${C.border}`,boxShadow:'0 25px 50px -12px rgba(0,0,0,0.4)',overflow:'hidden'}}>
            <div style={{padding:'20px 24px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:10,background:`${C.warning}08`}}>
              <div style={{width:40,height:40,borderRadius:'50%',background:`${C.warning}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <LIcon name="AlertTriangle" size={20} color={C.warning}/>
              </div>
              <div>
                <div style={{fontSize:14,fontWeight:800,color:C.text}}>AŞAMA DEĞİŞİKLİĞİ ONAY</div>
                <div style={{fontSize:11,color:C.textSec,marginTop:2}}>EMİN MİSİNİZ?</div>
              </div>
            </div>
            <div style={{padding:'20px 24px'}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:16,lineHeight:1.6}}>
                <span style={{color:C.accent,fontWeight:800}}>{(magdur.ad_soyad || dosya.dosya_no || '').toUpperCase()}</span>'IN DOSYA AŞAMASI DEĞİŞTİRİLECEK. ONAYLIYOR MUSUNUZ?
              </div>
              <div style={{padding:'12px 16px',borderRadius:10,background:'#16a34a12',border:'1px solid #16a34a33',marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:600,color:'#16a34a',lineHeight:1.7,opacity:0.85}}>
                  YAPACAĞINIZ DEĞİŞİKLİK SONRASI, SEÇİLEN AŞAMANIN EVRAKI MAĞDURA SMS İLE GÖNDERİLECEKTİR. LÜTFEN EVRAK YÜKLEMEYİ UNUTMAYINIZ.
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderRadius:8,background:`${C.accent}08`,border:`1px solid ${C.accent}22`}}>
                <LIcon name="ArrowRight" size={14} color={C.accent}/>
                <div style={{fontSize:12,color:C.textSec}}>
                  <span style={{fontWeight:600}}>YENİ AŞAMA:</span>{' '}
                  <span style={{fontWeight:800,color:C.accent}}>{asamaOnay}</span>
                </div>
              </div>
            </div>
            <div style={{padding:'16px 24px',borderTop:`1px solid ${C.border}`,display:'flex',gap:10,justifyContent:'flex-end',background:`${C.bgHover}44`}}>
              <button style={{...S.btn,...S.btnG,fontSize:12}} onClick={() => setAsamaOnay(null)}>
                <LIcon name="X" size={14} color={C.textSec}/> İPTAL
              </button>
              <button style={{...S.btn,...S.btnP,fontSize:12}} onClick={asamaDegistirOnayla}>
                <LIcon name="Check" size={14} color="#fff"/> ONAYLA
              </button>
            </div>
          </div>
        </div>
      )}

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
              <option value="MDK">MDK</option>
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
            <MR.DateInput value={editForm.kaza_tarihi||''} onChange={v => u('kaza_tarihi',v)} style={{padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="KAZA İLİ">
            <select value={editForm.kaza_il} onChange={e => u('kaza_il',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="">SEÇİNİZ</option>
              {(ILLER || []).map(il => <option key={il} value={il}>{il}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="KAZA İLÇE">
            <input value={editForm.kaza_ilce||''} onChange={e => u('kaza_ilce',e.target.value)} placeholder="KAZA İLÇE" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="AÇILIŞ TARİHİ">
            <MR.DateInput value={editForm.acilis_tarihi||''} onChange={v => u('acilis_tarihi',v)} style={{padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="POLİÇE NO">
            <input value={editForm.police_no||''} onChange={e => u('police_no',e.target.value)} placeholder="POLİÇE NO" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="SİGORTA TÜRÜ">
            <select value={editForm.sigorta_turu||''} onChange={e => u('sigorta_turu',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="">SEÇİNİZ</option>
              <option value="TRAFİK">TRAFİK</option>
              <option value="KASKO">KASKO</option>
              <option value="İMM">İMM</option>
              <option value="DİĞER">DİĞER</option>
            </select>
          </FormGroup>
          <FormGroup label="TALEP TÜRÜ">
            <select value={editForm.talep_turu||''} onChange={e => u('talep_turu',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="">SEÇİNİZ</option>
              <option value="DEĞER KAYBI">DEĞER KAYBI</option>
              <option value="BEDENİ HASAR">BEDENİ HASAR</option>
              <option value="MOTOR DEĞER KAYBI">MOTOR DEĞER KAYBI</option>
              <option value="DİĞER">DİĞER</option>
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
            <MR.IBANInput value={editForm.magdur_iban||''} onChange={v => u('magdur_iban',v)} style={{padding:'8px 10px',fontSize:11}}/>
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
            <MR.DateInput value={editForm.magdur_dogum_tarihi||''} onChange={v => u('magdur_dogum_tarihi',v)} style={{padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="MESLEK">
            <input value={editForm.magdur_meslek||''} onChange={e => u('magdur_meslek',e.target.value)} placeholder="MESLEK" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
          <FormGroup label="GELİR DURUMU">
            <select value={editForm.magdur_gelir_durumu||''} onChange={e => u('magdur_gelir_durumu',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
              <option value="">SEÇİNİZ</option>
              <option value="ASGARİ ÜCRET">ASGARİ ÜCRET</option>
              <option value="ASGARİ ÜCRET ÜSTÜ">ASGARİ ÜCRET ÜSTÜ</option>
              <option value="SERBEST MESLEK">SERBEST MESLEK</option>
              <option value="EMEKLİ">EMEKLİ</option>
              <option value="ÖĞRENCİ">ÖĞRENCİ</option>
              <option value="ÇALIŞMIYOR">ÇALIŞMIYOR</option>
            </select>
          </FormGroup>
        </div>
        <div style={{marginBottom:14}}>
          <FormGroup label="ADRES">
            <textarea value={editForm.magdur_adres||''} onChange={e => u('magdur_adres',e.target.value.toUpperCase())} placeholder="AÇIK ADRES..." style={{...S.input,minHeight:50,padding:'8px 10px',fontSize:11}}/>
          </FormGroup>
        </div>

        {/* BH DOSYA ALANLARI */}
        {editForm.dosya_turu === 'BH' && (
          <>
            <div style={{fontSize:10,fontWeight:700,color:C.purple,marginBottom:8,display:'flex',alignItems:'center',gap:6,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
              <LIcon name="Heart" size={12} color={C.purple}/> BEDENİ HASAR BİLGİLERİ
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              <FormGroup label="SORUMLU SİGORTA">
                <input value={editForm.sorumlu_sigorta||''} onChange={e => u('sorumlu_sigorta',e.target.value.toUpperCase())} placeholder="SORUMLU SİGORTA" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
              </FormGroup>
              <FormGroup label="SAKATLIK AÇIKLAMASI">
                <input value={editForm.sakatlik_aciklama||''} onChange={e => u('sakatlik_aciklama',e.target.value.toUpperCase())} placeholder="SAKATLIK AÇIKLAMASI" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
              </FormGroup>
              <FormGroup label="SÜRÜCÜ ADI">
                <input value={editForm.surucu_ad||''} onChange={e => u('surucu_ad',e.target.value.toUpperCase())} placeholder="SÜRÜCÜ ADI SOYADI" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
              </FormGroup>
              <FormGroup label="SÜRÜCÜ EHLİYET">
                <input value={editForm.surucu_ehliyet||''} onChange={e => u('surucu_ehliyet',e.target.value.toUpperCase())} placeholder="EHLİYET BİLGİSİ" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
              </FormGroup>
              <FormGroup label="SÜRÜCÜ KUSUR">
                <input value={editForm.surucu_kusur||''} onChange={e => u('surucu_kusur',e.target.value.toUpperCase())} placeholder="KUSUR DURUMU" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
              </FormGroup>
            </div>
          </>
        )}

        {/* MAĞDUR ARAÇ BİLGİLERİ */}
        {(editForm.dosya_turu === 'ADK' || editForm.dosya_turu === 'MDK') && (
          <>
            <div style={{fontSize:10,fontWeight:700,color:C.warning,marginBottom:8,display:'flex',alignItems:'center',gap:6,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
              <LIcon name="Truck" size={12} color={C.warning}/> MAĞDUR ARAÇ BİLGİLERİ
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              <FormGroup label="ARAÇ SAHİBİ ADI SOYADI">
                <input value={editForm.ma_ruhsat_sahibi||''} onChange={e => u('ma_ruhsat_sahibi',e.target.value)} placeholder="ARAÇ SAHİBİ" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
              </FormGroup>
              <FormGroup label="ARAÇ SAHİBİ TC KİMLİK NO">
                <input value={editForm.ma_tc_kimlik||''} onChange={e => u('ma_tc_kimlik',e.target.value)} placeholder="TC KİMLİK NO" maxLength={11} style={{...S.input,padding:'8px 10px',fontSize:11}}/>
              </FormGroup>
              <FormGroup label="BELGE TESCİL NO">
                <input value={editForm.ma_belge_tescil_no||''} onChange={e => u('ma_belge_tescil_no',e.target.value)} placeholder="BELGE TESCİL NO" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
              </FormGroup>
              <FormGroup label="ONARIM GÜN SÜRESİ">
                <input type="number" min="0" value={editForm.ma_onarim_gun_suresi||''} onChange={e => u('ma_onarim_gun_suresi',e.target.value)} placeholder="GÜN" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
              </FormGroup>
              <FormGroup label="GEÇMİŞ HASAR">
                <div style={{display:'flex',gap:8,alignItems:'center',paddingTop:4}}>
                  <div onClick={() => u('ma_gecmis_hasar','var')}
                    style={{padding:'6px 16px',borderRadius:6,fontSize:11,fontWeight:700,cursor:'pointer',
                      background:editForm.ma_gecmis_hasar==='var'?`${C.danger}22`:'transparent',
                      color:editForm.ma_gecmis_hasar==='var'?C.danger:C.textMuted,
                      border:`1px solid ${editForm.ma_gecmis_hasar==='var'?C.danger+'66':C.border}`}}>VAR</div>
                  <div onClick={() => u('ma_gecmis_hasar','yok')}
                    style={{padding:'6px 16px',borderRadius:6,fontSize:11,fontWeight:700,cursor:'pointer',
                      background:editForm.ma_gecmis_hasar==='yok'?`${C.success}22`:'transparent',
                      color:editForm.ma_gecmis_hasar==='yok'?C.success:C.textMuted,
                      border:`1px solid ${editForm.ma_gecmis_hasar==='yok'?C.success+'66':C.border}`}}>YOK</div>
                </div>
              </FormGroup>
              <FormGroup label="KASKO">
                <div style={{display:'flex',gap:8,alignItems:'center',paddingTop:4}}>
                  <div onClick={() => u('ma_kasko',1)}
                    style={{padding:'6px 16px',borderRadius:6,fontSize:11,fontWeight:700,cursor:'pointer',
                      background:editForm.ma_kasko==1?`${C.success}22`:'transparent',
                      color:editForm.ma_kasko==1?C.success:C.textMuted,
                      border:`1px solid ${editForm.ma_kasko==1?C.success+'66':C.border}`}}>VAR</div>
                  <div onClick={() => u('ma_kasko',0)}
                    style={{padding:'6px 16px',borderRadius:6,fontSize:11,fontWeight:700,cursor:'pointer',
                      background:editForm.ma_kasko==0?`${C.danger}22`:'transparent',
                      color:editForm.ma_kasko==0?C.danger:C.textMuted,
                      border:`1px solid ${editForm.ma_kasko==0?C.danger+'66':C.border}`}}>YOK</div>
                </div>
              </FormGroup>
            </div>
          </>
        )}

        {/* KARŞI ARAÇ BİLGİLERİ */}
        {(editForm.dosya_turu === 'ADK' || editForm.dosya_turu === 'MDK') && (
          <>
            <div style={{fontSize:10,fontWeight:700,color:C.danger,marginBottom:8,display:'flex',alignItems:'center',gap:6,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
              <LIcon name="Truck" size={12} color={C.danger}/> KARŞI ARAÇ BİLGİLERİ
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              <FormGroup label="ARAÇ SAHİBİ ADI SOYADI">
                <input value={editForm.ka_ruhsat_sahibi||''} onChange={e => u('ka_ruhsat_sahibi',e.target.value)} placeholder="ARAÇ SAHİBİ" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
              </FormGroup>
              <FormGroup label="ARAÇ SAHİBİ TC KİMLİK NO">
                <input value={editForm.ka_tc_kimlik||''} onChange={e => u('ka_tc_kimlik',e.target.value)} placeholder="TC KİMLİK NO" maxLength={11} style={{...S.input,padding:'8px 10px',fontSize:11}}/>
              </FormGroup>
              <FormGroup label="MARKA">
                <MR.AracMarkaSelect value={editForm.ka_marka||''} onChange={v => {u('ka_marka',v);u('ka_model','');}}/>
              </FormGroup>
              <FormGroup label="MODEL / PAKET">
                <MR.AracModelSelect marka={editForm.ka_marka||''} value={editForm.ka_model||''} onChange={v => u('ka_model',v)}/>
              </FormGroup>
              <FormGroup label="MODEL YILI">
                <select value={editForm.ka_model_yili||''} onChange={e => u('ka_model_yili',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
                  <option value="">SEÇİNİZ</option>
                  {Array.from({length:30},(_,i)=>2026-i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="BELGE TESCİL NO">
                <input value={editForm.ka_belge_tescil_no||''} onChange={e => u('ka_belge_tescil_no',e.target.value)} placeholder="BELGE TESCİL NO" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
              </FormGroup>
              <FormGroup label="TRAFİK SİGORTA ŞİRKETİ">
                <select value={editForm.ka_trafik_sirket||''} onChange={e => u('ka_trafik_sirket',e.target.value)} style={{...S.select,padding:'8px 10px',fontSize:11}}>
                  <option value="">SEÇİNİZ</option>
                  {(SIGORTA || []).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormGroup>
              <FormGroup label="POLİÇE NO">
                <input value={editForm.ka_trafik_police||''} onChange={e => u('ka_trafik_police',e.target.value)} placeholder="POLİÇE NO" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
              </FormGroup>
              <FormGroup label="KASKO">
                <div style={{display:'flex',gap:8,alignItems:'center',paddingTop:4}}>
                  <div onClick={() => u('ka_kasko',1)}
                    style={{padding:'6px 16px',borderRadius:6,fontSize:11,fontWeight:700,cursor:'pointer',
                      background:editForm.ka_kasko==1?`${C.success}22`:'transparent',
                      color:editForm.ka_kasko==1?C.success:C.textMuted,
                      border:`1px solid ${editForm.ka_kasko==1?C.success+'66':C.border}`}}>VAR</div>
                  <div onClick={() => u('ka_kasko',0)}
                    style={{padding:'6px 16px',borderRadius:6,fontSize:11,fontWeight:700,cursor:'pointer',
                      background:editForm.ka_kasko==0?`${C.danger}22`:'transparent',
                      color:editForm.ka_kasko==0?C.danger:C.textMuted,
                      border:`1px solid ${editForm.ka_kasko==0?C.danger+'66':C.border}`}}>YOK</div>
                </div>
              </FormGroup>
              <FormGroup label="RUHSAT SAHİBİ / SÜRÜCÜ">
                <div style={{display:'flex',gap:8,alignItems:'center',paddingTop:4}}>
                  <div onClick={() => u('ka_ruhsat_sahibi_surucu','ayni')}
                    style={{padding:'6px 16px',borderRadius:6,fontSize:11,fontWeight:700,cursor:'pointer',
                      background:editForm.ka_ruhsat_sahibi_surucu==='ayni'?`${C.success}22`:'transparent',
                      color:editForm.ka_ruhsat_sahibi_surucu==='ayni'?C.success:C.textMuted,
                      border:`1px solid ${editForm.ka_ruhsat_sahibi_surucu==='ayni'?C.success+'66':C.border}`}}>AYNI</div>
                  <div onClick={() => u('ka_ruhsat_sahibi_surucu','farkli')}
                    style={{padding:'6px 16px',borderRadius:6,fontSize:11,fontWeight:700,cursor:'pointer',
                      background:editForm.ka_ruhsat_sahibi_surucu==='farkli'?`${C.warning}22`:'transparent',
                      color:editForm.ka_ruhsat_sahibi_surucu==='farkli'?C.warning:C.textMuted,
                      border:`1px solid ${editForm.ka_ruhsat_sahibi_surucu==='farkli'?C.warning+'66':C.border}`}}>FARKLI</div>
                </div>
              </FormGroup>
              {editForm.ka_ruhsat_sahibi_surucu === 'farkli' && (
                <>
                  <FormGroup label="SÜRÜCÜ ADI SOYADI">
                    <input value={editForm.ka_surucu_ad||''} onChange={e => u('ka_surucu_ad',e.target.value)} placeholder="SÜRÜCÜ ADI SOYADI" style={{...S.input,padding:'8px 10px',fontSize:11}}/>
                  </FormGroup>
                  <FormGroup label="SÜRÜCÜ TC KİMLİK NO">
                    <input value={editForm.ka_surucu_tc_kimlik||''} onChange={e => u('ka_surucu_tc_kimlik',e.target.value)} placeholder="TC KİMLİK NO" maxLength={11} style={{...S.input,padding:'8px 10px',fontSize:11}}/>
                  </FormGroup>
                </>
              )}
            </div>
          </>
        )}

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
          <MR.DateInput value={f.islem_tarihi} onChange={v => sF({...f,islem_tarihi:v})} style={{padding:'8px 10px',fontSize:11}}/>
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
