(function(){
/* ───────── 存储（读写都包 try/catch，存不下也能正常用） ───────── */
const KEY='xinglvlu-book-v3', GKEY='xinglvlu-gens-v3', OLD='xinglvlu-page-v2';
const store={
  get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}},
  del(k){try{localStorage.removeItem(k)}catch(e){}}
};
let seq=Date.now();const uid=()=>(seq++).toString(36);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ───────── 配置 ───────── */
const STYLES=[
  {id:'xuan',name:'宣纸墨韵',desc:'米黄宣纸、松烟墨',c:['#f6efe0','#b23a2b']},
  {id:'qinghua',name:'青花素瓷',desc:'月白底、钴蓝字',c:['#f5f4ee','#2c4f8f']},
  {id:'zhusha',name:'朱砂花笺',desc:'淡绯笺、朱砂印',c:['#f8ebe3','#a8342a']},
  {id:'zhuqing',name:'竹青小札',desc:'竹纸、青绿',c:['#f1f3ea','#4d7350']},
  {id:'yemo',name:'灯下夜墨',desc:'深色 · 夜里写',c:['#1f1d1a','#d3604f']}
];
const LAYOUTS=[
  {id:'single',name:'单栏',desc:'一气呵成，从上往下读'},
  {id:'album',name:'册页',desc:'左右对开，像翻一本册子'},
  {id:'scroll',name:'竖题',desc:'卷首竖排在右，正文在左'}
];
const PARTS=[
  {id:'head',name:'卷首',eat:'地点 · 日期 · 天气'},
  {id:'body',name:'正文',eat:'你写的这一天'},
  {id:'photos',name:'照片',eat:'照片 · 拍摄时刻 · 参数'},
  {id:'hours',name:'十二时辰',eat:'照片拍摄时刻'},
  {id:'ticket',name:'路引',eat:'这一程的起止与交通'},
  {id:'food',name:'饮馔',eat:'吃了什么 · 好不好吃'},
  {id:'quote',name:'一句',eat:'当天听到的一句话'},
  {id:'note',name:'眉批',eat:'事后补的一笔'},
  {id:'seal',name:'印章',eat:'设置里的署名与闲章'}
];
const HOURS=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const GRADE=['好','平','不喜'];
const CN='〇一二三四五六七八九';
function cnNum(n){if(n<10)return CN[n];if(n<20)return '十'+(n%10?CN[n%10]:'');if(n<100)return CN[Math.floor(n/10)]+'十'+(n%10?CN[n%10]:'');return String(n)}

/* 新页的日期：按今天填，节气按常年日期推算（可能差一天，可以直接改） */
const JIEQI=[[1,5,'小寒'],[1,20,'大寒'],[2,4,'立春'],[2,19,'雨水'],[3,5,'惊蛰'],[3,20,'春分'],[4,4,'清明'],[4,20,'谷雨'],[5,5,'立夏'],[5,21,'小满'],[6,5,'芒种'],[6,21,'夏至'],[7,7,'小暑'],[7,22,'大暑'],[8,7,'立秋'],[8,23,'处暑'],[9,7,'白露'],[9,23,'秋分'],[10,8,'寒露'],[10,23,'霜降'],[11,7,'立冬'],[11,22,'小雪'],[12,7,'大雪'],[12,21,'冬至']];
function todayTexts(){
  const d=new Date(),y=d.getFullYear(),m=d.getMonth()+1,day=d.getDate(),today=new Date(y,m-1,day);
  const gz='甲乙丙丁戊己庚辛壬癸'[((y-4)%10+10)%10]+'子丑寅卯辰巳午未申酉戌亥'[((y-4)%12+12)%12];
  let last={t:new Date(y-1,11,21),n:'冬至'};
  JIEQI.forEach(([jm,jd,n])=>{const t=new Date(y,jm-1,jd);if(t<=today)last={t,n}});
  const diff=Math.round((today-last.t)/864e5);
  return {date:`${cnNum(m)}月${cnNum(day)}`,dateSub:`周${'日一二三四五六'[d.getDay()]} · ${gz}年 · ${diff?last.n+'后'+cnNum(diff)+'日':'今日'+last.n}`};
}

/* 样张（第一叶） */
const SAMPLE_TEXTS={
  meta:'N 30°00′ · E 117°59′ · 安徽黟县',place:'宏村',placeLat:'Hongcun',cheng:'第三程 · 共五程',
  date:'十月十一',dateSub:'周日 · 丙午年 · 寒露后三日',title:'雨里的白墙',
  weather:'小雨 14–19°C · 东北风二级 · 雨六毫米 · 日落 17:40 · 照片三十八张',
  body:'早上从屯溪坐车过来，一路都是雨。进村先看见南湖，水面灰白，画桥像是用淡墨轻轻一勾。沿着水圳往里走，家家门口的水都是活的，哗哗地往下流。中午在村口小馆吃了臭鳜鱼，闻着冲，吃着香。下午雨小了，在月沼边上坐了很久，什么也没想。',
  cap0:'画桥在雨里，一笔就够了。',cap1:'半个月亮形状的塘，倒影比真的还清楚。',cap2:'墙一级一级往上走，像在给天让路。',
  where0:'南湖画桥',where1:'月沼南岸',where2:'承志堂外',
  tkFrom:'屯溪',tkTo:'宏村',tkBy:'巴士',tkDep:'08:40 · 辰时',tkArr:'10:05 · 巳时',tkNote:'山路弯多，坐后排有点晕。',tkNo:'No.1011·03',
  foodTitle:'午食',foodWhere:'村口小馆 · 午正 12:20',foodSay:'「笋干太咸了，下次不点。」',foodEnd:'吃饱了',
  quote:'「白墙被雨打湿了，像一张没干透的宣纸。」',quoteBy:'同行的小林 · 巳正',
  note:'马头墙原来不是为了好看，是防火用的——一家着火，高墙能挡住火势，不往邻家走。回来查的，记一笔。'
};
const prefersDark=(()=>{try{return matchMedia('(prefers-color-scheme: dark)').matches}catch(e){return false}})();
function samplePage(){return{
  id:uid(),style:prefersDark?'yemo':'xuan',layout:'single',hidden:[],texts:Object.assign({},SAMPLE_TEXTS),
  photos:[
    {art:'lake',meta:{time:'巳正二刻 · 10:31',lens:'主摄 26mm',f:'ƒ/1.8',ss:'1/240 s',iso:'ISO 64',h:5}},
    {art:'pond',meta:{time:'午初三刻 · 11:43',lens:'长焦 4×',f:'ƒ/2.8',ss:'1/679 s',iso:'ISO 20',h:6}},
    {art:'wall',meta:{time:'未正一刻 · 14:18',lens:'主摄 26mm',f:'ƒ/1.8',ss:'1/320 s',iso:'ISO 80',h:7}}],
  hours:[0,0,0,0,4,9,12,7,5,1,0,0],
  food:[{n:'臭鳜鱼',g:0},{n:'毛豆腐',g:0},{n:'石耳炖鸡',g:1},{n:'笋干烧肉',g:2}],
  stickers:[{id:uid(),t:'ginkgo',a:'head',x:97,y:6,r:14,s:.8},{id:uid(),t:'cloud',a:'quote',x:88,y:82,r:-6,s:.9},{id:uid(),t:'wall',a:'hours',x:93,y:42,r:0,s:.85}]
}}
/* 空白页：沿用当前这一叶的风格和版式，其余全空 */
function blankPage(from){return{
  id:uid(),style:from?from.style:'xuan',layout:from?from.layout:'single',hidden:[],
  texts:todayTexts(),photos:[{},{},{}],hours:null,food:[],stickers:[]
}}

/* 贴纸（全部原创矢量） */
const plum=(x,y,s)=>{let g='';for(let i=0;i<5;i++){const a=i*72*Math.PI/180;g+=`<circle cx="${x+Math.sin(a)*5*s}" cy="${y-Math.cos(a)*5*s}" r="${4.2*s}" fill="#f1b9b4"/>`}return g+`<circle cx="${x}" cy="${y}" r="${2*s}" fill="#d8a23c"/>`};
const STICKERS={
  ginkgo:{name:'银杏',svg:`<svg viewBox="0 0 100 100"><path d="M50 92 L50 62" stroke="#8a6a2a" stroke-width="3" stroke-linecap="round"/><path d="M50 64 C20 62 8 32 16 18 C30 24 40 12 50 28 C60 12 70 24 84 18 C92 32 80 62 50 64Z" fill="#e2b33c" stroke="#a37a1c" stroke-width="2"/><path d="M50 62 L30 26 M50 62 L42 22 M50 62 L58 22 M50 62 L70 26" stroke="#c39424" stroke-width="1.2" fill="none"/></svg>`},
  cloud:{name:'祥云',svg:`<svg viewBox="0 0 120 70"><path d="M18 54 q-14 0 -12 -13 q2 -10 15 -8 q2 -17 21 -14 q10 -16 29 -6 q15 -6 23 7 q16 0 16 15 q0 11 -14 11 z" fill="#f8f2e4" stroke="#3b4a6b" stroke-width="3" stroke-linejoin="round"/><path d="M38 44 q6 -9 14 -3 q5 5 -1 9 M66 40 q7 -8 14 -1 q4 5 -2 8" fill="none" stroke="#3b4a6b" stroke-width="2.6" stroke-linecap="round"/></svg>`},
  persimmon:{name:'柿柿如意',svg:`<svg viewBox="0 0 100 100"><circle cx="50" cy="58" r="30" fill="#e2772e"/><ellipse cx="40" cy="48" rx="8" ry="5" fill="#f3a35e" opacity=".7"/><path d="M50 32 L38 26 L46 34 L34 38 L48 38 L50 46 L52 38 L66 38 L54 34 L62 26Z" fill="#5c7a3a"/><path d="M50 30 q2 -8 7 -10" stroke="#5a4020" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`},
  boat:{name:'乌篷船',svg:`<svg viewBox="0 0 120 70"><path d="M8 40 Q60 62 112 40 L102 46 Q60 60 18 46Z" fill="#2c2a28"/><path d="M38 41 Q58 16 82 41Z" fill="#3a3632"/><path d="M42 40 Q58 22 78 40" stroke="#5a554e" stroke-width="1.5" fill="none"/><path d="M12 58 h20 M44 62 h30 M86 58 h20" stroke="#4f6b8a" stroke-width="2" stroke-linecap="round" opacity=".6"/></svg>`},
  an:{name:'印 · 安',svg:`<svg viewBox="0 0 100 100"><rect x="8" y="8" width="84" height="84" rx="6" fill="#b23a2b"/><rect x="14" y="14" width="72" height="72" rx="3" fill="none" stroke="#f6e9dc" stroke-width="2" opacity=".6"/><text x="50" y="70" text-anchor="middle" font-size="56" fill="#f6e9dc" font-family="LXGW WenKai, KaiTi, serif">安</text></svg>`},
  xing:{name:'印 · 行',svg:`<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="10" fill="none" stroke="#b23a2b" stroke-width="5"/><text x="50" y="69" text-anchor="middle" font-size="54" fill="#b23a2b" font-family="LXGW WenKai, KaiTi, serif">行</text></svg>`},
  plum:{name:'梅枝',svg:`<svg viewBox="0 0 120 90"><path d="M6 80 Q40 70 58 46 Q70 30 104 18 M58 46 Q76 50 92 66 M36 70 Q34 54 24 44" stroke="#4a3426" stroke-width="3.2" fill="none" stroke-linecap="round"/>${plum(100,18,1)}${plum(80,32,.9)}${plum(92,64,1)}${plum(26,44,.9)}${plum(56,48,.8)}</svg>`},
  lantern:{name:'灯笼',svg:`<svg viewBox="0 0 80 110"><path d="M40 4 v10" stroke="#5a4020" stroke-width="2"/><rect x="26" y="14" width="28" height="8" rx="2" fill="#c9a24a"/><ellipse cx="40" cy="50" rx="30" ry="30" fill="#c8392b"/><path d="M40 20 Q22 50 40 80 M40 20 Q58 50 40 80 M40 20 v60" stroke="#9e2a20" stroke-width="1.5" fill="none"/><text x="40" y="58" text-anchor="middle" font-size="22" fill="#f4d68a" font-family="LXGW WenKai, KaiTi, serif">福</text><rect x="26" y="78" width="28" height="8" rx="2" fill="#c9a24a"/><path d="M34 86 v18 M40 86 v20 M46 86 v18" stroke="#c9a24a" stroke-width="2"/></svg>`},
  wall:{name:'马头墙',svg:`<svg viewBox="0 0 120 80"><path d="M6 74 V44 h14 V34 h16 V22 h48 V34 h16 V44 h14 V74Z" fill="#f4f1ea" stroke="#2c2a28" stroke-width="2"/><path d="M2 44 h22 M16 34 h24 M32 22 h56 M80 34 h24 M96 44 h22" stroke="#2c2a28" stroke-width="5" stroke-linecap="round"/><rect x="52" y="50" width="16" height="24" fill="#2c2a28"/><rect x="24" y="52" width="8" height="8" fill="#2c2a28" opacity=".7"/><rect x="88" y="52" width="8" height="8" fill="#2c2a28" opacity=".7"/></svg>`}
};

/* ───────── 整本的状态 ───────── */
function migrate(){
  const old=store.get(OLD,null);if(!old)return null;
  const p=samplePage();
  Object.keys(old.texts||{}).forEach(k=>{const m=/^food(\d)$/.exec(k);if(m){if(p.food[+m[1]])p.food[+m[1]].n=old.texts[k]}else p.texts[k]=old.texts[k]});
  (old.food||[]).forEach((g,i)=>{if(p.food[i])p.food[i].g=g});
  Object.keys(old.photos||{}).forEach(i=>{if(p.photos[i])p.photos[i].src=old.photos[i]});
  ['style','layout','hidden'].forEach(k=>{if(old[k])p[k]=old[k]});
  if(old.stickers)p.stickers=old.stickers.map(s=>Object.assign({},s,{id:uid()}));
  return {name:old.name||'青禾',motto:old.motto||'一程一记',cur:0,pages:[p]};
}
const book=store.get(KEY,null)||migrate()||{name:'青禾',motto:'一程一记',cur:0,pages:[samplePage()]};
if(!book.pages||!book.pages.length){book.pages=[samplePage()];book.cur=0}
book.cur=Math.max(0,Math.min(book.cur||0,book.pages.length-1));
const P=()=>book.pages[book.cur];
function save(){if(!store.set(KEY,book))toast('这台设备存不下了，多半是照片太多，最近的改动没存上');}

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const page=$('#page');

/* ───────── 插图（样张照片占位：水墨小景，随主题变色） ───────── */
function art(kind){
  const ink='fill:var(--ink)', bg='fill:var(--paper)';
  let rain='';for(let i=0;i<46;i++){const x=(i*37)%300,y=(i*53)%200;rain+=`<path d="M${x} ${y} l-4 12" style="stroke:var(--ink)" stroke-width=".8" opacity=".18"/>`}
  if(kind==='lake')return `<svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice"><rect width="300" height="400" style="${bg}"/>
    <path d="M0 170 Q40 120 90 150 T170 130 T240 145 T300 120 V400 H0Z" style="${ink}" opacity=".1"/>
    <path d="M0 205 Q60 170 120 196 T220 185 T300 178 V400 H0Z" style="${ink}" opacity=".18"/>
    <rect y="235" width="300" height="165" style="fill:var(--paper-2)"/>
    <path d="M70 240 Q150 168 230 240" style="stroke:var(--ink)" stroke-width="5" fill="none"/>
    <path d="M70 240 Q150 312 230 240" style="stroke:var(--ink)" stroke-width="3" fill="none" opacity=".22" stroke-dasharray="6 6"/>
    <path d="M20 280 h60 M110 300 h80 M200 285 h70 M40 330 h90 M170 350 h100" style="stroke:var(--ink)" stroke-width="1.2" opacity=".25"/>${rain}</svg>`;
  if(kind==='pond')return `<svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice"><rect width="300" height="400" style="${bg}"/>
    <g style="${ink}" opacity=".85"><path d="M10 170 h80 v-14 h-60z" /><path d="M110 150 h90 v-16 h-70z"/><path d="M210 172 h80 v-14 h-60z"/></g>
    <g style="fill:var(--paper-2);stroke:var(--ink)" stroke-width="1.5"><rect x="14" y="170" width="74" height="70"/><rect x="114" y="150" width="84" height="90"/><rect x="214" y="172" width="72" height="68"/></g>
    <g style="${ink}"><rect x="44" y="200" width="12" height="40"/><rect x="150" y="190" width="14" height="50"/><rect x="246" y="205" width="10" height="35"/></g>
    <path d="M0 240 H300 V400 H0Z" style="fill:var(--paper-2)"/>
    <g opacity=".22" style="${ink}"><rect x="14" y="244" width="74" height="60"/><rect x="114" y="244" width="84" height="80"/><rect x="214" y="244" width="72" height="58"/></g>
    <path d="M40 360 Q150 300 260 360" style="stroke:var(--ink)" stroke-width="1.5" fill="none" opacity=".35"/></svg>`;
  return `<svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice"><rect width="300" height="400" style="${bg}"/>
    <path d="M20 400 V250 h40 V200 h50 V140 h90 V200 h50 V250 h40 V400Z" style="fill:var(--paper-2);stroke:var(--ink)" stroke-width="2"/>
    <path d="M10 250 h60 M50 200 h70 M100 140 h110 M190 200 h70 M240 250 h60" style="stroke:var(--ink)" stroke-width="12" stroke-linecap="round"/>
    <rect x="128" y="300" width="44" height="100" style="${ink}"/>
    <rect x="60" y="290" width="22" height="22" style="${ink}" opacity=".7"/><rect x="220" y="290" width="22" height="22" style="${ink}" opacity=".7"/>
    <path d="M0 400 L300 360" style="stroke:var(--ink)" opacity=".08" stroke-width="80"/>${rain}</svg>`;
}

/* ───────── 文字：每个可写处都按当前这一叶读写 ───────── */
function renderTexts(){
  $$('[contenteditable][data-key]').forEach(el=>{el.textContent=P().texts[el.dataset.key]||''});
}
function bindTexts(root=document){
  root.querySelectorAll('[contenteditable][data-key]').forEach(el=>{
    if(el._b)return;el._b=1;
    el.addEventListener('input',()=>{
      const k=el.dataset.key,v=el.innerText;
      if(!v.trim())el.innerHTML='';
      P().texts[k]=v.trim()?v:'';save();
      if(k==='place')renderSeal();
      const m=/^where(\d)$/.exec(k);if(m){const t=document.querySelector(`.ph-tag[data-i="${m[1]}"]`);if(t)t.textContent=v.trim()}
      relayout();
    });
    el.addEventListener('paste',e=>{e.preventDefault();const t=(e.clipboardData||window.clipboardData).getData('text');document.execCommand('insertText',false,t)});
  });
}

/* ───────── 照片：空白页可以直接点着放照片，读得到拍摄信息就自动填背面 ───────── */
function renderPhotos(){
  const pg=P();
  $('#photos').innerHTML=pg.photos.map((ph,i)=>{
    const has=ph.src||ph.art, m=ph.meta||{};
    const row=(k,v,cn)=>`<dt>${k}</dt><dd class="${cn?'cn ':''}${v?'':'none'}">${v?esc(v):'—'}</dd>`;
    return `<figure class="photo" data-i="${i}">
      <div class="ph-inner">
        <div class="ph-face ph-front">${ph.src?`<img src="${ph.src}" alt="">`:ph.art?art(ph.art):`<div class="ph-empty"><b>＋</b>放一张照片</div>`}
          ${has?`<span class="ph-tag" data-i="${i}">${esc(pg.texts['where'+i]||'')}</span><span class="ph-swap" data-swap="${i}">换图</span>`:''}</div>
        <div class="ph-face ph-back"><dl>${row('时',m.time,1)}${row('镜',m.lens)}${row('光',m.f)}${row('快',m.ss)}${row('感',m.iso)}<dt>处</dt><dd class="cn" contenteditable data-key="where${i}" data-ph="在哪"></dd></dl><div class="hint">再点一下翻回去</div></div>
      </div>
      <figcaption class="caption" contenteditable data-key="cap${i}" data-ph="写一句这张照片"></figcaption>
    </figure>`}).join('');
  $$('.photo .ph-inner').forEach(el=>el.addEventListener('click',e=>{
    if(e.target.closest('[data-swap],[contenteditable]'))return;
    const i=+el.parentElement.dataset.i,ph=P().photos[i];
    if(!ph.src&&!ph.art)return pickPhoto(i);
    el.parentElement.classList.toggle('flipped');
  }));
  $$('[data-swap]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();pickPhoto(+b.dataset.swap)}));
}
/* 读 JPEG 里的 EXIF：拍摄时间、光圈、快门、感光度、焦距 */
function readExif(buf){
  try{const v=new DataView(buf);if(v.getUint16(0)!==0xFFD8)return null;let o=2;
    while(o<v.byteLength-4){const mk=v.getUint16(o),len=v.getUint16(o+2);
      if(mk===0xFFE1&&v.getUint32(o+4)===0x45786966)return parseTiff(v,o+10);
      if((mk&0xFF00)!==0xFF00)break;o+=2+len}
  }catch(e){}return null;
}
function parseTiff(v,t){
  const le=v.getUint16(t)===0x4949,u16=p=>v.getUint16(p,le),u32=p=>v.getUint32(p,le),out={};
  const ifd=off=>{const n=u16(t+off);for(let i=0;i<n;i++){const e=t+off+2+i*12,tag=u16(e),type=u16(e+2),cnt=u32(e+4);
    const size={2:1,3:2,4:4,5:8}[type];if(!size)continue;const p=cnt*size>4?t+u32(e+8):e+8;
    if(type===2){let s='';for(let j=0;j<cnt-1;j++)s+=String.fromCharCode(v.getUint8(p+j));out[tag]=s}
    else if(type===3)out[tag]=u16(p);else if(type===4)out[tag]=u32(p);else out[tag]=[u32(p),u32(p+4)]}};
  ifd(u32(t+4));if(out[0x8769])ifd(out[0x8769]);return out;
}
function exifMeta(x){
  if(!x)return {};const m={},r=a=>Array.isArray(a)&&a[1]?a[0]/a[1]:null;
  const mm=/(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d)/.exec(x[0x9003]||x[0x0132]||'');
  if(mm){const h=+mm[4],mi=+mm[5],ke=Math.floor(mi/15);m.h=Math.floor(((h+1)%24)/2);
    m.time=`${HOURS[m.h]}${h%2?'初':'正'}${ke?CN[ke]+'刻':''} · ${mm[4]}:${mm[5]}`}
  const fn=r(x[0x829D]);if(fn)m.f='ƒ/'+(+fn.toFixed(1));
  const et=r(x[0x829A]);if(et)m.ss=et<1?`1/${Math.round(1/et)} s`:`${+et.toFixed(1)} s`;
  if(x[0x8827])m.iso='ISO '+x[0x8827];
  if(x[0xA405])m.lens=x[0xA405]+'mm 等效';else{const fl=r(x[0x920A]);if(fl)m.lens=(+fl.toFixed(1))+'mm'}
  return m;
}
/* 选图：
   · 用一个常驻在页面里的 input——临时创建的 input 在 iPhone 上从相册慢慢挑时可能被回收，选完就没反应；
   · 解码分三步兜底：先缩小解码（相册里的大图、高像素原图最容易在这一步失败），再整张解码，最后转成 dataURL 解码；
   · 画完检查是不是空白，失败时把原因说出来。 */
const picker=document.createElement('input');
picker.type='file';picker.accept='image/*';
picker.style.cssText='position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0';
document.body.appendChild(picker);
let pickTarget=null;
function pickPhoto(i){pickTarget={pg:P(),i};picker.value='';picker.click()}
picker.addEventListener('change',()=>{
  const f=picker.files&&picker.files[0],t=pickTarget;pickTarget=null;
  if(f&&t)placePhoto(t.pg,t.i,f);
});
function readBuf(blob){
  if(blob.arrayBuffer)return blob.arrayBuffer();
  return new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(r.error);r.readAsArrayBuffer(blob)});
}
function loadImg(src){return new Promise((ok,no)=>{const im=new Image();im.onload=()=>ok(im);im.onerror=()=>no(new Error('图片解码失败'));im.src=src})}
const MAXP=1000;
async function decodeSteps(f){
  const steps=[];
  if(window.createImageBitmap){
    steps.push(()=>createImageBitmap(f,{resizeWidth:MAXP,resizeQuality:'high'}));
    steps.push(()=>createImageBitmap(f));
  }
  steps.push(async()=>{const u=URL.createObjectURL(f);try{const im=await loadImg(u);im._url=u;return im}catch(e){URL.revokeObjectURL(u);throw e}});
  steps.push(async()=>loadImg(await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(r.error);r.readAsDataURL(f)})));
  return steps;
}
function draw(img){
  const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
  if(!w||!h)throw new Error('读不到尺寸');
  const sc=Math.min(1,MAXP/Math.max(w,h)),c=document.createElement('canvas');
  c.width=Math.max(1,Math.round(w*sc));c.height=Math.max(1,Math.round(h*sc));
  const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);
  if(img.close)img.close();if(img._url)URL.revokeObjectURL(img._url);
  /* 抽样检查：整张都是底色说明没画上去 */
  const d=x.getImageData(0,0,c.width,c.height).data;let same=true;
  for(let k=0;k<64&&same;k++){const p=(Math.floor(Math.random()*c.width*c.height))*4;if(d[p]!==255||d[p+1]!==255||d[p+2]!==255)same=false}
  if(same)throw new Error('画出来是空白');
  return c.toDataURL('image/jpeg',.82);
}
async function placePhoto(pg,i,f){
  toast('正在放进来…');
  let meta={};try{meta=exifMeta(readExif(await readBuf(f.slice(0,262144))))}catch(e){}
  let src=null,why='';
  for(const step of await decodeSteps(f)){
    try{src=draw(await step());break}catch(e){why=e&&e.message||'未知原因'}
  }
  if(!src){
    const heic=/heic|heif/i.test((f.type||'')+(f.name||''));
    return toast(heic?'这张是 HEIC 格式，这个浏览器打不开；可以在相册里先存成 JPEG，或直接拍照':`这张没放进来（${why}），可以换一张或直接拍照`);
  }
  pg.photos[i]={src,meta};
  const ok=store.set(KEY,book);
  if(pg===P()){renderPhotos();renderTexts();bindTexts($('#photos'));renderHours();relayout()}
  if(!ok)return toast('照片放上了，但这台设备存不下了，刷新后会丢；可以先存成长图');
  toast(meta.time?`放好了 · 拍于${meta.time.split(' · ')[0]}`:'放好了 · 这张没读到拍摄时间');
}

/* 十二时辰：样张用整天的数，其余按放进来的照片算 */
function renderHours(){
  const pg=P();let cnt=pg.hours;
  if(!cnt){cnt=Array(12).fill(0);pg.photos.forEach(ph=>{if(ph.meta&&ph.meta.h!=null)cnt[ph.meta.h]++})}
  $('#hours').innerHTML=cnt.map((n,i)=>`<div class="hr" title="${HOURS[i]}时 · ${n} 张">${'<i></i>'.repeat(Math.min(n,14))}</div>`).join('');
  $('#hrLabels').innerHTML=HOURS.map((h,i)=>`<span class="${cnt[i]?'on':''}">${h}</span>`).join('');
  const tot=cnt.reduce((a,b)=>a+b,0),mx=cnt.indexOf(Math.max(...cnt));
  $('#hoursSum').textContent=tot?`共 ${tot} 张 · 拍得最多是${HOURS[mx]}时（${cnt[mx]} 张）· 一点一张`:'放进带拍摄时间的照片，就会按时辰点在这里';
}

/* 饮馔：可以加菜，菜名删空就撤掉 */
function renderFood(){
  const pg=P();
  $('#foodList').innerHTML=pg.food.map((f,i)=>`<li><span class="fname" contenteditable data-i="${i}" data-ph="菜名"></span><button class="grade" data-i="${i}" data-g="${f.g}">${GRADE[f.g]}</button></li>`).join('');
  $$('#foodList .fname').forEach(el=>{const i=+el.dataset.i;el.textContent=pg.food[i].n;
    el.addEventListener('input',()=>{if(!el.innerText.trim())el.innerHTML='';pg.food[i].n=el.innerText.trim();save()});
    el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();el.blur()}});
    el.addEventListener('blur',()=>{if(pg.food[i]&&!pg.food[i].n){pg.food.splice(i,1);save();if(pg===P()){renderFood();relayout()}}});
  });
  $$('#foodList .grade').forEach(b=>b.addEventListener('click',()=>{const f=pg.food[+b.dataset.i];f.g=(f.g+1)%3;b.dataset.g=f.g;b.textContent=GRADE[f.g];save()}));
}
$('#foodAdd').addEventListener('click',()=>{P().food.push({n:'',g:0});renderFood();relayout();const l=$$('#foodList .fname');l[l.length-1].focus()});

/* 印章：署名按字数排成一方 */
function sealChars(name){
  name=(name||'').trim()||'无名';
  if(/^[\x00-\x7F]+$/.test(name))return {long:name.toUpperCase()};
  const c=[...name];
  if(c.length===1)return {cols:[[c[0]],['印']]};
  if(c.length===2)return {cols:[[c[0],c[1]],['之','印']]};
  if(c.length===3)return {cols:[[c[0],c[1]],[c[2],'印']]};
  return {cols:[[c[0],c[1]],[c[2],c[3]]]};
}
function sealSVG(text,mode,size){
  const s=sealChars(text), fz=mode==='zhu'?24:26;
  const red='var(--zhu)', pap='var(--paper)';
  if(s.long){const w=Math.max(90,s.long.length*15+24);
    return `<svg width="${w*size/76}" height="${size*.5}" viewBox="0 0 ${w} 38"><rect x="2" y="2" width="${w-4}" height="34" rx="3" style="fill:${red}"/><text x="${w/2}" y="25" text-anchor="middle" font-size="18" letter-spacing="2" style="fill:${pap};font-family:var(--lat)">${esc(s.long)}</text></svg>`;}
  let t='';
  s.cols.forEach((col,ci)=>{const x=ci===0?54:22;
    col.forEach((ch,ri)=>{const y=col.length===1?52:(ri===0?35:65);
      t+=`<text x="${x}" y="${y}" text-anchor="middle" font-size="${col.length===1?fz*1.5:fz}" style="fill:${mode==='zhu'?red:pap};font-family:var(--cn)">${esc(ch)}</text>`})});
  const box=mode==='zhu'
    ?`<rect x="4" y="4" width="68" height="68" rx="8" style="fill:none;stroke:${red}" stroke-width="3.5"/>`
    :`<rect x="3" y="3" width="70" height="70" rx="3" style="fill:${red}"/>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 76 76" style="transform:rotate(${mode==='zhu'?-3:2}deg);opacity:.92">${box}${t}</svg>`;
}
function renderSeal(){
  $('#sealName').innerHTML=sealSVG(book.name,'bai',70);
  $('#sealMotto').innerHTML=sealSVG(book.motto,'zhu',58);
  const place=(P().texts.place||'').trim();
  $('#sealSign').textContent=place?`${book.name} 记于${place}`:`${book.name} 记`;
}

/* ───────── 贴纸：挂在零件上，换版式时跟着零件走 ───────── */
let selId=null;
function anchorEl(st){const el=st.a&&document.querySelector(`.part[data-part="${st.a}"]`);return el&&!el.classList.contains('hidden')?el:null}
function pos(st){const R=page.getBoundingClientRect(),el=anchorEl(st);
  if(el){const r=el.getBoundingClientRect();return {l:r.left-R.left+st.x/100*r.width,t:r.top-R.top+st.y/100*r.height}}
  return {l:st.x/100*R.width,t:st.y/100*R.height}}
function reanchor(st,l,t){const R=page.getBoundingClientRect(),cx=R.left+l,cy=R.top+t;let best=null,area=1e12;
  $$('.part').forEach(el=>{if(el.classList.contains('hidden'))return;const r=el.getBoundingClientRect();
    if(cx>=r.left&&cx<=r.right&&cy>=r.top&&cy<=r.bottom&&r.width*r.height<area){best=el;area=r.width*r.height}});
  if(best){const r=best.getBoundingClientRect();st.a=best.dataset.part;st.x=(cx-r.left)/r.width*100;st.y=(cy-r.top)/r.height*100}
  else{st.a=null;st.x=l/R.width*100;st.y=t/R.height*100}}
function place(d,st){const p=pos(st);d.style.left=p.l+'px';d.style.top=p.t+'px';d.style.transform=`translate(-50%,-50%) rotate(${st.r}deg) scale(${st.s})`}
function relayout(){$$('.sticker').forEach(d=>{const st=P().stickers.find(s=>s.id===d.dataset.id);if(st)place(d,st)});placeTools()}
function renderStickers(){
  const L=$('#stkLayer');L.innerHTML='';
  P().stickers.forEach(st=>{
    if(!STICKERS[st.t])return;
    const d=document.createElement('div');d.className='sticker'+(st.id===selId?' sel':'');d.dataset.id=st.id;
    d.innerHTML=STICKERS[st.t].svg;L.appendChild(d);place(d,st);drag(d,st);
  });
  placeTools();
}
function drag(d,st){
  let sx,sy,ol,ot,moved=false;
  d.addEventListener('pointerdown',e=>{
    e.preventDefault();d.setPointerCapture(e.pointerId);moved=false;
    const R=page.getBoundingClientRect();sx=e.clientX;sy=e.clientY;ol=parseFloat(d.style.left);ot=parseFloat(d.style.top);d.classList.add('dragging');
    const mv=ev=>{const dx=ev.clientX-sx,dy=ev.clientY-sy;if(Math.abs(dx)+Math.abs(dy)>3)moved=true;
      d.style.left=Math.max(0,Math.min(R.width,ol+dx))+'px';d.style.top=Math.max(0,Math.min(R.height,ot+dy))+'px';placeTools()};
    const up=()=>{d.classList.remove('dragging');d.removeEventListener('pointermove',mv);d.removeEventListener('pointerup',up);d.removeEventListener('pointercancel',up);
      if(moved){reanchor(st,parseFloat(d.style.left),parseFloat(d.style.top));save()}select(st.id)};
    d.addEventListener('pointermove',mv);d.addEventListener('pointerup',up);d.addEventListener('pointercancel',up);
  });
}
function select(id){selId=id;$$('.sticker').forEach(el=>el.classList.toggle('sel',el.dataset.id===id));placeTools()}
function placeTools(){
  const T=$('#stkTools'),st=P().stickers.find(s=>s.id===selId),el=st&&document.querySelector(`.sticker[data-id="${selId}"]`);
  if(!st||!el){T.classList.remove('on');return}
  const R=page.getBoundingClientRect(),E=el.getBoundingClientRect();
  T.style.left=Math.max(110,Math.min(R.width-110,E.left-R.left+E.width/2))+'px';
  T.style.top=(E.bottom-R.top+10)+'px';T.classList.add('on');
}
$('#stkTools').addEventListener('pointerdown',e=>e.stopPropagation());
$('#stkTools').addEventListener('click',e=>{
  const a=e.target.dataset.act,pg=P(),st=pg.stickers.find(s=>s.id===selId);if(!a||!st)return;
  const el=document.querySelector(`.sticker[data-id="${selId}"]`);
  if(a==='rot')st.r=(st.r+15)%360;
  if(a==='big')st.s=Math.min(2.4,+(st.s+.15).toFixed(2));
  if(a==='small')st.s=Math.max(.4,+(st.s-.15).toFixed(2));
  if(a==='up'){pg.stickers=pg.stickers.filter(s=>s!==st).concat(st);save();renderStickers();return}
  if(a==='tear'){el.classList.add('torn');$('#stkTools').classList.remove('on');
    setTimeout(()=>{pg.stickers=pg.stickers.filter(s=>s!==st);selId=null;save();renderStickers()},520);return}
  place(el,st);placeTools();save();
});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.sticker')&&!e.target.closest('#stkTools')&&selId!=null)select(null)});
window.addEventListener('resize',relayout);
function addSticker(t){
  const R=page.getBoundingClientRect(),cx=R.left+R.width*(.3+Math.random()*.4),cy=Math.max(R.top+40,Math.min(R.bottom-40,innerHeight/2));
  const st={id:uid(),t,x:0,y:0,r:Math.round(Math.random()*24-12),s:1};reanchor(st,cx-R.left,cy-R.top);
  P().stickers.push(st);save();selId=st.id;renderStickers();closeSheet();toast(`贴上了「${STICKERS[t].name}」，按住可以拖`);
}

/* ───────── 风格 / 版式 / 零件 ───────── */
function applyLook(){
  const pg=P();
  document.documentElement.dataset.style=pg.style;
  page.classList.remove('lay-single','lay-album','lay-scroll');page.classList.add('lay-'+pg.layout);
  $$('.part').forEach(p=>p.classList.toggle('hidden',pg.hidden.includes(p.dataset.part)));
  relayout();setTimeout(relayout,450);
}
$('#dice').addEventListener('click',()=>{
  const pg=P(),pick=(arr,cur)=>{const o=arr.filter(a=>a.id!==cur);return o[Math.floor(Math.random()*o.length)]};
  const s=pick(STYLES,pg.style),l=pick(LAYOUTS,pg.layout);
  pg.style=s.id;pg.layout=l.id;
  pg.stickers.forEach(st=>{st.x=Math.max(2,Math.min(98,st.x+Math.random()*10-5));st.r=Math.round(Math.random()*30-15)});
  save();applyLook();renderStickers();renderSeal();toast(`骰出：${s.name} · ${l.name}`);
});

/* ───────── 翻页、新增空白页、删页 ───────── */
function renderPager(){
  const n=book.pages.length,i=book.cur;
  $('#pgNo').textContent=`第${cnNum(i+1)}叶 / 共${cnNum(n)}叶`;
  $('#pgPrev').disabled=i===0;$('#pgNext').disabled=i===n-1;
  $('#yeshu').textContent=`第 ${[...cnNum(i+1)].join(' ')} 叶`;
}
function renderPage(){
  applyLook();renderPhotos();renderTexts();bindTexts();renderHours();renderFood();renderSeal();renderStickers();renderPager();
}
function go(i,dir){
  if(i<0||i>=book.pages.length)return;
  book.cur=i;selId=null;save();closeSheet();renderPage();
  page.classList.remove('turn-next','turn-prev');void page.offsetWidth;page.classList.add(dir<0?'turn-prev':'turn-next');
  window.scrollTo({top:0,behavior:'smooth'});
}
function newPage(){
  book.pages.splice(book.cur+1,0,blankPage(P()));
  go(book.cur+1,1);toast('新开了一叶空白页，日期按今天填好了');
}
function delPage(){
  if(book.pages.length<2)return toast('只剩这一叶了，留着吧');
  if(!confirm(`删掉第${cnNum(book.cur+1)}叶？这一叶写的字、照片和贴纸会一起删掉，删了找不回来。`))return;
  book.pages.splice(book.cur,1);go(Math.min(book.cur,book.pages.length-1),-1);toast('删掉了');
}
$('#pgPrev').addEventListener('click',()=>go(book.cur-1,-1));
$('#pgNext').addEventListener('click',()=>go(book.cur+1,1));
$('#pgNew').addEventListener('click',newPage);
page.addEventListener('animationend',()=>{page.classList.remove('turn-next','turn-prev');relayout()});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeShot();return closeSheet()}
  if(shot.classList.contains('on'))return;
  if(e.target.closest('[contenteditable],input,textarea'))return;
  if(e.key==='ArrowLeft')go(book.cur-1,-1);
  if(e.key==='ArrowRight')go(book.cur+1,1);
});

/* ───────── 抽屉面板 ───────── */
const sheet=$('#sheet'),scrim=$('#scrim');
function openSheet(kind){
  const pg=P(),H=(t,sub)=>`<h3>${t}<button data-close aria-label="关">×</button></h3>${sub?`<p class="sub">${sub}</p>`:''}`;
  let h='';
  if(kind==='pages'){
    h=H('叶目','一叶记一天，或者一程。点一叶就翻过去。')+`<button class="big" id="sheetNew">＋ 在这一叶后面新增空白页</button>`+
      book.pages.map((p,i)=>{const t=p.texts||{},title=(t.title||'').trim(),sub=[t.place,t.date].filter(Boolean).join(' · ');
        return `<button class="leaf${i===book.cur?' cur':''}" data-go="${i}"><b>第${cnNum(i+1)}叶</b><span>${title?esc(title):'<span class="blank">（还没起名）</span>'}<small>${esc(sub)||'&nbsp;'}</small></span></button>`}).join('')+
      (book.pages.length>1?`<button class="big ghost" id="delPage" style="margin-top:14px">删掉当前这一叶</button>`:'');
  }
  if(kind==='style')h=H('风格','换的是这一叶的纸和墨，写下的字不动。')+STYLES.map(s=>`<button class="opt${s.id===pg.style?' cur':''}" data-style="${s.id}"><span class="sw" style="background:${s.c[0]}"><i style="position:absolute;right:4px;bottom:4px;width:9px;height:9px;background:${s.c[1]}"></i></span><span>${s.name}<small>${s.desc}</small></span></button>`).join('');
  if(kind==='layout')h=H('版式','换的是这一叶的排法。手机上三种都会收成一栏。')+LAYOUTS.map(l=>`<button class="opt${l.id===pg.layout?' cur':''}" data-layout="${l.id}"><span>${l.name}<small>${l.desc}</small></span></button>`).join('');
  if(kind==='sticker')h=H('贴纸','点一下贴到纸上；按住拖动；点中后可以转、放大、撕掉。')+`<div class="stk-grid">${Object.entries(STICKERS).map(([k,v])=>`<button data-stk="${k}" title="${v.name}">${v.svg}</button>`).join('')}</div>`;
  if(kind==='parts')h=H('零件','这一叶由下面这些零件拼成。用不上的先「藏」起来。点一行，页上那个零件会闪一下。')+PARTS.map(p=>{const off=pg.hidden.includes(p.id);return `<div class="prow" data-flash="${p.id}"><span>${p.name}<small>吃：${p.eat}</small></span><button class="tg${off?' off':''}" data-hide="${p.id}">${off?'已藏':'在页上'}</button></div>`}).join('');
  if(kind==='save'){const gens=store.get(GKEY,[]);
    h=H('存','骰到喜欢的就先存一代，再接着骰。存下的是风格、版式、贴纸和藏起来的零件，写的字不受影响；换回时用在当前这一叶。')+
    `<button class="big" id="saveGen">存成新一代</button><button class="big ghost" id="saveImg">存成长图</button>`+
    (gens.length?gens.map((g,i)=>`<div class="gen"><span>第 ${gens.length-i} 代<small>${new Date(g.t).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} · ${(STYLES.find(s=>s.id===g.style)||{}).name} · ${(LAYOUTS.find(l=>l.id===g.layout)||{}).name}</small></span><button data-restore="${i}">换回</button><button data-delgen="${i}">撕</button></div>`).join(''):'<p class="sub" style="margin-top:12px">还没存过。</p>');}
  if(kind==='settings')h=H('设置','都只存在这台设备上。')+
    `<label class="field">署名<input id="setName" value="${esc(book.name)}" maxlength="12"></label>
     <p class="sub">名章按字数排成一方：一个字配「印」，两个字配「之印」，三个字补一个「印」，四个字刚好一方；英文盖成长条。</p>
     <label class="field">闲章<input id="setMotto" value="${esc(book.motto)}" maxlength="4"></label>
     <div style="display:flex;gap:14px;align-items:center;margin:4px 0 18px">${sealSVG(book.name,'bai',64)}${sealSVG(book.motto,'zhu',54)}</div>
     <button class="big ghost" id="resetAll">整本恢复成样张</button>`;
  sheet.innerHTML=h;sheet.classList.add('on');scrim.classList.add('on');
}
function closeSheet(){sheet.classList.remove('on');scrim.classList.remove('on')}
$$('[data-open]').forEach(b=>b.addEventListener('click',()=>openSheet(b.dataset.open)));
scrim.addEventListener('click',closeSheet);
sheet.addEventListener('click',e=>{
  const t=e.target.closest('button,[data-flash]');if(!t)return;const pg=P();
  if(t.hasAttribute('data-close'))return closeSheet();
  if(t.id==='sheetNew')return newPage();
  if(t.id==='delPage')return delPage();
  if(t.dataset.go!=null){const i=+t.dataset.go;return i===book.cur?closeSheet():go(i,i>book.cur?1:-1)}
  if(t.dataset.style){pg.style=t.dataset.style;save();applyLook();renderSeal();openSheet('style')}
  if(t.dataset.layout){pg.layout=t.dataset.layout;save();applyLook();openSheet('layout')}
  if(t.dataset.stk)addSticker(t.dataset.stk);
  if(t.dataset.hide){e.stopPropagation();const id=t.dataset.hide;pg.hidden=pg.hidden.includes(id)?pg.hidden.filter(x=>x!==id):pg.hidden.concat(id);save();applyLook();openSheet('parts');return}
  if(t.dataset.flash){const p=document.querySelector(`.part[data-part="${t.dataset.flash}"]`);if(p&&!p.classList.contains('hidden')){p.scrollIntoView({behavior:'smooth',block:'center'});p.classList.remove('flash');void p.offsetWidth;p.classList.add('flash')}else toast('这个零件藏着呢')}
  if(t.id==='saveGen'){const g=store.get(GKEY,[]);g.unshift({t:Date.now(),style:pg.style,layout:pg.layout,hidden:[...pg.hidden],stickers:JSON.parse(JSON.stringify(pg.stickers))});
    if(store.set(GKEY,g.slice(0,20))){toast('存下了一代');openSheet('save')}else toast('这台设备存不下了')}
  if(t.dataset.restore!=null){const g=store.get(GKEY,[])[+t.dataset.restore];if(g){Object.assign(pg,{style:g.style,layout:g.layout,hidden:[...g.hidden],stickers:g.stickers.map(s=>Object.assign({},s,{id:uid()}))});save();applyLook();renderStickers();renderSeal();toast('换回来了');closeSheet()}}
  if(t.dataset.delgen!=null){const g=store.get(GKEY,[]);g.splice(+t.dataset.delgen,1);store.set(GKEY,g);openSheet('save')}
  if(t.id==='saveImg')openShot('leaf');
  if(t.id==='resetAll'){if(confirm('整本会恢复成只有一叶样张：写的字、放的照片、新增的页和贴纸都会清掉，确定吗？')){store.del(KEY);store.del(OLD);location.reload()}}
});
sheet.addEventListener('input',e=>{
  if(e.target.id==='setName'){book.name=e.target.value;save();renderSeal()}
  if(e.target.id==='setMotto'){book.motto=e.target.value;save();renderSeal()}
});

/* ───────── 存长图 ─────────
   按页面原样画成图（竖排、旋转、印章颜色都保留），用包内自带的 html-to-image，不联网、不嵌外部字体。
   存图走容器提供的 writeTempFile + saveImageToPhotosAlbum；没有这组接口的环境只给预览，提示用系统截图。 */
const blobToURL=b=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(r.error);r.readAsDataURL(b)});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const isSafari=/^((?!chrome|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
const miniTool=()=>window.xhs&&window.xhs.miniTool;
const canSaveAlbum=()=>{const m=miniTool();return !!(m&&typeof m.writeTempFile==='function'&&typeof m.saveImageToPhotosAlbum==='function')};
/* 检查画出来的是不是一片空白（或者被浏览器拦了读不出来） */
function looksBlank(c){
  try{const t=document.createElement('canvas');t.width=t.height=32;const x=t.getContext('2d');x.drawImage(c,0,0,32,32);
    const d=x.getImageData(0,0,32,32).data;let lo=255,hi=0;
    for(let i=0;i<d.length;i+=4){const v=(d[i]*3+d[i+1]*6+d[i+2])/10;lo=Math.min(lo,v);hi=Math.max(hi,v)}
    return hi-lo<10}catch(e){return true}
}
let lastWhy='';
async function capturePage(ratio){
  const bg=getComputedStyle(page).backgroundColor,lib=window.htmlToImage;
  if(!lib||typeof lib.toCanvas!=='function')throw new Error('长图工具没载入');
  const opt={pixelRatio:ratio,backgroundColor:bg,skipFonts:true,filter:n=>!(n.id==='stkTools')};
  let c=await lib.toCanvas(page,opt);
  if(isSafari){await wait(60);c=await lib.toCanvas(page,opt)}   /* Safari 第一遍常常漏画图片 */
  if(looksBlank(c)){lastWhy='画出来是空白';throw new Error(lastWhy)}
  return c;
}
function prepCapture(){
  select(null);if(document.activeElement)document.activeElement.blur();
  $$('.photo.flipped').forEach(p=>p.classList.remove('flipped'));
  page.classList.remove('turn-next','turn-prev');page.classList.add('exporting');
  window.scrollTo(0,0);
}
const MAX_AREA=16e6, MAX_SIDE=16000;   /* 手机浏览器画布的安全上限 */
async function renderLeaf(){
  prepCapture();relayout();await wait(80);
  const w=page.offsetWidth,h=page.offsetHeight;
  let r=Math.min(3,Math.max(2,1242/w));r=Math.min(r,Math.sqrt(MAX_AREA/(w*h)),MAX_SIDE/h);
  return capturePage(r);
}
async function renderBook(onStep){
  const keep=book.cur,sizes=[];
  try{
    prepCapture();
    for(let i=0;i<book.pages.length;i++){book.cur=i;renderPage();page.classList.add('exporting');relayout();await wait(60);sizes.push([page.offsetWidth,page.offsetHeight])}
    const GAP=36,W=Math.max(...sizes.map(s=>s[0])),H=sizes.reduce((a,s)=>a+s[1],0)+GAP*(sizes.length+1);
    let r=Math.min(2,Math.sqrt(MAX_AREA/(W*H)),MAX_SIDE/H);
    const out=document.createElement('canvas');out.width=Math.round(W*r);out.height=Math.round(H*r);
    const x=out.getContext('2d');x.fillStyle=getComputedStyle(document.body).backgroundColor||'#e6dcc8';x.fillRect(0,0,out.width,out.height);
    let y=GAP*r;
    for(let i=0;i<book.pages.length;i++){
      onStep&&onStep(i+1,book.pages.length);
      book.cur=i;renderPage();page.classList.add('exporting');relayout();await wait(80);
      const c=await capturePage(r);
      const dw=sizes[i][0]*r,dh=sizes[i][1]*r;
      x.drawImage(c,(out.width-dw)/2,y,dw,dh);y+=dh+GAP*r;
    }
    return out;
  }finally{book.cur=keep;renderPage();page.classList.remove('exporting')}
}

const shot=$('#shot'),shotView=$('#shotView'),shotTip=$('#shotTip'),shotSave=$('#shotSave');
let shotBlob=null,shotName='',shotURL='',shotScope='leaf',shotRun=0;
async function openShot(scope){
  closeSheet();shotScope=scope||shotScope;
  $$('.seg button').forEach(b=>b.classList.toggle('on',b.dataset.scope===shotScope));
  if(shotScope==='book'&&book.pages.length<2)$('.seg [data-scope="book"]').classList.add('on');
  shot.classList.add('on');document.body.style.overflow='hidden';
  const run=++shotRun;
  shotBlob=null;shotSave.disabled=true;shotTip.textContent='';
  if(shotURL){URL.revokeObjectURL(shotURL);shotURL=''}
  shotView.innerHTML='<div class="shot-wait" id="shotWait">正在裱长图…</div>';
  try{
    const c=shotScope==='book'
      ?await renderBook((i,n)=>{const w=$('#shotWait');if(w&&run===shotRun)w.textContent=`正在裱第${cnNum(i)}叶 / 共${cnNum(n)}叶…`})
      :await renderLeaf();
    if(run!==shotRun)return;
    const big=c.width*c.height>6e6,type=big?'image/jpeg':'image/png';
    const blob=await new Promise(ok=>c.toBlob(ok,type,.92));
    if(!blob)throw new Error('生成图片失败');
    if(run!==shotRun)return;
    const place=(P().texts.place||'').trim();
    shotName=(shotScope==='book'?`行旅録-整本-共${cnNum(book.pages.length)}叶`:`行旅録-第${cnNum(book.cur+1)}叶${place?'-'+place:''}`)+(big?'.jpg':'.png');
    shotBlob=blob;shotURL=URL.createObjectURL(blob);
    const img=new Image();img.alt=shotName;img.src=shotURL;
    shotView.innerHTML='';shotView.appendChild(img);shotView.scrollTop=0;
    shotSave.disabled=false;
    shotTip.textContent=(canSaveAlbum()?'点「存到相册」保存':'这里存不到相册，可以先用系统截图')+` · ${c.width}×${c.height}`;
  }catch(e){
    if(run!==shotRun)return;
    shotView.innerHTML=`<div class="shot-wait">没裱成：${esc(e&&e.message||lastWhy||'未知原因')}<br>可以先用系统截图代替</div>`;
  }finally{if(run===shotRun)page.classList.remove('exporting')}
}
function closeShot(){if(!shot.classList.contains('on'))return;shotRun++;shot.classList.remove('on');document.body.style.overflow='';page.classList.remove('exporting');relayout()}
shotSave.addEventListener('click',async()=>{
  if(!shotBlob)return;
  if(!canSaveAlbum())return toast('这里存不到相册，可以先用系统截图');
  shotSave.disabled=true;
  try{
    const m=miniTool(),res=await m.writeTempFile({data:await blobToURL(shotBlob)});
    await m.saveImageToPhotosAlbum({filePath:res.filePath});
    toast('已存到相册');
  }catch(e){toast('没存成：'+(e&&(e.errMsg||e.message)||'请稍后再试'))}
  finally{shotSave.disabled=false}
});
$('#shotX').addEventListener('click',closeShot);
$('#shotBtn').addEventListener('click',()=>openShot('leaf'));
$$('.seg button').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.scope!==shotScope||!shotBlob)openShot(b.dataset.scope)}));

/* ───────── 提示 ───────── */
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2400)}

/* ───────── 启动 ───────── */
renderPage();
document.fonts&&document.fonts.ready.then(()=>{renderSeal();relayout()});
window.addEventListener('load',relayout);
})();
