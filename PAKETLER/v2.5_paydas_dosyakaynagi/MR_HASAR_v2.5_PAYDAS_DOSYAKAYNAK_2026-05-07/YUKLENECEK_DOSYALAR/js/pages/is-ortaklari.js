/* ============================================================
   MR HASAR — İŞ ORTAKLARI (v2.5.1)
   Geriye dönük uyumluluk: eski /is-ortaklari ve /is-ortaklari-avukat
   route'larından gelenleri doğrudan ilgili sayfaya yönlendirir.
   Menü artık PERSONEL ve AVUKAT'ı ayrı item olarak gösteriyor.
   ============================================================ */
const MR = window.MR || (window.MR = {});
const {useEffect} = React;

MR.IsOrtaklariPage = ({setPage, subPage}) => {
  useEffect(() => {
    if (subPage === 'avukat') setPage('ortaklar-ortaklar');
    else setPage('personel-liste');
  }, [subPage, setPage]);

  const {C} = MR;
  return (
    <div style={{padding:40,textAlign:'center',color:C?.textSec || '#888'}}>
      Yönlendiriliyor…
    </div>
  );
};
