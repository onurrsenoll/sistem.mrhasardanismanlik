/**
 * MR HASAR DANIŞMANLIK - E-POSTA (WEB MAIL)
 * IMAP ile gelen, SMTP ile giden mail yönetimi
 */
const MR_Mail = window.MR || {};

MR_Mail.MailPage = ({setPage, user}) => {
  const {C, S, LIcon, FormGroup, Badge, Loading, api, Confirm} = MR;
  const {useState, useEffect, useRef, useCallback, useMemo} = React;

  /* ═══ STATE ═══ */
  const [altTab, setAltTab] = useState('gelen');
  const [hesaplar, setHesaplar] = useState([]);
  const [seciliHesap, setSeciliHesap] = useState(null);
  const [mailler, setMailler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [mailPage, setMailPage] = useState(1);
  const [mailTotal, setMailTotal] = useState(0);
  const [okunmamis, setOkunmamis] = useState(0);
  const [arama, setArama] = useState('');
  const [seciliMail, setSeciliMail] = useState(null);
  const [detayLoading, setDetayLoading] = useState(false);
  const [mesaj, setMesaj] = useState(null);
  const [seciliIdler, setSeciliIdler] = useState([]);

  /* HESAP AYARLARI */
  const [hesapForm, setHesapForm] = useState({
    email: '', display_name: '', kullanici: '', sifre: '',
    imap_sunucu: 'mail.mrhasardanismanlik.com', imap_port: 993,
    smtp_sunucu: 'mail.mrhasardanismanlik.com', smtp_port: 465,
    guvenlik: 'ssl'
  });
  const [hesapSaving, setHesapSaving] = useState(false);
  const [testSonuc, setTestSonuc] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  /* SIFRE GOZ TOGGLE */
  const [sifreGoster, setSifreGoster] = useState(false);
  /* ADMIN icin: kullanici listesi (mail hesabi atayabilmek icin) */
  const [kullanicilar, setKullanicilar] = useState([]);

  /* Admin ise kullanicilari yukle (mail hesabi atayabilmek icin) */
  useEffect(() => {
    if (user?.rol !== 'admin') return;
    api.kullaniciList && api.kullaniciList().then(r => {
      if (r?.success) setKullanicilar(r.data?.items || r.data || []);
    }).catch(() => {});
  }, [user?.id]);

  /* YENİ MAIL COMPOSE - zengin editor + ekler */
  const [compose, setCompose] = useState(false);
  const [composeData, setComposeData] = useState({alici: '', konu: '', icerik: '', cc: '', bcc: ''});
  const [composeEkler, setComposeEkler] = useState([]);  // [{file, ad, boyut}]
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const [gonderLoading, setGonderLoading] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);

  /* ═══ HESAPLARI YÜKLE ═══ */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await api.mailHesaplar();
      if (r?.success && r.data?.items) {
        setHesaplar(r.data.items);
        if (r.data.items.length > 0) {
          setSeciliHesap(r.data.items[0]);
        }
      }
      setLoading(false);
    })();
  }, []);

  /* ═══ MAİLLERİ YÜKLE ═══ */
  const mailleriYukle = useCallback(async (page, aramaText) => {
    if (!seciliHesap) return;
    setLoading(true);
    const p = {hesap_id: seciliHesap.id, page, limit: 25};
    if (altTab === 'gelen') p.yon = 'gelen';
    else if (altTab === 'giden') p.yon = 'giden';
    else if (altTab === 'yildizli') p.yildizli = 1;
    if (aramaText) p.arama = aramaText;

    const r = await api.mailList(p);
    if (r?.success && r.data) {
      setMailler(r.data.items || []);
      setMailTotal(r.data.pagination?.total || 0);
      setOkunmamis(r.data.okunmamis || 0);
      setMailPage(page);
    }
    setLoading(false);
    setSeciliIdler([]);
  }, [seciliHesap, altTab]);

  useEffect(() => {
    if (seciliHesap) mailleriYukle(1, arama);
  }, [seciliHesap, altTab]);

  /* ═══ SYNC ═══ */
  const sync = async () => {
    if (!seciliHesap || syncLoading) return;
    setSyncLoading(true);
    setMesaj(null);
    const r = await api.mailSync({hesap_id: seciliHesap.id});
    if (r?.success) {
      setMesaj({type: 'success', text: r.message || r.data?.mesaj || 'SENKRONİZASYON TAMAMLANDI'});
      mailleriYukle(1, arama);
    } else {
      setMesaj({type: 'error', text: r?.error || 'SENKRONİZASYON HATASI'});
    }
    setSyncLoading(false);
  };

  /* ═══ MAIL DETAY ═══ */
  const mailDetayAc = async (id) => {
    setDetayLoading(true);
    const r = await api.mailGet(id);
    if (r?.success && r.data) {
      setSeciliMail(r.data);
      // Listedeki okundu durumunu güncelle
      setMailler(prev => prev.map(m => m.id === id ? {...m, okundu: 1} : m));
    }
    setDetayLoading(false);
  };

  /* ═══ MAIL İŞLEMLER ═══ */
  const mailIslem = async (id, islem) => {
    await api.mailIslem({id, islem});
    if (islem === 'sil') {
      setMailler(prev => prev.filter(m => m.id !== id));
      if (seciliMail?.id === id) setSeciliMail(null);
    } else if (islem === 'okundu') {
      setMailler(prev => prev.map(m => m.id === id ? {...m, okundu: 1} : m));
    } else if (islem === 'okunmadi') {
      setMailler(prev => prev.map(m => m.id === id ? {...m, okundu: 0} : m));
    } else if (islem === 'yildiz') {
      setMailler(prev => prev.map(m => m.id === id ? {...m, yildizli: m.yildizli ? 0 : 1} : m));
    }
  };

  const topluIslem = async (islem) => {
    if (seciliIdler.length === 0) return;
    await api.mailIslem({ids: seciliIdler, islem});
    mailleriYukle(mailPage, arama);
    setSeciliIdler([]);
  };

  /* ═══ MAIL GÖNDER - ekler + zengin HTML + imza otomatik ═══ */
  const mailGonder = async () => {
    if (!composeData.alici || !composeData.konu) {
      setMesaj({type: 'error', text: 'ALICI VE KONU ZORUNLU'});
      return;
    }
    if (!seciliHesap?.id) {
      setMesaj({type: 'error', text: 'GÖNDEREN HESAP SEÇİLİ DEĞİL'});
      return;
    }
    setGonderLoading(true);
    /* Editor'den HTML al */
    const htmlIcerik = editorRef.current ? editorRef.current.innerHTML : (composeData.icerik || '');
    let r;
    if (composeEkler.length > 0) {
      /* Multipart/form-data ile ekli gonder */
      const fd = new FormData();
      fd.append('hesap_id', String(seciliHesap.id));
      fd.append('to', composeData.alici);
      fd.append('cc', composeData.cc || '');
      fd.append('bcc', composeData.bcc || '');
      fd.append('subject', composeData.konu);
      fd.append('body_html', htmlIcerik);
      fd.append('body_text', editorRef.current ? editorRef.current.innerText : '');
      composeEkler.forEach(ek => fd.append('ekler[]', ek.file, ek.ad));
      r = await api.mailGonderEkli(fd);
    } else {
      r = await api.mailGonder({
        hesap_id: seciliHesap.id,
        to: composeData.alici, cc: composeData.cc || '', bcc: composeData.bcc || '',
        subject: composeData.konu,
        body_html: htmlIcerik,
        body_text: editorRef.current ? editorRef.current.innerText : ''
      });
    }
    if (r?.success) {
      setMesaj({type: 'success', text: 'MAIL GÖNDERİLDİ' + (composeEkler.length ? ' (' + composeEkler.length + ' ek)' : '')});
      setCompose(false);
      setComposeData({alici: '', konu: '', icerik: '', cc: '', bcc: ''});
      setComposeEkler([]);
      setShowCcBcc(false);
    } else {
      setMesaj({type: 'error', text: r?.error || 'MAIL GÖNDERİLEMEDİ'});
    }
    setGonderLoading(false);
  };

  /* ═══ HESAP KAYDET ═══ */
  const hesapKaydet = async () => {
    /* Validasyon: email + kullanici_adi zorunlu. Sifre yeni hesap icin zorunlu,
       duzenle modunda (id varsa) opsiyonel - bos kalirsa eski korunur. */
    const isUpdate = !!hesapForm.id;
    if (!hesapForm.email || !hesapForm.kullanici) {
      setMesaj({type: 'error', text: 'E-POSTA VE KULLANICI ADI ZORUNLU'});
      return;
    }
    if (!isUpdate && !hesapForm.sifre) {
      setMesaj({type: 'error', text: 'YENİ HESAP İÇİN ŞİFRE ZORUNLU'});
      return;
    }
    setHesapSaving(true);
    /* Backend field isimleri (imap_host/smtp_host/kullanici_adi/gonderen_adi) */
    const payload = {
      email: hesapForm.email,
      gonderen_adi: hesapForm.display_name || '',
      kullanici_adi: hesapForm.kullanici,
      imap_host: hesapForm.imap_sunucu || hesapForm.imap_host || '',
      imap_port: hesapForm.imap_port || 993,
      imap_encryption: hesapForm.guvenlik || 'ssl',
      smtp_host: hesapForm.smtp_sunucu || hesapForm.smtp_host || '',
      smtp_port: hesapForm.smtp_port || 465,
      smtp_encryption: hesapForm.guvenlik || 'ssl',
      etiket: hesapForm.display_name || hesapForm.email,
      aktif: hesapForm.aktif !== undefined ? hesapForm.aktif : 1,
      imza_html: hesapForm.imza_html || ''
    };
    /* Admin baska kullaniciya hesap atayabilir */
    if (hesapForm.kullanici_id) payload.kullanici_id = hesapForm.kullanici_id;
    /* Sifre sadece doldurulmussa gonder (update'te bos = eski korunur) */
    if (hesapForm.sifre) payload.sifre = hesapForm.sifre;

    let r;
    if (isUpdate) {
      payload.id = hesapForm.id;
      r = await api.mailHesapGuncelle(payload);
    } else {
      r = await api.mailHesapKaydet(payload);
    }

    if (r?.success) {
      setMesaj({type: 'success', text: isUpdate ? 'HESAP GÜNCELLENDİ — gelen kutusu açılıyor' : 'MAIL HESABI KAYDEDİLDİ — senkronize ediliyor'});
      /* Listeyi yenile + form'u temizle */
      const r2 = await api.mailHesaplar();
      if (r2?.success && r2.data?.items) {
        setHesaplar(r2.data.items);
        /* Yeni eklenen hesabi sec (en yeni) - kullanici hemen kullanabilsin */
        const yeniId = r.data?.id;
        const secilen = yeniId ? r2.data.items.find(x => x.id == yeniId) : r2.data.items[0];
        if (secilen) setSeciliHesap(secilen);
      }
      yeniHesapModu();
      /* OTOMATIK gelen kutusuna gec + 0.5sn sonra sync tetikle */
      setAltTab('gelen');
      setTimeout(async () => {
        const hsp = (r2?.data?.items || []).find(x => x.id == (r.data?.id || seciliHesap?.id));
        if (hsp && Number(hsp.aktif) === 1) {
          setMesaj({type: 'info', text: 'Mailler senkronize ediliyor...'});
          const ss = await api.mailSync({hesap_id: hsp.id});
          if (ss?.success) {
            setMesaj({type: 'success', text: (ss.data?.yeni || 0) + ' yeni + ' + (ss.data?.guncellenen || 0) + ' güncellenen mail çekildi'});
          }
        }
      }, 500);
    } else {
      setMesaj({type: 'error', text: r?.error || 'HESAP KAYDEDİLEMEDİ'});
    }
    setHesapSaving(false);
  };

  /* HESAP DUZENLE - form'a yukle (sifre HARIC - guvenlik) */
  const hesapDuzenle = (h) => {
    setHesapForm({
      id: h.id,
      email: h.email || '',
      display_name: h.gonderen_adi || '',
      kullanici: h.kullanici_adi || h.email || '',
      sifre: '',  // Bos - kullanici degistirmek isterse yazsin
      imap_sunucu: h.imap_host || 'mail.mrhasardanismanlik.com',
      imap_port: h.imap_port || 993,
      smtp_sunucu: h.smtp_host || 'mail.mrhasardanismanlik.com',
      smtp_port: h.smtp_port || 465,
      guvenlik: h.imap_encryption || 'ssl',
      aktif: h.aktif !== undefined ? h.aktif : 1,
      kullanici_id: h.kullanici_id,
      imza_html: h.imza_html || ''
    });
    setMesaj({type: 'info', text: 'DÜZENLEME MODU: Şifre boş bırakılırsa mevcut korunur'});
    /* Form'a scroll */
    setTimeout(() => { const el = document.getElementById('mail-hesap-form'); if (el) el.scrollIntoView({behavior:'smooth'}); }, 100);
  };

  /* YENİ HESAP - form temizle */
  const yeniHesapModu = () => {
    setHesapForm({
      email: '', display_name: '', kullanici: '', sifre: '',
      imap_sunucu: 'mail.mrhasardanismanlik.com', imap_port: 993,
      smtp_sunucu: 'mail.mrhasardanismanlik.com', smtp_port: 465,
      guvenlik: 'ssl', aktif: 1
    });
  };

  /* HESAP SIL */
  const hesapSil = async (h) => {
    if (!window.confirm(h.email + ' silinecek. Onaylıyor musun?')) return;
    const r = await api.mailHesapSil({id: h.id});
    if (r?.success) {
      setMesaj({type: 'success', text: 'HESAP SİLİNDİ'});
      const r2 = await api.mailHesaplar();
      if (r2?.success) setHesaplar(r2.data?.items || []);
      if (seciliHesap?.id === h.id) setSeciliHesap(null);
    } else {
      setMesaj({type: 'error', text: r?.error || 'SİLME HATASI'});
    }
  };

  /* AKTIF/PASIF TOGGLE — int casting ile string "0"/"1" sorununu engelle */
  const hesapToggle = async (h) => {
    const suankiAktif = Number(h.aktif) === 1;
    const yeni = suankiAktif ? 0 : 1;
    const r = await api.mailHesapToggle(h.id, yeni);
    if (r?.success) {
      setMesaj({type: 'success', text: yeni ? 'HESAP AKTİF EDİLDİ' : 'HESAP PASİFE ALINDI'});
      const r2 = await api.mailHesaplar();
      if (r2?.success) {
        setHesaplar(r2.data?.items || []);
        /* Secili hesabi da guncel ile degistir */
        if (seciliHesap?.id === h.id) {
          const guncel = (r2.data?.items || []).find(x => x.id === h.id);
          if (guncel) setSeciliHesap(guncel);
        }
      }
    } else {
      setMesaj({type: 'error', text: r?.error || 'TOGGLE HATASI'});
    }
  };

  /* ═══ BAĞLANTI TESTİ ═══ */
  const baglanitiTest = async () => {
    setTestLoading(true);
    setTestSonuc(null);
    /* Eger kayitli hesap varsa ID gonder, yoksa form alanlarini backend formatinda gonder */
    const testData = seciliHesap ? {hesap_id: seciliHesap.id} : {
      email: hesapForm.email,
      gonderen_adi: hesapForm.display_name || '',
      kullanici_adi: hesapForm.kullanici,
      sifre: hesapForm.sifre,
      imap_host: hesapForm.imap_sunucu || '',
      imap_port: hesapForm.imap_port || 993,
      imap_encryption: hesapForm.guvenlik || 'ssl',
      smtp_host: hesapForm.smtp_sunucu || '',
      smtp_port: hesapForm.smtp_port || 465,
      smtp_encryption: hesapForm.guvenlik || 'ssl'
    };
    const r = await api.mailTest(testData);
    if (r?.success && r.data) {
      setTestSonuc(r.data);
    } else {
      setTestSonuc({imap: {basarili: false, mesaj: r?.error || 'TEST HATASI'}, smtp: {basarili: false, mesaj: ''}});
    }
    setTestLoading(false);
  };

  /* ═══ YANIT / İLET ═══ */
  const yanitla = (mail) => {
    setComposeData({
      alici: mail.gonderen || '',
      konu: 'RE: ' + (mail.konu || ''),
      icerik: '<br/><br/>---<br/><em>' + (mail.gonderen_adi || mail.gonderen) + ' yazdı:</em><br/>' + (mail.icerik || mail.ozet || ''),
      cc: '', bcc: ''
    });
    setCompose(true);
  };

  const ilet = (mail) => {
    setComposeData({
      alici: '',
      konu: 'FW: ' + (mail.konu || ''),
      icerik: '<br/><br/>---<br/><em>İletilen mail:</em><br/>' + (mail.icerik || mail.ozet || ''),
      cc: '', bcc: ''
    });
    setCompose(true);
  };

  const isAdmin = user?.rol === 'admin';
  const totalPages = Math.ceil(mailTotal / 25);
  const fmt = (d) => d ? new Date(d).toLocaleString('tr-TR') : '-';

  /* ═══ RENDER ═══ */
  if (loading && hesaplar.length === 0) return React.createElement(Loading || 'div', null, 'YÜKLENİYOR...');

  return React.createElement('div', {style: {display: 'flex', flexDirection: 'column', gap: 16}},

    /* BAŞLIK */
    React.createElement('div', {style: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12
    }},
      React.createElement('div', {style: {display: 'flex', alignItems: 'center', gap: 10}},
        React.createElement(LIcon, {name: 'Mail', size: 22, color: C.accent}),
        React.createElement('span', {style: {fontSize: 18, fontWeight: 800, color: C.text}}, 'E-POSTA'),
        okunmamis > 0 && React.createElement(Badge, {text: okunmamis + ' OKUNMAMIŞ', color: C.danger})
      ),
      React.createElement('div', {style: {display: 'flex', gap: 8}},
        React.createElement('button', {
          onClick: () => { setCompose(true); setComposeData({alici:'',konu:'',icerik:'',cc:'',bcc:''}); },
          style: {...S.btn, ...S.btnP, fontSize: 11},
          disabled: !seciliHesap
        }, React.createElement(LIcon, {name: 'PenLine', size: 13, color: '#fff'}), ' YENİ MAIL'),
        React.createElement('button', {
          onClick: sync,
          style: {...S.btn, ...S.btnG, fontSize: 11},
          disabled: !seciliHesap || syncLoading
        }, React.createElement(LIcon, {name: 'RefreshCw', size: 13}), syncLoading ? ' SENKRONİZE...' : ' SENKRONİZE ET')
      )
    ),

    /* MESAJ */
    mesaj && React.createElement('div', {style: {
      padding: '10px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700,
      background: mesaj.type === 'success' ? `${C.success}15` : `${C.danger}15`,
      color: mesaj.type === 'success' ? C.success : C.danger,
      border: `1px solid ${mesaj.type === 'success' ? C.success : C.danger}33`
    }}, mesaj.text),

    /* HESAP YOK UYARISI */
    hesaplar.length === 0 && !loading && React.createElement('div', {style: {
      padding: 30, textAlign: 'center', background: `${C.warning}08`, borderRadius: 14,
      border: `1px solid ${C.warning}22`
    }},
      React.createElement(LIcon, {name: 'MailWarning', size: 40, color: C.warning}),
      React.createElement('div', {style: {fontSize: 14, fontWeight: 800, color: C.warning, marginTop: 12}},
        'HENÜZ MAIL HESABI EKLENMEMİŞ'),
      React.createElement('div', {style: {fontSize: 12, color: C.textSec, marginTop: 8}},
        'Aşağıdaki "HESAP AYARLARI" sekmesinden mail hesabınızı ekleyin.'),
      React.createElement('button', {
        onClick: () => setAltTab('ayarlar'),
        style: {...S.btn, ...S.btnP, marginTop: 16, fontSize: 12}
      }, React.createElement(LIcon, {name: 'Settings', size: 14, color: '#fff'}), ' HESAP AYARLARI')
    ),

    /* TAB NAVİGASYON */
    React.createElement('div', {style: {
      display: 'flex', gap: 4, background: C.bgHover, borderRadius: 12, padding: 4, flexWrap: 'wrap'
    }},
      [{id:'gelen',label:'GELEN KUTUSU',icon:'Inbox',color:C.accent,badge:okunmamis},
       {id:'giden',label:'GÖNDERİLENLER',icon:'Send',color:C.success},
       {id:'yildizli',label:'YILDIZLI',icon:'Star',color:'#f59e0b'},
       (isAdmin || (MR.hasYetki && MR.hasYetki(user,'eposta','eposta-ayarlar'))) && {id:'ayarlar',label:'HESAP AYARLARI',icon:'Settings',color:C.purple||'#8b5cf6'}
      ].filter(Boolean).map(t =>
        React.createElement('div', {
          key: t.id,
          onClick: () => { setAltTab(t.id); setSeciliMail(null); },
          style: {
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            background: altTab === t.id ? C.bgCard : 'transparent',
            border: altTab === t.id ? `1px solid ${C.border}` : '1px solid transparent',
            boxShadow: altTab === t.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            transition: 'all .2s'
          }
        },
          React.createElement(LIcon, {name: t.icon, size: 14, color: altTab === t.id ? t.color : C.textMuted}),
          React.createElement('span', {style: {fontSize: 11, fontWeight: altTab === t.id ? 700 : 500,
            color: altTab === t.id ? C.text : C.textMuted}}, t.label),
          t.badge > 0 && React.createElement('span', {style: {
            fontSize: 9, fontWeight: 800, color: '#fff', background: C.danger,
            borderRadius: 10, padding: '1px 6px', minWidth: 18, textAlign: 'center'
          }}, t.badge)
        )
      )
    ),

    /* ═══ COMPOSE MODAL ═══ */
    compose && React.createElement('div', {style: {
      background: C.bgCard, borderRadius: 14, padding: 20,
      border: `1px solid ${C.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
    }},
      React.createElement('div', {style: {display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}},
        React.createElement('span', {style: {fontSize: 14, fontWeight: 800, color: C.text}},
          React.createElement(LIcon, {name: 'PenLine', size: 16, color: C.accent}), ' YENİ MAIL'),
        React.createElement('button', {onClick: () => setCompose(false), style: {...S.btn, padding: '4px 8px'}},
          React.createElement(LIcon, {name: 'X', size: 14}))
      ),
      React.createElement('div', {style: {display: 'grid', gap: 10}},
        React.createElement(FormGroup, {label: 'ALICI'},
          React.createElement('input', {style: S.input, value: composeData.alici,
            onChange: e => setComposeData(p => ({...p, alici: e.target.value})),
            placeholder: 'ornek@email.com'})
        ),
        !showCcBcc && React.createElement('div', {
          onClick: () => setShowCcBcc(true),
          style: {fontSize: 11, color: C.accent, cursor: 'pointer', fontWeight: 600}
        }, '+ CC / BCC EKLE'),
        showCcBcc && React.createElement(FormGroup, {label: 'CC'},
          React.createElement('input', {style: S.input, value: composeData.cc,
            onChange: e => setComposeData(p => ({...p, cc: e.target.value})),
            placeholder: 'Virgülle ayırın'})
        ),
        showCcBcc && React.createElement(FormGroup, {label: 'BCC'},
          React.createElement('input', {style: S.input, value: composeData.bcc,
            onChange: e => setComposeData(p => ({...p, bcc: e.target.value})),
            placeholder: 'Virgülle ayırın'})
        ),
        React.createElement(FormGroup, {label: 'KONU'},
          React.createElement('input', {style: S.input, value: composeData.konu,
            onChange: e => setComposeData(p => ({...p, konu: e.target.value})),
            placeholder: 'Mail konusu'})
        ),
        /* ═══ ZENGIN EDITOR TOOLBAR + IÇERIK ═══ */
        React.createElement(FormGroup, {label: 'İÇERİK (Bold/İtalik/Renk/Font/Boyut destekli)'},
          /* TOOLBAR */
          React.createElement('div', {style: {
            display: 'flex', flexWrap: 'wrap', gap: 4, padding: 6,
            background: C.bgInput || '#1e293b', borderRadius: '8px 8px 0 0',
            border: '1px solid ' + C.border, borderBottom: 'none'
          }},
            /* Font Family */
            React.createElement('select', {
              onChange: e => { document.execCommand('fontName', false, e.target.value); editorRef.current && editorRef.current.focus(); },
              style: {fontSize: 11, padding: '3px 6px', borderRadius: 4, background: C.bgCard, color: C.text, border: '1px solid ' + C.border}
            },
              ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia', 'Tahoma', 'Trebuchet MS', 'Manrope']
                .map(f => React.createElement('option', {key: f, value: f, style: {fontFamily: f}}, f))
            ),
            /* Font Size */
            React.createElement('select', {
              onChange: e => { document.execCommand('fontSize', false, e.target.value); editorRef.current && editorRef.current.focus(); },
              style: {fontSize: 11, padding: '3px 6px', borderRadius: 4, background: C.bgCard, color: C.text, border: '1px solid ' + C.border}
            },
              ['1','2','3','4','5','6','7'].map(s => React.createElement('option', {key: s, value: s}, 'Boyut ' + s))
            ),
            /* Format butonlari */
            ['B', 'I', 'U', 'S'].map((ch, idx) => {
              const cmd = ['bold','italic','underline','strikeThrough'][idx];
              return React.createElement('button', {
                key: cmd, type: 'button',
                title: ['Kalin','İtalik','Alti cizili','Ustu cizili'][idx],
                onClick: () => { document.execCommand(cmd); editorRef.current && editorRef.current.focus(); },
                style: {padding: '4px 10px', fontSize: 11, fontWeight: 800, fontStyle: cmd === 'italic' ? 'italic' : 'normal', textDecoration: cmd === 'underline' ? 'underline' : (cmd === 'strikeThrough' ? 'line-through' : 'none'), background: C.bgCard, color: C.text, border: '1px solid ' + C.border, borderRadius: 4, cursor: 'pointer'}
              }, ch);
            }),
            /* Renk */
            React.createElement('input', {
              type: 'color',
              title: 'Yazı rengi',
              onChange: e => { document.execCommand('foreColor', false, e.target.value); editorRef.current && editorRef.current.focus(); },
              style: {width: 28, height: 24, border: '1px solid ' + C.border, borderRadius: 4, cursor: 'pointer', background: 'transparent'}
            }),
            /* Arka plan rengi */
            React.createElement('input', {
              type: 'color',
              title: 'Arka plan rengi',
              onChange: e => { document.execCommand('hiliteColor', false, e.target.value); editorRef.current && editorRef.current.focus(); },
              style: {width: 28, height: 24, border: '1px solid ' + C.border, borderRadius: 4, cursor: 'pointer', background: '#fff'}
            }),
            /* Listeler */
            React.createElement('button', {
              type: 'button', title: 'Madde işaretli liste',
              onClick: () => { document.execCommand('insertUnorderedList'); editorRef.current && editorRef.current.focus(); },
              style: {padding: '4px 10px', fontSize: 11, background: C.bgCard, color: C.text, border: '1px solid ' + C.border, borderRadius: 4, cursor: 'pointer'}
            }, '• Liste'),
            React.createElement('button', {
              type: 'button', title: 'Numaralı liste',
              onClick: () => { document.execCommand('insertOrderedList'); editorRef.current && editorRef.current.focus(); },
              style: {padding: '4px 10px', fontSize: 11, background: C.bgCard, color: C.text, border: '1px solid ' + C.border, borderRadius: 4, cursor: 'pointer'}
            }, '1. Liste'),
            /* Link */
            React.createElement('button', {
              type: 'button', title: 'Bağlantı ekle',
              onClick: () => { const u = prompt('Link URL:'); if (u) { document.execCommand('createLink', false, u); editorRef.current && editorRef.current.focus(); } },
              style: {padding: '4px 10px', fontSize: 11, background: C.bgCard, color: C.text, border: '1px solid ' + C.border, borderRadius: 4, cursor: 'pointer'}
            }, '🔗 Link'),
            /* Hizala */
            ['Left','Center','Right','Justify'].map(h => React.createElement('button', {
              key: h, type: 'button',
              title: 'Hizala ' + h,
              onClick: () => { document.execCommand('justify' + h); editorRef.current && editorRef.current.focus(); },
              style: {padding: '4px 8px', fontSize: 11, background: C.bgCard, color: C.text, border: '1px solid ' + C.border, borderRadius: 4, cursor: 'pointer'}
            }, h.charAt(0))),
            /* Format temizle */
            React.createElement('button', {
              type: 'button', title: 'Biçimi temizle',
              onClick: () => { document.execCommand('removeFormat'); editorRef.current && editorRef.current.focus(); },
              style: {padding: '4px 8px', fontSize: 11, background: C.bgCard, color: C.warning, border: '1px solid ' + C.border, borderRadius: 4, cursor: 'pointer'}
            }, '✕ Temizle')
          ),
          /* CONTENT EDITABLE BODY */
          React.createElement('div', {
            ref: editorRef,
            contentEditable: true,
            suppressContentEditableWarning: true,
            style: {
              ...S.input, minHeight: 200, padding: 12,
              borderRadius: '0 0 8px 8px',
              borderTop: 'none',
              fontFamily: 'inherit', textTransform: 'none',
              overflowY: 'auto', maxHeight: 400
            },
            dangerouslySetInnerHTML: { __html: composeData.icerik || '' },
            onInput: e => { /* HTML editor.innerHTML'den gonder() icinde alinir */ }
          })
        ),

        /* ═══ EKLER ═══ */
        React.createElement(FormGroup, {label: 'EKLER (Dosya, foto, PDF... istediğin kadar)'},
          React.createElement('div', null,
            React.createElement('button', {
              type: 'button',
              onClick: () => fileInputRef.current && fileInputRef.current.click(),
              style: {...S.btn, fontSize: 11, padding: '6px 12px'}
            }, '📎 DOSYA EKLE'),
            React.createElement('input', {
              type: 'file', ref: fileInputRef, multiple: true, style: {display: 'none'},
              onChange: e => {
                const files = Array.from(e.target.files || []);
                const yeni = files.map(f => ({file: f, ad: f.name, boyut: f.size}));
                setComposeEkler(prev => [...prev, ...yeni]);
                e.target.value = '';
              }
            }),
            composeEkler.length > 0 && React.createElement('div', {style: {marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6}},
              composeEkler.map((ek, idx) => React.createElement('div', {
                key: idx,
                style: {display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: C.accent + '15', border: '1px solid ' + C.accent + '44', borderRadius: 6, fontSize: 11}
              },
                React.createElement('span', null, '📄 ' + ek.ad + ' (' + Math.round(ek.boyut/1024) + ' KB)'),
                React.createElement('button', {
                  type: 'button',
                  onClick: () => setComposeEkler(prev => prev.filter((_, i) => i !== idx)),
                  style: {background: 'transparent', border: 'none', color: C.danger, cursor: 'pointer', fontSize: 14, padding: 0}
                }, '✕')
              ))
            )
          )
        ),

        React.createElement('div', {style: {display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12}},
          React.createElement('button', {onClick: () => { setCompose(false); setComposeEkler([]); }, style: {...S.btn, fontSize: 11}}, 'İPTAL'),
          React.createElement('button', {
            onClick: mailGonder, disabled: gonderLoading,
            style: {...S.btn, ...S.btnP, fontSize: 11}
          }, React.createElement(LIcon, {name: 'Send', size: 13, color: '#fff'}),
            gonderLoading ? ' GÖNDERİLİYOR...' : ' GÖNDER' + (composeEkler.length ? ' (' + composeEkler.length + ' ek)' : ''))
        )
      )
    ),

    /* ═══ MAIL LİSTESİ ═══ */
    (altTab === 'gelen' || altTab === 'giden' || altTab === 'yildizli') && React.createElement('div', {style: {
      display: 'grid', gridTemplateColumns: seciliMail ? '1fr 1.2fr' : '1fr', gap: 16
    }},
      /* SOL: MAIL LİSTESİ */
      React.createElement('div', {style: {background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden'}},
        /* ARAMA + TOPLU İŞLEM */
        React.createElement('div', {style: {padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8, alignItems: 'center'}},
          React.createElement('input', {
            style: {...S.input, flex: 1, fontSize: 11}, value: arama,
            onChange: e => setArama(e.target.value),
            onKeyDown: e => e.key === 'Enter' && mailleriYukle(1, arama),
            placeholder: 'Mail ara...'
          }),
          React.createElement('button', {onClick: () => mailleriYukle(1, arama), style: {...S.btn, padding: '6px 10px'}},
            React.createElement(LIcon, {name: 'Search', size: 13})),
          seciliIdler.length > 0 && React.createElement('button', {
            onClick: () => topluIslem('okundu'),
            style: {...S.btn, ...S.btnG, padding: '6px 10px', fontSize: 10}
          }, 'OKUNDU'),
          seciliIdler.length > 0 && React.createElement('button', {
            onClick: () => topluIslem('sil'),
            style: {...S.btn, padding: '6px 10px', fontSize: 10, color: C.danger}
          }, 'SİL')
        ),

        /* MAIL SATIRLARI */
        React.createElement('div', {style: {maxHeight: 'calc(100vh - 320px)', overflowY: 'auto'}},
          loading ? React.createElement('div', {style: {padding: 30, textAlign: 'center', color: C.textMuted, fontSize: 12}}, 'YÜKLENİYOR...') :
          mailler.length === 0 ? React.createElement('div', {style: {padding: 40, textAlign: 'center'}},
            React.createElement(LIcon, {name: 'InboxIcon' in (window.lucide||{}) ? 'Inbox' : 'Mail', size: 36, color: C.textMuted}),
            React.createElement('div', {style: {fontSize: 13, fontWeight: 600, color: C.textMuted, marginTop: 12}},
              altTab === 'gelen' ? 'GELEN KUTUSU BOŞ' : altTab === 'giden' ? 'GÖNDERİLEN MAİL YOK' : 'YILDIZLI MAİL YOK'),
            React.createElement('div', {style: {fontSize: 11, color: C.textMuted, marginTop: 4}},
              '"SENKRONİZE ET" BUTONUNA BASARAK MAİLLERİNİZİ ÇEKEBİLİRSİNİZ')
          ) :
          mailler.map(m => React.createElement('div', {
            key: m.id,
            onClick: () => mailDetayAc(m.id),
            style: {
              padding: '12px 16px', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start',
              borderBottom: `1px solid ${C.border}08`,
              background: seciliMail?.id === m.id ? `${C.accent}08` : (!m.okundu ? `${C.accent}04` : 'transparent'),
              transition: 'background .15s'
            }
          },
            /* CHECKBOX */
            React.createElement('input', {
              type: 'checkbox', checked: seciliIdler.includes(m.id),
              onClick: e => e.stopPropagation(),
              onChange: e => {
                if (e.target.checked) setSeciliIdler(p => [...p, m.id]);
                else setSeciliIdler(p => p.filter(i => i !== m.id));
              },
              style: {marginTop: 3, accentColor: C.accent}
            }),
            /* YILDIZ */
            React.createElement('div', {
              onClick: e => { e.stopPropagation(); mailIslem(m.id, 'yildiz'); },
              style: {cursor: 'pointer', marginTop: 1}
            }, React.createElement(LIcon, {name: 'Star', size: 14,
              color: m.yildizli ? '#f59e0b' : C.textMuted})),
            /* İÇERİK */
            React.createElement('div', {style: {flex: 1, minWidth: 0}},
              React.createElement('div', {style: {display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8}},
                React.createElement('span', {style: {
                  fontSize: 12, fontWeight: m.okundu ? 500 : 800, color: C.text,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%'
                }}, altTab === 'giden' ? (m.alici || '-') : (m.gonderen_adi || m.gonderen || '-')),
                React.createElement('span', {style: {fontSize: 10, color: C.textMuted, whiteSpace: 'nowrap'}}, fmt(m.tarih))
              ),
              React.createElement('div', {style: {
                fontSize: 11, fontWeight: m.okundu ? 400 : 700, color: m.okundu ? C.textSec : C.text,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2
              }}, m.konu || '(KONU YOK)'),
              React.createElement('div', {style: {
                fontSize: 10, color: C.textMuted, whiteSpace: 'nowrap', overflow: 'hidden',
                textOverflow: 'ellipsis', marginTop: 2
              }}, m.ozet || ''),
              m.ek_sayisi > 0 && React.createElement('span', {style: {
                fontSize: 9, color: C.textMuted, display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 3
              }}, React.createElement(LIcon, {name: 'Paperclip', size: 10}), m.ek_sayisi + ' EK')
            )
          ))
        ),

        /* SAYFALAMA */
        totalPages > 1 && React.createElement('div', {style: {
          padding: '10px 16px', borderTop: `1px solid ${C.border}`, display: 'flex',
          justifyContent: 'center', gap: 4, flexWrap: 'wrap'
        }},
          Array.from({length: Math.min(totalPages, 10)}, (_, i) => i + 1).map(p =>
            React.createElement('div', {
              key: p, onClick: () => mailleriYukle(p, arama),
              style: {
                padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: mailPage === p ? C.accent : 'transparent',
                color: mailPage === p ? '#fff' : C.textMuted
              }
            }, p)
          )
        )
      ),

      /* SAĞ: MAIL DETAY */
      seciliMail && React.createElement('div', {style: {
        background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`,
        overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }},
        /* DETAY HEADER */
        React.createElement('div', {style: {
          padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
        }},
          React.createElement('div', {style: {flex: 1}},
            React.createElement('div', {style: {fontSize: 15, fontWeight: 800, color: C.text, lineHeight: 1.4}},
              seciliMail.konu || '(KONU YOK)'),
            React.createElement('div', {style: {fontSize: 11, color: C.textSec, marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 8}},
              React.createElement('span', null, React.createElement('strong', null, 'KİMDEN: '),
                (seciliMail.gonderen_adi ? seciliMail.gonderen_adi + ' ' : '') + '<' + (seciliMail.gonderen || '') + '>'),
              React.createElement('span', null, React.createElement('strong', null, 'KİME: '), seciliMail.alici || '-')
            ),
            seciliMail.cc && React.createElement('div', {style: {fontSize: 10, color: C.textMuted, marginTop: 2}},
              React.createElement('strong', null, 'CC: '), seciliMail.cc),
            React.createElement('div', {style: {fontSize: 10, color: C.textMuted, marginTop: 4}}, fmt(seciliMail.tarih))
          ),
          React.createElement('div', {style: {display: 'flex', gap: 6}},
            React.createElement('button', {onClick: () => yanitla(seciliMail), style: {...S.btn, padding: '6px 10px', fontSize: 10}},
              React.createElement(LIcon, {name: 'Reply', size: 12}), ' YANITLA'),
            React.createElement('button', {onClick: () => ilet(seciliMail), style: {...S.btn, padding: '6px 10px', fontSize: 10}},
              React.createElement(LIcon, {name: 'Forward', size: 12}), ' İLET'),
            React.createElement('button', {
              onClick: () => { mailIslem(seciliMail.id, 'sil'); },
              style: {...S.btn, padding: '6px 10px', fontSize: 10, color: C.danger}
            }, React.createElement(LIcon, {name: 'Trash2', size: 12})),
            React.createElement('button', {
              onClick: () => setSeciliMail(null),
              style: {...S.btn, padding: '6px 10px'}
            }, React.createElement(LIcon, {name: 'X', size: 12}))
          )
        ),
        /* DETAY BODY - HTML once, yoksa text, yoksa fallback. EKLER varsa altinda goster. */
        detayLoading ? React.createElement('div', {style: {padding: 30, textAlign: 'center', color: C.textMuted}}, 'YÜKLENİYOR...') :
        React.createElement('div', {style: {
          padding: 20, flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 420px)'
        }},
          (seciliMail.govde_html || seciliMail.icerik) ?
            React.createElement('div', {
              style: {fontSize: 13, lineHeight: 1.7, color: C.text, wordBreak: 'break-word'},
              dangerouslySetInnerHTML: {__html: seciliMail.govde_html || seciliMail.icerik}
            }) :
            React.createElement('div', {style: {fontSize: 13, color: C.textSec, whiteSpace: 'pre-wrap'}},
              seciliMail.govde_text || seciliMail.icerik_text || '(İÇERİK YOK)'),
          /* EKLER */
          seciliMail.ekler && (() => {
            let ekListesi = [];
            try { ekListesi = typeof seciliMail.ekler === 'string' ? JSON.parse(seciliMail.ekler) : seciliMail.ekler; } catch(e) {}
            if (!Array.isArray(ekListesi) || ekListesi.length === 0) return null;
            return React.createElement('div', {style: {marginTop: 16, padding: 12, background: C.accent + '08', borderRadius: 8, border: '1px solid ' + C.accent + '33'}},
              React.createElement('div', {style: {fontSize: 11, fontWeight: 800, color: C.accent, marginBottom: 8, letterSpacing: 0.5}},
                '📎 EKLER (' + ekListesi.length + ')'),
              React.createElement('div', {style: {display: 'flex', flexWrap: 'wrap', gap: 6}},
                ekListesi.map((ek, idx) => React.createElement('a', {
                  key: idx,
                  href: api.mailEkIndirUrl(seciliMail.id, idx),
                  target: '_blank',
                  download: ek.ad || 'ek',
                  style: {display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: C.bgCard, border: '1px solid ' + C.border, borderRadius: 6, fontSize: 11, color: C.text, textDecoration: 'none'}
                },
                  React.createElement('span', {style: {fontSize: 14}}, '📄'),
                  React.createElement('span', null, ek.ad || ('ek-' + (idx+1))),
                  ek.boyut && React.createElement('span', {style: {color: C.textMuted, fontSize: 10}}, '(' + Math.round(ek.boyut/1024) + ' KB)'),
                  React.createElement('span', {style: {color: C.accent, fontWeight: 700}}, '⬇')
                ))
              )
            );
          })()
        )
      )
    ),

    /* ═══ HESAP AYARLARI - admin VEYA eposta-ayarlar yetkili kullanici ═══ */
    altTab === 'ayarlar' && (isAdmin || (MR.hasYetki && MR.hasYetki(user, 'eposta', 'eposta-ayarlar'))) && React.createElement('div', {style: {display: 'grid', gap: 16}},

      /* MEVCUT HESAPLAR */
      hesaplar.length > 0 && React.createElement('div', {style: {
        background: C.bgCard, borderRadius: 14, padding: 20, border: `1px solid ${C.border}`
      }},
        React.createElement('div', {style: {fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 16}},
          React.createElement(LIcon, {name: 'Users', size: 16, color: C.accent}), ' KAYITLI HESAPLAR'),
        hesaplar.map(h => React.createElement('div', {
          key: h.id,
          style: {
            padding: '12px 16px', borderRadius: 10, display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', background: seciliHesap?.id === h.id ? `${C.accent}08` : 'transparent',
            border: `1px solid ${seciliHesap?.id === h.id ? C.accent + '33' : C.border}`,
            marginBottom: 8, cursor: 'pointer', opacity: Number(h.aktif) === 1 ? 1 : 0.55
          },
          onClick: () => setSeciliHesap(h)
        },
          React.createElement('div', {style: {minWidth: 0, flex: 1}},
            React.createElement('div', {style: {fontSize: 13, fontWeight: 700, color: C.text}}, h.email),
            React.createElement('div', {style: {fontSize: 10, color: C.textMuted, marginTop: 2}},
              (h.gonderen_adi || h.display_name || '-'),
              ' | Son sync: ', h.son_sync ? fmt(h.son_sync) : 'HİÇ',
              h.son_hata ? ' | ⚠ ' + h.son_hata.substring(0,40) : ''
            )
          ),
          (() => { const aktifBool = Number(h.aktif) === 1; return React.createElement('div', {style: {display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0}},
            React.createElement(Badge, {text: aktifBool ? 'AKTİF' : 'PASİF', color: aktifBool ? C.success : C.danger}),
            // DÜZENLE
            React.createElement('button', {
              title: 'Düzenle',
              onClick: e => { e.stopPropagation(); hesapDuzenle(h); },
              style: {...S.btn, ...S.btnG, padding: '4px 8px', fontSize: 10}
            }, React.createElement(LIcon, {name: 'Edit', size: 12}), ' DÜZENLE'),
            // AKTİF/PASİF TOGGLE (TEXT buton - net gösterim)
            React.createElement('button', {
              title: aktifBool ? 'Pasife al' : 'Aktif et',
              onClick: e => { e.stopPropagation(); hesapToggle(h); },
              style: {...S.btn, padding: '4px 10px', fontSize: 10, fontWeight: 700,
                background: aktifBool ? C.warning + '22' : C.success + '22',
                color: aktifBool ? C.warning : C.success,
                border: '1px solid ' + (aktifBool ? C.warning : C.success) + '55'}
            }, aktifBool ? '⏸ PASİFE AL' : '▶ AKTİF ET'),
            // SİL
            React.createElement('button', {
              title: 'Sil',
              onClick: e => { e.stopPropagation(); hesapSil(h); },
              style: {...S.btn, ...S.btnD, padding: '4px 8px', fontSize: 10}
            }, React.createElement(LIcon, {name: 'Trash2', size: 12}))
          ); })()
        )),
        // YENİ HESAP butonu
        React.createElement('button', {
          onClick: () => yeniHesapModu(),
          style: {...S.btn, ...S.btnP, marginTop: 8, fontSize: 11, padding: '6px 14px'}
        }, React.createElement(LIcon, {name: 'Plus', size: 14}), ' YENİ HESAP EKLE')
      ),

      /* HESAP FORMU */
      React.createElement('div', {id: 'mail-hesap-form', style: {
        background: C.bgCard, borderRadius: 14, padding: 20, border: `1px solid ${C.border}`
      }},
        React.createElement('div', {style: {display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 4}},
          React.createElement('div', {style: {fontSize: 14, fontWeight: 800, color: C.accent}},
            React.createElement(LIcon, {name: 'Mail', size: 16, color: C.accent}),
            ' ' + (hesapForm.id ? 'HESAP DÜZENLE (ID: ' + hesapForm.id + ')' : 'YENİ MAIL HESABI EKLE')
          ),
          hesapForm.id && React.createElement('button', {
            onClick: yeniHesapModu,
            style: {...S.btn, ...S.btnG, fontSize: 10, padding: '4px 10px'}
          }, 'İPTAL — YENİ HESAP MODUNA DÖN')
        ),
        React.createElement('div', {style: {fontSize: 10, color: C.textMuted, marginBottom: 16}},
          'cPanel mail hesabınızın bilgilerini girin. IMAP ile mailler çekilir, SMTP ile gönderilir.'
          + (hesapForm.id ? ' (Düzenleme: şifre boş = mevcut korunur)' : '')),

        /* ADMIN: BAŞKA KULLANICIYA ATA */
        isAdmin && React.createElement(FormGroup, {label: 'BU HESABI HANGİ KULLANICIYA ATA (Admin için)'},
          React.createElement('select', {
            style: S.select,
            value: hesapForm.kullanici_id || '',
            onChange: e => setHesapForm(p => ({...p, kullanici_id: e.target.value ? parseInt(e.target.value) : undefined}))
          },
            React.createElement('option', {value: ''}, 'KENDIME (varsayılan)'),
            (kullanicilar || []).map(u => React.createElement('option', {key: u.id, value: u.id},
              (u.ad_soyad || u.email) + ' (' + (u.rol || 'personel').toUpperCase() + ')'))
          )
        ),

        React.createElement('div', {style: {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}},
          React.createElement(FormGroup, {label: 'E-POSTA ADRESİ'},
            React.createElement('input', {style: S.input, value: hesapForm.email || '',
              onChange: e => setHesapForm(p => ({...p, email: e.target.value})),
              placeholder: 'ornek@mrhasardanismanlik.com'})
          ),
          React.createElement(FormGroup, {label: 'GÖRÜNEN AD'},
            React.createElement('input', {style: S.input, value: hesapForm.display_name || '',
              onChange: e => setHesapForm(p => ({...p, display_name: e.target.value})),
              placeholder: 'MR HASAR DANIŞMANLIK'})
          ),
          React.createElement(FormGroup, {label: 'KULLANICI ADI'},
            React.createElement('input', {style: S.input, value: hesapForm.kullanici || '',
              onChange: e => setHesapForm(p => ({...p, kullanici: e.target.value})),
              placeholder: '_mainaccount@mrhasardanismanlik.com'})
          ),
          React.createElement(FormGroup, {label: hesapForm.id ? 'ŞİFRE (Bos = mevcut korunur)' : 'ŞİFRE *'},
            React.createElement('div', {style: {position: 'relative'}},
              React.createElement('input', {
                type: sifreGoster ? 'text' : 'password',
                style: {...S.input, paddingRight: 38, textTransform: 'none'},
                value: hesapForm.sifre || '',
                onChange: e => setHesapForm(p => ({...p, sifre: e.target.value})),
                placeholder: hesapForm.id ? 'Boş bırak — eski şifre korunur' : 'cPanel email şifrenizi girin'
              }),
              React.createElement('button', {
                type: 'button',
                onClick: () => setSifreGoster(!sifreGoster),
                title: sifreGoster ? 'Gizle' : 'Göster',
                style: {position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 4, fontSize: 14}
              }, sifreGoster ? '🙈' : '👁')
            )
          ),
          React.createElement(FormGroup, {label: 'IMAP SUNUCU'},
            React.createElement('input', {style: S.input, value: hesapForm.imap_sunucu || '',
              onChange: e => setHesapForm(p => ({...p, imap_sunucu: e.target.value})),
              placeholder: 'mail.mrhasardanismanlik.com'})
          ),
          React.createElement(FormGroup, {label: 'IMAP PORT'},
            React.createElement('input', {type: 'number', style: S.input, value: hesapForm.imap_port || 993,
              onChange: e => setHesapForm(p => ({...p, imap_port: parseInt(e.target.value) || 993}))})
          ),
          React.createElement(FormGroup, {label: 'SMTP SUNUCU'},
            React.createElement('input', {style: S.input, value: hesapForm.smtp_sunucu || '',
              onChange: e => setHesapForm(p => ({...p, smtp_sunucu: e.target.value})),
              placeholder: 'mail.mrhasardanismanlik.com'})
          ),
          React.createElement(FormGroup, {label: 'SMTP PORT'},
            React.createElement('input', {type: 'number', style: S.input, value: hesapForm.smtp_port || 465,
              onChange: e => setHesapForm(p => ({...p, smtp_port: parseInt(e.target.value) || 465}))})
          ),
          React.createElement(FormGroup, {label: 'GÜVENLİK'},
            React.createElement('select', {style: S.select, value: hesapForm.guvenlik || 'ssl',
              onChange: e => setHesapForm(p => ({...p, guvenlik: e.target.value}))},
              React.createElement('option', {value: 'ssl'}, 'SSL/TLS (ÖNERİLEN)'),
              React.createElement('option', {value: 'tls'}, 'STARTTLS'),
              React.createElement('option', {value: 'none'}, 'YOK')
            )
          )
        ),

        /* ═══ IMZA HTML (her giden mailin sonuna otomatik eklenir) ═══ */
        React.createElement(FormGroup, {label: 'İMZA HTML (Her giden mailin sonuna otomatik eklenir)'},
          React.createElement('textarea', {
            style: {...S.input, minHeight: 100, fontFamily: 'monospace', fontSize: 11, textTransform: 'none', resize: 'vertical'},
            value: hesapForm.imza_html || '',
            onChange: e => setHesapForm(p => ({...p, imza_html: e.target.value})),
            placeholder: 'Örn: <p><strong>Ad Soyad</strong><br/>Pozisyon<br/><a href="https://mrhasardanismanlik.com">mrhasardanismanlik.com</a></p>'
          })
        ),

        React.createElement('div', {style: {display: 'flex', gap: 8, marginTop: 16}},
          React.createElement('button', {onClick: hesapKaydet, disabled: hesapSaving,
            style: {...S.btn, ...S.btnP, fontSize: 11}},
            React.createElement(LIcon, {name: 'Save', size: 13, color: '#fff'}),
            hesapSaving ? ' KAYDEDİLİYOR...' : ' HESABI KAYDET'),
          React.createElement('button', {onClick: baglanitiTest, disabled: testLoading,
            style: {...S.btn, ...S.btnG, fontSize: 11}},
            React.createElement(LIcon, {name: 'Wifi', size: 13}),
            testLoading ? ' TEST EDİLİYOR...' : ' BAĞLANTI TESTİ')
        ),

        /* TEST SONUCU */
        testSonuc && React.createElement('div', {style: {marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}},
          React.createElement('div', {style: {
            padding: 14, borderRadius: 10,
            background: testSonuc.imap?.basarili ? `${C.success}11` : `${C.danger}08`,
            border: `1px solid ${testSonuc.imap?.basarili ? C.success + '33' : C.danger + '22'}`
          }},
            React.createElement('div', {style: {fontSize: 12, fontWeight: 800,
              color: testSonuc.imap?.basarili ? C.success : C.danger}},
              React.createElement(LIcon, {name: testSonuc.imap?.basarili ? 'CheckCircle2' : 'XCircle', size: 14}),
              ' IMAP ', testSonuc.imap?.basarili ? 'BAŞARILI' : 'BAŞARISIZ'),
            React.createElement('div', {style: {fontSize: 10, color: C.textSec, marginTop: 4}}, testSonuc.imap?.mesaj || ''),
            testSonuc.imap?.mail_sayisi !== undefined &&
              React.createElement('div', {style: {fontSize: 10, color: C.accent, marginTop: 2, fontWeight: 600}},
                'POSTA KUTUSUNDA ' + testSonuc.imap.mail_sayisi + ' MAIL VAR')
          ),
          React.createElement('div', {style: {
            padding: 14, borderRadius: 10,
            background: testSonuc.smtp?.basarili ? `${C.success}11` : `${C.danger}08`,
            border: `1px solid ${testSonuc.smtp?.basarili ? C.success + '33' : C.danger + '22'}`
          }},
            React.createElement('div', {style: {fontSize: 12, fontWeight: 800,
              color: testSonuc.smtp?.basarili ? C.success : C.danger}},
              React.createElement(LIcon, {name: testSonuc.smtp?.basarili ? 'CheckCircle2' : 'XCircle', size: 14}),
              ' SMTP ', testSonuc.smtp?.basarili ? 'BAŞARILI' : 'BAŞARISIZ'),
            React.createElement('div', {style: {fontSize: 10, color: C.textSec, marginTop: 4}}, testSonuc.smtp?.mesaj || '')
          )
        ),

        /* cPanel BİLGİ */
        React.createElement('div', {style: {
          marginTop: 16, padding: 14, borderRadius: 10,
          background: `${C.accent}06`, border: `1px solid ${C.accent}15`
        }},
          React.createElement('div', {style: {fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 8}},
            React.createElement(LIcon, {name: 'Info', size: 14, color: C.accent}), ' cPanel MAIL AYARLARI'),
          React.createElement('div', {style: {fontSize: 10, color: C.textSec, lineHeight: 2}},
            React.createElement('div', null, React.createElement('strong', null, 'IMAP Sunucu: '), 'mail.mrhasardanismanlik.com : 993 (SSL/TLS)'),
            React.createElement('div', null, React.createElement('strong', null, 'SMTP Sunucu: '), 'mail.mrhasardanismanlik.com : 465 (SSL/TLS)'),
            React.createElement('div', null, React.createElement('strong', null, 'Kullanıcı: '), '_mainaccount@mrhasardanismanlik.com'),
            React.createElement('div', null, React.createElement('strong', null, 'Şifre: '), 'cPanel şifresi kullanılır'),
            React.createElement('div', {style: {marginTop: 6, fontStyle: 'italic'}},
              'NOT: Sunucuda php-imap modülü aktif olmalıdır. cPanel WHM > MultiPHP INI Editor > imap.so')
          )
        )
      )
    )
  );
};

// GLOBAL KAYIT
MR.MailPage = MR_Mail.MailPage;
