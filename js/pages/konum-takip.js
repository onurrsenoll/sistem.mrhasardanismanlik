/**
 * MR HASAR DANIŞMANLIK - KONUM TAKİP SAYFASI
 * SADECE ADMİN ERİŞİMLİ - LEAFLET HARİTA + KULLANICI KONUM İZLEME
 */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useRef, useCallback, useMemo} = React;

/* ═══ YARDIMCI FONKSİYONLAR ═══ */
const fmtZaman = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('tr-TR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
};

const fmtSure = (iso) => {
  if (!iso) return 'BİLİNMİYOR';
  const fark = Date.now() - new Date(iso).getTime();
  if (fark < 0) return 'AZ ÖNCE';
  const dk = Math.floor(fark / 60000);
  if (dk < 1) return 'AZ ÖNCE';
  if (dk < 60) return dk + ' DK ÖNCE';
  const saat = Math.floor(dk / 60);
  if (saat < 24) return saat + ' SAAT ÖNCE';
  const gun = Math.floor(saat / 24);
  return gun + ' GÜN ÖNCE';
};

const durumRenk = (iso) => {
  if (!iso) return {renk: '#64748b', label: 'OFFLINE', dot: '🔴'};
  const fark = Date.now() - new Date(iso).getTime();
  const dk = fark / 60000;
  if (dk <= 5) return {renk: '#10b981', label: 'ONLINE', dot: '🟢'};
  if (dk <= 30) return {renk: '#f59e0b', label: 'UZAKTA', dot: '🟡'};
  return {renk: '#64748b', label: 'OFFLINE', dot: '🔴'};
};

const ROL_LABELS = {
  admin: 'SİSTEM YÖNETİCİSİ',
  avukat: 'AVUKAT',
  uzman: 'UZMAN',
  personel: 'PERSONEL',
  muhasebe: 'MUHASEBE',
  portal: 'PORTAL'
};

const ROL_RENKLER = {
  admin: '#1a56db',
  avukat: '#8b5cf6',
  uzman: '#3b82f6',
  personel: '#06b6d4',
  muhasebe: '#10b981',
  portal: '#f59e0b'
};

/* ═══ ANA SAYFA BİLEŞENİ ═══ */
MR.KonumTakipPage = ({setPage, user}) => {
  const {C, S, LIcon, api} = MR;
  const isK = MR.tema === 'koyu';

  const [kullanicilar, setKullanicilar] = useState([]);
  const [secili, setSecili] = useState(null);
  const [yukle, setYukle] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sonGuncelleme, setSonGuncelleme] = useState(null);
  const [arama, setArama] = useState('');
  const [rolFiltre, setRolFiltre] = useState('hepsi');
  const [durumFiltre, setDurumFiltre] = useState('hepsi');
  const [gecmisKullanici, setGecmisKullanici] = useState(null);
  const [gecmisTarih, setGecmisTarih] = useState('');
  const [gecmisData, setGecmisData] = useState([]);
  const [gecmisYukle, setGecmisYukle] = useState(false);
  const [tab, setTab] = useState('canli'); /* canli | gecmis */

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const gecmisLayerRef = useRef(null);

  /* ═══ VERİ ÇEKME ═══ */
  const verileriCek = useCallback(async () => {
    try {
      const r = await api.konumListele();
      if (r?.success && r.data) {
        setKullanicilar(Array.isArray(r.data) ? r.data : []);
        setSonGuncelleme(new Date().toISOString());
      }
    } catch(e) {}
    setYukle(false);
  }, [api]);

  useEffect(() => {
    verileriCek();
  }, [verileriCek]);

  /* OTOMATİK YENİLEME - 30 SANİYEDE BİR */
  useEffect(() => {
    if (!autoRefresh) return;
    const iv = setInterval(verileriCek, 30000);
    return () => clearInterval(iv);
  }, [autoRefresh, verileriCek]);

  /* ═══ HARİTA OLUŞTURMA ═══ */
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    if (typeof L === 'undefined') return;

    const map = L.map(mapRef.current, {
      center: [39.0, 35.0],
      zoom: 6,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    /* ATTRIBUTION KÜÇÜK */
    L.control.attribution({position: 'bottomright', prefix: ''}).addTo(map);

    mapInstanceRef.current = map;

    /* 200ms sonra resize et (tab geçişleri için) */
    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [tab]);

  /* ═══ MARKER'LARI GÜNCELLE ═══ */
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || tab !== 'canli') return;

    /* ESKİ MARKER'LARI TEMİZLE */
    Object.values(markersRef.current).forEach(m => map.removeLayer(m));
    markersRef.current = {};

    const bounds = [];

    kullanicilar.forEach(k => {
      if (!k.enlem || !k.boylam) return;
      const lat = parseFloat(k.enlem);
      const lng = parseFloat(k.boylam);
      if (isNaN(lat) || isNaN(lng)) return;

      const durum = durumRenk(k.son_konum_zamani);
      const rol = k.rol || 'personel';
      const rolRenk = ROL_RENKLER[rol] || '#64748b';
      const isim = (k.ad_soyad || 'BİLİNMEYEN').toUpperCase();
      const baslangic = isim.charAt(0);

      /* CUSTOM MARKER ICON */
      const icon = L.divIcon({
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -42],
        html: `<div style="
          width:40px;height:40px;border-radius:50%;
          background:${rolRenk};
          border:3px solid ${durum.renk};
          box-shadow:0 4px 12px rgba(0,0,0,.3),0 0 0 3px ${durum.renk}44;
          display:flex;align-items:center;justify-content:center;
          color:#fff;font-weight:800;font-size:14px;font-family:Manrope,sans-serif;
          position:relative;
        ">
          ${baslangic}
          <div style="
            position:absolute;bottom:-2px;right:-2px;
            width:14px;height:14px;border-radius:50%;
            background:${durum.renk};
            border:2px solid #fff;
          "></div>
        </div>`
      });

      const marker = L.marker([lat, lng], {icon}).addTo(map);

      /* POPUP İÇERİĞİ */
      marker.bindPopup(`
        <div style="font-family:Manrope,sans-serif;min-width:220px;text-transform:uppercase;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
            <div style="width:36px;height:36px;border-radius:50%;background:${rolRenk};
              display:flex;align-items:center;justify-content:center;
              color:#fff;font-weight:800;font-size:14px;">${baslangic}</div>
            <div>
              <div style="font-weight:800;font-size:13px;">${isim}</div>
              <div style="font-size:10px;color:#64748b;">${ROL_LABELS[rol] || rol}</div>
            </div>
          </div>
          <div style="font-size:11px;line-height:2;color:#334155;">
            <div><b>DURUM:</b> <span style="color:${durum.renk};font-weight:700;">${durum.label}</span></div>
            <div><b>SON KONUM:</b> ${fmtZaman(k.son_konum_zamani)}</div>
            <div><b>SÜRE:</b> ${fmtSure(k.son_konum_zamani)}</div>
            <div><b>CİHAZ:</b> ${(k.cihaz_tipi || 'pc').toUpperCase()}</div>
            <div><b>DOĞRULUK:</b> ±${k.dogruluk || '?'}m</div>
            <div style="font-size:9px;color:#94a3b8;margin-top:4px;">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
          </div>
        </div>
      `, {maxWidth: 280});

      markersRef.current[k.id || k.kullanici_id] = marker;
      bounds.push([lat, lng]);
    });

    /* HARİTAYI MARKER'LARA GÖRE ZOOM ET */
    if (bounds.length > 0) {
      map.fitBounds(bounds, {padding: [50, 50], maxZoom: 14});
    }
  }, [kullanicilar, tab]);

  /* ═══ KULLANICIYA ZOOM ═══ */
  const kullaniciyaZoom = (k) => {
    const map = mapInstanceRef.current;
    if (!map || !k.enlem || !k.boylam) return;
    map.setView([parseFloat(k.enlem), parseFloat(k.boylam)], 16, {animate: true});
    const marker = markersRef.current[k.id || k.kullanici_id];
    if (marker) marker.openPopup();
    setSecili(k.id || k.kullanici_id);
  };

  /* ═══ GEÇMİŞ VERİSİ ÇEK ═══ */
  const gecmisiCek = async () => {
    if (!gecmisKullanici || !gecmisTarih) return;
    setGecmisYukle(true);
    try {
      const r = await api.konumGecmisi({kullanici_id: gecmisKullanici, tarih: gecmisTarih});
      if (r?.success && r.data) {
        setGecmisData(Array.isArray(r.data) ? r.data : []);
      } else {
        setGecmisData([]);
      }
    } catch(e) {
      setGecmisData([]);
    }
    setGecmisYukle(false);
  };

  /* GEÇMİŞ ROTASINI HARİTADA GÖSTER */
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || tab !== 'gecmis') return;

    /* ESKİ KATMANI TEMİZLE */
    if (gecmisLayerRef.current) {
      map.removeLayer(gecmisLayerRef.current);
      gecmisLayerRef.current = null;
    }

    if (gecmisData.length === 0) return;

    const group = L.layerGroup();
    const coords = [];

    gecmisData.forEach((p, i) => {
      const lat = parseFloat(p.enlem);
      const lng = parseFloat(p.boylam);
      if (isNaN(lat) || isNaN(lng)) return;
      coords.push([lat, lng]);

      const isFirst = i === 0;
      const isLast = i === gecmisData.length - 1;

      const icon = L.divIcon({
        className: '',
        iconSize: [isFirst || isLast ? 24 : 12, isFirst || isLast ? 24 : 12],
        iconAnchor: [isFirst || isLast ? 12 : 6, isFirst || isLast ? 12 : 6],
        html: `<div style="
          width:${isFirst || isLast ? 24 : 12}px;
          height:${isFirst || isLast ? 24 : 12}px;
          border-radius:50%;
          background:${isFirst ? '#10b981' : isLast ? '#ef4444' : '#3b82f6'};
          border:2px solid #fff;
          box-shadow:0 2px 6px rgba(0,0,0,.3);
          ${isFirst || isLast ? 'display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:800;' : ''}
        ">${isFirst ? 'B' : isLast ? 'S' : ''}</div>`
      });

      const m = L.marker([lat, lng], {icon});
      m.bindPopup(`
        <div style="font-family:Manrope,sans-serif;text-transform:uppercase;font-size:11px;">
          <div style="font-weight:800;margin-bottom:4px;">
            ${isFirst ? '🟢 BAŞLANGIÇ' : isLast ? '🔴 SON KONUM' : '📍 NOKTA ' + (i + 1)}
          </div>
          <div>ZAMAN: ${fmtZaman(p.zaman || p.created_at)}</div>
          <div>DOĞRULUK: ±${p.dogruluk || '?'}m</div>
          <div style="font-size:9px;color:#94a3b8;margin-top:2px;">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
        </div>
      `);
      group.addLayer(m);
    });

    /* ROTA ÇİZGİSİ */
    if (coords.length >= 2) {
      const polyline = L.polyline(coords, {
        color: '#1a56db',
        weight: 3,
        opacity: 0.7,
        dashArray: '8, 6'
      });
      group.addLayer(polyline);
    }

    group.addTo(map);
    gecmisLayerRef.current = group;

    if (coords.length > 0) {
      map.fitBounds(coords, {padding: [50, 50], maxZoom: 16});
    }
  }, [gecmisData, tab]);

  /* ═══ FİLTRELENMİŞ KULLANICI LİSTESİ ═══ */
  const filtrelenmis = useMemo(() => {
    let list = [...kullanicilar];
    if (arama) {
      const q = arama.toLowerCase();
      list = list.filter(k => (k.ad_soyad || '').toLowerCase().includes(q) || (k.rol || '').toLowerCase().includes(q));
    }
    if (rolFiltre !== 'hepsi') {
      list = list.filter(k => k.rol === rolFiltre);
    }
    if (durumFiltre !== 'hepsi') {
      list = list.filter(k => {
        const d = durumRenk(k.son_konum_zamani);
        if (durumFiltre === 'online') return d.label === 'ONLINE';
        if (durumFiltre === 'uzakta') return d.label === 'UZAKTA';
        if (durumFiltre === 'offline') return d.label === 'OFFLINE';
        return true;
      });
    }
    return list;
  }, [kullanicilar, arama, rolFiltre, durumFiltre]);

  /* İSTATİSTİKLER */
  const stats = useMemo(() => {
    let online = 0, uzakta = 0, offline = 0;
    kullanicilar.forEach(k => {
      const d = durumRenk(k.son_konum_zamani);
      if (d.label === 'ONLINE') online++;
      else if (d.label === 'UZAKTA') uzakta++;
      else offline++;
    });
    return {online, uzakta, offline, toplam: kullanicilar.length};
  }, [kullanicilar]);

  /* ═══ RENDER ═══ */
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>

      {/* BAŞLIK */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: C.accentGradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <LIcon name="MapPin" size={22} color="#fff"/>
          </div>
          <div>
            <h2 style={{fontSize: 20, fontWeight: 800, margin: 0}}>KONUM TAKİBİ</h2>
            <div style={{fontSize: 11, color: C.textMuted}}>
              {sonGuncelleme ? 'SON: ' + fmtZaman(sonGuncelleme) : 'YÜKLENİYOR...'}
            </div>
          </div>
        </div>

        {/* İSTATİSTİK KUTULARI */}
        <div style={{display: 'flex', gap: 8}}>
          <div style={{padding: '8px 16px', borderRadius: 8, background: '#10b98118', textAlign: 'center'}}>
            <div style={{fontSize: 18, fontWeight: 800, color: '#10b981'}}>{stats.online}</div>
            <div style={{fontSize: 9, fontWeight: 700, color: '#10b981'}}>ONLINE</div>
          </div>
          <div style={{padding: '8px 16px', borderRadius: 8, background: '#f59e0b18', textAlign: 'center'}}>
            <div style={{fontSize: 18, fontWeight: 800, color: '#f59e0b'}}>{stats.uzakta}</div>
            <div style={{fontSize: 9, fontWeight: 700, color: '#f59e0b'}}>UZAKTA</div>
          </div>
          <div style={{padding: '8px 16px', borderRadius: 8, background: '#64748b18', textAlign: 'center'}}>
            <div style={{fontSize: 18, fontWeight: 800, color: '#64748b'}}>{stats.offline}</div>
            <div style={{fontSize: 9, fontWeight: 700, color: '#64748b'}}>OFFLINE</div>
          </div>
          <div style={{padding: '8px 16px', borderRadius: 8, background: `${C.accent}18`, textAlign: 'center'}}>
            <div style={{fontSize: 18, fontWeight: 800, color: C.accent}}>{stats.toplam}</div>
            <div style={{fontSize: 9, fontWeight: 700, color: C.accent}}>TOPLAM</div>
          </div>
        </div>
      </div>

      {/* TAB: CANLI | GEÇMİŞ */}
      <div style={{display: 'flex', gap: 4, background: C.bgHover, padding: 4, borderRadius: 12}}>
        <button onClick={() => setTab('canli')} style={{
          ...S.btn, flex: 1, padding: '10px 20px', borderRadius: 8, fontSize: 13,
          background: tab === 'canli' ? C.bgCard : 'transparent',
          color: tab === 'canli' ? C.accent : C.textSec,
          boxShadow: tab === 'canli' ? C.cardShadow : 'none',
          border: 'none'
        }}>
          <LIcon name="Radio" size={16}/> CANLI TAKİP
        </button>
        <button onClick={() => setTab('gecmis')} style={{
          ...S.btn, flex: 1, padding: '10px 20px', borderRadius: 8, fontSize: 13,
          background: tab === 'gecmis' ? C.bgCard : 'transparent',
          color: tab === 'gecmis' ? C.accent : C.textSec,
          boxShadow: tab === 'gecmis' ? C.cardShadow : 'none',
          border: 'none'
        }}>
          <LIcon name="History" size={16}/> KONUM GEÇMİŞİ
        </button>
      </div>

      {/* ANA İÇERİK */}
      <div style={{display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, minHeight: 600}}>

        {/* SOL PANEL */}
        <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>

          {tab === 'canli' && (
            <>
              {/* ARAMA + FİLTRE */}
              <div style={{...S.card, padding: 12}}>
                <div style={{position: 'relative', marginBottom: 8}}>
                  <LIcon name="Search" size={16} color={C.textMuted} style={{position: 'absolute', left: 12, top: 12}}/>
                  <input
                    value={arama} onChange={e => setArama(e.target.value)}
                    placeholder="KULLANICI ARA..."
                    style={{...S.input, paddingLeft: 36, fontSize: 12}}
                  />
                </div>
                <div style={{display: 'flex', gap: 6}}>
                  <select value={rolFiltre} onChange={e => setRolFiltre(e.target.value)}
                    style={{...S.select, fontSize: 11, padding: '8px 10px'}}>
                    <option value="hepsi">TÜM ROLLER</option>
                    <option value="admin">ADMİN</option>
                    <option value="avukat">AVUKAT</option>
                    <option value="uzman">UZMAN</option>
                    <option value="personel">PERSONEL</option>
                    <option value="muhasebe">MUHASEBE</option>
                  </select>
                  <select value={durumFiltre} onChange={e => setDurumFiltre(e.target.value)}
                    style={{...S.select, fontSize: 11, padding: '8px 10px'}}>
                    <option value="hepsi">TÜM DURUMLAR</option>
                    <option value="online">ONLINE</option>
                    <option value="uzakta">UZAKTA</option>
                    <option value="offline">OFFLINE</option>
                  </select>
                </div>
                {/* OTOMATİK YENİLEME */}
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, padding: '6px 0'}}>
                  <span style={{fontSize: 10, color: C.textMuted, fontWeight: 700}}>OTOMATİK YENİLEME</span>
                  <div onClick={() => setAutoRefresh(!autoRefresh)} style={{
                    width: 40, height: 22, borderRadius: 11, cursor: 'pointer',
                    background: autoRefresh ? C.accent : C.bgHover,
                    padding: 2, transition: 'background .2s', display: 'flex', alignItems: 'center'
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      transition: 'transform .2s',
                      transform: autoRefresh ? 'translateX(18px)' : 'translateX(0)'
                    }}/>
                  </div>
                </div>
              </div>

              {/* KULLANICI LİSTESİ */}
              <div style={{...S.card, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
                <div style={{padding: '12px 16px', borderBottom: `1px solid ${C.border}`, fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8}}>
                  <LIcon name="Users" size={16} color={C.accent}/>
                  KULLANICILAR ({filtrelenmis.length})
                </div>
                <div style={{flex: 1, overflowY: 'auto', padding: 8}}>
                  {yukle ? (
                    <div style={{padding: 20, textAlign: 'center', color: C.textMuted, fontSize: 12}}>
                      <div style={{width: 24, height: 24, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.accent}`, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 8px'}}/>
                      YÜKLENİYOR...
                    </div>
                  ) : filtrelenmis.length === 0 ? (
                    <div style={{padding: 20, textAlign: 'center', color: C.textMuted, fontSize: 11}}>
                      KONUM VERİSİ BULUNAMADI
                    </div>
                  ) : filtrelenmis.map(k => {
                    const durum = durumRenk(k.son_konum_zamani);
                    const rol = k.rol || 'personel';
                    const rolRenk = ROL_RENKLER[rol] || '#64748b';
                    const isim = (k.ad_soyad || 'BİLİNMEYEN').toUpperCase();
                    const aktif = secili === (k.id || k.kullanici_id);

                    return (
                      <div key={k.id || k.kullanici_id}
                        onClick={() => kullaniciyaZoom(k)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                          marginBottom: 4, transition: 'all .15s',
                          background: aktif ? `${C.accent}15` : 'transparent',
                          border: aktif ? `1px solid ${C.accent}33` : '1px solid transparent'
                        }}
                        onMouseEnter={e => { if (!aktif) e.currentTarget.style.background = C.bgHover; }}
                        onMouseLeave={e => { if (!aktif) e.currentTarget.style.background = 'transparent'; }}
                      >
                        {/* AVATAR */}
                        <div style={{position: 'relative', flexShrink: 0}}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: rolRenk, color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: 13
                          }}>{isim.charAt(0)}</div>
                          <div style={{
                            position: 'absolute', bottom: -1, right: -1,
                            width: 12, height: 12, borderRadius: '50%',
                            background: durum.renk,
                            border: `2px solid ${isK ? C.bgCard : '#fff'}`
                          }}/>
                        </div>

                        {/* BİLGİ */}
                        <div style={{flex: 1, minWidth: 0}}>
                          <div style={{fontSize: 12, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                            {isim}
                          </div>
                          <div style={{fontSize: 9, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 4}}>
                            <span style={{color: rolRenk, fontWeight: 700}}>{ROL_LABELS[rol] || rol}</span>
                            <span>•</span>
                            <span>{fmtSure(k.son_konum_zamani)}</span>
                          </div>
                        </div>

                        {/* DURUM */}
                        <div style={{
                          fontSize: 8, fontWeight: 800, color: durum.renk,
                          padding: '3px 8px', borderRadius: 20,
                          background: `${durum.renk}15`
                        }}>{durum.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {tab === 'gecmis' && (
            <div style={{...S.card, padding: 16}}>
              <div style={{fontSize: 13, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8}}>
                <LIcon name="History" size={16} color={C.accent}/>
                KONUM GEÇMİŞİ SORGULA
              </div>

              {/* KULLANICI SEÇ */}
              <div style={{marginBottom: 10}}>
                <label style={S.label}>KULLANICI</label>
                <select value={gecmisKullanici || ''} onChange={e => setGecmisKullanici(e.target.value)}
                  style={S.select}>
                  <option value="">KULLANICI SEÇ...</option>
                  {kullanicilar.map(k => (
                    <option key={k.id || k.kullanici_id} value={k.id || k.kullanici_id}>
                      {(k.ad_soyad || 'BİLİNMEYEN').toUpperCase()} ({ROL_LABELS[k.rol] || k.rol})
                    </option>
                  ))}
                </select>
              </div>

              {/* TARİH SEÇ */}
              <div style={{marginBottom: 12}}>
                <label style={S.label}>TARİH</label>
                <input type="date" value={gecmisTarih} onChange={e => setGecmisTarih(e.target.value)}
                  style={S.input}/>
              </div>

              {/* SORGULA BUTONU */}
              <button onClick={gecmisiCek}
                disabled={!gecmisKullanici || !gecmisTarih || gecmisYukle}
                style={{
                  ...S.btn, ...S.btnP, width: '100%', justifyContent: 'center',
                  opacity: (!gecmisKullanici || !gecmisTarih) ? 0.5 : 1
                }}>
                {gecmisYukle ? (
                  <><div style={{width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite'}}/> SORGULANYOR...</>
                ) : (
                  <><LIcon name="Search" size={16} color="#fff"/> SORGULA</>
                )}
              </button>

              {/* SONUÇLAR */}
              {gecmisData.length > 0 && (
                <div style={{marginTop: 16}}>
                  <div style={{fontSize: 11, fontWeight: 800, color: C.accent, marginBottom: 8}}>
                    {gecmisData.length} KONUM NOKTASI BULUNDU
                  </div>
                  <div style={{fontSize: 10, color: C.textMuted, lineHeight: 1.8}}>
                    <div>🟢 BAŞLANGIÇ: {fmtZaman(gecmisData[0]?.zaman || gecmisData[0]?.created_at)}</div>
                    <div>🔴 SON: {fmtZaman(gecmisData[gecmisData.length-1]?.zaman || gecmisData[gecmisData.length-1]?.created_at)}</div>
                  </div>
                </div>
              )}
              {gecmisData.length === 0 && gecmisKullanici && gecmisTarih && !gecmisYukle && (
                <div style={{marginTop: 16, fontSize: 11, color: C.textMuted, textAlign: 'center'}}>
                  SEÇİLEN TARİHTTE KONUM VERİSİ BULUNAMADI
                </div>
              )}
            </div>
          )}
        </div>

        {/* SAĞ: HARİTA */}
        <div style={{
          ...S.card, overflow: 'hidden', position: 'relative', minHeight: 500
        }}>
          <div ref={mapRef} style={{width: '100%', height: '100%', minHeight: 500, background: isK ? '#1e293b' : '#e2e8f0'}}/>

          {/* YENİLE BUTONU */}
          {tab === 'canli' && (
            <button onClick={() => { setYukle(true); verileriCek(); }} style={{
              position: 'absolute', top: 12, right: 12, zIndex: 1000,
              ...S.btn, ...S.btnP, padding: '8px 14px', fontSize: 11,
              boxShadow: '0 4px 12px rgba(0,0,0,.3)'
            }}>
              <LIcon name="RefreshCw" size={14} color="#fff"/> YENİLE
            </button>
          )}

          {/* BOŞ HARİTA MESAJI */}
          {!yukle && kullanicilar.length === 0 && tab === 'canli' && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              zIndex: 1000, textAlign: 'center', padding: 40,
              background: `${C.bgCard}ee`, borderRadius: 16, border: `1px solid ${C.border}`
            }}>
              <LIcon name="MapPin" size={48} color={C.textMuted}/>
              <div style={{fontSize: 14, fontWeight: 800, color: C.text, marginTop: 12}}>HENÜZ KONUM VERİSİ YOK</div>
              <div style={{fontSize: 11, color: C.textMuted, marginTop: 6}}>
                KULLANICILAR SİSTEME GİRİŞ YAPTIĞINDA<br/>KONUMLARI OTOMATİK OLARAK GÖRÜNECEK
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
