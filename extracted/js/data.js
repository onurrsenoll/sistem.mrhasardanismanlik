/* ============================================================
   MR HASAR DANIŞMANLIK – VERİ DOSYASI (data.js)
   SABİT VERİ TABLOLARI VE REFERANS LİSTELERİ
   ============================================================ */

const MR = window.MR || (window.MR = {});

/* ---------- ASGARİ ÜCRET TABLOSU ---------- */
MR.ASGARI_UCRET = [
  {bas:'2025-01-01',bit:'2025-06-30',ucret:22104.67,donem:'2025/1'},
  {bas:'2024-07-01',bit:'2024-12-31',ucret:17002.12,donem:'2024/2'},
  {bas:'2024-01-01',bit:'2024-06-30',ucret:17002.12,donem:'2024/1'},
  {bas:'2023-07-01',bit:'2023-12-31',ucret:13414.50,donem:'2023/2'},
  {bas:'2023-01-01',bit:'2023-06-30',ucret:10008.00,donem:'2023/1'},
  {bas:'2022-07-01',bit:'2022-12-31',ucret:6471.00,donem:'2022/2'},
  {bas:'2022-01-01',bit:'2022-06-30',ucret:5004.00,donem:'2022/1'},
  {bas:'2021-01-01',bit:'2021-12-31',ucret:3577.50,donem:'2021'},
  {bas:'2020-01-01',bit:'2020-12-31',ucret:2943.00,donem:'2020'},
  {bas:'2019-01-01',bit:'2019-12-31',ucret:2558.40,donem:'2019'}
];

/* ---------- PMF YAŞAM TABLOLARI ---------- */
MR.PMF = {
  TRH2010:{
    E:{0:73.9,5:69.33,10:64.43,15:59.51,20:54.65,25:49.82,30:45,35:40.2,40:35.45,45:30.79,50:26.26,55:21.94,60:17.89,65:14.19,70:10.92,75:8.15,80:5.93,85:4.26,90:3.06,95:2.2,100:1.5},
    K:{0:78.9,5:74.25,10:69.32,15:64.38,20:59.46,25:54.55,30:49.65,35:44.77,40:39.92,45:35.12,50:30.4,55:25.8,60:21.37,65:17.18,70:13.32,75:9.89,80:7,85:4.78,90:3.24,95:2.18,100:1.5}
  },
  CSO1980:{
    E:{0:70.83,5:66.4,10:61.66,15:56.93,20:52.37,25:47.84,30:43.24,35:38.61,40:33.97,45:29.46,50:25.14,55:21.07,60:17.27,65:13.81,70:10.75,75:8.12,80:5.92,85:4.22,90:2.99,95:2.1,100:1.45},
    K:{0:75.83,5:71.28,10:66.4,15:61.51,20:56.64,25:51.8,30:46.98,35:42.19,40:37.46,45:32.79,50:28.23,55:23.84,60:19.68,65:15.8,70:12.27,75:9.18,80:6.59,85:4.59,90:3.14,95:2.12,100:1.45}
  },
  PMF1931:{
    E:{0:59,5:55.94,10:52.19,15:48.3,20:44.42,25:40.55,30:36.71,35:32.94,40:29.22,45:25.58,50:22.03,55:18.61,60:15.35,65:12.3,70:9.49,75:7,80:4.95,85:3.41,90:2.3,95:1.5,100:1},
    K:{0:62,5:58.52,10:54.61,15:50.58,20:46.57,25:42.58,30:38.63,35:34.73,40:30.88,45:27.11,50:23.44,55:19.91,60:16.53,65:13.37,70:10.45,75:7.83,80:5.62,85:3.91,90:2.66,95:1.76,100:1.15}
  }
};

/* ---------- TAHKİM EMSAL KARARLARI ---------- */
MR.TAHKIM_EMSALLERI = [
  {dosyaNo:"K-2022/64863",aracTipi:"ORTA",aracYasi:2,kmOrtalama:45000,onarimBedeli:35432,rayicDeger:450000,degerKaybi:20000,kusurOrani:100,oncekiHasar:0,hasarBolgesi:"ÖN",yontem:"PİYASA RAYİÇ ARAŞTIRMASI"},
  {dosyaNo:"K-2019/79355",aracTipi:"EKONOMİK",aracYasi:5,kmOrtalama:80000,onarimBedeli:45000,rayicDeger:98000,degerKaybi:18000,kusurOrani:100,oncekiHasar:0,hasarBolgesi:"ARKA",yontem:"PERT FARKI"},
  {dosyaNo:"K-2024/317761",aracTipi:"ORTA",aracYasi:4,kmOrtalama:75000,onarimBedeli:120000,rayicDeger:1050000,degerKaybi:50000,kusurOrani:100,oncekiHasar:0,hasarBolgesi:"YAN",yontem:"PERT TOTAL"},
  {dosyaNo:"K-2024/333216",aracTipi:"ORTA",aracYasi:5,kmOrtalama:85000,onarimBedeli:95000,rayicDeger:725000,degerKaybi:35000,kusurOrani:100,oncekiHasar:1,hasarBolgesi:"ARKA",yontem:"PERT TOTAL"},
  {dosyaNo:"K-2024/286826",aracTipi:"EKONOMİK",aracYasi:6,kmOrtalama:110000,onarimBedeli:36697,rayicDeger:380000,degerKaybi:34747,kusurOrani:100,oncekiHasar:0,hasarBolgesi:"ÖN",yontem:"GENEL HASAR"},
  {dosyaNo:"80K-EMSAL-2025",aracTipi:"ORTA",aracYasi:3,kmOrtalama:50000,onarimBedeli:220000,rayicDeger:1500000,degerKaybi:80000,kusurOrani:100,oncekiHasar:0,hasarBolgesi:"ÖN",yontem:"PİYASA KARŞILAŞTIRMA"},
  {dosyaNo:"2025-BMW-KARAR",aracTipi:"PREMİUM",aracYasi:2,kmOrtalama:20000,onarimBedeli:450000,rayicDeger:3000000,degerKaybi:300000,kusurOrani:100,oncekiHasar:0,hasarBolgesi:"ÖN",yontem:"PİYASA KARŞILAŞTIRMA"},
  {dosyaNo:"GETZ-2006",aracTipi:"EKONOMİK",aracYasi:19,kmOrtalama:324468,onarimBedeli:13742,rayicDeger:403333,degerKaybi:4000,kusurOrani:100,oncekiHasar:4,hasarBolgesi:"ÖN",yontem:"NİSBİ YÖNTEM"}
];

/* ---------- BEDENİ HASAR EMSAL KARARLARI ---------- */
MR.BH_EMSAL = [
  {kaynak:'STK',yil:'2024',maluliyet:15,tutar:285000,detay:'%15 MALULİYET, 32 YAŞ'},
  {kaynak:'YARGITAY',yil:'2023',maluliyet:20,tutar:420000,detay:'%20 MALULİYET, 28 YAŞ'},
  {kaynak:'STK',yil:'2024',maluliyet:10,tutar:165000,detay:'%10 MALULİYET, 45 YAŞ'},
  {kaynak:'YARGITAY',yil:'2023',maluliyet:25,tutar:580000,detay:'%25 MALULİYET, 35 YAŞ'},
  {kaynak:'STK',yil:'2024',maluliyet:30,tutar:720000,detay:'%30 MALULİYET, 40 YAŞ'},
  {kaynak:'YARGITAY',yil:'2023',maluliyet:5,tutar:85000,detay:'%5 MALULİYET, 50 YAŞ'}
];

/* ---------- ARAÇ VERİ TABANI (GENİŞLETİLMİŞ) ---------- */
MR.ARAC_DB = {
  "VOLKSWAGEN":{premium:false,modeller:["AMAROK","ARTEON","CADDY","GOLF","ID.3","ID.4","JETTA","PASSAT","POLO","T-CROSS","T-ROC","TIGUAN","TOUAREG","TRANSPORTER"]},
  "RENAULT":{premium:false,modeller:["ARKANA","CAPTUR","CLIO","KADJAR","KANGOO","MEGANE","SCENIC","SYMBOL","TALISMAN","ZOE"]},
  "FIAT":{premium:false,modeller:["500","DOBLO","EGEA","EGEA CROSS","LINEA","PANDA","PUNTO","TIPO"]},
  "FORD":{premium:false,modeller:["COURIER","ECOSPORT","FIESTA","FOCUS","KUGA","MONDEO","PUMA","RANGER","TOURNEO","TRANSIT"]},
  "TOYOTA":{premium:false,modeller:["AURIS","C-HR","CAMRY","COROLLA","COROLLA CROSS","HILUX","RAV4","YARIS","YARIS CROSS"]},
  "HYUNDAI":{premium:false,modeller:["BAYON","ELANTRA","GETZ","I10","I20","I30","IONIQ 5","KONA","SANTA FE","TUCSON"]},
  "HONDA":{premium:false,modeller:["CIVIC","CR-V","HR-V","JAZZ","ACCORD"]},
  "KIA":{premium:false,modeller:["CEED","CERATO","EV6","NIRO","PICANTO","RIO","SORENTO","SPORTAGE","STONIC"]},
  "OPEL":{premium:false,modeller:["ASTRA","COMBO","CORSA","CROSSLAND","GRANDLAND","INSIGNIA","MOKKA"]},
  "PEUGEOT":{premium:false,modeller:["208","2008","301","308","3008","508","5008","PARTNER","RIFTER"]},
  "CITROEN":{premium:false,modeller:["BERLINGO","C3","C3 AIRCROSS","C4","C5 AIRCROSS"]},
  "DACIA":{premium:false,modeller:["DOKKER","DUSTER","JOGGER","LODGY","LOGAN","SANDERO","SPRING"]},
  "SKODA":{premium:false,modeller:["FABIA","KAMIQ","KAROQ","KODIAQ","OCTAVIA","SCALA","SUPERB"]},
  "SEAT":{premium:false,modeller:["ARONA","ATECA","IBIZA","LEON","TARRACO"]},
  "BMW":{premium:true,modeller:["1 SERİSİ","2 SERİSİ","3 SERİSİ","4 SERİSİ","5 SERİSİ","7 SERİSİ","X1","X2","X3","X4","X5","X6","X7","I4","IX"]},
  "MERCEDES-BENZ":{premium:true,modeller:["A SERİSİ","B SERİSİ","C SERİSİ","E SERİSİ","S SERİSİ","CLA","CLS","GLA","GLB","GLC","GLE","GLS","EQA","EQB","EQC","EQE","EQS"]},
  "AUDI":{premium:true,modeller:["A1","A3","A4","A5","A6","A7","A8","Q2","Q3","Q5","Q7","Q8","E-TRON","TT"]},
  "VOLVO":{premium:true,modeller:["S60","S90","V40","V60","V90","XC40","XC60","XC90","C40"]},
  "PORSCHE":{premium:true,modeller:["911","BOXSTER","CAYENNE","CAYMAN","MACAN","PANAMERA","TAYCAN"]},
  "LEXUS":{premium:true,modeller:["CT","ES","IS","LC","LS","NX","RC","RX","UX"]},
  "TESLA":{premium:true,modeller:["MODEL 3","MODEL Y","MODEL S","MODEL X"]},
  "JEEP":{premium:false,modeller:["AVENGER","CHEROKEE","COMPASS","GLADIATOR","GRAND CHEROKEE","RENEGADE","WRANGLER"]},
  "MAZDA":{premium:false,modeller:["2","3","6","CX-3","CX-30","CX-5","CX-60","MX-5"]},
  "NISSAN":{premium:false,modeller:["JUKE","LEAF","MICRA","NAVARA","QASHQAI","X-TRAIL"]}
};

/* ---------- TAHKİM EMSAL VERİTABANI (2024-2025 GENİŞLETİLMİŞ) ---------- */
MR.TAHKIM_DB = [
  {dosyaNo:"2025-BMW-130K",tarih:"03.02.2025",yil:2025,marka:"BMW",model:"3 SERİSİ",aracYili:2023,segment:"premium",km:25000,rayic:3000000,onarim:450000,dk:300000,onceki:0,bolge:"on",kaynak:"hakanmert.av.tr"},
  {dosyaNo:"2025-JEEP-98K",tarih:"15.01.2025",yil:2025,marka:"JEEP",model:"COMPASS",aracYili:2020,segment:"orta",km:56000,rayic:1300000,onarim:105000,dk:98000,onceki:0,bolge:"yan",kaynak:"sigortatahkim.org"},
  {dosyaNo:"2025-AUDI-A3",tarih:"20.01.2025",yil:2025,marka:"AUDI",model:"A3",aracYili:2020,segment:"premium",km:59000,rayic:1800000,onarim:83000,dk:127000,onceki:0,bolge:"yan",kaynak:"tahkim.org"},
  {dosyaNo:"2025-VW-TIGUAN",tarih:"10.02.2025",yil:2025,marka:"VOLKSWAGEN",model:"TIGUAN",aracYili:2021,segment:"orta",km:45000,rayic:1650000,onarim:95000,dk:82000,onceki:1,bolge:"on",kaynak:"sigortatahkim.org"},
  {dosyaNo:"2025-TOYOTA-COROLLA",tarih:"25.01.2025",yil:2025,marka:"TOYOTA",model:"COROLLA",aracYili:2022,segment:"orta",km:35000,rayic:1200000,onarim:55000,dk:48000,onceki:0,bolge:"arka",kaynak:"sonkarar.com"},
  {dosyaNo:"K-2024/317761",tarih:"15.09.2024",yil:2024,marka:"VOLKSWAGEN",model:"PASSAT",aracYili:2019,segment:"orta",km:75000,rayic:1050000,onarim:120000,dk:50000,onceki:0,bolge:"yan",kaynak:"sigortatahkim.org"},
  {dosyaNo:"K-2024/333216",tarih:"20.10.2024",yil:2024,marka:"FORD",model:"FOCUS",aracYili:2018,segment:"orta",km:85000,rayic:725000,onarim:95000,dk:35000,onceki:1,bolge:"arka",kaynak:"sigortatahkim.org"},
  {dosyaNo:"K-2024/286826",tarih:"05.07.2024",yil:2024,marka:"RENAULT",model:"MEGANE",aracYili:2019,segment:"ekonomik",km:110000,rayic:580000,onarim:36697,dk:34747,onceki:0,bolge:"on",kaynak:"sigortatahkim.org"},
  {dosyaNo:"2024-MERCEDES-C",tarih:"12.08.2024",yil:2024,marka:"MERCEDES-BENZ",model:"C SERİSİ",aracYili:2021,segment:"premium",km:40000,rayic:2800000,onarim:280000,dk:224000,onceki:0,bolge:"on",kaynak:"lexpera.com.tr"},
  {dosyaNo:"2024-HYUNDAI-TUCSON",tarih:"18.06.2024",yil:2024,marka:"HYUNDAI",model:"TUCSON",aracYili:2020,segment:"orta",km:68000,rayic:1150000,onarim:72000,dk:57500,onceki:1,bolge:"yan",kaynak:"sonkarar.com"},
  {dosyaNo:"2024-KIA-SPORTAGE",tarih:"22.05.2024",yil:2024,marka:"KIA",model:"SPORTAGE",aracYili:2021,segment:"orta",km:52000,rayic:1380000,onarim:88000,dk:69000,onceki:0,bolge:"on",kaynak:"sigortatahkim.org"},
  {dosyaNo:"2024-FIAT-EGEA",tarih:"10.04.2024",yil:2024,marka:"FIAT",model:"EGEA",aracYili:2020,segment:"ekonomik",km:95000,rayic:620000,onarim:42000,dk:24800,onceki:2,bolge:"arka",kaynak:"sonkarar.com"},
  {dosyaNo:"2024-PEUGEOT-3008",tarih:"28.03.2024",yil:2024,marka:"PEUGEOT",model:"3008",aracYili:2019,segment:"orta",km:78000,rayic:980000,onarim:65000,dk:49000,onceki:1,bolge:"on",kaynak:"sigortatahkim.org"},
  {dosyaNo:"2024-VOLVO-XC60",tarih:"15.02.2024",yil:2024,marka:"VOLVO",model:"XC60",aracYili:2020,segment:"premium",km:55000,rayic:2200000,onarim:180000,dk:154000,onceki:0,bolge:"yan",kaynak:"lexpera.com.tr"},
  {dosyaNo:"2024-HONDA-CIVIC",tarih:"08.03.2024",yil:2024,marka:"HONDA",model:"CIVIC",aracYili:2021,segment:"orta",km:48000,rayic:1280000,onarim:78000,dk:64000,onceki:0,bolge:"on",kaynak:"sonkarar.com"},
  {dosyaNo:"2024-DACIA-DUSTER",tarih:"25.04.2024",yil:2024,marka:"DACIA",model:"DUSTER",aracYili:2021,segment:"ekonomik",km:62000,rayic:780000,onarim:45000,dk:31200,onceki:0,bolge:"on",kaynak:"sigortatahkim.org"},
  {dosyaNo:"2024-SKODA-OCTAVIA",tarih:"12.06.2024",yil:2024,marka:"SKODA",model:"OCTAVIA",aracYili:2020,segment:"orta",km:72000,rayic:920000,onarim:58000,dk:46000,onceki:1,bolge:"arka",kaynak:"sonkarar.com"},
  {dosyaNo:"2024-OPEL-ASTRA",tarih:"30.07.2024",yil:2024,marka:"OPEL",model:"ASTRA",aracYili:2019,segment:"ekonomik",km:88000,rayic:650000,onarim:38000,dk:26000,onceki:2,bolge:"yan",kaynak:"sigortatahkim.org"},
  {dosyaNo:"2024-SEAT-LEON",tarih:"18.08.2024",yil:2024,marka:"SEAT",model:"LEON",aracYili:2020,segment:"orta",km:65000,rayic:850000,onarim:52000,dk:42500,onceki:0,bolge:"on",kaynak:"sonkarar.com"},
  {dosyaNo:"2024-CITROEN-C3",tarih:"05.09.2024",yil:2024,marka:"CITROEN",model:"C3",aracYili:2021,segment:"ekonomik",km:55000,rayic:560000,onarim:32000,dk:22400,onceki:0,bolge:"arka",kaynak:"sigortatahkim.org"}
];

/* ---------- SİGORTA ŞİRKETLERİ ---------- */
MR.SIGORTA = [
  'AXA SİGORTA','ALLİANZ SİGORTA','MAPFRE SİGORTA','HDI SİGORTA',
  'SOMPO SİGORTA','ANADOLU SİGORTA','AK SİGORTA','ZURİCH SİGORTA',
  'GROUPAMA SİGORTA','TÜRK NİPPON SİGORTA','HALK SİGORTA','GÜNEŞ SİGORTA',
  'UNİCO SİGORTA','QUİCK SİGORTA','GENERALİ SİGORTA','DOĞA SİGORTA',
  'MAGDEBURGER SİGORTA','BEREKET SİGORTA','RAY SİGORTA','NEOVA SİGORTA',
  'EUREKO SİGORTA','KORU SİGORTA'
];

/* ---------- İLLER LİSTESİ (81 İL) ---------- */
MR.ILLER = [
  'ADANA','ADIYAMAN','AFYON','AĞRI','AKSARAY','AMASYA','ANKARA','ANTALYA',
  'ARDAHAN','ARTVİN','AYDIN','BALIKESİR','BARTIN','BATMAN','BAYBURT',
  'BİLECİK','BİNGÖL','BİTLİS','BOLU','BURDUR','BURSA','ÇANAKKALE',
  'ÇANKIRI','ÇORUM','DENİZLİ','DİYARBAKIR','DÜZCE','EDİRNE','ELAZIĞ',
  'ERZİNCAN','ERZURUM','ESKİŞEHİR','GAZİANTEP','GİRESUN','GÜMÜŞHANE',
  'HAKKARİ','HATAY','IĞDIR','ISPARTA','İSTANBUL','İZMİR','KAHRAMANMARAŞ',
  'KARABÜK','KARAMAN','KARS','KASTAMONU','KAYSERİ','KIRIKKALE','KIRKLARELİ',
  'KIRŞEHİR','KİLİS','KOCAELİ','KONYA','KÜTAHYA','MALATYA','MANİSA',
  'MARDİN','MERSİN','MUĞLA','MUŞ','NEVŞEHİR','NİĞDE','ORDU','OSMANİYE',
  'RİZE','SAKARYA','SAMSUN','ŞANLIURFA','SİİRT','SİNOP','SİVAS','ŞIRNAK',
  'TEKİRDAĞ','TOKAT','TRABZON','TUNCELİ','UŞAK','VAN','YALOVA','YOZGAT',
  'ZONGULDAK'
];

/* ---------- MASRAF KALEMLERİ ---------- */
MR.MASRAF_K = [
  'VEKALET HARCI','BAŞVURU HARCI','TEBLİGAT GİDERİ','BİLİRKİŞİ ÜCRETİ',
  'KEŞİF GİDERİ','POSTA GİDERİ','DOSYA MASRAFI','FOTOKOPİ / BASKI',
  'ULAŞIM GİDERİ','YEMEK / KONAKLAMA','EKSPERTİZ ÜCRETİ','TERCÜME ÜCRETİ',
  'DAVA HARCI','İCRA HARCI','ARAÇ ÇEKİCİ','OTOPARK ÜCRETİ','DİĞER'
];

/* ---------- EVRAK TÜRLERİ ---------- */
MR.EVRAK_T = [
  'KAZA TESPİT TUTANAĞI','VEKALETNAME','TRAFİK POLİÇESİ','KASKO POLİÇESİ',
  'RUHSAT FOTOKOPİSİ','EHLİYET FOTOKOPİSİ','NÜFUS CÜZDANI','EKSPER RAPORU',
  'FATURA / ONARIM','BİLİRKİŞİ RAPORU','SAĞLIK RAPORU','MALULİYET RAPORU',
  'MAHKEME KARARI','DİLEKÇE','DİĞER'
];
