/**
 * MR HASAR DANIŞMANLIK - NETSANTRAL PROXY WORKER
 * Cloudflare Workers üzerinde çalışır (BEDAVA - 100.000 istek/gün)
 *
 * AMAÇ: cPanel shared hosting port 9111'e bağlanamıyor.
 * Bu worker HTTPS:443 üzerinden gelen istekleri crmsntrl.netgsm.com.tr:9111'e yönlendirir.
 *
 * KURULUM:
 * 1. cloudflare.com hesabı aç (bedava)
 * 2. Workers & Pages > Create Application > Create Worker
 * 3. Bu kodu yapıştır > Deploy
 * 4. Worker URL'sini (ör: netsantral-proxy.HESABINIZ.workers.dev) kopyala
 * 5. CRM Sistem > Netsantral ayarlarına bu URL'yi gir
 *
 * GÜVENLİK: API_KEY ile korunur - sadece sizin CRM erişebilir
 */

const API_KEY = 'MR_HASAR_2026';
const NETSANTRAL_BASE = 'http://crmsntrl.netgsm.com.tr:9111';

export default {
  async fetch(request) {
    /* CORS PREFLİGHT */
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    /* API KEY KONTROLÜ */
    const apiKey = request.headers.get('X-Api-Key') || new URL(request.url).searchParams.get('api_key');
    if (apiKey !== API_KEY) {
      return jsonResponse({ error: 'YETKISIZ ERISIM', code: 401 }, 401);
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      /* /proxy/SANTRAL_NO/KOMUT?params... → crmsntrl.netgsm.com.tr:9111/SANTRAL_NO/KOMUT?params... */
      if (!path.startsWith('/proxy/')) {
        return jsonResponse({
          error: 'GECERSIZ YOL',
          kullanim: '/proxy/{SANTRAL_NO}/{KOMUT}?username=...&password=...&diger_parametreler...',
          ornek: '/proxy/3625026502/originate?username=3625026502&password=SIFRE&customer_num=05551234567&internal_num=102&trunk=3625026502&pbxnum=3625026502&ring_timeout=20&crm_id=1&wait_response=1&originate_order=if&manual_answer=1'
        }, 400);
      }

      /* HEDEF URL OLUŞTUR */
      const proxyPath = path.replace('/proxy/', '');
      const queryString = url.search;
      const targetUrl = `${NETSANTRAL_BASE}/${proxyPath}${queryString}`;

      /* NETSANTRAL'E İSTEĞİ İLET */
      const proxyResponse = await fetch(targetUrl, {
        method: request.method,
        headers: {
          'User-Agent': 'MR-Hasar-CRM/1.0',
          'Accept': '*/*'
        },
        /* GET istekleri için body gönderme */
        ...(request.method !== 'GET' && request.method !== 'HEAD'
          ? { body: await request.text() }
          : {})
      });

      /* YANITI DÖNDÜR */
      const responseText = await proxyResponse.text();

      return new Response(responseText, {
        status: proxyResponse.status,
        headers: {
          'Content-Type': proxyResponse.headers.get('Content-Type') || 'text/plain',
          'Access-Control-Allow-Origin': '*',
          'X-Proxy-Status': 'ok',
          'X-Target-Url': targetUrl.replace(/password=[^&]+/, 'password=***')
        }
      });

    } catch (err) {
      return jsonResponse({
        error: 'PROXY HATASI',
        message: err.message,
        tip: 'crmsntrl.netgsm.com.tr:9111 adresine ulaşılamıyor olabilir'
      }, 502);
    }
  }
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
