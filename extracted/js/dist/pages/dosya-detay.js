const MR = window.MR || (window.MR = {});
const {
  useState,
  useEffect
} = React;
MR.DosyaDetay = ({
  dosyaId,
  setPage
}) => {
  const {
    C,
    S,
    LIcon,
    Badge,
    SectionTitle,
    EmptyState,
    Loading,
    Modal,
    FormGroup,
    Confirm,
    api,
    fmt,
    MASRAF_K,
    EVRAK_T,
    today
  } = MR;
  const [dosya, setDosya] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('bilgi');
  const [masrafM, setMasrafM] = useState(false);
  const [evrakM, setEvrakM] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const load = async () => {
    setLoading(true);
    const r = await api.dosyaGet(dosyaId);
    if (r?.success) setDosya(r.data);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, [dosyaId]);
  const asamaDegistir = async yeniAsama => {
    const r = await api.dosyaUpdate({
      id: dosya.id,
      asama: yeniAsama
    });
    if (r?.success) load();
  };
  const masrafSil = async id => {
    const r = await api.masrafDelete(id);
    if (r?.success) {
      load();
      setDeleteConfirm(null);
    }
  };
  const evrakSil = async id => {
    const r = await api.evrakDelete(id);
    if (r?.success) {
      load();
      setDeleteConfirm(null);
    }
  };
  if (loading) return /*#__PURE__*/React.createElement(Loading, null);
  if (!dosya) return /*#__PURE__*/React.createElement(EmptyState, {
    icon: "AlertCircle",
    title: "DOSYA BULUNAMADI",
    desc: ""
  });
  const tabs = [{
    id: 'bilgi',
    l: 'DOSYA BİLGİLERİ',
    ic: 'FileText'
  }, {
    id: 'masraf',
    l: `MASRAFLAR (${dosya.masraflar?.length || 0})`,
    ic: 'Receipt'
  }, {
    id: 'evrak',
    l: `EVRAKLAR (${dosya.evraklar?.length || 0})`,
    ic: 'Folder'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "fade-in"
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnG,
      marginBottom: 16,
      fontSize: 11
    },
    onClick: () => setPage('dosya-liste')
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "ArrowLeft",
    size: 14
  }), " L\u0130STEYE D\xD6N"), /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      height: 56,
      borderRadius: 14,
      background: `${C.accent}22`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "FolderOpen",
    size: 24,
    color: C.accent
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800
    }
  }, dosya.dosya_no, " ", /*#__PURE__*/React.createElement(Badge, {
    text: dosya.dosya_turu,
    color: dosya.dosya_turu === 'ADK' ? C.accent : C.purple
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: C.textSec,
      marginTop: 2
    }
  }, dosya.magdur?.ad_soyad || '-'))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("select", {
    value: dosya.asama,
    onChange: e => asamaDegistir(e.target.value),
    style: {
      ...S.select,
      width: 200,
      fontSize: 12,
      background: `${C.cyan}11`,
      border: `1px solid ${C.cyan}44`
    }
  }, ['DOSYA AÇIK', 'EVRAK BEKLENİYOR', 'BAŞVURU HAZIRLANIYOR', 'SİGORTA BAŞVURUSU', 'TAHKİM BAŞVURUSU', 'DAVA AÇILDI', 'BİLİRKİŞİ AŞAMASI', 'KARAR BEKLENİYOR', 'ÖDEME BEKLENİYOR', 'ÖDEME ALINDI', 'DOSYA KAPANDI'].map(a => /*#__PURE__*/React.createElement("option", {
    key: a,
    value: a
  }, a)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      marginBottom: 16
    }
  }, tabs.map(t => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    onClick: () => setTab(t.id),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '10px 18px',
      borderRadius: 10,
      fontSize: 12,
      fontWeight: tab === t.id ? 700 : 400,
      cursor: 'pointer',
      background: tab === t.id ? `${C.accent}22` : 'transparent',
      color: tab === t.id ? C.accent : C.textSec,
      border: `1px solid ${tab === t.id ? C.accent + '44' : C.border}`
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: t.ic,
    size: 14,
    color: tab === t.id ? C.accent : C.textSec
  }), t.l))), tab === 'bilgi' && /*#__PURE__*/React.createElement("div", {
    style: S.card
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "FileText",
    title: "DOSYA B\u0130LG\u0130LER\u0130"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.cardBody,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 12
    }
  }, [['DOSYA NO', dosya.dosya_no], ['DOSYA TÜRÜ', dosya.dosya_turu], ['AŞAMA', dosya.asama], ['SİGORTA', dosya.sigorta_sirket], ['HASAR NO', dosya.hasar_no], ['AÇILIŞ', dosya.acilis_tarihi], ['MAĞDUR', dosya.magdur?.ad_soyad], ['TC', dosya.magdur?.tc_kimlik], ['TELEFON', dosya.magdur?.telefon], ['İL', dosya.magdur?.il], ['AVUKAT', dosya.avukat_adi], ['TOPLAM MASRAF', fmt(dosya.toplam_masraf || 0)]].map(([k, v], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      padding: 12,
      background: C.bgInput,
      borderRadius: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.textMuted,
      marginBottom: 4
    }
  }, k), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600
    }
  }, v || '-'))))), tab === 'masraf' && /*#__PURE__*/React.createElement("div", {
    style: S.card
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "Receipt",
    title: "MASRAFLAR",
    sub: `TOPLAM: ${fmt(dosya.toplam_masraf || 0)}`,
    right: /*#__PURE__*/React.createElement("button", {
      style: {
        ...S.btn,
        ...S.btnP,
        fontSize: 11
      },
      onClick: () => setMasrafM(true)
    }, /*#__PURE__*/React.createElement(LIcon, {
      name: "Plus",
      size: 14,
      color: "#fff"
    }), " YEN\u0130 MASRAF")
  }), /*#__PURE__*/React.createElement("div", {
    style: S.cardBody
  }, dosya.masraflar?.length > 0 ? /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      borderBottom: `2px solid ${C.border}`
    }
  }, ['#', 'MASRAF KALEMİ', 'TUTAR', 'KASA', 'TARİH', 'KULLANICI', 'İŞLEM'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '10px 12px',
      textAlign: 'left',
      color: C.textMuted,
      fontWeight: 600,
      fontSize: 10
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, dosya.masraflar.map((m, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderBottom: `1px solid ${C.border}`
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 12px',
      color: C.textMuted
    }
  }, i + 1), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 12px',
      fontWeight: 600
    }
  }, m.masraf_kalemi), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 12px',
      fontWeight: 700,
      color: C.danger
    }
  }, fmt(m.tutar)), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 12px'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    text: m.kasa_adi || '-',
    color: C.cyan
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 12px',
      color: C.textMuted
    }
  }, m.islem_tarihi), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 12px',
      color: C.textSec
    }
  }, m.kullanici_adi || '-'), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 12px'
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Trash2",
    size: 14,
    color: C.danger,
    style: {
      cursor: 'pointer'
    },
    onClick: () => setDeleteConfirm({
      type: 'masraf',
      id: m.id,
      text: m.masraf_kalemi
    })
  })))), /*#__PURE__*/React.createElement("tr", {
    style: {
      background: `${C.accent}08`
    }
  }, /*#__PURE__*/React.createElement("td", {
    colSpan: 2,
    style: {
      padding: 12,
      fontWeight: 800,
      textAlign: 'right'
    }
  }, "TOPLAM:"), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: 12,
      fontWeight: 800,
      fontSize: 15,
      color: C.danger
    }
  }, fmt(dosya.toplam_masraf || 0)), /*#__PURE__*/React.createElement("td", {
    colSpan: 4
  })))) : /*#__PURE__*/React.createElement(EmptyState, {
    icon: "Receipt",
    title: "MASRAF YOK",
    desc: "MASRAF EKLE BUTONUNDAN MASRAF G\u0130REB\u0130L\u0130RS\u0130N\u0130Z."
  }))), tab === 'evrak' && /*#__PURE__*/React.createElement("div", {
    style: S.card
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "Folder",
    title: "EVRAKLAR",
    right: /*#__PURE__*/React.createElement("button", {
      style: {
        ...S.btn,
        ...S.btnS,
        fontSize: 11
      },
      onClick: () => setEvrakM(true)
    }, /*#__PURE__*/React.createElement(LIcon, {
      name: "Upload",
      size: 14,
      color: "#fff"
    }), " EVRAK Y\xDCKLE")
  }), /*#__PURE__*/React.createElement("div", {
    style: S.cardBody
  }, dosya.evraklar?.length > 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 12
    }
  }, dosya.evraklar.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      padding: 16,
      background: C.bgInput,
      borderRadius: 10,
      border: `1px solid ${C.border}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "FileText",
    size: 20,
    color: C.accent
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600
    }
  }, e.dosya_adi), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.textMuted
    }
  }, e.evrak_turu, " \u2022 ", (e.dosya_boyutu / 1024).toFixed(0), " KB"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: api.evrakUrl(e.id),
    target: "_blank",
    style: {
      ...S.btn,
      ...S.btnP,
      fontSize: 10,
      padding: '4px 10px',
      textDecoration: 'none'
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Download",
    size: 12,
    color: "#fff"
  }), " \u0130ND\u0130R"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnD,
      fontSize: 10,
      padding: '4px 10px'
    },
    onClick: () => setDeleteConfirm({
      type: 'evrak',
      id: e.id,
      text: e.dosya_adi
    })
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Trash2",
    size: 12,
    color: "#fff"
  }), " S\u0130L"))))) : /*#__PURE__*/React.createElement(EmptyState, {
    icon: "Folder",
    title: "EVRAK YOK",
    desc: "PDF EVRAK Y\xDCKLE BUTONUNDAN EVRAK EKLEYEB\u0130L\u0130RS\u0130N\u0130Z."
  }))), /*#__PURE__*/React.createElement(MR.MasrafEkle, {
    open: masrafM,
    onClose: () => setMasrafM(false),
    dosyaId: dosya.id,
    onOk: load
  }), /*#__PURE__*/React.createElement(MR.EvrakYukle, {
    open: evrakM,
    onClose: () => setEvrakM(false),
    dosyaId: dosya.id,
    onOk: load
  }), /*#__PURE__*/React.createElement(Confirm, {
    open: !!deleteConfirm,
    message: deleteConfirm ? `"${deleteConfirm.text}" SİLİNSİN Mİ?` : '',
    onCancel: () => setDeleteConfirm(null),
    onConfirm: () => {
      if (deleteConfirm.type === 'masraf') masrafSil(deleteConfirm.id);else if (deleteConfirm.type === 'evrak') evrakSil(deleteConfirm.id);
    }
  }));
};

// MASRAF EKLEME MODAL
MR.MasrafEkle = ({
  open,
  onClose,
  dosyaId,
  onOk
}) => {
  const {
    C,
    S,
    Modal,
    FormGroup,
    api,
    MASRAF_K,
    today
  } = MR;
  const [f, sF] = useState({
    masraf_kalemi: '',
    tutar: '',
    kasa_id: 1,
    aciklama: '',
    islem_tarihi: today()
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [kasalar, setKasalar] = useState([]);
  useEffect(() => {
    if (open) {
      api.kasaList().then(r => {
        if (r?.success) setKasalar(r.data || []);
      });
    }
  }, [open]);
  const go = async () => {
    if (!f.masraf_kalemi || !f.tutar) {
      setError('KALEM VE TUTAR GEREKLİ');
      return;
    }
    setLoading(true);
    setError('');
    const r = await api.masrafCreate({
      ...f,
      dosya_id: dosyaId,
      tutar: parseFloat(f.tutar)
    });
    if (r?.success) {
      onOk();
      onClose();
      sF({
        masraf_kalemi: '',
        tutar: '',
        kasa_id: 1,
        aciklama: '',
        islem_tarihi: today()
      });
    } else setError(r?.error || 'HATA');
    setLoading(false);
  };
  return /*#__PURE__*/React.createElement(Modal, {
    open: open,
    onClose: onClose,
    title: "MASRAF EKLE",
    width: "500px"
  }, error && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      background: `${C.danger}22`,
      borderRadius: 8,
      marginBottom: 12,
      fontSize: 12,
      color: C.danger
    }
  }, error), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(FormGroup, {
    label: "MASRAF KALEM\u0130"
  }, /*#__PURE__*/React.createElement("select", {
    value: f.masraf_kalemi,
    onChange: e => sF({
      ...f,
      masraf_kalemi: e.target.value
    }),
    style: S.select
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "SE\xC7\u0130N\u0130Z"), MASRAF_K.map(k => /*#__PURE__*/React.createElement("option", {
    key: k,
    value: k
  }, k)))), /*#__PURE__*/React.createElement(FormGroup, {
    label: "TUTAR (\u20BA)"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: f.tutar,
    onChange: e => sF({
      ...f,
      tutar: e.target.value
    }),
    placeholder: "0.00",
    style: S.input
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "KASA"
  }, /*#__PURE__*/React.createElement("select", {
    value: f.kasa_id,
    onChange: e => sF({
      ...f,
      kasa_id: parseInt(e.target.value)
    }),
    style: S.select
  }, kasalar.map(k => /*#__PURE__*/React.createElement("option", {
    key: k.id,
    value: k.id
  }, k.ad, " (", MR.fmt(k.bakiye), ")")))), /*#__PURE__*/React.createElement(FormGroup, {
    label: "TAR\u0130H"
  }, /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: f.islem_tarihi,
    onChange: e => sF({
      ...f,
      islem_tarihi: e.target.value
    }),
    style: S.input
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "A\xC7IKLAMA"
  }, /*#__PURE__*/React.createElement("input", {
    value: f.aciklama,
    onChange: e => sF({
      ...f,
      aciklama: e.target.value
    }),
    placeholder: "\u0130STE\u011EE BA\u011ELI",
    style: S.input
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 12,
      background: `${C.warning}11`,
      borderRadius: 8,
      fontSize: 11,
      color: C.warning
    }
  }, "MASRAF TUTARI KASA BAK\u0130YES\u0130NDEN OTOMAT\u0130K D\xDC\u015E\xDCLECEK."), /*#__PURE__*/React.createElement("button", {
    onClick: go,
    disabled: loading,
    style: {
      ...S.btn,
      ...S.btnS,
      justifyContent: 'center',
      padding: 14
    }
  }, loading ? 'KAYDEDİLİYOR...' : 'MASRAFI KAYDET')));
};

// EVRAK YÜKLEME MODAL
MR.EvrakYukle = ({
  open,
  onClose,
  dosyaId,
  onOk
}) => {
  const {
    C,
    S,
    Modal,
    FormGroup,
    api,
    EVRAK_T
  } = MR;
  const [tur, setTur] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const go = async () => {
    if (!file || !tur) {
      setError('EVRAK TÜRÜ VE DOSYA GEREKLİ');
      return;
    }
    if (file.type !== 'application/pdf') {
      setError('SADECE PDF');
      return;
    }
    setLoading(true);
    setError('');
    const r = await api.evrakUpload(dosyaId, tur, file);
    if (r?.success) {
      onOk();
      onClose();
      setFile(null);
      setTur('');
    } else setError(r?.error || 'HATA');
    setLoading(false);
  };
  return /*#__PURE__*/React.createElement(Modal, {
    open: open,
    onClose: onClose,
    title: "EVRAK Y\xDCKLE (PDF)",
    width: "480px"
  }, error && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      background: `${C.danger}22`,
      borderRadius: 8,
      marginBottom: 12,
      fontSize: 12,
      color: C.danger
    }
  }, error), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(FormGroup, {
    label: "EVRAK T\xDCR\xDC"
  }, /*#__PURE__*/React.createElement("select", {
    value: tur,
    onChange: e => setTur(e.target.value),
    style: S.select
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "SE\xC7\u0130N\u0130Z"), EVRAK_T.map(t => /*#__PURE__*/React.createElement("option", {
    key: t,
    value: t
  }, t)))), /*#__PURE__*/React.createElement(FormGroup, {
    label: "PDF DOSYA"
  }, /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".pdf",
    onChange: e => setFile(e.target.files[0]),
    style: {
      ...S.input,
      padding: 8
    }
  })), file && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.textSec
    }
  }, "SE\xC7\u0130LEN: ", file.name, " (", (file.size / 1024).toFixed(0), " KB)"), /*#__PURE__*/React.createElement("button", {
    onClick: go,
    disabled: loading,
    style: {
      ...S.btn,
      ...S.btnS,
      justifyContent: 'center',
      padding: 14
    }
  }, loading ? 'YÜKLENİYOR...' : 'EVRAK YÜKLE')));
};