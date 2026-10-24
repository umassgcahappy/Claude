/* flex gap：布局行为检测，Chrome 61 走 margin 基线 */
(function(){var f=document.createElement('div');f.style.position='absolute';f.style.visibility='hidden';f.style.display='flex';f.style.flexDirection='column';f.style.rowGap='1px';
f.appendChild(document.createElement('div'));f.appendChild(document.createElement('div'));document.body.appendChild(f);var ok=f.scrollHeight===1;f.parentNode.removeChild(f);
if(ok)document.documentElement.classList.add('fg')})();

(function(){
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const CN='〇一二三四五六七八九';
function cnNum(n){n=Math.floor(n);if(n<10)return CN[n];if(n<20)return '十'+(n%10?CN[n%10]:'');if(n<100)return CN[Math.floor(n/10)]+'十'+(n%10?CN[n%10]:'');
  if(n<1000){const h=Math.floor(n/100),r=n%100;return CN[h]+'百'+(r?(r<10?'零'+CN[r]:(r<20?'一':'')+cnNum(r)):'')}return String(n)}
const cnYear=y=>[...String(y)].map(d=>CN[+d]).join('');
const touch=matchMedia('(pointer:coarse)').matches;
let tt;function toast(m,ms){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),ms||2600)}
let seq=Date.now();const uid=()=>(seq++).toString(36)+Math.random().toString(36).slice(2,5);

/* ───────── 设置（小东西放 localStorage） ───────── */
const SKEY='sujianji-quan-set-v1';
const ls={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}};
const set=Object.assign({name:'青禾',motto:'今日也好好吃饭',paper:'xuan',avatar:'seal',cover:'paint',seeded:false},ls.get(SKEY,{}));
const saveSet=()=>ls.set(SKEY,set);

/* ───────── 照片和日记放 IndexedDB：比 localStorage 大得多 ─────────
   打不开（少数无痕模式）就先放内存，并提醒关掉页面会丢。 */
const DB={db:null,mem:null};
function idbOpen(){return new Promise(ok=>{try{const r=indexedDB.open('sujianji-quan',1);
  r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('posts'))d.createObjectStore('posts',{keyPath:'id'});if(!d.objectStoreNames.contains('imgs'))d.createObjectStore('imgs',{keyPath:'k'})};
  r.onsuccess=()=>ok(r.result);r.onerror=()=>ok(null);r.onblocked=()=>ok(null);setTimeout(()=>ok(null),4000)}catch(e){ok(null)}})}
function req(store,mode,fn){
  if(!DB.db){const m=DB.mem[store];return Promise.resolve(fn({getAll:()=>({result:[...m.values()]}),get:k=>({result:m.get(k)}),put:v=>{m.set(v.id||v.k,v);return{}},delete:k=>{m.delete(k);return{}}}).result)}
  return new Promise((ok,no)=>{let t;try{t=DB.db.transaction(store,mode)}catch(e){return no(e)}const r=fn(t.objectStore(store));let res;if(r)r.onsuccess=()=>{res=r.result};t.oncomplete=()=>ok(res);t.onerror=()=>no(t.error);t.onabort=()=>no(t.error)});
}
const dbAll=s=>req(s,'readonly',o=>o.getAll());
const dbGet=(s,k)=>req(s,'readonly',o=>o.get(k));
const dbPut=(s,v)=>req(s,'readwrite',o=>o.put(v));
const dbDel=(s,k)=>req(s,'readwrite',o=>o.delete(k));
function blobToData(b){return new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(r.error);r.readAsDataURL(b)})}
function dataToBlob(u){const m=/^data:([^;,]+)?(;base64)?,(.*)$/.exec(u);if(!m)return null;const raw=m[2]?atob(m[3]):decodeURIComponent(m[3]);const a=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)a[i]=raw.charCodeAt(i);return new Blob([a],{type:m[1]||'image/jpeg'})}
async function putImg(k,blob){try{await dbPut('imgs',{k,blob})}catch(e){await dbPut('imgs',{k,data:await blobToData(blob)})}if(urls[k]){if(urls[k].startsWith('blob:'))URL.revokeObjectURL(urls[k]);delete urls[k]}}
async function delImg(k){try{await dbDel('imgs',k)}catch(e){}if(urls[k]){if(urls[k].startsWith('blob:'))URL.revokeObjectURL(urls[k]);delete urls[k]}}
const urls={};
async function imgURL(k){if(urls[k])return urls[k];const r=await dbGet('imgs',k).catch(()=>null);if(!r)return '';return urls[k]=r.blob?URL.createObjectURL(r.blob):r.data}
function hydrate(root){(root||document).querySelectorAll('img[data-k]').forEach(async im=>{const u=await imgURL(im.dataset.k);if(u&&im.getAttribute('src')!==u)im.src=u})}

let posts=[];
const byT=()=>posts.sort((a,b)=>b.t-a.t);
async function savePost(p){try{await dbPut('posts',p);return true}catch(e){toast('这台设备存不下了，刚才这条没存上');return false}}
function askPersist(){}

/* ───────── 时间：时辰、农历、节气 ───────── */
const SC='子丑寅卯辰巳午未申酉戌亥';
const shichen=h=>SC[Math.floor(((h+1)%24)/2)]+'时';
const sameDay=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
const day0=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate());
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const LM=['正','二','三','四','五','六','七','八','九','十','冬','腊'];
function lunarDay(n){return n===10?'初十':n===20?'二十':n===30?'三十':n<10?'初'+CN[n]:n<20?'十'+CN[n-10]:n<30?'廿'+CN[n-20]:''}
function lunar(d){try{const p=new Intl.DateTimeFormat('en-u-ca-chinese',{month:'numeric',day:'numeric'}).formatToParts(d);
  const mv=(p.find(x=>x.type==='month')||{}).value||'',dv=+((p.find(x=>x.type==='day')||{}).value||0),mn=parseInt(mv,10);
  if(!mn||!dv)return '';return (/bis|leap/i.test(mv)?'闰':'')+LM[mn-1]+'月'+lunarDay(dv)}catch(e){return ''}}
const JIEQI=[[1,5,'小寒'],[1,20,'大寒'],[2,4,'立春'],[2,19,'雨水'],[3,5,'惊蛰'],[3,20,'春分'],[4,4,'清明'],[4,20,'谷雨'],[5,5,'立夏'],[5,21,'小满'],[6,5,'芒种'],[6,21,'夏至'],[7,7,'小暑'],[7,22,'大暑'],[8,7,'立秋'],[8,23,'处暑'],[9,7,'白露'],[9,23,'秋分'],[10,8,'寒露'],[10,23,'霜降'],[11,7,'立冬'],[11,22,'小雪'],[12,7,'大雪'],[12,21,'冬至']];
function jieqi(d){const y=d.getFullYear(),day=day0(d),all=[];[y-1,y,y+1].forEach(yy=>JIEQI.forEach(([m,dd,n])=>all.push({t:new Date(yy,m-1,dd),n})));
  let last=null,next=null;all.forEach(j=>{if(j.t<=day)last=j;else if(!next)next=j});
  const a=Math.round((day-last.t)/864e5),b=next?Math.round((next.t-day)/864e5):99;
  if(a===0)return '今日'+last.n;if(b<=3)return `${next.n}前${b===1?'一':cnNum(b)}日`;return `${last.n}后${cnNum(a)}日`}
const liang=n=>n===2?'两':cnNum(n);
const mdCN=d=>`${cnNum(d.getMonth()+1)}月${cnNum(d.getDate())}日`;
function relTime(t){const d=new Date(t),now=new Date(),s=(now-d)/1000;
  if(s<60&&s>-60)return '刚刚';if(s<0)return mdCN(d)+' '+shichen(d.getHours());
  if(s<3600)return liang(Math.floor(s/60))+'分钟前';
  if(sameDay(d,now))return liang(Math.floor(s/3600))+'小时前';
  const dd=Math.round((day0(now)-day0(d))/864e5);
  if(dd===1)return '昨天 '+shichen(d.getHours());if(dd<7)return liang(dd)+'天前';
  return (d.getFullYear()===now.getFullYear()?'':cnYear(d.getFullYear())+'年')+mdCN(d);}
function afterRel(pt,nt){const d=Math.round((day0(new Date(nt))-day0(new Date(pt)))/864e5);
  if(d<=0)return '当日';if(d===1)return '次日';if(d===2)return '两日后';if(d<30)return cnNum(d)+'日后';if(d<365){const m=Math.max(1,Math.round(d/30));return (m===2?'两':cnNum(m))+'个月后'}const y=Math.floor(d/365);return (y===2?'两':cnNum(y))+'年后'}
const fullTime=t=>{const d=new Date(t);return `${cnYear(d.getFullYear())}年${mdCN(d)} ${shichen(d.getHours())}`};

/* ───────── 天时 ───────── */
const CLOUD='<path d="M6.5 17h10.8a3.6 3.6 0 0 0 .2-7.2A5.2 5.2 0 0 0 7.6 8.6 4.2 4.2 0 0 0 6.5 17z"/>';
const WX={
  qing:{n:'晴',i:'<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>'},
  yun:{n:'云',i:'<circle cx="8.5" cy="8.5" r="3.2"/><path d="M8.5 2.6v1.4M3.2 8.5h1.4M4.8 4.8l1 1"/><path d="M8 19h9.5a3.2 3.2 0 0 0 .2-6.4 4.6 4.6 0 0 0-8.7-1A3.7 3.7 0 0 0 8 19z"/>'},
  yin:{n:'阴',i:CLOUD+'<path d="M4 20.5h14" opacity=".6"/>'},
  yu1:{n:'微雨',i:CLOUD+'<path d="M9 19.5l-.8 2M13 19.5l-.8 2M17 19.5l-.8 2"/>'},
  yu2:{n:'骤雨',i:CLOUD+'<path d="M8 19l-1.6 3.6M11.5 19l-1.6 3.6M15 19l-1.6 3.6M18.5 19l-1.6 3.6"/>'},
  xue:{n:'雪',i:'<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M10 4.6l2 1.6 2-1.6M10 19.4l2-1.6 2 1.6"/>'},
  wu:{n:'雾',i:'<path d="M3 8c2.5-1.6 4.5 1.6 7 0s4.5-1.6 7 0 2.8.8 4 0M3 13c2.5-1.6 4.5 1.6 7 0s4.5-1.6 7 0 2.8.8 4 0M3 18c2.5-1.6 4.5 1.6 7 0s4.5-1.6 7 0 2.8.8 4 0"/>'},
  lei:{n:'雷雨',i:CLOUD+'<path d="M12.5 17.5l-2.2 3.2h3l-1.8 3"/>'}
};
const wxSvg=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${WX[k].i}</svg>`;
const cnT=n=>{n=Math.round(+n);return n<0?'零下'+cnNum(-n):cnNum(n)};
const hasN=v=>v!==''&&v!=null&&!isNaN(+v);
function wxText(w){if(!w||!w.type||!WX[w.type])return '';let s=WX[w.type].n;if(hasN(w.lo)&&hasN(w.hi))s+=` ${cnT(w.lo)}至${cnT(w.hi)}度`;return s}

/* ───────── 印章 ───────── */
function sealShape(txt,shape,mode){
  const c=[...String(txt||'').trim()].slice(0,4);if(!c.length)c.push('印');
  const red='var(--zhu)',pap='var(--paper)',tc=mode==='bai'?pap:red;
  const T=(ch,x,y,fs,sx=1,sy=1)=>`<text transform="translate(${x} ${y}) scale(${sx} ${sy})" text-anchor="middle" font-size="${fs}" style="fill:${tc};font-family:var(--cn)">${esc(ch)}</text>`;
  if(shape==='yuan'){
    const box=mode==='bai'?`<circle cx="40" cy="40" r="37" style="fill:${red}"/>`:`<circle cx="40" cy="40" r="35" style="fill:none;stroke:${red}" stroke-width="4"/>`;
    const t=c.length===1?T(c[0],40,54,40):c.length===2?T(c[0],40,37,26)+T(c[1],40,64,26):T(c[0],52,37,20)+T(c[1],52,61,20)+T(c[2],28,37,20)+(c[3]?T(c[3],28,61,20):'');
    return `<svg viewBox="0 0 80 80">${box}${t}</svg>`;
  }
  if(shape==='chang'){
    const n=c.length,h=Math.max(76,n*30+16),fs=26,step=(h-16)/n;
    const box=mode==='bai'?`<rect x="2" y="2" width="40" height="${h-4}" rx="4" style="fill:${red}"/>`:`<rect x="3" y="3" width="38" height="${h-6}" rx="5" style="fill:none;stroke:${red}" stroke-width="3.5"/>`;
    return `<svg viewBox="0 0 44 ${h}">${box}${c.map((ch,i)=>T(ch,22,8+step*i+step/2+fs*.36,fs)).join('')}</svg>`;
  }
  const box=mode==='bai'?`<rect x="3" y="3" width="70" height="70" rx="3" style="fill:${red}"/>`:`<rect x="4" y="4" width="68" height="68" rx="7" style="fill:none;stroke:${red}" stroke-width="3.5"/>`;
  const t=c.length===1?T(c[0],38,56,46):c.length===2?T(c[0],54,57,30,.78,1.45)+T(c[1],22,57,30,.78,1.45):c.length===3?T(c[0],54,35,24)+T(c[1],54,65,24)+T(c[2],22,60,30,.8,1.8):T(c[0],54,35,24)+T(c[1],54,65,24)+T(c[2],22,35,24)+T(c[3],22,65,24);
  return `<svg viewBox="0 0 76 76">${box}${t}</svg>`;
}
/* 给自己盖的章：相当于给自己点个赞 */
const SEALS={
  shenhao:{txt:'甚好',shape:'yuan',mode:'bai'},zhun:{txt:'准',shape:'fang',mode:'bai'},zhidao:{txt:'知道了',shape:'chang',mode:'zhu'},
  xiabu:{txt:'下不为例',shape:'chang',mode:'bai'},xi:{txt:'喜',shape:'yuan',mode:'bai'},miao:{txt:'妙',shape:'yuan',mode:'zhu'},
  zhide:{txt:'值得',shape:'yuan',mode:'zhu'},wuwang:{txt:'勿忘',shape:'chang',mode:'zhu'},yiyue:{txt:'已阅',shape:'yuan',mode:'zhu'},
  pingan:{txt:'平安',shape:'chang',mode:'zhu'},baobao:{txt:'抱抱',shape:'yuan',mode:'bai'},chibao:{txt:'吃饱了',shape:'chang',mode:'bai'}
};
/* 头像默认用名章：两字名刻成「某某之印」 */
function sealChars(name){name=(name||'').trim()||'无名';if(/^[\x00-\x7F]+$/.test(name))return {long:name.toUpperCase().slice(0,8)};const c=[...name];
  if(c.length===1)return {cols:[[c[0]],['印']]};if(c.length===2)return {cols:[[c[0],c[1]],['之','印']]};if(c.length===3)return {cols:[[c[0],c[1]],[c[2],'印']]};return {cols:[[c[0],c[1]],[c[2],c[3]]]}}
function nameSeal(name){const s=sealChars(name);
  if(s.long)return `<svg viewBox="0 0 76 76"><rect width="76" height="76" style="fill:var(--zhu)"/><text x="38" y="44" text-anchor="middle" font-size="${Math.min(18,120/s.long.length)}" style="fill:var(--paper);font-family:var(--cn)">${esc(s.long)}</text></svg>`;
  let t='';s.cols.forEach((col,ci)=>{const x=ci===0?54:22;col.forEach((ch,ri)=>{const y=col.length===1?52:(ri===0?35:65);t+=`<text x="${x}" y="${y}" text-anchor="middle" font-size="${col.length===1?39:26}" style="fill:var(--paper);font-family:var(--cn)">${esc(ch)}</text>`})});
  return `<svg viewBox="0 0 76 76"><rect width="76" height="76" style="fill:var(--zhu)"/>${t}</svg>`}
function avatarHTML(cls){return `<button class="av ${cls||''}" data-set aria-label="我">${set.avatar==='photo'?'<img data-k="avatar" alt="">':nameSeal(set.name)}</button>`}

/* ───────── 默认封面：一幅小画 ───────── */
function plumSvg(x,y,s,c){let g='';for(let i=0;i<5;i++){const a=i*72*Math.PI/180;g+=`<circle cx="${(x+Math.sin(a)*6*s).toFixed(1)}" cy="${(y-Math.cos(a)*6*s).toFixed(1)}" r="${(5*s).toFixed(1)}" fill="${c}"/>`}return g+`<circle cx="${x}" cy="${y}" r="${2.2*s}" fill="#c9963a"/>`}
const PAINT=`<svg viewBox="0 0 600 360" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7d5cf"/><stop offset=".55" stop-color="#f2e6da"/><stop offset="1" stop-color="#ece0cc"/></linearGradient></defs>
<rect width="600" height="360" fill="url(#sky)"/><circle cx="455" cy="98" r="36" fill="#f9f1e4"/><circle cx="455" cy="98" r="52" fill="#f9f1e4" opacity=".35"/>
<path d="M0 232 Q90 168 172 210 T336 190 T498 222 T600 196 V360 H0Z" fill="#aab4b3" opacity=".55"/><path d="M0 272 Q120 228 240 262 T470 252 T600 266 V360 H0Z" fill="#83908d" opacity=".6"/><path d="M0 312 Q150 290 300 308 T600 304 V360 H0Z" fill="#616d69" opacity=".72"/>
<path d="M346 150 q8 -6 16 0 M370 140 q6 -5 12 0" stroke="#5a5550" stroke-width="2" fill="none" stroke-linecap="round"/>
<path d="M-6 30 Q60 52 104 96 Q130 122 176 128 M104 96 Q112 64 146 50 M60 62 Q70 92 58 120" stroke="#4a3a30" stroke-width="5" fill="none" stroke-linecap="round"/>
${plumSvg(176,128,1.3,'#eab0ad')}${plumSvg(146,50,1.1,'#f0c2bd')}${plumSvg(58,120,1.2,'#eab0ad')}${plumSvg(112,92,.9,'#f0c2bd')}${plumSvg(30,44,1,'#eab0ad')}<circle cx="160" cy="108" r="4" fill="#d98c86"/><circle cx="84" cy="70" r="3.5" fill="#d98c86"/></svg>`;

/* ───────── 渲染：圈 ───────── */
const TAGS=['碎碎念','好吃的','出门','人','自己'];
let tagF='';
function renderHead(){
  $('#cover').innerHTML=(set.cover==='photo'?'<img data-k="cover" alt="">':PAINT)+`<div class="me"><span class="nm">${esc(set.name)}</span>${avatarHTML()}</div>`;
  $('#motto').textContent=set.motto||'';
  $('#chips').innerHTML=['',...TAGS].map(t=>`<button class="chip${t===tagF?' on':''}" data-tag="${t}">${t||'全部'}</button>`).join('');
  hydrate($('#cover'));
}
function photoHTML(p,big){
  if(!p.img)return '';const r=p.img.w/p.img.h;
  const w=big?'width:100%':`width:74%;max-width:${Math.round(270*r)}px`;
  return `<div class="ph" data-view="${p.id}" style="${w}"><div class="ar" style="padding-top:${(p.img.h/p.img.w*100).toFixed(3)}%"></div><img data-k="${p.img.k}" alt="" decoding="async"${big?'':' loading="lazy"'}>${sealsHTML(p)}</div>`;
}
function sealsHTML(p,inline,fresh){
  if(!p.seals||!p.seals.length)return '';
  return `<div class="sl${inline?' inline':''}">${p.seals.map(s=>{const d=SEALS[s.s];if(!d)return '';return `<i class="${d.shape} ${d.mode}${fresh===s.s?' press':''}" style="transform:rotate(${s.r}deg)">${sealShape(d.txt,d.shape,d.mode)}</i>`}).join('')}</div>`;
}
function notesHTML(p){
  if(!p.notes||!p.notes.length)return '';
  return `<div class="box">${p.notes.map(n=>`<div class="c" data-note="${p.id}|${n.id}"><b>${esc(set.name)}</b><small> · ${afterRel(p.t,n.t)}</small>：<span class="h">${esc(n.text)}</span></div>`).join('')}</div>`;
}
const DOTS='<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="12" r="1.9"/><circle cx="16" cy="12" r="1.9"/></svg>';
function postHTML(p,big,fresh){
  const w=p.w&&p.w.type&&WX[p.w.type];
  return `<article class="post" id="post-${p.id}" data-id="${p.id}">${avatarHTML('sm')}<div class="bd">
    <div class="who">${esc(set.name)}</div>
    ${p.text?`<div class="tx${big?'':' clamp'}"${big?'':` data-open="${p.id}"`}>${esc(p.text)}</div>${big?'':'<button class="more" data-more hidden>全文</button>'}`:''}
    ${p.img?photoHTML(p,big).replace(sealsHTML(p),sealsHTML(p,false,fresh)):sealsHTML(p,true,fresh)}
    ${p.where?`<div class="where">于 ${esc(p.where)}</div>`:''}
    <div class="meta">${big?'':`<span>${relTime(p.t)}</span>`}${w?`<span class="wx">${wxSvg(p.w.type)}${esc(wxText(p.w))}</span>`:''}${p.tag?`<span class="tg">${esc(p.tag)}</span>`:''}${big?'':`<button class="dots" data-act="${p.id}" aria-label="盖章、批注">${DOTS}</button>`}</div>
    ${big?`<div class="full">${fullTime(p.t)}<br>农历${lunar(new Date(p.t))} · ${jieqi(new Date(p.t))}</div>`:''}
    ${notesHTML(p)}
  </div></article>`;
}
function checkClamp(root){(root||document).querySelectorAll('.tx.clamp').forEach(el=>{const b=el.nextElementSibling;if(b&&b.matches('[data-more]'))b.hidden=!(el.scrollHeight>el.clientHeight+2)})}
function renderFeed(){
  renderHead();
  const now=new Date(),old=posts.filter(p=>{const d=new Date(p.t);return d.getMonth()===now.getMonth()&&d.getDate()===now.getDate()&&d.getFullYear()<now.getFullYear()});
  $('#nanian').innerHTML=old.length?(()=>{const p=old[0],y=now.getFullYear()-new Date(p.t).getFullYear();
    return `<div class="nanian" data-open="${p.id}"><span class="k">那年今日</span>${p.img?`<img data-k="${p.img.k}" alt="">`:'<span class="ni">〆</span>'}<div class="s"><small>${y===1?'一年前':cnNum(y)+'年前'}的今天 · ${cnYear(new Date(p.t).getFullYear())}</small><span>${esc(p.text||'（一张照片）')}</span></div></div>`})():'';
  const list=posts.filter(p=>!tagF||p.tag===tagF);
  $('#feed').innerHTML=list.length?list.map(p=>postHTML(p)).join('')+'<div class="endl">· 只 有 你 ·</div>'
    :`<div class="empty">${tagF?`「${esc(tagF)}」里还没有东西。`:'这里只有你。<br>拍一张，写一句。'}<br><button class="btn" data-new>写一条</button></div>`;
  hydrate($('#vFeed'));checkClamp($('#feed'));
}
function refreshPost(p,fresh){
  const el=document.getElementById('post-'+p.id);if(!el)return;
  const big=!!el.closest('#detail');const tmp=document.createElement('div');tmp.innerHTML=postHTML(p,big,fresh);const n=tmp.firstElementChild;el.replaceWith(n);hydrate(n);checkClamp(n);
}

/* ───────── 相册 ───────── */
function renderAlbum(){
  const now=new Date(),groups=[];let cur=null;
  posts.forEach(p=>{const d=new Date(p.t),k=ymd(d);if(!cur||cur.k!==k){cur={k,d,ps:[]};groups.push(cur)}cur.ps.push(p)});
  let h='';const first=posts.length?new Date(posts[posts.length-1].t):null;
  h+=`<div class="alb-sum">${posts.length?`共 ${cnNum(posts.length)} 条 · 自${cnYear(first.getFullYear())}年${mdCN(first)}起`:'还没有记下什么'}</div>`;
  if(!groups.length||!sameDay(groups[0].d,now))h+=`<div class="day"><div class="dt big"><b>今天</b></div><div class="its"><div class="it" data-new><span class="add"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M3 8.5A2 2 0 0 1 5 6.5h2.4l1.5-2h6.2l1.5 2H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.8"/></svg></span></div></div></div>`;
  let lastY=now.getFullYear();
  groups.forEach(g=>{
    const y=g.d.getFullYear();if(y!==lastY){h+=`<div class="yr">${cnYear(y)}年</div>`;lastY=y}
    const dd=Math.round((day0(now)-day0(g.d))/864e5);
    const dt=dd===0?'<div class="dt big"><b>今天</b></div>':dd===1?'<div class="dt big"><b>昨天</b></div>':`<div class="dt"><b>${g.d.getDate()}</b><small>${cnNum(g.d.getMonth()+1)}月</small><em>${lunar(g.d)}</em></div>`;
    h+=`<div class="day">${dt}<div class="its">${g.ps.map(p=>p.img?`<div class="it" data-open="${p.id}"><img data-k="${p.img.k}" alt="" loading="lazy"><span class="s">${esc(p.text||'')}</span></div>`
      :`<div class="it" data-open="${p.id}"><span class="s plain">${esc(p.text||'')}</span></div>`).join('')}</div></div>`;
  });
  $('#album').innerHTML=h+'<div class="endl">· 只 有 你 ·</div>';hydrate($('#album'));
}

/* ───────── 详情 ───────── */
function renderDetail(id){
  const p=posts.find(x=>x.id===id);
  if(!p){$('#detail').innerHTML='<div class="empty">这一条找不到了。</div>';return}
  $('#detail').innerHTML=postHTML(p,true)+`<div class="dacts"><button class="z" data-stamp="${p.id}">盖章</button><button class="z" data-cmt="${p.id}">批注</button><button data-card="${p.id}">存卡片</button><button data-edit="${p.id}">改</button><button data-del="${p.id}">删去</button></div>`;
  hydrate($('#detail'));
}

/* ───────── 路由 ───────── */
let feedY=0,view='feed';
function route(){
  closeAct();closeCbar();
  const h=location.hash||'#/',m=/^#\/p\/([\w-]+)/.exec(h);
  if(view==='feed')feedY=scrollY;
  $('#vFeed').hidden=$('#vAlbum').hidden=$('#vDetail').hidden=true;
  if(m){view='detail';$('#vDetail').hidden=false;renderDetail(m[1]);scrollTo(0,0)}
  else if(h.startsWith('#/album')){view='album';$('#vAlbum').hidden=false;renderAlbum();scrollTo(0,0)}
  else{view='feed';$('#vFeed').hidden=false;renderFeed();scrollTo(0,feedY);onScroll()}
}
let navDepth=0;
function go(h){navDepth++;location.hash=h}
function back(){if(navDepth>0){navDepth--;history.back()}else location.hash='#/'}
window.addEventListener('hashchange',route);
function onScroll(){const c=$('#cover');if(view!=='feed'||!c)return;$('#top').classList.toggle('solid',scrollY>c.offsetHeight-60)}
addEventListener('scroll',()=>{onScroll();if(actEl&&Math.abs(scrollY-actY)>14)closeAct()},{passive:true});

/* ───────── 盖章、批注的小条 ───────── */
let actEl=null,actY=0;
function openAct(id,btn){
  closeAct();const r=btn.getBoundingClientRect();
  actEl=document.createElement('div');actEl.className='act';
  actEl.innerHTML=`<button data-stamp="${id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="5" y="14" width="14" height="5" rx="1"/><path d="M9.5 14V9.5a2.5 2.5 0 1 1 5 0V14"/><path d="M4 21h16"/></svg>盖章</button><button data-cmt="${id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M4 5h16v11H9l-4 3.5V16H4z"/></svg>批注</button><button data-edit="${id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z"/></svg>改</button><button data-card="${id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="1"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>卡片</button>`;
  document.body.appendChild(actEl);actY=scrollY;
  actEl.style.top=(r.top+r.height/2-actEl.offsetHeight/2)+'px';actEl.style.left=(r.left-8-actEl.offsetWidth)+'px';
}
function closeAct(){if(actEl){actEl.remove();actEl=null}}

/* 盖章抽屉 */
const sheet=$('#sheet'),scrim=$('#scrim');
function openSheet(html){sheet.innerHTML=html;sheet.classList.add('on');scrim.classList.add('on')}
function closeSheet(){sheet.classList.remove('on');scrim.classList.remove('on')}
scrim.addEventListener('click',closeSheet);
function openStamp(id){
  const p=posts.find(x=>x.id===id);if(!p)return;
  openSheet(`<h3>给这条盖个章<button data-close>×</button></h3><p class="sub">相当于给自己点个赞。再点一下已盖的章，就揭掉。</p><div class="seals">${Object.entries(SEALS).map(([k,s])=>`<button data-seal="${id}|${k}" class="${p.seals.some(x=>x.s===k)?'on':''}">${sealShape(s.txt,s.shape,s.mode)}<span>${s.txt}</span></button>`).join('')}</div>`);
}
async function toggleSeal(id,k){
  const p=posts.find(x=>x.id===id);if(!p)return;const i=p.seals.findIndex(x=>x.s===k);let fresh=null;
  if(i>=0)p.seals.splice(i,1);else{if(p.seals.length>=3)p.seals.shift();p.seals.push({s:k,r:Math.round(Math.random()*20-10),t:Date.now()});fresh=k}
  await savePost(p);closeSheet();refreshPost(p,fresh);if(fresh)toast(`盖了「${SEALS[k].txt}」`);
}

/* 批注输入条 */
let cbar=null;
function openCbar(id){
  const p=posts.find(x=>x.id===id);if(!p)return;closeCbar();
  cbar=document.createElement('div');cbar.className='cbar';
  cbar.innerHTML=`<span class="lbl">${afterRel(p.t,Date.now())}批注</span><textarea rows="1" placeholder="后来呢？给那时的自己写一句"></textarea><button class="btn" disabled>批</button>`;
  document.body.appendChild(cbar);const ta=cbar.querySelector('textarea'),b=cbar.querySelector('button');
  ta.addEventListener('input',()=>{b.disabled=!ta.value.trim();ta.style.height='auto';ta.style.height=Math.min(120,ta.scrollHeight)+'px'});
  ta.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();b.click()}});
  b.addEventListener('click',async()=>{const v=ta.value.trim();if(!v)return;p.notes.push({id:uid(),t:Date.now(),text:v});await savePost(p);closeCbar();refreshPost(p);toast('批好了')});
  setTimeout(()=>ta.focus(),30);
  const el=document.getElementById('post-'+id);if(el)setTimeout(()=>{const r=el.getBoundingClientRect();if(r.bottom>innerHeight-140)scrollBy({top:r.bottom-innerHeight+160,behavior:'smooth'})},300);
}
function closeCbar(){if(cbar){cbar.remove();cbar=null}}
document.addEventListener('pointerdown',e=>{if(cbar&&!e.target.closest('.cbar,[data-cmt]'))closeCbar()});

/* ───────── 选图：常驻 input + 三步解码兜底（与《行旅録》同一套） ───────── */
const picker=document.createElement('input');picker.type='file';picker.accept='image/*';
picker.style.cssText='position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0';document.body.appendChild(picker);
let pickCb=null;
function pick(cb){pickCb=cb;picker.value='';picker.click()}
picker.addEventListener('change',()=>{const f=picker.files&&picker.files[0],cb=pickCb;pickCb=null;if(f&&cb)cb(f)});
function readBuf(b){if(b.arrayBuffer)return b.arrayBuffer();return new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(r.error);r.readAsArrayBuffer(b)})}
function loadImg(src){return new Promise((ok,no)=>{const im=new Image();im.onload=()=>ok(im);im.onerror=()=>no(new Error('图片解码失败'));im.src=src})}
function decodeSteps(f,MAXP){const s=[];
  if(window.createImageBitmap){s.push(()=>createImageBitmap(f,{resizeWidth:MAXP,resizeQuality:'high'}));s.push(()=>createImageBitmap(f))}
  s.push(async()=>{const u=URL.createObjectURL(f);try{const im=await loadImg(u);im._url=u;return im}catch(e){URL.revokeObjectURL(u);throw e}});
  s.push(async()=>loadImg(await blobToData(f)));return s}
function toBlob(c,q){return new Promise((ok,no)=>{try{c.toBlob(b=>b?ok(b):no(new Error('存不成图')),'image/jpeg',q)}catch(e){no(e)}})}
async function drawTo(img,MAXP){
  const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;if(!w||!h)throw new Error('读不到尺寸');
  const sc=Math.min(1,MAXP/Math.max(w,h)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*sc));c.height=Math.max(1,Math.round(h*sc));
  const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);
  if(img.close)img.close();if(img._url)URL.revokeObjectURL(img._url);
  const d=x.getImageData(0,0,c.width,c.height).data;let same=true;
  for(let k=0;k<64&&same;k++){const p=Math.floor(Math.random()*c.width*c.height)*4;if(d[p]!==255||d[p+1]!==255||d[p+2]!==255)same=false}
  if(same)throw new Error('画出来是空白');
  return {blob:await toBlob(c,.85),w:c.width,h:c.height};
}
function readExif(buf){try{const v=new DataView(buf);if(v.getUint16(0)!==0xFFD8)return null;let o=2;
  while(o<v.byteLength-4){const mk=v.getUint16(o),len=v.getUint16(o+2);if(mk===0xFFE1&&v.getUint32(o+4)===0x45786966)return parseTiff(v,o+10);if((mk&0xFF00)!==0xFF00)break;o+=2+len}}catch(e){}return null}
function parseTiff(v,t){const le=v.getUint16(t)===0x4949,u16=p=>v.getUint16(p,le),u32=p=>v.getUint32(p,le),out={};
  const ifd=off=>{const n=u16(t+off);for(let i=0;i<n;i++){const e=t+off+2+i*12,tag=u16(e),type=u16(e+2),cnt=u32(e+4);const size={2:1,3:2,4:4,5:8}[type];if(!size)continue;const p=cnt*size>4?t+u32(e+8):e+8;
    if(type===2){let s='';for(let j=0;j<cnt-1;j++)s+=String.fromCharCode(v.getUint8(p+j));out[tag]=s}else if(type===3)out[tag]=u16(p);else if(type===4)out[tag]=u32(p);else out[tag]=[u32(p),u32(p+4)]}};
  ifd(u32(t+4));if(out[0x8769])ifd(out[0x8769]);return out}
function exifTime(x){if(!x)return 0;const m=/(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d)/.exec(x[0x9003]||x[0x0132]||'');if(!m)return 0;const d=new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5]);return isNaN(d)?0:+d}
async function takePhoto(f,MAXP){
  let et=0;try{et=exifTime(readExif(await readBuf(f.slice(0,262144))))}catch(e){}
  let out=null,why='';for(const step of decodeSteps(f,MAXP)){try{out=await drawTo(await step(),MAXP);break}catch(e){why=e&&e.message||'未知原因'}}
  if(!out){const heic=/heic|heif/i.test((f.type||'')+(f.name||''));toast(heic?'这张是 HEIC 格式，这个浏览器打不开；可以在相册里先存成 JPEG，或直接拍照':`这张没放进来（${why}），换一张试试`,4200);return null}
  out.et=et;return out;
}

/* ───────── 写一条 ───────── */
const comp={};
const pad=n=>String(n).padStart(2,'0');
const dtl=t=>{const d=new Date(t);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`};
function openCompose(id){
  closeAct();closeCbar();
  const p=id&&posts.find(x=>x.id===id);
  Object.assign(comp,{id:p?p.id:null,text:p?p.text:'',img:p&&p.img?Object.assign({},p.img,{keep:true}):null,t:p?p.t:Date.now(),w:p&&p.w?Object.assign({},p.w):{type:''},where:p?p.where||'':'',tag:p?p.tag||'':'',et:0});
  $('#cTitle').textContent=p?'改一改':'写一条';$('#cPost').textContent=p?'改好了':'落笔';
  $('#cText').value=comp.text;$('#cWhere').value=comp.where;$('#cTime').value=dtl(comp.t);
  renderSlot();renderCWx();renderCTag();checkPost();
  $('#compose').hidden=false;document.body.style.overflow='hidden';
  if(!p&&!touch)setTimeout(()=>$('#cText').focus(),50);
}
function closeCompose(){if(comp.img&&comp.img.url)URL.revokeObjectURL(comp.img.url);$('#compose').hidden=true;document.body.style.overflow=''}
async function renderSlot(){
  const s=$('#cSlot'),i=comp.img;
  if(!i){s.className='slot';s.style.width='';s.innerHTML='<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 5v14M5 12h14"/></svg>一张照片</span>';$('#cOps').hidden=true;$('#cExif').hidden=true;return}
  s.className='slot has';s.style.width=Math.round(Math.min(200,150*i.w/i.h))+'px';s.innerHTML=`<img alt="" src="${i.url||await imgURL(i.k)}">`;$('#cOps').hidden=false;
  const ex=$('#cExif');if(comp.et&&Math.abs(comp.et-comp.t)>30*60e3){const d=new Date(comp.et);ex.hidden=false;ex.textContent=`用拍摄时间 · ${mdCN(d)} ${shichen(d.getHours())}`}else ex.hidden=true;
}
function renderCWx(){
  const w=comp.w||{};
  $('#cWx').innerHTML=Object.entries(WX).map(([k,v])=>`<button class="wxb${w.type===k?' on':''}" data-wx="${k}">${wxSvg(k)}${v.n}</button>`).join('');
}
function renderCTag(){$('#cTag').innerHTML=TAGS.map(t=>`<button class="wxb${comp.tag===t?' on':''}" data-ctag="${t}">${t}</button>`).join('')}
function checkPost(){$('#cPost').disabled=!($('#cText').value.trim()||comp.img)}
$('#cText').addEventListener('input',checkPost);
$('#cCancel').addEventListener('click',()=>{if(($('#cText').value.trim()||comp.img&&!comp.img.keep)&&!comp.id&&!confirm('不写了？这条不会留下。'))return;closeCompose()});
function choosePhoto(){pick(async f=>{toast('正在放进来…');const r=await takePhoto(f,1440);if(!r)return;if(comp.img&&comp.img.url)URL.revokeObjectURL(comp.img.url);
  comp.img={blob:r.blob,w:r.w,h:r.h,url:URL.createObjectURL(r.blob)};comp.et=r.et;
  if(!comp.id&&r.et&&Math.abs(r.et-Date.now())<20*60e3)comp.et=0;renderSlot();checkPost();toast('放好了',1200)})}
$('#cSlot').addEventListener('click',choosePhoto);$('#cSwap').addEventListener('click',choosePhoto);
$('#cDrop').addEventListener('click',()=>{if(comp.img&&comp.img.url)URL.revokeObjectURL(comp.img.url);comp.img=null;comp.et=0;renderSlot();checkPost()});
$('#cExif').addEventListener('click',()=>{comp.t=comp.et;$('#cTime').value=dtl(comp.t);$('#cExif').hidden=true;toast('改成照片拍的那一刻了')});
$('#cTime').addEventListener('change',e=>{const d=new Date(e.target.value);if(!isNaN(d))comp.t=+d});
$('#cLock').addEventListener('click',()=>toast('这里本来就只有你'));
$('#cWx').addEventListener('click',e=>{const b=e.target.closest('[data-wx]');if(!b)return;const k=b.dataset.wx;
  comp.w=comp.w&&comp.w.type===k?{type:''}:{type:k};renderCWx()});
$('#cTag').addEventListener('click',e=>{const b=e.target.closest('[data-ctag]');if(!b)return;comp.tag=comp.tag===b.dataset.ctag?'':b.dataset.ctag;renderCTag()});
$('#cPost').addEventListener('click',async()=>{
  const text=$('#cText').value.replace(/\s+$/,'');if(!text.trim()&&!comp.img)return;
  const btn=$('#cPost');btn.disabled=true;
  const old=comp.id&&posts.find(x=>x.id===comp.id);
  const p=old||{id:uid(),seals:[],notes:[]};
  Object.assign(p,{text,t:comp.t,w:comp.w&&comp.w.type?comp.w:null,where:$('#cWhere').value.trim(),tag:comp.tag});
  try{
    if(comp.img&&comp.img.blob){const k='p'+p.id+'-'+Date.now().toString(36);await putImg(k,comp.img.blob);if(p.img&&p.img.k!==k)delImg(p.img.k);p.img={k,w:comp.img.w,h:comp.img.h}}
    else if(!comp.img&&p.img){delImg(p.img.k);p.img=null}
  }catch(e){btn.disabled=false;return toast('照片存不下了，这台设备的空间可能满了')}
  if(!await savePost(p)){btn.disabled=false;return}
  if(!old)posts.push(p);byT();askPersist();closeCompose();
  if(old){route();toast('改好了')}else{tagF='';if(location.hash&&location.hash!=='#/'&&location.hash!=='#'){navDepth=0;location.hash='#/'}else route();feedY=0;scrollTo(0,0);toast('落笔了。只有你看得见。')}
});

/* ───────── 设置 ───────── */
const PAPERS=[['xuan','宣纸','#f6efe0'],['yuebai','月白','#f2f4f0'],['ouhe','藕荷','#f7eded'],['xiang','缃色','#f6ecce'],['zhuqing','竹青','#f1f3ea'],['yemo','夜墨','#1f1d1a']];
function applyPaper(){document.documentElement.dataset.paper=set.paper;const m=document.querySelector('meta[name=theme-color]');if(m)m.content=(PAPERS.find(x=>x[0]===set.paper)||PAPERS[0])[2]}
function openSettings(){
  const hasSample=posts.some(p=>p.sample);
  openSheet(`<h3>我的<button data-close>×</button></h3>
  <label class="field">名字<input id="sName" maxlength="8" value="${esc(set.name)}"></label>
  <label class="field">签名<input id="sMotto" maxlength="24" value="${esc(set.motto)}" placeholder="一句话"></label>
  <h4>头像</h4><div class="two"><button class="btn ${set.avatar==='seal'?'':'plain'}" data-av="seal">用名章</button><button class="btn ${set.avatar==='photo'?'':'plain'}" data-av="photo">换一张照片</button></div>
  <h4>封面</h4><div class="two"><button class="btn ${set.cover==='paint'?'':'plain'}" data-cv="paint">用那幅小画</button><button class="btn ${set.cover==='photo'?'':'plain'}" data-cv="photo">换一张照片</button></div>
  <h4>纸色</h4><div class="papers">${PAPERS.map(([k,n,c])=>`<button data-paper="${k}" class="${set.paper===k?'on':''}"><i style="background:${c}"></i>${n}</button>`).join('')}</div>
  <h4>备份</h4><p class="sub">日记和照片只存在<b>这台设备上</b>，不上传。清理数据会一起清掉。文字可以复制成备份文字保存；照片带不进备份，想留的请用「存卡片」存到相册。</p>
  <div class="two"><button class="btn ghost" id="bOut">显示备份文字</button><button class="btn ghost" id="bIn">粘贴恢复</button></div><div id="bkArea"></div>
  ${hasSample?'<h4>示例</h4><div class="two"><button class="btn plain" id="dropSample">删去示例的几条</button></div>':''}
  ${DB.db?'':'<p class="sub" style="color:var(--zhu);margin-top:16px">这个浏览器不让存东西（可能是无痕模式），关掉页面就没了。</p>'}`);
}
sheet.addEventListener('input',e=>{
  if(e.target.id==='sName'){set.name=e.target.value.trim()||'无名';saveSet()}
  if(e.target.id==='sMotto'){set.motto=e.target.value;saveSet()}
});
sheet.addEventListener('change',()=>{if(view==='feed')renderHead()});
async function setImgFor(kind){pick(async f=>{toast('正在放进来…');const r=await takePhoto(f,kind==='cover'?1600:600);if(!r)return;
  try{await putImg(kind,r.blob)}catch(e){return toast('存不下了')}set[kind==='cover'?'cover':'avatar']='photo';saveSet();openSettings();route();toast('换好了')})}

/* 备份：文字版（不含照片）。导出/导入文件在容器里走不通，改成复制粘贴 */
function showBackup(){
  const out={app:'sujianji-quan',v:1,at:Date.now(),set,posts:posts.map(p=>Object.assign({},p,{img:null}))};
  $('#bkArea').innerHTML='<p class="sub" style="margin-top:10px">点文字框全选，复制保存（备忘录、聊天都行）。不含照片。</p><textarea id="bkText" readonly style="display:block;width:100%;height:120px;border:1px solid var(--line-2);background:var(--paper-2);padding:8px;font-size:13px"></textarea><button class="btn plain" id="bkSel" style="margin-top:8px">全选</button>';
  const t=$('#bkText');t.value=JSON.stringify(out);t.addEventListener('focus',()=>t.select());
}
function showRestore(){
  $('#bkArea').innerHTML='<p class="sub" style="margin-top:10px">把备份文字整段粘贴到这里，会和现有的合在一起。</p><textarea id="bkIn" placeholder="粘贴备份文字" style="display:block;width:100%;height:120px;border:1px solid var(--line-2);background:var(--paper-2);padding:8px;font-size:13px"></textarea><button class="btn" id="bkGo" style="margin-top:8px">合并恢复</button>';
}
async function doRestore(){
  try{const j=JSON.parse($('#bkIn').value);if(j.app!=='sujianji-quan'||!Array.isArray(j.posts))throw new Error('不是素笺集的备份');
    let n=0;for(const p of j.posts){p.seals=p.seals||[];p.notes=p.notes||[];const i=posts.findIndex(x=>x.id===p.id);if(i>=0){p.img=posts[i].img||null;posts[i]=p}else{p.img=null;posts.push(p);n++}await dbPut('posts',p)}
    if(j.set){['name','motto','paper'].forEach(k=>{if(j.set[k])set[k]=j.set[k]});saveSet();applyPaper()}
    byT();closeSheet();route();toast(`恢复好了，新添 ${cnNum(n)} 条`)}catch(e){toast('这段文字读不出来：'+(e.message||'格式不对'),4000)}
}

/* ───────── 存卡片：直接在画布上画，不依赖外部库，断网也能存 ───────── */
const FT='"WenKai Embed","LXGW WenKai","Kaiti SC","STKaiti","KaiTi",serif',FH='"LongCang Embed","Long Cang",'+FT;
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath()}
function drawSeal(c,txt,shape,mode,cx,cy,size,rot,C){
  const ch=[...String(txt||'').trim()].slice(0,4);if(!ch.length)ch.push('印');
  const red=C.zhu,tc=mode==='bai'?C.paper:red;
  let vw=76,vh=76;if(shape==='yuan')vw=vh=80;if(shape==='chang'){vw=44;vh=Math.max(76,ch.length*30+16)}
  c.save();c.translate(cx,cy);c.rotate(rot*Math.PI/180);const k=size/Math.max(vw,vh);c.scale(k,k);c.translate(-vw/2,-vh/2);
  const T=(s,x,y,fs,sx=1,sy=1)=>{c.save();c.translate(x,y);c.scale(sx,sy);c.font=`${fs}px ${FT}`;c.textAlign='center';c.textBaseline='alphabetic';c.fillStyle=tc;c.fillText(s,0,0);c.restore()};
  c.fillStyle=red;c.strokeStyle=red;
  if(shape==='yuan'){c.beginPath();if(mode==='bai'){c.arc(40,40,37,0,Math.PI*2);c.fill()}else{c.lineWidth=4;c.arc(40,40,35,0,Math.PI*2);c.stroke()}
    if(ch.length===1)T(ch[0],40,54,40);else if(ch.length===2){T(ch[0],40,37,26);T(ch[1],40,64,26)}else{T(ch[0],52,37,20);T(ch[1],52,61,20);T(ch[2],28,37,20);if(ch[3])T(ch[3],28,61,20)}}
  else if(shape==='chang'){const n=ch.length,step=(vh-16)/n;if(mode==='bai'){rr(c,2,2,40,vh-4,4);c.fill()}else{c.lineWidth=3.5;rr(c,3,3,38,vh-6,5);c.stroke()}ch.forEach((s,i)=>T(s,22,8+step*i+step/2+26*.36,26))}
  else{if(mode==='bai'){rr(c,3,3,70,70,3);c.fill()}else{c.lineWidth=3.5;rr(c,4,4,68,68,7);c.stroke()}
    if(ch.length===1)T(ch[0],38,56,46);else if(ch.length===2){T(ch[0],54,57,30,.78,1.45);T(ch[1],22,57,30,.78,1.45)}
    else if(ch.length===3){T(ch[0],54,35,24);T(ch[1],54,65,24);T(ch[2],22,60,30,.8,1.8)}else{T(ch[0],54,35,24);T(ch[1],54,65,24);T(ch[2],22,35,24);T(ch[3],22,65,24)}}
  c.restore();
}
function drawNameSeal(c,name,x,y,size,C){const s=sealChars(name);c.save();c.translate(x,y);const k=size/76;c.scale(k,k);c.fillStyle=C.zhu;c.fillRect(0,0,76,76);c.fillStyle=C.paper;c.textAlign='center';c.textBaseline='alphabetic';
  if(s.long){c.font=`${Math.min(18,120/s.long.length)}px ${FT}`;c.fillText(s.long,38,44)}
  else s.cols.forEach((col,ci)=>{const x2=ci===0?54:22;col.forEach((ch,ri)=>{const y2=col.length===1?52:(ri===0?35:65);c.font=`${col.length===1?39:26}px ${FT}`;c.fillText(ch,x2,y2)})});c.restore()}
function wrapText(c,text,maxW){const out=[],NO='，。！？、；：”’」』）》…—,.!?;:)～~';
  String(text).split('\n').forEach(par=>{let line='';for(const ch of par){const t=line+ch;if(line&&c.measureText(t).width>maxW){if(NO.includes(ch)){line=t;continue}out.push(line);line=ch}else line=t}out.push(line)});return out}
async function makeCard(p){
  try{await Promise.all([document.fonts.load(`42px ${FT}`,'素笺'),document.fonts.load(`40px ${FH}`,'素笺')])}catch(e){}
  const cs=getComputedStyle(document.documentElement),V=n=>cs.getPropertyValue(n).trim();
  const C={paper:V('--paper'),paper2:V('--paper-2'),ink:V('--ink'),ink2:V('--ink-2'),ink3:V('--ink-3'),zhu:V('--zhu'),line:V('--line-2')};
  const dark=set.paper==='yemo';
  const W=1080,M=116,IW=W-2*M;
  let img=null;if(p.img){try{img=await loadImg(await imgURL(p.img.k))}catch(e){}}
  let av=null;if(set.avatar==='photo'){try{av=await loadImg(await imgURL('avatar'))}catch(e){}}
  const m=document.createElement('canvas').getContext('2d');
  m.font=`42px ${FT}`;const lines=p.text?wrapText(m,p.text,IW):[];const LH=76;
  m.font=`42px ${FH}`;const notes=(p.notes||[]).map(n=>({lab:`${set.name} · ${afterRel(p.t,n.t)}批`,ls:wrapText(m,n.text,IW-56)}));
  const d=new Date(p.t),meta=[wxText(p.w),p.where?'于 '+p.where:'',p.tag?'#'+p.tag:''].filter(Boolean).join('　·　');
  let y=140;const L={head:y};y+=150;
  L.text=y;y+=lines.length*LH;if(lines.length)y+=24;
  let ih=0,sy=0,sx=0,cropH=0;
  if(img){const r=img.naturalHeight/img.naturalWidth,rr2=Math.min(r,1.3);ih=Math.round(IW*rr2);cropH=img.naturalWidth*rr2;sy=(img.naturalHeight-cropH)/2;L.img=y;y+=ih+56}
  else if(p.seals&&p.seals.length){L.sealRow=y;y+=150}
  if(meta){L.meta=y;y+=56}
  if(notes.length){L.notes=y+10;let bh=28;notes.forEach(n=>{bh+=44+n.ls.length*64+14});L.nh=bh;y+=bh+50}
  y+=30;L.foot=y;y+=set.motto?200:160;const H=y;
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;const c=cv.getContext('2d');
  c.fillStyle=C.paper;c.fillRect(0,0,W,H);
  /* 细细的纸纹 */
  c.save();c.globalAlpha=dark?.05:.06;for(let i=0;i<W*H/900;i++){c.fillStyle=Math.random()<.5?'#000':'#fff';c.fillRect(Math.random()*W,Math.random()*H,1.6,1.6)}c.restore();
  c.strokeStyle=C.line;c.lineWidth=3;c.strokeRect(44,44,W-88,H-88);c.lineWidth=1.2;c.globalAlpha=.6;c.strokeRect(58,58,W-116,H-116);c.globalAlpha=1;
  c.font=`26px ${FT}`;c.textAlign='center';const bx='素　笺　集';const bw=c.measureText(bx).width+40;c.fillStyle=C.paper;c.fillRect(W/2-bw/2,30,bw,40);c.fillStyle=C.ink3;c.textBaseline='middle';c.fillText(bx,W/2,52);
  /* 头 */
  if(av){c.save();rr(c,M,L.head,104,104,10);c.clip();const s=Math.min(av.naturalWidth,av.naturalHeight);c.drawImage(av,(av.naturalWidth-s)/2,(av.naturalHeight-s)/2,s,s,M,L.head,104,104);c.restore()}else drawNameSeal(c,set.name,M,L.head,104,C);
  c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle=C.zhu;c.font=`44px ${FT}`;c.fillText(set.name,M+132,L.head+46);
  c.fillStyle=C.ink3;c.font=`27px ${FT}`;c.fillText(`${cnYear(d.getFullYear())}年${mdCN(d)} ${shichen(d.getHours())}`,M+132,L.head+92);
  const lj=[lunar(d)?'农历'+lunar(d):'',jieqi(d)].filter(Boolean).join(' · ');if(lj)c.fillText(lj,M+132,L.head+128);
  /* 字 */
  c.fillStyle=C.ink;c.font=`42px ${FT}`;lines.forEach((ln,i)=>c.fillText(ln,M,L.text+i*LH+50));
  /* 图与章 */
  const stampAt=(cx0,cy0)=>{c.save();let x=cx0;
    [...p.seals].reverse().forEach(s=>{const dd=SEALS[s.s];if(!dd)return;c.globalCompositeOperation=dark||dd.mode==='bai'?'source-over':'multiply';c.globalAlpha=dd.mode==='bai'?.95:.92;const ch=dd.shape==='chang',sz=ch?150:118,wid=ch?86:118;drawSeal(c,dd.txt,dd.shape,dd.mode,x-wid/2,cy0-(ch?75:59),sz,s.r,C);x-=wid-6});c.restore()};
  if(img){c.save();c.shadowColor='rgba(0,0,0,.2)';c.shadowBlur=26;c.shadowOffsetY=10;c.fillStyle=C.paper;c.fillRect(M,L.img,IW,ih);c.restore();
    c.drawImage(img,0,sy,img.naturalWidth,cropH,M,L.img,IW,ih);if(p.seals&&p.seals.length)stampAt(M+IW+22,L.img+ih+26)}
  else if(L.sealRow)stampAt(M+IW,L.sealRow+140);
  if(meta){c.fillStyle=C.ink3;c.font=`28px ${FT}`;c.textAlign='left';c.fillText(meta,M,L.meta+30)}
  /* 批注 */
  if(notes.length){c.fillStyle=C.paper2;c.fillRect(M,L.notes,IW,L.nh);c.beginPath();c.moveTo(M+28,L.notes);c.lineTo(M+42,L.notes-14);c.lineTo(M+56,L.notes);c.fill();
    let yy=L.notes+28;notes.forEach(n=>{c.fillStyle=C.zhu;c.font=`27px ${FT}`;c.fillText(n.lab,M+28,yy+30);yy+=44;c.fillStyle=C.ink;c.font=`42px ${FH}`;n.ls.forEach(l=>{c.fillText(l,M+28,yy+46);yy+=64});yy+=14})}
  /* 尾 */
  c.textAlign='center';c.fillStyle=C.ink3;c.font=`26px ${FT}`;c.fillText('素笺集 · 只给自己看的朋友圈',W/2,L.foot+60);
  if(set.motto){c.font=`24px ${FT}`;c.globalAlpha=.8;c.fillText('「'+set.motto+'」',W/2,L.foot+100);c.globalAlpha=1}
  return toBlob(cv,.92);
}
const miniTool=()=>window.xhs&&window.xhs.miniTool;
const canSaveAlbum=()=>{const m=miniTool();return !!(m&&typeof m.writeTempFile==='function'&&typeof m.saveImageToPhotosAlbum==='function')};
const shot=$('#shot');let shotBlob=null,shotURL='',shotName='',shotRun=0;
async function openShot(id){
  const p=posts.find(x=>x.id===id);if(!p)return;closeAct();const run=++shotRun;
  shot.classList.add('on');document.body.style.overflow='hidden';$('#shotView').innerHTML='<div class="shot-wait">正在铺纸、落墨……</div>';$('#shotTip').textContent='';$('#shotSave').disabled=true;
  try{const b=await makeCard(p);if(run!==shotRun)return;if(shotURL)URL.revokeObjectURL(shotURL);shotBlob=b;shotURL=URL.createObjectURL(b);
    const d=new Date(p.t);shotName=`素笺集-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}.jpg`;
    $('#shotView').innerHTML=`<img src="${shotURL}" alt="卡片">`;$('#shotTip').textContent=canSaveAlbum()?'点「存到相册」保存':'这里存不到相册，可以先用系统截图';
    $('#shotSave').disabled=false}
  catch(e){$('#shotView').innerHTML='<div class="shot-wait">这张没画成，再试一次？</div>'}
}
function closeShot(){shotRun++;shot.classList.remove('on');document.body.style.overflow=''}
$('#shotX').addEventListener('click',closeShot);
$('#shotSave').addEventListener('click',async()=>{if(!shotBlob)return;
  if(!canSaveAlbum())return toast('这里存不到相册，可以先用系统截图');
  const btn=$('#shotSave');btn.disabled=true;
  try{const m=miniTool(),res=await m.writeTempFile({data:await blobToData(shotBlob)});await m.saveImageToPhotosAlbum({filePath:res.filePath});toast('已存到相册')}
  catch(e){toast('没存成：'+(e&&(e.errMsg||e.message)||'请稍后再试'))}
  finally{btn.disabled=false}});

/* ───────── 点来点去 ───────── */
document.addEventListener('click',async e=>{
  const t=e.target.closest('button,[data-open],[data-view],[data-more],.c,.cover,#toAlbum,#toNew');
  if(!t){closeAct();return}
  if(actEl&&!t.closest('.act')&&!t.matches('[data-act]'))closeAct();
  const d=t.dataset;
  if(t.id==='toAlbum')return go('#/album');
  if(t.id==='toNew'||d.new!==undefined)return openCompose();
  if(d.back!==undefined)return back();
  if(d.close!==undefined)return closeSheet();
  if(d.act){if(actEl){closeAct();return}return openAct(d.act,t)}
  if(d.stamp){closeAct();return openStamp(d.stamp)}
  if(d.seal){const [id,k]=d.seal.split('|');return toggleSeal(id,k)}
  if(d.cmt){closeAct();return openCbar(d.cmt)}
  if(d.card)return openShot(d.card);
  if(d.edit)return openCompose(d.edit);
  if(d.del){const p=posts.find(x=>x.id===d.del);if(!p||!confirm('删去这一条？照片、章和批注会一起删掉。'))return;
    posts=posts.filter(x=>x!==p);await dbDel('posts',p.id).catch(()=>{});if(p.img)delImg(p.img.k);toast('删去了');return back()}
  if(d.open)return go('#/p/'+d.open);
  if(d.view){const p=posts.find(x=>x.id===d.view);if(!p)return;if(view==='feed')return go('#/p/'+p.id);
    const v=document.createElement('div');v.className='viewer';v.innerHTML=`<img src="${await imgURL(p.img.k)}" alt="">`;v.addEventListener('click',()=>v.remove());document.body.appendChild(v);return}
  if(d.more!==undefined){const tx=t.previousElementSibling;const on=tx.classList.toggle('clamp');t.textContent=on?'全文':'收起';return}
  if(t.classList.contains('c')&&view==='detail'){const [pid,nid]=t.dataset.note.split('|');const p=posts.find(x=>x.id===pid);if(!p||!confirm('删去这条批注？'))return;
    p.notes=p.notes.filter(n=>n.id!==nid);await savePost(p);refreshPost(p);return}
  if(d.tag!==undefined){tagF=d.tag;renderFeed();const ch=$('#chips');scrollTo(0,Math.min(scrollY,ch.offsetTop-60));return}
  if(d.set!==undefined)return openSettings();
  if(t.classList.contains('cover')&&!e.target.closest('.av')){return openSheet(`<h3>封面<button data-close>×</button></h3><div class="two"><button class="btn ${set.cover==='paint'?'':'plain'}" data-cv="paint">用那幅小画</button><button class="btn ${set.cover==='photo'?'':'plain'}" data-cv="photo">换一张照片</button></div>`)}
  if(d.av){if(d.av==='photo')return setImgFor('avatar');set.avatar='seal';saveSet();openSettings();route();return}
  if(d.cv){closeSheet();if(d.cv==='photo')return setImgFor('cover');set.cover='paint';saveSet();route();return}
  if(d.paper){set.paper=d.paper;saveSet();applyPaper();openSettings();return}
  if(t.id==='bOut')return showBackup();
  if(t.id==='bIn')return showRestore();
  if(t.id==='bkSel'){const x=$('#bkText');x.focus();x.select();return}
  if(t.id==='bkGo')return doRestore();
  if(t.id==='dropSample'){if(!confirm('删去示例的几条？你自己写的不会动。'))return;for(const p of posts.filter(x=>x.sample)){await dbDel('posts',p.id).catch(()=>{});if(p.img)delImg(p.img.k)}posts=posts.filter(x=>!x.sample);closeSheet();route();toast('示例删去了，这里只剩你自己的了');return}
});
addEventListener('keydown',e=>{if(e.key==='Escape'){if(shot.classList.contains('on'))closeShot();else if(document.querySelector('.viewer'))document.querySelector('.viewer').remove();else if(sheet.classList.contains('on'))closeSheet();else closeAct()}});

/* ───────── 示例：第一次打开时放几条，随时可以删 ───────── */
function rnd(seed){let s=seed;return()=>(s=(s*16807)%2147483647)/2147483647}
const SAMPLE_SVG={
  gui:()=>{const r=rnd(7);let g='';for(let i=0;i<46;i++){const x=r()*900,y=r()*1200,a=r()*180,l=110+r()*70;g+=`<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${(l/2).toFixed(0)}" ry="${(l/5.5).toFixed(0)}" transform="rotate(${a.toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})" fill="${['#4f6b45','#5d7b50','#3f5a3a','#6b8a5a'][i%4]}" opacity=".95"/>`}
    let f='';for(let i=0;i<34;i++){const cx=60+r()*780,cy=60+r()*1080;for(let j=0;j<9;j++){const x=cx+(r()-.5)*60,y=cy+(r()-.5)*50;f+=`<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})">${[0,90,180,270].map(a=>`<ellipse rx="6" ry="9" transform="rotate(${a+45}) translate(0 -7)" fill="#f2b84b"/>`).join('')}<circle r="3.5" fill="#e09a2e"/></g>`}}
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200"><defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8ecd9"/><stop offset="1" stop-color="#c9d4b8"/></linearGradient></defs><rect width="900" height="1200" fill="url(#a)"/><g opacity=".5">${g}</g>${g}${f}<rect x="0" y="0" width="900" height="1200" fill="#fff6e0" opacity=".08"/></svg>`},
  hun:()=>{const r=rnd(11);let w='';const pos=[[420,430],[560,400],[620,520],[500,560],[380,560],[460,660],[590,650]];
    pos.forEach(([x,y],i)=>{w+=`<g transform="translate(${x} ${y}) rotate(${(r()*60-30).toFixed(0)})"><path d="M-62 6 Q-40 -46 0 -40 Q44 -46 62 6 Q30 34 0 26 Q-30 34 -62 6Z" fill="#f7f1e6" stroke="#e2d6c0" stroke-width="3"/><ellipse cx="0" cy="-6" rx="24" ry="18" fill="#efe2cf"/></g>`});
    let s='';for(let i=0;i<40;i++)s+=`<rect x="${(320+r()*380).toFixed(0)}" y="${(330+r()*380).toFixed(0)}" width="${(10+r()*10).toFixed(0)}" height="6" rx="3" transform="rotate(${(r()*180).toFixed(0)} 500 500)" fill="${i%3?'#6f9a4f':'#8db86a'}"/>`;
    let z='';for(let i=0;i<14;i++)z+=`<path d="M${(330+r()*360).toFixed(0)} ${(340+r()*360).toFixed(0)} q14 -10 28 0" stroke="#2f3a2a" stroke-width="5" fill="none" opacity=".7"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><rect width="1000" height="1000" fill="#7a5640"/>${Array.from({length:12},(_,i)=>`<path d="M0 ${i*90+20} Q500 ${i*90+50} 1000 ${i*90+10}" stroke="#6a4a36" stroke-width="5" fill="none"/>`).join('')}
    <ellipse cx="510" cy="540" rx="330" ry="330" fill="#3d2c22" opacity=".35"/><circle cx="500" cy="520" r="320" fill="#f3eee4"/><circle cx="500" cy="520" r="268" fill="#c99b5e"/><circle cx="500" cy="520" r="268" fill="#e3b977" opacity=".5"/>${w}${s}${z}
    <ellipse cx="420" cy="440" rx="40" ry="10" fill="#fff" opacity=".35"/><path d="M800 180 L640 400" stroke="#f3eee4" stroke-width="34" stroke-linecap="round"/><ellipse cx="620" cy="430" rx="52" ry="66" transform="rotate(35 620 430)" fill="#f3eee4"/></svg>`},
  hai:()=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fb6cc"/><stop offset=".55" stop-color="#e9c3b4"/><stop offset="1" stop-color="#f4d9c4"/></linearGradient><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7b97ad"/><stop offset="1" stop-color="#58778e"/></linearGradient></defs>
    <rect width="1200" height="900" fill="url(#s)"/><circle cx="860" cy="420" r="58" fill="#fbe7cf"/><rect y="440" width="1200" height="300" fill="url(#w)"/><path d="M700 450 h320" stroke="#fbe7cf" stroke-width="6" opacity=".7"/><path d="M760 480 h200 M800 510 h120" stroke="#fbe7cf" stroke-width="4" opacity=".5"/>
    ${Array.from({length:7},(_,i)=>`<path d="M0 ${560+i*28} q60 -14 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0" stroke="#dbe6ee" stroke-width="3" fill="none" opacity="${(.5-i*.05).toFixed(2)}"/>`).join('')}
    <path d="M0 720 Q300 680 600 712 T1200 700 V900 H0Z" fill="#e8d6ba"/><path d="M0 716 Q300 676 600 708 T1200 696" stroke="#fff" stroke-width="8" fill="none" opacity=".7"/>${Array.from({length:8},(_,i)=>`<ellipse cx="${300+i*70}" cy="${860-i*16}" rx="9" ry="14" fill="#cdb894"/>`).join('')}
    <path d="M300 300 q14 -10 28 0 q14 -10 28 0" stroke="#4d5866" stroke-width="3" fill="none"/></svg>`
};
async function svgToJpeg(svg,maxp){const im=await loadImg('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg));const w=im.naturalWidth||1000,h=im.naturalHeight||1000,sc=maxp/Math.max(w,h);
  const c=document.createElement('canvas');c.width=Math.round(w*sc);c.height=Math.round(h*sc);c.getContext('2d').drawImage(im,0,0,c.width,c.height);return {blob:await toBlob(c,.86),w:c.width,h:c.height}}
async function seed(){
  const now=new Date(),at=(daysAgo,h,mi)=>{const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-daysAgo,h,mi);return +d};
  const lastYear=+new Date(now.getFullYear()-1,now.getMonth(),now.getDate(),16,5);
  const S=[
    {k:'gui',text:'下楼买咖啡，发现桂花又开了一轮。\n站在树底下闻了半分钟，被路过的阿姨看了一眼。',t:Math.min(+now-40*60e3,at(0,12,20)),w:{type:'qing',lo:15,hi:22},where:'楼下那棵桂花树',tag:'碎碎念',seals:[{s:'shenhao',r:-7}],notes:[]},
    {k:'hun',text:'加班到九点半，回家路上吃了一碗小馄饨。\n汤很烫，人活过来了。',t:at(1,21,48),w:{type:'yin'},where:'弄堂口的馄饨铺',tag:'好吃的',seals:[{s:'chibao',r:5}],notes:[{t:+now-2*3600e3,text:'今天又去了，老板认得我了。'}]},
    {k:null,text:'决定这周不看他的朋友圈了。',t:at(3,23,10),w:null,where:'',tag:'自己',seals:[{s:'zhidao',r:-4},{s:'xiabu',r:6}],notes:[{t:at(2,8,30),text:'第二天早上就破功了。'}]},
    {k:'hai',text:'第一次一个人去看海。\n风很大，头发全糊在脸上，但是很开心。',t:lastYear,w:{type:'yun'},where:'东极岛',tag:'出门',seals:[{s:'xi',r:-6}],notes:[{t:+now-3600e3,text:'今年也想去。'}]}
  ];
  for(const s of S){const p={id:uid(),text:s.text,t:s.t,w:s.w,where:s.where,tag:s.tag,seals:s.seals.map(x=>Object.assign({},x,{t:s.t})),notes:s.notes.map(n=>Object.assign({id:uid()},n)),sample:true,img:null};
    if(s.k){try{const r=await svgToJpeg(SAMPLE_SVG[s.k](),1100);const k='sample-'+s.k;await putImg(k,r.blob);p.img={k,w:r.w,h:r.h}}catch(e){}}
    await dbPut('posts',p).catch(()=>{});posts.push(p)}
  set.seeded=true;saveSet();
}

/* ───────── 开张 ───────── */
(async function init(){
  applyPaper();
  DB.db=await idbOpen();if(!DB.db){DB.mem={posts:new Map(),imgs:new Map()};setTimeout(()=>toast('这个浏览器不让存东西（可能是无痕模式），关掉页面就没了',4500),800)}
  try{posts=(await dbAll('posts'))||[]}catch(e){posts=[]}
  posts.forEach(p=>{p.seals=p.seals||[];p.notes=p.notes||[]});
  if(!set.seeded&&!posts.length)await seed();
  byT();route();
})();
})();

