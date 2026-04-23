/**
 * MR HASAR DANIŞMANLIK - SERVICE WORKER
 * ARKA PLAN KONUM TAKİBİ + PWA DESTEĞİ
 */

const SW_VERSION = 'mr-sw-v1';
const API_BASE = '/api/v1';

/* ═══ INSTALL ═══ */
self.addEventListener('install', (e) => {
  console.log('[SW] INSTALL - ' + SW_VERSION);
  self.skipWaiting();
});

/* ═══ ACTIVATE ═══ */
self.addEventListener('activate', (e) => {
  console.log('[SW] ACTIVATE - ' + SW_VERSION);
  e.waitUntil(self.clients.claim());
});

/* ═══ ARKA PLAN KONUM TAKİBİ ═══ */

/* Periodic Background Sync - tarayıcı destekliyorsa her ~2dk çalışır */
self.addEventListener('periodicsync', (e) => {
  if (e.tag === 'mr-konum-sync') {
    e.waitUntil(konumGonderArkaPlan());
  }
});

/* Normal Background Sync - çevrimdışıyken biriken konumları gönderir */
self.addEventListener('sync', (e) => {
  if (e.tag === 'mr-konum-sync-once') {
    e.waitUntil(konumGonderArkaPlan());
  }
});

/* Push notification ile konum tetikleme (isteğe bağlı) */
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : {};
  if (data.type === 'konum-iste') {
    e.waitUntil(konumGonderArkaPlan());
  }
});

/* ═══ KONUM AL VE GÖNDER ═══ */
async function konumGonderArkaPlan() {
  try {
    /* Token'ı IndexedDB veya cache'den al */
    const token = await tokenAl();
    if (!token) {
      console.log('[SW] TOKEN YOK, KONUM GÖNDERİLMEDİ');
      return;
    }

    /* Konum al */
    const pos = await new Promise((resolve, reject) => {
      /* NOT: Service Worker'da navigator.geolocation mevcut değildir.
         Bu yüzden son bilinen konumu client'tan alıyoruz */
      reject(new Error('SW_GEO_NOT_AVAILABLE'));
    }).catch(async () => {
      /* Client'tan son konumu iste */
      return await clienttanKonumAl();
    });

    if (!pos) {
      console.log('[SW] KONUM ALINAMADI');
      return;
    }

    /* API'ye gönder */
    const response = await fetch(API_BASE + '/konum/guncelle.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(pos)
    });

    const result = await response.json();
    console.log('[SW] KONUM GÖNDERİLDİ:', result);
  } catch(e) {
    console.log('[SW] KONUM GÖNDERME HATASI:', e.message);
  }
}

/* ═══ CLIENT'TAN KONUM İSTE ═══ */
async function clienttanKonumAl() {
  const clients = await self.clients.matchAll({type: 'window'});

  for (const client of clients) {
    try {
      /* Client'a mesaj gönder, konum iste */
      const response = await new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (e) => resolve(e.data);
        client.postMessage({type: 'KONUM_ISTE'}, [channel.port2]);
        /* 10 sn timeout */
        setTimeout(() => resolve(null), 10000);
      });
      if (response && response.enlem) return response;
    } catch(e) {}
  }

  /* Hiçbir client yoksa localStorage'dan son konumu dene */
  /* NOT: SW'da localStorage erişilemez, bu yüzden null döner */
  return null;
}

/* ═══ TOKEN AL ═══ */
async function tokenAl() {
  /* Client'lardan token iste */
  const clients = await self.clients.matchAll({type: 'window'});
  for (const client of clients) {
    try {
      const response = await new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (e) => resolve(e.data);
        client.postMessage({type: 'TOKEN_ISTE'}, [channel.port2]);
        setTimeout(() => resolve(null), 5000);
      });
      if (response && response.token) return response.token;
    } catch(e) {}
  }
  return null;
}

/* ═══ MESSAGE HANDLER — Client ile iletişim ═══ */
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'KONUM_GUNCELLE') {
    /* Client konum gönderdi, arka planda ilet */
    konumIlet(e.data.konum, e.data.token);
  }
  if (e.data && e.data.type === 'KEEP_ALIVE') {
    /* Keep-alive ping — SW'yi uyanık tut */
    console.log('[SW] KEEP-ALIVE');
  }
});

async function konumIlet(konum, token) {
  if (!konum || !token) return;
  try {
    await fetch(API_BASE + '/konum/guncelle.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(konum)
    });
  } catch(e) {}
}
