/* ============================================================
   MR HASAR DANIŞMANLIK – ADK HESAPLAMA SAYFASI (hesap-adk.js)
   ARAÇ DEĞER KAYBI HESAPLAYICI
   ============================================================ */

const MR = window.MR || (window.MR = {});
const {
  useState,
  useMemo,
  useRef
} = React;
MR.HesapADKPage = ({
  setPage,
  user
}) => {
  const {
    C,
    S,
    LIcon,
    Badge,
    SectionTitle,
    FormGroup,
    EmptyState,
    fmt,
    fmtK,
    parseNum,
    fmtInput,
    ARAC_DB,
    TAHKIM_EMSALLERI
  } = MR;

  /* ---------- FORM STATE ---------- */
  const [form, setForm] = useState({
    marka: '',
    model: '',
    modelYili: '',
    kazaTarihi: '',
    km: '',
    onarimBedeli: '',
    rayicDeger: '',
    kusurOrani: '100',
    oncekiHasar: '0',
    hasarBolgesi: ''
  });
  const [sonuc, setSonuc] = useState(null);
  const [hata, setHata] = useState('');
  const sonucRef = useRef(null);
  const u = (k, v) => setForm(p => ({
    ...p,
    [k]: v
  }));

  /* ---------- MARKA LİSTESİ ---------- */
  const markalar = useMemo(() => Object.keys(ARAC_DB).sort(), []);

  /* ---------- MODEL LİSTESİ ---------- */
  const modeller = useMemo(() => {
    if (!form.marka || !ARAC_DB[form.marka]) return [];
    return ARAC_DB[form.marka].modeller || [];
  }, [form.marka]);

  /* ---------- YIL LİSTESİ ---------- */
  const buYil = new Date().getFullYear();
  const yillar = useMemo(() => Array.from({
    length: 20
  }, (_, i) => buYil - i), []);

  /* ---------- HASAR BÖLGELERİ ---------- */
  const hasarBolgeleri = ['ÖN', 'ARKA', 'YAN', 'TAVAN', 'ÇOKLU'];

  /* ---------- HESAPLAMA ---------- */
  const hesapla = () => {
    setHata('');
    setSonuc(null);

    /* VALİDASYON */
    if (!form.marka) {
      setHata('ARAÇ MARKA SEÇİNİZ');
      return;
    }
    if (!form.model) {
      setHata('ARAÇ MODEL SEÇİNİZ');
      return;
    }
    if (!form.modelYili) {
      setHata('MODEL YILI SEÇİNİZ');
      return;
    }
    if (!form.kazaTarihi) {
      setHata('KAZA TARİHİ GİRİNİZ');
      return;
    }
    if (!form.hasarBolgesi) {
      setHata('HASAR BÖLGESİ SEÇİNİZ');
      return;
    }
    const rayic = parseNum(form.rayicDeger);
    const onarim = parseNum(form.onarimBedeli);
    const km = parseNum(form.km);
    const kusur = Number(form.kusurOrani) || 100;
    const oncekiHsr = Number(form.oncekiHasar) || 0;
    if (rayic <= 0) {
      setHata('RAYİÇ DEĞER GİRİNİZ');
      return;
    }
    if (onarim <= 0) {
      setHata('ONARIM BEDELİ GİRİNİZ');
      return;
    }

    /* ARAÇ YAŞI */
    const aracYasi = buYil - Number(form.modelYili);

    /* PREMİUM KONTROL */
    const premiumMi = ARAC_DB[form.marka]?.premium || false;

    /* YÖNTEM BELİRLEME */
    let yontem = 'GENEL HASAR';
    if (onarim > rayic * 0.6) yontem = 'PERT TOTAL';else if (onarim > rayic * 0.4) yontem = 'PERT FARKI';

    /* YAŞ BAZLI ORAN */
    let yasOrani = 0;
    if (aracYasi <= 1) yasOrani = 0.12;else if (aracYasi <= 2) yasOrani = 0.10;else if (aracYasi <= 3) yasOrani = 0.09;else if (aracYasi <= 5) yasOrani = 0.07;else if (aracYasi <= 7) yasOrani = 0.05;else if (aracYasi <= 10) yasOrani = 0.04;else if (aracYasi <= 15) yasOrani = 0.03;else yasOrani = 0.02;

    /* HASAR BÖLGESİ KATSAYISI */
    let bolgeKatsayisi = 1.0;
    switch (form.hasarBolgesi) {
      case 'ÖN':
        bolgeKatsayisi = 1.15;
        break;
      case 'ARKA':
        bolgeKatsayisi = 1.0;
        break;
      case 'YAN':
        bolgeKatsayisi = 1.05;
        break;
      case 'TAVAN':
        bolgeKatsayisi = 1.20;
        break;
      case 'ÇOKLU':
        bolgeKatsayisi = 1.30;
        break;
    }

    /* KM FAKTÖRÜ */
    let kmFaktoru = 1.0;
    if (km > 0) {
      if (km < 30000) kmFaktoru = 1.10;else if (km < 60000) kmFaktoru = 1.05;else if (km < 100000) kmFaktoru = 1.0;else if (km < 150000) kmFaktoru = 0.95;else if (km < 200000) kmFaktoru = 0.90;else kmFaktoru = 0.85;
    }

    /* PREMİUM BONUS */
    const premiumBonus = premiumMi ? 1.15 : 1.0;

    /* TEMEL DEĞER KAYBI */
    let temelDK = rayic * yasOrani * bolgeKatsayisi;

    /* ONARIM / RAYİÇ İLİŞKİSİ */
    const onarimOrani = onarim / rayic;
    let onarimFaktoru = 1.0;
    if (onarimOrani >= 0.6) onarimFaktoru = 1.35;else if (onarimOrani >= 0.4) onarimFaktoru = 1.20;else if (onarimOrani >= 0.25) onarimFaktoru = 1.10;else if (onarimOrani >= 0.10) onarimFaktoru = 1.0;else onarimFaktoru = 0.85;

    /* ÖNCEKİ HASAR DÜŞÜŞİ */
    const oncekiHasarFaktoru = Math.max(0.50, 1 - oncekiHsr * 0.05);

    /* NİHAİ HESAPLAMA */
    let degerKaybi = temelDK * kmFaktoru * premiumBonus * onarimFaktoru * oncekiHasarFaktoru;

    /* KUSUR ORANI UYGULA */
    const kusurluTutar = degerKaybi * (kusur / 100);

    /* PERT TOTAL İSE FARK HESAPLA */
    let pertFarki = 0;
    if (yontem === 'PERT TOTAL') {
      pertFarki = rayic - onarim;
      if (pertFarki < 0) pertFarki = 0;
    }
    const nihai = Math.round(kusurluTutar);
    const sonucObj = {
      marka: form.marka,
      model: form.model,
      modelYili: form.modelYili,
      aracYasi,
      premiumMi,
      rayic,
      onarim,
      km,
      yontem,
      yasOrani,
      bolgeKatsayisi,
      hasarBolgesi: form.hasarBolgesi,
      kmFaktoru,
      premiumBonus,
      onarimFaktoru,
      onarimOrani,
      oncekiHasarFaktoru,
      oncekiHasar: oncekiHsr,
      kusurOrani: kusur,
      temelDK: Math.round(temelDK),
      degerKaybi: Math.round(degerKaybi),
      kusurluTutar: nihai,
      pertFarki,
      kazaTarihi: form.kazaTarihi
    };
    setSonuc(sonucObj);

    /* SONUÇ ALANINA KAYDIRMA */
    setTimeout(() => {
      if (sonucRef.current) sonucRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  /* ---------- TEMİZLE ---------- */
  const temizle = () => {
    setForm({
      marka: '',
      model: '',
      modelYili: '',
      kazaTarihi: '',
      km: '',
      onarimBedeli: '',
      rayicDeger: '',
      kusurOrani: '100',
      oncekiHasar: '0',
      hasarBolgesi: ''
    });
    setSonuc(null);
    setHata('');
  };

  /* ---------- PDF ÇIKTI ---------- */
  const pdfCikti = () => {
    alert('PDF ÇIKTI FONKSİYONU YAKINDA AKTİF OLACAKTIR.\nHESAPLAMA SONUÇLARI PDF OLARAK İNDİRİLEBİLECEKTİR.');
  };

  /* ---------- DOSYAYA KAYDET ---------- */
  const dosyayaKaydet = async () => {
    if (!sonuc) return;
    const urlParts = (window.location.hash || '').split('dosya_id=');
    const dosyaId = urlParts.length > 1 ? urlParts[1] : null;
    if (!dosyaId) {
      alert('BU HESAPLAMAYI BİR DOSYAYA KAYDETMEK İÇİN DOSYA DETAY SAYFASINDAN ERİŞİNİZ.');
      return;
    }
    try {
      const r = await MR.api.req('/dosya/hesaplama-kaydet.php', {
        method: 'POST',
        body: JSON.stringify({
          dosya_id: dosyaId,
          hesap_turu: 'ADK',
          sonuc: sonuc
        })
      });
      if (r?.success) alert('HESAPLAMA DOSYAYA KAYDEDİLDİ');else alert(r?.error || 'KAYDETME HATASI');
    } catch (e) {
      alert('BAĞLANTI HATASI');
    }
  };

  /* ---------- EMSAL FİLTRE ---------- */
  const filtrelenmisEmsaller = useMemo(() => {
    if (!sonuc) return TAHKIM_EMSALLERI;
    return TAHKIM_EMSALLERI.filter(e => {
      const yasUygun = Math.abs(e.aracYasi - sonuc.aracYasi) <= 3;
      return yasUygun;
    }).sort((a, b) => Math.abs(a.aracYasi - sonuc.aracYasi) - Math.abs(b.aracYasi - sonuc.aracYasi));
  }, [sonuc]);

  /* ---------- YÖNTEM RENGİ ---------- */
  const yontemRenk = y => {
    if (y === 'PERT TOTAL') return C.danger;
    if (y === 'PERT FARKI') return C.warning;
    return C.success;
  };

  /* ---------- TABLO STİLLERİ ---------- */
  const thStyle = {
    padding: '10px 12px',
    textAlign: 'left',
    color: C.textMuted,
    fontWeight: 600,
    fontSize: 10,
    borderBottom: `1px solid ${C.border}`
  };
  const tdStyle = {
    padding: '10px 12px',
    fontSize: 12,
    borderBottom: `1px solid ${C.border}`
  };

  /* ═══════════════════════════════════════════ RENDER ═══════════════════════════════════════════ */
  return /*#__PURE__*/React.createElement("div", {
    className: "fade-in"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 12,
      background: `${C.success}22`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Calculator",
    size: 22,
    color: C.success
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800
    }
  }, "ADK HESAPLAMA"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.textMuted,
      letterSpacing: 1
    }
  }, "ARA\xC7 DE\u011EER KAYBI HESAPLAYICI"))), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnG
    },
    onClick: () => setPage('home')
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "ArrowLeft",
    size: 14
  }), " ANA SAYFA")), hata && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 16px',
      background: `${C.danger}22`,
      border: `1px solid ${C.danger}44`,
      borderRadius: 10,
      marginBottom: 16,
      fontSize: 12,
      color: C.danger,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "AlertCircle",
    size: 16,
    color: C.danger
  }), " ", hata), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: sonuc ? '1fr 1fr' : '1fr',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.card
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "Car",
    title: "ARA\xC7 VE HASAR B\u0130LG\u0130LER\u0130",
    sub: "HESAPLAMA PARAMETRELER\u0130N\u0130 G\u0130R\u0130N\u0130Z"
  }), /*#__PURE__*/React.createElement("div", {
    style: S.cardBody
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(FormGroup, {
    label: "ARA\xC7 MARKA *"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.select,
    value: form.marka,
    onChange: e => {
      u('marka', e.target.value);
      u('model', '');
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "MARKA SE\xC7\u0130N\u0130Z"), markalar.map(m => /*#__PURE__*/React.createElement("option", {
    key: m,
    value: m
  }, m)))), /*#__PURE__*/React.createElement(FormGroup, {
    label: "ARA\xC7 MODEL *"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.select,
    value: form.model,
    onChange: e => u('model', e.target.value),
    disabled: !form.marka
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "MODEL SE\xC7\u0130N\u0130Z"), modeller.map(m => /*#__PURE__*/React.createElement("option", {
    key: m,
    value: m
  }, m)))), /*#__PURE__*/React.createElement(FormGroup, {
    label: "MODEL YILI *"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.select,
    value: form.modelYili,
    onChange: e => u('modelYili', e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "YIL SE\xC7\u0130N\u0130Z"), yillar.map(y => /*#__PURE__*/React.createElement("option", {
    key: y,
    value: y
  }, y)))), /*#__PURE__*/React.createElement(FormGroup, {
    label: "KAZA TAR\u0130H\u0130 *"
  }, /*#__PURE__*/React.createElement("input", {
    type: "date",
    style: S.input,
    value: form.kazaTarihi,
    onChange: e => u('kazaTarihi', e.target.value)
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "K\u0130LOMETRE (KM)"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.input,
    value: form.km,
    placeholder: "\xD6RN: 85.000",
    onChange: e => u('km', fmtInput(e.target.value))
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "ONARIM BEDEL\u0130 (\u20BA) *"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.input,
    value: form.onarimBedeli,
    placeholder: "\xD6RN: 45.000",
    onChange: e => u('onarimBedeli', fmtInput(e.target.value))
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "RAY\u0130\xC7 DE\u011EER (\u20BA) *"
  }, /*#__PURE__*/React.createElement("input", {
    style: S.input,
    value: form.rayicDeger,
    placeholder: "\xD6RN: 750.000",
    onChange: e => u('rayicDeger', fmtInput(e.target.value))
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "KUSUR ORANI (%)"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    style: S.input,
    value: form.kusurOrani,
    min: "0",
    max: "100",
    onChange: e => u('kusurOrani', e.target.value),
    placeholder: "100"
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "\xD6NCEK\u0130 HASAR SAYISI"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    style: S.input,
    value: form.oncekiHasar,
    min: "0",
    max: "10",
    onChange: e => u('oncekiHasar', e.target.value),
    placeholder: "0"
  })), /*#__PURE__*/React.createElement(FormGroup, {
    label: "HASAR B\xD6LGES\u0130 *"
  }, /*#__PURE__*/React.createElement("select", {
    style: S.select,
    value: form.hasarBolgesi,
    onChange: e => u('hasarBolgesi', e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "B\xD6LGE SE\xC7\u0130N\u0130Z"), hasarBolgeleri.map(b => /*#__PURE__*/React.createElement("option", {
    key: b,
    value: b
  }, b))))), form.marka && ARAC_DB[form.marka]?.premium && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      padding: '10px 14px',
      background: `${C.gold}15`,
      border: `1px solid ${C.gold}33`,
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Star",
    size: 16,
    color: C.gold
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: C.gold,
      fontWeight: 600
    }
  }, "PREM\u0130UM SEGMENT ARA\xC7 - %15 EK DE\u011EER KAYBI UYGULANIR")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnS,
      flex: 1,
      justifyContent: 'center'
    },
    onClick: hesapla
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Calculator",
    size: 16,
    color: "#fff"
  }), " HESAPLA"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnG
    },
    onClick: temizle
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "RefreshCw",
    size: 14
  }), " TEM\u0130ZLE"), sonuc && /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnW
    },
    onClick: pdfCikti
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Printer",
    size: 14
  }), " PDF \xC7IKTI")))), sonuc && /*#__PURE__*/React.createElement("div", {
    ref: sonucRef
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card,
      marginBottom: 16,
      border: `1px solid ${C.success}44`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.cardHead,
      background: `${C.success}11`
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "TrendingUp",
    size: 18,
    color: C.success
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: C.success
    }
  }, "HESAPLAMA SONUCU"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    text: sonuc.yontem,
    color: yontemRenk(sonuc.yontem)
  }))), /*#__PURE__*/React.createElement("div", {
    style: S.cardBody
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      padding: '20px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.textMuted,
      letterSpacing: 1,
      marginBottom: 6
    }
  }, "HESAPLANAN DE\u011EER KAYBI"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 36,
      fontWeight: 900,
      color: C.success,
      letterSpacing: -1
    }
  }, fmtK(sonuc.kusurluTutar)), sonuc.kusurOrani < 100 && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.textMuted,
      marginTop: 4
    }
  }, "KUSURSUZ TUTAR: ", fmtK(sonuc.degerKaybi), " | KUSUR: %", sonuc.kusurOrani)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '12px 16px',
      background: `${C.accent}11`,
      borderRadius: 8,
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Car",
    size: 18,
    color: C.accent
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700
    }
  }, sonuc.marka, " ", sonuc.model), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.textMuted
    }
  }, sonuc.modelYili, " MODEL | ", sonuc.aracYasi, " YA\u015E")), sonuc.premiumMi && /*#__PURE__*/React.createElement(Badge, {
    text: "PREM\u0130UM",
    color: C.gold
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: C.textMuted,
      marginBottom: 10,
      letterSpacing: 0.5
    }
  }, "HESAPLAMA DETAYLARI"), [{
    label: 'RAYİÇ DEĞER',
    value: fmtK(sonuc.rayic),
    icon: 'DollarSign',
    color: C.accent
  }, {
    label: 'ONARIM BEDELİ',
    value: fmtK(sonuc.onarim),
    icon: 'Briefcase',
    color: C.warning
  }, {
    label: 'ONARIM / RAYİÇ ORANI',
    value: '%' + (sonuc.onarimOrani * 100).toFixed(1),
    icon: 'Percent',
    color: C.purple
  }, {
    label: 'YAŞ ORANI',
    value: '%' + (sonuc.yasOrani * 100).toFixed(1),
    icon: 'Clock',
    color: C.cyan
  }, {
    label: 'BÖLGE KATSAYISI (' + sonuc.hasarBolgesi + ')',
    value: 'x' + sonuc.bolgeKatsayisi.toFixed(2),
    icon: 'Target',
    color: C.pink
  }, {
    label: 'KM FAKTÖRÜ',
    value: 'x' + sonuc.kmFaktoru.toFixed(2),
    icon: 'Activity',
    color: C.success
  }, {
    label: 'ONARIM FAKTÖRÜ',
    value: 'x' + sonuc.onarimFaktoru.toFixed(2),
    icon: 'TrendingUp',
    color: C.warning
  }, {
    label: 'ÖNCEKİ HASAR FAKTÖRÜ (' + sonuc.oncekiHasar + ' HASAR)',
    value: 'x' + sonuc.oncekiHasarFaktoru.toFixed(2),
    icon: 'Layers',
    color: C.danger
  }, {
    label: 'PREMİUM BONUS',
    value: sonuc.premiumMi ? 'x1.15' : 'x1.00',
    icon: 'Star',
    color: C.gold
  }].map((row, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: `1px solid ${C.border}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: row.icon,
    size: 14,
    color: row.color
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.textSec
    }
  }, row.label)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700
    }
  }, row.value))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 0',
      marginTop: 6,
      borderTop: `2px solid ${C.accent}44`
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      color: C.accent
    }
  }, "TEMEL DE\u011EER KAYBI"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 800,
      fontSize: 14,
      color: C.accent
    }
  }, fmtK(sonuc.temelDK))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: `${C.success}15`,
      borderRadius: 8,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 800,
      color: C.success
    }
  }, "N\u0130HA\u0130 DE\u011EER KAYBI"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 900,
      fontSize: 18,
      color: C.success
    }
  }, fmtK(sonuc.kusurluTutar)))), sonuc.yontem === 'PERT TOTAL' && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      padding: '10px 14px',
      background: `${C.danger}15`,
      border: `1px solid ${C.danger}33`,
      borderRadius: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: C.danger,
      marginBottom: 4
    }
  }, "PERT TOTAL TESP\u0130T\u0130"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.textSec
    }
  }, "ONARIM BEDEL\u0130 RAY\u0130\xC7 DE\u011EER\u0130N %60'INI A\u015EMAKTADIR. ARA\xC7 EKONOM\u0130K \xD6MR\xDCN\xDC TAMAMLAMI\u015E SAYILIR. PERT FARKI: ", fmtK(sonuc.pertFarki))), sonuc.yontem === 'PERT FARKI' && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      padding: '10px 14px',
      background: `${C.warning}15`,
      border: `1px solid ${C.warning}33`,
      borderRadius: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: C.warning,
      marginBottom: 4
    }
  }, "PERT FARKI TESP\u0130T\u0130"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.textSec
    }
  }, "ONARIM BEDEL\u0130 RAY\u0130\xC7 DE\u011EER\u0130N %40-60 ARALI\u011EINDADIR. PERT FARKI Y\xD6NTEM\u0130 UYGULANMI\u015ETIR.")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnP,
      flex: 1,
      justifyContent: 'center'
    },
    onClick: dosyayaKaydet
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Save",
    size: 14,
    color: "#fff"
  }), " DOSYAYA KAYDET"), /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn,
      ...S.btnW
    },
    onClick: pdfCikti
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "Printer",
    size: 14
  }), " PDF \xC7IKTI")))))), /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card,
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    icon: "Gavel",
    title: "EMSAL KARARLAR",
    sub: sonuc ? 'BENZER KOŞULLARA GÖRE FİLTRELENMİŞ' : 'TAHKİM KOMİSYONU VE YARGITAY KARARLARI'
  }), /*#__PURE__*/React.createElement("div", {
    style: S.cardBody
  }, filtrelenmisEmsaller.length > 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto'
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, ['DOSYA NO', 'ARAÇ TİPİ', 'ARAÇ YAŞI', 'KM', 'ONARIM', 'RAYİÇ', 'DEĞER KAYBI', 'KUSUR', 'ÖNCEKİ HASAR', 'BÖLGE', 'YÖNTEM'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: thStyle
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, filtrelenmisEmsaller.map((e, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      transition: 'background .2s'
    },
    onMouseEnter: ev => ev.currentTarget.style.background = C.bgHover,
    onMouseLeave: ev => ev.currentTarget.style.background = 'transparent'
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      ...tdStyle,
      fontWeight: 600,
      color: C.accent
    }
  }, e.dosyaNo), /*#__PURE__*/React.createElement("td", {
    style: tdStyle
  }, /*#__PURE__*/React.createElement(Badge, {
    text: e.aracTipi,
    color: e.aracTipi === 'PREMİUM' ? C.gold : e.aracTipi === 'ORTA' ? C.accent : C.cyan
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      ...tdStyle,
      textAlign: 'center'
    }
  }, e.aracYasi, " YIL"), /*#__PURE__*/React.createElement("td", {
    style: tdStyle
  }, e.kmOrtalama ? e.kmOrtalama.toLocaleString('tr-TR') : '-'), /*#__PURE__*/React.createElement("td", {
    style: tdStyle
  }, fmtK(e.onarimBedeli)), /*#__PURE__*/React.createElement("td", {
    style: tdStyle
  }, fmtK(e.rayicDeger)), /*#__PURE__*/React.createElement("td", {
    style: {
      ...tdStyle,
      fontWeight: 700,
      color: C.success
    }
  }, fmtK(e.degerKaybi)), /*#__PURE__*/React.createElement("td", {
    style: {
      ...tdStyle,
      textAlign: 'center'
    }
  }, "%", e.kusurOrani), /*#__PURE__*/React.createElement("td", {
    style: {
      ...tdStyle,
      textAlign: 'center'
    }
  }, e.oncekiHasar), /*#__PURE__*/React.createElement("td", {
    style: tdStyle
  }, /*#__PURE__*/React.createElement(Badge, {
    text: e.hasarBolgesi,
    color: C.purple
  })), /*#__PURE__*/React.createElement("td", {
    style: tdStyle
  }, /*#__PURE__*/React.createElement(Badge, {
    text: e.yontem,
    color: yontemRenk(e.yontem)
  }))))))) : /*#__PURE__*/React.createElement(EmptyState, {
    icon: "Gavel",
    title: "EMSAL BULUNAMADI",
    desc: "BU KR\u0130TERLERE UYGUN EMSAL KARAR BULUNAMAMI\u015ETIR"
  }), sonuc && filtrelenmisEmsaller.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      padding: '12px 16px',
      background: `${C.accent}11`,
      borderRadius: 8,
      border: `1px solid ${C.accent}22`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: C.accent,
      marginBottom: 6
    }
  }, "KAR\u015EILA\u015ETIRMA NOTU"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.textSec,
      lineHeight: 1.5
    }
  }, "YUKARIDA L\u0130STELENEN EMSAL KARARLAR, SE\xC7\u0130LEN ARACA YAKIN KO\u015EULLARDA VER\u0130LM\u0130\u015E KARARLARDIR. HESAPLANAN DE\u011EER KAYBI (", fmtK(sonuc.kusurluTutar), ") \u0130LE EMSAL KARARLARIN KAR\u015EILA\u015ETIRILMASI DE\u011EERLEND\u0130RME RAPORUNUZA ESAS TE\u015EK\u0130L EDEB\u0130L\u0130R.")))));
};