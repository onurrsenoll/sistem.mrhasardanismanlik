/**
 * MR HASAR DANIŞMANLIK - GÖRÜŞME KAYITLARI SAYFASI
 * Kayıtlı görüşmeleri listele, oynat, indir
 */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useCallback, useRef} = React;

MR.GorusmeKayitlariPage = ({setPage, user}) => {
  const {C, S, LIcon, api} = MR;

  /* ═══ STATE ═══ */
  const [kayitlar, setKayitlar] = useState([]);
  const [toplam, setToplam] = useState(0);
  const [sayfa, setSayfa] = useState(1);
  const [toplamSayfa, setToplamSayfa] = useState(1);
  const [yukleniyor, setYukleniyor] = useState(false);

  /* FİLTRELER */
  const [filtre, setFiltre] = useState({
    yon: '', q: '', donem: '', tarih_bas: '', tarih_son: ''
  });

  /* OYNATICI STATE */
  const [aktifKayit, setAktifKayit] = useState(null); /* Açık olan satırın log id'si */
  const [oynatiliyor, setOynatiliyor] = useState(false);
  const [sure, setSure] = useState(0);
  const [toplamSure, setToplamSure] = useState(0);
  const audioRef = useRef(null);
  const progressRef = useRef(null);

  /* ═══ KAYITLARI YÜKLE ═══ */
  const kayitlariYukle = useCallback(async (s = 1) => {
    setYukleniyor(true);
    const params = { sayfa: s, limit: 10, sadece_kayitli: 1 };
    if (filtre.yon) params.yon = filtre.yon;
    if (filtre.q) params.q = filtre.q;
    if (filtre.tarih_bas) params.tarih_bas = filtre.tarih_bas;
    if (filtre.tarih_son) params.tarih_son = filtre.tarih_son;

    /* Dönem filtresi → tarih aralığına çevir */
    if (filtre.donem && !filtre.tarih_bas && !filtre.tarih_son) {
      const now = new Date();
      if (filtre.donem === 'haftalik') {
        const d = new Date(now); d.setDate(d.getDate() - 7);
        params.tarih_bas = d.toISOString().slice(0,10);
      } else if (filtre.donem === 'aylik') {
        const d = new Date(now); d.setMonth(d.getMonth() - 1);
        params.tarih_bas = d.toISOString().slice(0,10);
      }
    }

    const res = await api.aramaLogList(params);
    if (res?.success && res.data) {
      setKayitlar(res.data.items || []);
      setToplam(res.data.toplam || 0);
      setSayfa(res.data.sayfa || 1);
      setToplamSayfa(res.data.toplam_sayfa || 1);
    }
    setYukleniyor(false);
  }, [filtre]);

  useEffect(() => { kayitlariYukle(1); }, [filtre]);

  /* ═══ AUDIO EVENT'LERİ ═══ */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => { setSure(audio.currentTime); };
    const onMeta = () => { setToplamSure(audio.duration || 0); };
    const onPlay = () => setOynatiliyor(true);
    const onPause = () => setOynatiliyor(false);
    const onEnd = () => { setOynatiliyor(false); setSure(0); };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnd);
    };
  }, []);

  /* ═══ OYNATICI FONKSİYONLARI ═══ */
  const oynat = (logId) => {
    if (aktifKayit === logId) {
      /* Aynı satıra tekrar tıklanırsa kapat */
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
      setAktifKayit(null);
      setOynatiliyor(false);
      setSure(0);
      setToplamSure(0);
      return;
    }
    setAktifKayit(logId);
    setSure(0);
    setToplamSure(0);
    setOynatiliyor(false);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.src = api.aramaLogKayitUrl(logId) + '&auth=' + encodeURIComponent(api.token || '');
        audioRef.current.play().catch(() => {});
      }
    }, 100);
  };

  const toggleOynat = () => {
    if (!audioRef.current) return;
    if (oynatiliyor) { audioRef.current.pause(); }
    else { audioRef.current.play().catch(() => {}); }
  };

  const ileriGeri = (sn) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.currentTime + sn, toplamSure));
  };

  const progressTikla = (e) => {
    if (!audioRef.current || !toplamSure) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    audioRef.current.currentTime = pct * toplamSure;
  };

  const indir = (logId, dosyaAdi) => {
    const url = api.aramaLogKayitUrl(logId) + '&mode=download&auth=' + encodeURIComponent(api.token || '');
    const a = document.createElement('a');
    a.href = url; a.download = dosyaAdi || ('kayit_' + logId + '.webm');
    document.body.appendChild(a); a.click(); a.remove();
  };

  /* ═══ YARDIMCI ═══ */
  const sureFmt = (sn) => {
    if (!sn || sn <= 0 || !isFinite(sn)) return '0:00';
    const dk = Math.floor(sn / 60);
    const s = Math.floor(sn % 60);
    return dk + ':' + (s < 10 ? '0' : '') + s;
  };

  const tarihFmt = (dt) => {
    if (!dt) return '-';
    try {
      const d = new Date(dt);
      return d.toLocaleDateString('tr-TR') + ' ' + d.toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'});
    } catch(e) { return dt; }
  };

  const boyutFmt = (b) => {
    if (!b) return '-';
    if (b < 1024) return b + ' B';
    if (b < 1024*1024) return Math.round(b/1024) + ' KB';
    return (b/(1024*1024)).toFixed(1) + ' MB';
  };

  /* ═══ RENDER ═══ */
  return React.createElement('div', {className:'fade-in'},

    /* BAŞLIK */
    React.createElement('div', {style:{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16}},
      React.createElement('div', {style:{display:'flex', alignItems:'center', gap:10}},
        React.createElement('div', {style:{width:40, height:40, borderRadius:12, background:C.purple+'15', display:'flex', alignItems:'center', justifyContent:'center'}},
          React.createElement(LIcon, {name:'Mic', size:20, color:C.purple})
        ),
        React.createElement('div', null,
          React.createElement('div', {style:{fontSize:16, fontWeight:800, color:C.text}}, 'GÖRÜŞME KAYITLARI'),
          React.createElement('div', {style:{fontSize:11, color:C.textMuted}}, toplam + ' KAYITLI GÖRÜŞME')
        )
      )
    ),

    /* FİLTRELER */
    React.createElement('div', {style:{...S.card, marginBottom:16}},
      React.createElement('div', {style:{padding:16, display:'flex', flexWrap:'wrap', gap:10, alignItems:'flex-end'}},

        /* ARAMA */
        React.createElement('div', {style:{flex:'1 1 180px'}},
          React.createElement('label', {style:{...S.label, fontSize:10}}, 'ARAMA'),
          React.createElement('input', {style:{...S.input, padding:'8px 12px', fontSize:12}, placeholder:'NUMARA VEYA İSİM...',
            value:filtre.q, onChange: e => setFiltre(p => ({...p, q:e.target.value}))
          })
        ),

        /* YÖN */
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

        /* DÖNEM */
        React.createElement('div', {style:{flex:'0 0 130px'}},
          React.createElement('label', {style:{...S.label, fontSize:10}}, 'DÖNEM'),
          React.createElement('select', {style:{...S.select, padding:'8px 12px', fontSize:12}, value:filtre.donem,
            onChange: e => setFiltre(p => ({...p, donem:e.target.value, tarih_bas:'', tarih_son:''}))
          },
            React.createElement('option', {value:''}, 'TÜMÜ'),
            React.createElement('option', {value:'haftalik'}, 'HAFTALIK'),
            React.createElement('option', {value:'aylik'}, 'AYLIK')
          )
        ),

        /* TARİH BAŞLANGIÇ */
        React.createElement('div', {style:{flex:'0 0 140px'}},
          React.createElement('label', {style:{...S.label, fontSize:10}}, 'BAŞLANGIÇ TARİHİ'),
          React.createElement('input', {type:'date', style:{...S.input, padding:'8px 12px', fontSize:12}, value:filtre.tarih_bas,
            onChange: e => setFiltre(p => ({...p, tarih_bas:e.target.value, donem:''}))
          })
        ),

        /* TARİH BİTİŞ */
        React.createElement('div', {style:{flex:'0 0 140px'}},
          React.createElement('label', {style:{...S.label, fontSize:10}}, 'BİTİŞ TARİHİ'),
          React.createElement('input', {type:'date', style:{...S.input, padding:'8px 12px', fontSize:12}, value:filtre.tarih_son,
            onChange: e => setFiltre(p => ({...p, tarih_son:e.target.value, donem:''}))
          })
        ),

        /* TEMİZLE */
        React.createElement('button', {
          onClick: () => setFiltre({yon:'', q:'', donem:'', tarih_bas:'', tarih_son:''}),
          style:{...S.btn, ...S.btnG, fontSize:10, padding:'8px 14px'}
        }, React.createElement(LIcon, {name:'RotateCcw', size:12, color:C.textSec}), ' TEMİZLE')
      )
    ),

    /* KAYIT TABLOSU */
    React.createElement('div', {style:S.card},
      React.createElement('div', {style:{...S.cardHead, justifyContent:'space-between'}},
        React.createElement('div', {style:{display:'flex', alignItems:'center', gap:8}},
          React.createElement(LIcon, {name:'Mic', size:16, color:C.purple}),
          React.createElement('span', null, 'KAYITLAR'),
          React.createElement('span', {style:{...S.badge(C.purple), fontSize:10, marginLeft:6}}, toplam + ' KAYIT')
        ),
        React.createElement('button', {
          onClick: () => kayitlariYukle(sayfa),
          style:{...S.btn, ...S.btnG, fontSize:10, padding:'6px 12px'}
        }, React.createElement(LIcon, {name:'RefreshCw', size:12, color:C.textSec}), ' YENİLE')
      ),

      React.createElement('div', {style:{overflowX:'auto'}},
        yukleniyor
          ? React.createElement('div', {style:{padding:40, textAlign:'center', color:C.textMuted}},
              React.createElement('div', {style:{width:24, height:24, border:'3px solid '+C.purple, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 10px'}}),
              'YÜKLENİYOR...'
            )
          : kayitlar.length === 0
            ? React.createElement('div', {style:{padding:40, textAlign:'center', color:C.textMuted, fontSize:13}},
                React.createElement(LIcon, {name:'MicOff', size:32, color:C.textMuted}),
                React.createElement('div', {style:{marginTop:10}}, 'GÖRÜŞME KAYDI BULUNAMADI')
              )
            : React.createElement('div', null,
                kayitlar.map(log => React.createElement('div', {key:log.id, style:{borderBottom:'1px solid '+C.border}},

                  /* ANA SATIR */
                  React.createElement('div', {style:{display:'flex', alignItems:'center', padding:'12px 16px', gap:12, fontSize:12}},

                    /* YÖN ICON */
                    React.createElement('div', {style:{flex:'0 0 24px'}},
                      React.createElement(LIcon, {name: log.yon === 'gelen' ? 'PhoneIncoming' : 'PhoneOutgoing', size:14,
                        color: log.yon === 'gelen' ? C.success : C.accent})
                    ),

                    /* NUMARA */
                    React.createElement('div', {style:{flex:'0 0 120px', fontWeight:700}}, log.numara || '-'),

                    /* MÜŞTERİ */
                    React.createElement('div', {style:{flex:'1 1 140px', fontWeight:600, fontSize:11}}, log.musteri_adi || '-'),

                    /* TARİH */
                    React.createElement('div', {style:{flex:'0 0 140px', fontSize:10, color:C.textSec}}, tarihFmt(log.baslangic_zamani)),

                    /* SÜRE */
                    React.createElement('div', {style:{flex:'0 0 60px', fontWeight:700, fontSize:11}},
                      log.sure_saniye > 0 ? sureFmt(log.sure_saniye) : '-'
                    ),

                    /* BOYUT */
                    React.createElement('div', {style:{flex:'0 0 70px', fontSize:10, color:C.textMuted}}, boyutFmt(log.kayit_boyut)),

                    /* OYNAT BUTONU */
                    React.createElement('button', {
                      onClick: () => oynat(log.id),
                      style:{...S.btnMini, ...(aktifKayit === log.id ? S.btnMiniD : S.btnMiniS), minWidth:70}
                    },
                      React.createElement(LIcon, {name: aktifKayit === log.id ? 'Square' : 'Play', size:10, color:'#fff'}),
                      aktifKayit === log.id ? ' KAPAT' : ' OYNAT'
                    ),

                    /* İNDİR BUTONU */
                    React.createElement('button', {
                      onClick: () => indir(log.id, log.kayit_dosya),
                      style:{...S.btnMini, ...S.btnMiniG, minWidth:60},
                      title:'İNDİR'
                    },
                      React.createElement(LIcon, {name:'Download', size:10, color:C.textSec}),
                      ' İNDİR'
                    )
                  ),

                  /* SATIR İÇİ PLAYER - SADECE AKTİF KAYITTA GÖSTERİLİR */
                  aktifKayit === log.id && React.createElement('div', {
                    style:{
                      padding:'8px 16px 14px', margin:'0 16px 10px',
                      background: C.bg2 || (MR.tema === 'koyu' ? 'rgba(30,41,59,0.5)' : 'rgba(241,245,249,0.8)'),
                      borderRadius:10, display:'flex', alignItems:'center', gap:10
                    }
                  },

                    /* GERİ 10sn */
                    React.createElement('button', {
                      onClick: () => ileriGeri(-10),
                      style:{background:'none', border:'none', cursor:'pointer', padding:4, display:'flex', alignItems:'center'},
                      title:'-10 SN'
                    }, React.createElement(LIcon, {name:'RotateCcw', size:16, color:C.textSec})),

                    /* PLAY / PAUSE */
                    React.createElement('button', {
                      onClick: toggleOynat,
                      style:{
                        width:36, height:36, borderRadius:'50%', border:'none', cursor:'pointer',
                        background:C.purple, display:'flex', alignItems:'center', justifyContent:'center'
                      }
                    }, React.createElement(LIcon, {name: oynatiliyor ? 'Pause' : 'Play', size:16, color:'#fff'})),

                    /* İLERİ 10sn */
                    React.createElement('button', {
                      onClick: () => ileriGeri(10),
                      style:{background:'none', border:'none', cursor:'pointer', padding:4, display:'flex', alignItems:'center'},
                      title:'+10 SN'
                    }, React.createElement(LIcon, {name:'RotateCw', size:16, color:C.textSec})),

                    /* SÜRE SOL */
                    React.createElement('span', {style:{fontSize:10, fontWeight:700, color:C.text, minWidth:36, textAlign:'right'}},
                      sureFmt(sure)
                    ),

                    /* PROGRESS BAR */
                    React.createElement('div', {
                      ref: progressRef,
                      onClick: progressTikla,
                      style:{
                        flex:1, height:6, borderRadius:3, cursor:'pointer', position:'relative',
                        background: MR.tema === 'koyu' ? 'rgba(100,116,139,0.3)' : 'rgba(148,163,184,0.3)'
                      }
                    },
                      /* Dolgu */
                      React.createElement('div', {
                        style:{
                          position:'absolute', top:0, left:0, height:'100%', borderRadius:3,
                          width: (toplamSure > 0 ? (sure / toplamSure * 100) : 0) + '%',
                          background: 'linear-gradient(90deg, ' + C.purple + ', ' + (C.accent || '#3b82f6') + ')',
                          transition: 'width 0.1s linear'
                        }
                      }),
                      /* Top (handle) */
                      React.createElement('div', {
                        style:{
                          position:'absolute', top:-4, borderRadius:'50%',
                          left: 'calc(' + (toplamSure > 0 ? (sure / toplamSure * 100) : 0) + '% - 7px)',
                          width:14, height:14, background:C.purple, border:'2px solid #fff',
                          boxShadow:'0 1px 4px rgba(0,0,0,0.3)', transition: 'left 0.1s linear'
                        }
                      })
                    ),

                    /* SÜRE SAĞ */
                    React.createElement('span', {style:{fontSize:10, fontWeight:700, color:C.textMuted, minWidth:36}},
                      sureFmt(toplamSure)
                    )
                  )
                ))
              )
      ),

      /* SAYFALAMA */
      toplamSayfa > 1 && React.createElement('div', {style:{padding:16, display:'flex', justifyContent:'center', alignItems:'center', gap:6}},
        React.createElement('button', {
          onClick: () => kayitlariYukle(sayfa - 1),
          disabled: sayfa <= 1,
          style:{...S.btn, ...S.btnG, fontSize:10, padding:'6px 12px', opacity: sayfa <= 1 ? 0.5 : 1}
        }, '« ÖNCEKİ'),
        React.createElement('span', {style:{padding:'8px 14px', fontSize:11, fontWeight:700, color:C.textSec}}, sayfa + ' / ' + toplamSayfa),
        React.createElement('button', {
          onClick: () => kayitlariYukle(sayfa + 1),
          disabled: sayfa >= toplamSayfa,
          style:{...S.btn, ...S.btnG, fontSize:10, padding:'6px 12px', opacity: sayfa >= toplamSayfa ? 0.5 : 1}
        }, 'SONRAKİ »')
      )
    ),

    /* GİZLİ AUDIO ELEMENT */
    React.createElement('audio', {
      ref: audioRef,
      style:{display:'none'},
      preload:'metadata',
      onError: () => { MR.toast && MR.toast('KAYIT OYNATMA HATASI', 'error'); }
    })
  );
};
