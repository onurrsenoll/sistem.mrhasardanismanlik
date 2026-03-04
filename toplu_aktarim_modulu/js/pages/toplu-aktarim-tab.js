/* ════════════════════════════════════════════════════════════════
   TOPLU DOSYA AKTARIM TAB'I (SADECE ADMİN)
   Konum: sistem.js içinde TopluAktarimTab bileşeni olarak yer alır
   Sistem Yönetimi > TOPLU AKTARIM tab'ında görüntülenir
   ════════════════════════════════════════════════════════════════ */
const TopluAktarimTab = () => {
  const {C, S, LIcon, api} = MR;
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sablonIndiriliyor, setSablonIndiriliyor] = useState(false);
  const [sonuc, setSonuc] = useState(null);
  const [hata, setHata] = useState('');
  const [secilenDosya, setSecilenDosya] = useState(null);
  const fileRef = React.useRef(null);

  /* ŞABLON İNDİR */
  const sablonIndir = async () => {
    setSablonIndiriliyor(true);
    try {
      const token = MR.api?.token;
      const r = await fetch('/api/v1/dosya/excel-sablon.php', {
        headers: token ? {'Authorization': 'Bearer ' + token} : {}
      });
      if (!r.ok) { setHata('ŞABLON İNDİRİLEMEDİ'); setSablonIndiriliyor(false); return; }
      const blob = await r.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'dosya_toplu_aktarim_sablonu.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch(e) { setHata('İNDİRME HATASI: ' + e.message); }
    setSablonIndiriliyor(false);
  };

  /* DOSYA YÜKLE */
  const dosyaYukle = async () => {
    if (!secilenDosya) { setHata('LÜTFEN BİR CSV DOSYASI SEÇİN'); return; }
    setYukleniyor(true); setHata(''); setSonuc(null);

    try {
      const token = MR.api?.token;
      const formData = new FormData();
      formData.append('dosya', secilenDosya);

      const r = await fetch('/api/v1/dosya/excel-import.php', {
        method: 'POST',
        headers: token ? {'Authorization': 'Bearer ' + token} : {},
        body: formData
      });

      const json = await r.json();
      if (json.success) {
        setSonuc(json.data);
        setSecilenDosya(null);
        if (fileRef.current) fileRef.current.value = '';
      } else {
        setHata(json.error || 'AKTARIM HATASI');
      }
    } catch(e) {
      setHata('BAĞLANTI HATASI: ' + e.message);
    }
    setYukleniyor(false);
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* BİLGİ KARTI */}
      <div style={{...S.card}}>
        <div style={{...S.cardHead}}>
          <LIcon name="FileSpreadsheet" size={16} color={C.accent}/>
          <span style={{fontWeight:700}}>TOPLU DOSYA AKTARIMI (EXCEL/CSV)</span>
        </div>
        <div style={{padding:16}}>
          <div style={{background:`${C.accent}08`,border:`1px solid ${C.accent}22`,borderRadius:10,padding:16,marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.accent,marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
              <LIcon name="Info" size={14} color={C.accent}/> NASIL KULLANILIR?
            </div>
            <ol style={{fontSize:11,color:C.textSec,lineHeight:1.8,margin:0,paddingLeft:20}}>
              <li><b>ŞABLON İNDİR</b> butonuna tıklayarak Excel şablonunu indirin</li>
              <li>Şablondaki örnek satırları silin, kendi verilerinizi doldurun</li>
              <li><b>DOSYA TÜRÜ</b> (ADK/BH) ve <b>ADI SOYADI</b> zorunlu alanlardır</li>
              <li>Kaza tarihi formatı: <b>GG.AA.YYYY</b> (örn: 15.01.2026)</li>
              <li>CSV dosyasını <b>YÜKLE</b> butonuyla sisteme aktarın</li>
            </ol>
          </div>

          {/* ŞABLON SÜTUN BİLGİSİ */}
          <div style={{background:C.bgInput,borderRadius:8,padding:12,marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:700,color:C.textMuted,marginBottom:8}}>ŞABLON ALANLARI:</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
              {['DOSYA TÜRÜ *','ADI SOYADI *','T.C. KİMLİK','TELEFON','TELEFON 2','E-POSTA',
                'SİGORTA ŞİRKETİ','HASAR NO','POLİÇE NO','KAZA TARİHİ','KAZA İL','KAZA İLÇE',
                'PLAKA','MARKA','MODEL','MODEL YILI','KARŞI PLAKA','KARŞI SİGORTA','DOSYA KAYNAĞI','AŞAMA','NOTLAR'
              ].map((s,i) => (
                <span key={i} style={{
                  fontSize:9,fontWeight:s.includes('*')?800:600,
                  padding:'3px 8px',borderRadius:4,
                  background:s.includes('*')?`${C.danger}18`:`${C.accent}12`,
                  color:s.includes('*')?C.danger:C.textSec,
                  border:`1px solid ${s.includes('*')?C.danger+'33':C.border}`
                }}>{s}</span>
              ))}
            </div>
            <div style={{fontSize:9,color:C.textMuted,marginTop:6}}>* Zorunlu alanlar</div>
          </div>

          {/* BUTONLAR */}
          <div style={{display:'flex',gap:12,alignItems:'flex-start',flexWrap:'wrap'}}>
            {/* ŞABLON İNDİR */}
            <button onClick={sablonIndir} disabled={sablonIndiriliyor}
              style={{...S.btn,...S.btnP,padding:'12px 24px',fontSize:12,
                opacity:sablonIndiriliyor?0.6:1}}>
              <LIcon name="Download" size={16} color="#fff"/>
              {sablonIndiriliyor ? 'İNDİRİLİYOR...' : 'ŞABLON İNDİR (CSV)'}
            </button>

            {/* DOSYA SEÇ + YÜKLE */}
            <div style={{display:'flex',gap:8,alignItems:'center',flex:1,minWidth:280}}>
              <label style={{...S.btn,padding:'12px 24px',fontSize:12,fontWeight:700,borderRadius:10,cursor:'pointer',
                background:'linear-gradient(180deg, #34d399 0%, #10b981 40%, #059669 100%)',color:'#fff',border:'none',display:'flex',alignItems:'center',gap:8,
                boxShadow:'0 4px 14px -2px rgba(16,185,129,0.5), 0 2px 4px -1px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.25)',borderBottom:'2px solid #047857'}}>
                <LIcon name="Upload" size={16} color="#fff"/>
                DOSYA SEÇ
                <input ref={fileRef} type="file" accept=".csv,.txt" style={{display:'none'}}
                  onChange={e => { setSecilenDosya(e.target.files[0] || null); setHata(''); setSonuc(null); }}/>
              </label>
              {secilenDosya && (
                <div style={{display:'flex',alignItems:'center',gap:8,flex:1}}>
                  <div style={{fontSize:11,color:C.text,fontWeight:600,padding:'8px 12px',background:C.bgInput,borderRadius:8,border:`1px solid ${C.border}`,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    <LIcon name="FileText" size={12} color={C.accent} style={{marginRight:6}}/>
                    {secilenDosya.name} ({(secilenDosya.size/1024).toFixed(0)}KB)
                  </div>
                  <button onClick={dosyaYukle} disabled={yukleniyor}
                    style={{...S.btn,padding:'10px 20px',fontSize:12,fontWeight:700,borderRadius:10,cursor:'pointer',
                      background:C.warning,color:'#fff',border:'none',display:'flex',alignItems:'center',gap:6,
                      opacity:yukleniyor?0.6:1,whiteSpace:'nowrap'}}>
                    <LIcon name="Upload" size={14} color="#fff"/>
                    {yukleniyor ? 'AKTARILIYOR...' : 'AKTAR'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* HATA MESAJI */}
          {hata && (
            <div style={{marginTop:12,padding:'10px 14px',borderRadius:8,background:`${C.danger}12`,border:`1px solid ${C.danger}33`,
              color:C.danger,fontSize:11,fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
              <LIcon name="AlertTriangle" size={14} color={C.danger}/> {hata}
            </div>
          )}
        </div>
      </div>

      {/* SONUÇ KARTI */}
      {sonuc && (
        <div style={{...S.card}}>
          <div style={{...S.cardHead,background:`${sonuc.hatali > 0 ? C.warning : C.success}08`}}>
            <LIcon name={sonuc.hatali > 0 ? 'AlertCircle' : 'CheckCircle'} size={16} color={sonuc.hatali > 0 ? C.warning : C.success}/>
            <span style={{fontWeight:700}}>AKTARIM SONUCU</span>
          </div>
          <div style={{padding:16}}>
            {/* ÖZET */}
            <div style={{display:'flex',gap:12,marginBottom:16}}>
              <div style={{flex:1,padding:14,borderRadius:10,background:`${C.success}10`,border:`1px solid ${C.success}22`,textAlign:'center'}}>
                <div style={{fontSize:24,fontWeight:800,color:C.success}}>{sonuc.basarili}</div>
                <div style={{fontSize:10,fontWeight:600,color:C.success,marginTop:2}}>BAŞARILI</div>
              </div>
              <div style={{flex:1,padding:14,borderRadius:10,background:`${C.danger}10`,border:`1px solid ${C.danger}22`,textAlign:'center'}}>
                <div style={{fontSize:24,fontWeight:800,color:C.danger}}>{sonuc.hatali}</div>
                <div style={{fontSize:10,fontWeight:600,color:C.danger,marginTop:2}}>HATALI</div>
              </div>
              <div style={{flex:1,padding:14,borderRadius:10,background:`${C.accent}10`,border:`1px solid ${C.accent}22`,textAlign:'center'}}>
                <div style={{fontSize:24,fontWeight:800,color:C.accent}}>{sonuc.toplam}</div>
                <div style={{fontSize:10,fontWeight:600,color:C.accent,marginTop:2}}>TOPLAM</div>
              </div>
            </div>

            {/* OLUŞTURULAN DOSYALAR */}
            {sonuc.olusturulan?.length > 0 && (
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:C.success,marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
                  <LIcon name="Check" size={12} color={C.success}/> OLUŞTURULAN DOSYALAR
                </div>
                <div style={{maxHeight:300,overflowY:'auto',borderRadius:8,border:`1px solid ${C.border}`}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                    <thead>
                      <tr style={{background:C.bgInput}}>
                        <th style={{padding:'8px 10px',textAlign:'left',fontWeight:700,fontSize:9,color:C.textMuted}}>SATIR</th>
                        <th style={{padding:'8px 10px',textAlign:'left',fontWeight:700,fontSize:9,color:C.textMuted}}>DOSYA NO</th>
                        <th style={{padding:'8px 10px',textAlign:'left',fontWeight:700,fontSize:9,color:C.textMuted}}>ADI SOYADI</th>
                        <th style={{padding:'8px 10px',textAlign:'left',fontWeight:700,fontSize:9,color:C.textMuted}}>TÜR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sonuc.olusturulan.map((d,i) => (
                        <tr key={i} style={{borderTop:`1px solid ${C.border}`}}>
                          <td style={{padding:'6px 10px',fontSize:10,color:C.textMuted}}>{d.satir}</td>
                          <td style={{padding:'6px 10px',fontSize:11,fontWeight:700,color:C.accent}}>{d.dosya_no}</td>
                          <td style={{padding:'6px 10px',fontSize:11,color:C.text}}>{d.ad_soyad}</td>
                          <td style={{padding:'6px 10px'}}><span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,background:d.dosya_turu==='ADK'?`${C.accent}18`:`${C.gold}18`,color:d.dosya_turu==='ADK'?C.accent:C.gold}}>{d.dosya_turu}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* HATALAR */}
            {sonuc.hatalar?.length > 0 && (
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.danger,marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
                  <LIcon name="AlertTriangle" size={12} color={C.danger}/> HATALI SATIRLAR
                </div>
                <div style={{maxHeight:200,overflowY:'auto',background:`${C.danger}06`,borderRadius:8,padding:10,border:`1px solid ${C.danger}22`}}>
                  {sonuc.hatalar.map((h,i) => (
                    <div key={i} style={{fontSize:10,color:C.danger,padding:'4px 0',borderBottom:i<sonuc.hatalar.length-1?`1px solid ${C.danger}11`:'none'}}>
                      {h}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
