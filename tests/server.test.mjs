import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {once} from 'node:events';
const project=fileURLToPath(new URL('..',import.meta.url));
test('5 istemci, canlı yayın, yetkiler, aynı anda istek, yeniden giriş ve SQLite restart',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'emlak-test-'));let child,base;
 const start=async()=>{child=spawn(process.execPath,['server.mjs'],{cwd:project,env:{...process.env,PORT:'0',DATA_DIR:dir},stdio:['ignore','pipe','pipe']});let output='';await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Sunucu başlamadı: '+output)),10000);child.once('error',reject);child.once('exit',()=>reject(Error('Sunucu kapandı: '+output)));child.stderr.on('data',c=>output+=c);child.stdout.on('data',c=>{output+=c;const port=/PC: http:\/\/localhost:(\d+)/.exec(output)?.[1];if(port){base='http://127.0.0.1:'+port;clearTimeout(timer);resolve();}});});};
 const stop=async()=>{if(child&&child.exitCode===null){const exited=once(child,'exit');child.kill();await exited;}};
 t.after(async()=>{await stop();rmSync(dir,{recursive:true,force:true});});
 await start();const cookies=[];
 const req=async(path,data,who=0,headers={})=>{const r=await fetch(base+'/api/'+path,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json'}:{}),...(cookies[who]?{Cookie:cookies[who]}:{}),...headers},body:data?JSON.stringify(data):undefined});const body=await r.json();return {r,body};};
 for(let i=0;i<5;i++){const {r,body}=await req('login',{name:'Test '+i,pin:'1234',avatar:['🦊','🐻','🐱','🐼','🦁'][i]},i);assert.equal(r.status,200);cookies[i]=r.headers.get('set-cookie').split(';')[0];assert(!JSON.stringify(body).includes('pinhash'));}
 let {body:{state:s}}=await req('create',{});const code=s.code;
 for(let i=1;i<5;i++)({body:{state:s}}=await req('join',{code},i));assert.equal(s.players.length,5);
 const outsider=await req('login',{name:'Yabancı',pin:'4567',avatar:'🐸'},5);cookies[5]=outsider.r.headers.get('set-cookie').split(';')[0];assert.equal((await req('state?code='+code,null,5)).r.status,403);
 const live=[];for(let i=0;i<5;i++){const controller=new AbortController();const event=await fetch(base+'/api/events?code='+code,{headers:{Cookie:cookies[i]},signal:controller.signal});const reader=event.body.getReader();let content='';while(!content.includes('data: ')){content+=new TextDecoder().decode((await reader.read()).value);}assert(content.includes(code));live.push({controller,reader});}assert.equal((await req('state?code='+code)).body.state.players.filter(p=>p.online).length,5);for(const {controller,reader} of live){controller.abort();await reader.cancel().catch(()=>{});}
 let denied=await req('action',{code,version:s.version,action:{type:'start'}},1);assert.equal(denied.r.status,400);assert.match(denied.body.error,/oda sahibi/);
 ({body:{state:s}}=await req('action',{code,version:s.version,action:{type:'start'}}));assert.equal(s.status,'playing');
 ({body:{state:s}}=await req('action',{code,version:s.version,action:{type:'gift',gift:'tea',to:s.players[1].id}}));assert.equal(s.players[0].cash,24900);assert.equal(s.players[1].cash,25050);assert.equal(s.gifts.length,10);
 denied=await req('action',{code,version:s.version,action:{type:'roll',id:s.players[0].id}},1);assert.equal(denied.r.status,400);assert.match(denied.body.error,/sıra/);
 const parallel=await Promise.all([req('action',{code,version:s.version,action:{type:'roll',dice:[6,6]}}),req('action',{code,version:s.version,action:{type:'roll',dice:[6,6]}})]);assert.deepEqual(parallel.map(r=>r.r.status).sort(),[200,409]);s=parallel.find(r=>r.r.status===200).body.state;assert.equal(s.dice.length,1);assert(s.dice.every(n=>n>=1&&n<=6));assert.equal(s.roundLimit,50);assert.equal(s.players[0].pos,s.dice[0]);assert.equal(s.version,8);
 assert.equal((await req('action',{code,version:s.version,action:{type:'loan',amount:-1000}})).r.status,400);
 assert.equal((await req('action',{code,version:s.version,action:{type:'pause'}},0,{Origin:'http://evil.invalid'})).r.status,403);
 const secrets=await fetch(base+'/data/turkiye-emlak.sqlite');assert.equal(secrets.status,404);
 for(const path of ['/','/app.js','/gifts.js','/art.js','/style.css'])assert.equal((await fetch(base+path)).status,200);
 for(const path of ['/night.css','/menu.css','/refinements.css','/board-night.js','/board-large.js','/models.js','/world-night.png','/world-night-v2.png','/portraits.png','/menu-day.png','/cities-atlas.png','/bank.png','/specials.png','/photos.js','/photos/sehir-20.jpg','/photos/sehir-20-kucuk.jpg'])assert.equal((await fetch(base+path,{method:'HEAD'})).status,200);
 const before=(await req('state?code='+code)).body.state;await stop();await start();const after=(await req('state?code='+code)).body.state;assert.deepEqual({...after,players:after.players.map(({online,...p})=>p)},{...before,players:before.players.map(({online,...p})=>p)});
 await req('logout',{});assert.equal((await req('me')).body.account,null);assert.equal((await req('login',{name:'Test 0',pin:'9999',avatar:'🦊'})).r.status,400);const relog=await req('login',{name:'Test 0',pin:'1234',avatar:'🐻'});assert.equal(relog.r.status,200);assert.equal(relog.body.account.avatar,'🦊');cookies[0]=relog.r.headers.get('set-cookie').split(';')[0];assert.equal((await req('join',{code})).body.state.players.length,5);
 assert((await req('rooms')).body.rooms.some(r=>r.code===code));
 const profile=await req('profile',{avatar:'🐨'});assert.equal(profile.body.account.avatar,'🐨');assert.equal((await req('state?code='+code)).body.state.players[0].avatar,'🐨');assert.equal((await req('profile',{avatar:'geçersiz'})).r.status,400);
});
