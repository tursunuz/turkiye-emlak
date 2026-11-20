import test from 'node:test';
import assert from 'node:assert/strict';
import {newRoom,joinRoom,act,value,rent,assets,creditLimit,publicState,netWorth} from '../engine.mjs';
import {BOARD,CHANCES,REWARDS,GIFTS} from '../data.mjs';
const accounts=Array.from({length:6},(_,i)=>({id:'p'+i,name:'Oyuncu '+i,avatar:'🦊'}));
function game(n=2){const s=newRoom('ABCDE',accounts[0]);for(let i=1;i<n;i++)joinRoom(s,accounts[i]);act(s,'p0',{type:'start'});return s;}
const command=(s,a,id=s.players[s.current].id,rng)=>act(s,id,a,rng);
const dice=(...values)=>()=>values.shift();
function endRound(s){const round=s.round;do{s.phase='end';command(s,{type:'end'});}while(s.round===round&&s.status==='playing');}
test('48 kare, 13×13 çerçeve, 28 şehir, 4 köşe, 50 özgün kart',()=>{assert.equal(BOARD.length,48);assert.equal(BOARD.filter(b=>b.type==='city').length,28);assert.deepEqual([0,12,24,36].map(i=>BOARD[i].type),['start','jail','park','gotojail']);for(const [type,n] of [['station',4],['reward',3],['chance',3],['tax',2]])assert.equal(BOARD.filter(b=>b.type===type).length,n);assert.equal(REWARDS.length,25);assert.equal(CHANCES.length,25);assert.equal(new Set([...CHANCES,...REWARDS].map(c=>c.title)).size,50);assert.equal(BOARD[20].name,'Hatay');assert.equal(BOARD[1].name,'Balıkesir');});
test('2–6 kişi, yalnız host başlatır ve sıra korunur',()=>{let s=newRoom('ABCDE',accounts[0]);assert.throws(()=>command(s,{type:'start'}),/En az/);joinRoom(s,accounts[1]);assert.throws(()=>command(s,{type:'start'},'p1'),/oda sahibi/);command(s,{type:'start'});assert.throws(()=>command(s,{type:'roll'},'p1'),/sıra/);s=game(6);assert.throws(()=>joinRoom(s,{id:'x'}),/Başlamış/);assert.equal(s.players[0].cash,25000);});
test('Zar sunucuda: satın alma, otomatik kira, aynı hamlede ikinci zar yok',()=>{const s=game();command(s,{type:'roll'},'p0',dice(2));assert.equal(s.phase,'buy');command(s,{type:'buy'});assert.equal(s.properties[2].owner,'p0');assert.equal(s.players[0].cash,19900);assert.throws(()=>command(s,{type:'roll'}),/zaten/);command(s,{type:'end'});command(s,{type:'roll'},'p1',dice(2));assert.equal(s.players[1].cash,24745);assert.equal(s.players[0].cash,20155);assert.equal(s.players[0].rentCollected,255);});
test('Alınır alınmaz inşaat, oyuncu başına tam turda bir yükseltme',()=>{const s=game();s.properties[1].owner='p0';s.properties[2].owner='p0';command(s,{type:'build',property:1,style:'farm'});assert.equal(s.properties[1].level,1);assert.throws(()=>command(s,{type:'build',property:2,style:'home'}),/en çok/);endRound(s);command(s,{type:'build',property:1,style:'farm'});assert.equal(s.properties[1].level,2);assert.throws(()=>command(s,{type:'build',property:1,style:'home'}));});
test('Başlangıç geliri, çiftlik üretimi ve geriye geçiş geliri yok',()=>{const s=game();s.properties[1]={owner:'p0',level:2,style:'farm',mortgage:0};s.players[0].pos=47;command(s,{type:'roll'},'p0',dice(2));assert.equal(s.players[0].cash,27800);assert.equal(s.players[0].passes,1);s.phase='card';s.card={title:'Geri',text:'',effect:'back',value:3};command(s,{type:'card'});assert.equal(s.players[0].passes,1);});
test('Konut seviyeleri ve çiftlik kira katsayısı',()=>{const s=game();s.properties[1].owner='p0';for(let level=0;level<=6;level++){s.properties[1].level=level;assert.equal(rent(s,1),Math.round(170*[1,2,3,5,7,10,14][level]));}s.properties[1].style='farm';assert.equal(rent(s,1),Math.round(170*14*.75));});
test('İstasyon seti ve su/elektrik çift sahiplik kirası',()=>{const s=game();[5,17,29,41].forEach((i,n)=>{s.properties[i].owner='p0';assert.equal(rent(s,5),[200,450,900,1800][n]);});s.properties[7].owner='p0';assert.equal(rent(s,7,8),320);s.properties[21].owner='p0';assert.equal(rent(s,7,8),640);s.properties[7].mortgage=1500;assert.equal(rent(s,7,8),0);assert.equal(rent(s,21,8),320);});
test('Silivri: ziyaretçi serbest; mahkûmun sonraki iki sırası otomatik geçilir',()=>{
 const s=game(),p=s.players[0];p.pos=10;command(s,{type:'roll'},'p0',dice(2));assert.equal(p.jail,0);
 p.pos=34;s.phase='roll';command(s,{type:'roll'},'p0',dice(2));assert.equal(p.jail,2);assert.equal(p.pos,12);assert.equal(p.cash,25000);
 assert.throws(()=>command(s,{type:'gift',gift:'tea',to:'p1'}),/Silivri/);
 assert.throws(()=>command(s,{type:'loan',amount:1}),/Silivri/);
 assert.throws(()=>command(s,{type:'bail'}));assert.throws(()=>command(s,{type:'exitCard'}));
 command(s,{type:'end'});assert.equal(s.current,1);
 s.phase='end';command(s,{type:'end'});assert.equal(s.round,2);assert.equal(s.current,1);assert.equal(p.jail,1);
 s.phase='end';command(s,{type:'end'});assert.equal(s.round,3);assert.equal(s.current,1);assert.equal(p.jail,0);assert.equal(p.pos,12);
 s.phase='end';command(s,{type:'end'});assert.equal(s.round,4);assert.equal(s.current,0);
 command(s,{type:'roll'},'p0',dice(3));assert.equal(p.pos,15);
});
test('Silivri tedbir kartı girişi önler; cezaevinde erken çıkış yok',()=>{
 const s=game(),p=s.players[0];p.pos=34;p.exitCards=1;command(s,{type:'roll'},'p0',dice(2));
 assert.equal(p.exitCards,0);assert.equal(p.jail,0);assert.equal(p.pos,36);assert.equal(p.cash,25000);
});
test('Herkes Silivri’deyken otomatik pas geçişi sonlanır ve tur sayılır',()=>{
 const s=game(6);for(const p of s.players){p.jail=2;p.pos=12;}s.phase='end';command(s,{type:'end'});
 assert.equal(s.phase,'roll');assert.equal(s.players[s.current].jail,0);assert(s.round>=3);assert.equal(s.status,'playing');
});
test('Kredi limiti, negatif tutarlar, faiz, enflasyon ve endeks sınırı',()=>{const s=game(),p=s.players[0];s.roundLimit=100;s.properties[1].owner='p0';assert.equal(creditLimit(s,p),1360);assert.throws(()=>command(s,{type:'loan',amount:-1}));assert.throws(()=>command(s,{type:'loan',amount:1361}));command(s,{type:'loan',amount:1000});assert.equal(p.cash,26000);endRound(s);assert.equal(p.loan,1030);assert.equal(s.index,1.01);for(let n=0;n<80;n++)endRound(s);assert.equal(s.index,1.6);assert.equal(p.cash,26000);});
test('İpotek kira durdurur, %110 ile kalkar, satış %70 ve teminat kapanışı',()=>{const s=game(),p=s.players[0];s.properties[1].owner='p0';command(s,{type:'mortgage',property:1});assert.equal(p.cash,26700);assert.equal(rent(s,1),0);command(s,{type:'unmortgage',property:1});assert.equal(p.cash,24830);command(s,{type:'loan',amount:1000});command(s,{type:'sell',property:1});assert.equal(p.cash,27210);assert.equal(p.loan,0);assert.equal(s.properties[1].owner,null);});
test('Kredi teminatı ipotekle çift harcanamaz',()=>{const s=game();s.properties[1].owner='p0';command(s,{type:'loan',amount:1000});assert.throws(()=>command(s,{type:'mortgage',property:1}),/teminat/);});
test('Kira ödemesinde önce seçenek, kurtarma minimum 1500 ve alacaklı tam tahsilat',()=>{const s=game(),p=s.players[0],owner=s.players[1];p.cash=100;s.properties[2].owner='p1';command(s,{type:'roll'},'p0',dice(2));assert.equal(s.phase,'rescue');assert.equal(owner.cash,25000);command(s,{type:'rescue'});assert.equal(p.cash,1500);assert.equal(p.rescueDebt,1655);assert.equal(owner.cash,25255);assert.equal(s.players.length,2);p.cash=5000;command(s,{type:'repay',amount:1655});assert.equal(p.rescueDebt,0);});
test('Zorunlu ödemede satış sonrası kurtarmasız devam',()=>{const s=game();s.players[0].cash=10;s.players[0].pos=13;s.properties[1].owner='p0';command(s,{type:'roll'},'p0',dice(2));assert.equal(s.phase,'rescue');command(s,{type:'sell',property:1});command(s,{type:'settle'});assert.equal(s.phase,'end');assert.equal(s.players[0].rescueDebt,0);});
test('Kart hareketi yeni kart zinciri üretmez; başlangıç ödülü bir kez',()=>{const s=game();s.players[0].pos=12;s.phase='card';s.card={title:'Geri',text:'',effect:'back',value:3};const deck=s.decks.chance.length;command(s,{type:'card'});assert.equal(s.players[0].pos,9);assert.equal(s.phase,'end');assert.equal(s.decks.chance.length,deck);s.phase='card';s.card=CHANCES[24];command(s,{type:'card'});assert.equal(s.players[0].cash,27500);assert.equal(s.players[0].pos,0);});
for(const [kind,list] of [['reward',REWARDS],['chance',CHANCES]])for(const [i,c] of list.entries())test(`${kind} ${i+1}: ${c.title}`,()=>{const s=game();s.phase='card';s.card={...c,kind};s.players[0].pos=9;s.players[0].loan=1000;s.properties[1]={owner:'p0',level:6,style:'farm',mortgage:0};command(s,{type:'card'});assert.notEqual(s.phase,'card');assert(s.players.every(p=>Number.isFinite(p.cash)&&p.cash>=0));assert(s.inflation>=0&&s.inflation<=4);if(c.effect==='cash')assert.equal(s.players[0].cash,25000+c.value);if(c.effect==='exit')assert.equal(s.players[0].exitCards,1);});
test('Deste 25 kart bitince yenilenir ve aynı döngüde tekrar yok',()=>{const s=game();const seen=new Set();for(let i=0;i<25;i++){s.phase='roll';s.players[0].pos=1;command(s,{type:'roll'},'p0',dice(2));assert.equal(s.phase,'card');seen.add(s.card.id);command(s,{type:'card'});}assert.equal(seen.size,25);s.phase='roll';s.players[0].pos=1;command(s,{type:'roll'},'p0',dice(2));assert.equal(s.decks.reward.length,24);});
test('Faiz affı ve yarım faiz bir sonraki tahakkukta tüketilir',()=>{const s=game(),p=s.players[0];p.loan=10000;p.interestFree=true;endRound(s);assert.equal(p.loan,10000);assert.equal(p.interestFree,false);p.interestHalf=true;endRound(s);assert.equal(p.loan,10150);endRound(s);assert.equal(p.loan,10455);});
test('Kira indirimi banka tarafından karşılanır, bonus alacaklıya eklenir',()=>{const s=game();s.properties[2].owner='p1';s.players[1].rentCut=true;s.players[1].rentBonus=750;command(s,{type:'roll'},'p0',dice(2));assert.equal(s.players[0].cash,25000-Math.round(255*.75));assert.equal(s.players[1].cash,25000+255+750);assert.equal(s.players[1].rentCut,false);});
test('Takas alıcının onayıyla, sırada ve kredi teminatıyla doğrulanır',()=>{const s=game();s.properties[1].owner='p0';s.properties[2].owner='p1';command(s,{type:'offer',to:'p1',give:1,take:2,amount:500});assert.equal(s.properties[1].owner,'p0');s.phase='end';command(s,{type:'end'});command(s,{type:'offerReply',offer:s.offers[0].id,accept:true});assert.equal(s.properties[1].owner,'p1');assert.equal(s.properties[2].owner,'p0');assert.equal(s.players[0].cash,24500);assert.equal(s.players[1].cash,25500);});
test('Turun son oyuncusunun teklifi sonraki tur alıcıya ulaşır',()=>{const s=game();s.phase='end';command(s,{type:'end'});s.properties[1].owner='p1';command(s,{type:'offer',to:'p0',give:1,take:null,amount:0});s.phase='end';command(s,{type:'end'});assert.equal(s.offers.length,1);command(s,{type:'offerReply',offer:s.offers[0].id,accept:true});assert.equal(s.properties[1].owner,'p0');});
test('Kazanan için kısmi tur sayılmaz; iki tam tur ve kurtarmadan çıkış sıfırlar',()=>{const s=game(5);for(const p of s.players.slice(1))p.rescueDebt=1000;s.phase='end';command(s,{type:'end'});assert.equal(s.victory.rounds,0);endRound(s);assert.equal(s.victory.rounds,0);endRound(s);assert.equal(s.victory.rounds,1);endRound(s);assert.equal(s.status,'finished');assert.equal(s.winner,'p0');const t=game(5);for(const p of t.players.slice(1))p.rescueDebt=1000;t.phase='end';command(t,{type:'end'});endRound(t);endRound(t);assert.equal(t.victory.rounds,1);t.players[1].cash=50000;t.current=1;t.phase='end';command(t,{type:'repay',amount:t.players[1].rescueDebt});assert.equal(t.victory,null);assert.equal(t.status,'playing');});
test('Duraklatma host tarafından, görünür net servet, deste gizli',()=>{const s=game();command(s,{type:'pause'});assert.throws(()=>command(s,{type:'roll'}),/duraklat/);command(s,{type:'pause'});s.properties[1].owner='p0';s.players[0].loan=1000;const pub=publicState(s);assert.equal(pub.players[0].net,27400);assert.equal(pub.decks,undefined);assert.equal(assets(s,s.players[0]),3400);});
test('5 oyuncuyla 2000 hamlelik rastgele simülasyon: nakit negatifleşmez, kayıt JSON döner',()=>{const s=game(5);for(let i=0;i<2000&&s.status==='playing';i++){const p=s.players[s.current];if(s.phase==='roll')command(s,{type:'roll'});else if(s.phase==='buy')command(s,{type:p.cash>=value(s,p.pos)?'buy':'decline'});else if(s.phase==='card')command(s,{type:'card'});else if(s.phase==='rescue')command(s,{type:'rescue'});else{const index=s.properties.findIndex((q,i)=>q.owner===p.id&&!q.mortgage&&q.level<6&&BOARD[i].type==='city');if(p.jail===0&&index>=0&&p.lastBuildRound!==s.round&&p.cash>5000)command(s,{type:'build',property:index,style:'home'});command(s,{type:'end'});}assert(s.players.every(p=>Number.isSafeInteger(p.cash)&&p.cash>=0&&Number.isFinite(p.loan+p.rescueDebt)));assert.equal(s.properties.length,48);assert.equal(s.players.length,5);assert.doesNotThrow(()=>JSON.parse(JSON.stringify(s)));}});

for(let face=1;face<=6;face++)test(`Tek zar ${face}: bir üretim, en fazla altı adım`,()=>{
 const s=game();let calls=0;command(s,{type:'roll'},'p0',()=>{calls++;return face;});
 assert.equal(calls,1);assert.deepEqual(s.dice,[face]);assert.equal(s.players[0].pos,face);
});
for(const count of [2,5,6])test(`${count} kişi: herkes 50 hamle tamamlayınca kesin bitiş`,()=>{
 const s=game(count);assert.equal(s.roundLimit,50);
 for(let round=1;round<=50;round++)for(let player=0;player<count;player++){
  assert.equal(s.status,'playing');assert.equal(s.round,round);assert.equal(s.current,player);
  s.phase='end';command(s,{type:'end'});
 }
 assert.equal(s.status,'finished');assert.equal(s.round,50);assert.equal(s.finishReason,'roundLimit');
 assert.deepEqual(s.winners,s.players.map(p=>p.id));assert.throws(()=>command(s,{type:'roll'}),/sona erdi/);
});
test('Son oyuncunun kararı tamamlanmadan final olmaz; son hamlenin serveti hesaba katılır',()=>{
 const s=game();s.round=50;s.current=1;s.phase='buy';s.players[1].pos=1;
 assert.throws(()=>command(s,{type:'end'}),/kararı/);assert.equal(s.status,'playing');
 command(s,{type:'buy'});command(s,{type:'build',property:1,style:'home'});
 assert.equal(s.status,'playing');command(s,{type:'end'});
 assert.equal(s.status,'finished');assert.deepEqual(s.winners,['p1']);
});
test('Kredi ve ipotek çekmek net serveti yapay olarak artırmaz; tüm borçlar finalde düşülür',()=>{
 const s=game();s.properties[1].owner='p0';s.properties[2].owner='p0';
 const before=netWorth(s,s.players[0]);command(s,{type:'loan',amount:1000});
 assert.equal(netWorth(s,s.players[0]),before);command(s,{type:'mortgage',property:1});
 assert.equal(netWorth(s,s.players[0]),before);
 const pub=publicState(s);assert.equal(pub.players[0].mortgageDebt,1700);assert.equal(pub.players[0].net,before);
 s.players[0].rescueDebt=20000;s.round=50;s.current=1;s.phase='end';command(s,{type:'end'});
 assert.deepEqual(s.winners,['p1']);
});
test('Tur sınırında herkes kurtarmada olsa bile maç biter; negatif net servet karşılaştırılır',()=>{
 const s=game();s.players[0].rescueDebt=50000;s.players[1].rescueDebt=60000;
 s.round=50;s.current=1;s.phase='end';command(s,{type:'end'});
 assert.equal(s.status,'finished');assert.equal(s.finishReason,'roundLimit');assert.deepEqual(s.winners,['p0']);
});

for(const gift of GIFTS)test(`Hediye ${gift.name}: tam fiyat düşer, yarısı alıcıya eklenir`,()=>{
 const s=game();command(s,{type:'gift',gift:gift.id,to:'p1'});
 assert.equal(s.players[0].cash,25000-gift.price);assert.equal(s.players[1].cash,25000+gift.price/2);
 assert.equal(s.lastGift.gift,gift.id);assert.equal(s.lastGift.amount,gift.price/2);
 assert.throws(()=>command(s,{type:'gift',gift:gift.id,to:'p1'}),/yalnızca bir/);
 endRound(s);command(s,{type:'gift',gift:gift.id,to:'p1'});
 assert.equal(s.players[1].cash,25000+gift.price);
});
test('Hediye: geçersiz ürün, kendine hediye, yetersiz nakit, sıra dışı, duraklatma ve kurtarma reddedilir',()=>{
 const s=game();assert.equal(GIFTS.length,10);
 for(const a of [{gift:'wrong',to:'p1'},{gift:'tea',to:'p0'},{gift:'tea',to:'missing'}])assert.throws(()=>command(s,{type:'gift',...a}));
 assert.throws(()=>command(s,{type:'gift',gift:'tea',to:'p0'},'p1'),/sıra/);
 s.players[0].cash=0;assert.throws(()=>command(s,{type:'gift',gift:'tea',to:'p1'}),/nakit/);assert.equal(s.players[0].lastGiftRound,0);
 s.players[0].cash=25000;s.phase='rescue';assert.throws(()=>command(s,{type:'gift',gift:'tea',to:'p1'}),/ödemenizi/);
 s.phase='roll';command(s,{type:'pause'});assert.throws(()=>command(s,{type:'gift',gift:'tea',to:'p1'}),/duraklat/);
 assert.equal(s.players[1].cash,25000);
});
test('Kira makbuzu: gerçekten ödenen tutar; kurtarmadan önce bildirim yok',()=>{
 const s=game();s.properties[2].owner='p1';s.players[1].rentCut=true;
 command(s,{type:'roll'},'p0',dice(2));assert.equal(s.lastRentPayment.amount,Math.round(255*.75));
 assert.equal(s.lastRentPayment.to,'p1');assert.equal(s.lastRentPayment.from,'p0');assert.equal(s.lastRentPayment.property,2);
 const t=game();t.properties[2].owner='p1';t.players[0].cash=0;command(t,{type:'roll'},'p0',dice(2));
 assert.equal(t.lastRentPayment,undefined);command(t,{type:'rescue'});assert.equal(t.lastRentPayment.amount,255);
});
