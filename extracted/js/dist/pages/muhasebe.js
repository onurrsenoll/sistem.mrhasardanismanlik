/* ============================================================
   MR HASAR DANIŞMANLIK – MUHASEBE MODÜLÜ (muhasebe.js)
   KASA YÖNETİMİ, HAREKETLER, GELİR, TRANSFER, RAPOR
   ============================================================ */
const MR = window.MR || (window.MR = {});
const {
  useState,
  useEffect,
  useRef,
  useMemo
} = React;

/* ═══════════════════════════════════════════════════════════
   ANA SAYFA BİLEŞENİ – SEKME YAPISI
   ═══════════════════════════════════════════════════════════ */
MR.MuhasebePage = ({
  setPage,
  user,
  subPage
}) => {
  const {
    C,
    S,
    LIcon
  } = MR;
  const aktifSekme = subPage || 'kasa';
  const sekmeler = [{
    key: 'kasa',
    label: 'KASA YÖNETİMİ',
    icon: 'Wallet'
  }, {
    key: 'hareketler',
    label: 'HAREKETLER',
    icon: 'ArrowLeftRight'
  }, {
    key: 'gelir',
    label: 'GELİR EKLE',
    icon: 'TrendingUp'
  }, {
    key: 'transfer',
    label: 'TRANSFER',
    icon: 'ArrowRightLeft'
  }, {
    key: 'rapor',
    label: 'RAPOR',
    icon: 'BarChart3'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "fade-in"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginBottom: 20,
      background: C.bgCard,
      borderRadius: 12,
      padding: 6,
      border: `1px solid ${C.border}`
    }
  }, sekmeler.map(s => {
    const aktif = aktifSekme === s.key;
    return /*#__PURE__*/React.createElement("div", {
      key: s.key,
      onClick: () => setPage('muhasebe-' + s.key),
      style: {
        flex: 1,
        padding: '12px 8px',
        borderRadius: 8,
        cursor: 'pointer',
        textAlign: 'center',
        background: aktif ? `${C.accent}22` : 'transparent',
        border: `1px solid ${aktif ? C.accent + '44' : 'transparent'}`,
        transition: 'all .2s'
      },
      onMouseEnter: e => {
        if (!aktif) e.currentTarget.style.background = C.bgHover;
      },
      onMouseLeave: e => {
        if (!aktif) e.currentTarget.style.background = 'transparent';
      }
    }, /*#__PURE__*/React.createElement(LIcon, {
      name: s.icon,
      size: 16,
      color: aktif ? C.accent : C.textMuted,
      style: {
        marginBottom: 4
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: aktif ? 700 : 500,
        color: aktif ? C.accent : C.textSec,
        marginTop: 4,
        letterSpacing: 0.5
      }
    }, s.label));
  })), aktifSekme === 'kasa' && /*#__PURE__*/React.createElement(KasaYonetimi, {
    setPage: setPage,
    user: user
  }), aktifSekme === 'hareketler' && /*#__PURE__*/React.createElement(Hareketler, {
    setPage: setPage,
    user: user
  }), aktifSekme === 'gelir' && /*#__PURE__*/React.createElement(GelirEkle, {
    setPage: setPage,
    user: user
  }), aktifSekme === 'transfer' && /*#__PURE__*/React.createElement(Transfer, {
    setPage: setPage,
    user: user
  }), aktifSekme === 'rapor' && /*#__PURE__*/React.createElement(Rapor, {
    setPage: setPage,
    user: user
  }));
};

/* ═══════════════════════════════════════════════════════════
   SEKME 1 – KASA YÖNETİMİ
   ═══════════════════════════════════════════════════════════ */
const KasaYonetimi = ({
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
    Loading,
    EmptyState,
    Modal,
    FormGroup,
    Confirm,
    api,
    fmt
  } = MR;
  const [kasalar, setKasalar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAcik, setModalAcik] = useState(false);
  const [duzenle, setDuzenle] = useState(null);
  const [form, setForm] = useState({
    ad: '',
    tur: 'nakit',
    banka_adi: '',
    iban: ''
  });
  const [kayitLoading, setKayitLoading] = useState(false);
  const [hata, setHata] = useState('');
  const [confirm, setConfirm] = useState({
    open: false,
    msg: '',
    cb: null
  });
  const yukle = async () => {
    setLoading(true);
    const r = await api.kasaList();
    if (r?.success) setKasalar(r.data || []);
    setLoading(false);
  };
  useEffect(() => {
    yukle();
  }, []);

  /* İSTATİSTİKLER */
  const istatistik = useMemo(() => {
    const aktifler = kasalar.filter(k => k.aktif !== false && k.aktif !== 0);
    const topBakiye = aktifler.reduce((t, k) => t + (parseFloat(k.bakiye) || 0), 0);
    const nakitBakiye = aktifler.filter(k => k.tur === 'nakit').reduce((t, k) => t + (parseFloat(k.bakiye) || 0), 0);
    const bankaBakiye = aktifler.filter(k => k.tur === 'banka').reduce((t, k) => t + (parseFloat(k.bakiye) || 0), 0);
    return {
      topBakiye,
      nakitBakiye,
      bankaBakiye,
      sayi: kasalar.length
    };
  }, [kasalar]);

  /* YENİ / DÜZENLE MODAL AÇ */
  const yeniKasaAc = () => {
    setDuzenle(null);
    setForm({
      ad: '',
      tur: 'nakit',
      banka_adi: '',
      iban: ''
    });
    setHata('');
    setModalAcik(true);
  };
  const duzenleAc = kasa => {
    setDuzenle(kasa);
    setForm({
      ad: kasa.ad || '',
      tur: kasa.tur || 'nakit',
      banka_adi: kasa.banka_adi || '',
      iban: kasa.iban || ''
    });
    setHata('');
    setModalAcik(true);
  };

  /* KAYDET */
  const kaydet = async () => {
    if (!form.ad.trim()) {
      setHata('KASA ADI ZORUNLUDUR');
      return;
    }
    if (form.tur === 'banka' && !form.banka_adi.trim()) {
      setHata('BANKA ADI ZORUNLUDUR');
      return;
    }
    setKayitLoading(true);
    setHata('');
    let r;
    if (duzenle) {
      r = await api.kasaUpdate({
        id: duzenle.id,
        ad: form.ad,
        banka_adi: form.banka_adi,
        iban: form.iban,
        aktif: duzenle.aktif
      });
    } else {
      r = await api.kasaCreate({
        ad: form.ad,
        tur: form.tur,
        banka_adi: form.banka_adi,
        iban: form.iban
      });
    }
    if (r?.success) {
      setModalAcik(false);
      yukle();
    } else {
      setHata(r?.error || 'KAYIT HATASI');
    }
    setKayitLoading(false);
  };

  /* AKTİF / PASİF TOGGLE */
  const toggleAktif = kasa => {
    const yeniDurum = kasa.aktif === false || kasa.aktif === 0 ? true : false;
    const mesaj = yeniDurum ? `"${kasa.ad}" KASASINI AKTİF ETMEK İSTİYOR MUSUNUZ?` : `"${kasa.ad}" KASASINI PASİF YAPMAK İSTİYOR MUSUNUZ?`;
    setConfirm({
      open: true,
      msg: mesaj,
      cb: async () => {
        setConfirm({
          open: false,
          msg: '',
          cb: null
        });
        const r = await api.kasaUpdate({
          id: kasa.id,
          ad: kasa.ad,
          banka_adi: kasa.banka_adi,
          iban: kasa.iban,
          aktif: yeniDurum
        });
        if (r?.success) yukle();
      }
    });
  };
  if (loading) return /*#__PURE__*/React.createElement(Loading, null);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 14,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    icon: "Wallet",
    label: "TOPLAM BAK\u0130YE",
    value: fmt(istatistik.topBakiye),
    color: C.accent
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "Banknote",
    label: "NAK\u0130T BAK\u0130YE",
    value: fmt(istatistik.nakitBakiye),
    color: C.success
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "Building2",
    label: "BANKA BAK\u0130YE",
    value: fmt(istatistik.bankaBakiye),
    color: C.cyan
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "Hash",
    label: "KASA SAYISI",
    value: istatistik.sayi,
    color: C.purple
  })), /*#__PURE__*/React.createElement("div", {
    style: S.card
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "Wallet",
    title: "KASALAR",
    sub: `${kasalar.length} KASA TANIMLI`,
    right: /*#__PURE__*/React.createElement("button", {
      style: {
        ...S.btn,
        ...S.btnP,
        fontSize: 11
      },
      onClick: yeniKasaAc
    }, /*#__PURE__*/React.createElement(LIcon, {
      name: "Plus",
      size: 14,
      color: "#fff"
    }), " YEN\u0130 KASA")
  }), /*#__PURE__*/React.createElement("div", {
    style: S.cardBody
  }, kasalar.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "Wallet",
    title: "KASA BULUNAMADI",
    desc: "YEN\u0130 KASA OLU\u015ETURMAK \u0130\xC7\u0130N YUKARIDAKI BUTONA TIKLAYIN"
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 16
    }
  }, kasalar.map((kasa, idx) => {
    const pasif = kasa.aktif === false || kasa.aktif === 0;
    const bakiye = parseFloat(kasa.bakiye) || 0;
    const turRenk = kasa.tur === 'nakit' ? C.success : C.cyan;
    return /*#__PURE__*/React.createElement("div", {
      key: kasa.id || idx,
      style: {
        background: pasif ? `${C.bgHover}88` : C.bgCard,
        borderRadius: 12,
        border: `1px solid ${pasif ? C.border : turRenk + '33'}`,
        padding: 20,
        position: 'relative',
        opacity: pasif ? 0.6 : 1,
        transition: 'all .2s'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 700,
        marginBottom: 6
      }
    }, kasa.ad), /*#__PURE__*/React.createElement(Badge, {
      text: kasa.tur === 'nakit' ? 'NAKİT' : 'BANKA',
      color: turRenk
    }), pasif && /*#__PURE__*/React.createElement(Badge, {
      text: "PAS\u0130F",
      color: C.danger
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      onClick: () => duzenleAc(kasa),
      style: {
        width: 30,
        height: 30,
        borderRadius: 8,
        background: `${C.accent}22`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer'
      },
      title: "D\xDCZENLE"
    }, /*#__PURE__*/React.createElement(LIcon, {
      name: "Pencil",
      size: 13,
      color: C.accent
    })), /*#__PURE__*/React.createElement("div", {
      onClick: () => toggleAktif(kasa),
      style: {
        width: 30,
        height: 30,
        borderRadius: 8,
        background: pasif ? `${C.success}22` : `${C.danger}22`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer'
      },
      title: pasif ? 'AKTİF ET' : 'PASİF YAP'
    }, /*#__PURE__*/React.createElement(LIcon, {
      name: pasif ? 'ToggleRight' : 'ToggleLeft',
      size: 13,
      color: pasif ? C.success : C.danger
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 26,
        fontWeight: 800,
        color: bakiye >= 0 ? C.success : C.danger,
        marginBottom: 16,
        letterSpacing: -0.5
      }
    }, fmt(bakiye)), kasa.tur === 'banka' && /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: `1px solid ${C.border}`,
        paddingTop: 12
      }
    }, kasa.banka_adi && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement(LIcon, {
      name: "Building2",
      size: 12,
      color: C.textMuted
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: C.textSec
      }
    }, kasa.banka_adi)), kasa.iban && /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(LIcon, {
      name: "CreditCard",
      size: 12,
      color: C.textMuted
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: C.textMuted,
        fontFamily: 'monospace',
        letterSpacing: 1
      }
    }, kasa.iban))));
  })))), /*#__PURE__*/React.createElement(Modal, {
    open: modalAcik,
    onClose: () => setModalAcik(false),
    title: duzenle ? 'KASA DÜZENLE' : 'YENİ KASA OLUŞTUR',
    width: "500px"
  }, hata && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      background: `${C.danger}22`,
      borderRadius: 8,
      marginBottom: 16,
      fontSize: 12,
      color: C.danger
    }
  }, hata), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(FormGroup, {
    label: "KASA ADI *"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.input,
    value: form.ad,
    onChange: e => setForm(p => ({
      ...p,
      ad: e.target.value.toUpperCase()
    })),
    placeholder: "KASA ADI"
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "T\xDCR *"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.select,
    value: form.tur,
    onChange: e => setForm(p => ({
      ...p,
      tur: e.target.value
    })),
    disabled: !!duzenle
  }, /*#__PURE__*/React.createElement("option", {
    value: "nakit"
  }, "NAK\u0130T"), /*#__PURE__*/React.createElement("option", {
    value: "banka"
  }, "BANKA"))), form.tur === 'banka' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(FormGroup, {
    label: "BANKA ADI"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.input,
    value: form.banka_adi,
    onChange: e => setForm(p => ({
      ...p,
      banka_adi: e.target.value.toUpperCase()
    })),
    placeholder: "BANKA ADI"
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "IBAN"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.input,
    value: form.iban,
    onChange: e => setForm(p => ({
      ...p,
      iban: e.target.value.toUpperCase()
    })),
    placeholder: "TR00 0000 0000 0000 0000 0000 00",
    maxLength: 32
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24,
      display: 'flex',
      gap: 8,
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnG
    },
    onClick: () => setModalAcik(false)
  }, "\u0130PTAL"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnP
    },
    onClick: kaydet,
    disabled: kayitLoading
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Save",
    size: 14,
    color: "#fff"
  }), " ", kayitLoading ? 'KAYDEDİLİYOR...' : 'KAYDET'))), /*#__PURE__*/React.createElement(Confirm, {
    open: confirm.open,
    message: confirm.msg,
    onConfirm: () => confirm.cb && confirm.cb(),
    onCancel: () => setConfirm({
      open: false,
      msg: '',
      cb: null
    })
  }));
};

/* ═══════════════════════════════════════════════════════════
   SEKME 2 – HAREKETLER
   ═══════════════════════════════════════════════════════════ */
const Hareketler = ({
  setPage,
  user
}) => {
  const {
    C,
    S,
    LIcon,
    Badge,
    SectionTitle,
    Loading,
    EmptyState,
    api,
    fmt
  } = MR;
  const [kasalar, setKasalar] = useState([]);
  const [hareketler, setHareketler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toplam, setToplam] = useState(0);

  /* FİLTRELER */
  const [kasaF, setKasaF] = useState('');
  const [turF, setTurF] = useState('');
  const [baslangic, setBaslangic] = useState('');
  const [bitis, setBitis] = useState('');

  /* SAYFALAMA */
  const limit = 20;
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const kasaYukle = async () => {
    const r = await api.kasaList();
    if (r?.success) setKasalar(r.data || []);
  };
  const yukle = async () => {
    setLoading(true);
    const p = {
      limit,
      offset
    };
    if (kasaF) p.kasa_id = kasaF;
    if (turF) p.tur = turF;
    if (baslangic) p.baslangic = baslangic;
    if (bitis) p.bitis = bitis;
    const r = await api.kasaHareketler(p);
    if (r?.success) {
      setHareketler(r.data?.items || r.data || []);
      setTotalCount(r.data?.pagination?.total || r.data?.toplam || (r.data?.items || r.data || []).length);
      setToplam(r.data?.toplam_tutar || 0);
    }
    setLoading(false);
  };
  useEffect(() => {
    kasaYukle();
  }, []);
  useEffect(() => {
    yukle();
  }, [kasaF, turF, baslangic, bitis, offset]);
  const kasaAdi = id => {
    const k = kasalar.find(k => k.id == id);
    return k ? k.ad : '-';
  };
  const turRenk = tur => {
    if (tur === 'giris' || tur === 'gelir' || tur === 'komisyon') return C.success;
    if (tur === 'cikis' || tur === 'gider') return C.danger;
    if (tur === 'transfer') return C.warning;
    return C.textSec;
  };
  const turLabel = tur => {
    const map = {
      giris: 'GİRİŞ',
      cikis: 'ÇIKIŞ',
      gelir: 'GELİR',
      gider: 'GİDER',
      komisyon: 'KOMİSYON',
      transfer: 'TRANSFER'
    };
    return map[tur] || (tur || '').toUpperCase();
  };
  const toplamSayfa = Math.ceil(totalCount / limit);
  const mevcutSayfa = Math.floor(offset / limit) + 1;

  /* TOPLAM HESAPLAMA */
  const hareketToplam = useMemo(() => {
    return hareketler.reduce((t, h) => {
      const tutar = parseFloat(h.tutar) || 0;
      if (h.tur === 'giris' || h.tur === 'gelir' || h.tur === 'komisyon') return t + tutar;
      if (h.tur === 'cikis' || h.tur === 'gider') return t - tutar;
      return t;
    }, 0);
  }, [hareketler]);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: S.card
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "ArrowLeftRight",
    title: "KASA HAREKETLER\u0130",
    sub: `TOPLAM ${totalCount} HAREKET`
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 20px',
      borderBottom: `1px solid ${C.border}`,
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      ...S.label,
      marginBottom: 4
    }
  }, "KASA"), /*#__PURE__*/React.createElement("select", {
    style: {
      ...S.select,
      width: 180,
      fontSize: 11
    },
    value: kasaF,
    onChange: e => {
      setKasaF(e.target.value);
      setOffset(0);
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "T\xDCM\xDC"), kasalar.map(k => /*#__PURE__*/React.createElement("option", {
    key: k.id,
    value: k.id
  }, k.ad)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      ...S.label,
      marginBottom: 4
    }
  }, "T\xDCR"), /*#__PURE__*/React.createElement("select", {
    style: {
      ...S.select,
      width: 140,
      fontSize: 11
    },
    value: turF,
    onChange: e => {
      setTurF(e.target.value);
      setOffset(0);
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "T\xDCM\xDC"), /*#__PURE__*/React.createElement("option", {
    value: "giris"
  }, "G\u0130R\u0130\u015E"), /*#__PURE__*/React.createElement("option", {
    value: "cikis"
  }, "\xC7IKI\u015E"), /*#__PURE__*/React.createElement("option", {
    value: "transfer"
  }, "TRANSFER"), /*#__PURE__*/React.createElement("option", {
    value: "gelir"
  }, "GEL\u0130R"), /*#__PURE__*/React.createElement("option", {
    value: "komisyon"
  }, "KOM\u0130SYON"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      ...S.label,
      marginBottom: 4
    }
  }, "BA\u015ELANGI\xC7"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    style: {
      ...S.input,
      width: 150,
      fontSize: 11
    },
    value: baslangic,
    onChange: e => {
      setBaslangic(e.target.value);
      setOffset(0);
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      ...S.label,
      marginBottom: 4
    }
  }, "B\u0130T\u0130\u015E"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    style: {
      ...S.input,
      width: 150,
      fontSize: 11
    },
    value: bitis,
    onChange: e => {
      setBitis(e.target.value);
      setOffset(0);
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      alignSelf: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnG,
      fontSize: 11
    },
    onClick: () => {
      setKasaF('');
      setTurF('');
      setBaslangic('');
      setBitis('');
      setOffset(0);
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "RotateCcw",
    size: 13,
    color: C.textSec
  }), " TEM\u0130ZLE"))), loading ? /*#__PURE__*/React.createElement(Loading, null) : /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto'
    }
  }, hareketler.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "ArrowLeftRight",
    title: "HAREKET BULUNAMADI",
    desc: "SE\xC7\u0130LEN F\u0130LTRELERE UYGUN HAREKET BULUNMAMAKTADIR"
  }) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 11,
      minWidth: 800
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: C.bgHover
    }
  }, ['TARİH', 'KASA', 'TÜR', 'TUTAR', 'AÇIKLAMA', 'DOSYA NO'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '10px 12px',
      textAlign: 'left',
      color: C.textMuted,
      fontWeight: 600,
      fontSize: 10,
      borderBottom: `1px solid ${C.border}`
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, hareketler.map((h, i) => {
    const tutar = parseFloat(h.tutar) || 0;
    const giris = h.tur === 'giris' || h.tur === 'gelir' || h.tur === 'komisyon';
    return /*#__PURE__*/React.createElement("tr", {
      key: h.id || i,
      style: {
        borderBottom: `1px solid ${C.border}`
      },
      onMouseEnter: e => e.currentTarget.style.background = C.bgHover,
      onMouseLeave: e => e.currentTarget.style.background = 'transparent'
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '10px 12px',
        color: C.textSec,
        fontSize: 11
      }
    }, h.tarih || h.created_at?.split(' ')[0] || '-'), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '10px 12px',
        fontWeight: 600
      }
    }, h.kasa_adi || kasaAdi(h.kasa_id)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '10px 12px'
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      text: turLabel(h.tur),
      color: turRenk(h.tur)
    })), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '10px 12px',
        fontWeight: 700,
        color: giris ? C.success : C.danger,
        fontSize: 12
      }
    }, giris ? '+' : '-', fmt(tutar)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '10px 12px',
        color: C.textSec,
        maxWidth: 250,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, h.aciklama || '-'), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '10px 12px'
      }
    }, h.dosya_no ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: C.accent,
        fontWeight: 600,
        cursor: 'pointer'
      },
      onClick: () => h.dosya_id && setPage('dosya-detay-' + h.dosya_id)
    }, h.dosya_no) : /*#__PURE__*/React.createElement("span", {
      style: {
        color: C.textMuted
      }
    }, "-")));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 20px',
      borderTop: `1px solid ${C.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: `${C.accent}08`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: C.textSec
    }
  }, "SAYFA TOPLAMI: ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: hareketToplam >= 0 ? C.success : C.danger,
      fontSize: 14
    }
  }, fmt(hareketToplam)))), toplamSayfa > 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 20px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnG,
      fontSize: 11,
      padding: '6px 12px'
    },
    disabled: mevcutSayfa <= 1,
    onClick: () => setOffset(Math.max(0, offset - limit))
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "ChevronLeft",
    size: 14,
    color: C.textSec
  }), " \xD6NCEK\u0130"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: C.textSec,
      fontWeight: 600
    }
  }, mevcutSayfa, " / ", toplamSayfa), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnG,
      fontSize: 11,
      padding: '6px 12px'
    },
    disabled: mevcutSayfa >= toplamSayfa,
    onClick: () => setOffset(offset + limit)
  }, "SONRAK\u0130 ", /*#__PURE__*/React.createElement(LIcon, {
    name: "ChevronRight",
    size: 14,
    color: C.textSec
  })))))));
};

/* ═══════════════════════════════════════════════════════════
   SEKME 3 – GELİR EKLE
   ═══════════════════════════════════════════════════════════ */
const GelirEkle = ({
  setPage,
  user
}) => {
  const {
    C,
    S,
    LIcon,
    SectionTitle,
    FormGroup,
    Badge,
    Loading,
    EmptyState,
    api,
    fmt,
    fmtInput,
    parseNum
  } = MR;
  const [kasalar, setKasalar] = useState([]);
  const [form, setForm] = useState({
    kasa_id: '',
    dosya_id: '',
    tur: 'gelir',
    tutar: '',
    aciklama: ''
  });
  const [loading, setLoading] = useState(false);
  const [kayitLoading, setKayitLoading] = useState(false);
  const [hata, setHata] = useState('');
  const [basari, setBasari] = useState('');
  const [sonGelirler, setSonGelirler] = useState([]);
  const [gelirLoading, setGelirLoading] = useState(true);
  const yukle = async () => {
    const r = await api.kasaList();
    if (r?.success) {
      const aktifler = (r.data || []).filter(k => k.aktif !== false && k.aktif !== 0);
      setKasalar(aktifler);
      if (aktifler.length > 0 && !form.kasa_id) setForm(p => ({
        ...p,
        kasa_id: String(aktifler[0].id)
      }));
    }
  };
  const sonGelirYukle = async () => {
    setGelirLoading(true);
    const r = await api.kasaHareketler({
      tur: 'gelir',
      limit: 10
    });
    if (r?.success) setSonGelirler(r.data?.items || r.data || []);
    setGelirLoading(false);
  };
  useEffect(() => {
    yukle();
    sonGelirYukle();
  }, []);
  const up = (k, v) => setForm(p => ({
    ...p,
    [k]: v
  }));
  const tutarDegistir = v => {
    setForm(p => ({
      ...p,
      tutar: fmtInput(v)
    }));
  };
  const kaydet = async () => {
    if (!form.kasa_id) {
      setHata('KASA SEÇİMİ ZORUNLUDUR');
      return;
    }
    const tutarNum = parseNum(form.tutar);
    if (tutarNum <= 0) {
      setHata('TUTAR 0\'DAN BÜYÜK OLMALIDIR');
      return;
    }
    if (!form.aciklama.trim()) {
      setHata('AÇIKLAMA ZORUNLUDUR');
      return;
    }
    setKayitLoading(true);
    setHata('');
    setBasari('');
    const gonder = {
      kasa_id: parseInt(form.kasa_id),
      tur: form.tur,
      tutar: tutarNum,
      aciklama: form.aciklama
    };
    if (form.dosya_id) gonder.dosya_id = parseInt(form.dosya_id);
    const r = await api.gelirEkle(gonder);
    if (r?.success) {
      setBasari('GELİR BAŞARIYLA KAYDEDİLDİ');
      setForm(p => ({
        ...p,
        dosya_id: '',
        tutar: '',
        aciklama: ''
      }));
      sonGelirYukle();
      setTimeout(() => setBasari(''), 3000);
    } else {
      setHata(r?.error || 'KAYIT HATASI');
    }
    setKayitLoading(false);
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: S.card
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "TrendingUp",
    title: "GEL\u0130R EKLE",
    sub: "KASA HESABINA GEL\u0130R KAYDI OLU\u015ETURUN"
  }), /*#__PURE__*/React.createElement("div", {
    style: S.cardBody
  }, hata && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      background: `${C.danger}22`,
      borderRadius: 8,
      marginBottom: 16,
      fontSize: 12,
      color: C.danger,
      border: `1px solid ${C.danger}44`
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "AlertTriangle",
    size: 14,
    color: C.danger,
    style: {
      marginRight: 6
    }
  }), hata), basari && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      background: `${C.success}22`,
      borderRadius: 8,
      marginBottom: 16,
      fontSize: 12,
      color: C.success,
      border: `1px solid ${C.success}44`
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "CheckCircle",
    size: 14,
    color: C.success,
    style: {
      marginRight: 6
    }
  }), basari), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16,
      maxWidth: 700
    }
  }, /*#__PURE__*/React.createElement(FormGroup, {
    label: "KASA SE\xC7\u0130M\u0130 *"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.select,
    value: form.kasa_id,
    onChange: e => up('kasa_id', e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "KASA SE\xC7\u0130N\u0130Z"), kasalar.map(k => /*#__PURE__*/React.createElement("option", {
    key: k.id,
    value: k.id
  }, k.ad, " (", k.tur === 'nakit' ? 'NAKİT' : 'BANKA', ")")))), /*#__PURE__*/React.createElement(FormGroup, {
    label: "DOSYA NO (OPS\u0130YONEL)"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.input,
    value: form.dosya_id,
    onChange: e => up('dosya_id', e.target.value),
    placeholder: "DOSYA ID"
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "T\xDCR *"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.select,
    value: form.tur,
    onChange: e => up('tur', e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "gelir"
  }, "GEL\u0130R"), /*#__PURE__*/React.createElement("option", {
    value: "komisyon"
  }, "KOM\u0130SYON"))), /*#__PURE__*/React.createElement(FormGroup, {
    label: "TUTAR *"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      color: C.textMuted,
      fontSize: 14,
      fontWeight: 700
    }
  }, "\u20BA"), /*#__PURE__*/React.createElement("input", {
    style: {
      ...S.input,
      paddingLeft: 30,
      fontSize: 16,
      fontWeight: 700
    },
    value: form.tutar,
    onChange: e => tutarDegistir(e.target.value),
    placeholder: "0,00"
  }))), /*#__PURE__*/React.createElement(FormGroup, {
    label: "A\xC7IKLAMA *",
    full: true
  }, /*#__PURE__*/React.createElement("textarea", {
    style: {
      ...S.input,
      minHeight: 70
    },
    value: form.aciklama,
    onChange: e => up('aciklama', e.target.value.toUpperCase()),
    placeholder: "GEL\u0130R A\xC7IKLAMASI..."
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20,
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnS,
      fontSize: 13
    },
    onClick: kaydet,
    disabled: kayitLoading
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Plus",
    size: 14,
    color: "#fff"
  }), " ", kayitLoading ? 'KAYDEDİLİYOR...' : 'GELİR KAYDET')))), /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card,
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "List",
    title: "SON GEL\u0130R KAYITLARI",
    sub: "SON 10 GEL\u0130R HAREKET\u0130"
  }), /*#__PURE__*/React.createElement("div", {
    style: S.cardBody
  }, gelirLoading ? /*#__PURE__*/React.createElement(Loading, null) : sonGelirler.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "TrendingUp",
    title: "GEL\u0130R KAYDI YOK",
    desc: "HEN\xDCZ GEL\u0130R KAYDI OLU\u015ETURULMAMI\u015ETIR"
  }) : /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 11
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: C.bgHover
    }
  }, ['TARİH', 'KASA', 'TÜR', 'TUTAR', 'AÇIKLAMA'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '10px 12px',
      textAlign: 'left',
      color: C.textMuted,
      fontWeight: 600,
      fontSize: 10,
      borderBottom: `1px solid ${C.border}`
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, sonGelirler.map((g, i) => /*#__PURE__*/React.createElement("tr", {
    key: g.id || i,
    style: {
      borderBottom: `1px solid ${C.border}`
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 12px',
      color: C.textSec
    }
  }, g.tarih || g.created_at?.split(' ')[0] || '-'), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 12px',
      fontWeight: 600
    }
  }, g.kasa_adi || '-'), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 12px'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    text: g.tur === 'komisyon' ? 'KOMİSYON' : 'GELİR',
    color: g.tur === 'komisyon' ? C.purple : C.success
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 12px',
      fontWeight: 700,
      color: C.success
    }
  }, "+", fmt(parseFloat(g.tutar) || 0)), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 12px',
      color: C.textSec
    }
  }, g.aciklama || '-'))))))));
};

/* ═══════════════════════════════════════════════════════════
   SEKME 4 – TRANSFER
   ═══════════════════════════════════════════════════════════ */
const Transfer = ({
  setPage,
  user
}) => {
  const {
    C,
    S,
    LIcon,
    SectionTitle,
    FormGroup,
    Badge,
    api,
    fmt,
    fmtInput,
    parseNum
  } = MR;
  const [kasalar, setKasalar] = useState([]);
  const [form, setForm] = useState({
    kaynak_id: '',
    hedef_id: '',
    tutar: '',
    aciklama: ''
  });
  const [loading, setLoading] = useState(false);
  const [hata, setHata] = useState('');
  const [basari, setBasari] = useState('');
  useEffect(() => {
    (async () => {
      const r = await api.kasaList();
      if (r?.success) {
        const aktifler = (r.data || []).filter(k => k.aktif !== false && k.aktif !== 0);
        setKasalar(aktifler);
      }
    })();
  }, []);
  const up = (k, v) => setForm(p => ({
    ...p,
    [k]: v
  }));
  const kaynakKasa = kasalar.find(k => k.id == form.kaynak_id);
  const hedefKasa = kasalar.find(k => k.id == form.hedef_id);
  const kaydet = async () => {
    if (!form.kaynak_id) {
      setHata('KAYNAK KASA SEÇİMİ ZORUNLUDUR');
      return;
    }
    if (!form.hedef_id) {
      setHata('HEDEF KASA SEÇİMİ ZORUNLUDUR');
      return;
    }
    if (form.kaynak_id === form.hedef_id) {
      setHata('KAYNAK VE HEDEF KASA AYNI OLAMAZ');
      return;
    }
    const tutarNum = parseNum(form.tutar);
    if (tutarNum <= 0) {
      setHata('TUTAR 0\'DAN BÜYÜK OLMALIDIR');
      return;
    }
    setLoading(true);
    setHata('');
    setBasari('');
    const r = await api.kasaTransfer({
      kaynak_id: parseInt(form.kaynak_id),
      hedef_id: parseInt(form.hedef_id),
      tutar: tutarNum,
      aciklama: form.aciklama
    });
    if (r?.success) {
      setBasari('TRANSFER BAŞARIYLA GERÇEKLEŞTİRİLDİ');
      setForm({
        kaynak_id: '',
        hedef_id: '',
        tutar: '',
        aciklama: ''
      });
      /* KASALARI TEKRAR YÜKLE */
      const r2 = await api.kasaList();
      if (r2?.success) setKasalar((r2.data || []).filter(k => k.aktif !== false && k.aktif !== 0));
      setTimeout(() => setBasari(''), 3000);
    } else {
      setHata(r?.error || 'TRANSFER HATASI');
    }
    setLoading(false);
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: S.card
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "ArrowRightLeft",
    title: "KASALAR ARASI TRANSFER",
    sub: "B\u0130R KASADAN D\u0130\u011EER\u0130NE PARA TRANSFER\u0130"
  }), /*#__PURE__*/React.createElement("div", {
    style: S.cardBody
  }, hata && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      background: `${C.danger}22`,
      borderRadius: 8,
      marginBottom: 16,
      fontSize: 12,
      color: C.danger,
      border: `1px solid ${C.danger}44`
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "AlertTriangle",
    size: 14,
    color: C.danger,
    style: {
      marginRight: 6
    }
  }), hata), basari && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      background: `${C.success}22`,
      borderRadius: 8,
      marginBottom: 16,
      fontSize: 12,
      color: C.success,
      border: `1px solid ${C.success}44`
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "CheckCircle",
    size: 14,
    color: C.success,
    style: {
      marginRight: 6
    }
  }), basari), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'stretch',
      gap: 20,
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: C.bgHover,
      borderRadius: 12,
      padding: 20,
      border: `1px solid ${C.border}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: `${C.danger}22`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "ArrowUpRight",
    size: 18,
    color: C.danger
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700
    }
  }, "KAYNAK KASA"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.textMuted
    }
  }, "PARA \xC7IKI\u015EI"))), /*#__PURE__*/React.createElement("select", {
    style: S.select,
    value: form.kaynak_id,
    onChange: e => up('kaynak_id', e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "KASA SE\xC7\u0130N\u0130Z"), kasalar.filter(k => k.id != form.hedef_id).map(k => /*#__PURE__*/React.createElement("option", {
    key: k.id,
    value: k.id
  }, k.ad, " (", k.tur === 'nakit' ? 'NAKİT' : 'BANKA', ")"))), kaynakKasa && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      padding: 10,
      background: `${C.bgCard}`,
      borderRadius: 8,
      border: `1px solid ${C.border}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.textMuted,
      marginBottom: 4
    }
  }, "MEVCUT BAK\u0130YE"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: C.text
    }
  }, fmt(parseFloat(kaynakKasa.bakiye) || 0)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minWidth: 60
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 48,
      height: 48,
      borderRadius: '50%',
      background: `${C.warning}22`,
      border: `2px solid ${C.warning}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "ArrowRight",
    size: 24,
    color: C.warning
  })), form.tutar && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 800,
      color: C.warning
    }
  }, "\u20BA", fmtInput(form.tutar))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: C.bgHover,
      borderRadius: 12,
      padding: 20,
      border: `1px solid ${C.border}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: `${C.success}22`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "ArrowDownLeft",
    size: 18,
    color: C.success
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700
    }
  }, "HEDEF KASA"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.textMuted
    }
  }, "PARA G\u0130R\u0130\u015E\u0130"))), /*#__PURE__*/React.createElement("select", {
    style: S.select,
    value: form.hedef_id,
    onChange: e => up('hedef_id', e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "KASA SE\xC7\u0130N\u0130Z"), kasalar.filter(k => k.id != form.kaynak_id).map(k => /*#__PURE__*/React.createElement("option", {
    key: k.id,
    value: k.id
  }, k.ad, " (", k.tur === 'nakit' ? 'NAKİT' : 'BANKA', ")"))), hedefKasa && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      padding: 10,
      background: `${C.bgCard}`,
      borderRadius: 8,
      border: `1px solid ${C.border}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.textMuted,
      marginBottom: 4
    }
  }, "MEVCUT BAK\u0130YE"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: C.text
    }
  }, fmt(parseFloat(hedefKasa.bakiye) || 0))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16,
      maxWidth: 700
    }
  }, /*#__PURE__*/React.createElement(FormGroup, {
    label: "TRANSFER TUTARI *"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      color: C.textMuted,
      fontSize: 14,
      fontWeight: 700
    }
  }, "\u20BA"), /*#__PURE__*/React.createElement("input", {
    style: {
      ...S.input,
      paddingLeft: 30,
      fontSize: 16,
      fontWeight: 700
    },
    value: form.tutar,
    onChange: e => setForm(p => ({
      ...p,
      tutar: fmtInput(e.target.value)
    })),
    placeholder: "0,00"
  }))), /*#__PURE__*/React.createElement(FormGroup, {
    label: "A\xC7IKLAMA"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.input,
    value: form.aciklama,
    onChange: e => up('aciklama', e.target.value.toUpperCase()),
    placeholder: "TRANSFER A\xC7IKLAMASI"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24,
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnW,
      fontSize: 13
    },
    onClick: kaydet,
    disabled: loading
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "ArrowRightLeft",
    size: 14,
    color: "#000"
  }), " ", loading ? 'TRANSFER EDİLİYOR...' : 'TRANSFER YAP')))));
};

/* ═══════════════════════════════════════════════════════════
   SEKME 5 – RAPOR
   ═══════════════════════════════════════════════════════════ */
const Rapor = ({
  setPage,
  user
}) => {
  const {
    C,
    S,
    LIcon,
    StatCard,
    SectionTitle,
    Badge,
    Loading,
    EmptyState,
    api,
    fmt
  } = MR;
  const [loading, setLoading] = useState(true);
  const [rapor, setRapor] = useState(null);
  const [baslangic, setBaslangic] = useState('');
  const [bitis, setBitis] = useState('');
  const yukle = async () => {
    setLoading(true);
    const p = {};
    if (baslangic) p.baslangic = baslangic;
    if (bitis) p.bitis = bitis;
    const r = await api.muhasebeRapor(p);
    if (r?.success) setRapor(r.data || {});
    setLoading(false);
  };
  useEffect(() => {
    yukle();
  }, []);
  const raporGetir = () => {
    yukle();
  };

  /* ÖZET BİLGİLER */
  const toplamGelir = rapor?.toplam_gelir || 0;
  const toplamGider = rapor?.toplam_gider || 0;
  const netKar = toplamGelir - toplamGider;
  const dosyaOrt = rapor?.dosya_ortalama || (rapor?.dosya_sayisi ? toplamGelir / rapor.dosya_sayisi : 0);

  /* AYLIK VERİLER (GRAFİK İÇİN) */
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
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Calendar",
    size: 16,
    color: C.accent
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 700
    }
  }, "RAPOR D\xD6NEM\u0130")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      ...S.label,
      marginBottom: 2
    }
  }, "BA\u015ELANGI\xC7"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    style: {
      ...S.input,
      width: 160,
      fontSize: 11
    },
    value: baslangic,
    onChange: e => setBaslangic(e.target.value)
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: 16,
      color: C.textMuted
    }
  }, "\u2014"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      ...S.label,
      marginBottom: 2
    }
  }, "B\u0130T\u0130\u015E"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    style: {
      ...S.input,
      width: 160,
      fontSize: 11
    },
    value: bitis,
    onChange: e => setBitis(e.target.value)
  }))), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnP,
      fontSize: 11,
      marginLeft: 8
    },
    onClick: raporGetir
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Search",
    size: 14,
    color: "#fff"
  }), " RAPOR GET\u0130R"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnG,
      fontSize: 11
    },
    onClick: () => {
      setBaslangic('');
      setBitis('');
      setTimeout(yukle, 0);
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "RotateCcw",
    size: 13,
    color: C.textSec
  }), " TEM\u0130ZLE"))), loading ? /*#__PURE__*/React.createElement(Loading, null) : !rapor ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "BarChart3",
    title: "RAPOR VER\u0130S\u0130 YOK",
    desc: "RAPOR VER\u0130LER\u0130 Y\xDCKLENEMEDI"
  }) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 14,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    icon: "TrendingUp",
    label: "TOPLAM GEL\u0130R",
    value: fmt(toplamGelir),
    color: C.success
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "TrendingDown",
    label: "TOPLAM G\u0130DER",
    value: fmt(toplamGider),
    color: C.danger
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "Activity",
    label: "NET KAR / ZARAR",
    value: fmt(netKar),
    color: netKar >= 0 ? C.success : C.danger
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "FileText",
    label: "DOSYA BA\u015EINA ORT.",
    value: fmt(dosyaOrt),
    color: C.purple
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.card
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "BarChart3",
    title: "AYLIK TREND",
    sub: "GEL\u0130R / G\u0130DER KAR\u015EILA\u015ETIRMASI"
  }), /*#__PURE__*/React.createElement("div", {
    style: S.cardBody
  }, aylikVeriler.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "BarChart3",
    title: "AYLIK VER\u0130 YOK",
    desc: "SE\xC7\u0130LEN D\xD6NEMDE AYLIK VER\u0130 BULUNMAMAKTADIR"
  }) : /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      marginBottom: 20,
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 12,
      height: 12,
      borderRadius: 3,
      background: C.success
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: C.textSec,
      fontWeight: 600
    }
  }, "GEL\u0130R")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 12,
      height: 12,
      borderRadius: 3,
      background: C.danger
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: C.textSec,
      fontWeight: 600
    }
  }, "G\u0130DER"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 8,
      height: 200,
      padding: '0 10px'
    }
  }, aylikVeriler.map((ay, i) => {
    const gelir = parseFloat(ay.gelir) || 0;
    const gider = parseFloat(ay.gider) || 0;
    const gelirH = Math.max(gelir / maxAylikDeger * 160, 2);
    const giderH = Math.max(gider / maxAylikDeger * 160, 2);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: 3,
        height: 170
      }
    }, /*#__PURE__*/React.createElement("div", {
      title: `GELİR: ${fmt(gelir)}`,
      style: {
        width: 16,
        height: gelirH,
        background: `linear-gradient(to top, ${C.success}, ${C.success}cc)`,
        borderRadius: '4px 4px 0 0',
        cursor: 'pointer',
        transition: 'all .3s',
        minHeight: 2
      },
      onMouseEnter: e => e.currentTarget.style.opacity = '0.8',
      onMouseLeave: e => e.currentTarget.style.opacity = '1'
    }), /*#__PURE__*/React.createElement("div", {
      title: `GİDER: ${fmt(gider)}`,
      style: {
        width: 16,
        height: giderH,
        background: `linear-gradient(to top, ${C.danger}, ${C.danger}cc)`,
        borderRadius: '4px 4px 0 0',
        cursor: 'pointer',
        transition: 'all .3s',
        minHeight: 2
      },
      onMouseEnter: e => e.currentTarget.style.opacity = '0.8',
      onMouseLeave: e => e.currentTarget.style.opacity = '1'
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: C.textMuted,
        fontWeight: 600,
        marginTop: 4,
        whiteSpace: 'nowrap'
      }
    }, ay.ay || ay.donem || `AY ${i + 1}`));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 12,
      paddingTop: 8,
      borderTop: `1px solid ${C.border}`
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: C.textMuted
    }
  }, "\u20BA0"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: C.textMuted
    }
  }, fmt(maxAylikDeger / 2)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: C.textMuted
    }
  }, fmt(maxAylikDeger)))))), /*#__PURE__*/React.createElement("div", {
    style: S.card
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "PieChart",
    title: "KATEGOR\u0130 DA\u011EILIMI",
    sub: "GEL\u0130R KATEGOR\u0130LER\u0130"
  }), /*#__PURE__*/React.createElement("div", {
    style: S.cardBody
  }, kategoriler.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "PieChart",
    title: "KATEGOR\u0130 VER\u0130S\u0130 YOK",
    desc: "KATEGOR\u0130 BAZLI VER\u0130 BULUNMAMAKTADIR"
  }) : /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 120,
      height: 120,
      borderRadius: '50%',
      background: `conic-gradient(${kategoriler.map((k, i) => {
        const yuzde = (parseFloat(k.tutar) || 0) / kategoriToplam * 100;
        const oncekiToplam = kategoriler.slice(0, i).reduce((t, kk) => t + (parseFloat(kk.tutar) || 0) / kategoriToplam * 100, 0);
        return `${kategoriRenkler[i % kategoriRenkler.length]} ${oncekiToplam}% ${oncekiToplam + yuzde}%`;
      }).join(', ')})`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 70,
      height: 70,
      borderRadius: '50%',
      background: C.bgCard,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: C.textSec
    }
  }, "TOPLAM")))), kategoriler.map((k, i) => {
    const tutar = parseFloat(k.tutar) || 0;
    const yuzde = (tutar / kategoriToplam * 100).toFixed(1);
    const renk = kategoriRenkler[i % kategoriRenkler.length];
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 0',
        borderBottom: `1px solid ${C.border}`
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 10,
        height: 10,
        borderRadius: 3,
        background: renk,
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 600
      }
    }, (k.kategori || k.tur || 'DİĞER').toUpperCase())), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'right'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: renk
      }
    }, fmt(tutar)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 9,
        color: C.textMuted
      }
    }, "%", yuzde)));
  }))))), rapor?.detay && rapor.detay.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card,
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "FileText",
    title: "DETAYLI RAPOR",
    sub: "D\xD6NEM BAZLI GEL\u0130R-G\u0130DER DETAYI"
  }), /*#__PURE__*/React.createElement("div", {
    style: S.cardBody
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 11
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: C.bgHover
    }
  }, ['DÖNEM', 'GELİR', 'GİDER', 'NET', 'DOSYA SAYISI'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '10px 12px',
      textAlign: 'left',
      color: C.textMuted,
      fontWeight: 600,
      fontSize: 10,
      borderBottom: `1px solid ${C.border}`
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, rapor.detay.map((d, i) => {
    const gelir = parseFloat(d.gelir) || 0;
    const gider = parseFloat(d.gider) || 0;
    const net = gelir - gider;
    return /*#__PURE__*/React.createElement("tr", {
      key: i,
      style: {
        borderBottom: `1px solid ${C.border}`
      }
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '10px 12px',
        fontWeight: 600
      }
    }, d.donem || d.ay || '-'), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '10px 12px',
        color: C.success,
        fontWeight: 600
      }
    }, fmt(gelir)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '10px 12px',
        color: C.danger,
        fontWeight: 600
      }
    }, fmt(gider)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '10px 12px',
        fontWeight: 700,
        color: net >= 0 ? C.success : C.danger
      }
    }, fmt(net)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: '10px 12px',
        color: C.textSec
      }
    }, d.dosya_sayisi || '-'));
  })), /*#__PURE__*/React.createElement("tfoot", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: `${C.accent}08`,
      borderTop: `2px solid ${C.border}`
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px',
      fontWeight: 800,
      fontSize: 12
    }
  }, "TOPLAM"), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px',
      fontWeight: 800,
      color: C.success,
      fontSize: 12
    }
  }, fmt(toplamGelir)), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px',
      fontWeight: 800,
      color: C.danger,
      fontSize: 12
    }
  }, fmt(toplamGider)), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px',
      fontWeight: 800,
      color: netKar >= 0 ? C.success : C.danger,
      fontSize: 12
    }
  }, fmt(netKar)), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '12px',
      fontWeight: 600,
      color: C.textSec
    }
  }, rapor.dosya_sayisi || '-')))))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20,
      background: netKar >= 0 ? `${C.success}11` : `${C.danger}11`,
      borderRadius: 12,
      border: `1px solid ${netKar >= 0 ? C.success + '33' : C.danger + '33'}`,
      padding: 24,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.textSec,
      fontWeight: 600,
      marginBottom: 8,
      letterSpacing: 1
    }
  }, baslangic || bitis ? 'SEÇİLEN DÖNEM' : 'GENEL', " NET SONU\xC7"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 36,
      fontWeight: 900,
      color: netKar >= 0 ? C.success : C.danger,
      letterSpacing: -1
    }
  }, fmt(netKar)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    text: netKar >= 0 ? 'KAR' : 'ZARAR',
    color: netKar >= 0 ? C.success : C.danger
  })))));
};