import {randomInt,randomUUID} from 'node:crypto';
import {BOARD,CHANCES,REWARDS,COLORS,GIFTS} from './data.mjs';
export const money=n=>Math.round(n);
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
export function newRoom(code,account){return {code,version:0,status:'lobby',host:account.id,players:[player(account,0)],properties:BOARD.map(()=>({owner:null,level:0,style:'home',mortgage:0})),current:0,round:1,roundLimit:50,phase:'roll',inflation:1,index:1,interestBoost:0,dice:[1],logs:[],offers:[],decks:{chance:shuffle(CHANCES.map((_,i)=>i)),reward:shuffle(REWARDS.map((_,i)=>i))},victory:null,winner:null,winners:[],finishReason:null,paused:false,card:null,pending:null};}
function player(a,i){return {id:a.id,name:a.name,avatar:a.avatar,color:COLORS[i],cash:25000,loan:0,rescueDebt:0,pos:0,jail:0,exitCards:0,lastGiftRound:0,lastBuildRound:0,buildDiscount:0,interestFree:false,interestHalf:false,rentBonus:0,rentCut:false,rentCollected:0,jailVisits:0,passes:0};}
export function joinRoom(s,a){assert(s.status==='lobby','Başlamış oyuna yeni oyuncu alınamaz.');assert(s.players.length<6,'Oda dolu (en fazla 6 kişi).');if(!s.players.some(p=>p.id===a.id))s.players.push(player(a,s.players.length));}
export function log(s,text){s.logs.push({id:randomUUID(),text,at:Date.now()});if(s.logs.length>160)s.logs.shift();}
export function value(s,i){const b=BOARD[i],p=s.properties[i];return money((b.price+p.level*buildBase(b,p.style))*s.index);}
const buildBase=(b,style)=>money(b.price*.35*(style==='farm'?.7:1));
export function buildCost(s,i,style){const b=BOARD[i],prop=s.properties[i],owner=s.players.find(p=>p.id===prop.owner);return Math.max(0,money(buildBase(b,style||prop.style)*s.index)-(owner?.buildDiscount||0));}
export function assets(s,p){return s.properties.reduce((n,x,i)=>n+(x.owner===p.id?value(s,i):0),0);}
export const mortgageDebt=(s,p)=>s.properties.reduce((n,x)=>n+(x.owner===p.id?x.mortgage:0),0);
export const netWorth=(s,p)=>p.cash+assets(s,p)-p.loan-p.rescueDebt-mortgageDebt(s,p);
export function creditLimit(s,p){return Math.max(0,money(s.properties.reduce((n,x,i)=>n+(x.owner===p.id&&!x.mortgage?value(s,i):0),0)*.4)-p.loan);}
export function rent(s,i,dice=s.dice.reduce((a,b)=>a+b,0)){
 const b=BOARD[i],x=s.properties[i];if(!x.owner||x.mortgage)return 0;
 const owned=type=>s.properties.filter((q,j)=>q.owner===x.owner&&!q.mortgage&&BOARD[j].type===type).length;
 if(b.type==='station')return money([0,200,450,900,1800][owned('station')]*s.index);
 if(['water','electric'].includes(b.type))return money(dice*40*(owned('water')&&owned('electric')?2:1)*s.index);
 return money(b.baseRent*[1,2,3,5,7,10,14][x.level]*(x.style==='farm'&&x.level?.75:1)*s.index);
}
export function publicState(s,online=[]){return {...s,decks:undefined,players:s.players.map(p=>({...p,online:online.includes(p.id),assets:assets(s,p),net:netWorth(s,p),mortgageDebt:mortgageDebt(s,p),credit:creditLimit(s,p)})),properties:s.properties.map((p,i)=>({...p,value:value(s,i),rent:rent(s,i),buildCost:buildCost(s,i),sell:Math.max(0,money(value(s,i)*.7)-p.mortgage),mortgageOffer:money(value(s,i)*.5)})),board:BOARD,gifts:GIFTS};}
function victory(s,completedRound=null){
 if(s.status==='finished')return;
 const sound=s.players.filter(p=>p.rescueDebt===0),candidate=sound.length===1?sound[0].id:null;
 if(!candidate){s.victory=null;return;}
 if(s.victory?.id!==candidate)s.victory={id:candidate,since:s.round,rounds:0};
 else if(completedRound!==null&&s.victory.since<completedRound){s.victory.rounds++;if(s.victory.rounds>=2){s.winner=candidate;s.winners=[candidate];s.finishReason='survival';s.status='finished';s.phase='end';log(s,`${sound[0].name} iki tam tur boyunca ayakta kaldı ve kazandı!`);}}
}
function passStart(s,p){const farm=s.properties.reduce((n,x)=>n+(x.owner===p.id&&x.style==='farm'&&!x.mortgage?x.level*150:0),0);p.cash+=2500+farm;p.passes++;log(s,`${p.name} başlangıçtan geçti: +${2500+farm} ₺${farm?' (çiftlik üretimi dahil)':''}.`);}
function move(s,p,steps){const target=p.pos+steps;if(steps>0&&target>=48)passStart(s,p);p.pos=(target%48+48)%48;}
function goto(s,p,target,earn=true){if(earn&&target<=p.pos)passStart(s,p);p.pos=target;}
function jail(s,p){s.phase='end';if(p.exitCards>0){p.exitCards--;log(s,`${p.name} Silivri tedbir kartıyla cezaevine girmedi.`);return;}p.pos=12;p.jail=2;p.jailVisits++;log(s,`${p.name} Silivri’ye girdi. Sonraki iki tam tur oyuna katılamaz; sırası otomatik geçilir.`);}
function pay(s,p,amount,reason,to=null,credit=amount){
 amount=money(amount);credit=money(credit);s.phase='end';
 if(p.cash<amount){s.pending={amount,reason,to,credit};s.phase='rescue';log(s,`${p.name}: ${reason} için ${amount} ₺ gerekiyor. Banka seçenekleri açıldı.`);return;}
 p.cash-=amount;if(to){const owner=s.players.find(x=>x.id===to);owner.cash+=credit;owner.rentCollected+=credit;s.lastRentPayment={id:randomUUID(),from:p.id,to,property:p.pos,amount,credit,reason};}
 log(s,`${p.name} ${reason}: −${amount} ₺${to?`; ${s.players.find(x=>x.id===to).name} +${credit} ₺`:''}.`);
}
function land(s,p,allowCard=true){
 const b=BOARD[p.pos],x=s.properties[p.pos];s.phase='end';log(s,`${p.name}, ${b.name} karesinde.`);
 if(b.price){if(!x.owner){s.phase='buy';return;}if(x.owner!==p.id&&!x.mortgage){let amount=rent(s,p.pos),credit=amount;const owner=s.players.find(z=>z.id===x.owner);if(owner.rentCut){amount=money(amount*.75);owner.rentCut=false;}if(owner.rentBonus){credit+=owner.rentBonus;owner.rentBonus=0;}pay(s,p,amount,`${b.name} kirası`,x.owner,credit);}return;}
 if(b.type==='gotojail')jail(s,p);
 else if(b.type==='tax')pay(s,p,money(b.baseRent*s.index),b.name);
 else if(allowCard&&['chance','reward'].includes(b.type)){
  const kind=b.type,list=kind==='chance'?CHANCES:REWARDS;if(!s.decks[kind].length)s.decks[kind]=shuffle(list.map((_,i)=>i));const id=s.decks[kind].pop();s.card={...list[id],kind,id,drawId:randomUUID()};s.phase='card';
 }
}
function applyCard(s,p){const c=s.card;log(s,`${p.name} kart çevirdi: ${c.title} — ${c.text}`);s.phase='end';
 const farm=s.properties.reduce((n,x)=>n+(x.owner===p.id&&x.style==='farm'?x.level:0),0);
 const cash=n=>{if(n>=0){p.cash+=n;log(s,`${p.name}: +${n} ₺.`);}else pay(s,p,-n,c.title);};
 switch(c.effect){
 case 'cash':cash(c.value);break;
 case 'exit':p.exitCards++;break;
 case 'buildDiscount':p.buildDiscount+=c.value;break;
 case 'rentBonus':p.rentBonus+=c.value;break;
 case 'interestFree':p.interestFree=true;break;
 case 'interestHalf':p.interestHalf=true;break;
 case 'rentCut':p.rentCut=true;break;
 case 'farmReward':cash(Math.min(1500,farm*100));break;
 case 'farmCost':cash(-Math.min(900,farm*150));break;
 case 'plazaCost':cash(-Math.min(1500,s.properties.reduce((n,x)=>n+(x.owner===p.id&&x.style==='home'&&x.level===6?6*250:0),0)));break;
 case 'propertyTax':cash(-Math.min(1200,s.properties.filter(x=>x.owner===p.id).length*120));break;
 case 'interestUp':s.interestBoost=1;break;
 case 'inflation':s.inflation=Math.min(4,Math.max(0,s.inflation+c.value));break;
 case 'jail':jail(s,p);break;
 case 'back':move(s,p,-c.value);land(s,p,false);break;
 case 'hatay':goto(s,p,20);land(s,p,false);break;
 case 'station':goto(s,p,[5,17,29,41].find(i=>i>p.pos)??5);land(s,p,false);break;
 case 'start':p.pos=0;passStart(s,p);land(s,p,false);break;
 }
}
function roundEnd(s){const completed=s.round;
 s.index=Math.min(1.6,s.index*(1+s.inflation/100));
 for(const p of s.players){const rate=(3+s.interestBoost)/100*(p.interestFree?0:p.interestHalf?.5:1);const interest=money((p.loan+p.rescueDebt)*rate);if(p.rescueDebt)p.rescueDebt+=interest;else p.loan+=interest;p.interestFree=false;p.interestHalf=false;if(interest)log(s,`${p.name}: ${interest} ₺ faiz borca eklendi.`);}
 s.interestBoost=0;victory(s,completed);
 if(s.status==='finished')return;
 if(completed>=(s.roundLimit??50)){
  const best=Math.max(...s.players.map(p=>netWorth(s,p)));
  s.winners=s.players.filter(p=>netWorth(s,p)===best).map(p=>p.id);s.winner=s.winners[0];
  s.finishReason='roundLimit';s.status='finished';s.phase='end';s.offers=[];
  log(s,`${completed} tam tur tamamlandı. ${s.players.filter(p=>s.winners.includes(p.id)).map(p=>p.name).join(' ve ')} ${best} ₺ net servetle ${s.winners.length>1?'birinciliği paylaştı':'kazandı'}!`);return;
 }
 s.round++;s.offers=s.offers.filter(o=>o.expiresRound>=s.round);log(s,`${s.round}. tam tur. Enflasyon %${s.inflation}; fiyat endeksi ${s.index.toFixed(3)}.`);
}
function advanceTurn(s){
 do {
  s.current=(s.current+1)%s.players.length;s.phase='roll';
  if(s.current===0)roundEnd(s);if(s.status==='finished')return;
  const next=s.players[s.current];if(next.jail===0)return;
  next.jail--;log(s,`${next.name} Silivri’de: bu tam tur sırası otomatik geçildi. ${next.jail?next.jail+' tam tur daha bekleyecek.':'Sonraki tur oyuna dönecek.'}`);
 }while(s.status==='playing');
}
export function act(s,id,a,rng=()=>randomInt(1,7)){
 const p=s.players.find(x=>x.id===id);assert(p,'Bu odada değilsiniz.');
 if(a.type==='start'){assert(s.host===id&&s.status==='lobby','Oyunu yalnızca oda sahibi başlatabilir.');assert(s.players.length>=2,'En az iki oyuncu gerekiyor.');s.status='playing';log(s,'Türkiye Emlak başladı. Herkese 25.000 ₺!');return;}
 if(a.type==='pause'){assert(s.host===id&&s.status==='playing','Duraklatmayı oda sahibi yönetir.');s.paused=!s.paused;log(s,s.paused?'Çay molası. Oyun duraklatıldı.':'Oyun devam ediyor.');return;}
 assert(s.status==='playing','Oyun henüz başlamadı veya sona erdi.');assert(!s.paused,'Oyun duraklatıldı.');assert(s.players[s.current].id===id,'Şu anda sıra sizde değil.');
 const propIndex=Number(a.property),x=s.properties[propIndex],b=BOARD[propIndex];
 const owned=()=>assert(x&&x.owner===id,'Bu tapu size ait değil.');
 const management=()=>{assert(p.jail===0,'Silivri’de iki tam tur boyunca işlem yapılamaz.');assert(['roll','end','buy','rescue'].includes(s.phase),'Önce kartı çevirin.');};
 const amount=()=>{assert(Number.isSafeInteger(a.amount)&&a.amount>0&&a.amount<=10000000,'Geçerli bir tam TL tutarı girin.');return a.amount;};
 switch(a.type){
 case 'roll':{
  assert(p.jail===0,'Silivri’de zar atılamaz; sıra otomatik geçilir.');assert(s.phase==='roll','Bu hamlede zar zaten atıldı.');s.card=null;const d=[rng()];assert(Number.isInteger(d[0])&&d[0]>=1&&d[0]<=6,'Zar 1–6 arasında olmalı.');s.dice=d;
  log(s,`${p.name} zar attı: ${d[0]}.`);
  move(s,p,d[0]);land(s,p);break;
 }
 case 'gift':management();assert(s.phase!=='rescue','Önce bekleyen ödemenizi tamamlayın.');{
  const gift=GIFTS.find(g=>g.id===a.gift),target=s.players.find(q=>q.id===a.to);
  assert(gift,'Hediye bulunamadı.');assert(target&&target.id!==id,'Başka bir oyuncu seçin.');
  assert(p.lastGiftRound!==s.round,'Her tam turda yalnızca bir hediye gönderebilirsiniz.');
  assert(p.cash>=gift.price,'Hediye için nakit yetersiz.');
  p.cash-=gift.price;target.cash+=gift.price/2;p.lastGiftRound=s.round;
  s.lastGift={id:randomUUID(),from:id,to:target.id,gift:gift.id,price:gift.price,amount:gift.price/2,round:s.round};
  log(s,`${p.name}, ${target.name} için ${gift.name} gönderdi: −${gift.price} ₺; alıcıya +${gift.price/2} ₺.`);
 }break;
 case 'card':assert(s.phase==='card','Çevrilecek kart yok.');applyCard(s,p);break;
 case 'buy':{const i=p.pos;assert(s.phase==='buy'&&!s.properties[i].owner,'Bu mülk şu anda satın alınamaz.');const price=money(BOARD[i].price*s.index);assert(p.cash>=price,'Nakit yetersiz. Bankayı açabilirsiniz.');p.cash-=price;s.properties[i].owner=id;s.phase='end';log(s,`${p.name}, ${BOARD[i].name} tapusunu ${price} ₺ karşılığında aldı.`);break;}
 case 'decline':assert(s.phase==='buy','Satın alma kararı yok.');s.phase='end';break;
 case 'build':management();owned();assert(s.phase!=='rescue','Önce ödemeyi çözün.');assert(b.type==='city'&&!x.mortgage&&x.level<6,'Bu tapu geliştirilemiyor.');assert(p.lastBuildRound!==s.round,'Her tam turda en çok bir yapı yükseltmesi.');assert(['home','farm'].includes(a.style),'Gelişim türünü seçin.');assert(x.level===0||x.style===a.style,'İlk yapıdan sonra gelişim yolu değişmez.');{const cost=buildCost(s,propIndex,a.style);assert(p.cash>=cost,'İnşaat için nakit yetersiz.');p.cash-=cost;p.buildDiscount=0;x.style=a.style;x.level++;p.lastBuildRound=s.round;log(s,`${p.name}, ${b.name} ${a.style==='farm'?'çiftliğini':'yapısını'} ${x.level}. seviyeye yükseltti: ${cost} ₺.`);}break;
 case 'loan':management();{const n=amount();assert(n<=creditLimit(s,p),'Kredi limiti aşılıyor.');p.loan+=n;p.cash+=n;log(s,`${p.name} ${n} ₺ kredi çekti. Sonraki tam tur normal faiz %3.`);}break;
 case 'repay':management();{const n=amount();assert(n<=p.cash&&n<=p.loan+p.rescueDebt,'Ödeme tutarı nakdi veya borcu aşıyor.');p.cash-=n;const rescue=Math.min(n,p.rescueDebt);p.rescueDebt-=rescue;p.loan-=n-rescue;log(s,`${p.name} ${n} ₺ borç ödedi.`);}break;
 case 'mortgage':management();owned();assert(!x.mortgage,'Tapu zaten ipotekli.');{const n=money(value(s,propIndex)*.5);const remaining=s.properties.reduce((sum,q,i)=>sum+(q.owner===id&&!q.mortgage&&i!==propIndex?value(s,i):0),0);assert(p.loan<=money(remaining*.4),'Bu ipotek mevcut kredinin teminatını yetersiz bırakır. Önce krediyi azaltın.');x.mortgage=n;p.cash+=n;log(s,`${p.name}, ${b.name} için ${n} ₺ ipotek aldı; kira durdu.`);}break;
 case 'unmortgage':management();owned();assert(x.mortgage>0,'Tapu ipotekli değil.');{const n=money(x.mortgage*1.1);assert(p.cash>=n,'İpotek kapatmaya nakit yetmiyor.');p.cash-=n;x.mortgage=0;log(s,`${p.name}, ${b.name} ipoteğini ${n} ₺ ile kaldırdı.`);}break;
 case 'sell':management();owned();{const gross=money(value(s,propIndex)*.7),net=gross-x.mortgage;assert(net>=0,'Satış ipoteği karşılamıyor.');const remaining=s.properties.reduce((sum,q,i)=>sum+(q.owner===id&&!q.mortgage&&i!==propIndex?value(s,i):0),0);const repay=Math.min(p.loan,Math.max(0,p.loan-money(remaining*.4)));assert(p.cash+net>=repay,'Satış sonrası kredi teminatı yetmiyor.');p.cash+=net-repay;p.loan-=repay;s.properties[propIndex]={owner:null,level:0,style:'home',mortgage:0};log(s,`${p.name}, ${b.name} mülkünü bankaya sattı: net ${net} ₺; ${repay} ₺ kredi otomatik kapandı.`);}break;
 case 'settle':assert(s.phase==='rescue'&&s.pending,'Bekleyen ödeme yok.');{const due=s.pending;assert(p.cash>=due.amount,'Ödeme için nakit hâlâ yetersiz.');s.pending=null;pay(s,p,due.amount,due.reason,due.to,due.credit);}break;
 case 'rescue':assert(s.phase==='rescue'&&s.pending,'Kurtarma gerekmiyor.');{const due=s.pending,needed=Math.max(0,due.amount+1500-p.cash);p.rescueDebt+=needed;p.cash+=needed;s.pending=null;pay(s,p,due.amount,due.reason,due.to,due.credit);log(s,`${p.name} banka kurtarmasında: ${needed} ₺ kurtarma borcu, en az 1.500 ₺ nakitle devam.`);}break;
 case 'offer':management();assert(s.phase!=='rescue','Önce ödemenizi çözün.');{const target=s.players.find(q=>q.id===a.to);assert(target&&target.id!==id,'Teklif alıcısı geçersiz.');const give=a.give===null?null:Number(a.give),take=a.take===null?null:Number(a.take);assert(give!==null||take!==null,'En az bir tapu seçin.');const cash=a.amount;assert(Number.isSafeInteger(cash)&&cash>=0&&cash<=p.cash,'Teklif parası geçersiz.');if(give!==null)assert(s.properties[give]?.owner===id&&!s.properties[give].mortgage,'Verilecek tapu uygun değil.');if(take!==null)assert(s.properties[take]?.owner===target.id&&!s.properties[take].mortgage,'İstenen tapu uygun değil.');assert(s.offers.filter(o=>o.from===id).length<6,'Bu turda en fazla altı teklif.');s.offers.push({id:randomUUID(),from:id,to:target.id,give,take,cash,expiresRound:s.round+1});log(s,`${p.name}, ${target.name} için tapu/para teklifi bıraktı. Alıcı kendi sırasında karar verecek.`);}break;
 case 'offerReply':management();assert(s.phase!=='rescue','Önce ödemenizi çözün.');{const offer=s.offers.find(o=>o.id===a.offer&&o.to===id);assert(offer,'Teklif bulunamadı veya süresi doldu.');if(a.accept){const from=s.players.find(q=>q.id===offer.from);assert(from.cash>=offer.cash,'Teklifi verenin nakdi artık yeterli değil.');for(const [i,owner] of [[offer.give,from.id],[offer.take,id]])if(i!==null)assert(s.properties[i].owner===owner&&!s.properties[i].mortgage,'Teklifteki tapu değişmiş.');const old=structuredClone(s.properties);if(offer.give!==null)s.properties[offer.give].owner=id;if(offer.take!==null)s.properties[offer.take].owner=from.id;const eligible=q=>money(s.properties.reduce((sum,z,i)=>sum+(z.owner===q.id&&!z.mortgage?value(s,i):0),0)*.4);if(from.loan>eligible(from)||p.loan>eligible(p)){s.properties=old;throw Error('Takas kredi teminatını yetersiz bırakıyor.');}from.cash-=offer.cash;p.cash+=offer.cash;log(s,`${p.name}, ${from.name} teklifini kabul etti.`);}else log(s,`${p.name} tapu teklifini reddetti.`);s.offers=s.offers.filter(o=>o.id!==offer.id);}break;
 case 'end':assert(s.phase==='end','Önce ekrandaki kararı tamamlayın.');s.card=null;advanceTurn(s);break;
 default:throw Error('Bilinmeyen işlem.');
 }
 victory(s);
}
