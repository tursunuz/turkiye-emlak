export const REGIONS = [
  ['Marmara','#6a80da',[['İstanbul',8500],['Bursa',5100],['Kocaeli',4500],['Balıkesir',3400]]],
  ['Ege','#28a9b3',[['İzmir',6900],['Muğla',5600],['Aydın',3200],['Denizli',3000]]],
  ['Akdeniz','#ee9859',[['Antalya',6500],['Adana',4600],['Mersin',4300],['Hatay',3700]]],
  ['İç Anadolu','#ba8bd9',[['Ankara',7000],['Konya',3600],['Kayseri',3300],['Eskişehir',3100]]],
  ['Karadeniz','#57a57c',[['Trabzon',3800],['Samsun',3400],['Ordu',2600],['Rize',2500]]],
  ['Doğu Anadolu','#ce7c8b',[['Erzurum',2600],['Van',2500],['Malatya',2400],['Elazığ',2200]]],
  ['Güneydoğu','#c4a04c',[['Gaziantep',4200],['Diyarbakır',3000],['Şanlıurfa',2800],['Mardin',2700]]]
];
const cities = Object.fromEntries(REGIONS.flatMap(([region,color,list])=>list.map(([name,price])=>[name,{name,type:'city',region,color,price,baseRent:price*.05}])));
const special = (name,type,price=0,baseRent=0,icon='')=>({name,type,price,baseRent,icon,color:'#90a6a3'});
export const BOARD = [
  special('Başlangıç','start',0,0,'⚑'),cities['Balıkesir'],cities['Bursa'],special('Ödül','reward',0,0,'★'),cities['Kocaeli'],special('Haydarpaşa','station',3000,200,'🚂'),cities['İstanbul'],special('Su İdaresi','water',3000,0,'💧'),cities['İzmir'],special('Şans','chance',0,0,'?'),cities['Muğla'],cities['Aydın'],
  special('Silivri Cezaevi','jail',0,0,'▥'),cities['Denizli'],cities['Antalya'],special('Gelir Vergisi','tax',0,1000,'₺'),cities['Adana'],special('Ankara Garı','station',3000,200,'🚂'),cities['Mersin'],special('Ödül','reward',0,0,'★'),cities['Hatay'],special('Elektrik Santrali','electric',3000,0,'ϟ'),cities['Ankara'],cities['Konya'],
  special('Serbest Otopark','park',0,0,'P'),cities['Kayseri'],special('Şans','chance',0,0,'?'),cities['Eskişehir'],cities['Trabzon'],special('İzmir Basmane','station',3000,200,'🚂'),cities['Samsun'],special('Fabrika','factory',4000,450,'⚙'),cities['Ordu'],special('Ödül','reward',0,0,'★'),cities['Rize'],cities['Erzurum'],
  special("Silivri’ye Git",'gotojail',0,0,'→'),cities['Van'],special('Emlak Vergisi','tax',0,1500,'₺'),cities['Malatya'],cities['Elazığ'],special('Adana Garı','station',3000,200,'🚂'),cities['Gaziantep'],special('Şans','chance',0,0,'?'),cities['Diyarbakır'],special('Taksi Durağı','taxi',2600,250,'🚕'),cities['Şanlıurfa'],cities['Mardin']
].map((x,id)=>({...x,id}));
export const AVATARS=['🦊','🐻','🐱','🐼','🦁','🐸','🐰','🐨'];
export const COLORS=['#ed895d','#5b9bd5','#af82d5','#e0b34f','#55b49d','#df7d9c'];
// Kart metinleri önceki V1.4 tasarımından; etkiler sunucuda uygulanır.
const card=(title,text,effect,value=0)=>({title,text,effect,value});
export const REWARDS=[
card('Hatay Dürüm İmparatorluğu','Sosu tutturdun, kuyruk sokağa taştı.','cash',1500),
card("Silivri Tedbiri",'Avukat işi önceden çözdü. Sonraki Silivri cezanı girişte önler.','exit'),
card('Cudy Kralı',"Reklamların %95’ini engelledin, reklamcılar ağlıyor.",'cash',950),
card('Turkcell 5G Mucizesi','Bu sefer 30 saniyeden fazla çekti!','cash',750),
card('Focus Motor Sapasağlam','Usta ilk defa “masraf yok” dedi.','cash',1200),
card('Balıkesir Zeytin Hasadı','Zeytinleri topladın, yağ parası cebinde.','cash',1000),
card('Horon LIVE Patladı','Yayında hediyeler yağdı, kemençeci yoruldu.','cash',1800),
card('Emlakçı Dayıdan Tüyo','“Bu arsa uçacak yeğenim” dedi, bu kez haklı çıktı.','cash',900),
card('Airfryer Ekonomisi','Yağdan tasarruf ettin, bütçe rahatladı.','cash',400),
card('Vergi İadesi','Devlet ilk kez senden para almadı, sana para verdi.','cash',1100),
card('Steam İndirme Rekoru','İnternet sonunda parasının hakkını verdi.','cash',650),
card('Xiaomi Hava Temizleyici','Ekran 001 gösterdi, ev mis gibi oldu.','cash',500),
card('Taksi Durağı Bereketi','Herkes taksiye bindi, kontak kapanmadı.','cash',800),
card('Belediyeden İmar İzni','İmzayı aldın, müteahhit mutlu. Bir inşaatta 1.000 ₺ indirim.','buildDiscount',1000),
card('Bankacı Tanıdık Çıktı','Bu sefer banka senden değil, sen bankadan kazandın.','cash',1250),
card('Benzinlik Kampanyası','Mazot alırken cüzdan ilk defa ağlamadı.','cash',600),
card('Apartman Yöneticisi Ödülü','Aidatı toplayabildin, büyük başarı.','cash',850),
card('Kira Günü Geldi',"Kiracı aramadan IBAN’a yolladı.",'cash',1000),
card('Çiftliğe Bereket Geldi','Tavuklar mesaiye başladı. Çiftlik seviyeleri × 100 ₺; en fazla 1.500 ₺.','farmReward'),
card('İhaleyi Kaptın','Son anda teklif verdin, kimse yetişemedi.','cash',1400),
card('Banka Faiz Affı','Müdürün keyfi yerinde. Bir sonraki kredi faiz tahakkukun silinir.','interestFree'),
card('Sigortadan Güzel Haber','Dosyayı kapattılar, paranı yatırdılar.','cash',1100),
card('Kiracıdan Büyük Jest','“Abi bu ay fazla yatırdım, kalsın.” Sonraki tahsil edilen kiraya +750 ₺.','rentBonus',750),
card('Emlak Fuarı Şampiyonu','Herkes senin projeye yatırım yapmak istiyor.','cash',1300),
card('Büyük İkramiye','“Bugün gerçekten şanslıyım amq!”','cash',2500)
];
export const CHANCES=[
card("Fazla Konuştun, Silivri’ye",'“Silivri soğuktur” dediler, sen dinlemedin.','jail'),
card('H7 LED Patladı','Far güzel aydınlatıyor ama ceza cüzdanı kararttı.','cash',-750),
card('Focus Volant Ses Yapıyor','Usta “kronik abi” dedi, hesap hiç kronik değil.','cash',-1100),
card('Piston Yine El Salladı','Sandık motor bile istifa dilekçesi verdi.','cash',-1500),
card("Turkcell 5G’ye Bağlandın",'30 saniye sonra 4.5G’ye düştü. Hizmet bedeli de cabası.','cash',-350),
card('Zapret Bankayı Engelledi','Her site açılıyor, banka uygulaması açılmıyor amq.','cash',-450),
card('HGS Sürprizi','İskenderun–Adana arasında geçiş ücretleri birikmiş.','cash',-550),
card('Horon Yayını Susturuldu','Kemençe tam coşmuşken yayın kesildi.','cash',-850),
card('İki Dürüm Söyledin','“Bir tane daha yiyelim” dedin, hesap kabardı.','cash',-300),
card('İmar Müdürü Geldi','“Bu plazanın ruhsatı nerede kardeşim?”','cash',-950),
card('Apartman Aidat Kavgası','Yönetici WhatsApp grubunu kilitledi.','cash',-600),
card('Çiftlikten İnek Kaçtı',"Balıkesir’de inek otobüse binmiş. Seviye × 150 ₺; en fazla 900 ₺.",'farmCost'),
card('Merkez Bankası Açıklama Yaptı','“Bir şey olmayacak” dedi, faiz yükseldi. Bir sonraki tam tur faizi +1 puan.','interestUp'),
card('Enflasyon Uçtu','Sabah aldığın tuğla akşam zamlandı. Enflasyon +0,5 puan.','inflation',.5),
card('Yanlış Sapağa Girdin','Navigasyon “yeniden hesaplanıyor” dedi. 3 kare geri.','back',3),
card('Vergi Dairesi Seni Sevdi','Sürekli sana mesaj gönderiyorlar. Tapu × 120 ₺; en fazla 1.200 ₺.','propertyTax'),
card('Plaza Camları Kirlendi','Kat çıktın, temizlik masrafını unuttun. Plaza katı × 250 ₺; en fazla 1.500 ₺.','plazaCost'),
card('Kiracı İndirim İstedi','“Abi bu ay biraz sıkışığım.” Sonraki kira tahsilatın %25 azalır.','rentCut'),
card('Bankacı Fazla Para Verdi','Veznedeki amca yanlış tuşa bastı.','cash',700),
card("Balıkesir’den Zeytin Geldi",'Bu hasat iyi para etti.','cash',600),
card('Reklamları Engelledin','Cudy sonunda kendini amorti etti.','cash',350),
card('Banka Müdürü Akraban Çıktı','“Bu seferlik idare et yeğenim.” Sonraki kredi faizin %50 indirimli.','interestHalf'),
card("Hatay’a Dürüm Yemeye Gidiyorsun",'“Sosunu bol koy usta!” Hatay’a git ve mülk işlemini uygula.','hatay'),
card('Tren Kaçıyor!','Bilet elinde, koş bakalım. En yakın ileri istasyona git.','station'),
card('Yolun Açık Olsun','Bu sefer ne radar var ne trafik. Başlangıca git, 2.500 ₺ al.','start')
];

// Hediye fiyatları sabittir; alıcıya yarısı nakit aktarılır.
export const GIFTS=[
 {id:'tea',name:'Çay',price:100}, {id:'cigarettes',name:'Sigara',price:200},
 {id:'crackers',name:'Kraker',price:120}, {id:'doner',name:'Döner',price:600},
 {id:'coffee',name:'Türk kahvesi',price:240}, {id:'ayran',name:'Ayran',price:140},
 {id:'simit',name:'Simit',price:160}, {id:'baklava',name:'Baklava',price:800},
 {id:'lahmacun',name:'Lahmacun',price:400}, {id:'pizza',name:'Pizza',price:1000}
];
