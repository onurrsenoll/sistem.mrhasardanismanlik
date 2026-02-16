/**
 * MR HASAR DANIŞMANLIK - SOFTPHONE WIDGET
 * NetSantral Entegrasyonu - Çağrı Başlatma Bileşeni
 */
const MR = window.MR || (window.MR = {});
const {useState, useEffect, useRef} = React;

MR.SoftphoneWidget = ({user}) => {
  const {C, S, LIcon, api} = MR;
  const [acik, setAcik] = useState(false);
  const [numara, setNumara] = useState('');
  const [durum, setDurum] = useState('hazir'); // hazir, araniyor, gorusme, hata
  const [durumMesaj, setDurumMesaj] = useState('');
  const [ayarVar, setAyarVar] = useState(false);
  const inputRef = useRef(null);

  // NetSantral ayarları var mı kontrol et
  useEffect(() => {
    (async () => {
      const r = await api.netsantralAyarGetir();
      if (r?.success && r.data && r.data.santral_no) {
        setAyarVar(true);
      }
    })();
  }, []);

  // Ayar yoksa widget gösterme
  if (!ayarVar) return null;

  const tusTakimi = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['*','0','#']
  ];

  const tusEkle = (t) => setNumara(p => p + t);
  const sil = () => setNumara(p => p.slice(0, -1));
  const temizle = () => setNumara('');

  const ara = async () => {
    if (!numara || numara.length < 4) return;
    setDurum('araniyor');
    setDurumMesaj('Aranıyor...');
    const r = await api.netsantralCagriBaslat({numara});
    if (r?.success) {
      setDurum('gorusme');
      setDurumMesaj('Çağrı başlatıldı');
      setTimeout(() => { setDurum('hazir'); setDurumMesaj(''); setNumara(''); }, 5000);
    } else {
      setDurum('hata');
      setDurumMesaj(r?.error || 'Çağrı başlatılamadı');
      setTimeout(() => { setDurum('hazir'); setDurumMesaj(''); }, 3000);
    }
  };

  const durumRenk = {hazir: C.success, araniyor: C.warning, gorusme: C.accent, hata: C.danger};
  const durumText = {hazir: 'HAZIR', araniyor: 'ARANIYOR', gorusme: 'GÖRÜŞME', hata: 'HATA'};

  return React.createElement('div', {style: {position:'fixed', bottom:24, right:24, zIndex:9999}},
    /* AÇIK PANEL */
    acik && React.createElement('div', {style: {
      width:280, background:C.bgCard, borderRadius:16, border:`1px solid ${C.border}`,
      boxShadow:'0 20px 60px rgba(0,0,0,.6)', marginBottom:12, overflow:'hidden',
      animation:'fadeIn .2s ease-out'
    }},
      /* BAŞLIK */
      React.createElement('div', {style: {
        padding:'14px 16px', background:`${C.accent}11`, borderBottom:`1px solid ${C.border}`,
        display:'flex', alignItems:'center', justifyContent:'space-between'
      }},
        React.createElement('div', {style:{display:'flex',alignItems:'center',gap:8}},
          React.createElement(LIcon, {name:'Phone',size:16,color:C.accent}),
          React.createElement('span', {style:{fontSize:13,fontWeight:700,color:C.accent}}, 'NETSANTRAL')
        ),
        React.createElement('div', {style:{display:'flex',alignItems:'center',gap:8}},
          React.createElement('div', {style:{
            width:8,height:8,borderRadius:4,
            background:durumRenk[durum],
            boxShadow:`0 0 6px ${durumRenk[durum]}`
          }}),
          React.createElement('span', {style:{fontSize:9,fontWeight:700,color:durumRenk[durum]}}, durumText[durum]),
          React.createElement('div', {onClick:()=>setAcik(false),style:{cursor:'pointer',padding:4}},
            React.createElement(LIcon, {name:'X',size:14,color:C.textMuted})
          )
        )
      ),

      /* NUMARA GÖSTERGESİ */
      React.createElement('div', {style:{padding:'16px 16px 8px'}},
        React.createElement('div', {style:{
          display:'flex',alignItems:'center',gap:8,padding:'10px 14px',
          background:C.bgInput,borderRadius:10,border:`1px solid ${C.borderLight}`
        }},
          React.createElement('input', {
            ref: inputRef,
            style:{
              flex:1,background:'transparent',border:'none',color:C.text,
              fontSize:18,fontWeight:700,letterSpacing:2,outline:'none',fontFamily:'monospace'
            },
            value:numara,onChange:e=>setNumara(e.target.value.replace(/[^0-9*#+ ]/g, '')),
            placeholder:'Numara girin',
            onKeyDown:e=>{if(e.key==='Enter')ara();}
          }),
          numara && React.createElement('div', {onClick:sil,style:{cursor:'pointer',padding:4}},
            React.createElement(LIcon, {name:'Delete',size:16,color:C.textMuted})
          )
        ),
        durumMesaj && React.createElement('div', {style:{
          fontSize:10,color:durumRenk[durum],fontWeight:600,marginTop:6,textAlign:'center'
        }}, durumMesaj)
      ),

      /* TUŞ TAKIMI */
      React.createElement('div', {style:{padding:'8px 16px 12px'}},
        tusTakimi.map((satir,si) => React.createElement('div', {key:si,style:{display:'flex',gap:8,marginBottom:8,justifyContent:'center'}},
          satir.map(t => React.createElement('div', {key:t,onClick:()=>tusEkle(t),style:{
            width:60,height:44,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',
            cursor:'pointer',fontSize:18,fontWeight:700,color:C.text,
            background:C.bgHover,border:`1px solid ${C.border}`,transition:'all .15s',userSelect:'none'
          },
            onMouseEnter:e=>e.currentTarget.style.background=`${C.accent}22`,
            onMouseLeave:e=>e.currentTarget.style.background=C.bgHover
          }, t))
        ))
      ),

      /* ARAMA BUTONU */
      React.createElement('div', {style:{padding:'0 16px 16px',display:'flex',gap:8}},
        React.createElement('button', {
          onClick:ara,disabled:durum!=='hazir'||!numara||numara.length<4,
          style:{
            ...S.btn,...S.btnS,flex:1,justifyContent:'center',padding:'12px 0',
            borderRadius:12,fontSize:14,fontWeight:700,
            opacity:(!numara||numara.length<4||durum!=='hazir')?0.5:1
          }
        },
          React.createElement(LIcon, {name:'Phone',size:16,color:'#fff'}), 'ARA'
        ),
        numara && React.createElement('button', {
          onClick:temizle,
          style:{...S.btn,...S.btnG,borderRadius:12,padding:'12px 16px'}
        },
          React.createElement(LIcon, {name:'Trash2',size:14,color:C.textSec})
        )
      )
    ),

    /* YÜZEN BUTON */
    React.createElement('div', {
      onClick:()=>{setAcik(!acik); setTimeout(()=>{if(inputRef.current)inputRef.current.focus();},200);},
      style:{
        width:56,height:56,borderRadius:16,
        background: acik ? C.danger : C.success,
        display:'flex',alignItems:'center',justifyContent:'center',
        cursor:'pointer',boxShadow:`0 8px 24px ${acik?C.danger:C.success}44`,
        transition:'all .3s',transform:acik?'rotate(135deg)':'rotate(0deg)'
      },
      onMouseEnter:e=>{e.currentTarget.style.transform=acik?'rotate(135deg) scale(1.1)':'scale(1.1)';},
      onMouseLeave:e=>{e.currentTarget.style.transform=acik?'rotate(135deg)':'rotate(0deg)';}
    },
      React.createElement(LIcon, {name: acik?'X':'Phone', size:24, color:'#fff'})
    )
  );
};
