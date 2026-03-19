/**
 * MR HASAR DANIŞMANLIK - KONFIGÜRASYON
 * API, RENKLER, STİLLER, SABİTLER
 */
const MR = window.MR || (window.MR = {});

// ═══ TOAST BİLDİRİM ═══
MR.toast = (mesaj, tip = 'info') => {
  const isK = MR.tema === 'koyu';
  const renk = tip === 'success' ? '#10b981' : tip === 'error' ? '#ef4444' : tip === 'warning' ? '#f59e0b' : (MR.C?.accent || '#1a56db');
  const el = document.createElement('div');
  el.textContent = mesaj;
  Object.assign(el.style, {
    position:'fixed', top:'20px', right:'20px', zIndex:'99999',
    background: isK ? 'rgba(30,41,59,0.95)' : 'rgba(255,255,255,0.95)',
    color:renk, border:'1px solid '+(isK ? '#334155' : '#e2e8f0'),
    padding:'14px 24px', borderRadius:'12px', fontSize:'13px', fontWeight:'800',
    fontFamily:'Manrope,sans-serif', letterSpacing:'0.3px', textTransform:'uppercase',
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
    maxWidth:'400px',
    animation:'fadeIn .3s ease', cursor:'pointer'
  });
  el.onclick = () => el.remove();
  document.body.appendChild(el);
  setTimeout(() => { if(el.parentNode) el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(), 300); }, 3000);
};

// ═══ YETKİ KONTROL FONKSİYONU ═══
MR.hasYetki = (user, modul, islem) => {
  if (user?.rol === 'admin') return true;
  return user?.yetkiler?.[modul + '_' + islem] === 1 || user?.yetkiler?.[modul + '_' + islem] === true;
};

// ═══ API ═══
const API_BASE = '/api/v1';
MR.api = {
  base: API_BASE,
  token: localStorage.getItem('mr_token'),
  setToken(t) { this.token = t; if (t) localStorage.setItem('mr_token', t); else localStorage.removeItem('mr_token'); },
  async req(ep, o = {}, timeout = 30000) {
    try {
      const h = { 'Content-Type': 'application/json' };
      if (this.token) h['Authorization'] = 'Bearer ' + this.token;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const r = await fetch(API_BASE + ep, { ...o, headers: { ...h, ...o.headers }, signal: controller.signal });
      clearTimeout(timeoutId);
      if (r.status === 401) { this.setToken(null); location.reload(); return null; }
      const t = await r.text();
      try { return JSON.parse(t); } catch (e) { return { success: false, error: 'SUNUCU YANIT HATASI: ' + (t || '').substring(0, 300) }; }
    } catch (e) {
      if (e.name === 'AbortError') return { success: false, error: 'İSTEK ZAMAN AŞIMINA UĞRADI' };
      return { success: false, error: 'BAĞLANTI HATASI' };
    }
  },
  // AUTH
  login(e, s) { return this.req('/auth/login.php', { method: 'POST', body: JSON.stringify({ email: e, sifre: s }) }); },
  me() { return this.req('/auth/me.php'); },
  changePw(d) { return this.req('/auth/change-password.php', { method: 'POST', body: JSON.stringify(d) }); },
  profilUpdate(d) { return this.req('/auth/profil-update.php', { method: 'POST', body: JSON.stringify(d) }); },
  // 2FA
  twoFaSetup(action, code) { return this.req('/auth/2fa-setup.php', { method: 'POST', body: JSON.stringify({ action, code }) }); },
  twoFaVerify(tempToken, code) { return this.req('/auth/2fa-verify.php', { method: 'POST', body: JSON.stringify({ temp_token: tempToken, code }) }); },
  avatarYukle(file) {
    const fd = new FormData(); fd.append('avatar', file);
    const h = {}; if (this.token) h['Authorization'] = 'Bearer ' + this.token;
    return fetch(API_BASE + '/auth/avatar-yukle.php', { method: 'POST', headers: h, body: fd }).then(r => r.json()).catch(() => ({success: false, error: 'BAĞLANTI HATASI'}));
  },
  // DOSYA
  dosyaList(p = {}) { return this.req('/dosya/list.php?' + new URLSearchParams(p)); },
  dosyaGet(id) { return this.req('/dosya/get.php?id=' + id); },
  dosyaCreate(d) { return this.req('/dosya/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  dosyaUpdate(d) { return this.req('/dosya/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  dosyaDelete(id) { return this.req('/dosya/delete.php?id=' + id, { method: 'DELETE' }); },
  dosyaBulkDelete(ids) { return this.req('/dosya/bulk-delete.php', { method: 'POST', body: JSON.stringify({ids}) }); },
  // MASRAF
  masrafCreate(d) { return this.req('/masraf/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  masrafList(p = {}) { return this.req('/masraf/list.php?' + new URLSearchParams(p)); },
  masrafDelete(id) { return this.req('/masraf/delete.php?id=' + id, { method: 'DELETE' }); },
  masrafOde(d) { return this.req('/masraf/ode.php', { method: 'PUT', body: JSON.stringify(d) }); },
  // EVRAK
  async evrakUpload(did, tur, file) {
    try {
      const fd = new FormData(); fd.append('dosya_id', did); fd.append('evrak_turu', tur); fd.append('file', file);
      const h = {}; if (this.token) h['Authorization'] = 'Bearer ' + this.token;
      const r = await fetch(API_BASE + '/evrak/upload.php', { method: 'POST', headers: h, body: fd, credentials: 'include' });
      const txt = await r.text();
      try { return JSON.parse(txt); } catch(e) { return { success: false, error: 'SUNUCU YANIT HATASI: ' + txt.substring(0, 200) }; }
    } catch(e) { return { success: false, error: 'BAĞLANTI HATASI: ' + e.message }; }
  },
  evrakUrl(id) { return API_BASE + '/evrak/download.php?id=' + id; },
  evrakPreviewUrl(id) { return API_BASE + '/evrak/download.php?id=' + id + '&mode=inline'; },
  evrakDelete(id) { return this.req('/evrak/delete.php?id=' + id, { method: 'DELETE' }); },
  // CRM
  crmList(p = {}) { return this.req('/crm/list.php?' + new URLSearchParams(p)); },
  crmGet(id) { return this.req('/crm/get.php?id=' + id); },
  crmCreate(d) { return this.req('/crm/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  crmUpdate(d) { return this.req('/crm/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  crmDelete(id) { return this.req('/crm/delete.php?id=' + id, { method: 'DELETE' }); },
  crmBulkDelete(ids) { return this.req('/crm/bulk-delete.php', { method: 'POST', body: JSON.stringify({ids}) }); },
  crmNotEkle(d) { return this.req('/crm/not-ekle.php', { method: 'POST', body: JSON.stringify(d) }); },
  crmDonustur(d) { return this.req('/crm/donustur.php', { method: 'POST', body: JSON.stringify(d) }); },
  async crmDosyaYukle(crmId, tur, file) {
    const fd = new FormData(); fd.append('crm_id', crmId); fd.append('tur', tur); fd.append('file', file);
    const h = {}; if (this.token) h['Authorization'] = 'Bearer ' + this.token;
    return (await fetch(API_BASE + '/crm/dosya-yukle.php', { method: 'POST', headers: h, body: fd })).json();
  },
  // MUHASEBE
  kasaList() { return this.req('/muhasebe/kasa-list.php'); },
  kasaCreate(d) { return this.req('/muhasebe/kasa-create.php', { method: 'POST', body: JSON.stringify(d) }); },
  kasaUpdate(d) { return this.req('/muhasebe/kasa-update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  kasaDelete(id) { return this.req('/muhasebe/kasa-delete.php?id=' + id, { method: 'DELETE' }); },
  gelirEkle(d) { return this.req('/muhasebe/gelir-ekle.php', { method: 'POST', body: JSON.stringify(d) }); },
  kasaTransfer(d) { return this.req('/muhasebe/transfer.php', { method: 'POST', body: JSON.stringify(d) }); },
  kasaHareketler(p = {}) { return this.req('/muhasebe/hareketler.php?' + new URLSearchParams(p)); },
  kasaHareketSil(id) { return this.req('/muhasebe/hareket-delete.php?id=' + id, { method: 'DELETE' }); },
  kasaHareketGuncelle(d) { return this.req('/muhasebe/hareket-update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  muhasebeRapor(p = {}) { return this.req('/muhasebe/rapor.php?' + new URLSearchParams(p)); },
  // SİSTEM
  kullaniciList(p = {}) { return this.req('/sistem/kullanici-list.php?' + new URLSearchParams(p)); },
  kullaniciCreate(d) { return this.req('/sistem/kullanici-create.php', { method: 'POST', body: JSON.stringify(d) }); },
  kullaniciUpdate(d) { return this.req('/sistem/kullanici-update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  kullaniciDelete(id) { return this.req('/sistem/kullanici-delete.php?id=' + id, { method: 'DELETE' }); },
  loglar(p = {}) { return this.req('/sistem/loglar.php?' + new URLSearchParams(p)); },
  dashboard() { return this.req('/sistem/dashboard.php'); },
  // BİLDİRİM
  bildirimList(p = {}) { return this.req('/bildirim/list.php?' + new URLSearchParams(p)); },
  bildirimCreate(d) { return this.req('/bildirim/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  bildirimOku(d) { return this.req('/bildirim/oku.php', { method: 'PUT', body: JSON.stringify(d) }); },
  bildirimDelete(id) { return this.req('/bildirim/delete.php?id=' + id, { method: 'DELETE' }); },
  bildirimBulkDelete(ids) { return this.req('/bildirim/bulk-delete.php', { method: 'POST', body: JSON.stringify({ids}) }); },
  // AJANDA
  ajandaList(p = {}) { return this.req('/ajanda/list.php?' + new URLSearchParams(p)); },
  ajandaCreate(d) { return this.req('/ajanda/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  ajandaUpdate(d) { return this.req('/ajanda/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  ajandaDelete(id) { return this.req('/ajanda/delete.php?id=' + id, { method: 'DELETE' }); },
  ajandaBulkDelete(ids) { return this.req('/ajanda/bulk-delete.php', { method: 'POST', body: JSON.stringify({ids}) }); },
  // TANIM
  tanimList(p = {}) { return this.req('/tanim/list.php?' + new URLSearchParams(p)); },
  tanimCreate(d) { return this.req('/tanim/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  tanimUpdate(d) { return this.req('/tanim/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  tanimDelete(id) { return this.req('/tanim/delete.php?id=' + id, { method: 'DELETE' }); },
  tanimBulkCreate(d) { return this.req('/tanim/bulk-create.php', { method: 'POST', body: JSON.stringify(d) }); },
  // ORTAK
  ortakList(p = {}) { return this.req('/ortak/list.php?' + new URLSearchParams(p)); },
  ortakGet(id) { return this.req('/ortak/get.php?id=' + id); },
  ortakCreate(d) { return this.req('/ortak/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  ortakUpdate(d) { return this.req('/ortak/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  ortakDelete(id) { return this.req('/ortak/delete.php?id=' + id, { method: 'DELETE' }); },
  ortakBulkDelete(ids) { return this.req('/ortak/bulk-delete.php', { method: 'POST', body: JSON.stringify({ids}) }); },
  ortakHareketList(p = {}) { return this.req('/ortak/hareket-list.php?' + new URLSearchParams(p)); },
  ortakHareketEkle(d) { return this.req('/ortak/hareket-ekle.php', { method: 'POST', body: JSON.stringify(d) }); },
  // PAYDAŞ
  paydasList(p = {}) { return this.req('/paydas/list.php?' + new URLSearchParams(p)); },
  paydasGet(id) { return this.req('/paydas/get.php?id=' + id); },
  paydasCreate(d) { return this.req('/paydas/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  paydasUpdate(d) { return this.req('/paydas/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  paydasDelete(id) { return this.req('/paydas/delete.php?id=' + id, { method: 'DELETE' }); },
  paydasBulkDelete(ids) { return this.req('/paydas/bulk-delete.php', { method: 'POST', body: JSON.stringify({ids}) }); },
  paydasKomisyonList(p = {}) { return this.req('/paydas/komisyon-list.php?' + new URLSearchParams(p)); },
  paydasKomisyonEkle(d) { return this.req('/paydas/komisyon-ekle.php', { method: 'POST', body: JSON.stringify(d) }); },
  paydasKomisyonOde(d) { return this.req('/paydas/komisyon-ode.php', { method: 'PUT', body: JSON.stringify(d) }); },
  // MUHASEBE (YENİ)
  gelirList(p = {}) { return this.req('/muhasebe/gelir-list.php?' + new URLSearchParams(p)); },
  gelirCreate(d) { return this.req('/muhasebe/gelir-create.php', { method: 'POST', body: JSON.stringify(d) }); },
  giderList(p = {}) { return this.req('/muhasebe/gider-list.php?' + new URLSearchParams(p)); },
  giderCreate(d) { return this.req('/muhasebe/gider-create.php', { method: 'POST', body: JSON.stringify(d) }); },
  komisyonList(p = {}) { return this.req('/muhasebe/komisyon-list.php?' + new URLSearchParams(p)); },
  komisyonOlustur(d) { return this.req('/muhasebe/komisyon-olustur.php', { method: 'POST', body: JSON.stringify(d) }); },
  komisyonOde(d) { return this.req('/muhasebe/komisyon-ode.php', { method: 'PUT', body: JSON.stringify(d) }); },
  maliyetAnaliz(p = {}) { return this.req('/muhasebe/maliyet-analiz.php?' + new URLSearchParams(p)); },
  finansalRapor(p = {}) { return this.req('/muhasebe/finansal-rapor.php?' + new URLSearchParams(p)); },
  kapanisRapor(p = {}) { return this.req('/muhasebe/kapanis-rapor.php?' + new URLSearchParams(p)); },
  aySonuRapor(p = {}) { return this.req('/muhasebe/ay-sonu-rapor.php?' + new URLSearchParams(p)); },
  bakiyeSifirla() { return this.req('/muhasebe/bakiye-sifirla.php', { method: 'POST', body: '{}' }); },
  topluSifirla(modul) { return this.req('/sistem/toplu-sifirla.php', { method: 'POST', body: JSON.stringify({modul}) }); },
  bakiyeDuzelt(d) { return this.req('/muhasebe/bakiye-duzelt.php', { method: 'PUT', body: JSON.stringify(d) }); },
  // MESAJ
  mesajList(p = {}) { return this.req('/mesaj/list.php?' + new URLSearchParams(p)); },
  mesajGiden(p = {}) { return this.req('/mesaj/giden.php?' + new URLSearchParams(p)); },
  mesajGet(id) { return this.req('/mesaj/get.php?id=' + id); },
  mesajCreate(d) { return this.req('/mesaj/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  mesajDelete(id) { return this.req('/mesaj/delete.php?id=' + id, { method: 'DELETE' }); },
  mesajBulkDelete(ids) { return this.req('/mesaj/bulk-delete.php', { method: 'POST', body: JSON.stringify({ids}) }); },
  mesajOku(d) { return this.req('/mesaj/oku.php', { method: 'PUT', body: JSON.stringify(d) }); },
  // HESAP (AI)
  adkAiAnaliz(d) { return this.req('/hesap/ai-analiz.php', { method: 'POST', body: JSON.stringify(d) }); },
  bhAiAnaliz(d) { return this.req('/hesap/bh-ai-analiz.php', { method: 'POST', body: JSON.stringify(d) }); },
  rayicArastir(d) { return this.req('/hesap/rayic-arastirma.php', { method: 'POST', body: JSON.stringify(d) }, 90000); },
  tahkimEmsalAra(d) { return this.req('/hesap/tahkim-emsal-ara.php', { method: 'POST', body: JSON.stringify(d) }, 90000); },
  // ŞABLON
  sablonList(p = {}) { return this.req('/sablon/list.php?' + new URLSearchParams(p)); },
  sablonGet(id) { return this.req('/sablon/get.php?id=' + id); },
  sablonCreate(d) { return this.req('/sablon/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  sablonUpdate(d) { return this.req('/sablon/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  sablonDelete(id) { return this.req('/sablon/delete.php?id=' + id, { method: 'DELETE' }); },
  // YETKİ
  yetkiList(p = {}) { return this.req('/sistem/yetki-list.php?' + new URLSearchParams(p)); },
  yetkiGuncelle(d) { return this.req('/sistem/yetki-guncelle.php', { method: 'POST', body: JSON.stringify(d) }); },
  // AYARLAR
  ayarlarList() { return this.req('/sistem/ayarlar-list.php'); },
  ayarlarGuncelle(d) { return this.req('/sistem/ayarlar-guncelle.php', { method: 'POST', body: JSON.stringify(d) }); },
  logoYukle(file) {
    const fd = new FormData(); fd.append('logo', file);
    const h = {}; if (this.token) h['Authorization'] = 'Bearer ' + this.token;
    return fetch(API_BASE + '/sistem/logo-yukle.php', {
      method: 'POST', headers: h, body: fd
    }).then(r => r.json()).catch(() => ({success: false, error: 'BAĞLANTI HATASI'}));
  },
  sidebarLogoYukle(file) {
    const fd = new FormData(); fd.append('sidebar_logo', file);
    const h = {}; if (this.token) h['Authorization'] = 'Bearer ' + this.token;
    return fetch(API_BASE + '/sistem/sidebar-logo-yukle.php', {
      method: 'POST', headers: h, body: fd
    }).then(r => r.json()).catch(() => ({success: false, error: 'BAĞLANTI HATASI'}));
  },
  // YÖNLENDİRME / ARAMA LİSTESİ
  yonlendirmeList(p = {}) { return this.req('/yonlendirme/list.php?' + new URLSearchParams(p)); },
  yonlendirmeGet(id) { return this.req('/yonlendirme/get.php?id=' + id); },
  yonlendirmeCreate(d) { return this.req('/yonlendirme/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  yonlendirmeUpdate(d) { return this.req('/yonlendirme/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  yonlendirmeDelete(id) { return this.req('/yonlendirme/delete.php?id=' + id, { method: 'DELETE' }); },
  yonlendirmeImport(d) { return this.req('/yonlendirme/import.php', { method: 'POST', body: JSON.stringify(d) }); },
  yonlendirmeNotEkle(d) { return this.req('/yonlendirme/not-ekle.php', { method: 'POST', body: JSON.stringify(d) }); },
  yonlendirmeTopluIslem(d) { return this.req('/yonlendirme/toplu-islem.php', { method: 'POST', body: JSON.stringify(d) }); },
  // SMS
  smsLogList(p = {}) { return this.req('/sms/log-list.php?' + new URLSearchParams(p)); },
  smsTest(d) { return this.req('/sms/test.php', { method: 'POST', body: JSON.stringify(d) }); },
  smsGonder(d) { return this.req('/sms/gonder.php', { method: 'POST', body: JSON.stringify(d) }); },
  smsGelenList(p = {}) { return this.req('/sms/gelen-list.php?' + new URLSearchParams(p)); },
  smsGelenOkundu(d) { return this.req('/sms/gelen-okundu.php', { method: 'POST', body: JSON.stringify(d) }); },
  // ARAMA LOG
  aramaLogList(p = {}) { return this.req('/arama-log/list.php?' + new URLSearchParams(p)); },
  aramaLogCreate(d) { return this.req('/arama-log/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  aramaLogUpdate(d) { return this.req('/arama-log/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  aramaLogDelete(id) { return this.req('/arama-log/delete.php?id=' + id, { method: 'DELETE' }); },
  aramaLogIstatistik(p = {}) { return this.req('/arama-log/istatistik.php?' + new URLSearchParams(p)); },
  aramaLogKayitUrl(id) { return API_BASE + '/arama-log/kayit-indir.php?id=' + id; },
  async aramaLogKayitYukle(logId, file) {
    const fd = new FormData(); fd.append('arama_log_id', logId); fd.append('file', file);
    const h = {}; if (this.token) h['Authorization'] = 'Bearer ' + this.token;
    return (await fetch(API_BASE + '/arama-log/kayit-yukle.php', { method: 'POST', headers: h, body: fd })).json();
  },
  // ARAÇ KATALOG
  aracMarkaList() { return this.req('/tanim/arac-marka-list.php'); },
  aracModelList(marka) { return this.req('/tanim/arac-model-list.php?marka=' + encodeURIComponent(marka)); },
  // AI MOTİVASYON
  motivasyonSoz() { return this.req('/ai/motivasyon.php', {}, 12000); },
  claudeTest(d = {}) { return this.req('/ai/motivasyon-test.php', { method: 'POST', body: JSON.stringify(d) }, 20000); },
  // PERSONEL
  personelList(p = {}) { return this.req('/personel/list.php?' + new URLSearchParams(p)); },
  personelGet(id) { return this.req('/personel/get.php?id=' + id); },
  personelCreate(d) { return this.req('/personel/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  personelUpdate(d) { return this.req('/personel/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  personelDelete(id) { return this.req('/personel/delete.php?id=' + id, { method: 'DELETE' }); },
  personelBulkDelete(ids) { return this.req('/personel/bulk-delete.php', { method: 'POST', body: JSON.stringify({ids}) }); },
  // HAKEDİŞ
  hakedisHesapla(d) { return this.req('/personel/hakedis-hesapla.php', { method: 'POST', body: JSON.stringify(d) }); },
  hakedisList(p = {}) { return this.req('/personel/hakedis-list.php?' + new URLSearchParams(p)); },
  hakedisOde(d) { return this.req('/personel/hakedis-ode.php', { method: 'PUT', body: JSON.stringify(d) }); },
  // POLİÇE
  policeList(p = {}) { return this.req('/police/list.php?' + new URLSearchParams(p)); },
  policeGet(id) { return this.req('/police/get.php?id=' + id); },
  policeCreate(d) { return this.req('/police/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  policeUpdate(d) { return this.req('/police/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  policeDelete(id) { return this.req('/police/delete.php?id=' + id, { method: 'DELETE' }); },
  policeBulkDelete(ids) { return this.req('/police/bulk-delete.php', { method: 'POST', body: JSON.stringify({ids}) }); },
  policeTahsilatEkle(d) { return this.req('/police/tahsilat-ekle.php', { method: 'POST', body: JSON.stringify(d) }); },
  policeTahsilatList(p = {}) { return this.req('/police/tahsilat-list.php?' + new URLSearchParams(p)); },
  policeRapor(p = {}) { return this.req('/police/rapor.php?' + new URLSearchParams(p)); },
  policeHatirlatma() { return this.req('/police/hatirlatma-kontrol.php'); },
  policeExcelImport(d) { return this.req('/police/excel-import.php', { method: 'POST', body: JSON.stringify(d) }); },
  // SAHA
  sahaList(p = {}) { return this.req('/saha/list.php?' + new URLSearchParams(p)); },
  sahaGet(id) { return this.req('/saha/get.php?id=' + id); },
  sahaCreate(d) { return this.req('/saha/create.php', { method: 'POST', body: JSON.stringify(d) }); },
  sahaUpdate(d) { return this.req('/saha/update.php', { method: 'PUT', body: JSON.stringify(d) }); },
  sahaOnayaGonder(d) { return this.req('/saha/onaya-gonder.php', { method: 'POST', body: JSON.stringify(d) }); },
  sahaOnayla(d) { return this.req('/saha/onayla.php', { method: 'POST', body: JSON.stringify(d) }); },
  sahaReddet(d) { return this.req('/saha/reddet.php', { method: 'POST', body: JSON.stringify(d) }); },
  sahaDosyayaDonustur(d) { return this.req('/saha/dosyaya-donustur.php', { method: 'POST', body: JSON.stringify(d) }); },
  async sahaDosyaYukle(sahaId, file, aciklama) {
    const fd = new FormData(); fd.append('saha_dosya_id', sahaId); fd.append('file', file); if (aciklama) fd.append('aciklama', aciklama);
    const h = {}; if (this.token) h['Authorization'] = 'Bearer ' + this.token;
    return (await fetch(API_BASE + '/saha/dosya-yukle.php', { method: 'POST', headers: h, body: fd })).json();
  },
  sahaMedyaList(sahaId) { return this.req('/saha/medya-list.php?saha_dosya_id=' + sahaId); },
  sahaDosyaSil(id) { return this.req('/saha/dosya-sil.php?id=' + id, { method: 'DELETE' }); },
  sahaSil(id) { return this.req('/saha/sil.php?id=' + id, { method: 'DELETE' }); },
  // KONUM TAKİBİ
  konumGuncelle(d) { return this.req('/konum/guncelle.php', { method: 'POST', body: JSON.stringify(d) }); },
  konumListele() { return this.req('/konum/listele.php'); },
  konumGecmisi(p = {}) { return this.req('/konum/gecmisi.php?' + new URLSearchParams(p)); },
  // PORTAL
  portalErisimList(p = {}) { return this.req('/portal/erisim-list.php?' + new URLSearchParams(p)); },
  portalErisimOlustur(d) { return this.req('/portal/erisim-olustur.php', { method: 'POST', body: JSON.stringify(d) }); },
  portalErisimGuncelle(d) { return this.req('/portal/erisim-guncelle.php', { method: 'PUT', body: JSON.stringify(d) }); },
  portalErisimSil(id) { return this.req('/portal/erisim-sil.php?id=' + id, { method: 'DELETE' }); },
  portalMesajList(dosyaId) { return this.req('/portal/portal-mesaj-list.php?dosya_id=' + dosyaId); },
  portalMesajGonder(d) { return this.req('/portal/portal-mesaj-gonder.php', { method: 'POST', body: JSON.stringify(d) }); },
  portalLoglar(p = {}) { return this.req('/portal/loglar.php?' + new URLSearchParams(p)); },
  // İÇTİHAT
  ictihatYargitayAra(d) { return this.req('/ictihat/yargitay-ara.php', { method: 'POST', body: JSON.stringify(d) }, 90000); },
  ictihatTahkimAra(d) { return this.req('/ictihat/tahkim-ara.php', { method: 'POST', body: JSON.stringify(d) }, 90000); },
  ictihatPoliceLimitAra(d) { return this.req('/ictihat/police-limit.php', { method: 'POST', body: JSON.stringify(d) }, 90000); },
  ictihatKusurEmsalAra(d) { return this.req('/ictihat/kusur-emsal-ara.php', { method: 'POST', body: JSON.stringify(d) }, 90000); },
};

// ═══ TEMA SİSTEMİ — MR FİNANS BLUE ═══

/* ─── KOYU TEMA: DARK SLATE ─── */
const KOYU_TEMA = {
  bg: '#0f172a', bgCard: '#1e293b', bgHover: '#334155', bgInput: '#1e293b',
  border: '#334155', borderLight: '#283548',
  accent: '#1a56db', accentLight: '#3b82f6',
  accentGradient: 'linear-gradient(135deg, #3b82f6 0%, #1a56db 50%, #1e3a8a 100%)',
  success: '#10b981', warning: '#f59e0b', danger: '#ef4444',
  purple: '#8b5cf6', cyan: '#06b6d4', pink: '#ec4899', gold: '#f59e0b',
  text: '#f1f5f9', textSec: '#cbd5e1', textMuted: '#64748b',
  headerBg: 'rgba(30,41,59,0.97)', navBg: 'rgba(30,41,59,0.98)',
  cardShadow: '0 10px 15px -3px rgba(0,0,0,0.2), 0 4px 6px -4px rgba(0,0,0,0.1)',
  statShadow: '0 4px 6px -1px rgba(0,0,0,0.2), 0 2px 4px -2px rgba(0,0,0,0.1)',
  inputShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
  btnShadow: '0 4px 6px -1px rgba(0,0,0,0.2), 0 2px 4px -2px rgba(0,0,0,0.1)',
  bgGradient: '#0f172a'
};

/* ─── AÇIK TEMA: LIGHT SLATE ─── */
const ACIK_TEMA = {
  bg: '#f8fafc', bgCard: '#ffffff', bgHover: '#e2e8f0', bgInput: '#f1f5f9',
  border: '#e2e8f0', borderLight: '#f1f5f9',
  accent: '#1a56db', accentLight: '#3b82f6',
  accentGradient: 'linear-gradient(135deg, #3b82f6 0%, #1a56db 50%, #1e3a8a 100%)',
  success: '#10b981', warning: '#f59e0b', danger: '#ef4444',
  purple: '#8b5cf6', cyan: '#06b6d4', pink: '#ec4899', gold: '#f59e0b',
  text: '#1e293b', textSec: '#475569', textMuted: '#94a3b8',
  headerBg: 'rgba(255,255,255,0.95)', navBg: 'rgba(255,255,255,0.97)',
  cardShadow: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05)',
  statShadow: '0 4px 6px -1px rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.05)',
  inputShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
  btnShadow: '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.05)',
  bgGradient: '#f8fafc'
};

MR.TEMALAR = { koyu: KOYU_TEMA, acik: ACIK_TEMA };
MR.tema = localStorage.getItem('mr_tema') || 'koyu';

// ═══ RENKLER ═══
MR.C = { ...MR.TEMALAR[MR.tema] };

// ═══ TEMA DEĞİŞTİRME ═══
MR._stilGuncelle = () => {
  const C = MR.C;
  const isK = MR.tema === 'koyu';

  /* SAYFA */
  MR.S.page = { minHeight: '100vh', background: C.bgGradient || C.bg, color: C.text };

  /* KART */
  MR.S.card = {
    background: C.bgCard,
    borderRadius: 16, border: `1px solid ${C.border}`,
    overflow: 'hidden', boxShadow: C.cardShadow,
    transition: 'box-shadow .2s ease, transform .2s ease'
  };

  /* KART BAŞLIK */
  MR.S.cardHead = {
    padding: '16px 22px', borderBottom: `1px solid ${C.border}`,
    display: 'flex', alignItems: 'center', gap: 10,
    fontSize: 15, fontWeight: 800
  };

  MR.S.cardBody = { padding: 22 };

  /* INPUT */
  MR.S.input = {
    width: '100%', padding: '12px 16px',
    background: C.bgInput,
    border: `1px solid ${C.border}`,
    borderRadius: 8, color: C.text, fontSize: 14, fontWeight: 600,
    outline: 'none', boxSizing: 'border-box',
    boxShadow: C.inputShadow,
    transition: 'border-color .2s, box-shadow .2s'
  };

  /* SELECT */
  MR.S.select = {
    width: '100%', padding: '12px 16px',
    background: C.bgInput,
    border: `1px solid ${C.border}`,
    borderRadius: 8, color: C.text, fontSize: 14, fontWeight: 600,
    outline: 'none', boxSizing: 'border-box',
    boxShadow: C.inputShadow
  };

  /* LABEL */
  MR.S.label = { fontSize: 13, fontWeight: 800, color: C.textSec, marginBottom: 7, display: 'block', letterSpacing: 0.5 };

  /* OUTLINE BUTON — 3D hafif */
  MR.S.btnG = {
    background: 'linear-gradient(180deg, rgba(100,116,139,0.15) 0%, rgba(100,116,139,0.08) 100%)',
    color: C.textSec, fontWeight: 700,
    border: `1px solid ${C.border}`,
    boxShadow: '0 2px 6px -1px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.05)'
  };

  /* STAT KART */
  MR.S.stat = {
    background: C.bgCard,
    borderRadius: 16, padding: '18px 20px',
    border: `1px solid ${C.border}`,
    boxShadow: C.statShadow,
    transition: 'box-shadow .2s ease, transform .2s ease'
  };

  /* ═══ BUTON SİSTEMİ — 3D MAVİ ═══ */
  MR.S.btn.fontWeight = 800;
  MR.S.btn.fontSize = 14;
  MR.S.btn.borderRadius = 10;
  MR.S.btn.border = 'none';
  MR.S.btn.textShadow = '0 1px 2px rgba(0,0,0,0.15)';
  MR.S.btn.letterSpacing = 0.3;
  /* Primary — 3D mavi */
  MR.S.btnP = {
    background: 'linear-gradient(180deg, #60a5fa 0%, #3b82f6 40%, #2563eb 100%)',
    color: '#fff', fontWeight: 800, border: 'none',
    boxShadow: '0 4px 14px -2px rgba(37,99,235,0.55), 0 2px 4px -1px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.25)',
    borderBottom: '2px solid #1d4ed8'
  };
  /* Secondary — 3D mavi */
  MR.S.btnS = {
    background: 'linear-gradient(180deg, #60a5fa 0%, #3b82f6 40%, #2563eb 100%)',
    color: '#fff', fontWeight: 800, border: 'none',
    boxShadow: '0 4px 14px -2px rgba(37,99,235,0.55), 0 2px 4px -1px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.25)',
    borderBottom: '2px solid #1d4ed8'
  };
  /* Warning — 3D amber */
  MR.S.btnW = {
    background: 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 40%, #d97706 100%)',
    color: '#000', fontWeight: 800, border: 'none',
    boxShadow: '0 4px 14px -2px rgba(245,158,11,0.5), 0 2px 4px -1px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.3)',
    borderBottom: '2px solid #b45309'
  };
  /* Danger — 3D kırmızı */
  MR.S.btnD = {
    background: 'linear-gradient(180deg, #f87171 0%, #ef4444 40%, #dc2626 100%)',
    color: '#fff', fontWeight: 800, border: 'none',
    boxShadow: '0 4px 14px -2px rgba(239,68,68,0.5), 0 2px 4px -1px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2)',
    borderBottom: '2px solid #b91c1c'
  };
  /* Ghost — 3D hafif */
  MR.S.btnG = {
    background: 'linear-gradient(180deg, rgba(100,116,139,0.15) 0%, rgba(100,116,139,0.08) 100%)',
    color: C.textSec, fontWeight: 700,
    border: `1px solid ${C.border}`,
    boxShadow: '0 2px 6px -1px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.05)'
  };
  /* Mini butonlar */
  MR.S.btnMini = {
    padding: '5px 10px', borderRadius: 7, border: 'none',
    fontWeight: 700, fontSize: 9, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 3,
    transition: 'all .15s ease', position: 'relative',
    textShadow: '0 1px 1px rgba(0,0,0,0.12)'
  };
  MR.S.btnMiniP = {
    background: 'linear-gradient(180deg, #60a5fa 0%, #3b82f6 40%, #2563eb 100%)',
    color: '#fff', boxShadow: '0 2px 8px -1px rgba(37,99,235,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
    borderBottom: '1px solid #1d4ed8'
  };
  MR.S.btnMiniS = {
    background: 'linear-gradient(180deg, #34d399 0%, #10b981 40%, #059669 100%)',
    color: '#fff', boxShadow: '0 2px 8px -1px rgba(16,185,129,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
    borderBottom: '1px solid #047857'
  };
  MR.S.btnMiniD = {
    background: 'linear-gradient(180deg, #f87171 0%, #ef4444 40%, #dc2626 100%)',
    color: '#fff', boxShadow: '0 2px 8px -1px rgba(239,68,68,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
    borderBottom: '1px solid #b91c1c'
  };
  MR.S.btnMiniW = {
    background: 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 40%, #d97706 100%)',
    color: '#000', boxShadow: '0 2px 8px -1px rgba(245,158,11,0.4), inset 0 1px 0 rgba(255,255,255,0.25)',
    borderBottom: '1px solid #b45309'
  };

  /* BADGE */
  MR.S.badge = c => ({
    padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 800,
    background: `${c}18`, color: c, border: 'none',
    display: 'inline-block'
  });

  /* DOM GÜNCELLEMELERİ */
  document.body.style.background = C.bgGradient || C.bg;
  document.body.style.color = C.text;
  const selStyle = document.getElementById('mr-select-style');
  if (selStyle) selStyle.textContent = `select option{background:${C.bgCard};color:${C.text}}`;
};

MR.setTema = (t) => {
  MR.tema = t;
  localStorage.setItem('mr_tema', t);
  Object.assign(MR.C, MR.TEMALAR[t] || MR.TEMALAR.koyu);
  /* Body tema sınıfı — CSS hover kuralları için */
  document.body.classList.remove('tema-koyu', 'tema-acik');
  document.body.classList.add(t === 'koyu' ? 'tema-koyu' : 'tema-acik');
  MR._stilGuncelle();
};

// ═══ STİLLER ═══
MR.S = {
  page: { minHeight: '100vh', background: MR.C.bgGradient || MR.C.bg, color: MR.C.text },

  /* KART */
  card: {
    background: MR.C.bgCard,
    borderRadius: 16, border: `1px solid ${MR.C.border}`,
    overflow: 'hidden', boxShadow: MR.C.cardShadow,
    transition: 'box-shadow .2s ease, transform .2s ease'
  },

  cardHead: {
    padding: '16px 22px', borderBottom: `1px solid ${MR.C.border}`,
    display: 'flex', alignItems: 'center', gap: 10,
    fontSize: 15, fontWeight: 800
  },

  cardBody: { padding: 22 },

  /* INPUT */
  input: {
    width: '100%', padding: '12px 16px',
    background: MR.C.bgInput,
    border: `1px solid ${MR.C.border}`,
    borderRadius: 8, color: MR.C.text, fontSize: 14, fontWeight: 600,
    outline: 'none', boxSizing: 'border-box',
    boxShadow: MR.C.inputShadow,
    transition: 'border-color .2s, box-shadow .2s'
  },

  select: {
    width: '100%', padding: '12px 16px',
    background: MR.C.bgInput,
    border: `1px solid ${MR.C.border}`,
    borderRadius: 8, color: MR.C.text, fontSize: 14, fontWeight: 600,
    outline: 'none', boxSizing: 'border-box',
    boxShadow: MR.C.inputShadow
  },

  label: { fontSize: 13, fontWeight: 800, color: MR.C.textSec, marginBottom: 7, display: 'block', letterSpacing: 0.5 },

  /* BUTON — 3D MAVİ SİSTEM */
  btn: {
    padding: '12px 24px', borderRadius: 10, border: 'none',
    fontWeight: 800, fontSize: 14, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 8,
    transition: 'all .15s ease',
    position: 'relative',
    letterSpacing: 0.3,
    textShadow: '0 1px 2px rgba(0,0,0,0.15)'
  },
  btnP: {
    background: 'linear-gradient(180deg, #60a5fa 0%, #3b82f6 40%, #2563eb 100%)',
    color: '#fff', fontWeight: 800, border: 'none',
    boxShadow: '0 4px 14px -2px rgba(37,99,235,0.55), 0 2px 4px -1px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.25)',
    borderBottom: '2px solid #1d4ed8'
  },
  btnS: {
    background: 'linear-gradient(180deg, #60a5fa 0%, #3b82f6 40%, #2563eb 100%)',
    color: '#fff', fontWeight: 800, border: 'none',
    boxShadow: '0 4px 14px -2px rgba(37,99,235,0.55), 0 2px 4px -1px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.25)',
    borderBottom: '2px solid #1d4ed8'
  },
  btnW: {
    background: 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 40%, #d97706 100%)',
    color: '#000', fontWeight: 800, border: 'none',
    boxShadow: '0 4px 14px -2px rgba(245,158,11,0.5), 0 2px 4px -1px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.3)',
    borderBottom: '2px solid #b45309'
  },
  btnD: {
    background: 'linear-gradient(180deg, #f87171 0%, #ef4444 40%, #dc2626 100%)',
    color: '#fff', fontWeight: 800, border: 'none',
    boxShadow: '0 4px 14px -2px rgba(239,68,68,0.5), 0 2px 4px -1px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2)',
    borderBottom: '2px solid #b91c1c'
  },
  btnG: {
    background: 'linear-gradient(180deg, rgba(100,116,139,0.15) 0%, rgba(100,116,139,0.08) 100%)',
    color: MR.C.textSec, fontWeight: 700,
    border: `1px solid ${MR.C.border}`,
    boxShadow: '0 2px 6px -1px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.05)'
  },
  /* Mini buton (evrak listesi, tablo içi) */
  btnMini: {
    padding: '5px 10px', borderRadius: 7, border: 'none',
    fontWeight: 700, fontSize: 9, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 3,
    transition: 'all .15s ease', position: 'relative',
    textShadow: '0 1px 1px rgba(0,0,0,0.12)'
  },
  btnMiniP: {
    background: 'linear-gradient(180deg, #60a5fa 0%, #3b82f6 40%, #2563eb 100%)',
    color: '#fff', boxShadow: '0 2px 8px -1px rgba(37,99,235,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
    borderBottom: '1px solid #1d4ed8'
  },
  btnMiniS: {
    background: 'linear-gradient(180deg, #34d399 0%, #10b981 40%, #059669 100%)',
    color: '#fff', boxShadow: '0 2px 8px -1px rgba(16,185,129,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
    borderBottom: '1px solid #047857'
  },
  btnMiniD: {
    background: 'linear-gradient(180deg, #f87171 0%, #ef4444 40%, #dc2626 100%)',
    color: '#fff', boxShadow: '0 2px 8px -1px rgba(239,68,68,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
    borderBottom: '1px solid #b91c1c'
  },
  btnMiniW: {
    background: 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 40%, #d97706 100%)',
    color: '#000', boxShadow: '0 2px 8px -1px rgba(245,158,11,0.4), inset 0 1px 0 rgba(255,255,255,0.25)',
    borderBottom: '1px solid #b45309'
  },
  btnMiniG: {
    background: 'linear-gradient(180deg, rgba(100,116,139,0.18) 0%, rgba(100,116,139,0.08) 100%)',
    color: MR.C.textSec, border: `1px solid ${MR.C.border}`,
    boxShadow: '0 1px 4px -1px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.04)'
  },

  /* BADGE */
  badge: c => ({
    padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 800,
    background: `${c}18`, color: c, border: 'none',
    display: 'inline-block'
  }),

  /* STAT KARTI */
  stat: {
    background: MR.C.bgCard,
    borderRadius: 16, padding: '18px 20px',
    border: `1px solid ${MR.C.border}`,
    boxShadow: MR.C.statShadow,
    transition: 'box-shadow .2s ease, transform .2s ease'
  }
};

// İLK TEMA UYGULAMASI
MR._stilGuncelle();
/* Body tema sınıfı — CSS hover kuralları için */
document.body.classList.add(MR.tema === 'koyu' ? 'tema-koyu' : 'tema-acik');
