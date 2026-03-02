/**
 * MR HASAR DANIŞMANLIK - İÇTİHAT MENÜSÜ
 * Yargıtay Kararları, Tahkim Kabul Örnekleri, Poliçe Limit Tabloları, Kusur Emsal Dosyaları
 * Gemini AI Entegre Gerçek Zamanlı Arama
 */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useCallback, useRef, useMemo} = React;

/* ═══ İÇTİHAT ANA SAYFA ═══ */
MR.IctihatPage = ({setPage, user, subPage}) => {
  const tab = subPage || 'yargitay';

  return (
    <div>
      {tab === 'yargitay' && <YargitayKararlariPage user={user} setPage={setPage}/>}
      {tab === 'tahkim' && <TahkimKararlariPage user={user} setPage={setPage}/>}
      {tab === 'police-limit' && <PoliceLimitPage user={user} setPage={setPage}/>}
      {tab === 'kusur-emsal' && <KusurEmsalPage user={user} setPage={setPage}/>}
    </div>
  );
};

/* ═══ ORTAK ARAMA SONUÇ KARTI ═══ */
const KararKarti = ({karar, tip, index}) => {
  const {C, LIcon} = MR;
  const isK = MR.tema === 'koyu';
  const [expanded, setExpanded] = useState(false);

  const tipRenk = {
    yargitay: C.accent,
    tahkim: C.purple,
    kusur: C.warning,
    police: C.success
  };

  const renk = tipRenk[tip] || C.accent;

  return (
    <div style={{
      ...MR.S.card, marginBottom: 14, transition: 'all .2s',
      border: `1px solid ${expanded ? renk + '50' : C.border}`,
      boxShadow: expanded
        ? `0 8px 25px -5px ${renk}20, 0 0 0 1px ${renk}15`
        : C.cardShadow
    }}>
      <div style={{
        padding: '16px 20px', display: 'flex', alignItems: 'flex-start',
        gap: 14, cursor: 'pointer'
      }} onClick={() => setExpanded(!expanded)}>
        {/* NUMARA / İKON */}
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: `${renk}15`, border: `1px solid ${renk}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 800, color: renk
        }}>
          {index + 1}
        </div>

        {/* İÇERİK */}
        <div style={{flex: 1, minWidth: 0}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6}}>
            {karar.dosya_no && (
              <span style={{
                fontSize: 12, fontWeight: 800, color: renk,
                background: `${renk}12`, padding: '3px 10px', borderRadius: 8,
                border: `1px solid ${renk}25`
              }}>{karar.dosya_no}</span>
            )}
            {karar.tarih && (
              <span style={{fontSize: 11, fontWeight: 600, color: C.textMuted}}>
                {karar.tarih}
              </span>
            )}
            {karar.kaynak && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: C.textMuted,
                background: `${C.textMuted}15`, padding: '2px 8px', borderRadius: 6
              }}>{karar.kaynak}</span>
            )}
          </div>

          <div style={{fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.5}}>
            {karar.ozet || karar.baslik || 'KARAR ÖZETİ'}
          </div>

          {/* TUTAR BİLGİLERİ */}
          {(karar.tutar || karar.deger_kaybi || karar.tazminat) && (
            <div style={{display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap'}}>
              {karar.tutar && (
                <span style={{fontSize: 14, fontWeight: 800, color: C.success}}>
                  ₺{Number(karar.tutar).toLocaleString('tr-TR')}
                </span>
              )}
              {karar.deger_kaybi && (
                <span style={{fontSize: 14, fontWeight: 800, color: C.warning}}>
                  DK: ₺{Number(karar.deger_kaybi).toLocaleString('tr-TR')}
                </span>
              )}
              {karar.tazminat && (
                <span style={{fontSize: 14, fontWeight: 800, color: C.purple}}>
                  TAZ: ₺{Number(karar.tazminat).toLocaleString('tr-TR')}
                </span>
              )}
            </div>
          )}
        </div>

        {/* EXPAND İKON */}
        <div style={{flexShrink: 0, color: C.textMuted, transition: 'transform .2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0)'}}>
          <LIcon name="ChevronDown" size={18} color={C.textMuted}/>
        </div>
      </div>

      {/* DETAY BÖLÜMÜ */}
      {expanded && (
        <div style={{
          padding: '0 20px 16px', borderTop: `1px solid ${C.border}`,
          marginTop: 0, paddingTop: 14,
          animation: 'fadeIn .2s ease'
        }}>
          {karar.detay && (
            <div style={{fontSize: 13, color: C.textSec, lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 10}}>
              {karar.detay}
            </div>
          )}
          {karar.hukuki_dayanak && (
            <div style={{marginBottom: 8}}>
              <span style={{fontSize: 11, fontWeight: 800, color: C.textMuted}}>HUKUKİ DAYANAK: </span>
              <span style={{fontSize: 12, color: C.textSec}}>{karar.hukuki_dayanak}</span>
            </div>
          )}
          {karar.daire && (
            <div style={{marginBottom: 8}}>
              <span style={{fontSize: 11, fontWeight: 800, color: C.textMuted}}>DAİRE: </span>
              <span style={{fontSize: 12, color: C.textSec}}>{karar.daire}</span>
            </div>
          )}
          {karar.kusur_orani && (
            <div style={{marginBottom: 8}}>
              <span style={{fontSize: 11, fontWeight: 800, color: C.textMuted}}>KUSUR ORANI: </span>
              <span style={{fontSize: 12, fontWeight: 800, color: C.warning}}>%{karar.kusur_orani}</span>
            </div>
          )}
          {karar.anahtar_kelimeler && (
            <div style={{display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8}}>
              {(Array.isArray(karar.anahtar_kelimeler) ? karar.anahtar_kelimeler : karar.anahtar_kelimeler.split(',')).map((k, i) => (
                <span key={i} style={{
                  fontSize: 10, fontWeight: 700, color: renk,
                  background: `${renk}10`, padding: '2px 8px', borderRadius: 6,
                  border: `1px solid ${renk}20`
                }}>{k.trim()}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ═══ ORTAK ARAMA FORMU ═══ */
const AramaFormu = ({onAra, yukleniyor, tip, children, placeholder}) => {
  const {C, LIcon} = MR;
  const isK = MR.tema === 'koyu';
  const [aramaMetni, setAramaMetni] = useState('');

  const tipIkon = {
    yargitay: 'Scale',
    tahkim: 'Gavel',
    kusur: 'Search',
    police: 'FileCheck'
  };

  const tipRenk = {
    yargitay: C.accent,
    tahkim: C.purple,
    kusur: C.warning,
    police: C.success
  };

  const ikon = tipIkon[tip] || 'Search';
  const renk = tipRenk[tip] || C.accent;

  return (
    <div style={{...MR.S.card, marginBottom: 20}}>
      <div style={{
        ...MR.S.cardHead,
        background: `linear-gradient(135deg, ${renk}12, ${renk}05)`,
        borderBottom: `1px solid ${renk}20`
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${renk}18`, border: `1px solid ${renk}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <LIcon name={ikon} size={18} color={renk}/>
        </div>
        <span style={{color: renk}}>
          {tip === 'yargitay' && 'YARGITAY KARARLARI ARAMA'}
          {tip === 'tahkim' && 'TAHKİM KABUL ÖRNEKLERİ ARAMA'}
          {tip === 'kusur' && 'KUSUR EMSAL DOSYALARI ARAMA'}
          {tip === 'police' && 'POLİÇE LİMİT TABLOLARI'}
        </span>
      </div>
      <div style={{...MR.S.cardBody}}>
        {/* ÇOCUK BİLEŞENLER (EK FİLTRELER) */}
        {children}

        {/* ARAMA METNİ */}
        <div style={{marginTop: children ? 14 : 0}}>
          <label style={MR.S.label}>KONU / ANAHTAR KELİME</label>
          <div style={{display: 'flex', gap: 10}}>
            <input
              style={{...MR.S.input, flex: 1}}
              value={aramaMetni}
              onChange={e => setAramaMetni(e.target.value)}
              placeholder={placeholder || 'Aranacak konu veya anahtar kelime yazın...'}
              onKeyDown={e => { if (e.key === 'Enter' && !yukleniyor) onAra(aramaMetni); }}
            />
            <button
              style={{
                ...MR.S.btn, ...MR.S.btnP, minWidth: 140,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: yukleniyor ? 0.7 : 1, cursor: yukleniyor ? 'not-allowed' : 'pointer',
                background: `linear-gradient(135deg, ${renk}, ${renk}cc)`
              }}
              onClick={() => onAra(aramaMetni)}
              disabled={yukleniyor}
            >
              {yukleniyor ? (
                <><div style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .8s linear infinite'}}/> ARANIYOR...</>
              ) : (
                <><LIcon name="Search" size={16} color="#fff"/> ARA</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══ SONUÇ İSTATİSTİK BANNER ═══ */
const SonucBanner = ({sonuc, tip}) => {
  const {C, LIcon} = MR;
  if (!sonuc) return null;

  const tipRenk = {
    yargitay: C.accent,
    tahkim: C.purple,
    kusur: C.warning,
    police: C.success
  };
  const renk = tipRenk[tip] || C.accent;

  return (
    <div style={{
      ...MR.S.card, marginBottom: 20, overflow: 'visible',
      background: `linear-gradient(135deg, ${renk}08, ${renk}03)`,
      border: `1px solid ${renk}25`
    }}>
      <div style={{padding: '16px 22px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12}}>
          <LIcon name="BarChart3" size={18} color={renk}/>
          <span style={{fontSize: 14, fontWeight: 800, color: renk}}>ARAMA SONUÇLARI</span>
          {sonuc.toplam_bulunan != null && (
            <span style={{
              fontSize: 12, fontWeight: 800, color: '#fff',
              background: renk, padding: '2px 10px', borderRadius: 8
            }}>{sonuc.toplam_bulunan} SONUÇ</span>
          )}
        </div>

        {/* İSTATİSTİK KUTULARI */}
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12}}>
          {sonuc.ortalama_tutar != null && (
            <div style={{...MR.S.stat, background: `${C.success}10`, border: `1px solid ${C.success}25`}}>
              <div style={{fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 4}}>ORTALAMA TUTAR</div>
              <div style={{fontSize: 18, fontWeight: 800, color: C.success}}>₺{Number(sonuc.ortalama_tutar).toLocaleString('tr-TR')}</div>
            </div>
          )}
          {sonuc.en_yuksek_tutar != null && (
            <div style={{...MR.S.stat, background: `${C.warning}10`, border: `1px solid ${C.warning}25`}}>
              <div style={{fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 4}}>EN YÜKSEK TUTAR</div>
              <div style={{fontSize: 18, fontWeight: 800, color: C.warning}}>₺{Number(sonuc.en_yuksek_tutar).toLocaleString('tr-TR')}</div>
            </div>
          )}
          {sonuc.en_dusuk_tutar != null && (
            <div style={{...MR.S.stat, background: `${C.cyan}10`, border: `1px solid ${C.cyan}25`}}>
              <div style={{fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 4}}>EN DÜŞÜK TUTAR</div>
              <div style={{fontSize: 18, fontWeight: 800, color: C.cyan}}>₺{Number(sonuc.en_dusuk_tutar).toLocaleString('tr-TR')}</div>
            </div>
          )}
          {sonuc.ortalama_dk != null && (
            <div style={{...MR.S.stat, background: `${C.purple}10`, border: `1px solid ${C.purple}25`}}>
              <div style={{fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 4}}>ORT. DEĞER KAYBI</div>
              <div style={{fontSize: 18, fontWeight: 800, color: C.purple}}>₺{Number(sonuc.ortalama_dk).toLocaleString('tr-TR')}</div>
            </div>
          )}
        </div>

        {/* ANALİZ NOTU */}
        {sonuc.analiz_notu && (
          <div style={{
            marginTop: 14, padding: '12px 16px', borderRadius: 10,
            background: `${renk}08`, border: `1px solid ${renk}15`,
            fontSize: 12, fontWeight: 600, color: C.textSec, lineHeight: 1.6
          }}>
            <LIcon name="Zap" size={13} color={renk} style={{marginRight: 6, verticalAlign: 'middle'}}/>
            {sonuc.analiz_notu}
          </div>
        )}
      </div>
    </div>
  );
};


/* ══════════════════════════════════════════════════════════════════
   1. YARGITAY KARARLARI ARAMA
   ══════════════════════════════════════════════════════════════════ */
const YargitayKararlariPage = ({user, setPage}) => {
  const {C, LIcon, api} = MR;
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sonuclar, setSonuclar] = useState(null);
  const [kararlar, setKararlar] = useState([]);
  const [daire, setDaire] = useState('');
  const [yil, setYil] = useState('');
  const [hata, setHata] = useState('');

  const daireler = [
    '', '4. HUKUK DAİRESİ', '11. HUKUK DAİRESİ', '17. HUKUK DAİRESİ',
    '3. HUKUK DAİRESİ', '6. HUKUK DAİRESİ', '15. HUKUK DAİRESİ',
    'HUKUK GENEL KURULU', 'CEZA GENEL KURULU'
  ];

  const yillar = [''];
  for (let y = new Date().getFullYear(); y >= 2010; y--) yillar.push(String(y));

  const ara = async (konu) => {
    if (!konu.trim()) {
      setHata('LÜTFEN ARANACAK KONU GİRİN');
      return;
    }
    setHata('');
    setYukleniyor(true);
    setSonuclar(null);
    setKararlar([]);

    try {
      const r = await api.ictihatYargitayAra({
        konu: konu.trim(),
        daire: daire,
        yil: yil
      });

      if (r?.success && r.data) {
        setSonuclar(r.data);
        setKararlar(r.data.kararlar || []);
      } else {
        setHata(r?.error || 'ARAMA SIRASINDA BİR HATA OLUŞTU');
      }
    } catch (e) {
      setHata('BAĞLANTI HATASI');
    }
    setYukleniyor(false);
  };

  return (
    <div style={{padding: '0 4px'}}>
      <MR.SectionTitle icon="Scale" title="YARGITAY KARARLARI" sub="KONU BAŞLIĞINA GÖRE YARGITAY KARAR ARAMA"/>

      <AramaFormu onAra={ara} yukleniyor={yukleniyor} tip="yargitay" placeholder="Örn: Araç değer kaybı, trafik kazası tazminat, sigorta rücu...">
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14}}>
          <div>
            <label style={MR.S.label}>YARGITAY DAİRESİ</label>
            <select style={MR.S.select} value={daire} onChange={e => setDaire(e.target.value)}>
              <option value="">TÜM DAİRELER</option>
              {daireler.filter(d => d).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={MR.S.label}>KARAR YILI</label>
            <select style={MR.S.select} value={yil} onChange={e => setYil(e.target.value)}>
              <option value="">TÜM YILLAR</option>
              {yillar.filter(y => y).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </AramaFormu>

      {hata && (
        <div style={{
          padding: '14px 20px', borderRadius: 12, marginBottom: 16,
          background: `${C.danger}12`, border: `1px solid ${C.danger}30`,
          color: C.danger, fontSize: 13, fontWeight: 700
        }}>
          <LIcon name="AlertTriangle" size={14} color={C.danger}/> {hata}
        </div>
      )}

      <SonucBanner sonuc={sonuclar} tip="yargitay"/>

      {kararlar.map((k, i) => (
        <KararKarti key={i} karar={k} tip="yargitay" index={i}/>
      ))}

      {!yukleniyor && kararlar.length === 0 && !hata && (
        <MR.EmptyState
          icon="Scale"
          title="YARGITAY KARAR ARAMA"
          desc="YUKARIDAKI FORMDAN KONU BAŞLIĞI GİREREK YARGITAY KARARLARINI ARAYABİLİRSİNİZ. AI DESTEKLİ GERÇEK ZAMANLI ARAMA."
        />
      )}
    </div>
  );
};


/* ══════════════════════════════════════════════════════════════════
   2. TAHKİM KABUL ÖRNEKLERİ
   ══════════════════════════════════════════════════════════════════ */
const TahkimKararlariPage = ({user, setPage}) => {
  const {C, LIcon, api} = MR;
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sonuclar, setSonuclar] = useState(null);
  const [kararlar, setKararlar] = useState([]);
  const [kategori, setKategori] = useState('');
  const [hata, setHata] = useState('');

  const kategoriler = [
    '', 'ARAÇ DEĞER KAYBI', 'BEDENİ HASAR', 'MADDİ HASAR',
    'DESTEKTEN YOKSUN KALMA', 'SÜREKLİ İŞ GÖREMEZLİK',
    'GEÇİCİ İŞ GÖREMEZLİK', 'RÜCU', 'KASKO', 'TRAFİK SİGORTASI'
  ];

  const ara = async (konu) => {
    if (!konu.trim()) {
      setHata('LÜTFEN ARANACAK KONU GİRİN');
      return;
    }
    setHata('');
    setYukleniyor(true);
    setSonuclar(null);
    setKararlar([]);

    try {
      const r = await api.ictihatTahkimAra({
        konu: konu.trim(),
        kategori: kategori
      });

      if (r?.success && r.data) {
        setSonuclar(r.data);
        setKararlar(r.data.kararlar || []);
      } else {
        setHata(r?.error || 'ARAMA SIRASINDA BİR HATA OLUŞTU');
      }
    } catch (e) {
      setHata('BAĞLANTI HATASI');
    }
    setYukleniyor(false);
  };

  return (
    <div style={{padding: '0 4px'}}>
      <MR.SectionTitle icon="Gavel" title="TAHKİM KABUL ÖRNEKLERİ" sub="SİGORTA TAHKİM KOMİSYONU KABUL KARAR ARAMA"/>

      <AramaFormu onAra={ara} yukleniyor={yukleniyor} tip="tahkim" placeholder="Örn: Araç değer kaybı, bedensel hasar tazminat, destekten yoksun kalma...">
        <div>
          <label style={MR.S.label}>HASAR KATEGORİSİ</label>
          <select style={MR.S.select} value={kategori} onChange={e => setKategori(e.target.value)}>
            <option value="">TÜM KATEGORİLER</option>
            {kategoriler.filter(k => k).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
      </AramaFormu>

      {hata && (
        <div style={{
          padding: '14px 20px', borderRadius: 12, marginBottom: 16,
          background: `${C.danger}12`, border: `1px solid ${C.danger}30`,
          color: C.danger, fontSize: 13, fontWeight: 700
        }}>
          <LIcon name="AlertTriangle" size={14} color={C.danger}/> {hata}
        </div>
      )}

      <SonucBanner sonuc={sonuclar} tip="tahkim"/>

      {kararlar.map((k, i) => (
        <KararKarti key={i} karar={k} tip="tahkim" index={i}/>
      ))}

      {!yukleniyor && kararlar.length === 0 && !hata && (
        <MR.EmptyState
          icon="Gavel"
          title="TAHKİM KARAR ARAMA"
          desc="KONU BAŞLIĞI GİREREK SİGORTA TAHKİM KOMİSYONU KABUL KARARLARINI ARAYABİLİRSİNİZ. AI DESTEKLİ GERÇEK ZAMANLI ARAMA."
        />
      )}
    </div>
  );
};


/* ══════════════════════════════════════════════════════════════════
   3. POLİÇE LİMİT TABLOLARI (YILLARA GÖRE)
   ══════════════════════════════════════════════════════════════════ */
const PoliceLimitPage = ({user, setPage}) => {
  const {C, LIcon, api} = MR;
  const isK = MR.tema === 'koyu';
  const [yukleniyor, setYukleniyor] = useState(false);
  const [limitData, setLimitData] = useState(null);
  const [seciliYil, setSeciliYil] = useState(new Date().getFullYear().toString());
  const [policeTuru, setPoliceTuru] = useState('');
  const [hata, setHata] = useState('');

  const yillar = [];
  for (let y = new Date().getFullYear(); y >= 2010; y--) yillar.push(String(y));

  const policeTurleri = [
    '', 'TRAFİK SİGORTASI', 'KASKO', 'DASK',
    'KONUT SİGORTASI', 'İŞYERİ SİGORTASI', 'SAĞLIK SİGORTASI',
    'HAYAT SİGORTASI', 'FERDI KAZA', 'SORUMLULUK SİGORTASI'
  ];

  const ara = async (konu) => {
    setHata('');
    setYukleniyor(true);
    setLimitData(null);

    try {
      const r = await api.ictihatPoliceLimitAra({
        yil: seciliYil,
        police_turu: policeTuru,
        konu: konu?.trim() || ''
      });

      if (r?.success && r.data) {
        setLimitData(r.data);
      } else {
        setHata(r?.error || 'VERİ ALINAMADI');
      }
    } catch (e) {
      setHata('BAĞLANTI HATASI');
    }
    setYukleniyor(false);
  };

  // Sayfa yüklendiğinde varsayılan arama
  useEffect(() => { ara(''); }, []);

  return (
    <div style={{padding: '0 4px'}}>
      <MR.SectionTitle icon="FileCheck" title="POLİÇE LİMİT TABLOLARI" sub="YILLARA GÖRE SİGORTA POLİÇE LİMİTLERİ VE TEMİNAT TUTARLARI"/>

      <AramaFormu onAra={ara} yukleniyor={yukleniyor} tip="police" placeholder="Örn: Trafik sigortası limit, kasko teminat, zorunlu mali sorumluluk...">
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14}}>
          <div>
            <label style={MR.S.label}>YIL</label>
            <select style={MR.S.select} value={seciliYil} onChange={e => setSeciliYil(e.target.value)}>
              {yillar.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label style={MR.S.label}>POLİÇE TÜRÜ</label>
            <select style={MR.S.select} value={policeTuru} onChange={e => setPoliceTuru(e.target.value)}>
              <option value="">TÜM POLİÇE TÜRLERİ</option>
              {policeTurleri.filter(p => p).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </AramaFormu>

      {hata && (
        <div style={{
          padding: '14px 20px', borderRadius: 12, marginBottom: 16,
          background: `${C.danger}12`, border: `1px solid ${C.danger}30`,
          color: C.danger, fontSize: 13, fontWeight: 700
        }}>
          <LIcon name="AlertTriangle" size={14} color={C.danger}/> {hata}
        </div>
      )}

      {/* LİMİT TABLOSU */}
      {limitData && (
        <div>
          {/* ÖN BİLGİ */}
          {limitData.bilgi && (
            <div style={{
              ...MR.S.card, marginBottom: 20, padding: '16px 22px',
              background: `linear-gradient(135deg, ${C.success}08, ${C.success}03)`,
              border: `1px solid ${C.success}25`
            }}>
              <div style={{fontSize: 13, fontWeight: 600, color: C.textSec, lineHeight: 1.7}}>
                <LIcon name="Zap" size={14} color={C.success}/> {limitData.bilgi}
              </div>
            </div>
          )}

          {/* ANA TABLO */}
          {limitData.limitler && limitData.limitler.length > 0 && (
            <div style={{...MR.S.card, overflow: 'auto', marginBottom: 20}}>
              <div style={{...MR.S.cardHead}}>
                <LIcon name="FileCheck" size={16} color={C.success}/>
                <span>{seciliYil} YILI POLİÇE LİMİTLERİ</span>
              </div>
              <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 13}}>
                <thead>
                  <tr style={{background: isK ? '#334155' : '#f1f5f9'}}>
                    <th style={{padding: '12px 16px', textAlign: 'left', fontWeight: 800, color: C.textSec, fontSize: 12}}>POLİÇE TÜRÜ</th>
                    <th style={{padding: '12px 16px', textAlign: 'left', fontWeight: 800, color: C.textSec, fontSize: 12}}>TEMİNAT</th>
                    <th style={{padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: C.textSec, fontSize: 12}}>LİMİT (₺)</th>
                    <th style={{padding: '12px 16px', textAlign: 'left', fontWeight: 800, color: C.textSec, fontSize: 12}}>AÇIKLAMA</th>
                  </tr>
                </thead>
                <tbody>
                  {limitData.limitler.map((l, i) => (
                    <tr key={i} style={{borderBottom: `1px solid ${C.border}`}}>
                      <td style={{padding: '12px 16px', fontWeight: 700, color: C.text}}>{l.police_turu}</td>
                      <td style={{padding: '12px 16px', color: C.textSec}}>{l.teminat}</td>
                      <td style={{padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: C.success}}>
                        {l.limit ? `₺${Number(l.limit).toLocaleString('tr-TR')}` : '-'}
                      </td>
                      <td style={{padding: '12px 16px', color: C.textMuted, fontSize: 12}}>{l.aciklama || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* YILLARA GÖRE KARŞILAŞTIRMA */}
          {limitData.yillik_karsilastirma && limitData.yillik_karsilastirma.length > 0 && (
            <div style={{...MR.S.card, overflow: 'auto', marginBottom: 20}}>
              <div style={{...MR.S.cardHead}}>
                <LIcon name="BarChart3" size={16} color={C.warning}/>
                <span>YILLARA GÖRE KARŞILAŞTIRMA</span>
              </div>
              <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 13}}>
                <thead>
                  <tr style={{background: isK ? '#334155' : '#f1f5f9'}}>
                    <th style={{padding: '12px 16px', textAlign: 'left', fontWeight: 800, color: C.textSec, fontSize: 12}}>YIL</th>
                    <th style={{padding: '12px 16px', textAlign: 'left', fontWeight: 800, color: C.textSec, fontSize: 12}}>POLİÇE TÜRÜ</th>
                    <th style={{padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: C.textSec, fontSize: 12}}>LİMİT (₺)</th>
                    <th style={{padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: C.textSec, fontSize: 12}}>DEĞİŞİM</th>
                  </tr>
                </thead>
                <tbody>
                  {limitData.yillik_karsilastirma.map((y, i) => (
                    <tr key={i} style={{borderBottom: `1px solid ${C.border}`}}>
                      <td style={{padding: '12px 16px', fontWeight: 800, color: C.accent}}>{y.yil}</td>
                      <td style={{padding: '12px 16px', color: C.textSec}}>{y.police_turu}</td>
                      <td style={{padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: C.success}}>
                        {y.limit ? `₺${Number(y.limit).toLocaleString('tr-TR')}` : '-'}
                      </td>
                      <td style={{padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: (y.degisim_orani || 0) >= 0 ? C.success : C.danger}}>
                        {y.degisim_orani ? `${y.degisim_orani > 0 ? '+' : ''}${y.degisim_orani}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ANALİZ NOTU */}
          {limitData.analiz_notu && (
            <div style={{
              ...MR.S.card, padding: '16px 22px', marginBottom: 20,
              background: `linear-gradient(135deg, ${C.success}08, ${C.success}03)`,
              border: `1px solid ${C.success}25`
            }}>
              <div style={{fontSize: 12, fontWeight: 800, color: C.success, marginBottom: 8}}>
                <LIcon name="Zap" size={14} color={C.success}/> ANALİZ NOTU
              </div>
              <div style={{fontSize: 13, fontWeight: 600, color: C.textSec, lineHeight: 1.7, whiteSpace: 'pre-wrap'}}>
                {limitData.analiz_notu}
              </div>
            </div>
          )}
        </div>
      )}

      {!yukleniyor && !limitData && !hata && (
        <MR.EmptyState
          icon="FileCheck"
          title="POLİÇE LİMİT TABLOLARI"
          desc="YIL VE POLİÇE TÜRÜ SEÇEREK SİGORTA LİMİTLERİNİ GÖRÜNTÜLEYEBİLİRSİNİZ."
        />
      )}
    </div>
  );
};


/* ══════════════════════════════════════════════════════════════════
   4. KUSUR EMSAL DOSYALARI
   ══════════════════════════════════════════════════════════════════ */
const KusurEmsalPage = ({user, setPage}) => {
  const {C, LIcon, api} = MR;
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sonuclar, setSonuclar] = useState(null);
  const [kararlar, setKararlar] = useState([]);
  const [kusurTuru, setKusurTuru] = useState('');
  const [kazaTuru, setKazaTuru] = useState('');
  const [hata, setHata] = useState('');

  const kusurTurleri = [
    '', 'TAM KUSURLU', 'AĞIR KUSURLU', 'ASIL KUSURLU',
    'EŞİT KUSURLU', 'TALİ KUSURLU', 'KUSURSUZ'
  ];

  const kazaTurleri = [
    '', 'TRAFİK KAZASI', 'KAVŞAK KAZASI', 'ŞERİT DEĞİŞTİRME',
    'ARKADAN ÇARPMA', 'KIRMIZI IŞIK İHLALİ', 'YAYA ÇARPMASI',
    'PARK HALİNDE ÇARPMA', 'ÇARPIŞMA', 'ÇOKLU ARAÇ KAZASI',
    'DÖNEL KAVŞAK', 'GERİ MANEVRA'
  ];

  const ara = async (konu) => {
    if (!konu.trim() && !kusurTuru && !kazaTuru) {
      setHata('LÜTFEN EN AZ BİR ARAMA KRİTERİ GİRİN');
      return;
    }
    setHata('');
    setYukleniyor(true);
    setSonuclar(null);
    setKararlar([]);

    try {
      const r = await api.ictihatKusurEmsalAra({
        konu: konu.trim(),
        kusur_turu: kusurTuru,
        kaza_turu: kazaTuru
      });

      if (r?.success && r.data) {
        setSonuclar(r.data);
        setKararlar(r.data.kararlar || []);
      } else {
        setHata(r?.error || 'ARAMA SIRASINDA BİR HATA OLUŞTU');
      }
    } catch (e) {
      setHata('BAĞLANTI HATASI');
    }
    setYukleniyor(false);
  };

  return (
    <div style={{padding: '0 4px'}}>
      <MR.SectionTitle icon="Search" title="KUSUR EMSAL DOSYALARI" sub="KAZA TÜRLERİNE GÖRE KUSUR ORANI EMSAL KARAR ARAMA"/>

      <AramaFormu onAra={ara} yukleniyor={yukleniyor} tip="kusur" placeholder="Örn: Kavşakta geçiş önceliği, kırmızı ışık, şerit ihlali, yaya önceliği...">
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14}}>
          <div>
            <label style={MR.S.label}>KUSUR TÜRÜ</label>
            <select style={MR.S.select} value={kusurTuru} onChange={e => setKusurTuru(e.target.value)}>
              <option value="">TÜM KUSUR TÜRLERİ</option>
              {kusurTurleri.filter(k => k).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label style={MR.S.label}>KAZA TÜRÜ</label>
            <select style={MR.S.select} value={kazaTuru} onChange={e => setKazaTuru(e.target.value)}>
              <option value="">TÜM KAZA TÜRLERİ</option>
              {kazaTurleri.filter(k => k).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </div>
      </AramaFormu>

      {hata && (
        <div style={{
          padding: '14px 20px', borderRadius: 12, marginBottom: 16,
          background: `${C.danger}12`, border: `1px solid ${C.danger}30`,
          color: C.danger, fontSize: 13, fontWeight: 700
        }}>
          <LIcon name="AlertTriangle" size={14} color={C.danger}/> {hata}
        </div>
      )}

      <SonucBanner sonuc={sonuclar} tip="kusur"/>

      {kararlar.map((k, i) => (
        <KararKarti key={i} karar={k} tip="kusur" index={i}/>
      ))}

      {!yukleniyor && kararlar.length === 0 && !hata && (
        <MR.EmptyState
          icon="Search"
          title="KUSUR EMSAL ARAMA"
          desc="KAZA TÜRÜ VE KUSUR KRİTERLERİNE GÖRE EMSAL KARARLAR ARAYABİLİRSİNİZ. AI DESTEKLİ GERÇEK ZAMANLI ARAMA."
        />
      )}
    </div>
  );
};
