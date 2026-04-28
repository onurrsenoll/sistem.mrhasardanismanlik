const MR = window.MR || (window.MR = {});
const {
  useState,
  useEffect
} = React;
MR.CRMListesi = ({
  setPage
}) => {
  const {
    C,
    S,
    LIcon,
    Badge,
    StatCard,
    Loading,
    EmptyState,
    api
  } = MR;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [durumF, setDurumF] = useState('');
  const [stats, setStats] = useState({
    top: 0,
    tak: 0,
    olu: 0,
    neg: 0
  });
  const load = async () => {
    setLoading(true);
    const p = {};
    if (filter) p.q = filter;
    if (durumF) p.durum = durumF;
    const r = await api.crmList(p);
    if (r?.success) {
      const items = r.data.items || [];
      setData(items);
      // Load all for stats
      if (!filter && !durumF) {
        setStats({
          top: r.data.pagination?.total || items.length,
          tak: items.filter(c => c.durum === 'Takipte').length,
          olu: items.filter(c => c.durum === 'Olumlu').length,
          neg: items.filter(c => c.durum === 'Olumsuz').length
        });
      }
    }
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 400);
    return () => clearTimeout(t);
  }, [filter, durumF]);
  const dC = d => d === 'Olumlu' ? C.success : d === 'Takipte' ? C.warning : d === 'Yeni' ? C.cyan : d === 'Olumsuz' ? C.danger : C.textSec;
  const durumlar = ['', 'Yeni', 'Takipte', 'Olumlu', 'Olumsuz'];
  const durumLabels = {
    '': 'TÜMÜ',
    'Yeni': 'YENİ',
    'Takipte': 'TAKİPTE',
    'Olumlu': 'OLUMLU',
    'Olumsuz': 'OLUMSUZ'
  };
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
    icon: "Users",
    label: "TOPLAM KAYIT",
    value: stats.top,
    color: C.accent
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "Clock",
    label: "TAK\u0130PTE",
    value: stats.tak,
    color: C.warning
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "Check",
    label: "OLUMLU",
    value: stats.olu,
    color: C.success
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "X",
    label: "OLUMSUZ",
    value: stats.neg,
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
    name: "Users",
    size: 16,
    color: C.accent
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 700
    }
  }, "CRM - POTANS\u0130YEL M\xDC\u015ETER\u0130LER"), /*#__PURE__*/React.createElement(Badge, {
    text: `${data.length} KAYIT`,
    color: C.accent
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("input", {
    placeholder: "AD VEYA TELEFON",
    value: filter,
    onChange: e => setFilter(e.target.value),
    style: {
      ...S.input,
      width: 200,
      fontSize: 11
    }
  }), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnP,
      fontSize: 11
    },
    onClick: () => setPage('crm-yeni')
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Plus",
    size: 14,
    color: "#fff"
  }), " YEN\u0130"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 20px',
      borderBottom: `1px solid ${C.border}`,
      display: 'flex',
      gap: 6
    }
  }, durumlar.map(d => /*#__PURE__*/React.createElement("span", {
    key: d || 'all',
    onClick: () => setDurumF(d),
    style: {
      padding: '5px 14px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: durumF === d ? 700 : 400,
      cursor: 'pointer',
      background: durumF === d ? `${C.accent}22` : 'transparent',
      color: durumF === d ? C.accent : C.textSec,
      border: `1px solid ${durumF === d ? C.accent + '44' : C.border}`
    }
  }, durumLabels[d]))), loading ? /*#__PURE__*/React.createElement(Loading, null) : /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto'
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 11,
      minWidth: 900
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: C.bgHover
    }
  }, ['AD SOYAD', 'TELEFON', 'İL', 'TÜR', 'KAYNAK', 'DURUM', 'SON İLETİŞİM', 'ATANAN'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '10px 8px',
      textAlign: 'left',
      color: C.textMuted,
      fontWeight: 600,
      fontSize: 9,
      borderBottom: `1px solid ${C.border}`
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, data.length === 0 ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: 8
  }, /*#__PURE__*/React.createElement(EmptyState, {
    icon: "Users",
    title: "CRM KAYDI BULUNAMADI",
    desc: "YEN\u0130 CRM KAYDI OLU\u015ETURUN"
  }))) : data.map((c, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderBottom: `1px solid ${C.border}`
    },
    onMouseEnter: e => e.currentTarget.style.background = C.bgHover,
    onMouseLeave: e => e.currentTarget.style.background = 'transparent'
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 8px',
      fontWeight: 600
    }
  }, c.ad_soyad), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 8px',
      color: C.textSec
    }
  }, c.telefon || '-'), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 8px'
    }
  }, c.il || '-'), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 8px'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    text: c.dosya_turu || 'ADK',
    color: c.dosya_turu === 'BH' ? C.purple : C.accent
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 8px',
      color: C.textMuted
    }
  }, c.kaynak || '-'), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 8px'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    text: c.durum,
    color: dC(c.durum)
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 8px',
      color: C.textMuted
    }
  }, c.son_iletisim || '-'), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 8px',
      color: C.textSec
    }
  }, c.atanan_adi || '-'))))))));
};
MR.CRMYeni = ({
  setPage
}) => {
  const {
    C,
    S,
    LIcon,
    SectionTitle,
    FormGroup,
    api,
    ILLER
  } = MR;
  const [f, sF] = useState({
    ad_soyad: '',
    telefon: '',
    email: '',
    il: '',
    ilce: '',
    dosya_turu: 'ADK',
    kaynak: 'TELEFON',
    not_text: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const up = (k, v) => sF(p => ({
    ...p,
    [k]: v
  }));
  const kaydet = async () => {
    if (!f.ad_soyad || !f.telefon) {
      setError('AD VE TELEFON ZORUNLU');
      return;
    }
    setLoading(true);
    setError('');
    const r = await api.crmCreate(f);
    if (r?.success) setPage('crm-liste');else setError(r?.error || 'HATA');
    setLoading(false);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: S.card,
    className: "fade-in"
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "UserPlus",
    title: "YEN\u0130 CRM KAYDI",
    sub: "POTANS\u0130YEL M\xDC\u015ETER\u0130"
  }), /*#__PURE__*/React.createElement("div", {
    style: S.cardBody
  }, error && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 10,
      background: `${C.danger}22`,
      borderRadius: 8,
      marginBottom: 16,
      fontSize: 12,
      color: C.danger
    }
  }, error), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16,
      maxWidth: 700
    }
  }, /*#__PURE__*/React.createElement(FormGroup, {
    label: "AD SOYAD *"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.input,
    value: f.ad_soyad,
    onChange: e => up('ad_soyad', e.target.value),
    placeholder: "AD SOYAD"
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "TELEFON *"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.input,
    value: f.telefon,
    onChange: e => up('telefon', e.target.value),
    placeholder: "05XX XXX XXXX"
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "E-POSTA"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.input,
    value: f.email,
    onChange: e => up('email', e.target.value),
    placeholder: "E-POSTA"
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "\u0130L"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.select,
    value: f.il,
    onChange: e => up('il', e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "SE\xC7\u0130N\u0130Z"), ILLER.map(i => /*#__PURE__*/React.createElement("option", {
    key: i,
    value: i
  }, i)))), /*#__PURE__*/React.createElement(FormGroup, {
    label: "\u0130L\xC7E"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.input,
    value: f.ilce,
    onChange: e => up('ilce', e.target.value),
    placeholder: "\u0130L\xC7E"
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "T\xDCR"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.select,
    value: f.dosya_turu,
    onChange: e => up('dosya_turu', e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "ADK"
  }, "ADK"), /*#__PURE__*/React.createElement("option", {
    value: "BH"
  }, "BEDEN\u0130 HASAR"))), /*#__PURE__*/React.createElement(FormGroup, {
    label: "KAYNAK"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.select,
    value: f.kaynak,
    onChange: e => up('kaynak', e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "TELEFON"
  }, "TELEFON"), /*#__PURE__*/React.createElement("option", {
    value: "WEB FORMU"
  }, "WEB FORMU"), /*#__PURE__*/React.createElement("option", {
    value: "SOSYAL MEDYA"
  }, "SOSYAL MEDYA"), /*#__PURE__*/React.createElement("option", {
    value: "Y\xD6NLEND\u0130RME"
  }, "Y\xD6NLEND\u0130RME"), /*#__PURE__*/React.createElement("option", {
    value: "D\u0130\u011EER"
  }, "D\u0130\u011EER"))), /*#__PURE__*/React.createElement(FormGroup, {
    label: "NOT",
    full: true
  }, /*#__PURE__*/React.createElement("textarea", {
    style: {
      ...S.input,
      minHeight: 70
    },
    value: f.not_text,
    onChange: e => up('not_text', e.target.value),
    placeholder: "G\xD6R\xDC\u015EME NOTU..."
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 20,
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnS
    },
    onClick: kaydet,
    disabled: loading
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Save",
    size: 14,
    color: "#fff"
  }), " ", loading ? 'KAYDEDİLİYOR...' : 'KAYDET'), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnG
    },
    onClick: () => setPage('crm-liste')
  }, "\u0130PTAL"))));
};