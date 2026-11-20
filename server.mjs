import http from 'node:http';
import {readFileSync,mkdirSync,existsSync} from 'node:fs';
import {join,dirname,extname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {networkInterfaces} from 'node:os';
import {randomBytes,randomInt,randomUUID,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {spawn} from 'node:child_process';
import {newRoom,joinRoom,act,publicState,log} from './engine.mjs';
import {AVATARS,BOARD} from './data.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const data=resolve(process.env.DATA_DIR||join(root,'data'));mkdirSync(data,{recursive:true});
const db=new DatabaseSync(join(data,'turkiye-emlak.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
 CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,name TEXT NOT NULL,namekey TEXT UNIQUE NOT NULL,avatar TEXT NOT NULL,salt TEXT NOT NULL,pinhash TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,account TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS rooms(code TEXT PRIMARY KEY,state TEXT NOT NULL,updated INTEGER NOT NULL);`);
db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
const channels=new Map(),attempts=new Map();
const digest=x=>createHash('sha256').update(x).digest('hex');
const cleanAccount=a=>a?{id:a.id,name:a.name,avatar:a.avatar}:null;
function account(req){const cookie=req.headers.cookie||'';const token=/(?:^|;\s*)emlak=([a-f0-9]{64})(?:;|$)/.exec(cookie)?.[1];if(!token)return null;return cleanAccount(db.prepare('SELECT a.* FROM accounts a JOIN sessions s ON s.account=a.id WHERE s.token=? AND s.expires>?').get(digest(token),Date.now()));}
function requireAccount(req){const a=account(req);if(!a)throw Object.assign(Error('Önce adınız ve PIN ile giriş yapın.'),{status:401});return a;}
function room(code,a){if(!/^[A-Z0-9]{5}$/.test(code||''))throw Error('5 karakterli oda kodu girin.');const row=db.prepare('SELECT state FROM rooms WHERE code=?').get(code);if(!row)throw Error('Oda bulunamadı.');const s=JSON.parse(row.state);if(a&&!s.players.some(p=>p.id===a.id))throw Object.assign(Error('Bu odaya katılmadınız.'),{status:403});return s;}
function save(s){s.version++;db.prepare('INSERT INTO rooms(code,state,updated) VALUES(?,?,?) ON CONFLICT(code) DO UPDATE SET state=excluded.state,updated=excluded.updated').run(s.code,JSON.stringify(s),Date.now());broadcast(s);}
function online(code){return [...new Set([...(channels.get(code)||[])].map(c=>c.id))];}
function state(s){return publicState(s,online(s.code));}
function broadcast(s){for(const c of channels.get(s.code)||[])c.res.write(`data: ${JSON.stringify(state(s))}\n\n`);}
const json=(res,status,data,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(data));};
async function body(req){let size=0,data='';for await(const c of req){size+=c.length;if(size>16384)throw Error('İstek çok büyük.');data+=c;}try{return JSON.parse(data||'{}');}catch{throw Error('Geçersiz istek.');}}
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
 try{
  const url=new URL(req.url,'http://localhost'),path=url.pathname;
  if(req.method==='POST'&&req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)throw Object.assign(Error('Bu kaynaktan işleme izin verilmiyor.'),{status:403});
  if(path==='/api/info'&&req.method==='GET'){const ips=Object.values(networkInterfaces()).flat().filter(x=>x&&x.family==='IPv4'&&!x.internal).map(x=>`http://${x.address}:${server.address().port}`);return json(res,200,{urls:ips,avatars:AVATARS,board:BOARD,version:'1.5.0'});}
  if(path==='/api/me'&&req.method==='GET')return json(res,200,{account:account(req)});
  if(path==='/api/login'&&req.method==='POST'){
   const ip=req.socket.remoteAddress,now=Date.now(),rate=attempts.get(ip);if(rate&&rate.until>now&&rate.count>=8)throw Error('Çok fazla hatalı giriş. 10 dakika sonra yeniden deneyin.');
   const {name,pin,avatar}=await body(req);if(typeof name!=='string'||name.trim().length<2||name.trim().length>20||/[\p{C}<>]/u.test(name))throw Error('Adınız 2–20 görünür karakter olmalı.');if(!/^\d{4,8}$/.test(pin))throw Error('PIN 4–8 rakam olmalı.');
   const key=name.trim().normalize('NFKC').toLocaleLowerCase('tr-TR');let row=db.prepare('SELECT * FROM accounts WHERE namekey=?').get(key);
   if(row){const hash=scryptSync(pin,row.salt,32);if(!timingSafeEqual(hash,Buffer.from(row.pinhash,'hex'))){attempts.set(ip,{count:rate&&rate.until>now?rate.count+1:1,until:rate&&rate.until>now?rate.until:now+600000});throw Error('Ad veya PIN hatalı.');}}
   else {if(!AVATARS.includes(avatar))throw Error('Bir avatar seçin.');const salt=randomBytes(16).toString('hex');row={id:randomUUID(),name:name.trim(),namekey:key,avatar,salt,pinhash:scryptSync(pin,salt,32).toString('hex')};db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)').run(row.id,row.name,row.namekey,row.avatar,row.salt,row.pinhash);}
   attempts.delete(ip);const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),row.id,now+90*86400000);
   return json(res,200,{account:cleanAccount(row)},{'Set-Cookie':`emlak=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=7776000`});
  }
  if(path==='/api/logout'&&req.method==='POST'){const a=requireAccount(req);const cookie=/(?:^|;\s*)emlak=([a-f0-9]{64})/.exec(req.headers.cookie||'')?.[1];if(cookie)db.prepare('DELETE FROM sessions WHERE token=?').run(digest(cookie));for(const set of channels.values())for(const c of set)if(c.id===a.id)c.res.end();return json(res,200,{ok:true},{'Set-Cookie':'emlak=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});}
  if(path==='/api/profile'&&req.method==='POST'){const a=requireAccount(req),b=await body(req);if(!AVATARS.includes(b.avatar))throw Error('Geçerli bir portre seçin.');db.prepare('UPDATE accounts SET avatar=? WHERE id=?').run(b.avatar,a.id);for(const row of db.prepare('SELECT state FROM rooms').all()){const s=JSON.parse(row.state),p=s.players.find(p=>p.id===a.id);if(p){p.avatar=b.avatar;save(s);}}return json(res,200,{account:{...a,avatar:b.avatar}});}
  if(path==='/api/rooms'&&req.method==='GET'){const a=requireAccount(req);return json(res,200,{rooms:db.prepare('SELECT state FROM rooms ORDER BY updated DESC LIMIT 100').all().map(x=>JSON.parse(x.state)).filter(s=>s.players.some(p=>p.id===a.id)).map(s=>({code:s.code,status:s.status,round:s.round,names:s.players.map(p=>p.name)}))});}
  if(path==='/api/create'&&req.method==='POST'){const a=requireAccount(req);let code;do{code=Array.from({length:5},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[randomInt(31)]).join('');}while(db.prepare('SELECT code FROM rooms WHERE code=?').get(code));const s=newRoom(code,a);log(s,`${a.name} odayı açtı.`);save(s);return json(res,200,{state:state(s)});}
  if(path==='/api/join'&&req.method==='POST'){const a=requireAccount(req),b=await body(req),s=room(String(b.code||'').trim().toUpperCase());if(!s.players.some(p=>p.id===a.id)){joinRoom(s,a);log(s,`${a.name} odaya katıldı.`);save(s);}return json(res,200,{state:state(s)});}
  if(path==='/api/state'&&req.method==='GET'){const a=requireAccount(req);return json(res,200,{state:state(room(url.searchParams.get('code'),a))});}
  if(path==='/api/events'&&req.method==='GET'){
   const a=requireAccount(req),s=room(url.searchParams.get('code'),a);res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write('retry: 2000\n\n');
   if(!channels.has(s.code))channels.set(s.code,new Set());const client={id:a.id,res};channels.get(s.code).add(client);broadcast(s);
   const timer=setInterval(()=>res.write(': bağlantı canlı\n\n'),15000);req.on('close',()=>{clearInterval(timer);channels.get(s.code)?.delete(client);if(!channels.get(s.code)?.size)channels.delete(s.code);broadcast(room(s.code));});return;
  }
  if(path==='/api/action'&&req.method==='POST'){const a=requireAccount(req),b=await body(req),s=room(b.code,a);if(b.version!==s.version)return json(res,409,{error:'Oyun güncellendi. Ekranı yeniledik; işlemi tekrar seçin.',state:state(s)});act(s,a.id,b.action||{});save(s);return json(res,200,{state:state(s)});}
  if(path.startsWith('/api/'))return json(res,404,{error:'İşlem bulunamadı.'});
  if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Yöntem desteklenmiyor.'});
  // Yalnızca sabit, açıkça izin verilen oyun dosyaları sunulur; veritabanı erişilemez.
  const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/night.css':'night.css','/menu.css':'menu.css','/refinements.css':'refinements.css','/art.js':'art.js','/gifts.js':'gifts.js','/board-night.js':'board-night.js','/favicon.svg':'favicon.svg','/world-night.png':'world-night.png','/portraits.png':'portraits.png','/menu-day.png':'menu-day.png','/cities-atlas.png':'cities-atlas.png','/bank.png':'bank.png','/photos.js':'photos.js','/board-large.js':'board-large.js','/models.js':'models.js','/world-night-v2.png':'world-night-v2.png','/specials.png':'specials.png'};
  const file=files[path]||(/^\/photos\/sehir-\d{2}(?:-kucuk)?\.(jpg|png)$/.test(path)?path.slice(1):null);if(!file||!existsSync(join(root,'public',file))){res.writeHead(404);return res.end('Sayfa bulunamadı.');}
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
  res.writeHead(200,{'Content-Type':mime[extname(file)],'Cache-Control':/\.(png|jpg)$/.test(file)?'public, max-age=86400':'no-cache'});res.end(req.method==='HEAD'?undefined:readFileSync(join(root,'public',file)));
 }catch(e){if(!res.headersSent)json(res,e.status||400,{error:e.message||'İşlem yapılamadı.'});else res.end();}
});
const port=Number(process.env.PORT||3000);
server.listen(port,'0.0.0.0',()=>{console.log(`\nTÜRKİYE EMLAK hazır\nPC: http://localhost:${server.address().port}\nTelefonlar (aynı Wi-Fi):`);for(const x of Object.values(networkInterfaces()).flat())if(x&&x.family==='IPv4'&&!x.internal)console.log(`  http://${x.address}:${server.address().port}`);console.log(`Kayıt: ${join(data,'turkiye-emlak.sqlite')}\nDurdurmak: Ctrl+C. Sonraki açılışta maçlar devam eder.\n`);if(process.env.OPEN_BROWSER==='1'&&process.platform==='win32')spawn('cmd.exe',['/d','/c','start','',`http://localhost:${server.address().port}`],{windowsHide:true,stdio:'ignore'}).unref();});
function shutdown(){for(const set of channels.values())for(const c of set)c.res.end();server.close(()=>{db.close();process.exit(0);});setTimeout(()=>process.exit(0),3000).unref();}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
