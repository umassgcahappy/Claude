/* flex gap：布局行为检测，Chrome 61 走 margin 基线 */
(function(){var f=document.createElement('div');f.style.position='absolute';f.style.visibility='hidden';f.style.display='flex';f.style.flexDirection='column';f.style.rowGap='1px';
f.appendChild(document.createElement('div'));f.appendChild(document.createElement('div'));document.body.appendChild(f);var ok=f.scrollHeight===1;f.parentNode.removeChild(f);
if(ok)document.documentElement.classList.add('fg')})();

(function(){
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const CN='〇一二三四五六七八九';
function cnNum(n){n=Math.floor(n);if(n<10)return CN[n];if(n<20)return '十'+(n%10?CN[n%10]:'');if(n<100)return CN[Math.floor(n/10)]+'十'+(n%10?CN[n%10]:'');return String(n)}
const liang=n=>n===2?'两':cnNum(n);
let tt;function toast(m,ms){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),ms||2400)}
let seq=Date.now();const uid=()=>(seq++).toString(36);

/* ───────── 存储：都在这台设备的浏览器里 ───────── */
const KEY='youchanglu-v1';
function load(){try{const v=localStorage.getItem(KEY);return v?JSON.parse(v):null}catch(e){return null}}
const S=Object.assign({chang:['','',''],changSince:'',changLog:[],pact:null,intro:false,theme:'auto',days:{},back:[],knots:[],declined:[],rest:Array(10).fill(null).map(()=>({t:'',s:false})),want:{eat:[],cook:[],with:[]},foods:[],yy:{out:[{t:'',d:false},{t:'',d:false},{t:'',d:false}],in:[{t:'',d:false},{t:'',d:false},{t:'',d:false}]},secrets:[],weekNotes:{},monthNotes:{},yearNotes:{},yearRate:{},seasonQ:{},seasonWk:{},chao:{},backDismiss:''},load()||{});
let saveT;function save(){clearTimeout(saveT);saveT=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast('这台设备存不下了，最近的改动没存上')}},120)}
function saveNow(){clearTimeout(saveT);try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
addEventListener('pagehide',saveNow);document.addEventListener('visibilitychange',()=>{if(document.hidden)saveNow()});

/* ───────── 日子 ───────── */
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse=k=>{const [y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d)};
const addD=(k,n)=>{const d=parse(k);d.setDate(d.getDate()+n);return ymd(d)};
const today=()=>ymd(new Date());
const WK='日一二三四五六';
const SC='子丑寅卯辰巳午未申酉戌亥';
const shichen=h=>SC[Math.floor(((h+1)%24)/2)];
const mondayOf=k=>{const d=parse(k),w=(d.getDay()+6)%7;d.setDate(d.getDate()-w);return ymd(d)};
const LM=['正','二','三','四','五','六','七','八','九','十','冬','腊'];
function lunarDay(n){return n===10?'初十':n===20?'二十':n===30?'三十':n<10?'初'+CN[n]:n<20?'十'+CN[n-10]:n<30?'廿'+CN[n-20]:''}
function lunar(d){try{const p=new Intl.DateTimeFormat('en-u-ca-chinese',{month:'numeric',day:'numeric'}).formatToParts(d);
  const mv=(p.find(x=>x.type==='month')||{}).value||'',dv=+((p.find(x=>x.type==='day')||{}).value||0),mn=parseInt(mv,10);
  if(!mn||!dv)return '';return (/bis|leap/i.test(mv)?'闰':'')+LM[mn-1]+'月'+lunarDay(dv)}catch(e){return ''}}
const JQ=[[1,5,'小寒'],[1,20,'大寒'],[2,4,'立春'],[2,19,'雨水'],[3,5,'惊蛰'],[3,20,'春分'],[4,4,'清明'],[4,20,'谷雨'],[5,5,'立夏'],[5,21,'小满'],[6,5,'芒种'],[6,21,'夏至'],[7,7,'小暑'],[7,22,'大暑'],[8,7,'立秋'],[8,23,'处暑'],[9,7,'白露'],[9,23,'秋分'],[10,8,'寒露'],[10,23,'霜降'],[11,7,'立冬'],[11,22,'小雪'],[12,7,'大雪'],[12,21,'冬至']];
function jieqi(d){const y=d.getFullYear(),day=new Date(y,d.getMonth(),d.getDate()),all=[];[y-1,y,y+1].forEach(yy=>JQ.forEach(([m,dd,n])=>all.push({t:new Date(yy,m-1,dd),n})));
  let last=null;all.forEach(j=>{if(j.t<=day)last=j});const a=Math.round((day-last.t)/864e5);return a===0?'今日'+last.n:last.n+(a<=2?'':'')}
/* 一日四段，与册子一致：平旦起（寅卯辰巳）· 日中动（午未申）· 日西收（酉戌亥）· 夜半卧（子丑） */
const SEG=[{k:'qi',n:'平旦',v:'起',line:'平旦人气生'},{k:'dong',n:'日中',v:'动',line:'日中而阳气隆'},{k:'shou',n:'日西',v:'收',line:'日西而阳气已虚'},{k:'wo',n:'夜半',v:'卧',line:'万民皆卧'}];
const segOf=h=>h>=3&&h<11?0:h>=11&&h<17?1:h>=17&&h<23?2:3;
const mins=t=>{if(!t)return null;const m=/^(\d\d?):(\d\d)/.exec(t);return m?(+m[1])*60+(+m[2]):null};
const hm=m=>{m=((m%1440)+1440)%1440;return `${pad(Math.floor(m/60))}:${pad(m%60)}`};
const nowHM=()=>{const d=new Date();return `${pad(d.getHours())}:${pad(d.getMinutes())}`};

/* 夜里自动换深色 */
function applyTheme(){const h=new Date().getHours(),night=S.theme==='night'||(S.theme==='auto'&&(h>=21||h<5));
  document.documentElement.toggleAttribute('data-night',night);const m=document.querySelector('meta[name=theme-color]');if(m)m.content=night?'#14161d':'#f3f0ea'}

const D=k=>S.days[k]||{};
function setD(k,fn){const o=S.days[k]||(S.days[k]={});fn(o);Object.keys(o).forEach(x=>{const v=o[x];if(v===''||v==null||(Array.isArray(v)&&!v.length)||(typeof v==='object'&&!Array.isArray(v)&&v&&!Object.keys(v).length))delete o[x]});if(!Object.keys(o).length)delete S.days[k];save()}
const has=k=>!!S.days[k]&&Object.keys(S.days[k]).length>0;

/* ───────── 气的符号：心情不写字，画气的方向 ───────── */
const QI={
  nu:{n:'怒',d:'气往上冲',y:'怒则气上',s:'<path d="M16 27V6M9 13l7-7 7 7"/>'},
  xi:{n:'喜',d:'气松缓下来',y:'喜则气缓',s:'<path d="M3 17c3.5-6 6.5-6 10 0s6.5 6 10 0 3.5-3 6-3"/>'},
  bei:{n:'悲',d:'气慢慢散了',y:'悲则气消',s:'<path d="M3 16h6" opacity="1"/><path d="M12 16h5" opacity=".6"/><path d="M20 16h4" opacity=".35"/><path d="M27 16h2" opacity=".18"/>'},
  kong:{n:'恐',d:'气往下沉',y:'恐则气下',s:'<path d="M16 5v21M9 19l7 7 7-7"/>'},
  jing:{n:'惊',d:'气乱了',y:'惊则气乱',s:'<circle cx="8" cy="10" r="1.6" fill="currentColor"/><circle cx="20" cy="7" r="1.6" fill="currentColor"/><circle cx="14" cy="16" r="1.6" fill="currentColor"/><circle cx="24" cy="18" r="1.6" fill="currentColor"/><circle cx="7" cy="22" r="1.6" fill="currentColor"/><circle cx="17" cy="25" r="1.6" fill="currentColor"/>'},
  si:{n:'思',d:'气打了结',y:'思则气结',s:'<path d="M3 20c5 0 7-1 9-5 2-5 9-5 9 0s-7 6-9 1c-1-3 1-6 5-6 3 0 5 3 10 3"/>'},
  zai:{n:'在',d:'说不清，还在',y:'画一个圈',s:'<circle cx="16" cy="16" r="9"/>'}
};
const qiSvg=k=>`<svg class="qsym" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${QI[k].s}</svg>`;
const CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const YANG=[['gu','谷','养'],['guo','果','助'],['rou','肉','益'],['cai','菜','充']];
const WEI=['酸','苦','甘','辛','咸'];
const MEAL=[['zao','早'],['wu','午'],['wan','晚'],['jia','加餐']];
const MS={ok:['○','按时'],late:['△','晚了'],no:['×','没吃']};
const JIU=[['shi','久视','刷手机','伤血'],['wo','久卧','瘫着','伤气'],['zuo','久坐','上班','伤肉'],['li','久立','站着','伤骨'],['xing','久行','逛一天','伤筋']];

/* ───────── 视图 ───────── */
let tab='today',cur=today(),lookMode='week',lookWeek=mondayOf(today()),lookMonth=today().slice(0,7),lookYear=new Date().getFullYear(),seasonPick=null;
const app=$('#app');
function render(){applyTheme();$$('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
  ({today:rToday,look:rLook,season:rSeason,shelf:rShelf})[tab]();}
function go(t){tab=t;render();scrollTo(0,0)}

/* —— 今日 —— */
function rToday(){
  const now=new Date(),isT=cur===today(),d=parse(cur),o=D(cur),sg=segOf(now.getHours());
  const mpos=((now.getHours()*60+now.getMinutes())-180+1440)%1440/1440*100;
  let h=`<div class="hdr"><div class="logo"><i>有常</i>有常録</div><span class="sp"></span><button class="ib" data-act="settings" aria-label="设置"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/></svg></button></div>`;
  h+=`<section class="sky ${isT?'s'+sg:'past'}">
    <div class="dt">${cnNum(d.getMonth()+1)}月${cnNum(d.getDate())}日<small>周${WK[d.getDay()]}</small></div>
    <div class="lu">农历${lunar(d)} · ${jieqi(d)}</div>
    ${isT?`<div class="vline">${SEG[sg].line}</div><div class="now">此刻 <b>${shichen(now.getHours())}时</b> · ${SEG[sg].n}，该「${SEG[sg].v}」了</div>
    <div class="band">${SEG.map((s,i)=>`<span class="${i===sg?'on':''}">${s.n}</span>`).join('')}<i style="left:${mpos.toFixed(1)}%"></i></div>`:''}
    <div class="dnav"><button data-act="day" data-n="-1">‹ 前一天</button>${isT?'':`<button data-act="day" data-n="0">回到今天</button><button data-act="day" data-n="1">后一天 ›</button>`}</div>
  </section>`;
  if(!isT&&!has(cur))h+=`<div class="card"><p class="muted" style="margin:0">这一天空着。<br>断了不用补，想补也行。</p></div>`;
  /* 回来 */
  if(isT&&S.backDismiss!==cur&&!has(cur)){const last=Object.keys(S.days).filter(k=>k<cur&&has(k)).sort().pop();
    if(last){const gap=Math.round((parse(cur)-parse(last))/864e5)-1;if(gap>=2)h+=`<section class="card back"><p>隔了${liang(gap)}天。<br>断了不用补，从今天接着写就行。</p><div class="acts"><button class="btn" data-act="backnote" data-gap="${gap}">写一句怎么回来的</button><button class="btn plain" data-act="backok">知道了</button></div></section>`}}
  /* 我的常 */
  const ch=S.chang.filter(Boolean);
  h+=`<section class="card"><h3 class="ct">我的常<small>只写三条</small><span class="r"><button data-act="chang">改</button></span></h3>`;
  if(!ch.length)h+=`<p class="muted" style="margin:0 0 12px">先写下三条自己的作息底线。写多了，反而守不住。</p><button class="btn" data-act="chang">写下我的常</button>`;
  else h+=`<div class="chang">${S.chang.map((t,i)=>t?`<button class="crow${(o.keep||[])[i]?' on':''}" data-act="keep" data-i="${i}"><span class="n">${CN[i+1]}</span><span class="x">${esc(t)}</span><span class="ck">${CHECK}</span></button>`:'').join('')}</div>`;
  h+=`</section>`;
  /* 起动收卧 */
  const ptv=k=>{
    if(k==='qi')return o.qi?[o.qi,o.qiDo||'']:null;
    if(k==='dong')return o.dongWhat||o.dongLen||o.light?[o.dongWhat?o.dongWhat.join('、'):'动了',[o.dongLen,o.light==='y'?'见了天光':o.light==='n'?'没见天光':''].filter(Boolean).join(' · ')]:null;
    if(k==='shou')return o.shou?[o.shou,o.shouHow||'']:null;
    if(k==='wo')return o.wo||o.phone?[o.wo||'—',o.phone?'手机放下 '+o.phone:'']:null;
  };
  h+=`<section class="card"><h3 class="ct">一日四点<small>起 · 动 · 收 · 卧</small></h3><div class="four">${SEG.map((s,i)=>{const v=ptv(s.k);
    return `<button class="pt${isT&&i===sg?' cur':''}" data-act="pt" data-k="${s.k}"><span class="k"><b>${s.v}</b><small>${s.n}</small></span>${v?`<span class="v${s.k==='dong'?' e" style="color:var(--ink);font-size:16px':''}">${esc(v[0])}</span><span class="s">${esc(v[1])||'&nbsp;'}</span>`:`<span class="v e">＋ 记一下</span><span class="s">&nbsp;</span>`}</button>`}).join('')}</div></section>`;
  /* 气 */
  const q=o.qi4||{};
  h+=`<section class="card"><h3 class="ct">今天的气<small>不写字，画方向</small><span class="r"><button data-act="qihelp">怎么画</button></span></h3><div class="qi4">${SEG.map((s,i)=>{const a=q[s.k]||[];
    return `<button class="qc" data-act="qi" data-k="${s.k}"><small>${s.n}</small><span class="sy${a.length?'':' e'}">${a.length?a.map(qiSvg).join(''):'＋'}</span></button>`}).join('')}</div>
    ${o.qiWhy||o.qiEase?`<div class="note">${o.qiWhy?`最重的一口气：${esc(o.qiWhy)}<br>`:''}${o.qiEase?`让气顺下来的：<b>${esc(o.qiEase)}</b>`:''}</div>`:''}</section>`;
  /* 吃 */
  const y=o.yang||[],w=o.wei||[],ml=o.meals||{};const qi=YANG.every(a=>y.includes(a[0]));
  h+=`<section class="card"><h3 class="ct">吃<small>只看齐不齐、准不准时</small></h3>${qi?'<span class="qiseal">齐了</span>':''}
    <div class="chips">${YANG.map(([k,n,v])=>`<button class="chip z${y.includes(k)?' on':''}" data-act="yang" data-k="${k}">${n}<small>${k==='rou'?'豆蛋奶也算':v}</small></button>`).join('')}</div>
    <div class="row" style="margin-top:14px"><div class="meals" style="flex:1">${MEAL.map(([k,n])=>{const s=ml[k];return `<button class="meal ${s||''}" data-act="meal" data-k="${k}"><small>${n}</small><b>${s?MS[s][0]:'·'}</b><small>${s?MS[s][1]:'点一下'}</small></button>`}).join('')}</div></div>
    <div class="row"><span class="l">五味</span><div class="chips">${WEI.map(x=>`<button class="chip${w.includes(x)?' on':''}" data-act="wei" data-k="${x}">${x}</button>`).join('')}</div></div></section>`;
  /* 劳逸 */
  const j=o.jiu||[];
  h+=`<section class="card"><h3 class="ct">劳逸<small>哪一样过了头，点哪一样</small></h3>
    <div class="chips">${JIU.map(([k,n,s])=>`<button class="chip z${j.includes(k)?' on':''}" data-act="jiu" data-k="${k}">${n}<small>${s}</small></button>`).join('')}</div>
    <div class="row"><span style="font-size:14px;color:var(--ink2)">今天站起来走动了</span><div class="qi-s"><button class="step" data-act="qs" data-n="-1">−</button><b>${o.qishen||0}</b><button class="step" data-act="qs" data-n="1">＋</button><span style="font-size:13px;color:var(--ink3)">次</span></div></div></section>`;
  /* 恬惔一刻 & 一句话 */
  h+=`<section class="card"><button class="tog${o.tian?' on':''}" data-act="tian"><span class="ck">${CHECK}</span><span style="font-size:15px">今天有一刻，什么都没想<br><small class="yuan">恬惔虚无，真气从之</small></span></button>
    ${o.tian?`<input class="line1" data-f="tianWhere" placeholder="那一刻在哪儿？" value="${esc(o.tianWhere||'')}" style="margin-top:6px">`:''}
    <input class="line1" data-f="line" placeholder="一句话，写几个字也算" value="${esc(o.line||'')}" style="margin-top:10px"></section>`;
  /* 盖印 */
  const sl=o.seal;
  h+=`<section class="card"><div class="sealbox"><button class="bigseal ${sl||''}" data-act="seal">${sl==='you'?'有常':sl==='hui'?'回来':'给今天<br>盖个印'}</button>
    <div class="tx">${sl==='you'?'<b>今日有常</b>盖了朱印。':sl==='hui'?'<b>回来了</b>盖了淡印。乱过，又回来了。':sl==='skip'?'<b>明天再说</b>这一格空着，不欠谁。':(isT&&sg>=2?'<b>睡前，给今天盖一个印</b>有常、回来了，或者明天再说。':'<b>每晚睡前盖一个</b>有常盖朱印，回来了盖淡印，明天再说就空着。')}</div></div></section>`;
  /* 心乱时 */
  h+=`<section class="card"><h3 class="ct">心乱的时候</h3><div class="calm">
    <button data-act="open" data-k="chao"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4l6 6-9 9H5v-6z"/><path d="M12 6l6 6"/></svg>抄一段</button>
    <button data-act="open" data-k="rest"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 16c2-6 6-9 16-10-1 9-5 13-11 13"/><path d="M4 20c2-3 4-5 8-7"/></svg>歇一歇</button>
    <button data-act="open" data-k="knots"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 15c4 0 5-1 7-4 2-4 8-4 8 0s-6 5-8 1c-1-2 1-5 4-5 3 0 5 3 9 3"/></svg>解个结</button>
    <button data-act="open" data-k="secrets"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 7l9 6 9-6"/></svg>存心事</button></div></section>`;
  app.innerHTML=h;
}

/* —— 回看 —— */
function weekDays(m){return Array.from({length:7},(_,i)=>addD(m,i))}
function rLook(){
  let h=`<h2 class="t">回看</h2><div class="seg">${[['week','这一周'],['month','这个月'],['year','这一年']].map(([k,n])=>`<button class="${lookMode===k?'on':''}" data-act="lm" data-k="${k}">${n}</button>`).join('')}</div>`;
  if(lookMode==='week')h+=rWeek();else if(lookMode==='month')h+=rMonth();else h+=rYear();
  app.innerHTML=h;
}
function rWeek(){
  const ds=weekDays(lookWeek),a=parse(ds[0]),b=parse(ds[6]),T=today();
  let h=`<div class="pnav"><button data-act="pw" data-n="-7">‹</button><b>${cnNum(a.getMonth()+1)}月${cnNum(a.getDate())}日 — ${a.getMonth()!==b.getMonth()?cnNum(b.getMonth()+1)+'月':''}${cnNum(b.getDate())}日</b><button data-act="pw" data-n="7" ${ds[6]>=T?'disabled':''}>›</button></div>`;
  /* 七日起卧图：一夜连在同一行，从傍晚酉时排到次日申时 */
  const rows=ds.map((k,i)=>{const o=D(k),nx=D(addD(k,1));let s=mins(o.wo),e=mins(nx.qi);let bar='';
    if(s!=null){if(s<12*60)s+=1440;s-=1020;if(e!=null){e=e+1440-1020;if(e>s)bar=`<span class="bar" style="left:${(s/14.4).toFixed(2)}%;width:${((e-s)/14.4).toFixed(2)}%"></span>`;else bar=`<span class="dot" style="left:${(s/14.4).toFixed(2)}%"></span>`}else bar=`<span class="dot" style="left:${(s/14.4).toFixed(2)}%"></span>`}
    return `<span class="d">${WK[(i+1)%7]}</span><div class="track"><span class="zi"></span>${Array.from({length:11},(_,g)=>`<span class="gl" style="left:${((g+1)*8.333).toFixed(2)}%"></span>`).join('')}${bar}</div>`}).join('');
  const wos=ds.map(k=>{let s=mins(D(k).wo);if(s==null)return null;if(s<12*60)s+=1440;return {k,s}}).filter(Boolean);
  const er=wos.length?wos.reduce((a,b)=>a.s<=b.s?a:b):null,la=wos.length?wos.reduce((a,b)=>a.s>=b.s?a:b):null;
  h+=`<section class="card"><h3 class="ct">七日起卧图<small>躺下到第二天醒来</small></h3>
    <div class="sleep"><span></span><div class="hours">${'酉戌亥子丑寅卯辰巳午未申'.split('').map(c=>`<span class="${c==='子'?'z':''}">${c}</span>`).join('')}</div>${rows}</div>
    <div class="kv">${er?`<span>最早躺下<b>周${WK[parse(er.k).getDay()]} ${hm(er.s)}</b></span><span>最晚躺下<b>周${WK[parse(la.k).getDay()]} ${hm(la.s)}</b></span>`:'<span>这周还没记躺下的时间。在「今日」点「卧」记一下。</span>'}</div>
    <p class="muted" style="margin:8px 0 0">淡红一列是子时，夜半。万民皆卧，命曰合阴。</p></section>`;
  /* 七日气象 */
  h+=`<section class="card"><h3 class="ct">七日气象<small>一格一笔</small></h3><div class="grid7" style="grid-template-columns:24px repeat(4,1fr)"><span></span>${SEG.map(s=>`<span class="h">${s.n}</span>`).join('')}
    ${ds.map((k,i)=>{const q=D(k).qi4||{};return `<span class="d">${WK[(i+1)%7]}</span>`+SEG.map(s=>`<span class="c">${(q[s.k]||[]).map(qiSvg).join('')}</span>`).join('')}).join('')}</div>
    ${(()=>{const cnt={};ds.forEach(k=>{const q=D(k).qi4||{};Object.values(q).flat().forEach(x=>cnt[x]=(cnt[x]||0)+1)});const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];return top?`<div class="note">这一周的底色：<b>${QI[top[0]].n}</b> · ${QI[top[0]].y}</div>`:''})()}</section>`;
  /* 四养 */
  const yc={};YANG.forEach(a=>yc[a[0]]=0);ds.forEach(k=>(D(k).yang||[]).forEach(x=>yc[x]++));
  const recDays=ds.filter(k=>(D(k).yang||[]).length).length;
  h+=`<section class="card"><h3 class="ct">四养周表<small>五谷为养，五果为助</small></h3><div class="grid7" style="grid-template-columns:24px repeat(5,1fr)"><span></span>${YANG.map(a=>`<span class="h">${a[1]}</span>`).join('')}<span class="h">齐了</span>
    ${ds.map((k,i)=>{const y=D(k).yang||[];const all=YANG.every(a=>y.includes(a[0]));return `<span class="d">${WK[(i+1)%7]}</span>`+YANG.map(a=>`<span class="c wz${y.includes(a[0])?' on':''}"></span>`).join('')+`<span class="c${all?' qi':''}">${all?'齐':''}</span>`}).join('')}</div>
    ${recDays?(()=>{const lo=YANG.reduce((a,b)=>yc[a[0]]<=yc[b[0]]?a:b);return `<div class="note">这周最常缺的一样：<b>${lo[1]}</b>（${liang(yc[lo[0]])}天吃到）</div>`})():''}</section>`;
  /* 五味 & 三餐 */
  const wc={};WEI.forEach(x=>wc[x]=0);ds.forEach(k=>(D(k).wei||[]).forEach(x=>wc[x]++));const wTop=Object.entries(wc).sort((a,b)=>b[1]-a[1])[0];
  h+=`<section class="card"><h3 class="ct">五味 · 三餐<small>谨和五味，食饮有节</small></h3><div class="grid7" style="grid-template-columns:24px repeat(5,1fr) 6px repeat(4,1fr)"><span></span>${WEI.map(x=>`<span class="h">${x}</span>`).join('')}<span></span>${MEAL.map(m=>`<span class="h">${m[1].slice(0,1)}</span>`).join('')}
    ${ds.map((k,i)=>{const o=D(k),w=o.wei||[],ml=o.meals||{};return `<span class="d">${WK[(i+1)%7]}</span>`+WEI.map(x=>`<span class="c${w.includes(x)?' on':''}"></span>`).join('')+'<span></span>'+MEAL.map(([m])=>`<span class="c mo ${ml[m]||''}"><b>${ml[m]?MS[ml[m]][0]:''}</b></span>`).join('')}).join('')}</div>
    ${wTop&&wTop[1]?`<div class="note">这周最重的味：<b>${wTop[0]}</b>。${wTop[1]>=5?'是不是总在同一个味道里打转？':''}</div>`:''}
    ${(()=>{const mc={};MEAL.forEach(m=>mc[m[0]]=0);ds.forEach(k=>{const ml=D(k).meals||{};MEAL.forEach(([m])=>{if(ml[m]==='late'||ml[m]==='no')mc[m]++})});const t=Object.entries(mc).sort((a,b)=>b[1]-a[1])[0];return t[1]>=2?`<div class="note">最容易乱的一顿：<b>${MEAL.find(m=>m[0]===t[0])[1]}</b></div>`:''})()}</section>`;
  /* 五久周图 */
  const jc=JIU.map(([k])=>ds.filter(d=>(D(d).jiu||[]).includes(k)).length);
  h+=`<section class="card"><h3 class="ct">五久周图<small>越往外，越要留心</small></h3>${radar(jc)}
    ${Math.max(...jc)?(()=>{const i=jc.indexOf(Math.max(...jc));return `<div class="note">这周被<b>${JIU[i][1]}</b>拖住了${liang(jc[i])}天。${JIU[i][1]}${JIU[i][3]}，下周先改一件小事就好。</div>`})():''}
    <div class="kv"><span>站起来走动<b>${ds.reduce((a,k)=>a+(D(k).qishen||0),0)} 次</b></span></div></section>`;
  /* 本周最累 */
  const wn=S.weekNotes[lookWeek]||{};
  h+=`<section class="card"><h3 class="ct">本周最累的一件事<small>形劳而不倦</small></h3>
    <input class="line1" data-wn="tired" placeholder="最累的一件事" value="${esc(wn.tired||'')}">
    <div class="chips" style="margin-top:10px">${['身','心','都有'].map(x=>`<button class="chip${wn.where===x?' on':''}" data-act="wnw" data-k="${x}">累在${x}</button>`).join('')}</div>
    <input class="line1" data-wn="less" placeholder="下周少做一点的是" value="${esc(wn.less||'')}" style="margin-top:8px"></section>`;
  return h;
}
function radar(c){const cx=150,cy=140,R=100,ang=i=>-Math.PI/2+i*2*Math.PI/5,P=(i,r)=>[cx+Math.cos(ang(i))*r,cy+Math.sin(ang(i))*r];
  const ring=r=>JIU.map((_,i)=>P(i,r).map(v=>v.toFixed(1)).join(',')).join(' ');
  const pts=c.map((n,i)=>P(i,R*Math.min(7,n)/7).map(v=>v.toFixed(1)).join(',')).join(' ');
  return `<svg class="radar" viewBox="0 0 300 270"><g fill="none" stroke="var(--line2)">${[1,4,7].map(n=>`<polygon points="${ring(R*n/7)}" ${n===7?'':'stroke-dasharray="3 4"'}/>`).join('')}${JIU.map((_,i)=>`<line x1="${cx}" y1="${cy}" x2="${P(i,R)[0].toFixed(1)}" y2="${P(i,R)[1].toFixed(1)}"/>`).join('')}</g>
    <polygon points="${pts}" fill="var(--zhu)" fill-opacity=".18" stroke="var(--zhu)" stroke-width="2" stroke-linejoin="round"/>${c.map((n,i)=>{const [x,y]=P(i,R*Math.min(7,n)/7);return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="var(--zhu)"/>`}).join('')}
    ${JIU.map(([k,n,s],i)=>{const [x,y]=P(i,R+26);return `<text x="${x.toFixed(1)}" y="${(y+5).toFixed(1)}" text-anchor="middle" font-size="14" fill="var(--ink)" font-family="var(--cn)">${n}<tspan font-size="11" fill="var(--ink3)"> ${c[i]}</tspan></text>`}).join('')}
    ${[1,4,7].map(n=>`<text x="${cx+4}" y="${(cy-R*n/7+12).toFixed(1)}" font-size="9" fill="var(--ink3)">${n}</text>`).join('')}</svg>`}
function rMonth(){
  const [Y,M]=lookMonth.split('-').map(Number),first=new Date(Y,M-1,1),days=new Date(Y,M,0).getDate(),T=today(),off=(first.getDay()+6)%7;
  let h=`<div class="pnav"><button data-act="pm" data-n="-1">‹</button><b>${Y}年${cnNum(M)}月</b><button data-act="pm" data-n="1" ${lookMonth>=T.slice(0,7)?'disabled':''}>›</button></div>`;
  let you=0,hui=0,tian=0,cells='';
  for(let i=0;i<off;i++)cells+='<span></span>';
  for(let d=1;d<=days;d++){const k=`${Y}-${pad(M)}-${pad(d)}`,o=D(k);if(o.seal==='you')you++;if(o.seal==='hui')hui++;if(o.tian)tian++;
    cells+=`<button class="${o.seal==='you'?'you':o.seal==='hui'?'hui':''}${k===T?' td':''}${k>T?' fu':''}" data-act="gotoday" data-k="${k}" ${k>T?'disabled':''}>${o.seal==='you'?'有常':o.seal==='hui'?'回':d}${o.tian?'<i></i>':''}</button>`}
  h+=`<section class="card"><h3 class="ct">一月有常<small>每晚睡前，给今天盖一个印</small></h3><div class="cal">${'一二三四五六日'.split('').map(x=>`<span class="h">${x}</span>`).join('')}${cells}</div>
    <div class="leg"><span><i style="background:var(--zhu)"></i>有常 · 朱印</span><span><i style="background:var(--zhu2)"></i>回来了 · 淡印</span><span><i style="border:1.5px dashed var(--line2)"></i>明天再说 · 空着</span><span><i style="width:6px;height:6px;border-radius:50%;background:var(--jade)"></i>恬惔一刻</span></div>
    <div class="note">这个月，有常 <b>${liang(you)||'〇'}</b> 天，回来了 <b>${liang(hui)||'〇'}</b> 次${tian?`，有 <b>${liang(tian)}</b> 天有过一刻什么都没想`:''}。<br>空着的地方不欠谁。</div></section>`;
  const mn=S.monthNotes[lookMonth]||{};
  h+=`<section class="card"><h3 class="ct">月末<small>断了不用补</small></h3><div class="qa">
    <label>这个月回来了几次，是怎么回来的</label><input class="line1" data-mn="back" value="${esc(mn.back||'')}">
    <label>最难守的一条常</label><div class="chips" style="margin-top:8px">${S.chang.map((t,i)=>t?`<button class="chip${mn.hard===i?' on':''}" data-act="mnh" data-i="${i}">${esc(t)}</button>`:'').join('')||'<span class="muted">还没写我的常</span>'}</div>
    <label>下个月只改一件事</label><input class="line1" data-mn="one" value="${esc(mn.one||'')}"></div></section>`;
  return h;
}
/* 每月每条常守得怎样：按每天打的勾自动算，也可以点格子自己改 */
function rate(ym,i){const ov=(S.yearRate[ym]||{})[i];if(ov!=null)return ov;const [Y,M]=ym.split('-').map(Number),n=new Date(Y,M,0).getDate();let rec=0,ok=0;
  for(let d=1;d<=n;d++){const o=D(`${ym}-${pad(d)}`);if(o.keep||o.seal){rec++;if((o.keep||[])[i])ok++}}if(!rec)return null;const r=ok/rec;return r>=.7?2:r>=.3?1:0}
function rYear(){
  const Y=lookYear,T=today();
  let h=`<div class="pnav"><button data-act="py" data-n="-1">‹</button><b>${[...String(Y)].map(c=>CN[+c]).join('')}年</b><button data-act="py" data-n="1" ${Y>=new Date().getFullYear()?'disabled':''}>›</button></div>`;
  const cx=170,cy=170,R=[[54,82],[86,114],[118,146]];const a0=-Math.PI/2;
  const arc=(r0,r1,s,e)=>{const p=(r,a)=>`${(cx+Math.cos(a)*r).toFixed(1)} ${(cy+Math.sin(a)*r).toFixed(1)}`;return `M${p(r1,s)}A${r1} ${r1} 0 0 1 ${p(r1,e)}L${p(r0,e)}A${r0} ${r0} 0 0 0 ${p(r0,s)}Z`};
  let g='';for(let m=0;m<12;m++){const ym=`${Y}-${pad(m+1)}`,fut=ym>T.slice(0,7);for(let i=0;i<3;i++){const v=fut?null:rate(ym,i),s=a0+m*Math.PI/6+.012,e=a0+(m+1)*Math.PI/6-.012;
    g+=`<path d="${arc(R[i][0]+1.5,R[i][1]-1.5,s,e)}" fill="${v===2?'var(--zhu)':v===1?'var(--zhu2)':'var(--card2)'}" stroke="var(--line2)" stroke-width=".6" ${fut?'opacity=".4"':`data-act="yr" data-m="${ym}" data-i="${i}" style="cursor:pointer"`}/>`}
    const la=a0+(m+.5)*Math.PI/6;g+=`<text x="${(cx+Math.cos(la)*162).toFixed(1)}" y="${(cy+Math.sin(la)*162+4).toFixed(1)}" text-anchor="middle" font-size="11" fill="var(--ink3)" font-family="var(--cn)">${cnNum(m+1)}</text>`}
  [[2,4],[5,5],[8,7],[11,7]].forEach(([m,d])=>{const a=a0+((m-1)+(d-1)/30)*Math.PI/6;g+=`<circle cx="${(cx+Math.cos(a)*150).toFixed(1)}" cy="${(cy+Math.sin(a)*150).toFixed(1)}" r="3.5" fill="var(--zhu)"/>`});
  h+=`<section class="card"><h3 class="ct">有常年轮<small>一年一圈</small></h3><svg class="ring" viewBox="0 0 340 340">${g}<text x="${cx}" y="${cy-2}" text-anchor="middle" font-size="20" fill="var(--ink)" font-family="var(--cn)" letter-spacing="4">有常</text><text x="${cx}" y="${cy+18}" text-anchor="middle" font-size="11" fill="var(--ink3)" font-family="var(--cn)" letter-spacing="3">年 轮</text></svg>
    <div class="leg"><span><i style="background:var(--zhu)"></i>大多守住</span><span><i style="background:var(--zhu2)"></i>时守时不守</span><span><i style="background:var(--card2);border:1px solid var(--line2)"></i>没顾上</span><span><i style="width:7px;height:7px;border-radius:50%;background:var(--zhu)"></i>四立</span></div>
    <p class="muted" style="margin:10px 0 0">内圈常之一，中圈常之二，外圈常之三。按每天打的勾自动涂；七成以上算大多守住。点一格可以自己改。</p>
    ${S.chang.some(Boolean)?`<div class="note">${S.chang.map((t,i)=>t?`${['内','中','外'][i]}圈：${esc(t)}`:'').filter(Boolean).join('<br>')}</div>`:''}</section>`;
  const yn=S.yearNotes[Y]||{};
  h+=`<section class="card"><h3 class="ct">岁末<small>常，是自己定的</small></h3><div class="qa">
    <label>这一年最想留下的一条常</label><input class="line1" data-yn="keep" value="${esc(yn.keep||'')}">
    <label>最想放过自己的一条</label><input class="line1" data-yn="let" value="${esc(yn.let||'')}">
    <label>明年的第一条常</label><input class="line1" data-yn="next" value="${esc(yn.next||'')}"></div></section>`;
  return h;
}

/* —— 四时 —— */
const SEASONS=[
  {k:'chun',n:'春',name:'发陈',start:[2,4],yuan:'春三月，此谓发陈，天地俱生，万物以荣，夜卧早起，广步于庭，被发缓形，以使志生。',bh:'推陈出新，天地万物都在生长。晚点睡、早点起，到院子里大步走走，衣服穿松一点，让心里的念头也跟着长出来。',rest:'夜卧早起',chk:'广步于庭',chkQ:'这一周出门走走了吗',auto:o=>!!(o.dongWhat&&o.dongWhat.length)||o.light==='y',q:['这个春天，想让什么长出来'],tail:'以使志生'},
  {k:'xia',n:'夏',name:'蕃秀',start:[5,5],yuan:'夏三月，此谓蕃秀，天地气交，万物华实，夜卧早起，无厌于日，使志无怒。',bh:'天地之气交汇，万物开花结果。晚点睡、早点起，别嫌白天长、太阳晒，心里别憋着火。',rest:'夜卧早起',chk:'无厌于日',chkQ:'这一周好好晒过太阳吗',auto:o=>o.light==='y',q:['这个夏天让我冒火的事','后来是怎么放下的'],tail:'使志无怒'},
  {k:'qiu',n:'秋',name:'容平',start:[8,7],yuan:'秋三月，此谓容平，天气以急，地气以明，早卧早起，与鸡俱兴，使志安宁。',bh:'万物长成，风变急了，天地清朗。早睡早起，跟着鸡叫起床，让心安定下来。',rest:'早卧早起',chk:'与鸡俱兴',chkQ:'这一周有早起过吗',auto:o=>{const m=mins(o.qi);return m!=null&&m<=6*60+30},q:['这个秋天收获了什么','想安静下来的地方'],tail:'使志安宁'},
  {k:'dong',n:'冬',name:'闭藏',start:[11,7],yuan:'冬三月，此谓闭藏，水冰地坼，无扰乎阳，早卧晚起，必待日光，使志若伏若匿，若有私意，若已有得。',bh:'水结冰，地冻裂。别去扰动阳气，早点睡，等太阳出来再起，心思像藏起来一样。',rest:'早卧晚起',chk:'必待日光',chkQ:'这一周等天亮才起过吗',auto:o=>{const m=mins(o.qi);return m!=null&&m>=6*60+50&&m<12*60},q:['这个冬天想藏起来的'],tail:'使志若伏若匿'}
];
function seasonAt(k){const d=parse(k),y=d.getFullYear();const st=SEASONS.map(s=>({s,t:new Date(y,s.start[0]-1,s.start[1])}));
  let c=null;st.forEach(x=>{if(x.t<=d)c=x});if(!c)c={s:SEASONS[3],t:new Date(y-1,10,7)};return {s:c.s,start:ymd(c.t)}}
function rSeason(){
  const T=today(),now=seasonAt(T),pick=seasonPick?SEASONS.find(s=>s.k===seasonPick):now.s,isNow=pick===now.s;
  let start=now.start;if(!isNow){const y=new Date().getFullYear();let t=new Date(y,pick.start[0]-1,pick.start[1]);if(ymd(t)>T)t=new Date(y-1,pick.start[0]-1,pick.start[1]);start=ymd(t)}
  const sk=`${start.slice(0,4)}-${pick.k}`;
  let h=`<h2 class="t">四时<small class="yuan" style="margin-left:10px">春夏养阳，秋冬养阴</small></h2>
    <div class="spick">${SEASONS.map(s=>`<button class="${s===pick?'on':''}" data-act="sp" data-k="${s.k}">${s.n}${s===now.s?'<small style="font-size:10px;margin-left:2px">·今</small>':''}</button>`).join('')}</div>
    <section class="season ${pick.k}"><div class="nm">${pick.n}<small>${pick.name}</small></div><span class="rest">本季起卧 · ${pick.rest}</span><div class="bh">${pick.bh}</div><div class="yw">${pick.yuan}</div></section>`;
  /* 我的起卧 vs 本季 */
  const last=Array.from({length:14},(_,i)=>addD(T,-i));const avg=(f,wrap)=>{const v=last.map(k=>{let m=mins(D(k)[f]);if(m==null)return null;if(wrap&&m<12*60)m+=1440;return m}).filter(x=>x!=null);return v.length?hm(Math.round(v.reduce((a,b)=>a+b,0)/v.length)):'—'};
  if(isNow)h+=`<section class="card"><h3 class="ct">我的起卧<small>近两周平均</small></h3><div class="cmp"><div><small>我的起</small><b>${avg('qi')}</b></div><div><small>我的卧</small><b>${avg('wo',true)}</b></div></div><p class="muted" style="margin:10px 0 0">本季宜「${pick.rest}」。一年里，睡觉的时间本来就该跟着变。</p></section>`;
  /* 十三周 */
  const wk=S.seasonWk[sk]||{};const curW=isNow?Math.floor((parse(T)-parse(start))/864e5/7):99;
  h+=`<section class="card"><h3 class="ct">${pick.chk}<small>${pick.chkQ}</small></h3><div class="wk13">${Array.from({length:13},(_,i)=>{const ws=addD(start,i*7);const fut=ws>T;
    const auto=!fut&&Array.from({length:7},(_,j)=>addD(ws,j)).some(k=>k<=T&&pick.auto(D(k)));const v=wk[i]!=null?wk[i]:auto;
    return `<button class="${v?'on':''}${i===curW?' cur':''}${fut?' fu':''}" data-act="sw" data-sk="${sk}" data-i="${i}" data-v="${v?1:0}" ${fut?'disabled':''}>${i+1}</button>`}).join('')}</div>
    <p class="muted" style="margin:10px 0 0">三个月，十三周。按「今日」里记的自动点亮，也可以自己点。</p></section>`;
  const sq=S.seasonQ[sk]||{};
  h+=`<section class="card"><h3 class="ct">${pick.tail}</h3><div class="qa">${pick.q.map((q,i)=>`<label>${q}</label><textarea class="inp" data-sq="${sk}|${i}" rows="2" style="margin-top:8px">${esc(sq[i]||'')}</textarea>`).join('')}
    ${pick.k==='dong'?'<p class="muted" style="margin:10px 0 0">更私密的，放到「小本」里的心事存放处。</p>':''}</div></section>`;
  /* 春夏养阳，秋冬养阴 */
  const out=pick.k==='chun'||pick.k==='xia',L=out?S.yy.out:S.yy.in;
  h+=`<section class="card"><h3 class="ct">${out?'春夏 · 往外':'秋冬 · 往里'}<small>${out?'天长了，多出门，多见光，多动一动':'天短了，多睡一会儿，少折腾，把力气留着'}</small></h3>
    ${L.map((x,i)=>`<div class="rest"><span class="n">${CN[i+1]}</span><input data-yy="${out?'out':'in'}|${i}" value="${esc(x.t)}" placeholder="${out?'想多做的一件事':'想少做的一件事'}"><button class="star${x.d?' on':''}" data-act="yyd" data-k="${out?'out':'in'}" data-i="${i}">${CHECK}</button></div>`).join('')}</section>`;
  /* 当季方物 */
  const fs=S.foods.filter(f=>f.s===sk);
  h+=`<section class="card"><h3 class="ct">当季方物<small>这一季遇见的时令吃食</small></h3>
    ${fs.map(f=>`<div class="item"><div class="tx">${f.good?'<b style="font-weight:normal;color:var(--zhu)">◎ </b>':''}${esc(f.name)}</div>${f.where?`<div class="sub">在 ${esc(f.where)}</div>`:''}<button class="del" data-act="delfood" data-id="${f.id}">×</button></div>`).join('')}
    <button class="add" data-act="addfood" data-sk="${sk}">＋ 记一样</button></section>`;
  app.innerHTML=h;
}

/* —— 小本 —— */
const SHELF=[
  ['back','回来','乱了之后，写一句是怎么回来的',()=>S.back.length?`${liang(S.back.length)}次回来`:''],
  ['knots','解结','想太多的事，写下来就行',()=>{const n=S.knots.filter(k=>!k.loose).length;return n?`${liang(n)}个还结着`:''}],
  ['declined','推掉的一件事','推掉一件事，也是在照顾自己',()=>S.declined.length?`推掉过${liang(S.declined.length)}件`:''],
  ['rest','歇息清单','让自己歇下来的十件小事',()=>{const n=S.rest.filter(r=>r.t).length;return n?`写了${liang(n)}件`:''}],
  ['want','想吃什么','馋，也是一种好好生活',()=>{const n=S.want.eat.length+S.want.cook.length+S.want.with.length;return n?`${liang(n)}样`:''}],
  ['secrets','心事存放处','不想跟别人说的，放在这里',()=>S.secrets.length?`存着${liang(S.secrets.length)}件`:''],
  ['chao','抄经','心乱的时候，抄一段',()=>{const n=Object.values(S.chao).reduce((a,b)=>a+b,0);return n?`抄过${liang(n)}句`:''}],
  ['about','有常録','序 · 三条约定 · 怎么用',()=>''],
];
function rShelf(){
  app.innerHTML=`<h2 class="t">小本</h2><div class="shelf">${SHELF.map(([k,n,d,c])=>`<button data-act="open" data-k="${k}"><b>${n}</b><small>${d}</small><em>${c()||''}</em></button>`).join('')}</div>
    <p class="muted" style="text-align:center;margin:22px 0 0;letter-spacing:.1em">有常，不是从不乱，是乱了还回得来。</p>`;
}

/* ───────── 抽屉 ───────── */
const sheet=$('#sheet'),scrim=$('#scrim');let onClose=null;
function openSheet(html,full,close){sheet.className='sheet'+(full?' full':'');sheet.innerHTML=(full?'':'<div class="grab"></div>')+html;requestAnimationFrame(()=>{sheet.classList.add('on');scrim.classList.add('on')});sheet.scrollTop=0;onClose=close||null}
function closeSheet(){sheet.classList.remove('on');scrim.classList.remove('on');const c=onClose;onClose=null;if(c)c();render()}
scrim.addEventListener('click',closeSheet);
const sh=(t,s)=>`<div class="sh"><h3>${t}</h3>${s?`<small>${s}</small>`:''}<button class="x" data-act="close">×</button></div>`;
const chipsF=(f,opts,val,multi)=>`<div class="chips">${opts.map(x=>`<button class="chip${(multi?(val||[]).includes(x):val===x)?' on':''}" data-act="${multi?'fm':'fs'}" data-f="${f}" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>`;
const timeF=(f,v)=>`<div class="tim"><input type="time" data-f="${f}" value="${esc(v||'')}"><button class="btn ghost" data-act="now" data-f="${f}">就是现在</button></div>`;
function ptSheet(k){const o=D(cur);let h='';
  if(k==='qi')h=sh('起','平旦 · 人气生')+`<label class="fl">几点醒</label>${timeF('qi',o.qi)}<label class="fl">醒来先做的事</label>${chipsF('qiDo',['喝口水','拉开窗帘','看手机','赖了会儿床','伸个懒腰'],o.qiDo)}<input class="line1" data-f="qiDo" placeholder="或者写下来" value="${esc(o.qiDo||'')}" style="margin-top:8px">`;
  if(k==='dong')h=sh('动','日中 · 阳气隆')+`<label class="fl">动了哪里</label>${chipsF('dongWhat',['走路','拉伸','跑步','瑜伽','骑车','做家务','爬楼','没怎么动'],o.dongWhat,true)}<label class="fl">多久</label>${chipsF('dongLen',['十分钟','半小时','一小时','更久'],o.dongLen)}
    <label class="fl">动完之后 <small>劳是睡一觉就缓过来，倦是累到什么都不想做</small></label>${chipsF('dongAfter',['舒展','累','倦'],o.dongAfter)}<label class="fl">出门见天光</label><div class="chips"><button class="chip${o.light==='y'?' on':''}" data-act="fs" data-f="light" data-v="y">见了</button><button class="chip${o.light==='n'?' on':''}" data-act="fs" data-f="light" data-v="n">没见</button></div>`;
  if(k==='shou')h=sh('收','日西 · 气门乃闭')+`<label class="fl">几点放下手头的事</label>${timeF('shou',o.shou)}<label class="fl">今晚怎么收尾</label>${chipsF('shouHow',['洗个热水澡','泡脚','收拾桌子','看会儿书','早点关灯'],o.shouHow)}<input class="line1" data-f="shouHow" placeholder="或者写下来" value="${esc(o.shouHow||'')}" style="margin-top:8px">`;
  if(k==='wo')h=sh('卧','夜半 · 万民皆卧')+`<label class="fl">放下手机</label>${timeF('phone',o.phone)}<label class="fl">躺下</label>${timeF('wo',o.wo)}<p class="muted" style="margin:14px 0 0">记了躺下和第二天醒来的时间，「回看」里的七日起卧图会自己画出来。</p>`;
  openSheet(h+`<div style="margin-top:22px"><button class="btn full" data-act="close">好了</button></div>`)}
function qiSheet(k){const a=(D(cur).qi4||{})[k]||[];const s=SEG.find(x=>x.k===k);
  openSheet(sh(s.n+'的气','可以叠着画，最多两笔')+`<div class="sym7">${Object.entries(QI).map(([q,v])=>`<button class="${a.includes(q)?'on':''}" data-act="qsym" data-k="${k}" data-q="${q}">${qiSvg(q)}<b>${v.n}</b><small>${v.d}</small></button>`).join('')}</div>
  <label class="fl">今天最重的一口气，是因为</label><input class="inp" data-f="qiWhy" value="${esc(D(cur).qiWhy||'')}"><label class="fl">让气顺下来的是</label><input class="inp" data-f="qiEase" value="${esc(D(cur).qiEase||'')}">
  <div style="margin-top:22px"><button class="btn full" data-act="close">好了</button></div>`)}
function qiHelp(){openSheet(sh('气象符号','心情不写字，画气的方向')+Object.entries(QI).map(([q,v])=>`<div class="rest" data-gap="14">${qiSvg(q).replace('class="qsym"','class="qsym" style="width:34px;height:34px;flex:none"')}<span style="flex:1"><b style="font-weight:normal;font-size:16px">${v.n}</b> <span class="muted">${v.d}</span></span><span class="yuan">${v.y}</span></div>`).join('')+`<p class="muted">出自《素问·举痛论》。九种里取了和心情有关的六种。说不清的时候，就画一个圈，表示「还在」。</p>`)}
function sealSheet(){const o=D(cur),ch=S.chang;
  openSheet(sh('给今天盖个印')+`<div class="sealbox" style="justify-content:space-around;margin:16px 0 6px" data-gap="10">
    <button class="bigseal${o.seal==='you'?' you':''}" data-act="setseal" data-v="you" style="${o.seal==='you'?'':'border-color:var(--zhu);color:var(--zhu)'}">${o.seal==='you'?'有常':'有常<br><small>朱印</small>'}</button>
    <button class="bigseal${o.seal==='hui'?' hui':''}" data-act="setseal" data-v="hui" style="${o.seal==='hui'?'':'border-color:var(--zhu2);color:var(--zhu)'}">${o.seal==='hui'?'回来':'回来了<br><small>淡印</small>'}</button>
    <button class="bigseal" data-act="setseal" data-v="skip" style="${o.seal==='skip'?'border-color:var(--ink2);color:var(--ink)':''}">明天<br>再说</button></div>
    ${ch.some(Boolean)?`<label class="fl">今天守住了哪几条常</label><div class="chang" style="margin-top:6px">${ch.map((t,i)=>t?`<button class="crow${(o.keep||[])[i]?' on':''}" data-act="keep" data-i="${i}" data-in="1"><span class="n">${CN[i+1]}</span><span class="x">${esc(t)}</span><span class="ck">${CHECK}</span></button>`:'').join('')}</div>`:''}
    <p class="muted" style="margin:14px 0 0">做到七成就算优秀。一周有五天睡得还行，就已经很好了。</p>`)}
function changSheet(){
  openSheet(sh('我的常','只写三条，写多了守不住')+`<p class="muted" style="margin:6px 0 0">例：一点前放下手机 · 早饭至少吃一口 · 每天出门见一次天光</p>
    ${[0,1,2].map(i=>`<label class="fl">常之${CN[i+1]}</label><input class="inp" data-chang="${i}" value="${esc(S.chang[i])}" maxlength="24">`).join('')}
    ${S.changSince?`<p class="muted">立常于 ${S.changSince}</p>`:''}
    ${S.changLog.length?`<label class="fl">改常记录 <small>守不住的常，可以改。改了不算输。</small></label>${S.changLog.slice().reverse().map(l=>`<div class="item"><div class="m">${l.d}</div><div class="sub">常之${CN[l.i+1]}：${esc(l.from)} → <b style="font-weight:normal;color:var(--ink)">${esc(l.to)}</b></div></div>`).join('')}`:''}
    <div style="margin-top:20px"><button class="btn full" data-act="close">好了</button></div>`,false,()=>{changEdit={}})}
let changEdit={};

/* 小本里的几页 */
function openShelf(k){
  if(k==='back')return openSheet(sh('回来','只记怎么回来的')+`<p class="muted">这一页不记乱了多久。回来的办法用过一次，下次就更快。</p><button class="add" data-act="addback">＋ 写一次回来</button>
    <div style="margin-top:12px">${S.back.slice().reverse().map(b=>`<div class="item"><div class="m">${b.date} 回来${b.days?` · 乱了${liang(b.days)}天`:''}</div>${b.how?`<div class="tx">${esc(b.how)}</div>`:''}${b.signal?`<div class="sub">下次早点察觉的信号：${esc(b.signal)}</div>`:''}<button class="del" data-act="del" data-l="back" data-id="${b.id}">×</button></div>`).join('')}</div>`,true);
  if(k==='knots')return openSheet(sh('解结','思则气结')+`<p class="muted">想太多的事，写下来就行，不要求解开。有一天回头看，结已经松了，就点「松了」。</p><button class="add" data-act="addknot">＋ 写一个结</button>
    <div style="margin-top:12px">${S.knots.slice().reverse().map(n=>`<div class="item${n.loose?' loose':''}"><div class="m">${n.since}起${n.loose?` · ${n.loose}松了`:` · 结了${liang(Math.max(0,Math.round((parse(today())-parse(n.since))/864e5)))||'〇'}天`}</div><div class="tx">${esc(n.text)}${n.loose?'<span class="wave">〰</span>':''}</div>
      ${n.loose?'':`<div style="margin-top:8px">${['先放一放','想动一动'].map(x=>`<button class="chip${n.c===x?' on':''}" data-act="knotc" data-id="${n.id}" data-v="${x}" style="margin-right:6px">${x}</button>`).join('')}<button class="chip z" data-act="knotloose" data-id="${n.id}">松了</button></div>`}<button class="del" data-act="del" data-l="knots" data-id="${n.id}">×</button></div>`).join('')}</div>`,true);
  if(k==='declined')return openSheet(sh('推掉的一件事','不妄作劳')+`<p class="muted">不是什么都揽在身上，才叫认真。</p><button class="add" data-act="adddecl">＋ 推掉了一件事</button>
    <div style="margin-top:12px">${S.declined.slice().reverse().map(n=>`<div class="item"><div class="m">${n.date}</div><div class="tx">${esc(n.what)}</div>${n.after?`<span class="tag">${n.after}</span>`:''}<button class="del" data-act="del" data-l="declined" data-id="${n.id}">×</button></div>`).join('')}</div>`,true);
  if(k==='rest')return openSheet(sh('歇息清单','歇一歇，不算偷懒')+`<p class="muted">让自己歇下来的十件小事。最见效的三件点个星，累的时候直接翻到这页。<br>例：泡个脚 · 换一套干净床单 · 把手机放到另一个房间 · 下楼走一圈</p>
    ${S.rest.map((r,i)=>`<div class="rest"><span class="n">${cnNum(i+1)}</span><input data-rest="${i}" value="${esc(r.t)}"><button class="star${r.s?' on':''}" data-act="star" data-i="${i}"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/></svg></button></div>`).join('')}`,true);
  if(k==='want'){const L=(f,t,ph,ck)=>`<label class="fl">${t}</label>${S.want[f].map(w=>`<div class="rest">${ck?`<button class="star${w.d?' on':''}" data-act="wantd" data-f="${f}" data-id="${w.id}">${CHECK}</button>`:'<span class="n">·</span>'}<span style="flex:1;font-size:15px;${w.d?'color:var(--ink3)':''}">${esc(w.t)}</span><button class="del" data-act="delwant" data-f="${f}" data-id="${w.id}" style="color:var(--ink3);width:28px">×</button></div>`).join('')}<div class="tim" style="margin-top:6px"><input class="inp" data-wnew="${f}" placeholder="${ph}" style="font-size:15px"><button class="btn ghost" data-act="addwant" data-f="${f}">添</button></div>`;
    return openSheet(sh('想吃什么','馋，也是一种好好生活')+L('eat','想吃的','一家店，一道菜，一种水果')+L('cook','想学做的','做成了就打个勾',true)+L('with','想带谁去吃的','人和地方都写上'),true)}
  if(k==='secrets')return openSheet(sh('心事存放处','若有私意，若已有得')+`<p class="muted">不想跟别人说的，放在这里。可以定一个拆开的日子，到那天之前，它是封着的。</p><button class="add" data-act="addsecret">＋ 存一件心事</button>
    <div style="margin-top:12px">${S.secrets.slice().reverse().map(s=>{const sealed=s.open&&s.open>today()&&!s.peek;return `<div class="item">${sealed?`<div class="lock"><span class="env"></span><div><div class="tx" style="margin:0">封着</div><div class="m">${s.date}存 · ${s.open}可以拆开</div></div></div>`
      :`<div class="m">${s.date}存${s.open?` · ${s.open}拆`:''}</div><div class="tx">${esc(s.text)}</div>`}<button class="del" data-act="del" data-l="secrets" data-id="${s.id}">×</button></div>`}).join('')}</div>`,true);
  if(k==='chao')return chaoList();
  if(k==='about')return openSheet(sh('有常録','取《素问》「起居有常」之意')+`
    <p style="font-size:15px;line-height:2;color:var(--ink2)">两千多年前，岐伯对黄帝说：上古懂道理的人，跟着天地阴阳的节律过日子，吃喝有节制，起居有规律，不瞎折腾自己。<br>他接着说，现在的人不是这样，<b style="font-weight:normal;color:var(--zhu)">以妄为常</b>——把乱来当成了平常。<br>熬到两点是常，一坐一下午是常，睡前刷手机刷到眼睛发酸，也是常。</p>
    <p style="font-size:15px;line-height:2;color:var(--ink2)">这里不打算把你变成一个作息完美的人。它只做一件事：在你乱了之后，给你留一个回来的地方。所以没有打卡天数，也没有连续记录。</p>
    <label class="fl">三条约定</label>${PACT.map((p,i)=>`<div class="pact"><i>${CN[i+1]}</i><div><b>${p[0]}</b><span>${p[1]}</span></div></div>`).join('')}
    ${S.pact?`<p class="muted">约定人 ${esc(S.pact.name||'')} · ${S.pact.date}</p>`:''}
    <label class="fl">怎么用</label><div class="muted" style="font-size:14px;line-height:1.95">先 · 写下「我的常」，只写三条<br>每天 · 记起、动、收、卧四个点，两分钟就够<br>每晚 · 给今天盖一个印<br>顺手 · 吃、动、气，哪个顺手点哪个<br>每季 · 翻一次四时<br>心乱时 · 抄一段</div>
    <p class="yuan" style="margin-top:22px;text-align:center">原文摘自《黄帝内经·素问》《灵枢》</p>`,true);
}
const PACT=[['做到七成就算优秀','这里没有满分。一周有五天睡得还行，就已经很好了。'],['断了不用补','漏了几天，回来接着写就行，不用回头补，也不用跟自己解释。'],['空着的地方不欠谁','有的格子一直空着也没关系。它们等得起，你也不用急。']];
function formSheet(title,sub,fields,onOk){openSheet(sh(title,sub)+fields.map(f=>`<label class="fl">${f.l}</label>${f.t==='chips'?`<div class="chips" data-ff="${f.k}">${f.o.map(x=>`<button class="chip" data-act="ffc" data-k="${f.k}" data-v="${x}">${x}</button>`).join('')}</div>`:f.t==='date'?`<input class="inp" type="date" data-ff="${f.k}" value="${f.v||''}">`:f.t==='num'?`<input class="inp" type="number" inputmode="numeric" min="0" data-ff="${f.k}" value="${f.v||''}">`:f.t==='area'?`<textarea class="inp" data-ff="${f.k}" rows="3">${esc(f.v||'')}</textarea>`:`<input class="inp" data-ff="${f.k}" value="${esc(f.v||'')}" placeholder="${esc(f.p||'')}">`}`).join('')+`<div style="margin-top:22px;display:flex" data-gap="10"><button class="btn plain" data-act="close" style="flex:1">算了</button><button class="btn" data-act="ffok" style="flex:2">存下</button></div>`);
  formOk=onOk}
let formOk=null;
function formVals(){const v={};$$('#sheet [data-ff]').forEach(el=>{v[el.dataset.ff]=el.matches('.chips')?((el.querySelector('.chip.on')||{}).dataset||{}).v||'':el.value.trim()});return v}

/* ───────── 抄经：先描一个字，再写下一个 ───────── */
const CHAO=[
  {t:'上古天真论',src:'素问·上古天真论',bh:'跟着天地阴阳的节律，懂得调养的法子，吃喝有节制，起居有规律，不瞎折腾自己。',p:['法于阴阳','和于术数','食饮有节','起居有常','不妄作劳']},
  {t:'恬惔虚无',src:'素问·上古天真论',bh:'心里安静、不贪不求，真气就顺，精神守在里面。心思闲，欲望少；心里安稳，不慌；身体在劳动，却不疲倦。',p:['恬惔虚无','真气从之','精神内守','志闲而少欲','心安而不惧','形劳而不倦']},
  {t:'四时阴阳',src:'素问·四气调神大论',bh:'四季阴阳是万物的根本。所以懂养生的人，春夏养阳，秋冬养阴，顺着根走。',p:['夫四时阴阳者','万物之根本也','所以圣人','春夏养阳','秋冬养阴','以从其根']},
  {t:'平旦人气生',src:'素问·生气通天论',bh:'天刚亮阳气生发，正午最旺，太阳偏西就弱了，毛孔也跟着收拢。',p:['平旦人气生','日中而阳气隆','日西而阳气已虚','气门乃闭']},
  {t:'五劳所伤',src:'素问·宣明五气',bh:'看太久伤血，躺太久伤气，坐太久伤肉，站太久伤骨，走太久伤筋。',p:['久视伤血','久卧伤气','久坐伤肉','久立伤骨','久行伤筋']},
  {t:'气之所向',src:'素问·举痛论',bh:'生气时气往上冲，高兴时气松缓，悲伤时气消散，害怕时气下沉，受惊时气乱，想太多时气打结。',p:['怒则气上','喜则气缓','悲则气消','恐则气下','惊则气乱','思则气结']},
  {t:'智者之养生',src:'灵枢·本神',bh:'会养生的人，一定顺着四季、适应冷暖，调和喜怒、安于住处，调节阴阳刚柔。',p:['智者之养生也','必顺四时而适寒暑','和喜怒而安居处','节阴阳而调刚柔']}
];
function chaoList(){openSheet(sh('抄经','心乱的时候，抄一段')+`<p class="muted">点一句，先描红，一个字一个字来。</p>${CHAO.map((c,i)=>`<div class="passage"><b>${c.t}</b>${S.chao[i]?`<em>抄过${liang(S.chao[i])}句</em>`:''}<small>${c.bh}<br>出处：《${c.src}》</small><div class="phr">${c.p.map((p,j)=>`<button data-act="trace" data-i="${i}" data-j="${j}">${p}</button>`).join('')}</div></div>`).join('')}`,true)}
let tr=null;
function traceStart(i,j){const ch=[...CHAO[i].p[j]];tr={i,j,ch,n:0,imgs:[]};traceView()}
function traceView(){const c=CHAO[tr.i];
  openSheet(sh(c.t,`${tr.n+1} / ${tr.ch.length}`)+`<div class="tracer"><div class="tline">${tr.ch.map((x,k)=>`<span class="${k===tr.n?'cur':''}">${tr.imgs[k]?`<img src="${tr.imgs[k]}" alt="">`:x}</span>`).join('')}</div>
    <div class="tbox"><canvas id="tg"></canvas><canvas id="tw"></canvas></div><div class="tacts"><button class="btn plain" data-act="tclear">擦掉</button><button class="btn" data-act="tnext">${tr.n<tr.ch.length-1?'下一个字':'抄好了'}</button></div>
    <p class="muted" style="text-align:center;margin:0">${c.p[tr.j]} · 《${c.src}》</p></div>`,true,()=>{tr=null});
  setupTrace()}
let tctx=null,tdirty=false;
function setupTrace(){const g=$('#tg'),w=$('#tw'),box=g.parentElement,r=box.getBoundingClientRect(),dpr=Math.min(3,devicePixelRatio||1),W=Math.round(r.width*dpr);
  [g,w].forEach(c=>{c.width=c.height=W});const x=g.getContext('2d'),cs=getComputedStyle(document.documentElement),zhu2=cs.getPropertyValue('--zhu2').trim(),zhu=cs.getPropertyValue('--zhu').trim();
  x.strokeStyle=zhu2;x.lineWidth=dpr;x.setLineDash([6*dpr,6*dpr]);x.beginPath();x.moveTo(W/2,0);x.lineTo(W/2,W);x.moveTo(0,W/2);x.lineTo(W,W/2);x.moveTo(0,0);x.lineTo(W,W);x.moveTo(W,0);x.lineTo(0,W);x.stroke();x.setLineDash([]);
  const draw=()=>{x.save();x.globalAlpha=.32;x.fillStyle=zhu;x.textAlign='center';x.textBaseline='middle';x.font=`${Math.round(W*.78)}px "WenKai Embed","WK Extra","LXGW WenKai","KaiTi",serif`;x.fillText(tr.ch[tr.n],W/2,W*.53);x.restore()};
  (document.fonts&&document.fonts.load?document.fonts.load(`40px "WenKai Embed"`,tr.ch[tr.n]):Promise.resolve()).then(draw,draw);
  tctx=w.getContext('2d');tctx.lineCap=tctx.lineJoin='round';tctx.strokeStyle=cs.getPropertyValue('--ink').trim();tdirty=false;let last=null,lw=W*.03;
  const pt=e=>{const b=w.getBoundingClientRect();return [(e.clientX-b.left)*dpr,(e.clientY-b.top)*dpr]};
  w.onpointerdown=e=>{e.preventDefault();w.setPointerCapture(e.pointerId);last=pt(e);tctx.beginPath();tctx.arc(last[0],last[1],lw/2,0,7);tctx.fillStyle=tctx.strokeStyle;tctx.fill();tdirty=true};
  w.onpointermove=e=>{if(!last)return;const p=pt(e),d=Math.hypot(p[0]-last[0],p[1]-last[1]);if(d<1.5)return;const t=Math.max(.55,Math.min(1.15,1.3-d/(W*.06)));tctx.lineWidth=lw*t;tctx.beginPath();tctx.moveTo(last[0],last[1]);tctx.lineTo(p[0],p[1]);tctx.stroke();last=p};
  w.onpointerup=w.onpointercancel=()=>{last=null}}

/* ───────── 开张：三步 ───────── */
function intro(step){
  const box=document.createElement('div');box.className='intro';document.body.appendChild(box);let n=step||0;
  const paint=()=>{let h='';
    if(n===0)h=`<div class="big">有常録</div><p class="q">有常，不是从不乱，<br>是乱了还回得来。</p><p style="text-align:center;margin-top:24px">取《素问》「起居有常」之意。<br>没有打卡天数，也没有连续记录。<br>乱了之后，这里给你留一个回来的地方。</p>`;
    if(n===1)h=`<h2 class="t" style="margin:10px 0 6px">三条约定</h2><p style="margin:0 0 6px">开始之前。</p>${PACT.map((p,i)=>`<div class="pact"><i>${CN[i+1]}</i><div><b>${p[0]}</b><span>${p[1]}</span></div></div>`).join('')}<label class="fl" style="margin-top:22px">约定人</label><input class="inp" id="ipName" placeholder="写个名字，或者不写" maxlength="10">`;
    if(n===2)h=`<h2 class="t" style="margin:10px 0 6px">我的常</h2><p style="margin:0">只写三条自己的作息底线。写多了，反而守不住。以后随时能改，改了不算输。</p>${[0,1,2].map(i=>`<label class="fl">常之${CN[i+1]}</label><input class="inp" id="ipC${i}" placeholder="${['一点前放下手机','早饭至少吃一口','每天出门见一次天光'][i]}" maxlength="24">`).join('')}`;
    box.innerHTML=`<div class="in">${h}<div class="foot"><div class="dots3">${[0,1,2].map(i=>`<i class="${i===n?'on':''}"></i>`).join('')}</div><button class="btn full" id="ipNext">${n===0?'开始':n===1?'约定':'立常'}</button>${n===2?'<button class="btn plain full" id="ipSkip">先空着，回头再写</button>':''}</div></div>`;
    $('#ipNext').addEventListener('click',()=>{if(n===1){S.pact={name:($('#ipName').value||'').trim(),date:today()}}
      if(n===2){const v=[0,1,2].map(i=>$('#ipC'+i).value.trim());if(v.some(Boolean)){S.chang=v;S.changSince=today()}finish();return}n++;paint()});
    if($('#ipSkip'))$('#ipSkip').addEventListener('click',finish);};
  const finish=()=>{S.intro=true;save();box.remove();render()};paint();
}

/* ───────── 设置 ───────── */
function settings(){openSheet(sh('设置')+`<label class="fl">我的常</label><button class="add" data-act="chang" style="text-align:left">${S.chang.some(Boolean)?S.chang.filter(Boolean).map(esc).join(' · '):'还没写'}</button>
  <label class="fl">颜色</label><div class="chips">${[['auto','跟着时辰'],['day','白天'],['night','夜里']].map(([k,n])=>`<button class="chip${S.theme===k?' on':''}" data-act="theme" data-k="${k}">${n}</button>`).join('')}</div><p class="muted" style="margin:6px 0 0">跟着时辰：亥时以后自动换成夜里的颜色。</p>
  <label class="fl">备份</label><p class="muted" style="margin:6px 0 8px">记下的东西只存在这台设备上，不上传。清理数据会一起清掉，隔一阵把备份文字复制保存一份（备忘录、聊天都行）。</p>
  <div style="display:flex" data-gap="10"><button class="btn ghost" data-act="exp" style="flex:1">显示备份文字</button><button class="btn ghost" data-act="imp" style="flex:1">粘贴恢复</button></div><div id="bkArea"></div>
  <label class="fl">重新开始</label><button class="btn plain" data-act="wipe">清空所有记录</button>`)}
function showBackup(){
  saveNow();$('#bkArea').innerHTML='<p class="muted" style="margin:10px 0 4px">点文字框全选，复制保存。</p><textarea class="inp" id="bkText" readonly style="height:110px;font-size:13px"></textarea><button class="btn plain" data-act="bksel" style="margin-top:8px">全选</button>';
  const t=$('#bkText');t.value=JSON.stringify({app:'youchanglu',v:1,at:Date.now(),data:S});t.addEventListener('focus',()=>t.select());
}
function showRestore(){$('#bkArea').innerHTML='<p class="muted" style="margin:10px 0 4px">把备份文字整段粘贴到这里，会替换现在的记录。</p><textarea class="inp" id="bkIn" placeholder="粘贴备份文字" style="height:110px;font-size:13px"></textarea><button class="btn" data-act="bkgo" style="margin-top:8px">恢复</button>'}
function doRestore(){try{const j=JSON.parse($('#bkIn').value);if(j.app!=='youchanglu'||!j.data)throw 0;Object.keys(S).forEach(k=>delete S[k]);Object.assign(S,j.data);saveNow();closeSheet();toast('恢复好了')}catch(e){toast('这段文字读不出来')}}

/* ───────── 点来点去 ───────── */
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-act],[data-tab]');if(!t)return;
  if(t.dataset.tab)return go(t.dataset.tab);
  const a=t.dataset.act,d=t.dataset;
  const inSheet=!!t.closest('#sheet');
  const reSheet=()=>{if(sheetKind)sheetKind()};
  switch(a){
    case 'close':return closeSheet();
    case 'settings':return settings();
    case 'day':{cur=d.n==='0'?today():addD(cur,+d.n);if(cur>today())cur=today();return render()}
    case 'backok':S.backDismiss=cur;save();return render();
    case 'backnote':return formSheet('回来','只记怎么回来的',[{k:'days',l:'乱了几天',t:'num',v:d.gap},{k:'how',l:'怎么回来的',t:'area'},{k:'signal',l:'下次早点察觉的信号',p:'比如：连着三天外卖、手机放在枕头边'}],v=>{S.back.push({id:uid(),date:today(),days:+v.days||0,how:v.how,signal:v.signal});S.backDismiss=today();save();toast('记下了。回来就好。')});
    case 'chang':return changSheet();
    case 'keep':{setD(cur,o=>{const k=o.keep||[false,false,false];k[+d.i]=!k[+d.i];o.keep=k.some(Boolean)?k:null});if(d.in){t.classList.toggle('on');return}return render()}
    case 'pt':return ptSheet(d.k);
    case 'qi':return qiSheet(d.k);
    case 'qihelp':return qiHelp();
    case 'qsym':{setD(cur,o=>{const q=o.qi4||{},a2=q[d.k]||[];const i=a2.indexOf(d.q);if(i>=0)a2.splice(i,1);else{a2.push(d.q);if(a2.length>2)a2.shift()}q[d.k]=a2;if(!a2.length)delete q[d.k];o.qi4=q});
      const now=(D(cur).qi4||{})[d.k]||[];$$('#sheet [data-act="qsym"]').forEach(b=>b.classList.toggle('on',now.includes(b.dataset.q)));return}
    case 'yang':setD(cur,o=>{const y=o.yang||[];const i=y.indexOf(d.k);i>=0?y.splice(i,1):y.push(d.k);o.yang=y});if(YANG.every(x=>(D(cur).yang||[]).includes(x[0])))toast('四样齐了');return render();
    case 'wei':setD(cur,o=>{const y=o.wei||[];const i=y.indexOf(d.k);i>=0?y.splice(i,1):y.push(d.k);o.wei=y});return render();
    case 'jiu':setD(cur,o=>{const y=o.jiu||[];const i=y.indexOf(d.k);i>=0?y.splice(i,1):y.push(d.k);o.jiu=y});return render();
    case 'meal':{const order=[undefined,'ok','late','no'];setD(cur,o=>{const m=o.meals||{};const nx=order[(order.indexOf(m[d.k])+1)%4];if(nx)m[d.k]=nx;else delete m[d.k];o.meals=m});return render()}
    case 'qs':setD(cur,o=>{o.qishen=Math.max(0,(o.qishen||0)+(+d.n))||null});return render();
    case 'tian':setD(cur,o=>{o.tian=o.tian?null:true;if(!o.tian)o.tianWhere=null});return render();
    case 'seal':return sealSheet();
    case 'setseal':{const v=d.v;setD(cur,o=>{o.seal=o.seal===v?null:v});const s=D(cur).seal;closeSheet();toast(s==='you'?'盖了朱印。今日有常。':s==='hui'?'盖了淡印。回来了就好。':s==='skip'?'空着，明天再说。':'印揭掉了');return}
    case 'fs':{setD(cur,o=>{o[d.f]=o[d.f]===d.v?null:d.v});const v=D(cur)[d.f];$$(`#sheet [data-act="fs"][data-f="${d.f}"]`).forEach(b=>b.classList.toggle('on',b.dataset.v===v));const inp=$(`#sheet input[data-f="${d.f}"]`);if(inp&&inp.type!=='time')inp.value=v||'';return}
    case 'fm':{setD(cur,o=>{const y=o[d.f]||[];const i=y.indexOf(d.v);i>=0?y.splice(i,1):y.push(d.v);o[d.f]=y});t.classList.toggle('on');return}
    case 'now':{const v=nowHM();setD(cur,o=>{o[d.f]=v});const inp=$(`#sheet input[data-f="${d.f}"]`);if(inp)inp.value=v;return}
    case 'lm':lookMode=d.k;return render();
    case 'pw':lookWeek=addD(lookWeek,+d.n);return render();
    case 'pm':{const [Y,M]=lookMonth.split('-').map(Number),x=new Date(Y,M-1+(+d.n),1);lookMonth=`${x.getFullYear()}-${pad(x.getMonth()+1)}`;return render()}
    case 'py':lookYear+=+d.n;return render();
    case 'gotoday':cur=d.k;return go('today');
    case 'mnh':{const m=S.monthNotes[lookMonth]||(S.monthNotes[lookMonth]={});m.hard=m.hard===+d.i?null:+d.i;save();return render()}
    case 'wnw':{const w=S.weekNotes[lookWeek]||(S.weekNotes[lookWeek]={});w.where=w.where===d.k?null:d.k;save();return render()}
    case 'yr':{const r=S.yearRate[d.m]||(S.yearRate[d.m]={});const v=rate(d.m,+d.i);r[+d.i]=v===2?1:v===1?0:2;save();return render()}
    case 'sp':seasonPick=d.k;return render();
    case 'sw':{const w=S.seasonWk[d.sk]||(S.seasonWk[d.sk]={});w[+d.i]=d.v!=='1';save();return render()}
    case 'yyd':S.yy[d.k][+d.i].d=!S.yy[d.k][+d.i].d;save();return render();
    case 'addfood':return formSheet('当季方物','只记名字和在哪儿吃到的',[{k:'name',l:'叫什么'},{k:'where',l:'在哪儿吃到的'},{k:'good',l:'好吃吗',t:'chips',o:['好吃','一般']}],v=>{if(!v.name)return toast('写个名字吧');S.foods.push({id:uid(),s:d.sk,name:v.name,where:v.where,good:v.good==='好吃'});save()});
    case 'delfood':S.foods=S.foods.filter(f=>f.id!==d.id);save();return render();
    case 'open':sheetKind=()=>openShelf(d.k);return openShelf(d.k);
    case 'addback':return formSheet('回来','只记怎么回来的',[{k:'days',l:'乱了几天',t:'num'},{k:'how',l:'怎么回来的',t:'area'},{k:'signal',l:'下次早点察觉的信号'}],v=>{if(!v.how&&!v.signal)return;S.back.push({id:uid(),date:today(),days:+v.days||0,how:v.how,signal:v.signal});save();setTimeout(()=>openShelf('back'),320)});
    case 'addknot':return formSheet('写一个结','不要求解开',[{k:'text',l:'打结的事',t:'area'},{k:'since',l:'从哪天开始结的',t:'date',v:today()}],v=>{if(!v.text)return;S.knots.push({id:uid(),text:v.text,since:v.since||today()});save();setTimeout(()=>openShelf('knots'),320)});
    case 'knotc':{const n=S.knots.find(x=>x.id===d.id);n.c=n.c===d.v?null:d.v;save();return openShelf('knots')}
    case 'knotloose':{const n=S.knots.find(x=>x.id===d.id);n.loose=today();save();toast('松了。画一道波纹。');return openShelf('knots')}
    case 'adddecl':return formSheet('推掉的一件事','不妄作劳',[{k:'what',l:'推掉了什么',t:'area'},{k:'after',l:'推掉之后',t:'chips',o:['松了口气','有点内疚','都还好']}],v=>{if(!v.what)return;S.declined.push({id:uid(),date:today(),what:v.what,after:v.after});save();setTimeout(()=>openShelf('declined'),320)});
    case 'addsecret':return formSheet('存一件心事','只有这台设备上能看到',[{k:'text',l:'心事',t:'area'},{k:'open',l:'可以拆开的日子（不填就随时能看）',t:'date'}],v=>{if(!v.text)return;S.secrets.push({id:uid(),date:today(),open:v.open||'',text:v.text});save();toast(v.open?'封好了':'存下了');setTimeout(()=>openShelf('secrets'),320)});
    case 'del':{if(!confirm('删掉这一条？'))return;S[d.l]=S[d.l].filter(x=>x.id!==d.id);save();return openShelf(d.l)}
    case 'star':{const r=S.rest[+d.i];if(!r.s&&S.rest.filter(x=>x.s).length>=3)return toast('只圈最见效的三件');r.s=!r.s;save();t.classList.toggle('on',r.s);return}
    case 'addwant':{const inp=$(`#sheet [data-wnew="${d.f}"]`);const v=inp.value.trim();if(!v)return;S.want[d.f].push({id:uid(),t:v,d:false});save();return openShelf('want')}
    case 'wantd':{const w=S.want[d.f].find(x=>x.id===d.id);w.d=!w.d;save();return openShelf('want')}
    case 'delwant':S.want[d.f]=S.want[d.f].filter(x=>x.id!==d.id);save();return openShelf('want');
    case 'ffc':{$$(`#sheet [data-act="ffc"][data-k="${d.k}"]`).forEach(b=>b.classList.toggle('on',b===t&&!b.classList.contains('on')));return}
    case 'ffok':{const v=formVals(),f=formOk;formOk=null;sheetKind=null;closeSheet();if(f)f(v);return}
    case 'trace':return traceStart(+d.i,+d.j);
    case 'tclear':tctx.clearRect(0,0,tctx.canvas.width,tctx.canvas.height);tdirty=false;return;
    case 'tnext':{if(!tdirty)return toast('先描一描');const c=document.createElement('canvas');c.width=c.height=120;c.getContext('2d').drawImage($('#tw'),0,0,120,120);tr.imgs[tr.n]=c.toDataURL();
      if(tr.n<tr.ch.length-1){tr.n++;return traceView()}
      S.chao[tr.i]=(S.chao[tr.i]||0)+1;save();const c2=CHAO[tr.i],imgs=tr.imgs,i=tr.i,j=tr.j;
      openSheet(sh('抄好了',c2.t)+`<div class="result">${imgs.map(u=>`<img src="${u}" alt="">`).join('')}</div><p style="text-align:center;font-size:18px;letter-spacing:.3em;margin:16px 0 4px">${c2.p[j]}</p><p class="muted" style="text-align:center;margin:0">《${c2.src}》</p>
        <div style="margin-top:24px;display:flex" data-gap="10">${j<c2.p.length-1?`<button class="btn" style="flex:1" data-act="trace" data-i="${i}" data-j="${j+1}">接着抄下一句</button>`:''}<button class="btn plain" style="flex:1" data-act="open" data-k="chao">回到抄经</button></div>`,true);return}
    case 'theme':S.theme=d.k;save();applyTheme();return settings();
    case 'exp':return showBackup();
    case 'imp':return showRestore();
    case 'bksel':{const x=$('#bkText');x.focus();x.select();return}
    case 'bkgo':return doRestore();
    case 'wipe':{if(!confirm('清空所有记录？这一步撤不回来，先导出一份备份更稳妥。'))return;try{localStorage.removeItem(KEY)}catch(e){}location.reload();return}
  }
});
let sheetKind=null;
document.addEventListener('input',e=>{const el=e.target,d=el.dataset;
  if(d.f!=null&&el.closest('#sheet')){const v=el.value;setD(cur,o=>{o[d.f]=v.trim()?v:null});if(el.type!=='time'){$$(`#sheet [data-act="fs"][data-f="${d.f}"]`).forEach(b=>b.classList.toggle('on',b.dataset.v===v))}return}
  if(d.f!=null){setD(cur,o=>{o[d.f]=el.value.trim()?el.value:null});return}
  if(d.chang!=null){if(changEdit[d.chang]==null)changEdit[d.chang]=S.chang[+d.chang];S.chang[+d.chang]=el.value.trim();if(!S.changSince&&S.chang.some(Boolean))S.changSince=today();save();return}
  if(d.wn){const w=S.weekNotes[lookWeek]||(S.weekNotes[lookWeek]={});w[d.wn]=el.value;save();return}
  if(d.mn){const m=S.monthNotes[lookMonth]||(S.monthNotes[lookMonth]={});m[d.mn]=el.value;save();return}
  if(d.yn){const m=S.yearNotes[lookYear]||(S.yearNotes[lookYear]={});m[d.yn]=el.value;save();return}
  if(d.sq){const [sk,i]=d.sq.split('|');const m=S.seasonQ[sk]||(S.seasonQ[sk]={});m[i]=el.value;save();return}
  if(d.yy){const [k,i]=d.yy.split('|');S.yy[k][+i].t=el.value;save();return}
  if(d.rest!=null){S.rest[+d.rest].t=el.value;save();return}
});
/* 改常：离开输入框时，把旧的写进改常记录 */
document.addEventListener('change',e=>{const el=e.target;if(el.dataset.chang==null)return;const i=+el.dataset.chang,from=changEdit[i];delete changEdit[i];
  if(from&&from!==S.chang[i]&&S.chang[i]){S.changLog.push({d:today(),i,from,to:S.chang[i]});save();toast('改了。改了不算输。')}});

/* 过了零点或者从后台回来，刷新今天 */
let lastDay=today();setInterval(()=>{if(today()!==lastDay){if(cur===lastDay)cur=today();lastDay=today()}if(tab==='today'&&!sheet.classList.contains('on')&&!document.activeElement.matches('input,textarea'))render();else applyTheme()},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!sheet.classList.contains('on')){if(today()!==lastDay){if(cur===lastDay)cur=today();lastDay=today()}render()}});

render();if(!S.intro)intro(0);
})();

