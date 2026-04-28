const MR = window.MR || (window.MR = {});
const {
  useState,
  useEffect,
  useCallback
} = React;
function zamanOnce(tarih) {
  const fark = Date.now() - new Date(tarih).getTime();
  const dk = Math.floor(fark / 60000);
  if (dk < 1) return 'AZ ÖNCE';
  if (dk < 60) return dk + ' DAKİKA ÖNCE';
  const saat = Math.floor(dk / 60);
  if (saat < 24) return saat + ' SAAT ÖNCE';
  const gun = Math.floor(saat / 24);
  if (gun < 7) return gun + ' GÜN ÖNCE';
  return new Date(tarih).toLocaleDateString('tr-TR');
}
MR.BildirimPage = ({
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
  const [bildirimler, setBildirimler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState('');
  const [silOnay, setSilOnay] = useState(null);
  const [modalAcik, setModalAcik] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [kullanicilar, setKullanicilar] = useState([]);
  const bosForm = {
    hedef_id: '',
    baslik: '',
    mesaj: '',
    tur: 'bilgi'
  };
  const [form, setForm] = useState({
    ...bosForm
  });
  const yukle = useCallback(async () => {
    setLoading(true);
    const p = {
      limit: 500
    };
    if (filtre === 'okunmamis') p.okunmamis = 1;
    const r = await api.bildirimList(p);
    if (r?.success) {
      setBildirimler(r.data?.items || r.data || []);
    }
    setLoading(false);
  }, [filtre]);
  useEffect(() => {
    yukle();
  }, [yukle]);
  const up = (k, v) => setForm(p => ({
    ...p,
    [k]: v
  }));
  const isAdmin = user?.rol === 'admin' || user?.rol === 'yonetici';

  // ═══ KULLANICI LİSTESİ YÜKLE (ADMIN İÇİN) ═══
  useEffect(() => {
    if (isAdmin) {
      (async () => {
        const r = await api.kullaniciList({
          limit: 100
        });
        if (r?.success) {
          setKullanicilar(r.data?.items || r.data || []);
        }
      })();
    }
  }, [isAdmin]);

  // ═══ İSTATİSTİKLER ═══
  const toplam = bildirimler.length;
  const okunmamis = bildirimler.filter(b => !b.okundu).length;
  const okunan = toplam - okunmamis;

  // ═══ FİLTRELENMİŞ LİSTE ═══
  const filtrelenmis = bildirimler.filter(b => {
    if (filtre === 'okunmamis') return !b.okundu;
    if (filtre === 'okunan') return !!b.okundu;
    return true;
  });

  // ═══ TÜR İKON VE RENK ═══
  const turIkon = tur => {
    if (tur === 'bilgi') return {
      icon: 'Info',
      color: C.accent
    };
    if (tur === 'uyari') return {
      icon: 'AlertTriangle',
      color: C.warning
    };
    if (tur === 'basari') return {
      icon: 'CheckCircle',
      color: C.success
    };
    if (tur === 'hata') return {
      icon: 'XCircle',
      color: C.danger
    };
    return {
      icon: 'Bell',
      color: C.accent
    };
  };
  const turLabel = tur => {
    if (tur === 'bilgi') return 'BİLGİ';
    if (tur === 'uyari') return 'UYARI';
    if (tur === 'basari') return 'BAŞARI';
    if (tur === 'hata') return 'HATA';
    return 'BİLGİ';
  };

  // ═══ OKUNDU İŞARETLE ═══
  const okunduIsaretle = async bildirim => {
    if (bildirim.okundu) return;
    const r = await api.bildirimOku({
      id: bildirim.id
    });
    if (r?.success) yukle();
  };

  // ═══ TÜMÜNÜ OKUNDU İŞARETLE ═══
  const tumunuOku = async () => {
    const r = await api.bildirimOku({
      tumu: true
    });
    if (r?.success) yukle();
  };

  // ═══ SİL ═══
  const sil = async () => {
    if (!silOnay) return;
    const r = await api.bildirimDelete(silOnay.id);
    if (r?.success) {
      setSilOnay(null);
      yukle();
    }
  };

  // ═══ BİLDİRİM GÖNDER ═══
  const gonder = async () => {
    if (!form.baslik.trim()) {
      setError('BAŞLIK ZORUNLUDUR');
      return;
    }
    if (!form.mesaj.trim()) {
      setError('MESAJ ZORUNLUDUR');
      return;
    }
    if (!form.hedef_id) {
      setError('HEDEF KULLANICI SEÇİNİZ');
      return;
    }
    setSaving(true);
    setError('');
    const veri = {
      ...form
    };
    if (veri.hedef_id === 'tumu') {
      // TÜM KULLANICILARA GÖNDER
      let basarili = true;
      for (const k of kullanicilar) {
        const r = await api.bildirimCreate({
          ...veri,
          hedef_id: k.id
        });
        if (!r?.success) basarili = false;
      }
      if (basarili) {
        setModalAcik(false);
        setForm({
          ...bosForm
        });
        yukle();
      } else {
        setError('BAZI BİLDİRİMLER GÖNDERİLEMEDİ');
      }
    } else {
      const r = await api.bildirimCreate(veri);
      if (r?.success) {
        setModalAcik(false);
        setForm({
          ...bosForm
        });
        yukle();
      } else {
        setError(r?.error || 'BİLDİRİM GÖNDERİLEMEDİ');
      }
    }
    setSaving(false);
  };

  // ═══ FİLTRE SEKMELERİ ═══
  const filtreler = [{
    v: '',
    l: 'TÜMÜ',
    sayi: toplam
  }, {
    v: 'okunmamis',
    l: 'OKUNMAMIŞ',
    sayi: okunmamis
  }, {
    v: 'okunan',
    l: 'OKUNAN',
    sayi: okunan
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "fade-in"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 12,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    icon: "Bell",
    label: "TOPLAM",
    value: toplam,
    color: C.accent
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "BellRing",
    label: "OKUNMAMI\u015E",
    value: okunmamis,
    color: C.warning
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "BellOff",
    label: "OKUNAN",
    value: okunan,
    color: C.success
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
    name: "Bell",
    size: 16,
    color: C.accent
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 700
    }
  }, "B\u0130LD\u0130R\u0130MLER"), okunmamis > 0 && /*#__PURE__*/React.createElement(Badge, {
    text: okunmamis + ' OKUNMAMIŞ',
    color: C.warning
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, okunmamis > 0 && /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnW,
      fontSize: 11
    },
    onClick: tumunuOku
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "CheckCheck",
    size: 14,
    color: "#000"
  }), " T\xDCM\xDCN\xDC OKUNDU \u0130\u015EARETLE"), isAdmin && /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnP,
      fontSize: 11
    },
    onClick: () => {
      setError('');
      setForm({
        ...bosForm
      });
      setModalAcik(true);
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Send",
    size: 14,
    color: "#fff"
  }), " B\u0130LD\u0130R\u0130M G\xD6NDER"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 20px',
      borderBottom: `1px solid ${C.border}`,
      display: 'flex',
      gap: 6
    }
  }, filtreler.map(f => /*#__PURE__*/React.createElement("span", {
    key: f.v || 'all',
    onClick: () => setFiltre(f.v),
    style: {
      padding: '5px 14px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: filtre === f.v ? 700 : 400,
      cursor: 'pointer',
      background: filtre === f.v ? `${C.accent}22` : 'transparent',
      color: filtre === f.v ? C.accent : C.textSec,
      border: `1px solid ${filtre === f.v ? C.accent + '44' : C.border}`,
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, f.l, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      fontWeight: 700,
      padding: '1px 6px',
      borderRadius: 10,
      background: filtre === f.v ? `${C.accent}33` : `${C.border}`,
      color: filtre === f.v ? C.accent : C.textMuted
    }
  }, f.sayi)))), loading ? /*#__PURE__*/React.createElement(Loading, null) : filtrelenmis.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, {
    icon: "Bell",
    title: "B\u0130LD\u0130R\u0130M BULUNAMADI",
    desc: filtre === 'okunmamis' ? 'TÜM BİLDİRİMLER OKUNMUŞ' : filtre === 'okunan' ? 'HENÜZ OKUNAN BİLDİRİM YOK' : 'HENÜZ BİLDİRİM BULUNMUYOR'
  }) : /*#__PURE__*/React.createElement("div", {
    style: S.cardBody
  }, filtrelenmis.map((b, i) => {
    const {
      icon,
      color
    } = turIkon(b.tur);
    const okunmadi = !b.okundu;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      onClick: () => okunduIsaretle(b),
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        padding: '14px 16px',
        borderRadius: 10,
        marginBottom: 8,
        cursor: 'pointer',
        background: okunmadi ? `${C.accent}08` : 'transparent',
        border: `1px solid ${okunmadi ? C.accent + '33' : C.border}`,
        transition: 'all .2s',
        position: 'relative'
      },
      onMouseEnter: e => e.currentTarget.style.background = `${C.accent}11`,
      onMouseLeave: e => e.currentTarget.style.background = okunmadi ? `${C.accent}08` : 'transparent'
    }, okunmadi && /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: C.accent
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 40,
        height: 40,
        borderRadius: 10,
        flexShrink: 0,
        background: `${color}22`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement(LIcon, {
      name: icon,
      size: 18,
      color: color
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: okunmadi ? 700 : 500,
        color: okunmadi ? C.text : C.textSec
      }
    }, b.baslik), /*#__PURE__*/React.createElement(Badge, {
      text: turLabel(b.tur),
      color: color
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: okunmadi ? C.textSec : C.textMuted,
        lineHeight: 1.5,
        marginBottom: 6
      }
    }, b.mesaj), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: C.textMuted
      }
    }, /*#__PURE__*/React.createElement(LIcon, {
      name: "Clock",
      size: 10,
      color: C.textMuted,
      style: {
        marginRight: 4,
        verticalAlign: 'middle'
      }
    }), b.created_at ? zamanOnce(b.created_at) : b.tarih ? zamanOnce(b.tarih) : '-'), b.gonderen_adi && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: C.textMuted
      }
    }, /*#__PURE__*/React.createElement(LIcon, {
      name: "User",
      size: 10,
      color: C.textMuted,
      style: {
        marginRight: 4,
        verticalAlign: 'middle'
      }
    }), b.gonderen_adi), okunmadi && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 9,
        color: C.accent,
        fontWeight: 600
      }
    }, "OKUNMADI"))), /*#__PURE__*/React.createElement("div", {
      style: {
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }
    }, okunmadi && /*#__PURE__*/React.createElement("button", {
      style: {
        ...S.btn,
        ...S.btnG,
        fontSize: 9,
        padding: '5px 10px'
      },
      onClick: e => {
        e.stopPropagation();
        okunduIsaretle(b);
      }
    }, /*#__PURE__*/React.createElement(LIcon, {
      name: "Eye",
      size: 10,
      color: C.textSec
    }), " OKU"), /*#__PURE__*/React.createElement("button", {
      style: {
        ...S.btn,
        ...S.btnD,
        fontSize: 9,
        padding: '5px 10px'
      },
      onClick: e => {
        e.stopPropagation();
        setSilOnay(b);
      }
    }, /*#__PURE__*/React.createElement(LIcon, {
      name: "Trash2",
      size: 10,
      color: "#fff"
    }))));
  }))), /*#__PURE__*/React.createElement(Modal, {
    open: modalAcik,
    onClose: () => {
      setModalAcik(false);
      setForm({
        ...bosForm
      });
    },
    title: "B\u0130LD\u0130R\u0130M G\xD6NDER",
    width: "500px"
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
    label: "HEDEF KULLANICI *"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.select,
    value: form.hedef_id,
    onChange: e => up('hedef_id', e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "SE\xC7\u0130N\u0130Z"), /*#__PURE__*/React.createElement("option", {
    value: "tumu"
  }, "T\xDCM\xDC"), kullanicilar.map(k => /*#__PURE__*/React.createElement("option", {
    key: k.id,
    value: k.id
  }, k.ad_soyad || k.email)))), /*#__PURE__*/React.createElement(FormGroup, {
    label: "T\xDCR"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.select,
    value: form.tur,
    onChange: e => up('tur', e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "bilgi"
  }, "B\u0130LG\u0130"), /*#__PURE__*/React.createElement("option", {
    value: "uyari"
  }, "UYARI"), /*#__PURE__*/React.createElement("option", {
    value: "basari"
  }, "BA\u015EARI"), /*#__PURE__*/React.createElement("option", {
    value: "hata"
  }, "HATA"))), /*#__PURE__*/React.createElement(FormGroup, {
    label: "BA\u015ELIK *",
    full: true
  }, /*#__PURE__*/React.createElement("input", {
    style: S.input,
    value: form.baslik,
    onChange: e => up('baslik', e.target.value),
    placeholder: "B\u0130LD\u0130R\u0130M BA\u015ELI\u011EI"
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "MESAJ *",
    full: true
  }, /*#__PURE__*/React.createElement("textarea", {
    style: {
      ...S.input,
      minHeight: 100
    },
    value: form.mesaj,
    onChange: e => up('mesaj', e.target.value),
    placeholder: "B\u0130LD\u0130R\u0130M MESAJI..."
  }))), form.baslik && form.mesaj && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      padding: 14,
      borderRadius: 10,
      background: C.bgHover,
      border: `1px solid ${C.border}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.textMuted,
      fontWeight: 600,
      marginBottom: 8
    }
  }, "\xD6N\u0130ZLEME"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 8,
      flexShrink: 0,
      background: `${turIkon(form.tur).color}22`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: turIkon(form.tur).icon,
    size: 16,
    color: turIkon(form.tur).color
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700
    }
  }, form.baslik), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.textSec,
      marginTop: 2
    }
  }, form.mesaj)))), /*#__PURE__*/React.createElement("div", {
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
      setForm({
        ...bosForm
      });
    }
  }, "\u0130PTAL"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnP
    },
    onClick: gonder,
    disabled: saving
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Send",
    size: 14,
    color: "#fff"
  }), " ", saving ? 'GÖNDERİLİYOR...' : 'GÖNDER'))), /*#__PURE__*/React.createElement(Confirm, {
    open: !!silOnay,
    message: 'BU BİLDİRİMİ SİLMEK İSTEDİĞİNİZDEN EMİN MİSİNİZ? "' + (silOnay?.baslik || '') + '"',
    onConfirm: sil,
    onCancel: () => setSilOnay(null)
  }));
};