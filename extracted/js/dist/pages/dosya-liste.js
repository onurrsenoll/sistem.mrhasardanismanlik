const MR = window.MR || (window.MR = {});
const {
  useState,
  useEffect
} = React;
MR.DosyaListesi = ({
  setPage,
  onSelect
}) => {
  const {
    C,
    S,
    LIcon,
    Badge,
    Loading,
    EmptyState,
    api
  } = MR;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [turF, setTurF] = useState('');
  const [asamaF, setAsamaF] = useState('');
  const load = async () => {
    setLoading(true);
    const p = {};
    if (search) p.q = search;
    if (turF) p.tur = turF;
    if (asamaF) p.asama = asamaF;
    const r = await api.dosyaList(p);
    if (r?.success) setData(r.data.items || []);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 400);
    return () => clearTimeout(t);
  }, [search, turF, asamaF]);
  return /*#__PURE__*/React.createElement("div", {
    style: S.card,
    className: "fade-in"
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
    name: "List",
    size: 16,
    color: C.accent
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700
    }
  }, "DOSYA L\u0130STES\u0130"), /*#__PURE__*/React.createElement(Badge, {
    text: `${data.length} DOSYA`,
    color: C.accent
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("input", {
    placeholder: "ARA (TC, \u0130S\u0130M, DOSYA NO, PLAKA)",
    value: search,
    onChange: e => setSearch(e.target.value),
    style: {
      ...S.input,
      width: 260,
      fontSize: 11
    }
  }), /*#__PURE__*/React.createElement("select", {
    value: turF,
    onChange: e => setTurF(e.target.value),
    style: {
      ...S.select,
      width: 120,
      fontSize: 11
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "T\xDCM\xDC"), /*#__PURE__*/React.createElement("option", {
    value: "ADK"
  }, "ADK"), /*#__PURE__*/React.createElement("option", {
    value: "BH"
  }, "BH")), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnP,
      fontSize: 11
    },
    onClick: () => setPage('dosya-yeni')
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Plus",
    size: 14,
    color: "#fff"
  }), " YEN\u0130"))), loading ? /*#__PURE__*/React.createElement(Loading, null) : /*#__PURE__*/React.createElement("div", {
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
  }, ['DOSYA NO', 'MAĞDUR', 'TÜR', 'SİGORTA', 'AŞAMA', 'AÇILIŞ', 'İŞLEM'].map(h => /*#__PURE__*/React.createElement("th", {
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
    colSpan: 7
  }, /*#__PURE__*/React.createElement(EmptyState, {
    icon: "FolderOpen",
    title: "DOSYA BULUNAMADI",
    desc: "YEN\u0130 DOSYA OLU\u015ETURUN"
  }))) : data.map((d, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderBottom: `1px solid ${C.border}`,
      cursor: 'pointer'
    },
    onClick: () => onSelect(d.dosya_id || d.id),
    onMouseEnter: e => e.currentTarget.style.background = C.bgHover,
    onMouseLeave: e => e.currentTarget.style.background = 'transparent'
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 8px',
      fontWeight: 700,
      color: C.accent
    }
  }, d.dosya_no), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 8px'
    }
  }, d.magdur_adi || '-'), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 8px'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    text: d.dosya_turu,
    color: d.dosya_turu === 'ADK' ? C.accent : C.purple
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 8px',
      color: C.textSec
    }
  }, d.sigorta_sirket || '-'), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 8px'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    text: d.asama || 'AÇIK',
    color: C.cyan
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 8px',
      color: C.textMuted
    }
  }, d.acilis_tarihi || d.created_at?.split(' ')[0] || '-'), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '10px 8px'
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Eye",
    size: 14,
    color: C.accent
  }))))))));
};