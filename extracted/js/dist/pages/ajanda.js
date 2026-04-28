const MR = window.MR || (window.MR = {});
const {
  useState,
  useEffect,
  useCallback
} = React;
MR.AjandaPage = ({
  setPage,
  user
}) => {
  const {
    C,
    S,
    LIcon,
    StatCard,
    Badge,
    SectionTitle,
    EmptyState,
    Loading,
    Modal,
    FormGroup,
    Confirm,
    api
  } = MR;
  const [gorevler, setGorevler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gorunum, setGorunum] = useState('takvim');
  const [ay, setAy] = useState(new Date().getMonth());
  const [yil, setYil] = useState(new Date().getFullYear());
  const [secilenGun, setSecilenGun] = useState(null);
  const [modalAcik, setModalAcik] = useState(false);
  const [duzenGorev, setDuzenGorev] = useState(null);
  const [silOnay, setSilOnay] = useState(null);
  const [oncelikF, setOncelikF] = useState('');
  const [durumF, setDurumF] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const bosForm = {
    baslik: '',
    aciklama: '',
    tarih: '',
    bitis_tarihi: '',
    hatirlatma: '',
    oncelik: 'normal',
    renk: C.accent,
    dosya_id: ''
  };
  const [form, setForm] = useState({
    ...bosForm
  });
  const oncelikRenk = o => {
    if (o === 'dusuk') return C.textMuted;
    if (o === 'normal') return C.accent;
    if (o === 'yuksek') return C.warning;
    if (o === 'acil') return C.danger;
    return C.accent;
  };
  const oncelikLabel = o => {
    if (o === 'dusuk') return 'DÜŞÜK';
    if (o === 'normal') return 'NORMAL';
    if (o === 'yuksek') return 'YÜKSEK';
    if (o === 'acil') return 'ACİL';
    return 'NORMAL';
  };
  const yukle = useCallback(async () => {
    setLoading(true);
    const p = {
      limit: 500
    };
    if (gorunum === 'takvim') {
      p.ay = yil + '-' + String(ay + 1).padStart(2, '0');
    }
    if (oncelikF) p.oncelik = oncelikF;
    if (durumF === 'tamamlanmamis') p.tamamlandi = 0;
    if (durumF === 'tamamlanmis') p.tamamlandi = 1;
    const r = await api.ajandaList(p);
    if (r?.success) {
      setGorevler(r.data?.items || r.data || []);
    }
    setLoading(false);
  }, [ay, yil, gorunum, oncelikF, durumF]);
  useEffect(() => {
    yukle();
  }, [yukle]);
  const up = (k, v) => setForm(p => ({
    ...p,
    [k]: v
  }));
  const modalAc = gorev => {
    if (gorev) {
      setDuzenGorev(gorev);
      setForm({
        baslik: gorev.baslik || '',
        aciklama: gorev.aciklama || '',
        tarih: gorev.tarih || '',
        bitis_tarihi: gorev.bitis_tarihi || '',
        hatirlatma: gorev.hatirlatma || '',
        oncelik: gorev.oncelik || 'normal',
        renk: gorev.renk || C.accent,
        dosya_id: gorev.dosya_id || ''
      });
    } else {
      setDuzenGorev(null);
      const varsayilanTarih = secilenGun ? yil + '-' + String(ay + 1).padStart(2, '0') + '-' + String(secilenGun).padStart(2, '0') + 'T09:00' : '';
      setForm({
        ...bosForm,
        tarih: varsayilanTarih
      });
    }
    setError('');
    setModalAcik(true);
  };
  const kaydet = async () => {
    if (!form.baslik.trim()) {
      setError('BAŞLIK ZORUNLUDUR');
      return;
    }
    if (!form.tarih) {
      setError('TARİH ZORUNLUDUR');
      return;
    }
    setSaving(true);
    setError('');
    const veri = {
      ...form
    };
    if (!veri.dosya_id) delete veri.dosya_id;
    if (!veri.bitis_tarihi) delete veri.bitis_tarihi;
    if (!veri.hatirlatma) delete veri.hatirlatma;
    if (!veri.aciklama) delete veri.aciklama;
    let r;
    if (duzenGorev) {
      r = await api.ajandaUpdate({
        id: duzenGorev.id,
        ...veri
      });
    } else {
      r = await api.ajandaCreate(veri);
    }
    if (r?.success) {
      setModalAcik(false);
      setDuzenGorev(null);
      setForm({
        ...bosForm
      });
      yukle();
    } else {
      setError(r?.error || 'KAYIT SIRASINDA HATA OLUŞTU');
    }
    setSaving(false);
  };
  const tamamlaToggle = async gorev => {
    const r = await api.ajandaUpdate({
      id: gorev.id,
      tamamlandi: gorev.tamamlandi ? 0 : 1
    });
    if (r?.success) yukle();
  };
  const sil = async () => {
    if (!silOnay) return;
    const r = await api.ajandaDelete(silOnay.id);
    if (r?.success) {
      setSilOnay(null);
      yukle();
    }
  };

  // ═══ İSTATİSTİKLER ═══
  const toplam = gorevler.length;
  const tamamlanan = gorevler.filter(g => g.tamamlandi).length;
  const bekleyen = toplam - tamamlanan;
  const acil = gorevler.filter(g => g.oncelik === 'acil' && !g.tamamlandi).length;

  // ═══ TAKVİM HESAPLAMALARI ═══
  const ayIsimleri = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'];
  const gunIsimleri = ['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ'];
  const ilkGun = new Date(yil, ay, 1);
  const sonGun = new Date(yil, ay + 1, 0);
  const gunSayisi = sonGun.getDate();
  let baslangicGunu = ilkGun.getDay() - 1;
  if (baslangicGunu < 0) baslangicGunu = 6;
  const bugun = new Date();
  const bugunStr = bugun.getFullYear() + '-' + String(bugun.getMonth() + 1).padStart(2, '0') + '-' + String(bugun.getDate()).padStart(2, '0');
  const gunGorevleri = gun => {
    const tarihStr = yil + '-' + String(ay + 1).padStart(2, '0') + '-' + String(gun).padStart(2, '0');
    return gorevler.filter(g => {
      if (!g.tarih) return false;
      const gt = g.tarih.substring(0, 10);
      return gt === tarihStr;
    });
  };
  const oncekiAy = () => {
    if (ay === 0) {
      setAy(11);
      setYil(yil - 1);
    } else setAy(ay - 1);
    setSecilenGun(null);
  };
  const sonrakiAy = () => {
    if (ay === 11) {
      setAy(0);
      setYil(yil + 1);
    } else setAy(ay + 1);
    setSecilenGun(null);
  };
  const secilenGunGorevleri = secilenGun ? gunGorevleri(secilenGun) : [];

  // ═══ RENK SEÇENEKLERİ ═══
  const renkSecenekleri = [C.accent, C.success, C.warning, C.danger, C.purple, C.cyan, C.pink, C.gold];

  // ═══ TAKVİM HÜCRELERİ ═══
  const takvimHucreleri = [];
  for (let i = 0; i < baslangicGunu; i++) {
    takvimHucreleri.push(null);
  }
  for (let g = 1; g <= gunSayisi; g++) {
    takvimHucreleri.push(g);
  }
  while (takvimHucreleri.length % 7 !== 0) {
    takvimHucreleri.push(null);
  }

  // ═══ LİSTE FİLTRELİ GÖREVLER ═══
  const filtrelenmis = gorevler.filter(g => {
    if (oncelikF && g.oncelik !== oncelikF) return false;
    if (durumF === 'tamamlanmamis' && g.tamamlandi) return false;
    if (durumF === 'tamamlanmis' && !g.tamamlandi) return false;
    return true;
  }).sort((a, b) => new Date(a.tarih) - new Date(b.tarih));

  // ═══ ÖNCELİK FİLTRE SEÇENEKLERİ ═══
  const oncelikSecenekleri = [{
    v: '',
    l: 'TÜMÜ'
  }, {
    v: 'dusuk',
    l: 'DÜŞÜK'
  }, {
    v: 'normal',
    l: 'NORMAL'
  }, {
    v: 'yuksek',
    l: 'YÜKSEK'
  }, {
    v: 'acil',
    l: 'ACİL'
  }];
  const durumSecenekleri = [{
    v: '',
    l: 'TÜMÜ'
  }, {
    v: 'tamamlanmamis',
    l: 'TAMAMLANMAMIŞ'
  }, {
    v: 'tamamlanmis',
    l: 'TAMAMLANMIŞ'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "fade-in"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 12,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    icon: "CalendarDays",
    label: "TOPLAM G\xD6REV",
    value: toplam,
    color: C.accent
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "CheckCircle",
    label: "TAMAMLANAN",
    value: tamamlanan,
    color: C.success
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "Clock",
    label: "BEKLEYEN",
    value: bekleyen,
    color: C.warning
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "AlertTriangle",
    label: "AC\u0130L",
    value: acil,
    color: C.danger
  })), /*#__PURE__*/React.createElement("div", {
    style: S.card
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.cardHead,
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "CalendarDays",
    size: 16,
    color: C.accent
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 700
    }
  }, "AJANDA"), /*#__PURE__*/React.createElement(Badge, {
    text: toplam + ' GÖREV',
    color: C.accent
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...(gorunum === 'takvim' ? S.btnP : S.btnG),
      fontSize: 11,
      padding: '8px 14px'
    },
    onClick: () => {
      setGorunum('takvim');
      setSecilenGun(null);
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Calendar",
    size: 14,
    color: gorunum === 'takvim' ? '#fff' : C.textSec
  }), " TAKV\u0130M"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...(gorunum === 'liste' ? S.btnP : S.btnG),
      fontSize: 11,
      padding: '8px 14px'
    },
    onClick: () => setGorunum('liste')
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "List",
    size: 14,
    color: gorunum === 'liste' ? '#fff' : C.textSec
  }), " L\u0130STE"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnS,
      fontSize: 11
    },
    onClick: () => modalAc(null)
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Plus",
    size: 14,
    color: "#fff"
  }), " YEN\u0130 G\xD6REV"))), loading ? /*#__PURE__*/React.createElement(Loading, null) : gorunum === 'takvim' ?
  /*#__PURE__*/
  /* ═══════════════════════════════════════════════════════
     TAKVİM GÖRÜNÜMÜ
     ═══════════════════════════════════════════════════════ */
  React.createElement("div", {
    style: {
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnG,
      fontSize: 11,
      padding: '8px 16px'
    },
    onClick: oncekiAy
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "ChevronLeft",
    size: 14,
    color: C.textSec
  }), " \xD6NCEK\u0130 AY"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16,
      fontWeight: 800,
      letterSpacing: 1
    }
  }, ayIsimleri[ay], " ", yil), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnG,
      fontSize: 11,
      padding: '8px 16px'
    },
    onClick: sonrakiAy
  }, "SONRAK\u0130 AY ", /*#__PURE__*/React.createElement(LIcon, {
    name: "ChevronRight",
    size: 14,
    color: C.textSec
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7,1fr)',
      gap: 2,
      marginBottom: 4
    }
  }, gunIsimleri.map(g => /*#__PURE__*/React.createElement("div", {
    key: g,
    style: {
      textAlign: 'center',
      fontSize: 10,
      fontWeight: 700,
      color: C.textMuted,
      padding: '8px 0',
      letterSpacing: 1
    }
  }, g))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7,1fr)',
      gap: 2
    }
  }, takvimHucreleri.map((gun, idx) => {
    if (gun === null) {
      return /*#__PURE__*/React.createElement("div", {
        key: 'bos-' + idx,
        style: {
          minHeight: 80,
          background: 'transparent',
          borderRadius: 8
        }
      });
    }
    const tarihStr = yil + '-' + String(ay + 1).padStart(2, '0') + '-' + String(gun).padStart(2, '0');
    const bugunMu = tarihStr === bugunStr;
    const seciliMi = secilenGun === gun;
    const gunG = gunGorevleri(gun);
    return /*#__PURE__*/React.createElement("div", {
      key: 'gun-' + gun,
      onClick: () => setSecilenGun(seciliMi ? null : gun),
      style: {
        minHeight: 80,
        padding: 6,
        borderRadius: 8,
        cursor: 'pointer',
        background: seciliMi ? `${C.accent}15` : C.bgHover,
        border: bugunMu ? `2px solid ${C.accent}` : seciliMi ? `2px solid ${C.accent}55` : `1px solid ${C.border}`,
        transition: 'all .2s',
        position: 'relative'
      },
      onMouseEnter: e => {
        if (!seciliMi) e.currentTarget.style.background = `${C.accent}11`;
      },
      onMouseLeave: e => {
        if (!seciliMi) e.currentTarget.style.background = C.bgHover;
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: bugunMu ? 800 : 600,
        color: bugunMu ? C.accent : C.text,
        marginBottom: 4
      }
    }, gun), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 3
      }
    }, gunG.slice(0, 4).map((g, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: g.renk || oncelikRenk(g.oncelik),
        opacity: g.tamamlandi ? 0.4 : 1
      }
    })), gunG.length > 4 && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 8,
        color: C.textMuted,
        fontWeight: 700
      }
    }, "+", gunG.length - 4)), gunG.length > 0 && gunG.length <= 2 && gunG.map((g, i) => /*#__PURE__*/React.createElement("div", {
      key: 't-' + i,
      style: {
        fontSize: 8,
        marginTop: 2,
        padding: '1px 4px',
        borderRadius: 4,
        background: `${g.renk || oncelikRenk(g.oncelik)}22`,
        color: g.renk || oncelikRenk(g.oncelik),
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        textDecoration: g.tamamlandi ? 'line-through' : 'none',
        opacity: g.tamamlandi ? 0.5 : 1
      }
    }, g.baslik)), gunG.length > 2 && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 8,
        color: C.textMuted,
        marginTop: 2,
        fontWeight: 600
      }
    }, gunG.length, " G\xD6REV"));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 300,
      borderLeft: `1px solid ${C.border}`,
      padding: 20,
      display: secilenGun ? 'block' : 'none',
      maxHeight: 'calc(100vh - 300px)',
      overflowY: 'auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700
    }
  }, secilenGun, " ", ayIsimleri[ay], " ", yil), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.textMuted
    }
  }, secilenGunGorevleri.length, " G\xD6REV")), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnP,
      fontSize: 10,
      padding: '6px 10px'
    },
    onClick: () => modalAc(null)
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Plus",
    size: 12,
    color: "#fff"
  }), " EKLE")), secilenGunGorevleri.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: 30,
      color: C.textMuted
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Calendar",
    size: 32,
    color: C.textMuted,
    style: {
      opacity: 0.3,
      marginBottom: 8
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11
    }
  }, "BU G\xDCN \u0130\xC7\u0130N G\xD6REV YOK")) : secilenGunGorevleri.map((g, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      background: C.bgHover,
      border: `1px solid ${C.border}`,
      borderLeft: `3px solid ${g.renk || oncelikRenk(g.oncelik)}`,
      cursor: 'pointer',
      transition: 'all .2s'
    },
    onMouseEnter: e => e.currentTarget.style.borderColor = C.accent,
    onMouseLeave: e => e.currentTarget.style.borderColor = C.border
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => {
      e.stopPropagation();
      tamamlaToggle(g);
    },
    style: {
      width: 18,
      height: 18,
      borderRadius: 4,
      cursor: 'pointer',
      border: g.tamamlandi ? `2px solid ${C.success}` : `2px solid ${C.borderLight}`,
      background: g.tamamlandi ? C.success : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }
  }, g.tamamlandi && /*#__PURE__*/React.createElement(LIcon, {
    name: "Check",
    size: 12,
    color: "#fff"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      flex: 1,
      textDecoration: g.tamamlandi ? 'line-through' : 'none',
      color: g.tamamlandi ? C.textMuted : C.text
    }
  }, g.baslik)), g.aciklama && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.textMuted,
      marginBottom: 6,
      marginLeft: 26
    }
  }, g.aciklama), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginLeft: 26
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    text: oncelikLabel(g.oncelik),
    color: oncelikRenk(g.oncelik)
  }), g.tarih && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: C.textMuted
    }
  }, g.tarih.substring(11, 16) || '')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginTop: 8,
      marginLeft: 26
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnG,
      fontSize: 9,
      padding: '4px 8px'
    },
    onClick: e => {
      e.stopPropagation();
      modalAc(g);
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Edit3",
    size: 10,
    color: C.textSec
  }), " D\xDCZENLE"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnD,
      fontSize: 9,
      padding: '4px 8px'
    },
    onClick: e => {
      e.stopPropagation();
      setSilOnay(g);
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Trash2",
    size: 10,
    color: "#fff"
  }), " S\u0130L")))))) :
  /*#__PURE__*/
  /* ═══════════════════════════════════════════════════════
     LİSTE GÖRÜNÜMÜ
     ═══════════════════════════════════════════════════════ */
  React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 20px',
      borderBottom: `1px solid ${C.border}`,
      display: 'flex',
      gap: 16,
      alignItems: 'center',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: C.textMuted,
      fontWeight: 600
    }
  }, "\xD6NCEL\u0130K:"), oncelikSecenekleri.map(o => /*#__PURE__*/React.createElement("span", {
    key: o.v,
    onClick: () => setOncelikF(o.v),
    style: {
      padding: '5px 12px',
      borderRadius: 20,
      fontSize: 10,
      fontWeight: oncelikF === o.v ? 700 : 400,
      cursor: 'pointer',
      background: oncelikF === o.v ? `${C.accent}22` : 'transparent',
      color: oncelikF === o.v ? C.accent : C.textSec,
      border: `1px solid ${oncelikF === o.v ? C.accent + '44' : C.border}`
    }
  }, o.l))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: C.textMuted,
      fontWeight: 600
    }
  }, "DURUM:"), durumSecenekleri.map(d => /*#__PURE__*/React.createElement("span", {
    key: d.v,
    onClick: () => setDurumF(d.v),
    style: {
      padding: '5px 12px',
      borderRadius: 20,
      fontSize: 10,
      fontWeight: durumF === d.v ? 700 : 400,
      cursor: 'pointer',
      background: durumF === d.v ? `${C.accent}22` : 'transparent',
      color: durumF === d.v ? C.accent : C.textSec,
      border: `1px solid ${durumF === d.v ? C.accent + '44' : C.border}`
    }
  }, d.l)))), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto'
    }
  }, filtrelenmis.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "CalendarDays",
    title: "G\xD6REV BULUNAMADI",
    desc: "SE\xC7\u0130LEN F\u0130LTRELERE UYGUN G\xD6REV BULUNMUYOR"
  }) : /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 11,
      minWidth: 700
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: C.bgHover
    }
  }, ['', 'BAŞLIK', 'TARİH', 'BİTİŞ TARİHİ', 'ÖNCELİK', 'DURUM', 'İŞLEMLER'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h || 'chk',
    style: {
      padding: '10px 8px',
      textAlign: 'left',
      color: C.textMuted,
      fontWeight: 600,
      fontSize: 9,
      borderBottom: `1px solid ${C.border}`
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, filtrelenmis.map((g, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderBottom: `1px solid ${C.border}`
    },
    onMouseEnter: e => e.currentTarget.style.background = C.bgHover,
    onMouseLeave: e => e.currentTarget.style.background = 'transparent'
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 8px',
      width: 36
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => tamamlaToggle(g),
    style: {
      width: 20,
      height: 20,
      borderRadius: 4,
      cursor: 'pointer',
      border: g.tamamlandi ? `2px solid ${C.success}` : `2px solid ${C.borderLight}`,
      background: g.tamamlandi ? C.success : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, g.tamamlandi && /*#__PURE__*/React.createElement(LIcon, {
    name: "Check",
    size: 14,
    color: "#fff"
  }))), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      textDecoration: g.tamamlandi ? 'line-through' : 'none',
      color: g.tamamlandi ? C.textMuted : C.text
    }
  }, g.baslik), g.aciklama && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.textMuted,
      marginTop: 2
    }
  }, g.aciklama.substring(0, 60), g.aciklama.length > 60 ? '...' : '')), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 8px',
      color: C.textSec,
      fontSize: 10
    }
  }, g.tarih ? new Date(g.tarih).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : '-'), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 8px',
      color: C.textMuted,
      fontSize: 10
    }
  }, g.bitis_tarihi ? new Date(g.bitis_tarihi).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : '-'), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 8px'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    text: oncelikLabel(g.oncelik),
    color: oncelikRenk(g.oncelik)
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 8px'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    text: g.tamamlandi ? 'TAMAMLANDI' : 'BEKLEYEN',
    color: g.tamamlandi ? C.success : C.warning
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnG,
      fontSize: 9,
      padding: '5px 10px'
    },
    onClick: () => modalAc(g)
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Edit3",
    size: 10,
    color: C.textSec
  }), " D\xDCZENLE"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnD,
      fontSize: 9,
      padding: '5px 10px'
    },
    onClick: () => setSilOnay(g)
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Trash2",
    size: 10,
    color: "#fff"
  }))))))))))), /*#__PURE__*/React.createElement(Modal, {
    open: modalAcik,
    onClose: () => {
      setModalAcik(false);
      setDuzenGorev(null);
    },
    title: duzenGorev ? 'GÖREV DÜZENLE' : 'YENİ GÖREV OLUŞTUR',
    width: "600px"
  }, error && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      background: `${C.danger}22`,
      border: `1px solid ${C.danger}44`,
      borderRadius: 8,
      marginBottom: 16,
      fontSize: 12,
      color: C.danger
    }
  }, error), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(FormGroup, {
    label: "BA\u015ELIK *",
    full: true
  }, /*#__PURE__*/React.createElement("input", {
    style: S.input,
    value: form.baslik,
    onChange: e => up('baslik', e.target.value),
    placeholder: "G\xD6REV BA\u015ELI\u011EI"
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "A\xC7IKLAMA",
    full: true
  }, /*#__PURE__*/React.createElement("textarea", {
    style: {
      ...S.input,
      minHeight: 70
    },
    value: form.aciklama,
    onChange: e => up('aciklama', e.target.value),
    placeholder: "G\xD6REV A\xC7IKLAMASI..."
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "TAR\u0130H *"
  }, /*#__PURE__*/React.createElement("input", {
    type: "datetime-local",
    style: S.input,
    value: form.tarih,
    onChange: e => up('tarih', e.target.value)
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "B\u0130T\u0130\u015E TAR\u0130H\u0130"
  }, /*#__PURE__*/React.createElement("input", {
    type: "datetime-local",
    style: S.input,
    value: form.bitis_tarihi,
    onChange: e => up('bitis_tarihi', e.target.value)
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "HATIRLATMA"
  }, /*#__PURE__*/React.createElement("input", {
    type: "datetime-local",
    style: S.input,
    value: form.hatirlatma,
    onChange: e => up('hatirlatma', e.target.value)
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "\xD6NCEL\u0130K"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.select,
    value: form.oncelik,
    onChange: e => up('oncelik', e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "dusuk"
  }, "D\xDC\u015E\xDCK"), /*#__PURE__*/React.createElement("option", {
    value: "normal"
  }, "NORMAL"), /*#__PURE__*/React.createElement("option", {
    value: "yuksek"
  }, "Y\xDCKSEK"), /*#__PURE__*/React.createElement("option", {
    value: "acil"
  }, "AC\u0130L"))), /*#__PURE__*/React.createElement(FormGroup, {
    label: "RENK"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      flexWrap: 'wrap'
    }
  }, renkSecenekleri.map(r => /*#__PURE__*/React.createElement("div", {
    key: r,
    onClick: () => up('renk', r),
    style: {
      width: 28,
      height: 28,
      borderRadius: 6,
      background: r,
      cursor: 'pointer',
      border: form.renk === r ? '3px solid #fff' : '2px solid transparent',
      boxShadow: form.renk === r ? `0 0 0 2px ${r}` : 'none',
      transition: 'all .2s'
    }
  })))), /*#__PURE__*/React.createElement(FormGroup, {
    label: "DOSYA ID (\u0130STE\u011EE BA\u011ELI)"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.input,
    value: form.dosya_id,
    onChange: e => up('dosya_id', e.target.value),
    placeholder: "DOSYA ID"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20,
      display: 'flex',
      gap: 8,
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnG
    },
    onClick: () => {
      setModalAcik(false);
      setDuzenGorev(null);
    }
  }, "\u0130PTAL"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnS
    },
    onClick: kaydet,
    disabled: saving
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Save",
    size: 14,
    color: "#fff"
  }), " ", saving ? 'KAYDEDİLİYOR...' : duzenGorev ? 'GÜNCELLE' : 'KAYDET'))), /*#__PURE__*/React.createElement(Confirm, {
    open: !!silOnay,
    message: 'BU GÖREVİ SİLMEK İSTEDİĞİNİZDEN EMİN MİSİNİZ? "' + (silOnay?.baslik || '') + '"',
    onConfirm: sil,
    onCancel: () => setSilOnay(null)
  }));
};