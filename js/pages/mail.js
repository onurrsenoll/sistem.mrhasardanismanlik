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

  /* YENİ MAIL COMPOSE */
  const [compose, setCompose] = useState(false);
  const [composeData, setComposeData] = useState({alici: '', konu: '', icerik: '', cc: '', bcc: ''});
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

  /* ═══ MAIL GÖNDER ═══ */
  const mailGonder = async () => {
    if (!composeData.alici || !composeData.konu) {
      setMesaj({type: 'error', text: 'ALICI VE KONU ZORUNLU'});
      return;
    }
    setGonderLoading(true);
    const r = await api.mailGonder({
      hesap_id: seciliHesap.id,
      ...composeData
    });
    if (r?.success) {
      setMesaj({type: 'success', text: 'MAIL GÖNDERİLDİ'});
      setCompose(false);
      setComposeData({alici: '', konu: '', icerik: '', cc: '', bcc: ''});
      setShowCcBcc(false);
    } else {
      setMesaj({type: 'error', text: r?.error || 'MAIL GÖNDERİLEMEDİ'});
    }
    setGonderLoading(false);
  };

  /* ═══ HESAP KAYDET ═══ */
  const hesapKaydet = async () => {
    if (!hesapForm.email || !hesapForm.kullanici || !hesapForm.sifre) {
      setMesaj({type: 'error', text: 'E-POSTA, KULLANICI VE ŞİFRE ZORUNLU'});
      return;
    }
    setHesapSaving(true);
    const r = await api.mailHesapKaydet(hesapForm);
    if (r?.success) {
      setMesaj({type: 'success', text: 'MAIL HESABI KAYDEDİLDİ'});
      // Hesapları yenile
      const r2 = await api.mailHesaplar();
      if (r2?.success && r2.data?.items) {
        setHesaplar(r2.data.items);
        if (!seciliHesap && r2.data.items.length > 0) setSeciliHesap(r2.data.items[0]);
      }
    } else {
      setMesaj({type: 'error', text: r?.error || 'HESAP KAYDEDİLEMEDİ'});
    }
    setHesapSaving(false);
  };

  /* ═══ BAĞLANTI TESTİ ═══ */
  const baglanitiTest = async () => {
    setTestLoading(true);
    setTestSonuc(null);
    const testData = seciliHesap ? {hesap_id: seciliHesap.id} : hesapForm;
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
        React.createElement(FormGroup, {label: 'İÇERİK'},
          React.createElement('textarea', {style: {...S.input, minHeight: 200, fontFamily: 'inherit', resize: 'vertical'},
            value: composeData.icerik,
            onChange: e => setComposeData(p => ({...p, icerik: e.target.value})),
            placeholder: 'Mail içeriğini yazın...'})
        ),
        React.createElement('div', {style: {display: 'flex', gap: 8, justifyContent: 'flex-end'}},
          React.createElement('button', {onClick: () => setCompose(false), style: {...S.btn, fontSize: 11}}, 'İPTAL'),
          React.createElement('button', {
            onClick: mailGonder, disabled: gonderLoading,
            style: {...S.btn, ...S.btnP, fontSize: 11}
          }, React.createElement(LIcon, {name: 'Send', size: 13, color: '#fff'}),
            gonderLoading ? ' GÖNDERİLİYOR...' : ' GÖNDER')
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
        /* DETAY BODY */
        detayLoading ? React.createElement('div', {style: {padding: 30, textAlign: 'center', color: C.textMuted}}, 'YÜKLENİYOR...') :
        React.createElement('div', {style: {
          padding: 20, flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 420px)'
        }},
          seciliMail.icerik ?
            React.createElement('div', {
              style: {fontSize: 13, lineHeight: 1.7, color: C.text, wordBreak: 'break-word'},
              dangerouslySetInnerHTML: {__html: seciliMail.icerik}
            }) :
            React.createElement('div', {style: {fontSize: 13, color: C.textSec, whiteSpace: 'pre-wrap'}},
              seciliMail.icerik_text || '(İÇERİK YOK)')
        )
      )
    ),

    /* ═══ HESAP AYARLARI ═══ */
    altTab === 'ayarlar' && isAdmin && React.createElement('div', {style: {display: 'grid', gap: 16}},

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
            marginBottom: 8, cursor: 'pointer'
          },
          onClick: () => setSeciliHesap(h)
        },
          React.createElement('div', null,
            React.createElement('div', {style: {fontSize: 13, fontWeight: 700, color: C.text}}, h.email),
            React.createElement('div', {style: {fontSize: 10, color: C.textMuted}},
              h.display_name || '', ' | Son sync: ', h.son_sync ? fmt(h.son_sync) : 'HİÇ')
          ),
          React.createElement('div', {style: {display: 'flex', gap: 6, alignItems: 'center'}},
            React.createElement(Badge, {text: h.aktif ? 'AKTİF' : 'PASİF', color: h.aktif ? C.success : C.danger}),
            React.createElement('button', {
              onClick: e => { e.stopPropagation(); setHesapForm({...h}); },
              style: {...S.btn, padding: '4px 8px', fontSize: 10}
            }, React.createElement(LIcon, {name: 'Edit', size: 12}))
          )
        ))
      ),

      /* HESAP FORMU */
      React.createElement('div', {style: {
        background: C.bgCard, borderRadius: 14, padding: 20, border: `1px solid ${C.border}`
      }},
        React.createElement('div', {style: {fontSize: 14, fontWeight: 800, color: C.accent, marginBottom: 4}},
          React.createElement(LIcon, {name: 'Mail', size: 16, color: C.accent}), ' MAIL HESABI EKLE / DÜZENLE'),
        React.createElement('div', {style: {fontSize: 10, color: C.textMuted, marginBottom: 16}},
          'cPanel mail hesabınızın bilgilerini girin. IMAP ile mailler çekilir, SMTP ile gönderilir.'),

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
          React.createElement(FormGroup, {label: 'ŞİFRE'},
            React.createElement('input', {type: 'password', style: S.input, value: hesapForm.sifre || '',
              onChange: e => setHesapForm(p => ({...p, sifre: e.target.value})),
              placeholder: '••••••••'})
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
