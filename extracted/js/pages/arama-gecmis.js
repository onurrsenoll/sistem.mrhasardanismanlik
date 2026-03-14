/**
 * MR HASAR DANIŞMANLIK - ARAMA GEÇMİŞİ & İSTATİSTİK PANELİ
 * Gelen/giden arama logları, istatistikler, görüşme kayıtları, cevapsız çağrı listesi
 */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useCallback, useRef, useMemo} = React;

MR.AramaGecmisPage = ({setPage, user, defaultTab}) => {
  const {C, S, LIcon, api, StatCard, FormGroup} = MR;

  /* ═══ YETKİ KONTROL ═══ */
  const yetkiGecmis = user?.rol === 'admin' || MR.hasYetki(user, 'sistem', 'arama-gecmis');
  const yetkiIstatistik = user?.rol === 'admin' || MR.hasYetki(user, 'sistem', 'arama-gecmis-istatistik');
  const yetkiCevapsiz = user?.rol === 'admin' || MR.hasYetki(user, 'sistem', 'arama-gecmis-cevapsiz');
  const yetkiKayitDinle = user?.rol === 'admin' || MR.hasYetki(user, 'sistem', 'arama-gecmis-kayit-dinle');
  const yetkiNot = user?.rol === 'admin' || MR.hasYetki(user, 'sistem', 'arama-gecmis-not');
  const yetkiSil = user?.rol === 'admin' || MR.hasYetki(user, 'sistem', 'arama-gecmis-sil');

  /* ═══ STATE ═══ */
  const [tab, setTab] = useState(defaultTab || 'gecmis'); /* gecmis | istatistik | cevapsiz */
  const [loglar, setLoglar] = useState([]);
  const [toplam, setToplam] = useState(0);
  const [sayfa, setSayfa] = useState(1);
  const [toplamSayfa, setToplamSayfa] = useState(1);
  const [yukleniyor, setYukleniyor] = useState(false);

  /* FİLTRELER */
  const [filtre, setFiltre] = useState({
    yon: '', durum: '', q: '', tarih_bas: '', tarih_son: '', kullanici_id: ''
  });

  /* İSTATİSTİKLER */
  const [istatistik, setIstatistik] = useState(null);
  const [istDonem, setIstDonem] = useState('gunluk');
  const [istYukleniyor, setIstYukleniyor] = useState(false);

  /* SES OYNATICI */
  const [oynatilan, setOynatilan] = useState(null);
  const audioRef = useRef(null);

  /* NOT MODAL */
  const [notModal, setNotModal] = useState(null);
  const [notText, setNotText] = useState('');

  /* ═══ LOG LİSTESİ YÜKLE ═══ */
  const loglariYukle = useCallback(async (s = 1) => {
    setYukleniyor(true);
    const params = { sayfa: s, limit: 30 };
    if (filtre.yon) params.yon = filtre.yon;
    if (filtre.durum) params.durum = filtre.durum;
    if (filtre.q) params.q = filtre.q;
    if (filtre.tarih_bas) params.tarih_bas = filtre.tarih_bas;
    if (filtre.tarih_son) params.tarih_son = filtre.tarih_son;
    if (filtre.kullanici_id) params.kullanici_id = filtre.kullanici_id;

    const res = await api.aramaLogList(params);
    if (res?.success && res.data) {
      setLoglar(res.data.items || []);
      setToplam(res.data.toplam || 0);
      setSayfa(res.data.sayfa || 1);
      setToplamSayfa(res.data.toplam_sayfa || 1);
    }
    setYukleniyor(false);
  }, [filtre]);

  /* ═══ İSTATİSTİKLERİ YÜKLE ═══ */
  const istatistikleriYukle = useCallback(async () => {
    setIstYukleniyor(true);
    const params = { donem: istDonem };
    if (filtre.tarih_bas) params.tarih_bas = filtre.tarih_bas;
    if (filtre.tarih_son) params.tarih_son = filtre.tarih_son;
    if (filtre.kullanici_id) params.kullanici_id = filtre.kullanici_id;

    const res = await api.aramaLogIstatistik(params);
    if (res?.success && res.data) {
      setIstatistik(res.data);
    }
    setIstYukleniyor(false);
  }, [istDonem, filtre.tarih_bas, filtre.tarih_son, filtre.kullanici_id]);

  /* İLK YÜKLEME */
  useEffect(() => {
    loglariYukle(1);
    istatistikleriYukle();
    /* Tarayıcı bildirim izni iste */
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => { loglariYukle(1); }, [filtre]);
  useEffect(() => { istatistikleriYukle(); }, [istDonem]);

  /* ═══ YARDIMCI FONKSİYONLAR ═══ */
  const sureFmt = (sn) => {
    if (!sn || sn <= 0) return '-';
    const dk = Math.floor(sn / 60);
    const s = sn % 60;
    if (dk > 0) return dk + 'dk ' + s + 'sn';
    return s + 'sn';
  };

  const tarihFmt = (dt) => {
    if (!dt) return '-';
    try {
      const d = new Date(dt);
      const simdi = new Date();
      const fark = Math.floor((simdi - d) / 1000);
      if (fark < 60) return 'AZ ÖNCE';
      if (fark < 3600) return Math.floor(fark / 60) + ' DK ÖNCE';
      if (fark < 86400) return Math.floor(fark / 3600) + ' SAAT ÖNCE';
      return d.toLocaleDateString('tr-TR') + ' ' + d.toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'});
    } catch(e) { return dt; }
  };

  const durumBadge = (durum) => {
    const map = {
      cevaplandi: { renk: C.success, etiket: 'CEVAPLANDI' },
      cevapsiz: { renk: C.danger, etiket: 'CEVAPSIZ' },
      reddedildi: { renk: C.warning, etiket: 'REDDEDİLDİ' },
      mesgul: { renk: C.purple, etiket: 'MEŞGUL' },
      hata: { renk: C.danger, etiket: 'HATA' }
    };
    const d = map[durum] || { renk: C.textMuted, etiket: durum || '-' };
    return React.createElement('span', {style: S.badge(d.renk)}, d.etiket);
  };

  const yonIcon = (yon) => {
    if (yon === 'gelen') return React.createElement(LIcon, {name: 'PhoneIncoming', size: 14, color: C.success});
    return React.createElement(LIcon, {name: 'PhoneOutgoing', size: 14, color: C.accent});
  };

  /* ═══ GERİ ARA ═══ */
  const geriAra = (numara) => {
    if (MR.webrtcAra) {
      MR.webrtcAra(numara, {});
    }
  };

  /* ═══ KAYIT OYNAT ═══ */
  const kayitOynat = (logId) => {
    if (oynatilan === logId) {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
      setOynatilan(null);
      return;
    }
    setOynatilan(logId);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.src = api.aramaLogKayitUrl(logId) + '&token=' + encodeURIComponent(api.token || '');
        audioRef.current.play().catch(() => {});
      }
    }, 100);
  };

  /* ═══ NOT KAYDET ═══ */
  const notKaydet = async () => {
    if (!notModal) return;
    await api.aramaLogUpdate({ id: notModal.id, notlar: notText });
    setNotModal(null);
    setNotText('');
    loglariYukle(sayfa);
    MR.toast && MR.toast('NOT KAYDEDİLDİ', 'success');
  };

  /* ═══ LOG SİL ═══ */
  const logSil = async (id) => {
    if (!confirm('Bu arama kaydını silmek istediğinize emin misiniz?')) return;
    const res = await api.aramaLogDelete(id);
    if (res?.success) {
      MR.toast && MR.toast('ARAMA KAYDI SİLİNDİ', 'success');
      loglariYukle(sayfa);
      istatistikleriYukle();
    } else {
      MR.toast && MR.toast(res?.error || 'SİLME HATASI', 'error');
    }
  };

  /* ═══ BASİT BAR CHART (SVG) ═══ */
  const BarChart = ({veri, yukseklik = 200}) => {
    if (!veri || !veri.length) return React.createElement('div', {style:{textAlign:'center', padding:40, color:C.textMuted, fontSize:12}}, 'VERİ BULUNAMADI');

    const maxVal = Math.max(...veri.map(v => v.toplam || 0), 1);
    const barW = Math.max(Math.floor((100 / veri.length) - 2), 3);

    return React.createElement('div', {style:{position:'relative', height:yukseklik, display:'flex', alignItems:'flex-end', gap:2, padding:'0 4px'}},
      veri.map((v, i) => {
        const hGelen = ((v.gelen || 0) / maxVal) * (yukseklik - 30);
        const hGiden = ((v.giden || 0) / maxVal) * (yukseklik - 30);
        const etiket = (v.etiket || '').substring(5) || (i+1);

        return React.createElement('div', {key: i, style:{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:1}},
          /* Toplam rakam */
          React.createElement('div', {style:{fontSize:8, fontWeight:700, color:C.textSec, marginBottom:2}}, v.toplam || 0),
          /* Giden bar */
          React.createElement('div', {
            title: 'GİDEN: ' + (v.giden || 0),
            style:{width:'100%', maxWidth:30, height: Math.max(hGiden, 2), background: 'linear-gradient(180deg, #60a5fa, #2563eb)', borderRadius:'3px 3px 0 0', transition:'height .3s'}
          }),
          /* Gelen bar */
          React.createElement('div', {
            title: 'GELEN: ' + (v.gelen || 0),
            style:{width:'100%', maxWidth:30, height: Math.max(hGelen, 2), background: 'linear-gradient(180deg, #34d399, #059669)', borderRadius:'0 0 3px 3px', transition:'height .3s'}
          }),
          /* Etiket */
          React.createElement('div', {style:{fontSize:7, color:C.textMuted, marginTop:3, transform: veri.length > 15 ? 'rotate(-45deg)' : 'none', whiteSpace:'nowrap'}}, etiket)
        );
      })
    );
  };

  const isK = MR.tema === 'koyu';
  const cevapsizLoglar = loglar.filter(l => l.durum === 'cevapsiz' && l.yon === 'gelen');
  const gen = istatistik?.genel || {};

  return React.createElement('div', {className:'fade-in'},

    /* ═══ ÜST İSTATİSTİK KARTLARI ═══ */
    React.createElement('div', {style:{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:12, marginBottom:16}},
      React.createElement('div', {style:{...S.stat, cursor:'pointer', border: tab === 'gecmis' ? '2px solid ' + C.accent : S.stat.border}, onClick:() => setTab('gecmis')},
        React.createElement('div', {style:{display:'flex', alignItems:'center', gap:8, marginBottom:6}},
          React.createElement('div', {style:{width:32, height:32, borderRadius:10, background:C.accent+'15', display:'flex', alignItems:'center', justifyContent:'center'}},
            React.createElement(LIcon, {name:'Phone', size:16, color:C.accent})
          ),
          React.createElement('span', {style:{fontSize:10, fontWeight:700, color:C.textSec}}, 'TOPLAM ARAMA')
        ),
        React.createElement('div', {style:{fontSize:24, fontWeight:800, color:C.text}}, gen.toplam_arama || 0)
      ),
      React.createElement('div', {style:{...S.stat, cursor:'pointer', border: '2px solid ' + C.success + '30'}, onClick:() => { setFiltre(p => ({...p, yon:'gelen'})); setTab('gecmis'); }},
        React.createElement('div', {style:{display:'flex', alignItems:'center', gap:8, marginBottom:6}},
          React.createElement('div', {style:{width:32, height:32, borderRadius:10, background:C.success+'15', display:'flex', alignItems:'center', justifyContent:'center'}},
            React.createElement(LIcon, {name:'PhoneIncoming', size:16, color:C.success})
          ),
          React.createElement('span', {style:{fontSize:10, fontWeight:700, color:C.textSec}}, 'GELEN')
        ),
        React.createElement('div', {style:{fontSize:24, fontWeight:800, color:C.success}}, gen.gelen_arama || 0)
      ),
      React.createElement('div', {style:{...S.stat, cursor:'pointer', border: '2px solid ' + C.accent + '30'}, onClick:() => { setFiltre(p => ({...p, yon:'giden'})); setTab('gecmis'); }},
        React.createElement('div', {style:{display:'flex', alignItems:'center', gap:8, marginBottom:6}},
          React.createElement('div', {style:{width:32, height:32, borderRadius:10, background:C.accent+'15', display:'flex', alignItems:'center', justifyContent:'center'}},
            React.createElement(LIcon, {name:'PhoneOutgoing', size:16, color:C.accent})
          ),
          React.createElement('span', {style:{fontSize:10, fontWeight:700, color:C.textSec}}, 'GİDEN')
        ),
        React.createElement('div', {style:{fontSize:24, fontWeight:800, color:C.accent}}, gen.giden_arama || 0)
      ),
      React.createElement('div', {style:{...S.stat, cursor:'pointer', border: '2px solid ' + C.danger + '30'}, onClick:() => setTab('cevapsiz')},
        React.createElement('div', {style:{display:'flex', alignItems:'center', gap:8, marginBottom:6}},
          React.createElement('div', {style:{width:32, height:32, borderRadius:10, background:C.danger+'15', display:'flex', alignItems:'center', justifyContent:'center'}},
            React.createElement(LIcon, {name:'PhoneMissed', size:16, color:C.danger})
          ),
          React.createElement('span', {style:{fontSize:10, fontWeight:700, color:C.textSec}}, 'CEVAPSIZ')
        ),
        React.createElement('div', {style:{fontSize:24, fontWeight:800, color:C.danger}}, gen.cevapsiz || 0)
      ),
      React.createElement('div', {style:S.stat},
        React.createElement('div', {style:{display:'flex', alignItems:'center', gap:8, marginBottom:6}},
          React.createElement('div', {style:{width:32, height:32, borderRadius:10, background:C.cyan+'15', display:'flex', alignItems:'center', justifyContent:'center'}},
            React.createElement(LIcon, {name:'Clock', size:16, color:C.cyan})
          ),
          React.createElement('span', {style:{fontSize:10, fontWeight:700, color:C.textSec}}, 'ORT. SÜRE')
        ),
        React.createElement('div', {style:{fontSize:24, fontWeight:800, color:C.cyan}}, sureFmt(Math.round(gen.ort_sure || 0)))
      ),
      React.createElement('div', {style:S.stat},
        React.createElement('div', {style:{display:'flex', alignItems:'center', gap:8, marginBottom:6}},
          React.createElement('div', {style:{width:32, height:32, borderRadius:10, background:C.purple+'15', display:'flex', alignItems:'center', justifyContent:'center'}},
            React.createElement(LIcon, {name:'Mic', size:16, color:C.purple})
          ),
          React.createElement('span', {style:{fontSize:10, fontWeight:700, color:C.textSec}}, 'KAYITLI')
        ),
        React.createElement('div', {style:{fontSize:24, fontWeight:800, color:C.purple}}, gen.kayitli_gorusme || 0)
      )
    ),

    /* ═══ TAB BUTONLARI ═══ */
    React.createElement('div', {style:{display:'flex', gap:8, marginBottom:16}},
      [
        yetkiGecmis && {id:'gecmis', icon:'List', label:'ARAMA GEÇMİŞİ'},
        yetkiIstatistik && {id:'istatistik', icon:'BarChart3', label:'İSTATİSTİKLER'},
        yetkiCevapsiz && {id:'cevapsiz', icon:'PhoneMissed', label:'CEVAPSIZ ÇAĞRILAR'}
      ].filter(Boolean).map(t => React.createElement('button', {
        key: t.id,
        onClick: () => setTab(t.id),
        style: {
          ...S.btn,
          ...(tab === t.id ? S.btnP : S.btnG),
          fontSize: 11, padding: '8px 16px'
        }
      }, React.createElement(LIcon, {name: t.icon, size: 14, color: tab === t.id ? '#fff' : C.textSec}), ' ', t.label))
    ),

    /* ═══ TAB İÇERİĞİ ═══ */

    /* ── GEÇMİŞ TAB ── */
    tab === 'gecmis' && yetkiGecmis && React.createElement('div', null,
      /* FİLTRELER */
      React.createElement('div', {style:{...S.card, marginBottom:16}},
        React.createElement('div', {style:{padding:16, display:'flex', flexWrap:'wrap', gap:10, alignItems:'flex-end'}},
          React.createElement('div', {style:{flex:'1 1 180px'}},
            React.createElement('label', {style:{...S.label, fontSize:10}}, 'ARAMA'),
            React.createElement('input', {style:{...S.input, padding:'8px 12px', fontSize:12}, placeholder:'NUMARA VEYA İSİM...', value:filtre.q,
              onChange: e => setFiltre(p => ({...p, q:e.target.value}))
            })
          ),
          React.createElement('div', {style:{flex:'0 0 120px'}},
            React.createElement('label', {style:{...S.label, fontSize:10}}, 'YÖN'),
            React.createElement('select', {style:{...S.select, padding:'8px 12px', fontSize:12}, value:filtre.yon,
              onChange: e => setFiltre(p => ({...p, yon:e.target.value}))
            },
              React.createElement('option', {value:''}, 'TÜMÜ'),
              React.createElement('option', {value:'gelen'}, 'GELEN'),
              React.createElement('option', {value:'giden'}, 'GİDEN')
            )
          ),
          React.createElement('div', {style:{flex:'0 0 140px'}},
            React.createElement('label', {style:{...S.label, fontSize:10}}, 'DURUM'),
            React.createElement('select', {style:{...S.select, padding:'8px 12px', fontSize:12}, value:filtre.durum,
              onChange: e => setFiltre(p => ({...p, durum:e.target.value}))
            },
              React.createElement('option', {value:''}, 'TÜMÜ'),
              React.createElement('option', {value:'cevaplandi'}, 'CEVAPLANDI'),
              React.createElement('option', {value:'cevapsiz'}, 'CEVAPSIZ'),
              React.createElement('option', {value:'reddedildi'}, 'REDDEDİLDİ'),
              React.createElement('option', {value:'mesgul'}, 'MEŞGUL'),
              React.createElement('option', {value:'hata'}, 'HATA')
            )
          ),
          React.createElement('div', {style:{flex:'0 0 140px'}},
            React.createElement('label', {style:{...S.label, fontSize:10}}, 'BAŞLANGIÇ TARİHİ'),
            React.createElement('input', {type:'date', style:{...S.input, padding:'8px 12px', fontSize:12}, value:filtre.tarih_bas,
              onChange: e => setFiltre(p => ({...p, tarih_bas:e.target.value}))
            })
          ),
          React.createElement('div', {style:{flex:'0 0 140px'}},
            React.createElement('label', {style:{...S.label, fontSize:10}}, 'BİTİŞ TARİHİ'),
            React.createElement('input', {type:'date', style:{...S.input, padding:'8px 12px', fontSize:12}, value:filtre.tarih_son,
              onChange: e => setFiltre(p => ({...p, tarih_son:e.target.value}))
            })
          ),
          React.createElement('button', {
            onClick: () => { setFiltre({yon:'', durum:'', q:'', tarih_bas:'', tarih_son:'', kullanici_id:''}); },
            style:{...S.btn, ...S.btnG, fontSize:10, padding:'8px 14px'}
          }, React.createElement(LIcon, {name:'RotateCcw', size:12, color:C.textSec}), ' TEMİZLE')
        )
      ),

      /* LOG TABLOSU */
      React.createElement('div', {style:S.card},
        React.createElement('div', {style:{...S.cardHead, justifyContent:'space-between'}},
          React.createElement('div', {style:{display:'flex', alignItems:'center', gap:8}},
            React.createElement(LIcon, {name:'List', size:16, color:C.accent}),
            React.createElement('span', null, 'ARAMA GEÇMİŞİ'),
            React.createElement('span', {style:{...S.badge(C.accent), fontSize:10, marginLeft:6}}, toplam + ' KAYIT')
          ),
          React.createElement('button', {
            onClick: () => loglariYukle(sayfa),
            style:{...S.btn, ...S.btnG, fontSize:10, padding:'6px 12px'}
          }, React.createElement(LIcon, {name:'RefreshCw', size:12, color:C.textSec}), ' YENİLE')
        ),
        React.createElement('div', {style:{overflowX:'auto'}},
          yukleniyor
            ? React.createElement('div', {style:{padding:40, textAlign:'center', color:C.textMuted}},
                React.createElement('div', {style:{width:24, height:24, border:'3px solid '+C.accent, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 10px'}}),
                'YÜKLENİYOR...'
              )
            : loglar.length === 0
              ? React.createElement('div', {style:{padding:40, textAlign:'center', color:C.textMuted, fontSize:13}},
                  React.createElement(LIcon, {name:'PhoneOff', size:32, color:C.textMuted}),
                  React.createElement('div', {style:{marginTop:10}}, 'ARAMA KAYDI BULUNAMADI')
                )
              : React.createElement('table', {style:{width:'100%', borderCollapse:'collapse', fontSize:12}},
                  React.createElement('thead', null,
                    React.createElement('tr', null,
                      ['YÖN','NUMARA','MÜŞTERİ','DURUM','TARİH','SÜRE','KAYIT','NOT','İŞLEM'].map(h =>
                        React.createElement('th', {key:h, style:{padding:'10px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:C.textSec, borderBottom:'1px solid '+C.border, whiteSpace:'nowrap'}}, h)
                      )
                    )
                  ),
                  React.createElement('tbody', null,
                    loglar.map(log =>
                      React.createElement('tr', {key:log.id, style:{borderBottom:'1px solid '+C.border}},
                        /* YÖN */
                        React.createElement('td', {style:{padding:'10px 12px'}},
                          React.createElement('div', {style:{display:'flex', alignItems:'center', gap:4}},
                            yonIcon(log.yon),
                            React.createElement('span', {style:{fontSize:9, fontWeight:700, color: log.yon === 'gelen' ? C.success : C.accent}}, log.yon === 'gelen' ? 'GELEN' : 'GİDEN')
                          )
                        ),
                        /* NUMARA */
                        React.createElement('td', {style:{padding:'10px 12px', fontWeight:700, fontSize:12}}, log.numara || '-'),
                        /* MÜŞTERİ */
                        React.createElement('td', {style:{padding:'10px 12px'}},
                          React.createElement('div', null,
                            React.createElement('div', {style:{fontWeight:700, fontSize:11}}, log.musteri_adi || '-'),
                            log.musteri_kaynak && React.createElement('div', {style:{fontSize:9, color:C.textMuted}}, log.musteri_kaynak)
                          )
                        ),
                        /* DURUM */
                        React.createElement('td', {style:{padding:'10px 12px'}}, durumBadge(log.durum)),
                        /* TARİH */
                        React.createElement('td', {style:{padding:'10px 12px', fontSize:10, color:C.textSec, whiteSpace:'nowrap'}}, tarihFmt(log.baslangic_zamani)),
                        /* SÜRE */
                        React.createElement('td', {style:{padding:'10px 12px', fontSize:11, fontWeight:700, color: log.sure_saniye > 0 ? C.text : C.textMuted}},
                          sureFmt(log.sure_saniye)
                        ),
                        /* KAYIT */
                        React.createElement('td', {style:{padding:'10px 12px'}},
                          log.kayit_dosya && yetkiKayitDinle
                            ? React.createElement('button', {
                                onClick: () => kayitOynat(log.id),
                                style:{...S.btnMini, ...(oynatilan === log.id ? S.btnMiniD : S.btnMiniS)}
                              },
                              React.createElement(LIcon, {name: oynatilan === log.id ? 'Square' : 'Play', size:10, color:'#fff'}),
                              oynatilan === log.id ? ' DURDUR' : ' OYNAT'
                            )
                            : log.kayit_dosya && !yetkiKayitDinle
                              ? React.createElement('span', {style:{...S.badge(C.textMuted), fontSize:9}}, 'KAYIT VAR')
                              : React.createElement('span', {style:{fontSize:9, color:C.textMuted}}, '-')
                        ),
                        /* NOT */
                        React.createElement('td', {style:{padding:'10px 12px'}},
                          yetkiNot
                            ? React.createElement('button', {
                                onClick: () => { setNotModal(log); setNotText(log.notlar || ''); },
                                style:{...S.btnMini, ...S.btnMiniG},
                                title: log.notlar || 'NOT EKLE'
                              },
                                React.createElement(LIcon, {name: log.notlar ? 'FileText' : 'Plus', size:10, color:C.textSec}),
                                log.notlar ? ' VAR' : ' EKLE'
                              )
                            : log.notlar
                              ? React.createElement('span', {style:{fontSize:9, color:C.textSec}}, 'VAR')
                              : React.createElement('span', {style:{fontSize:9, color:C.textMuted}}, '-')
                        ),
                        /* İŞLEM */
                        React.createElement('td', {style:{padding:'10px 12px'}},
                          React.createElement('div', {style:{display:'flex', gap:4}},
                            React.createElement('button', {
                              onClick: () => geriAra(log.numara),
                              style:{...S.btnMini, ...S.btnMiniP},
                              title: 'GERİ ARA'
                            }, React.createElement(LIcon, {name:'Phone', size:10, color:'#fff'})),
                            yetkiSil && React.createElement('button', {
                              onClick: () => logSil(log.id),
                              style:{...S.btnMini, ...S.btnMiniD},
                              title: 'SİL'
                            }, React.createElement(LIcon, {name:'Trash2', size:10, color:'#fff'}))
                          )
                        )
                      )
                    )
                  )
                )
        ),
        /* SAYFALAMA */
        toplamSayfa > 1 && React.createElement('div', {style:{padding:16, display:'flex', justifyContent:'center', gap:6}},
          React.createElement('button', {
            onClick: () => loglariYukle(sayfa - 1),
            disabled: sayfa <= 1,
            style:{...S.btn, ...S.btnG, fontSize:10, padding:'6px 12px', opacity: sayfa <= 1 ? 0.5 : 1}
          }, '« ÖNCEKİ'),
          React.createElement('span', {style:{padding:'8px 14px', fontSize:11, fontWeight:700, color:C.textSec}}, sayfa + ' / ' + toplamSayfa),
          React.createElement('button', {
            onClick: () => loglariYukle(sayfa + 1),
            disabled: sayfa >= toplamSayfa,
            style:{...S.btn, ...S.btnG, fontSize:10, padding:'6px 12px', opacity: sayfa >= toplamSayfa ? 0.5 : 1}
          }, 'SONRAKİ »')
        )
      )
    ),

    /* ── İSTATİSTİK TAB ── */
    tab === 'istatistik' && yetkiIstatistik && React.createElement('div', null,
      /* DÖNEM SEÇİCİ */
      React.createElement('div', {style:{display:'flex', gap:8, marginBottom:16}},
        ['gunluk','haftalik','aylik'].map(d => React.createElement('button', {
          key:d,
          onClick: () => setIstDonem(d),
          style:{...S.btn, ...(istDonem === d ? S.btnP : S.btnG), fontSize:10, padding:'8px 14px'}
        }, d === 'gunluk' ? 'GÜNLÜK' : d === 'haftalik' ? 'HAFTALIK' : 'AYLIK'))
      ),

      istYukleniyor
        ? React.createElement('div', {style:{padding:40, textAlign:'center', color:C.textMuted}}, 'YÜKLENİYOR...')
        : React.createElement('div', null,
            /* GRAFİK */
            React.createElement('div', {style:{...S.card, marginBottom:16}},
              React.createElement('div', {style:S.cardHead},
                React.createElement(LIcon, {name:'BarChart3', size:16, color:C.accent}),
                React.createElement('span', null, istDonem === 'gunluk' ? 'GÜNLÜK' : istDonem === 'haftalik' ? 'HAFTALIK' : 'AYLIK', ' ARAMA GRAFİĞİ')
              ),
              React.createElement('div', {style:{padding:20}},
                React.createElement(BarChart, {veri: istatistik?.grafik || [], yukseklik:200}),
                React.createElement('div', {style:{display:'flex', justifyContent:'center', gap:20, marginTop:12}},
                  React.createElement('div', {style:{display:'flex', alignItems:'center', gap:6, fontSize:10, color:C.textSec}},
                    React.createElement('div', {style:{width:12, height:12, borderRadius:3, background:'linear-gradient(180deg, #60a5fa, #2563eb)'}}),
                    'GİDEN'
                  ),
                  React.createElement('div', {style:{display:'flex', alignItems:'center', gap:6, fontSize:10, color:C.textSec}},
                    React.createElement('div', {style:{width:12, height:12, borderRadius:3, background:'linear-gradient(180deg, #34d399, #059669)'}}),
                    'GELEN'
                  )
                )
              )
            ),

            /* EN ÇOK ARANAN */
            React.createElement('div', {style:S.card},
              React.createElement('div', {style:S.cardHead},
                React.createElement(LIcon, {name:'TrendingUp', size:16, color:C.purple}),
                React.createElement('span', null, 'EN ÇOK ARANAN NUMARALAR')
              ),
              React.createElement('div', {style:{overflowX:'auto'}},
                (!istatistik?.en_cok_aranan || istatistik.en_cok_aranan.length === 0)
                  ? React.createElement('div', {style:{padding:30, textAlign:'center', color:C.textMuted, fontSize:12}}, 'VERİ YOK')
                  : React.createElement('table', {style:{width:'100%', borderCollapse:'collapse', fontSize:12}},
                      React.createElement('thead', null,
                        React.createElement('tr', null,
                          ['#','NUMARA','MÜŞTERİ','ARAMA SAYISI','TOPLAM SÜRE','SON ARAMA','İŞLEM'].map(h =>
                            React.createElement('th', {key:h, style:{padding:'10px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:C.textSec, borderBottom:'1px solid '+C.border}}, h)
                          )
                        )
                      ),
                      React.createElement('tbody', null,
                        istatistik.en_cok_aranan.map((r, i) =>
                          React.createElement('tr', {key:i, style:{borderBottom:'1px solid '+C.border}},
                            React.createElement('td', {style:{padding:'10px 12px', fontWeight:800, color:C.accent}}, i + 1),
                            React.createElement('td', {style:{padding:'10px 12px', fontWeight:700}}, r.numara),
                            React.createElement('td', {style:{padding:'10px 12px'}}, r.musteri_adi || '-'),
                            React.createElement('td', {style:{padding:'10px 12px'}},
                              React.createElement('span', {style:S.badge(C.accent)}, r.arama_sayisi)
                            ),
                            React.createElement('td', {style:{padding:'10px 12px', fontSize:11}}, sureFmt(r.toplam_sure)),
                            React.createElement('td', {style:{padding:'10px 12px', fontSize:10, color:C.textSec}}, tarihFmt(r.son_arama)),
                            React.createElement('td', {style:{padding:'10px 12px'}},
                              React.createElement('button', {
                                onClick: () => geriAra(r.numara),
                                style:{...S.btnMini, ...S.btnMiniP}
                              }, React.createElement(LIcon, {name:'Phone', size:10, color:'#fff'}), ' ARA')
                            )
                          )
                        )
                      )
                    )
              )
            )
          )
    ),

    /* ── CEVAPSIZ TAB ── */
    tab === 'cevapsiz' && yetkiCevapsiz && React.createElement('div', null,
      React.createElement('div', {style:S.card},
        React.createElement('div', {style:{...S.cardHead, justifyContent:'space-between'}},
          React.createElement('div', {style:{display:'flex', alignItems:'center', gap:8}},
            React.createElement(LIcon, {name:'PhoneMissed', size:16, color:C.danger}),
            React.createElement('span', null, 'CEVAPSIZ GELEN ÇAĞRILAR')
          ),
          React.createElement('button', {
            onClick: () => { setFiltre(p => ({...p, yon:'gelen', durum:'cevapsiz'})); setTab('gecmis'); },
            style:{...S.btn, ...S.btnG, fontSize:10, padding:'6px 12px'}
          }, 'TÜM LİSTEDE GÖSTER')
        ),
        React.createElement('div', {style:{overflowX:'auto'}},
          cevapsizLoglar.length === 0
            ? React.createElement('div', {style:{padding:40, textAlign:'center', color:C.textMuted, fontSize:13}},
                React.createElement(LIcon, {name:'CheckCircle', size:32, color:C.success}),
                React.createElement('div', {style:{marginTop:10}}, 'CEVAPSIZ ÇAĞRI YOK')
              )
            : React.createElement('table', {style:{width:'100%', borderCollapse:'collapse', fontSize:12}},
                React.createElement('thead', null,
                  React.createElement('tr', null,
                    ['NUMARA','MÜŞTERİ','TARİH','GERİ ARA'].map(h =>
                      React.createElement('th', {key:h, style:{padding:'12px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:C.textSec, borderBottom:'1px solid '+C.border}}, h)
                    )
                  )
                ),
                React.createElement('tbody', null,
                  cevapsizLoglar.map(log =>
                    React.createElement('tr', {key:log.id, style:{borderBottom:'1px solid '+C.border}},
                      React.createElement('td', {style:{padding:'12px 14px'}},
                        React.createElement('div', {style:{display:'flex', alignItems:'center', gap:8}},
                          React.createElement('div', {style:{width:28, height:28, borderRadius:'50%', background:C.danger+'15', display:'flex', alignItems:'center', justifyContent:'center'}},
                            React.createElement(LIcon, {name:'PhoneMissed', size:14, color:C.danger})
                          ),
                          React.createElement('span', {style:{fontWeight:700, fontSize:13}}, log.numara)
                        )
                      ),
                      React.createElement('td', {style:{padding:'12px 14px', fontWeight:600}}, log.musteri_adi || 'BİLİNMEYEN'),
                      React.createElement('td', {style:{padding:'12px 14px', fontSize:11, color:C.textSec}}, tarihFmt(log.baslangic_zamani)),
                      React.createElement('td', {style:{padding:'12px 14px'}},
                        React.createElement('button', {
                          onClick: () => geriAra(log.numara),
                          style:{...S.btn, ...S.btnP, fontSize:11, padding:'8px 16px'}
                        },
                          React.createElement(LIcon, {name:'Phone', size:14, color:'#fff'}), ' GERİ ARA'
                        )
                      )
                    )
                  )
                )
              )
        )
      )
    ),

    /* ═══ GİZLİ SES ELEMENTİ ═══ */
    React.createElement('audio', {
      ref: audioRef,
      style:{display:'none'},
      onEnded: () => setOynatilan(null),
      onError: () => { setOynatilan(null); MR.toast && MR.toast('KAYIT OYNATMA HATASI', 'error'); }
    }),

    /* ═══ NOT MODALI ═══ */
    notModal && React.createElement('div', {
      style:{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.6)', zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center'},
      onClick: (e) => { if (e.target === e.currentTarget) setNotModal(null); }
    },
      React.createElement('div', {style:{...S.card, width:450, maxHeight:'80vh', overflow:'auto'}},
        React.createElement('div', {style:{...S.cardHead, justifyContent:'space-between'}},
          React.createElement('div', {style:{display:'flex', alignItems:'center', gap:8}},
            React.createElement(LIcon, {name:'FileText', size:16, color:C.accent}),
            React.createElement('span', null, 'GÖRÜŞME NOTU')
          ),
          React.createElement('button', {onClick:() => setNotModal(null), style:{background:'none', border:'none', cursor:'pointer', color:C.textMuted}},
            React.createElement(LIcon, {name:'X', size:18, color:C.textMuted})
          )
        ),
        React.createElement('div', {style:{padding:20}},
          React.createElement('div', {style:{marginBottom:12, fontSize:11, color:C.textSec}},
            React.createElement('strong', null, notModal.numara), ' - ', tarihFmt(notModal.baslangic_zamani)
          ),
          React.createElement('textarea', {
            style:{...S.input, minHeight:120, resize:'vertical', textTransform:'none'},
            value: notText,
            onChange: e => setNotText(e.target.value),
            placeholder: 'Görüşme notlarını buraya yazın...'
          }),
          React.createElement('div', {style:{marginTop:14, display:'flex', gap:8, justifyContent:'flex-end'}},
            React.createElement('button', {onClick:() => setNotModal(null), style:{...S.btn, ...S.btnG, fontSize:11}}, 'İPTAL'),
            React.createElement('button', {onClick:notKaydet, style:{...S.btn, ...S.btnP, fontSize:11}},
              React.createElement(LIcon, {name:'Save', size:14, color:'#fff'}), ' KAYDET'
            )
          )
        )
      )
    )
  );
};
