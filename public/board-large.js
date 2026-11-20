import {escape as e,SPECIAL_ART} from './art.js';
import {PHOTOS} from './photos.js';
import {portrait} from './board-night.js';
import {modelDefs,propertyModel} from './models.js';
export {portrait};
const AVATARS=['🦊','🐻','🐱','🐼','🦁','🐸','🐰','🐨'];

export function cell(i){if(i<=12)return [i,12];if(i<=24)return [12,24-i];if(i<=36)return [36-i,0];return [0,i-36];}
// İlk ve son sıra derindir; ortadaki ada yerine karelerin okunabilirliğine alan ayrılır.
const depth=y=>y<=1?y*2.1:y<=12?2.1+(y-1)*8.8/11:10.9+(y-12)*2.1;
const P=(x,y,z=0)=>{const t=depth(y)/13;return [100-85*t+(1050+170*t)*x/13,90+440*t-z];};
export const screenPoint=i=>{const [x,y]=cell(i);return P(x+.5,y+.5);};
const points=a=>a.map(v=>v.join(',')).join(' ');
const poly=(a,fill,extra='')=>`<polygon points="${points(a)}" fill="${fill}" ${extra}/>`;
function slab(x,y,w,d,h,fill,z=0){return poly([P(x,y,z),P(x+w,y,z),P(x+w,y,z+h),P(x,y,z+h)],'#a68c60')+poly([P(x+w,y,z),P(x+w,y+d,z),P(x+w,y+d,z+h),P(x+w,y,z+h)],'#65543e')+poly([P(x,y,z+h),P(x+w,y,z+h),P(x+w,y+d,z+h),P(x,y+d,z+h)],fill);}
const shortName=b=>({'Silivri Cezaevi':'Silivri Cezaevi','Elektrik Santrali':'Elektrik','Su İdaresi':'Su İdaresi','Serbest Otopark':'Otopark','Gelir Vergisi':'Gelir Vergisi','Emlak Vergisi':'Emlak Vergisi','İzmir Basmane':'Basmane Garı'}[b.name]||b.name);
const linesFor=(b,side)=>{let name=shortName(b);if(side){if(b.type==='station')return [b.name==='Haydarpaşa'?'Haydarpaşa':b.name.replace('İzmir Basmane','Basmane')];if(b.type==='tax')return [b.name==='Gelir Vergisi'?'Gelir Vergisi':'Emlak Vergisi'];return [name];}if(b.type==='jail')return ['Silivri','Cezaevi'];if(b.type==='gotojail')return ['Silivri’ye','Git'];if(b.type==='start')return ['Başlangıç','+2.500 ₺'];if(name.length>13&&name.includes(' ')){const words=name.split(' ');return [words.slice(0,-1).join(' '),words.at(-1)];}return [name];};
function textSize(text,width,max=18){const weight=[...text].reduce((n,c)=>n+(/[ilıİI .’']/u.test(c)?.28:/[MWĞÖÜ@]/u.test(c)?.85:/[A-ZÇŞ]/u.test(c)?.67:.51),0);return Math.max(13,Math.min(max,width/Math.max(1,weight)));}
function thumb(b,box,clip,side){const photo=PHOTOS[b.name];const [left,top,width,height]=box;let content='';
 if(photo)content=`<image href="${photo.thumb||photo.src}" x="${left}" y="${top}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>`;
 else{const n=SPECIAL_ART[b.type]??11;content=`<svg x="${left}" y="${top}" width="${width}" height="${height}" viewBox="${(n%4)*300} ${Math.floor(n/4)*300} 300 300" preserveAspectRatio="xMidYMid slice" overflow="hidden"><image href="/specials.png" width="1200" height="900" preserveAspectRatio="none"/></svg>`;}
 return `<g clip-path="url(#${clip})" ${side?'opacity=".74"':''}>${content}</g>`;
}
export function boardArt(s,selected=null){let out=`<svg id="board-svg" viewBox="0 20 1250 550" role="group" aria-label="Büyük kareli Türkiye Emlak tahtası"><defs><linearGradient id="large-stone" x2=".15" y2="1"><stop stop-color="#fff7de"/><stop offset=".6" stop-color="#e2d3b2"/><stop offset="1" stop-color="#b5a38a"/></linearGradient><linearGradient id="large-edge"><stop stop-color="#ddbd74"/><stop offset=".5" stop-color="#fae1a0"/><stop offset="1" stop-color="#916a35"/></linearGradient><filter id="large-shadow" x="-40%" width="180%" y="-100%" height="300%"><feDropShadow dx="0" dy="5" stdDeviation="3" flood-color="#020c1c" flood-opacity=".75"/></filter></defs>${modelDefs}<image href="/world-night-v2.png" width="1250" height="550" preserveAspectRatio="xMidYMid slice"/>`;
 out+=`<g filter="url(#large-shadow)">${slab(-.07,-.07,13.14,13.14,13,'url(#large-edge)',-13)}</g><defs><clipPath id="large-center">${poly([P(1,1),P(12,1),P(12,12),P(1,12)],'#fff')}</clipPath></defs><image href="/world-night-v2.png" width="1250" height="550" preserveAspectRatio="xMidYMid slice" clip-path="url(#large-center)"/>`;
 const buildings=[];
 for(const b of s.board){const [x,y]=cell(b.id),q=s.properties[b.id],owner=s.players.find(p=>p.id===q.owner),side=x===0||x===12;const horizontal=y===0||y===12,isSide=side&&!horizontal,clip='tile-picture-'+b.id;
  const corners=[P(x+.035,y+.035),P(x+.965,y+.035),P(x+.965,y+.965),P(x+.035,y+.965)],xs=corners.map(a=>a[0]),ys=corners.map(a=>a[1]);const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys),width=right-left,height=bottom-top,[cx]=P(x+.5,y+.5),lines=linesFor(b,isSide);
  out+=`<g class="tile large-tile ${selected===b.id?'selected':''}">${slab(x+.025,y+.025,.95,.95,8,'url(#large-stone)',-8)}<defs><clipPath id="${clip}">${poly(corners,'#fff')}</clipPath></defs>`;
  if(isSide){out+=thumb(b,[left,top,width,height],clip,true)+poly(corners,'#102032',`opacity=".42"`);}
  else{const pictureHeight=lines.length>1?height*.3:height*.55;out+=thumb(b,[left+4,top+5,width-8,pictureHeight],clip,false);}
  out+=poly([P(x+.04,y+.025),P(x+.96,y+.025),P(x+.96,y+.1),P(x+.04,y+.1)],owner?owner.color:b.color);
  const font=textSize(lines.reduce((a,b)=>a.length>b.length?a:b,''),width-12,isSide?17:18.5),base=isSide?(top+bottom)/2+font*.35:bottom-7-(lines.length-1)*(font*.9);
  out+=`<text x="${cx}" y="${base}" text-anchor="middle" data-label-width="${Math.min(corners[1][0]-corners[0][0],corners[2][0]-corners[3][0])-7}" class="large-tile-name ${isSide?'side-name':''}" style="font-size:${font.toFixed(1)}px">${lines.map((line,n)=>`<tspan x="${cx}" dy="${n?font*.9:0}">${e(line)}</tspan>`).join('')}</text>`;
  if(q.mortgage)out+=`<text x="${right-10}" y="${top+15}" text-anchor="middle" font-size="13">🔒</text>`;
  if(owner)out+=`<circle cx="${left+8}" cy="${bottom-7}" r="3" fill="${owner.color}" stroke="#fff6cc"/>`;
  out+=poly(corners,'transparent',`stroke="${selected===b.id?'#fff3a8':owner?owner.color:'#ad9668'}" stroke-width="${selected===b.id?3:1}" data-tile="${b.id}" role="button" tabindex="0" aria-label="${e(b.name)} ayrıntıları" pointer-events="all"`)+'</g>';
  if(q.level){let [bx,by]=P(x+.5,y+.5),scale=q.style==='farm'?.68:.74;const modelHeight=q.style==='farm'?65:q.level===6?145:q.level===1?64:35+q.level*13;
   if(y===12)by=top-4;else if(y===0)by=bottom+modelHeight*scale+5;else if(x===0){bx=right+28;by+=10;}else{bx=left-30;by+=10;}
   buildings.push({y:by,svg:`<g transform="translate(${bx} ${by}) scale(${scale})">${propertyModel(q.level,q.style)}</g>`});
  }
 }
 // Küçük merkez logosu; geniş alan kareler ve gelişen yapılara ayrılır.
 out+=`<g pointer-events="none"><text x="628" y="290" text-anchor="middle" font-size="24" font-weight="900" fill="#ffedb1" stroke="#50331d" stroke-width="4" paint-order="stroke">TÜRKİYE EMLAK</text></g>`;
 out+=buildings.sort((a,b)=>a.y-b.y).map(b=>b.svg).join('');
 const players=[...s.players].sort((a,b)=>screenPoint(a.pos)[1]-screenPoint(b.pos)[1]);
 for(const p of players){
  const siblings=players.filter(z=>z.pos===p.pos),n=siblings.findIndex(z=>z.id===p.id),[px,py]=screenPoint(p.pos),[tx,ty]=cell(p.pos);
  const cols=Math.min(3,siblings.length),row=Math.floor(n/3),col=n%3;
  const spread=(cols-1)*51,center=Math.max(62+spread,Math.min(1188-spread,px+(tx===0?65:tx===12?-65:0)));
  const a=center+(col-(cols-1)/2)*102;
  const b=Math.max(132,Math.min(496,py+(ty===0?87:ty===12?-5:0)+(ty===12?-1:1)*row*112));
  const k=Math.max(0,AVATARS.indexOf(p.avatar)),number=s.players.findIndex(q=>q.id===p.id)+1,active=s.status==='playing'&&s.players[s.current]?.id===p.id;
  const uid='pawn-'+number,name=p.name.length>13?p.name.slice(0,12)+'…':p.name;
  out+=`<g class="token character-pawn ${active?'current-pawn':''}" data-player="${e(p.id)}" pointer-events="none" role="img" aria-label="${e(p.name)}, ${number}. oyuncu${p.jail?', Silivri’de '+p.jail+' tur':''}">
   <title>${e(p.name)} · ${e(s.board[p.pos].name)}${p.jail?' · '+p.jail+' tur Silivri':''}</title>
   <path d="M${px} ${py}L${a} ${b+7}" fill="none" stroke="${p.color}" stroke-width="2" stroke-dasharray="3 3" opacity=".8"/>
   <g transform="translate(${a} ${b})">
    <defs><linearGradient id="${uid}-coat" x2="1" y2=".5"><stop stop-color="${p.color}"/><stop offset=".55" stop-color="${p.color}"/><stop offset="1" stop-color="#152439"/></linearGradient><clipPath id="${uid}-face"><circle cy="-49" r="17"/></clipPath></defs>
    <ellipse cy="12" rx="26" ry="10" fill="#000a"/>
    <ellipse cy="8" rx="23" ry="9" fill="#15243a" stroke="${active?'#fff4af':p.color}" stroke-width="${active?4:3}"/>
    <ellipse cy="5" rx="21" ry="7" fill="${p.color}" opacity=".85"/>
    <path d="M-9-12l-2 16h8l4-17m4 0 2 17h8l-4-18" fill="#273b53" stroke="#101d2c" stroke-width="2"/>
    <path d="M-12 2h9v6h-13q-1-4 4-6m19 0h8q5 2 5 6H7Z" fill="#0a1524" stroke="#bbc5c8"/>
    <path d="M-13-37q13-9 26 0l5 23q-18 10-36 0Z" fill="url(#${uid}-coat)" stroke="#fff2ca" stroke-width="1.4"/>
    <path d="M-12-35q-11 5-10 19m34-19q11 5 10 19" stroke="${p.color}" stroke-width="8" fill="none" stroke-linecap="round"/>
    <circle cx="-22" cy="-14" r="4" fill="#e0b486"/><circle cx="22" cy="-14" r="4" fill="#e0b486"/>
    <path d="M-6-38l6 20 6-20Z" fill="#f7edcf"/><path d="M0-32v12" stroke="#a47b45" stroke-width="3"/>
    <rect x="-5" y="-44" width="10" height="9" rx="3" fill="#d4a780"/>
    <circle cy="-49" r="19" fill="#edcda0" stroke="${active?'#fff0a0':p.color}" stroke-width="2.5"/>
    <image href="/portraits.png" x="${-17-(k%4)*34}" y="${-66-Math.floor(k/4)*34}" width="136" height="68" preserveAspectRatio="none" clip-path="url(#${uid}-face)"/>
    ${p.jail?'<path d="M-17-66v35m11-35v35m12-35v35m11-35v35" stroke="#c4ced4" stroke-width="3" opacity=".8"/>':''}
    <rect x="-49" y="-93" width="98" height="22" rx="8" fill="#081528f5" stroke="${active?'#ffedac':p.color}" stroke-width="2"/>
    <circle cx="-38" cy="-82" r="8" fill="${p.color}"/><text x="-38" y="-78" text-anchor="middle" font-size="11" font-weight="900" fill="#091322">${number}</text>
    <text x="7" y="-78" text-anchor="middle" font-size="12" font-weight="800" fill="#fff7dc" ${name.length>10?'textLength="74" lengthAdjust="spacingAndGlyphs"':''}>${e(name)}</text>
    ${active?'<path class="pawn-arrow" d="M-7-108H7L0-99Z" fill="#ffe89a" stroke="#5a3d1f"/>':''}
   </g></g>`;
 }
 return out+'</svg>';
}
