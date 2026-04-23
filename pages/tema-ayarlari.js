/* ═══════════════════════════════════════════════════════════════
   TEMA AYARLARI — 12 SEKMELİ TAM TASARIM EDİTÖRÜ
   MR HASAR DANIŞMANLIK — SİSTEM MODÜLÜ
   React.createElement (Babel) — MR.TemaAyarlariTab
   ═══════════════════════════════════════════════════════════════ */

(() => {
const h = React.createElement;
const { useState, useEffect, useCallback, useRef, useMemo } = React;

/* ─── VARSAYILAN YAPILANDIRMA ─── */
const VARSAYILAN = {
  palet: {
    accent: '#1a56db', accentLight: '#3b82f6',
    success: '#10b981', warning: '#f59e0b', danger: '#ef4444',
    purple: '#8b5cf6', cyan: '#06b6d4', pink: '#ec4899',
    bg_koyu: '#0f172a', bgCard_koyu: '#1e293b',
    bg_acik: '#f8fafc', bgCard_acik: '#ffffff'
  },
  efekt: {
    shadow_yogunluk: 50, border_radius: 16,
    border_kalinlik: 1, kabartma: 0, cam_efekt: 0
  },
  tipografi: { font_olcek: 100, font_agirlik: 600, satir_yukseklik: 1.5 },
  layout: { kart_boyut: 'normal', grid_sutun: 3, ikon_boyut: 18, ikon_stil: 'normal', kart_aralik: 16 },
  buton: { stil: 'gradient', radius: 10, hover: 'lift' },
  tablo: {
    zebra: false, zebra_renk: '#1e293b', header_renk: '#1e3a5f',
    header_renk_acik: '#f1f5f9', hover_renk: '#334155',
    hover_renk_acik: '#e2e8f0', border_stili: 'solid', satir_yukseklik: 48
  },
  navigasyon: {
    header_bg: '#1e293b', header_blur: 10, header_border: true,
    menu_font_boyut: 13, menu_hover_stil: 'bg', aktif_renk: '#3b82f6',
    dropdown_animasyon: 'fadeIn'
  },
  input: { stil: 'normal', focus_efekt: 'glow', focus_renk: '#3b82f6', placeholder_renk: '#64748b', border_radius: 8 },
  badge: { sekil: 'pill', boyut: 'normal', stil: 'soft' },
  animasyon: {
    gecis_hizi: 'normal', sayfa_gecis: 'fadeIn', kart_animasyon: 'cardEntrance',
    hover_animasyon: 'lift', giris_animasyon: 'loginSlideIn',
    liste_stagger: true, loading_stil: 'pulse'
  },
  scrollbar: { genislik: 6, renk: 'rgba(26,86,219,0.35)', hover_renk: 'rgba(26,86,219,0.55)', track_renk: 'transparent', radius: 3 }
};

/* ─── HAZIR PALETLER ─── */
const PALETLER = [
  { ad: 'GECE MAVİSİ', accent: '#1a56db', accentLight: '#3b82f6', success: '#10b981', warning: '#f59e0b', danger: '#ef4444', purple: '#8b5cf6', cyan: '#06b6d4', pink: '#ec4899', bg_koyu: '#0f172a', bgCard_koyu: '#1e293b', bg_acik: '#f8fafc', bgCard_acik: '#ffffff' },
  { ad: 'OKYANUS', accent: '#0891b2', accentLight: '#22d3ee', success: '#10b981', warning: '#f59e0b', danger: '#ef4444', purple: '#a78bfa', cyan: '#67e8f9', pink: '#f472b6', bg_koyu: '#0c1222', bgCard_koyu: '#162032', bg_acik: '#f0f9ff', bgCard_acik: '#ffffff' },
  { ad: 'ZÜMRÜT', accent: '#059669', accentLight: '#34d399', success: '#10b981', warning: '#eab308', danger: '#dc2626', purple: '#7c3aed', cyan: '#06b6d4', pink: '#db2777', bg_koyu: '#0a1a14', bgCard_koyu: '#132a20', bg_acik: '#f0fdf4', bgCard_acik: '#ffffff' },
  { ad: 'AMBER', accent: '#d97706', accentLight: '#fbbf24', success: '#16a34a', warning: '#f59e0b', danger: '#dc2626', purple: '#9333ea', cyan: '#0891b2', pink: '#ec4899', bg_koyu: '#1a1207', bgCard_koyu: '#2a1f0e', bg_acik: '#fffbeb', bgCard_acik: '#ffffff' },
  { ad: 'BORDO', accent: '#be123c', accentLight: '#fb7185', success: '#10b981', warning: '#f59e0b', danger: '#ef4444', purple: '#a855f7', cyan: '#06b6d4', pink: '#f43f5e', bg_koyu: '#1a0a10', bgCard_koyu: '#2a1420', bg_acik: '#fff1f2', bgCard_acik: '#ffffff' },
  { ad: 'MOR GECE', accent: '#7c3aed', accentLight: '#a78bfa', success: '#10b981', warning: '#f59e0b', danger: '#ef4444', purple: '#8b5cf6', cyan: '#06b6d4', pink: '#ec4899', bg_koyu: '#0f0a1e', bgCard_koyu: '#1a1330', bg_acik: '#f5f3ff', bgCard_acik: '#ffffff' },
  { ad: 'GÜN BATIMI', accent: '#ea580c', accentLight: '#fb923c', success: '#16a34a', warning: '#eab308', danger: '#dc2626', purple: '#9333ea', cyan: '#0e7490', pink: '#e11d48', bg_koyu: '#1c0f05', bgCard_koyu: '#2c1a0c', bg_acik: '#fff7ed', bgCard_acik: '#ffffff' },
  { ad: 'GRAFİT', accent: '#475569', accentLight: '#94a3b8', success: '#10b981', warning: '#f59e0b', danger: '#ef4444', purple: '#8b5cf6', cyan: '#06b6d4', pink: '#ec4899', bg_koyu: '#0a0a0a', bgCard_koyu: '#171717', bg_acik: '#f5f5f5', bgCard_acik: '#ffffff' }
];

/* ─── YARDIMCI FONKSİYONLAR ─── */
const deepClone = o => JSON.parse(JSON.stringify(o));
const deepMerge = (target, src) => {
  const out = { ...target };
  for (const k of Object.keys(src)) {
    if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && target[k] && typeof target[k] === 'object') {
      out[k] = deepMerge(target[k], src[k]);
    } else {
      out[k] = src[k];
    }
  }
  return out;
};

const LIcon = MR.LIcon;

/* ─── KÜÇÜK BİLEŞENLER ─── */
const RenkKutu = ({ renk, onChange, label }) => {
  const ref = useRef(null);
  return h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
    h('div', {
      style: {
        width: 36, height: 36, borderRadius: 8, background: renk, cursor: 'pointer',
        border: '2px solid ' + MR.C.border, boxShadow: '0 2px 8px ' + renk + '44',
        transition: 'transform .15s', position: 'relative'
      },
      onClick: () => ref.current && ref.current.click()
    },
      h('input', {
        ref, type: 'color', value: renk || '#000000',
        style: { position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', top: 0, left: 0 },
        onChange: e => onChange(e.target.value)
      })
    ),
    h('div', { style: { flex: 1 } },
      h('div', { style: { fontSize: 11, fontWeight: 700, color: MR.C.textSec, marginBottom: 2 } }, label),
      h('div', { style: { fontSize: 12, fontWeight: 600, color: MR.C.textMuted, fontFamily: 'monospace' } }, (renk || '').toUpperCase())
    )
  );
};

const Slider = ({ label, value, min, max, step, onChange, unit, desc }) => {
  return h('div', { style: { marginBottom: 16 } },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 } },
      h('span', { style: { fontSize: 12, fontWeight: 700, color: MR.C.textSec } }, label),
      h('span', { style: { fontSize: 12, fontWeight: 700, color: MR.C.accent } }, value + (unit || ''))
    ),
    h('input', {
      type: 'range', min, max, step: step || 1, value,
      style: { width: '100%', accentColor: MR.C.accent, cursor: 'pointer' },
      onChange: e => onChange(Number(e.target.value))
    }),
    desc && h('div', { style: { fontSize: 10, color: MR.C.textMuted, marginTop: 3 } }, desc)
  );
};

const SecimGrubu = ({ label, secenekler, value, onChange }) => {
  return h('div', { style: { marginBottom: 16 } },
    h('div', { style: { fontSize: 12, fontWeight: 700, color: MR.C.textSec, marginBottom: 8 } }, label),
    h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
      secenekler.map(s => h('button', {
        key: s.key,
        style: {
          padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
          background: value === s.key ? MR.C.accent : MR.C.bgInput,
          color: value === s.key ? '#fff' : MR.C.textSec,
          transition: 'all .15s', boxShadow: value === s.key ? ('0 2px 8px ' + MR.C.accent + '44') : 'none'
        },
        onClick: () => onChange(s.key)
      }, s.label))
    )
  );
};

const Bolum = ({ baslik, children }) => h('div', {
  style: { background: MR.C.bgCard, borderRadius: 12, border: '1px solid ' + MR.C.border, padding: 18, marginBottom: 14 }
}, h('div', { style: { fontSize: 13, fontWeight: 800, color: MR.C.text, marginBottom: 14, borderBottom: '1px solid ' + MR.C.border, paddingBottom: 10 } }, baslik), children);

/* ═══════ SEKMELERİN İÇERİKLERİ ═══════ */

/* ─── 1. RENK PALETİ ─── */
const PaletTab = ({ config, setConfig }) => {
  const p = config.palet;
  const set = (k, v) => setConfig(prev => ({ ...prev, palet: { ...prev.palet, [k]: v } }));

  const paletUygula = (palet) => {
    const { ad, ...renkler } = palet;
    setConfig(prev => ({ ...prev, palet: { ...prev.palet, ...renkler } }));
  };

  return h('div', null,
    h(Bolum, { baslik: 'HAZIR PALETLER' },
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 } },
        PALETLER.map((pl, i) => h('button', {
          key: i,
          style: {
            padding: 12, borderRadius: 10, border: '2px solid ' + (p.accent === pl.accent && p.bg_koyu === pl.bg_koyu ? MR.C.accent : MR.C.border),
            background: MR.C.bgInput, cursor: 'pointer', transition: 'all .2s', textAlign: 'center'
          },
          onClick: () => paletUygula(pl)
        },
          h('div', { style: { display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 8 } },
            [pl.accent, pl.accentLight, pl.success, pl.warning, pl.danger].map((c, j) =>
              h('div', { key: j, style: { width: 16, height: 16, borderRadius: 4, background: c } })
            )
          ),
          h('div', { style: { fontSize: 10, fontWeight: 800, color: MR.C.textSec } }, pl.ad)
        ))
      )
    ),
    h(Bolum, { baslik: 'ANA RENKLER' },
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
        h(RenkKutu, { label: 'ANA RENK (ACCENT)', renk: p.accent, onChange: v => set('accent', v) }),
        h(RenkKutu, { label: 'ACCENT AÇIK', renk: p.accentLight, onChange: v => set('accentLight', v) }),
        h(RenkKutu, { label: 'BAŞARILI', renk: p.success, onChange: v => set('success', v) }),
        h(RenkKutu, { label: 'UYARI', renk: p.warning, onChange: v => set('warning', v) }),
        h(RenkKutu, { label: 'TEHLİKE', renk: p.danger, onChange: v => set('danger', v) }),
        h(RenkKutu, { label: 'MOR', renk: p.purple, onChange: v => set('purple', v) }),
        h(RenkKutu, { label: 'CAM GÖBEĞİ', renk: p.cyan, onChange: v => set('cyan', v) }),
        h(RenkKutu, { label: 'PEMBE', renk: p.pink, onChange: v => set('pink', v) })
      )
    ),
    h(Bolum, { baslik: 'ARKA PLAN RENKLERİ' },
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
        h(RenkKutu, { label: 'KOYU ARKA PLAN', renk: p.bg_koyu, onChange: v => set('bg_koyu', v) }),
        h(RenkKutu, { label: 'KOYU KART', renk: p.bgCard_koyu, onChange: v => set('bgCard_koyu', v) }),
        h(RenkKutu, { label: 'AÇIK ARKA PLAN', renk: p.bg_acik, onChange: v => set('bg_acik', v) }),
        h(RenkKutu, { label: 'AÇIK KART', renk: p.bgCard_acik, onChange: v => set('bgCard_acik', v) })
      )
    )
  );
};

/* ─── 2. GÖRÜNÜM EFEKTLERİ ─── */
const EfektTab = ({ config, setConfig }) => {
  const e = config.efekt;
  const set = (k, v) => setConfig(prev => ({ ...prev, efekt: { ...prev.efekt, [k]: v } }));

  return h('div', null,
    h(Bolum, { baslik: 'GÖLGE VE KENAR' },
      h(Slider, { label: 'GÖLGE YOĞUNLUĞU', value: e.shadow_yogunluk, min: 0, max: 100, onChange: v => set('shadow_yogunluk', v), unit: '%' }),
      h(Slider, { label: 'KENAR YUVARLAKLIĞI', value: e.border_radius, min: 0, max: 30, onChange: v => set('border_radius', v), unit: 'px' }),
      h(Slider, { label: 'KENAR KALINLIĞI', value: e.border_kalinlik, min: 0, max: 4, onChange: v => set('border_kalinlik', v), unit: 'px' })
    ),
    h(Bolum, { baslik: 'ÖZEL EFEKTLER' },
      h(SecimGrubu, {
        label: 'KABARTMA', value: String(e.kabartma),
        secenekler: [{ key: '0', label: 'DÜZ' }, { key: '1', label: 'HAFİF' }, { key: '2', label: 'BELİRGİN' }, { key: '3', label: '3D' }],
        onChange: v => set('kabartma', Number(v))
      }),
      h(SecimGrubu, {
        label: 'CAM EFEKTİ (GLASSMORPHISM)', value: String(e.cam_efekt),
        secenekler: [{ key: '0', label: 'KAPALI' }, { key: '1', label: 'HAFİF' }, { key: '2', label: 'BELİRGİN' }],
        onChange: v => set('cam_efekt', Number(v))
      })
    ),
    h(Bolum, { baslik: 'ÖNİZLEME' },
      h('div', { style: { display: 'flex', gap: 16, flexWrap: 'wrap' } },
        [0, 1, 2].map(i => h('div', {
          key: i,
          style: {
            width: 140, height: 90, borderRadius: e.border_radius,
            border: e.border_kalinlik + 'px solid ' + MR.C.border,
            background: MR.C.bgCard,
            boxShadow: e.kabartma >= 2
              ? ('0 8px 25px rgba(0,0,0,' + (e.shadow_yogunluk / 200) + '), inset 0 1px 0 rgba(255,255,255,0.15)')
              : ('0 ' + Math.round(e.shadow_yogunluk / 10) + 'px ' + Math.round(e.shadow_yogunluk / 5) + 'px rgba(0,0,0,' + (e.shadow_yogunluk / 300) + ')'),
            backdropFilter: e.cam_efekt > 0 ? ('blur(' + (e.cam_efekt * 8) + 'px)') : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: MR.C.textSec, transition: 'all .3s'
          }
        }, 'KART ' + (i + 1)))
      )
    )
  );
};

/* ─── 3. TİPOGRAFİ ─── */
const TipografiTab = ({ config, setConfig }) => {
  const t = config.tipografi;
  const set = (k, v) => setConfig(prev => ({ ...prev, tipografi: { ...prev.tipografi, [k]: v } }));

  return h('div', null,
    h(Bolum, { baslik: 'YAZI AYARLARI' },
      h(Slider, { label: 'FONT ÖLÇEĞİ', value: t.font_olcek, min: 80, max: 130, onChange: v => set('font_olcek', v), unit: '%', desc: 'TÜM YAZILARIN BOYUTUNU ORANTILAR' }),
      h(Slider, { label: 'FONT AĞIRLIĞI', value: t.font_agirlik, min: 400, max: 900, step: 100, onChange: v => set('font_agirlik', v) }),
      h(Slider, { label: 'SATIR YÜKSEKLİĞİ', value: t.satir_yukseklik, min: 1.0, max: 2.2, step: 0.1, onChange: v => set('satir_yukseklik', v) })
    ),
    h(Bolum, { baslik: 'ÖNİZLEME' },
      h('div', { style: { fontSize: 14 * (t.font_olcek / 100), fontWeight: t.font_agirlik, lineHeight: t.satir_yukseklik, color: MR.C.text } },
        'BU BİR ÖNİZLEME METNİDİR. FONT ÖLÇEĞİ %' + t.font_olcek + ' — AĞIRLIK: ' + t.font_agirlik
      ),
      h('div', { style: { fontSize: 12 * (t.font_olcek / 100), fontWeight: Math.max(400, t.font_agirlik - 200), lineHeight: t.satir_yukseklik, color: MR.C.textSec, marginTop: 8 } },
        'İKİNCİL METİN GÖRÜNÜMÜ — DAHA KÜÇÜK VE SOLUK'
      )
    )
  );
};

/* ─── 4. SAYFA DÜZENİ ─── */
const LayoutTab = ({ config, setConfig }) => {
  const l = config.layout;
  const set = (k, v) => setConfig(prev => ({ ...prev, layout: { ...prev.layout, [k]: v } }));

  return h('div', null,
    h(Bolum, { baslik: 'KART AYARLARI' },
      h(SecimGrubu, {
        label: 'KART BOYUTU', value: l.kart_boyut,
        secenekler: [{ key: 'compact', label: 'KOMPAKT' }, { key: 'normal', label: 'NORMAL' }, { key: 'large', label: 'GENİŞ' }],
        onChange: v => set('kart_boyut', v)
      }),
      h(Slider, { label: 'KART ARALIK', value: l.kart_aralik, min: 8, max: 32, onChange: v => set('kart_aralik', v), unit: 'px' })
    ),
    h(Bolum, { baslik: 'GRİD AYARLARI' },
      h(Slider, { label: 'GRİD SÜTUN SAYISI', value: l.grid_sutun, min: 2, max: 5, onChange: v => set('grid_sutun', v) })
    ),
    h(Bolum, { baslik: 'İKON AYARLARI' },
      h(Slider, { label: 'İKON BOYUTU', value: l.ikon_boyut, min: 14, max: 28, onChange: v => set('ikon_boyut', v), unit: 'px' }),
      h(SecimGrubu, {
        label: 'İKON STİLİ', value: l.ikon_stil,
        secenekler: [{ key: 'normal', label: 'NORMAL' }, { key: 'rounded', label: 'YUVARLAK' }, { key: 'filled', label: 'DOLGULU' }],
        onChange: v => set('ikon_stil', v)
      })
    )
  );
};

/* ─── 5. BUTON STİLLERİ ─── */
const ButonTab = ({ config, setConfig }) => {
  const b = config.buton;
  const set = (k, v) => setConfig(prev => ({ ...prev, buton: { ...prev.buton, [k]: v } }));
  const accent = config.palet.accent || '#1a56db';
  const accentL = config.palet.accentLight || '#3b82f6';

  const btnStilOnizleme = (stil) => {
    if (stil === 'duz') return { background: accent, color: '#fff', border: 'none', boxShadow: 'none' };
    if (stil === 'cam') return { background: accent + 'cc', color: '#fff', border: 'none', boxShadow: '0 8px 32px ' + accent + '44', backdropFilter: 'blur(8px)' };
    if (stil === 'outline') return { background: 'transparent', color: accent, border: '2px solid ' + accent, boxShadow: 'none' };
    if (stil === 'threed') return {
      background: 'linear-gradient(180deg, ' + accentL + ' 0%, ' + accent + ' 100%)',
      color: '#fff', border: 'none',
      boxShadow: '0 6px 20px ' + accent + '55, inset 0 2px 0 rgba(255,255,255,0.3)',
      borderBottom: '3px solid ' + accent
    };
    return {
      background: 'linear-gradient(180deg, ' + accentL + ' 0%, ' + accent + ' 100%)',
      color: '#fff', border: 'none',
      boxShadow: '0 4px 14px ' + accent + '44, inset 0 1px 0 rgba(255,255,255,0.25)',
      borderBottom: '2px solid ' + accent
    };
  };

  return h('div', null,
    h(Bolum, { baslik: 'BUTON GÖRÜNÜMÜ' },
      h(SecimGrubu, {
        label: 'STİL', value: b.stil,
        secenekler: [
          { key: 'gradient', label: 'GRADİENT' }, { key: 'duz', label: 'DÜZ' },
          { key: 'cam', label: 'CAM' }, { key: 'outline', label: 'ÇERÇEVELİ' },
          { key: 'threed', label: '3D' }
        ],
        onChange: v => set('stil', v)
      }),
      h(Slider, { label: 'KENAR YUVARLAKLIĞI', value: b.radius, min: 0, max: 24, onChange: v => set('radius', v), unit: 'px' }),
      h(SecimGrubu, {
        label: 'HOVER EFEKTİ', value: b.hover,
        secenekler: [
          { key: 'lift', label: 'KALDIR' }, { key: 'glow', label: 'IŞILTI' },
          { key: 'press', label: 'BASIN' }, { key: 'none', label: 'YOK' }
        ],
        onChange: v => set('hover', v)
      })
    ),
    h(Bolum, { baslik: 'ÖNİZLEME' },
      h('div', { style: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' } },
        ['gradient', 'duz', 'cam', 'outline', 'threed'].map(s =>
          h('button', {
            key: s,
            style: {
              ...btnStilOnizleme(s), padding: '10px 20px', borderRadius: b.radius,
              fontWeight: 700, fontSize: 12, cursor: 'pointer',
              outline: b.stil === s ? ('3px solid ' + accent + '66') : 'none',
              outlineOffset: 3, transition: 'all .2s'
            },
            onClick: () => set('stil', s)
          }, s.toUpperCase())
        )
      )
    )
  );
};

/* ─── 6. TABLO/SATIR STİLLERİ ─── */
const TabloTab = ({ config, setConfig }) => {
  const t = config.tablo;
  const set = (k, v) => setConfig(prev => ({ ...prev, tablo: { ...prev.tablo, [k]: v } }));

  const ornekVeri = [
    { ad: 'ALİ YILMAZ', durum: 'AKTİF', tutar: '₺15.400' },
    { ad: 'AYŞE KAYA', durum: 'BEKLİYOR', tutar: '₺8.200' },
    { ad: 'MEHMET DEMİR', durum: 'AKTİF', tutar: '₺22.750' },
    { ad: 'FATMA ÇELİK', durum: 'KAPALI', tutar: '₺3.100' }
  ];

  return h('div', null,
    h(Bolum, { baslik: 'TABLO AYARLARI' },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 } },
        h('label', { style: { fontSize: 12, fontWeight: 700, color: MR.C.textSec, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 } },
          h('input', { type: 'checkbox', checked: t.zebra, onChange: e => set('zebra', e.target.checked), style: { accentColor: MR.C.accent } }),
          'ZEBRA SATIRLAR'
        )
      ),
      h(RenkKutu, { label: 'ZEBRA RENK', renk: t.zebra_renk, onChange: v => set('zebra_renk', v) }),
      h(RenkKutu, { label: 'BAŞLIK RENK (KOYU)', renk: t.header_renk, onChange: v => set('header_renk', v) }),
      h(RenkKutu, { label: 'BAŞLIK RENK (AÇIK)', renk: t.header_renk_acik, onChange: v => set('header_renk_acik', v) }),
      h(RenkKutu, { label: 'HOVER RENK (KOYU)', renk: t.hover_renk, onChange: v => set('hover_renk', v) }),
      h(RenkKutu, { label: 'HOVER RENK (AÇIK)', renk: t.hover_renk_acik, onChange: v => set('hover_renk_acik', v) }),
      h(SecimGrubu, {
        label: 'KENAR STİLİ', value: t.border_stili,
        secenekler: [
          { key: 'solid', label: 'DÜZ' }, { key: 'dashed', label: 'KESİKLİ' },
          { key: 'dotted', label: 'NOKTALI' }, { key: 'none', label: 'YOK' }
        ],
        onChange: v => set('border_stili', v)
      }),
      h(Slider, { label: 'SATIR YÜKSEKLİĞİ', value: t.satir_yukseklik, min: 32, max: 64, onChange: v => set('satir_yukseklik', v), unit: 'px' })
    ),
    h(Bolum, { baslik: 'ÖNİZLEME' },
      h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12 } },
        h('thead', null,
          h('tr', null,
            ['AD SOYAD', 'DURUM', 'TUTAR'].map(th =>
              h('th', {
                key: th,
                style: {
                  padding: '10px 14px', textAlign: 'left', fontWeight: 800,
                  background: MR.tema === 'koyu' ? t.header_renk : t.header_renk_acik,
                  color: MR.C.text, borderBottom: '2px solid ' + MR.C.border, fontSize: 11
                }
              }, th)
            )
          )
        ),
        h('tbody', null,
          ornekVeri.map((row, i) =>
            h('tr', {
              key: i,
              style: {
                height: t.satir_yukseklik,
                background: t.zebra && i % 2 === 1 ? t.zebra_renk : 'transparent',
                borderBottom: t.border_stili === 'none' ? 'none' : ('1px ' + t.border_stili + ' ' + MR.C.border),
                transition: 'background .15s'
              }
            },
              h('td', { style: { padding: '8px 14px', color: MR.C.text, fontWeight: 600 } }, row.ad),
              h('td', { style: { padding: '8px 14px' } },
                h('span', { style: { padding: '3px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: row.durum === 'AKTİF' ? '#10b98120' : row.durum === 'BEKLİYOR' ? '#f59e0b20' : '#ef444420', color: row.durum === 'AKTİF' ? '#10b981' : row.durum === 'BEKLİYOR' ? '#f59e0b' : '#ef4444' } }, row.durum)
              ),
              h('td', { style: { padding: '8px 14px', color: MR.C.text, fontWeight: 700 } }, row.tutar)
            )
          )
        )
      )
    )
  );
};

/* ─── 7. MENÜ/NAVİGASYON ─── */
const NavigasyonTab = ({ config, setConfig }) => {
  const n = config.navigasyon;
  const set = (k, v) => setConfig(prev => ({ ...prev, navigasyon: { ...prev.navigasyon, [k]: v } }));

  return h('div', null,
    h(Bolum, { baslik: 'BAŞLIK ÇUBUĞU' },
      h(RenkKutu, { label: 'BAŞLIK ARKA PLAN', renk: n.header_bg, onChange: v => set('header_bg', v) }),
      h(Slider, { label: 'BULANIKLIK (BLUR)', value: n.header_blur, min: 0, max: 30, onChange: v => set('header_blur', v), unit: 'px' }),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 } },
        h('label', { style: { fontSize: 12, fontWeight: 700, color: MR.C.textSec, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 } },
          h('input', { type: 'checkbox', checked: n.header_border, onChange: e => set('header_border', e.target.checked), style: { accentColor: MR.C.accent } }),
          'ALT ÇİZGİ GÖSTER'
        )
      )
    ),
    h(Bolum, { baslik: 'MENÜ AYARLARI' },
      h(Slider, { label: 'MENÜ FONT BOYUTU', value: n.menu_font_boyut, min: 10, max: 16, onChange: v => set('menu_font_boyut', v), unit: 'px' }),
      h(SecimGrubu, {
        label: 'HOVER STİLİ', value: n.menu_hover_stil,
        secenekler: [
          { key: 'bg', label: 'ARKA PLAN' }, { key: 'underline', label: 'ALT ÇİZGİ' },
          { key: 'scale', label: 'BÜYÜT' }, { key: 'glow', label: 'IŞILTI' }
        ],
        onChange: v => set('menu_hover_stil', v)
      }),
      h(RenkKutu, { label: 'AKTİF MENÜ RENGİ', renk: n.aktif_renk, onChange: v => set('aktif_renk', v) }),
      h(SecimGrubu, {
        label: 'DROPDOWN ANİMASYON', value: n.dropdown_animasyon,
        secenekler: [
          { key: 'fadeIn', label: 'SOL' }, { key: 'slideDown', label: 'KAYDIR' },
          { key: 'scaleIn', label: 'BÜYÜT' }, { key: 'none', label: 'YOK' }
        ],
        onChange: v => set('dropdown_animasyon', v)
      })
    ),
    h(Bolum, { baslik: 'ÖNİZLEME' },
      h('div', {
        style: {
          background: n.header_bg, backdropFilter: 'blur(' + n.header_blur + 'px)',
          borderRadius: 10, padding: '12px 18px',
          borderBottom: n.header_border ? ('2px solid ' + MR.C.border) : 'none',
          display: 'flex', gap: 16, alignItems: 'center'
        }
      },
        ['ANA SAYFA', 'DOSYALAR', 'POLİÇELER', 'SİSTEM'].map((m, i) =>
          h('span', {
            key: m,
            style: {
              fontSize: n.menu_font_boyut, fontWeight: i === 0 ? 800 : 600,
              color: i === 0 ? n.aktif_renk : MR.C.textSec,
              cursor: 'pointer', padding: '4px 8px', borderRadius: 6,
              borderBottom: n.menu_hover_stil === 'underline' && i === 0 ? ('2px solid ' + n.aktif_renk) : 'none',
              background: n.menu_hover_stil === 'bg' && i === 0 ? (n.aktif_renk + '20') : 'transparent',
              transition: 'all .2s'
            }
          }, m)
        )
      )
    )
  );
};

/* ─── 8. INPUT/FORM STİLLERİ ─── */
const InputTab = ({ config, setConfig }) => {
  const inp = config.input;
  const set = (k, v) => setConfig(prev => ({ ...prev, input: { ...prev.input, [k]: v } }));

  const inputStilOlustur = (stil) => {
    const base = {
      width: '100%', padding: '10px 14px', fontSize: 13, fontWeight: 600,
      color: MR.C.text, background: MR.C.bgInput, outline: 'none',
      boxSizing: 'border-box', borderRadius: inp.border_radius, transition: 'all .2s'
    };
    if (stil === 'underline') return { ...base, border: 'none', borderBottom: '2px solid ' + MR.C.border, borderRadius: 0, background: 'transparent' };
    if (stil === 'filled') return { ...base, border: 'none', background: MR.C.bgHover || MR.C.border + '40' };
    return { ...base, border: '1px solid ' + MR.C.border };
  };

  return h('div', null,
    h(Bolum, { baslik: 'INPUT GÖRÜNÜMÜ' },
      h(SecimGrubu, {
        label: 'STİL', value: inp.stil,
        secenekler: [
          { key: 'normal', label: 'NORMAL' }, { key: 'underline', label: 'ALT ÇİZGİ' },
          { key: 'filled', label: 'DOLGULU' }
        ],
        onChange: v => set('stil', v)
      }),
      h(SecimGrubu, {
        label: 'FOCUS EFEKTİ', value: inp.focus_efekt,
        secenekler: [
          { key: 'glow', label: 'IŞILTI' }, { key: 'border', label: 'KENAR' },
          { key: 'shadow', label: 'GÖLGE' }, { key: 'none', label: 'YOK' }
        ],
        onChange: v => set('focus_efekt', v)
      }),
      h(RenkKutu, { label: 'FOCUS RENGİ', renk: inp.focus_renk, onChange: v => set('focus_renk', v) }),
      h(RenkKutu, { label: 'PLACEHOLDER RENGİ', renk: inp.placeholder_renk, onChange: v => set('placeholder_renk', v) }),
      h(Slider, { label: 'KENAR YUVARLAKLIĞI', value: inp.border_radius, min: 0, max: 16, onChange: v => set('border_radius', v), unit: 'px' })
    ),
    h(Bolum, { baslik: 'ÖNİZLEME' },
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        h('input', {
          type: 'text', placeholder: 'NORMAL INPUT ÖRNEĞİ...',
          style: inputStilOlustur(inp.stil),
          readOnly: true
        }),
        h('input', {
          type: 'text', value: 'AKTİF INPUT ÖRNEĞİ',
          style: {
            ...inputStilOlustur(inp.stil),
            borderColor: inp.focus_efekt !== 'none' ? inp.focus_renk : undefined,
            boxShadow: inp.focus_efekt === 'glow' ? ('0 0 0 3px ' + inp.focus_renk + '30') : inp.focus_efekt === 'shadow' ? ('0 4px 12px ' + inp.focus_renk + '25') : 'none'
          },
          readOnly: true
        }),
        h('select', {
          style: { ...inputStilOlustur(inp.stil), cursor: 'pointer' }
        }, h('option', null, 'SELECT ÖRNEĞİ'))
      )
    )
  );
};

/* ─── 9. BADGE/ETİKET ─── */
const BadgeTab = ({ config, setConfig }) => {
  const b = config.badge;
  const set = (k, v) => setConfig(prev => ({ ...prev, badge: { ...prev.badge, [k]: v } }));

  const badgeStil = (renk) => {
    const boyutMap = { small: { p: '2px 8px', fs: 9 }, normal: { p: '4px 12px', fs: 11 }, large: { p: '6px 16px', fs: 13 } };
    const bm = boyutMap[b.boyut] || boyutMap.normal;
    const sekilMap = { pill: 9999, rounded: 8, square: 4 };
    const base = { padding: bm.p, borderRadius: sekilMap[b.sekil] || 9999, fontSize: bm.fs, fontWeight: 700, display: 'inline-block', transition: 'all .2s' };
    if (b.stil === 'solid') return { ...base, background: renk, color: '#fff' };
    if (b.stil === 'outline') return { ...base, background: 'transparent', color: renk, border: '2px solid ' + renk };
    return { ...base, background: renk + '20', color: renk };
  };

  return h('div', null,
    h(Bolum, { baslik: 'BADGE AYARLARI' },
      h(SecimGrubu, {
        label: 'ŞEKİL', value: b.sekil,
        secenekler: [{ key: 'pill', label: 'YUVARLAK' }, { key: 'rounded', label: 'OVAL' }, { key: 'square', label: 'KARE' }],
        onChange: v => set('sekil', v)
      }),
      h(SecimGrubu, {
        label: 'BOYUT', value: b.boyut,
        secenekler: [{ key: 'small', label: 'KÜÇÜK' }, { key: 'normal', label: 'NORMAL' }, { key: 'large', label: 'BÜYÜK' }],
        onChange: v => set('boyut', v)
      }),
      h(SecimGrubu, {
        label: 'STİL', value: b.stil,
        secenekler: [{ key: 'soft', label: 'YUMUŞAK' }, { key: 'solid', label: 'DOLU' }, { key: 'outline', label: 'ÇERÇEVELİ' }],
        onChange: v => set('stil', v)
      })
    ),
    h(Bolum, { baslik: 'ÖNİZLEME' },
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 10 } },
        [
          { label: 'AKTİF', renk: config.palet.success },
          { label: 'BEKLİYOR', renk: config.palet.warning },
          { label: 'İPTAL', renk: config.palet.danger },
          { label: 'YENİ', renk: config.palet.accent },
          { label: 'ÖNCELİKLİ', renk: config.palet.purple },
          { label: 'BİLGİ', renk: config.palet.cyan }
        ].map(bd => h('span', { key: bd.label, style: badgeStil(bd.renk) }, bd.label))
      )
    )
  );
};

/* ─── 10. ANİMASYON ─── */
const AnimasyonTab = ({ config, setConfig }) => {
  const a = config.animasyon;
  const set = (k, v) => setConfig(prev => ({ ...prev, animasyon: { ...prev.animasyon, [k]: v } }));
  const [demoKey, setDemoKey] = useState(0);

  const replay = () => setDemoKey(k => k + 1);

  return h('div', null,
    h(Bolum, { baslik: 'GENEL ANİMASYON' },
      h(SecimGrubu, {
        label: 'GEÇİŞ HIZI', value: a.gecis_hizi,
        secenekler: [
          { key: 'yok', label: 'YOK' }, { key: 'hizli', label: 'HIZLI' },
          { key: 'normal', label: 'NORMAL' }, { key: 'yavas', label: 'YAVAŞ' }
        ],
        onChange: v => set('gecis_hizi', v)
      })
    ),
    h(Bolum, { baslik: 'SAYFA GEÇİŞ ANİMASYONU' },
      h(SecimGrubu, {
        label: 'TİP', value: a.sayfa_gecis,
        secenekler: [
          { key: 'fadeIn', label: 'FADE IN' }, { key: 'fadeInUp', label: 'FADE YUKARI' },
          { key: 'slideInUp', label: 'KAYDIR YUKARI' }, { key: 'slideInLeft', label: 'KAYDIR SOL' }
        ],
        onChange: v => set('sayfa_gecis', v)
      }),
      h('div', { style: { marginTop: 8 } },
        h(SecimGrubu, {
          label: '', value: a.sayfa_gecis,
          secenekler: [
            { key: 'zoomIn', label: 'ZOOM' }, { key: 'bounceIn', label: 'BOUNCE' },
            { key: 'flipInX', label: 'FLİP X' }, { key: 'flipInY', label: 'FLİP Y' }
          ],
          onChange: v => set('sayfa_gecis', v)
        })
      )
    ),
    h(Bolum, { baslik: 'KART ANİMASYONU' },
      h(SecimGrubu, {
        label: 'KART GİRİŞ', value: a.kart_animasyon,
        secenekler: [
          { key: 'cardEntrance', label: 'KAYARAK' }, { key: 'fadeIn', label: 'FADE' },
          { key: 'bounceIn', label: 'BOUNCE' }, { key: 'none', label: 'YOK' }
        ],
        onChange: v => set('kart_animasyon', v)
      }),
      h(SecimGrubu, {
        label: 'HOVER', value: a.hover_animasyon,
        secenekler: [
          { key: 'lift', label: 'KALDIR' }, { key: 'grow', label: 'BÜYÜT' },
          { key: 'glow', label: 'IŞILTI' }, { key: 'none', label: 'YOK' }
        ],
        onChange: v => set('hover_animasyon', v)
      })
    ),
    h(Bolum, { baslik: 'GİRİŞ EKRANI' },
      h(SecimGrubu, {
        label: 'GİRİŞ ANİMASYONU', value: a.giris_animasyon,
        secenekler: [
          { key: 'loginSlideIn', label: 'KAYDIR' }, { key: 'bounceIn', label: 'BOUNCE' },
          { key: 'zoomIn', label: 'ZOOM' }, { key: 'flipInX', label: 'FLİP' }
        ],
        onChange: v => set('giris_animasyon', v)
      })
    ),
    h(Bolum, { baslik: 'DİĞER' },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 } },
        h('label', { style: { fontSize: 12, fontWeight: 700, color: MR.C.textSec, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 } },
          h('input', { type: 'checkbox', checked: a.liste_stagger, onChange: e => set('liste_stagger', e.target.checked), style: { accentColor: MR.C.accent } }),
          'LİSTE ÖĞELERİ SIRALI ANİMASYON'
        )
      ),
      h(SecimGrubu, {
        label: 'YÜKLEME STİLİ', value: a.loading_stil,
        secenekler: [
          { key: 'pulse', label: 'NABIZ' }, { key: 'spin', label: 'DÖNER' },
          { key: 'dots', label: 'NOKTALAR' }, { key: 'bar', label: 'ÇUBUK' }
        ],
        onChange: v => set('loading_stil', v)
      })
    ),
    h(Bolum, { baslik: 'ÖNİZLEME' },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 } },
        h('span', { style: { fontSize: 12, fontWeight: 700, color: MR.C.textSec } }, 'ANİMASYONLARI TEST ET'),
        h('button', {
          style: { ...MR.S.btn, ...MR.S.btnP, fontSize: 11, padding: '6px 14px' },
          onClick: replay
        }, h(LIcon, { name: 'RotateCw', size: 14, color: '#fff' }), ' TEKRAR OYNAT')
      ),
      h('div', { key: demoKey, style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 } },
        ['KART 1', 'KART 2', 'KART 3'].map((txt, i) => h('div', {
          key: i,
          className: a.gecis_hizi !== 'yok' ? 'card-entrance' : '',
          style: {
            background: MR.C.bgCard, border: '1px solid ' + MR.C.border, borderRadius: 12,
            padding: 18, textAlign: 'center', fontSize: 12, fontWeight: 700, color: MR.C.textSec,
            animationDelay: a.liste_stagger ? (i * 0.1 + 's') : '0s'
          }
        }, txt))
      )
    )
  );
};

/* ─── 11. SCROLLBAR ─── */
const ScrollbarTab = ({ config, setConfig }) => {
  const s = config.scrollbar;
  const set = (k, v) => setConfig(prev => ({ ...prev, scrollbar: { ...prev.scrollbar, [k]: v } }));

  return h('div', null,
    h(Bolum, { baslik: 'SCROLLBAR AYARLARI' },
      h(Slider, { label: 'GENİŞLİK', value: s.genislik, min: 2, max: 16, onChange: v => set('genislik', v), unit: 'px' }),
      h(RenkKutu, { label: 'SCROLLBAR RENGİ', renk: s.renk, onChange: v => set('renk', v) }),
      h(RenkKutu, { label: 'HOVER RENGİ', renk: s.hover_renk, onChange: v => set('hover_renk', v) }),
      h(RenkKutu, { label: 'İZ RENGİ (TRACK)', renk: s.track_renk, onChange: v => set('track_renk', v) }),
      h(Slider, { label: 'KENAR YUVARLAKLIĞI', value: s.radius, min: 0, max: 10, onChange: v => set('radius', v), unit: 'px' })
    ),
    h(Bolum, { baslik: 'ÖNİZLEME' },
      h('div', {
        style: {
          height: 120, overflowY: 'auto', background: MR.C.bgInput, borderRadius: 8,
          padding: 12, border: '1px solid ' + MR.C.border
        }
      },
        Array.from({ length: 20 }, (_, i) => h('div', {
          key: i,
          style: { padding: '6px 0', fontSize: 12, color: MR.C.textSec, borderBottom: '1px solid ' + MR.C.border + '40' }
        }, 'ÖRNEK SATIR ' + (i + 1)))
      )
    )
  );
};

/* ─── 12. CANLI ÖNİZLEME ─── */
const OnizlemeTab = ({ config }) => {
  const p = config.palet;
  const e = config.efekt;
  const b = config.buton;
  const t = config.tablo;
  const a = config.animasyon;
  const [animKey, setAnimKey] = useState(0);

  const kartStil = {
    background: MR.tema === 'koyu' ? (p.bgCard_koyu || MR.C.bgCard) : (p.bgCard_acik || MR.C.bgCard),
    borderRadius: e.border_radius, border: e.border_kalinlik + 'px solid ' + MR.C.border,
    padding: 18, boxShadow: '0 ' + Math.round(e.shadow_yogunluk / 10) + 'px ' + Math.round(e.shadow_yogunluk / 5) + 'px rgba(0,0,0,' + (e.shadow_yogunluk / 300) + ')',
    transition: 'all .3s'
  };

  return h('div', null,
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } },
      h('div', { style: { fontSize: 13, fontWeight: 800, color: MR.C.text } }, 'CANLI ÖNİZLEME — TÜM AYARLAR'),
      h('button', {
        style: { ...MR.S.btn, ...MR.S.btnP, fontSize: 11, padding: '6px 14px' },
        onClick: () => setAnimKey(k => k + 1)
      }, h(LIcon, { name: 'RotateCw', size: 14, color: '#fff' }), ' YENİLE')
    ),

    h('div', { key: animKey },
      /* RENK PALETİ */
      h(Bolum, { baslik: 'RENK PALETİ' },
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
          [
            { c: p.accent, n: 'ACCENT' }, { c: p.accentLight, n: 'ACCENT L' },
            { c: p.success, n: 'BAŞARILI' }, { c: p.warning, n: 'UYARI' },
            { c: p.danger, n: 'TEHLİKE' }, { c: p.purple, n: 'MOR' },
            { c: p.cyan, n: 'CAM GÖBEĞİ' }, { c: p.pink, n: 'PEMBE' }
          ].map(item => h('div', {
            key: item.n,
            style: { textAlign: 'center' }
          },
            h('div', { style: { width: 40, height: 40, borderRadius: 8, background: item.c, marginBottom: 4, boxShadow: '0 2px 8px ' + item.c + '44' } }),
            h('div', { style: { fontSize: 8, fontWeight: 700, color: MR.C.textMuted } }, item.n)
          ))
        )
      ),

      /* KART ÖNİZLEME */
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 } },
        [{ n: 'DOSYALAR', v: '1.248', c: p.accent }, { n: 'POLİÇELER', v: '856', c: p.success }, { n: 'ÖDEMELER', v: '₺2.4M', c: p.warning }].map(s =>
          h('div', { key: s.n, className: 'card-entrance', style: { ...kartStil, textAlign: 'center' } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: s.c } }, s.v),
            h('div', { style: { fontSize: 10, fontWeight: 700, color: MR.C.textMuted, marginTop: 4 } }, s.n)
          )
        )
      ),

      /* BUTON ÖNİZLEME */
      h(Bolum, { baslik: 'BUTONLAR' },
        h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
          h('button', { style: { ...MR.S.btn, ...MR.S.btnP, fontSize: 12, padding: '8px 18px' } }, 'PRIMARY'),
          h('button', { style: { ...MR.S.btn, ...MR.S.btnW, fontSize: 12, padding: '8px 18px' } }, 'WARNING'),
          h('button', { style: { ...MR.S.btn, ...MR.S.btnD, fontSize: 12, padding: '8px 18px' } }, 'DANGER'),
          h('button', { style: { ...MR.S.btn, ...MR.S.btnG, fontSize: 12, padding: '8px 18px' } }, 'GHOST')
        )
      ),

      /* MİNİ TABLO */
      h(Bolum, { baslik: 'TABLO' },
        h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11 } },
          h('thead', null,
            h('tr', null,
              ['#', 'DOSYA', 'DURUM', 'TUTAR'].map(th =>
                h('th', {
                  key: th,
                  style: {
                    padding: '8px 10px', textAlign: 'left', fontWeight: 800, fontSize: 10,
                    background: MR.tema === 'koyu' ? t.header_renk : t.header_renk_acik,
                    color: MR.C.text, borderBottom: '2px solid ' + MR.C.border
                  }
                }, th)
              )
            )
          ),
          h('tbody', null,
            [
              { id: '001', dosya: 'HASAR-2024-001', durum: 'AKTİF', tutar: '₺15.400' },
              { id: '002', dosya: 'HASAR-2024-002', durum: 'BEKLİYOR', tutar: '₺8.200' }
            ].map((row, i) =>
              h('tr', {
                key: i,
                style: {
                  background: t.zebra && i % 2 === 1 ? t.zebra_renk : 'transparent',
                  borderBottom: '1px solid ' + MR.C.border, height: t.satir_yukseklik
                }
              },
                h('td', { style: { padding: '6px 10px', color: MR.C.textMuted, fontWeight: 600 } }, row.id),
                h('td', { style: { padding: '6px 10px', color: MR.C.text, fontWeight: 700 } }, row.dosya),
                h('td', { style: { padding: '6px 10px' } },
                  h('span', { style: { padding: '2px 8px', borderRadius: 9999, fontSize: 9, fontWeight: 700, background: row.durum === 'AKTİF' ? p.success + '20' : p.warning + '20', color: row.durum === 'AKTİF' ? p.success : p.warning } }, row.durum)
                ),
                h('td', { style: { padding: '6px 10px', color: MR.C.text, fontWeight: 700 } }, row.tutar)
              )
            )
          )
        )
      )
    )
  );
};

/* ═══════ ANA BİLEŞEN ═══════ */
const SEKMELER = [
  { key: 'palet', label: 'RENK PALETİ', icon: 'Palette' },
  { key: 'efekt', label: 'GÖRÜNÜM', icon: 'Sparkles' },
  { key: 'tipografi', label: 'TİPOGRAFİ', icon: 'Type' },
  { key: 'layout', label: 'DÜZEN', icon: 'LayoutGrid' },
  { key: 'buton', label: 'BUTONLAR', icon: 'MousePointer' },
  { key: 'tablo', label: 'TABLO', icon: 'Table' },
  { key: 'navigasyon', label: 'MENÜ', icon: 'Navigation' },
  { key: 'input', label: 'INPUT', icon: 'TextCursorInput' },
  { key: 'badge', label: 'BADGE', icon: 'Tag' },
  { key: 'animasyon', label: 'ANİMASYON', icon: 'Zap' },
  { key: 'scrollbar', label: 'SCROLLBAR', icon: 'ArrowUpDown' },
  { key: 'onizleme', label: 'ÖNİZLEME', icon: 'Eye' }
];

const TemaAyarlariTab = () => {
  const [config, setConfig] = useState(deepClone(VARSAYILAN));
  const [aktifSekme, setAktifSekme] = useState('palet');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [mesaj, setMesaj] = useState(null);

  /* ─── SUNUCUDAN YÜKLE — PERSİSTANCE FIX ─── */
  useEffect(() => {
    (async () => {
      try {
        const r = await MR.api.ayarlarList();
        if (r?.success && Array.isArray(r.data)) {
          const row = r.data.find(a => a.anahtar === 'tema_config');
          if (row && row.deger) {
            let saved;
            try { saved = typeof row.deger === 'string' ? JSON.parse(row.deger) : row.deger; } catch (e) { saved = null; }
            if (saved && typeof saved === 'object') {
              /* PERSISTENCE FIX: saved config is PRIMARY, defaults fill ONLY missing sections */
              const merged = deepMerge(VARSAYILAN, saved);
              setConfig(merged);
              setLoaded(true);
              return;
            }
          }
        }
      } catch (e) { /* ignore */ }
      setLoaded(true);
    })();
  }, []);

  /* ─── KAYDET ─── */
  const kaydet = useCallback(async () => {
    setSaving(true);
    setMesaj(null);
    try {
      const r = await MR.api.ayarlarGuncelle({ anahtar: 'tema_config', deger: JSON.stringify(config) });
      if (r?.success) {
        MR._temaConfig = config;
        MR._temaConfigUygula(config);
        setMesaj({ tip: 'ok', text: 'TEMA AYARLARI KAYDEDİLDİ!' });
      } else {
        setMesaj({ tip: 'hata', text: 'KAYDETME HATASI: ' + (r?.error || 'BİLİNMEYEN HATA') });
      }
    } catch (e) {
      setMesaj({ tip: 'hata', text: 'BAĞLANTI HATASI' });
    }
    setSaving(false);
  }, [config]);

  /* ─── SIFIRLA ─── */
  const sifirla = useCallback(() => {
    setConfig(deepClone(VARSAYILAN));
    setMesaj({ tip: 'ok', text: 'VARSAYILANLARA SIFIRLANDI — KAYDETMEYI UNUTMAYIN!' });
  }, []);

  /* ─── SEKME İÇERİĞİ ─── */
  const renderSekme = () => {
    const props = { config, setConfig };
    switch (aktifSekme) {
      case 'palet': return h(PaletTab, props);
      case 'efekt': return h(EfektTab, props);
      case 'tipografi': return h(TipografiTab, props);
      case 'layout': return h(LayoutTab, props);
      case 'buton': return h(ButonTab, props);
      case 'tablo': return h(TabloTab, props);
      case 'navigasyon': return h(NavigasyonTab, props);
      case 'input': return h(InputTab, props);
      case 'badge': return h(BadgeTab, props);
      case 'animasyon': return h(AnimasyonTab, props);
      case 'scrollbar': return h(ScrollbarTab, props);
      case 'onizleme': return h(OnizlemeTab, { config });
      default: return null;
    }
  };

  const C = MR.C;
  const S = MR.S;

  return h('div', null,
    /* SEKME NAVİGASYONU */
    h('div', {
      style: {
        display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 18,
        background: C.bgCard, padding: 8, borderRadius: 12, border: '1px solid ' + C.border
      }
    },
      SEKMELER.map(s => h('button', {
        key: s.key,
        style: {
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
          borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
          background: aktifSekme === s.key ? C.accent : 'transparent',
          color: aktifSekme === s.key ? '#fff' : C.textSec,
          transition: 'all .2s',
          boxShadow: aktifSekme === s.key ? ('0 2px 8px ' + C.accent + '44') : 'none'
        },
        onClick: () => setAktifSekme(s.key)
      },
        h(LIcon, { name: s.icon, size: 14, color: aktifSekme === s.key ? '#fff' : C.textMuted }),
        s.label
      ))
    ),

    /* SEKME İÇERİĞİ */
    h('div', { className: 'fade-in', key: aktifSekme },
      renderSekme()
    ),

    /* MESAJ */
    mesaj && h('div', {
      className: 'fade-in',
      style: {
        marginTop: 16, padding: '12px 18px', borderRadius: 10,
        background: mesaj.tip === 'ok' ? (C.success || '#10b981') + '20' : (C.danger || '#ef4444') + '20',
        color: mesaj.tip === 'ok' ? (C.success || '#10b981') : (C.danger || '#ef4444'),
        fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8
      }
    },
      h(LIcon, { name: mesaj.tip === 'ok' ? 'CheckCircle' : 'AlertCircle', size: 16, color: mesaj.tip === 'ok' ? C.success : C.danger }),
      mesaj.text
    ),

    /* ALT BUTONLAR */
    h('div', {
      style: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20, paddingTop: 16, borderTop: '1px solid ' + C.border }
    },
      h('button', {
        style: { ...S.btn, ...S.btnG, fontSize: 13, padding: '10px 24px' },
        onClick: sifirla
      },
        h(LIcon, { name: 'RotateCcw', size: 15, color: C.textSec }),
        'SIFIRLA'
      ),
      h('button', {
        style: { ...S.btn, ...S.btnP, fontSize: 13, padding: '10px 28px', fontWeight: 800, opacity: saving ? 0.7 : 1 },
        onClick: kaydet,
        disabled: saving
      },
        h(LIcon, { name: 'Save', size: 15, color: '#fff' }),
        saving ? 'KAYDEDİLİYOR...' : 'AYARLARI KAYDET'
      )
    )
  );
};

/* GLOBAL'E ATA */
MR.TemaAyarlariTab = TemaAyarlariTab;

})();
