/* ============================================================
   MR HASAR — İŞ PAYDAŞLARI (v2.5)
   SERVİS / KAPORTACI / ACENTE / PASİF TEMSİLCİ / DİĞER
   PAYDAŞLAR > İŞ PAYDAŞLARI menüsünden çağrılır.
   Mevcut OrtaklarPage'in IsPaydaslari component'ini reuse eder.
   Üstte 5 tur sekme bar var; sayfanın kendi state'i yok —
   IsPaydaslari içindeki tur dropdown filtresi kullanıcıya yardımcıdır.
   ============================================================ */
const MR = window.MR || (window.MR = {});
const {useState} = React;

MR.IsPaydaslariPage = ({setPage, user}) => {
  const {C, LIcon} = MR;

  const turler = [
    {key:'',                label:'TÜMÜ',          icon:'Layers',     renk: C.accent},
    {key:'servis',          label:'SERVİS',        icon:'Wrench',     renk: C.warning},
    {key:'kaportaci',       label:'KAPORTACI',     icon:'Hammer',     renk: C.danger},
    {key:'acente',          label:'ACENTE',        icon:'Shield',     renk: C.accent},
    {key:'pasif_temsilci',  label:'PASİF TEMSİLCİ',icon:'UserCheck',  renk: C.purple},
    {key:'diger',           label:'DİĞER',         icon:'MoreHorizontal', renk: C.textSec}
  ];

  return (
    <div className="fade-in">
      {/* Bilgi banner */}
      <div style={{
        marginBottom:14, padding:'10px 14px', borderRadius:10,
        background:`${C.accent}10`, border:`1px solid ${C.accent}33`,
        display:'flex', alignItems:'center', gap:10
      }}>
        <LIcon name="Info" size={16} color={C.accent}/>
        <div style={{fontSize:11, color:C.textSec, lineHeight:1.5}}>
          <strong style={{color:C.accent}}>İŞ PAYDAŞLARI</strong> — Servis, kaportacı, acente, pasif temsilci ve diğer iş paydaşları.
          Aşağıdaki <strong>TÜR</strong> dropdown'ından filtreleyerek listeyi daraltabilirsiniz.
          Yeni paydaş eklerken <strong>TÜR</strong> alanından doğru tipi seçtiğinizden emin olun
          — bu tip, dosya açılırken <strong>DOSYA KAYNAĞI</strong> ile eşleşir.
        </div>
      </div>

      {/* Tur filter chip bar */}
      <div style={{
        display:'flex', gap:6, flexWrap:'wrap', marginBottom:18,
        padding:8, background:C.bgCard, borderRadius:12, border:`1px solid ${C.border}`
      }}>
        {turler.map(t => (
          <a key={t.key || 'all'}
             href={`#tur-${t.key || 'all'}`}
             onClick={e => e.preventDefault()}
             style={{
               padding:'8px 14px', borderRadius:8, fontSize:11, fontWeight:700,
               color:t.renk, background:`${t.renk}14`, border:`1px solid ${t.renk}33`,
               display:'inline-flex', alignItems:'center', gap:6,
               textDecoration:'none', cursor:'default'
             }}>
            <LIcon name={t.icon} size={13} color={t.renk}/>
            {t.label}
          </a>
        ))}
      </div>

      {/* Mevcut IsPaydaslari component (filtreyi component içindeki TÜR dropdown'ından yapar) */}
      {MR.IsPaydaslariView
        ? <MR.IsPaydaslariView setPage={setPage} user={user}/>
        : <div style={{padding:40,textAlign:'center',color:C.textSec}}>Paydaş modülü (ortaklar.js) yüklenmemiş — v2.5 paketinin js/pages/ortaklar.js dosyasını da yüklediğinizden emin olun.</div>
      }
    </div>
  );
};
