
(function(){
/* ───────── 存储 ───────── */
const KEY='sujianji-book-v2',OLD='sujianji-book-v1';
const store={
  get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}},
  del(k){try{localStorage.removeItem(k)}catch(e){}}
};
let seq=Date.now();const uid=()=>(seq++).toString(36);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const CN='〇一二三四五六七八九';
function cnNum(n){if(n<10)return CN[n];if(n<20)return '十'+(n%10?CN[n%10]:'');if(n<100)return CN[Math.floor(n/10)]+'十'+(n%10?CN[n%10]:'');return String(n)}
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const page=$('#page');

/* ───────── 笺式 ───────── */
const PAPERS=[
  {id:'xuan',name:'宣纸',c:'#f6efe0'},{id:'yuebai',name:'月白',c:'#f2f4f0'},{id:'ouhe',name:'藕荷',c:'#f7eded'},
  {id:'xiang',name:'缃色',c:'#f6ecce'},{id:'zhuqing',name:'竹青',c:'#f1f3ea'},{id:'yemo',name:'夜墨',c:'#1f1d1a'}
];
const RULES=[
  {id:'blank',name:'素白',dir:null},{id:'hline',name:'横格',dir:'h'},{id:'wusi',name:'乌丝栏',dir:'v'},
  {id:'zhusi',name:'朱丝栏',dir:'v'},{id:'grid',name:'方格',dir:null},{id:'dot',name:'点阵',dir:null}
];
const MINI={
  blank:'',
  hline:'background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 7px,rgba(42,36,32,.35) 7px,rgba(42,36,32,.35) 8px)',
  wusi:'border:1px solid rgba(42,36,32,.4);background-image:repeating-linear-gradient(to left,transparent 0,transparent 7px,rgba(42,36,32,.35) 7px,rgba(42,36,32,.35) 8px)',
  zhusi:'border:1px solid rgba(178,58,43,.55);background-image:repeating-linear-gradient(to left,transparent 0,transparent 7px,rgba(178,58,43,.5) 7px,rgba(178,58,43,.5) 8px)',
  grid:'border:1px solid rgba(178,58,43,.5);background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 7px,rgba(178,58,43,.45) 7px,rgba(178,58,43,.45) 8px),repeating-linear-gradient(to right,transparent 0,transparent 7px,rgba(178,58,43,.45) 7px,rgba(178,58,43,.45) 8px)',
  dot:'background-image:radial-gradient(circle,rgba(42,36,32,.45) 1px,transparent 1.4px);background-size:8px 8px'
};
const plumF=(x,y,s,c)=>{let g='';for(let i=0;i<5;i++){const a=i*72*Math.PI/180;g+=`<circle cx="${(x+Math.sin(a)*6*s).toFixed(1)}" cy="${(y-Math.cos(a)*6*s).toFixed(1)}" r="${(5*s).toFixed(1)}" fill="${c}"/>`}return g+`<circle cx="${x}" cy="${y}" r="${2.2*s}" fill="#c9963a"/>`};
const leafP=(x,y,a,l,w)=>`<path transform="translate(${x} ${y}) rotate(${a})" d="M0 0 Q${l*.45} ${-w} ${l} 0 Q${l*.45} ${w*.6} 0 0Z"/>`;
const FLOWERS={
  none:{name:'无',svg:'',pos:''},
  plum:{name:'梅',pos:'left:calc(var(--u)*5);bottom:calc(var(--u)*5);width:calc(var(--u)*56)',
    svg:`<svg viewBox="0 0 300 260" opacity=".42"><path d="M0 252 Q60 232 100 182 Q132 142 190 122 Q232 106 284 58 M100 182 Q124 204 166 208 M190 122 Q198 92 232 74 M140 152 Q120 120 132 92" stroke="#5a4636" stroke-width="5" fill="none" stroke-linecap="round"/>${plumF(284,58,1.1,'#e8a6a0')}${plumF(232,74,.9,'#eeb8b2')}${plumF(166,208,1,'#e8a6a0')}${plumF(190,122,.8,'#eeb8b2')}${plumF(132,92,.9,'#e8a6a0')}${plumF(64,226,.8,'#eeb8b2')}<circle cx="258" cy="92" r="4" fill="#d98c86"/><circle cx="210" cy="104" r="3.5" fill="#d98c86"/><circle cx="118" cy="162" r="3.5" fill="#d98c86"/></svg>`},
  bamboo:{name:'竹',pos:'right:calc(var(--u)*5);top:calc(var(--u)*5);width:calc(var(--u)*30)',
    svg:`<svg viewBox="0 0 200 640" opacity=".34"><g stroke="#6f8a6a" stroke-linecap="round" fill="none"><path d="M128 640 L122 0" stroke-width="11"/><path d="M168 640 L176 150" stroke-width="7"/></g><g stroke="#5d7758" stroke-width="3">${[90,210,330,450,570].map(y=>`<path d="M114 ${y} q8 -6 16 0"/>`).join('')}${[260,380,500].map(y=>`<path d="M170 ${y} q6 -4 12 0"/>`).join('')}</g><g fill="#7f9b78">${leafP(122,90,200,96,14)}${leafP(122,92,215,80,12)}${leafP(122,210,160,104,15)}${leafP(122,212,176,86,12)}${leafP(124,330,205,90,13)}${leafP(176,150,250,70,11)}${leafP(176,152,280,84,12)}${leafP(178,260,170,74,11)}</g></svg>`},
  lotus:{name:'荷',pos:'right:calc(var(--u)*4);bottom:calc(var(--u)*4);width:calc(var(--u)*58)',
    svg:`<svg viewBox="0 0 320 300" opacity=".38"><path d="M210 300 Q205 230 190 168" stroke="#7d9677" stroke-width="5" fill="none"/><path d="M120 300 Q118 200 96 96" stroke="#7d9677" stroke-width="4" fill="none"/><g transform="rotate(-10 190 150)"><ellipse cx="190" cy="150" rx="120" ry="44" fill="#9db69a"/><g stroke="#e9f0e4" stroke-width="2.4" opacity=".8">${[-150,-110,-70,-30,10,50,90,130].map(d=>`<path d="M190 150 L${(190+Math.cos(d*Math.PI/180)*118).toFixed(0)} ${(150+Math.sin(d*Math.PI/180)*42).toFixed(0)}"/>`).join('')}</g></g><path d="M96 96 C76 70 84 40 100 26 C116 40 120 72 96 96Z" fill="#eab3b0"/><path d="M96 96 C86 78 92 52 100 40" stroke="#d58f8b" stroke-width="2" fill="none"/></svg>`},
  orchid:{name:'兰',pos:'left:calc(var(--u)*4);bottom:calc(var(--u)*4);width:calc(var(--u)*58)',
    svg:`<svg viewBox="0 0 320 280" opacity=".4"><g stroke="#6d8a6e" stroke-linecap="round" fill="none"><path d="M40 280 Q90 120 300 60" stroke-width="4"/><path d="M50 280 Q60 150 160 40" stroke-width="3.4"/><path d="M60 280 Q130 190 250 170" stroke-width="3.6"/><path d="M34 280 Q20 200 70 120" stroke-width="3"/><path d="M70 280 Q120 240 200 238" stroke-width="3"/><path d="M110 270 Q130 210 150 170" stroke-width="2" stroke="#8aa38a"/></g><g fill="#d7c48e"><path d="M150 168 q-16 -14 -26 -2 q14 8 26 2Z"/><path d="M150 168 q4 -22 18 -20 q-4 16 -18 20Z"/><path d="M150 168 q18 -2 22 12 q-14 2 -22 -12Z"/></g><circle cx="150" cy="168" r="3" fill="#b23a2b"/></svg>`},
  shan:{name:'远山',pos:'left:calc(var(--u)*4);bottom:calc(var(--u)*4);width:calc(var(--u)*92)',
    svg:`<svg viewBox="0 0 1000 300" opacity=".5"><path d="M0 170 Q120 90 220 140 T430 110 T640 150 T830 100 T1000 140 V300 H0Z" fill="#9aa6a6" opacity=".35"/><path d="M0 210 Q140 150 260 196 T520 180 T760 200 T1000 176 V300 H0Z" fill="#7d8b8a" opacity=".42"/><path d="M0 250 Q160 220 320 246 T640 236 T1000 250 V300 H0Z" fill="#66736f" opacity=".45"/><path d="M700 232 q20 8 40 0" stroke="#4d5653" stroke-width="3" fill="none"/><path d="M712 230 l8 -16 l6 16" fill="#4d5653"/></svg>`},
  cloud:{name:'云纹',pos:'',
    svg:`<svg viewBox="0 0 220 120" style="right:calc(var(--u)*6);top:calc(var(--u)*16);width:calc(var(--u)*30)" opacity=".4"><path d="M30 92 q-24 0 -20 -22 q4 -18 26 -14 q4 -28 36 -24 q16 -26 48 -10 q24 -10 38 12 q26 0 26 24 q0 20 -24 20 z" fill="none" stroke="#7f8fae" stroke-width="5" stroke-linejoin="round"/><path d="M64 76 q10 -15 24 -5 q8 8 -2 15 M112 70 q12 -13 24 -2 q7 8 -3 14" fill="none" stroke="#7f8fae" stroke-width="4.4" stroke-linecap="round"/></svg><svg viewBox="0 0 220 120" style="left:calc(var(--u)*6);bottom:calc(var(--u)*14);width:calc(var(--u)*24);transform:scaleX(-1)" opacity=".4"><path d="M30 92 q-24 0 -20 -22 q4 -18 26 -14 q4 -28 36 -24 q16 -26 48 -10 q24 -10 38 12 q26 0 26 24 q0 20 -24 20 z" fill="none" stroke="#7f8fae" stroke-width="5" stroke-linejoin="round"/><path d="M64 76 q10 -15 24 -5 q8 8 -2 15 M112 70 q12 -13 24 -2 q7 8 -3 14" fill="none" stroke="#7f8fae" stroke-width="4.4" stroke-linecap="round"/></svg>`}
};

/* ───────── 贴纸：花木、器物、鸟兽、风物（全部原创矢量） ───────── */
const plum=(x,y,s)=>{let g='';for(let i=0;i<5;i++){const a=i*72*Math.PI/180;g+=`<circle cx="${x+Math.sin(a)*5*s}" cy="${y-Math.cos(a)*5*s}" r="${4.2*s}" fill="#f1b9b4"/>`}return g+`<circle cx="${x}" cy="${y}" r="${2*s}" fill="#d8a23c"/>`};
const STICKERS={
  ginkgo:{name:'银杏',svg:`<svg viewBox="0 0 100 100"><path d="M50 92 L50 62" stroke="#8a6a2a" stroke-width="3" stroke-linecap="round"/><path d="M50 64 C20 62 8 32 16 18 C30 24 40 12 50 28 C60 12 70 24 84 18 C92 32 80 62 50 64Z" fill="#e2b33c" stroke="#a37a1c" stroke-width="2"/><path d="M50 62 L30 26 M50 62 L42 22 M50 62 L58 22 M50 62 L70 26" stroke="#c39424" stroke-width="1.2" fill="none"/></svg>`},
  maple:{name:'枫叶',svg:`<svg viewBox="0 0 100 100"><path d="M50 6 L58 28 L76 16 L71 38 L93 38 L75 53 L85 72 L62 66 L56 86 L50 70 L44 86 L38 66 L15 72 L25 53 L7 38 L29 38 L24 16 L42 28Z" fill="#d6582f" stroke="#a63b1c" stroke-width="2" stroke-linejoin="round"/><path d="M50 70 L50 97 M50 64 L50 18 M50 50 L28 34 M50 50 L72 34 M50 60 L30 64 M50 60 L70 64" stroke="#a63b1c" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`},
  ju:{name:'菊',svg:`<svg viewBox="0 0 100 100">${Array.from({length:16},(_,i)=>`<ellipse cx="50" cy="28" rx="6.5" ry="21" fill="#e8b93a" stroke="#c99a22" stroke-width="1" transform="rotate(${i*22.5} 50 50)"/>`).join('')}${Array.from({length:10},(_,i)=>`<ellipse cx="50" cy="38" rx="5" ry="12" fill="#f2cf5e" transform="rotate(${i*36+18} 50 50)"/>`).join('')}<circle cx="50" cy="50" r="8" fill="#c58a1c"/></svg>`},
  plum:{name:'梅枝',svg:`<svg viewBox="0 0 120 90"><path d="M6 80 Q40 70 58 46 Q70 30 104 18 M58 46 Q76 50 92 66 M36 70 Q34 54 24 44" stroke="#4a3426" stroke-width="3.2" fill="none" stroke-linecap="round"/>${plum(100,18,1)}${plum(80,32,.9)}${plum(92,64,1)}${plum(26,44,.9)}${plum(56,48,.8)}</svg>`},
  persimmon:{name:'柿柿如意',svg:`<svg viewBox="0 0 100 100"><circle cx="50" cy="58" r="30" fill="#e2772e"/><ellipse cx="40" cy="48" rx="8" ry="5" fill="#f3a35e" opacity=".7"/><path d="M50 32 L38 26 L46 34 L34 38 L48 38 L50 46 L52 38 L66 38 L54 34 L62 26Z" fill="#5c7a3a"/><path d="M50 30 q2 -8 7 -10" stroke="#5a4020" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`},
  tea:{name:'一盏茶',svg:`<svg viewBox="0 0 100 90"><path d="M18 40 h60 q-2 30 -30 34 q-28 -4 -30 -34z" fill="#eef3ef" stroke="#4d6b5c" stroke-width="3"/><path d="M78 46 q14 0 12 12 q-2 10 -16 8" fill="none" stroke="#4d6b5c" stroke-width="3"/><ellipse cx="48" cy="40" rx="30" ry="5" fill="#c9b37a" stroke="#4d6b5c" stroke-width="2"/><path d="M36 30 q-6 -8 2 -16 M50 30 q-6 -8 2 -16 M62 30 q-6 -8 2 -16" fill="none" stroke="#9aa9a0" stroke-width="2.4" stroke-linecap="round"/><path d="M12 80 h70" stroke="#4d6b5c" stroke-width="3" stroke-linecap="round"/></svg>`},
  tuanshan:{name:'团扇',svg:`<svg viewBox="0 0 100 124"><circle cx="50" cy="46" r="40" fill="#f5ecd8" stroke="#8a6a3a" stroke-width="3"/><path d="M24 64 Q40 52 52 38 Q60 28 74 24 M52 38 Q60 44 66 56" stroke="#5a4636" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="74" cy="24" r="4" fill="#e8a6a0"/><circle cx="66" cy="56" r="3.6" fill="#e8a6a0"/><circle cx="44" cy="46" r="3" fill="#e8a6a0"/><rect x="47" y="86" width="6" height="28" rx="2" fill="#7a5230"/><path d="M50 114 v8 M47 122 h6" stroke="#b23a2b" stroke-width="2.4" stroke-linecap="round"/></svg>`},
  zheshan:{name:'折扇',svg:`<svg viewBox="0 0 120 84"><path d="M60 78 L8 32 A72 72 0 0 1 112 32 Z" fill="#f1e2c4" stroke="#8a6a3a" stroke-width="2.4" stroke-linejoin="round"/><path d="M60 78 L26 38 A50 50 0 0 1 94 38 Z" fill="#e7d3ad" opacity=".5"/>${[-60,-45,-30,-15,0,15,30,45,60].map(a=>`<path d="M60 78 L${(60+Math.sin(a*Math.PI/180)*70).toFixed(1)} ${(78-Math.cos(a*Math.PI/180)*70+6).toFixed(1)}" stroke="#a0845a" stroke-width="1"/>`).join('')}<path d="M30 26 Q48 14 62 22 Q76 12 92 24" stroke="#6f8a6a" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="60" cy="78" r="3.5" fill="#5a4636"/></svg>`},
  san:{name:'油纸伞',svg:`<svg viewBox="0 0 100 112"><path d="M8 50 Q50 -2 92 50 Q81 43 71 50 Q60 43 50 50 Q40 43 29 50 Q19 43 8 50Z" fill="#c8432f" stroke="#8f2a1c" stroke-width="2" stroke-linejoin="round"/><path d="M50 10 L29 50 M50 10 L71 50 M50 10 L50 50 M50 10 L10 49 M50 10 L90 49" stroke="#e98c76" stroke-width="1.2" opacity=".8"/><path d="M50 50 V100 q0 8 -8 8 q-6 0 -6 -6" stroke="#6b4a2a" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="50" cy="9" r="3" fill="#6b4a2a"/></svg>`},
  lantern:{name:'灯笼',svg:`<svg viewBox="0 0 80 110"><path d="M40 4 v10" stroke="#5a4020" stroke-width="2"/><rect x="26" y="14" width="28" height="8" rx="2" fill="#c9a24a"/><ellipse cx="40" cy="50" rx="30" ry="30" fill="#c8392b"/><path d="M40 20 Q22 50 40 80 M40 20 Q58 50 40 80 M40 20 v60" stroke="#9e2a20" stroke-width="1.5" fill="none"/><text x="40" y="58" text-anchor="middle" font-size="22" fill="#f4d68a" font-family="WenKai Embed, LXGW WenKai, KaiTi, serif">福</text><rect x="26" y="78" width="28" height="8" rx="2" fill="#c9a24a"/><path d="M34 86 v18 M40 86 v20 M46 86 v18" stroke="#c9a24a" stroke-width="2"/></svg>`},
  hulu:{name:'葫芦',svg:`<svg viewBox="0 0 80 112"><path d="M40 6 v10" stroke="#5a4020" stroke-width="3" stroke-linecap="round"/><path d="M40 10 q12 -8 20 2 q-10 8 -20 -2Z" fill="#6f8a4a"/><circle cx="40" cy="36" r="16" fill="#d9a441"/><circle cx="40" cy="78" r="27" fill="#d9a441"/><ellipse cx="32" cy="72" rx="7" ry="10" fill="#ecc46a" opacity=".7"/><path d="M28 52 q12 6 24 0" stroke="#b23a2b" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M40 54 l-5 12 M40 54 l5 12" stroke="#b23a2b" stroke-width="2" stroke-linecap="round"/></svg>`},
  maobi:{name:'毛笔',svg:`<svg viewBox="0 0 120 40"><path d="M24 14 Q6 18 1 20 Q6 22 24 26Z" fill="#2a2420"/><path d="M24 14 Q30 16 30 20 Q30 24 24 26Z" fill="#4a3a30"/><rect x="30" y="16.5" width="78" height="7" rx="2" fill="#8a5a32"/><rect x="30" y="16.5" width="10" height="7" fill="#c9a24a"/><rect x="104" y="15.5" width="10" height="9" rx="2" fill="#2a2420"/><path d="M114 20 h4" stroke="#b23a2b" stroke-width="2.4" stroke-linecap="round"/></svg>`},
  koi:{name:'锦鲤',svg:`<svg viewBox="0 0 120 70"><path d="M16 35 L2 18 L7 35 L2 52Z" fill="#e2662c"/><path d="M12 35 Q30 10 70 17 Q96 23 107 35 Q96 47 70 53 Q30 60 12 35Z" fill="#faf5ec" stroke="#c9b9a2" stroke-width="1.4"/><ellipse cx="58" cy="28" rx="16" ry="8" fill="#e2662c"/><ellipse cx="84" cy="38" rx="9" ry="6" fill="#e2662c"/><ellipse cx="34" cy="38" rx="8" ry="5" fill="#2a2420" opacity=".75"/><path d="M60 50 q-6 10 -16 12 q8 -8 6 -14Z" fill="#e2662c" opacity=".85"/><path d="M60 19 q-4 -10 -14 -12 q6 8 4 13Z" fill="#e2662c" opacity=".85"/><circle cx="97" cy="32" r="2.4" fill="#2a2420"/><path d="M106 38 q6 2 10 8 M104 40 q4 4 4 10" stroke="#c9b9a2" stroke-width="1.2" fill="none"/></svg>`},
  crane:{name:'仙鹤',svg:`<svg viewBox="0 0 120 112"><path d="M58 70 L56 108 M66 70 L70 108" stroke="#4a4440" stroke-width="2.6" stroke-linecap="round"/><path d="M28 60 Q40 44 66 46 Q84 48 86 58 Q78 74 54 74 Q36 72 28 60Z" fill="#fbf8f2" stroke="#b8b0a4" stroke-width="1.4"/><path d="M28 60 Q16 64 8 76 Q22 72 34 68Z" fill="#2a2420"/><path d="M30 58 Q20 56 14 62 Q24 62 34 64Z" fill="#2a2420"/><path d="M82 52 Q90 34 86 22 Q84 14 90 10" stroke="#2a2420" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="92" cy="10" r="5.5" fill="#fbf8f2" stroke="#b8b0a4" stroke-width="1"/><circle cx="92" cy="6.5" r="3" fill="#c8392b"/><path d="M96 11 L114 16" stroke="#7a6a4a" stroke-width="2.4" stroke-linecap="round"/></svg>`},
  yan:{name:'燕子',svg:`<svg viewBox="0 0 120 72"><path d="M60 34 Q32 8 4 16 Q32 24 50 42Z" fill="#2b2e3a"/><path d="M60 34 Q88 8 116 16 Q88 24 70 42Z" fill="#2b2e3a"/><path d="M55 46 L46 70 L60 52 L74 70 L65 46Z" fill="#2b2e3a"/><ellipse cx="60" cy="40" rx="10" ry="8" fill="#2b2e3a"/><ellipse cx="60" cy="44" rx="6" ry="5" fill="#f4efe6"/><circle cx="60" cy="33" r="3.4" fill="#c8392b"/></svg>`},
  cat:{name:'狸奴',svg:`<svg viewBox="0 0 100 100"><path d="M74 84 Q96 84 92 64 Q90 56 84 60" stroke="#c98a4a" stroke-width="6" fill="none" stroke-linecap="round"/><ellipse cx="50" cy="70" rx="26" ry="22" fill="#f5e8d2" stroke="#6b5a4a" stroke-width="2"/><path d="M30 26 L34 10 L44 22 M70 26 L66 10 L56 22" fill="#f5e8d2" stroke="#6b5a4a" stroke-width="2" stroke-linejoin="round"/><circle cx="50" cy="38" r="21" fill="#f5e8d2" stroke="#6b5a4a" stroke-width="2"/><path d="M36 24 q6 -6 12 0 q-6 6 -12 0Z" fill="#d79a5a"/><path d="M40 40 q3 -3 6 0 M54 40 q3 -3 6 0" stroke="#2a2420" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M48 46 l2 2 l2 -2Z" fill="#d77a80"/><path d="M50 48 q-3 4 -7 2 M50 48 q3 4 7 2" stroke="#6b5a4a" stroke-width="1.4" fill="none"/><ellipse cx="40" cy="90" rx="7" ry="4" fill="#f5e8d2" stroke="#6b5a4a" stroke-width="1.6"/><ellipse cx="60" cy="90" rx="7" ry="4" fill="#f5e8d2" stroke="#6b5a4a" stroke-width="1.6"/></svg>`},
  cloud:{name:'祥云',svg:`<svg viewBox="0 0 120 70"><path d="M18 54 q-14 0 -12 -13 q2 -10 15 -8 q2 -17 21 -14 q10 -16 29 -6 q15 -6 23 7 q16 0 16 15 q0 11 -14 11 z" fill="#f8f2e4" stroke="#3b4a6b" stroke-width="3" stroke-linejoin="round"/><path d="M38 44 q6 -9 14 -3 q5 5 -1 9 M66 40 q7 -8 14 -1 q4 5 -2 8" fill="none" stroke="#3b4a6b" stroke-width="2.6" stroke-linecap="round"/></svg>`},
  moon:{name:'月',svg:`<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="#f3e3b0"/><circle cx="40" cy="44" r="5" fill="#e6d08f"/><circle cx="58" cy="62" r="7" fill="#e6d08f"/><circle cx="62" cy="38" r="3.5" fill="#e6d08f"/><path d="M8 78 q20 -8 36 0 t36 0" fill="none" stroke="#9aa6b8" stroke-width="3" stroke-linecap="round"/></svg>`},
  boat:{name:'乌篷船',svg:`<svg viewBox="0 0 120 70"><path d="M8 40 Q60 62 112 40 L102 46 Q60 60 18 46Z" fill="#2c2a28"/><path d="M38 41 Q58 16 82 41Z" fill="#3a3632"/><path d="M12 58 h20 M44 62 h30 M86 58 h20" stroke="#4f6b8a" stroke-width="2" stroke-linecap="round" opacity=".6"/></svg>`},
  wall:{name:'马头墙',svg:`<svg viewBox="0 0 120 80"><path d="M6 74 V44 h14 V34 h16 V22 h48 V34 h16 V44 h14 V74Z" fill="#f4f1ea" stroke="#2c2a28" stroke-width="2"/><path d="M2 44 h22 M16 34 h24 M32 22 h56 M80 34 h24 M96 44 h22" stroke="#2c2a28" stroke-width="5" stroke-linecap="round"/><rect x="52" y="50" width="16" height="24" fill="#2c2a28"/><rect x="24" y="52" width="8" height="8" fill="#2c2a28" opacity=".7"/><rect x="88" y="52" width="8" height="8" fill="#2c2a28" opacity=".7"/></svg>`},
  /* 旧版贴纸，保留以便老数据还能显示 */
  an:{name:'印 · 安',svg:`<svg viewBox="0 0 100 100"><rect x="8" y="8" width="84" height="84" rx="6" fill="#b23a2b"/><text x="50" y="70" text-anchor="middle" font-size="56" fill="#f6e9dc" font-family="WenKai Embed, LXGW WenKai, KaiTi, serif">安</text></svg>`},
  xi:{name:'印 · 喜',svg:`<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="10" fill="none" stroke="#b23a2b" stroke-width="5"/><text x="50" y="69" text-anchor="middle" font-size="54" fill="#b23a2b" font-family="WenKai Embed, LXGW WenKai, KaiTi, serif">喜</text></svg>`}
};
const NOTE_C={xiang:{n:'缃黄',c:'#f4e4a8'},ou:{n:'藕粉',c:'#f3d9db'},zhu:{n:'竹青',c:'#dce9d1'},yue:{n:'月白',c:'#dfe8f0'},su:{n:'素纸',c:'#f8f4ea'}};
const NOTE_TPL={blank:{n:'空白',t:''},todo:{n:'待办',t:'□ \n□ \n□ '},remind:{n:'提醒',t:'记得：'}};
const STK_GROUPS=[['花木',['ginkgo','maple','ju','plum','persimmon']],['器物',['tea','tuanshan','zheshan','san','lantern','hulu','maobi']],['鸟兽',['koi','crane','yan','cat']],['风物',['cloud','moon','boat','wall']]];

/* 颜文字、小符、古字 */
const KAO=[['作揖','(｡-人-｡)'],['叩首','m(_ _)m'],['掩袖','(*/ω＼*)'],['捧茶','(っ´ω`)っ旦'],['举杯','(^_^)/□☆□\\(^_^)'],['望月','( ˘ω˘ )☾'],
  ['困倦','(´-ω-`)zZ'],['欢喜','٩(๑❛ᴗ❛๑)۶'],['嗔怒','(｀へ´)'],['垂泪','(｡•́︿•̀｡)'],['拜服','<(＿　＿)>'],['花间','(✿◡‿◡)'],
  ['撒花','ヾ(✿ﾟ▽ﾟ)ノ'],['偷看','|ω･)'],['发呆','(・_・)'],['得意','( •̀ ω •́ )✧']];
const FU=['❀','✿','☾','☁','✧','♨','✉','〆','※','◎','々','〇'];
const GU=[['囧','窘'],['槑','呆'],['烎','得意'],['嫑','不要'],['兲','天'],['巭','功夫'],['嘦','只要'],['孬','不好']];

/* 印章：方、圆、长；白文（红底）或朱文（红字） */
const SEAL_W={fang:10,yuan:9.5,chang:6};
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
const SEAL_PRESETS=()=>[
  {txt:book.name,shape:'fang',mode:'bai',label:'名章'},{txt:book.motto,shape:'fang',mode:'zhu',label:'闲章'},
  {txt:'知道了',shape:'chang',mode:'zhu',label:'朱批'},{txt:'已阅',shape:'yuan',mode:'zhu',label:'已阅'},
  {txt:'准',shape:'fang',mode:'bai',label:'准'},{txt:'善',shape:'yuan',mode:'bai',label:'善'},
  {txt:'甚好',shape:'fang',mode:'zhu',label:'甚好'},{txt:'平安',shape:'chang',mode:'bai',label:'平安'},
  {txt:'如意',shape:'yuan',mode:'zhu',label:'如意'},{txt:'长乐未央',shape:'fang',mode:'bai',label:'长乐未央'},
  {txt:'一日一善',shape:'fang',mode:'zhu',label:'一日一善'},{txt:'勿忘',shape:'chang',mode:'zhu',label:'勿忘'},
  {txt:'宜',shape:'fang',mode:'bai',label:'宜'},{txt:'忌',shape:'fang',mode:'zhu',label:'忌'},
  {txt:'喜',shape:'yuan',mode:'bai',label:'喜'},{txt:'到此一游',shape:'chang',mode:'zhu',label:'到此一游'}
];

/* ───────── 天时：天气、气温、风，外加节气与月相 ───────── */
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
const JIEQI=[[1,5,'小寒'],[1,20,'大寒'],[2,4,'立春'],[2,19,'雨水'],[3,5,'惊蛰'],[3,20,'春分'],[4,4,'清明'],[4,20,'谷雨'],[5,5,'立夏'],[5,21,'小满'],[6,5,'芒种'],[6,21,'夏至'],[7,7,'小暑'],[7,22,'大暑'],[8,7,'立秋'],[8,23,'处暑'],[9,7,'白露'],[9,23,'秋分'],[10,8,'寒露'],[10,23,'霜降'],[11,7,'立冬'],[11,22,'小雪'],[12,7,'大雪'],[12,21,'冬至']];
function ymdToday(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function parseYmd(s){const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(s||'');return m?[+m[1],+m[2],+m[3]]:null}
function jieqiOf(ymd){const v=parseYmd(ymd);if(!v)return '';const [y,m,d]=v,day=new Date(y,m-1,d);let last={t:new Date(y-1,11,21),n:'冬至'};
  JIEQI.forEach(([jm,jd,n])=>{const t=new Date(y,jm-1,jd);if(t<=day)last={t,n}});const diff=Math.round((day-last.t)/864e5);return diff?`${last.n}后${cnNum(diff)}日`:`今日${last.n}`}
function moonOf(ymd){const v=parseYmd(ymd);if(!v)return '';const jd=Date.UTC(v[0],v[1]-1,v[2],12)/864e5+2440587.5;let a=((jd-2451550.1)/29.530588853)%1;if(a<0)a+=1;const d=a*29.53;
  return d<1.5?'朔':d<6.4?'蛾眉月':d<8.9?'上弦月':d<13.8?'月渐盈':d<15.8?'望月':d<20.7?'月渐亏':d<23.1?'下弦月':d<28?'残月':'晦'}
const cnT=n=>{n=Math.round(+n);return n<0?'零下'+cnNum(-n):cnNum(n)};
const hasN=v=>v!==''&&v!=null&&!isNaN(+v);
function weatherLine(pg){
  const w=pg.weather||{},parts=[];
  if(w.type&&WX[w.type])parts.push(WX[w.type].n);
  if(hasN(w.lo)&&hasN(w.hi))parts.push(`${cnT(w.lo)}至${cnT(w.hi)}度`);else if(hasN(w.lo)||hasN(w.hi))parts.push(`${cnT(hasN(w.lo)?w.lo:w.hi)}度`);
  if(w.wind)parts.push(w.wind);
  if(w.jq!==false&&pg.ymd)parts.push(jieqiOf(pg.ymd));
  if(w.moon&&pg.ymd)parts.push(moonOf(pg.ymd));
  return parts;
}
function renderWeather(){
  const pg=P(),w=pg.weather||{},parts=weatherLine(pg),el=$('#tianshi');
  const any=w.type||hasN(w.lo)||hasN(w.hi)||w.wind;
  el.classList.toggle('empty',!any&&!parts.length);
  el.innerHTML=parts.length?(w.type&&WX[w.type]?wxSvg(w.type):'')+`<span>${esc(parts.join(' · '))}</span>`:'＋ 天时';
}

/* ───────── 新笺与样张 ───────── */
function todayStr(){const d=new Date();return `${cnNum(d.getMonth()+1)}月${cnNum(d.getDate())}日`}
const WDEF=()=>({type:'',lo:'',hi:'',wind:'',jq:true,moon:false});
function blankPage(from){return{id:uid(),paper:from?from.paper:'xuan',rule:from?from.rule:'hline',dir:from?from.dir:'h',flower:'none',seal:false,ymd:ymdToday(),weather:WDEF(),texts:{date:todayStr()},strokes:[],stickers:[]}}
function plumSample(){const p=[];for(let i=0;i<=40;i++){const t=i/40;p.push(+(560+t*330).toFixed(1),+(830-t*190-Math.sin(t*Math.PI)*60).toFixed(1),13)}return {b:'plum',c:'yanzhi',p}}
function samples(){return[
  {id:uid(),paper:'xuan',rule:'zhusi',dir:'v',flower:'plum',seal:true,ymd:'2026-10-18',weather:{type:'yu1',lo:12,hi:15,wind:'微风',jq:true,moon:true},strokes:[],
    stickers:[{id:uid(),t:'seal',seal:{txt:'知道了',shape:'chang',mode:'zhu'},x:21,y:24,r:-4,s:1},
      {id:uid(),t:'note',note:{txt:'寄信前，\n记得夹一小包桂花。',c:'ou'},x:27,y:50,r:-4,s:1}],
    texts:{title:'寄远',date:'十月十八日',text:'见字如面。\n入秋以来，院里的桂花开了两回。第一回没赶上，第二回赶上了，香得人走不动路。\n近来不大忙，每天写一页字，写到第七页，才觉得手顺了些。\n你那边天凉了没有？记得添衣。\n灯下'}},
  {id:uid(),paper:'yuebai',rule:'hline',dir:'h',flower:'shan',seal:false,ymd:'2026-10-17',weather:{type:'qing',lo:14,hi:22,wind:'',jq:true,moon:false},
    strokes:[plumSample()],
    stickers:[{id:uid(),t:'tea',x:80,y:68,r:-6,s:1},{id:uid(),t:'word',word:{txt:'(っ´ω`)っ旦',c:'ink',fs:3.6},x:60,y:76,r:-3,s:1}],
    texts:{title:'三件小事',date:'十月十七日',text:'一、换了新的墨水，颜色比想象中深一点。\n二、楼下的银杏黄了一半。\n三、给自己泡了一壶陈皮白茶，喝到第三泡才出味。'}}
]}
function migrate(){const old=store.get(OLD,null);if(!old||!old.pages)return null;
  old.pages.forEach(p=>{p.weather=p.weather||WDEF();p.ymd=p.ymd||'';(p.strokes||[]).forEach(s=>{s.b=s.b||'pen'})});return old}
const book=store.get(KEY,null)||migrate()||{name:'青禾',motto:'素心',cur:0,pages:samples()};
if(!book.pages||!book.pages.length)book.pages=samples();
book.pages.forEach(p=>{p.weather=p.weather||WDEF();p.stickers=p.stickers||[];p.strokes=p.strokes||[]});
book.cur=Math.max(0,Math.min(book.cur||0,book.pages.length-1));
const P=()=>book.pages[book.cur];
function save(){if(!store.set(KEY,book))toast('这台设备存不下了，最近的改动没存上');}

/* ───────── 渲染一笺 ───────── */
function dirOf(pg){const r=RULES.find(r=>r.id===pg.rule);return r&&r.dir||pg.dir||'h'}
function applyLook(){
  const pg=P();document.documentElement.dataset.paper=pg.paper;
  page.className=page.className.replace(/\b(r-|d-)\S+/g,'').trim();
  page.classList.add('r-'+pg.rule,'d-'+dirOf(pg));page.classList.toggle('has-seal',!!pg.seal);
  const f=FLOWERS[pg.flower]||FLOWERS.none;$('#flower').innerHTML=f.svg?(f.pos?f.svg.replace('<svg',`<svg style="${f.pos}"`):f.svg):'';
}
function renderTexts(){$$('[contenteditable][data-key]').forEach(el=>{el.textContent=P().texts[el.dataset.key]||''})}
let fullWarned=false;
$$('[contenteditable][data-key]').forEach(el=>{
  el.addEventListener('input',()=>{
    const v=el.innerText;if(!v.trim())el.innerHTML='';P().texts[el.dataset.key]=v.trim()?v:'';save();
    if(el.id==='txt'){const full=el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2;if(full&&!fullWarned){fullWarned=true;toast('这一笺写满了，点「＋ 新笺」接着写')}if(!full)fullWarned=false}
  });
  el.addEventListener('paste',e=>{e.preventDefault();document.execCommand('insertText',false,(e.clipboardData||window.clipboardData).getData('text'))});
});
/* 记住光标位置，好把颜文字插到写字的地方 */
let lastSel=null;
document.addEventListener('selectionchange',()=>{const s=getSelection();if(!s||!s.rangeCount)return;const n=s.anchorNode,el=n&&(n.nodeType===1?n:n.parentElement);
  const ce=el&&el.closest&&el.closest('#page [contenteditable="true"]');if(ce)lastSel={el:ce,range:s.getRangeAt(0).cloneRange()}});
function insertText(t){
  setMode('text');const el=lastSel&&document.contains(lastSel.el)?lastSel.el:$('#txt');el.focus();
  const s=getSelection();s.removeAllRanges();
  if(lastSel&&lastSel.el===el&&el.contains(lastSel.range.startContainer))s.addRange(lastSel.range);
  else{const r=document.createRange();r.selectNodeContents(el);r.collapse(false);s.addRange(r)}
  document.execCommand('insertText',false,t);
}
function renderPager(){const n=book.pages.length,i=book.cur;$('#pgNo').textContent=`第${cnNum(i+1)}笺 / 共${cnNum(n)}笺`;$('#pgPrev').disabled=i===0;$('#pgNext').disabled=i===n-1;$('#yeshu').textContent='其 '+[...cnNum(i+1)].join(' ')}

/* 落款印 */
function sealChars(name){name=(name||'').trim()||'无名';if(/^[\x00-\x7F]+$/.test(name))return {long:name.toUpperCase()};const c=[...name];
  if(c.length===1)return {cols:[[c[0]],['印']]};if(c.length===2)return {cols:[[c[0],c[1]],['之','印']]};if(c.length===3)return {cols:[[c[0],c[1]],[c[2],'印']]};return {cols:[[c[0],c[1]],[c[2],c[3]]]}}
function sealSVG(text,mode,cls){
  const s=sealChars(text),fz=mode==='zhu'?24:26,red='var(--zhu)',pap='var(--paper)';
  if(s.long)return `<svg class="${cls||''}" viewBox="0 0 76 76"><rect x="3" y="20" width="70" height="36" rx="3" style="fill:${red}"/><text x="38" y="44" text-anchor="middle" font-size="${Math.min(18,120/s.long.length)}" style="fill:${pap}">${esc(s.long)}</text></svg>`;
  let t='';s.cols.forEach((col,ci)=>{const x=ci===0?54:22;col.forEach((ch,ri)=>{const y=col.length===1?52:(ri===0?35:65);t+=`<text x="${x}" y="${y}" text-anchor="middle" font-size="${col.length===1?fz*1.5:fz}" style="fill:${mode==='zhu'?red:pap};font-family:var(--cn)">${esc(ch)}</text>`})});
  const box=mode==='zhu'?`<rect x="4" y="4" width="68" height="68" rx="8" style="fill:none;stroke:${red}" stroke-width="3.5"/>`:`<rect x="3" y="3" width="70" height="70" rx="3" style="fill:${red}"/>`;
  return `<svg class="${cls||''}" viewBox="0 0 76 76" style="transform:rotate(${mode==='zhu'?-3:2}deg);opacity:.92">${box}${t}</svg>`;
}
function renderSeal(){$('#sealName').innerHTML=sealSVG(book.name,'bai');$('#sealMotto').innerHTML=sealSVG(book.motto,'zhu','m');$('#who').textContent=`${book.name} 书`}

/* ───────── 贴纸、印、字贴 ───────── */
let selId=null,pendingSeal=null;
const WORD_COL={ink:'var(--ink)',zhu:'var(--zhu)',dian:'var(--pen-dian)'};
function place(d,st){d.style.left=st.x+'%';d.style.top=st.y+'%';d.style.transform=`translate(-50%,-50%) rotate(${st.r}deg) scale(${st.s})`}
function stickerEl(st){
  const d=document.createElement('div');d.className='sticker'+(st.id===selId?' sel':'');d.dataset.id=st.id;
  if(st.t==='seal'){d.classList.add('seal');d.style.width='calc(var(--u)*'+(SEAL_W[st.seal.shape]||10)+')';d.innerHTML=sealShape(st.seal.txt,st.seal.shape,st.seal.mode)}
  else if(st.t==='note'){d.classList.add('note');d.style.setProperty('--nc',(NOTE_C[st.note.c]||NOTE_C.xiang).c);
    d.innerHTML='<div class="note-paper"><div class="note-tape"></div><div class="ntxt" contenteditable="true" data-ph="写点什么…"></div></div>';
    const tx=d.querySelector('.ntxt');tx.textContent=st.note.txt||'';
    tx.addEventListener('input',()=>{const v=tx.innerText;if(!v.trim())tx.innerHTML='';st.note.txt=v.trim()?v:'';save();placeTools()});
    tx.addEventListener('paste',e=>{e.preventDefault();document.execCommand('insertText',false,(e.clipboardData||window.clipboardData).getData('text'))});}
  else if(st.t==='word'){d.classList.add('word');d.style.fontSize='calc(var(--u)*'+(st.word.fs||3.6)+')';d.style.color=WORD_COL[st.word.c]||WORD_COL.ink;d.textContent=st.word.txt}
  else if(STICKERS[st.t])d.innerHTML=STICKERS[st.t].svg;else return null;
  return d;
}
function renderStickers(){
  const L=$('#stkLayer');L.innerHTML='';
  P().stickers.forEach(st=>{const d=stickerEl(st);if(!d)return;place(d,st);L.appendChild(d);drag(d,st)});placeTools();
}
function drag(d,st){
  d.addEventListener('pointerdown',e=>{
    if(pendingSeal)return;
    if(e.target.closest('.ntxt')){select(st.id);return}   /* 点在便签字上：写字，不拖 */
    e.preventDefault();d.setPointerCapture(e.pointerId);const R=page.getBoundingClientRect(),sx=e.clientX,sy=e.clientY,ox=st.x,oy=st.y;let moved=false;
    const mv=ev=>{const dx=(ev.clientX-sx)/R.width*100,dy=(ev.clientY-sy)/R.height*100;if(Math.abs(dx)+Math.abs(dy)>.5)moved=true;st.x=Math.max(0,Math.min(100,ox+dx));st.y=Math.max(0,Math.min(100,oy+dy));place(d,st);placeTools()};
    const up=()=>{d.removeEventListener('pointermove',mv);d.removeEventListener('pointerup',up);d.removeEventListener('pointercancel',up);if(moved)save();select(st.id)};
    d.addEventListener('pointermove',mv);d.addEventListener('pointerup',up);d.addEventListener('pointercancel',up);
  });
}
function select(id){selId=id;$$('.sticker').forEach(el=>el.classList.toggle('sel',el.dataset.id===id));placeTools()}
function placeTools(){
  const T=$('#stkTools'),st=P().stickers.find(s=>s.id===selId),el=st&&document.querySelector(`.sticker[data-id="${selId}"]`);
  if(!st||!el||penOn){T.classList.remove('on');return}
  T.querySelector('[data-act="col"]').style.display=(st.t==='word'||st.t==='note')?'':'none';
  const R=page.getBoundingClientRect(),E=el.getBoundingClientRect();
  T.style.left=Math.max(100,Math.min(R.width-100,E.left-R.left+E.width/2))+'px';T.style.top=Math.min(R.height-44,E.bottom-R.top+8)+'px';T.classList.add('on');
}
$('#stkTools').addEventListener('pointerdown',e=>e.stopPropagation());
$('#stkTools').addEventListener('click',e=>{
  const a=e.target.dataset.act,pg=P(),st=pg.stickers.find(s=>s.id===selId);if(!a||!st)return;const el=document.querySelector(`.sticker[data-id="${selId}"]`);
  if(a==='rot')st.r=(st.r+15)%360;if(a==='big')st.s=Math.min(3,+(st.s+.15).toFixed(2));if(a==='small')st.s=Math.max(.4,+(st.s-.15).toFixed(2));
  if(a==='col'&&st.t==='note'){const ks=Object.keys(NOTE_C);st.note.c=ks[(ks.indexOf(st.note.c)+1)%ks.length];el.style.setProperty('--nc',NOTE_C[st.note.c].c)}
  if(a==='col'&&st.t==='word'){const ks=Object.keys(WORD_COL);st.word.c=ks[(ks.indexOf(st.word.c)+1)%ks.length];el.style.color=WORD_COL[st.word.c]}
  if(a==='tear'){el.classList.add('torn');$('#stkTools').classList.remove('on');setTimeout(()=>{pg.stickers=pg.stickers.filter(s=>s!==st);selId=null;save();renderStickers()},520);return}
  place(el,st);placeTools();save();
});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.sticker,#stkTools')&&selId!=null)select(null)});
window.addEventListener('resize',()=>{placeTools();sizeInk()});
function addItem(st){setMode('text');P().stickers.push(st);save();selId=st.id;renderStickers();closeSheet()}
function addSticker(t){addItem({id:uid(),t,x:30+Math.random()*40,y:35+Math.random()*30,r:Math.round(Math.random()*24-12),s:1});toast(`贴上了「${STICKERS[t].name}」，按住可以拖`)}
function addNote(){
  const st={id:uid(),t:'note',note:{txt:NOTE_TPL[noteTpl].t,c:noteColor},x:32+Math.random()*36,y:34+Math.random()*26,r:Math.round(Math.random()*8-4),s:1};
  addItem(st);
  const tx=document.querySelector(`.sticker[data-id="${st.id}"] .ntxt`);
  if(tx){tx.focus();const r=document.createRange(),n=tx.firstChild;if(n&&n.nodeType===3&&noteTpl==='todo'){r.setStart(n,2);r.collapse(true)}else{r.selectNodeContents(tx);r.collapse(false)}const sel=getSelection();sel.removeAllRanges();sel.addRange(r)}
  toast('在便签上写吧；按住胶带可以拖');
}
function addWord(txt){addItem({id:uid(),t:'word',word:{txt,c:'ink',fs:3.8},x:35+Math.random()*30,y:40+Math.random()*25,r:Math.round(Math.random()*10-5),s:1});toast('贴在纸上了；点中可以换颜色、放大')}
/* 盖章：先选一枚，再点纸面 */
function armSeal(seal){pendingSeal=seal;closeSheet();setMode('text');select(null);page.classList.add('stamping');toast('点一下纸面，盖在那里')}
page.addEventListener('pointerdown',e=>{
  if(!pendingSeal||e.target.closest('#stkTools'))return;
  e.preventDefault();e.stopPropagation();
  const R=page.getBoundingClientRect(),st={id:uid(),t:'seal',seal:pendingSeal,x:+((e.clientX-R.left)/R.width*100).toFixed(2),y:+((e.clientY-R.top)/R.height*100).toFixed(2),r:Math.round(Math.random()*14-7),s:1};
  P().stickers.push(st);pendingSeal=null;page.classList.remove('stamping');save();selId=null;renderStickers();
  const d=document.querySelector(`.sticker[data-id="${st.id}"]`);if(d)d.classList.add('press');
},true);

/* ───────── 涂鸦 ─────────
   硬笔：细而匀，读触控笔压感；毛笔：慢粗快细，起笔收笔自带锋；晕染：一层淡水色；画梅：沿笔迹画枝、开梅花。
   坐标按纸宽归一成 0–1000，换设备也对得上；用过触控笔后，手指碰纸面不会误画。 */
const ink=$('#ink'),ctx=ink.getContext('2d'),live=$('#inkLive'),lctx=live.getContext('2d');
const BR={pen:[2.2,4,7],brush:[5,9,15],wash:[24,40,64],plum:[9,13,18]};
let penOn=false,eraseOn=false,penColor='ink',brush='pen',penSize=1,penSeen=false,cur=null,hist=[];
function inkColor(k){const cs=getComputedStyle(page);const m={ink:'--ink',zhu:'--zhu',yanzhi:'--pen-yanzhi',dian:'--pen-dian',dai:'--pen-dai',huang:'--pen-huang'};return (cs.getPropertyValue(m[k]||'--ink')||'').trim()||'#2a2420'}
function setU(){const w=page.offsetWidth;if(w){page.style.setProperty('--u',(w/100)+'px');page.style.height=Math.round(w*1.414)+'px'}}
function sizeInk(){setU();const r=page.getBoundingClientRect(),d=Math.min(3,window.devicePixelRatio||1);[ink,live].forEach(c=>{c.width=Math.round(r.width*d);c.height=Math.round(r.height*d)});drawAll()}
const rnd=a=>{const x=Math.sin(a*12.9898+78.233)*43758.5453;return x-Math.floor(x)};
function blossom(c2,x,y,r,rot,col){c2.save();c2.translate(x,y);c2.rotate(rot);c2.fillStyle=col;c2.globalAlpha=.9;
  for(let k=0;k<5;k++){const a=k*1.2566;c2.beginPath();c2.arc(Math.cos(a)*r*.55,Math.sin(a)*r*.55,r*.5,0,7);c2.fill()}
  c2.globalAlpha=1;c2.fillStyle='#c9963a';c2.beginPath();c2.arc(0,0,r*.2,0,7);c2.fill();c2.restore()}
function drawPlum(c2,s,K){
  const p=s.p,R=p[2],col=s.c==='ink'?'rgba(60,52,48,.6)':inkColor(s.c);
  c2.strokeStyle='rgba(74,52,38,.85)';c2.lineCap='round';c2.lineJoin='round';c2.lineWidth=Math.max(1,R*.28*K);
  c2.beginPath();c2.moveTo(p[0]*K,p[1]*K);for(let i=3;i<p.length;i+=3)c2.lineTo(p[i]*K,p[i+1]*K);c2.stroke();
  let acc=0,next=R*1.1;
  for(let i=3;i<p.length;i+=3){const dx=p[i]-p[i-3],dy=p[i+1]-p[i-2],len=Math.hypot(dx,dy)||1;acc+=len;
    if(acc>=next){acc=0;next=R*(2+rnd(i)*1.8);const side=rnd(i+1)>.5?1:-1,off=R*.9*side*rnd(i+2);
      blossom(c2,(p[i]-dy/len*off)*K,(p[i+1]+dx/len*off)*K,R*(.7+rnd(i+3)*.5)*K,rnd(i+4)*6.28,col)}}
}
function drawStroke(c2,s){
  const p=s.p,K=c2.canvas.width/1000;if(!p||p.length<3)return;c2.save();
  if(s.b==='plum'){drawPlum(c2,s,K);c2.restore();return}
  const col=inkColor(s.c);c2.strokeStyle=col;c2.fillStyle=col;c2.lineCap='round';c2.lineJoin='round';
  if(s.b==='wash'){c2.globalAlpha=.2;c2.lineWidth=p[2]*K;c2.beginPath();c2.moveTo(p[0]*K,p[1]*K);
    for(let i=3;i<p.length;i+=3){c2.quadraticCurveTo(p[i-3]*K,p[i-2]*K,(p[i-3]+p[i])/2*K,(p[i-2]+p[i+1])/2*K)}
    c2.lineTo(p[p.length-3]*K,p[p.length-2]*K);c2.stroke();c2.restore();return}
  if(p.length===3){c2.beginPath();c2.arc(p[0]*K,p[1]*K,p[2]*K/2,0,7);c2.fill();c2.restore();return}
  let px=p[0],py=p[1];
  for(let i=3;i<p.length;i+=3){const x=p[i],y=p[i+1],last=i+3>=p.length,mx=last?x:(x+p[i+3])/2,my=last?y:(y+p[i+4])/2;
    c2.lineWidth=Math.max(.5,p[i+2]*K);c2.beginPath();c2.moveTo(px*K,py*K);c2.quadraticCurveTo(x*K,y*K,mx*K,my*K);c2.stroke();px=mx;py=my}
  c2.restore();
}
function drawAll(){ctx.clearRect(0,0,ink.width,ink.height);lctx.clearRect(0,0,live.width,live.height);P().strokes.forEach(s=>drawStroke(ctx,s))}
let lastT=0,lastW=0;
function ptOf(e){const r=live.getBoundingClientRect();return [+((e.clientX-r.left)/r.width*1000).toFixed(1),+((e.clientY-r.top)/r.width*1000).toFixed(1)]}
function widthFor(e,dist,dt){
  const base=BR[brush][penSize],pr=e.pointerType==='pen'?(e.pressure||.5):.5;
  if(brush==='pen')return base*(.35+pr*1.3);
  if(brush==='brush'){const v=dt>0?dist/dt:0;let f=1.5-Math.min(1.1,v*.9);if(e.pointerType==='pen')f*=(.5+pr);const w=base*f;lastW=lastW?lastW*.65+w*.35:base*.35;return lastW}
  return base;
}
function eraseAt(x,y){const pg=P(),gone=[];
  pg.strokes=pg.strokes.filter(s=>{const R=16+(s.b==='wash'?s.p[2]/2:0);for(let i=0;i<s.p.length;i+=3){const dx=s.p[i]-x,dy=s.p[i+1]-y;if(dx*dx+dy*dy<R*R){gone.push(s);return false}}return true});
  if(gone.length){hist.push({t:'erase',s:gone});drawAll()}}
live.addEventListener('pointerdown',e=>{
  if(!penOn)return;if(e.pointerType==='pen')penSeen=true;if(penSeen&&e.pointerType==='touch')return;
  e.preventDefault();live.setPointerCapture(e.pointerId);const [x,y]=ptOf(e);
  if(eraseOn){cur={erase:true};eraseAt(x,y);return}
  lastT=e.timeStamp;lastW=0;cur={b:brush,c:penColor,p:[x,y,+widthFor(e,0,0).toFixed(2)]};
});
live.addEventListener('pointermove',e=>{
  if(!cur)return;const evs=e.getCoalescedEvents?e.getCoalescedEvents():[];
  for(const ev of (evs.length?evs:[e])){const [x,y]=ptOf(ev);
    if(cur.erase){eraseAt(x,y);continue}
    const p=cur.p,dx=x-p[p.length-3],dy=y-p[p.length-2],dist=Math.hypot(dx,dy);if(dist<1.1)continue;
    const dt=Math.max(1,ev.timeStamp-lastT);lastT=ev.timeStamp;p.push(x,y,+widthFor(ev,dist,dt).toFixed(2));}
  if(!cur.erase){lctx.clearRect(0,0,live.width,live.height);drawStroke(lctx,cur)}
});
function endStroke(){
  if(!cur)return;
  if(!cur.erase){
    if(cur.b==='brush'){const p=cur.p,n=p.length/3,k=Math.min(6,n-1);for(let j=0;j<k;j++){p[(n-1-j)*3+2]=+(p[(n-1-j)*3+2]*((j+1)/(k+1))).toFixed(2)}}
    P().strokes.push(cur);hist.push({t:'add',s:cur});drawStroke(ctx,cur);lctx.clearRect(0,0,live.width,live.height);
  }
  cur=null;save();
}
live.addEventListener('pointerup',endStroke);live.addEventListener('pointercancel',endStroke);
$('#undo').addEventListener('click',()=>{const h=hist.pop();if(!h)return toast('没有可以撤销的了');const pg=P();if(h.t==='add')pg.strokes=pg.strokes.filter(s=>s!==h.s);else pg.strokes.push(...h.s);save();drawAll()});
$('#clearInk').addEventListener('click',()=>{const pg=P();if(!pg.strokes.length)return;if(!confirm('清空这一笺上所有涂鸦？打的字、贴纸和印章不受影响。'))return;hist.push({t:'erase',s:pg.strokes.slice()});pg.strokes=[];save();drawAll()});
function setEraser(on){eraseOn=on;$('#eraser').classList.toggle('on-er',on);page.classList.toggle('erase',on)}
$('#eraser').addEventListener('click',()=>setEraser(!eraseOn));
$$('.penbar .dot').forEach(b=>b.addEventListener('click',()=>{penColor=b.dataset.color;$$('.penbar .dot').forEach(x=>x.classList.toggle('on',x===b));setEraser(false)}));
$$('.penbar .br').forEach(b=>b.addEventListener('click',()=>{brush=b.dataset.brush;$$('.penbar .br').forEach(x=>x.classList.toggle('on',x===b));setEraser(false);
  toast({pen:'硬笔：细而匀',brush:'毛笔：写得慢就粗，写得快就细',wash:'晕染：淡淡一层水色，可以叠',plum:'画梅：画一笔枝，沿路开花；换胭脂、朱砂颜色更好看'}[brush])}));
$$('.penbar .sz').forEach(b=>b.addEventListener('click',()=>{penSize=+b.dataset.size;$$('.penbar .sz').forEach(x=>x.classList.toggle('on',x===b));setEraser(false)}));
function setMode(m){
  penOn=m==='pen';page.classList.toggle('pen-mode',penOn);$('#dock').classList.toggle('pen-on',penOn);
  $$('.mode button').forEach(b=>b.classList.toggle('on',b.dataset.mode===m));
  $$('[contenteditable][data-key]').forEach(el=>el.setAttribute('contenteditable',penOn?'false':'true'));
  if(penOn){if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();select(null);pendingSeal=null;page.classList.remove('stamping')}
}
$$('.mode button').forEach(b=>b.addEventListener('click',()=>{setMode(b.dataset.mode);if(penOn)toast('直接在纸上画；用过触控笔后，手指不会误画')}));

/* ───────── 翻页、新笺、删笺 ───────── */
function renderPage(){applyLook();renderTexts();renderWeather();renderSeal();renderStickers();renderPager();hist=[];sizeInk()}
function go(i,dir){if(i<0||i>=book.pages.length)return;book.cur=i;selId=null;save();closeSheet();renderPage();
  page.classList.remove('turn-next','turn-prev');void page.offsetWidth;page.classList.add(dir<0?'turn-prev':'turn-next');window.scrollTo({top:0,behavior:'smooth'})}
function newPage(){book.pages.splice(book.cur+1,0,blankPage(P()));go(book.cur+1,1);toast('新铺了一张笺，纸和栏格沿用上一张')}
function delPage(){if(book.pages.length<2)return toast('只剩这一张了，留着吧');if(!confirm(`删掉第${cnNum(book.cur+1)}笺？上面的字、涂鸦、贴纸和印都会一起删掉。`))return;book.pages.splice(book.cur,1);go(Math.min(book.cur,book.pages.length-1),-1);toast('删掉了')}
$('#pgPrev').addEventListener('click',()=>go(book.cur-1,-1));$('#pgNext').addEventListener('click',()=>go(book.cur+1,1));$('#pgNew').addEventListener('click',newPage);
page.addEventListener('animationend',e=>{if(e.target===page)page.classList.remove('turn-next','turn-prev')});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(pendingSeal){pendingSeal=null;page.classList.remove('stamping');toast('不盖了')}closeShot();return closeSheet()}
  if(shot.classList.contains('on')||e.target.closest('[contenteditable="true"],input,textarea'))return;
  if(e.key==='ArrowLeft')go(book.cur-1,-1);if(e.key==='ArrowRight')go(book.cur+1,1);
  if((e.metaKey||e.ctrlKey)&&e.key==='z'&&penOn){e.preventDefault();$('#undo').click()}
});
$('#dice').addEventListener('click',()=>{
  const pg=P(),pick=(a,cur)=>{const o=a.filter(x=>x.id!==cur);return o[Math.floor(Math.random()*o.length)]};
  const p=pick(PAPERS.filter(x=>x.id!=='yemo'),pg.paper),r=pick(RULES,pg.rule),fs=Object.keys(FLOWERS).filter(x=>x!==pg.flower),f=fs[Math.floor(Math.random()*fs.length)];
  pg.paper=p.id;pg.rule=r.id;pg.flower=f;save();applyLook();drawAll();toast(`骰出：${p.name} · ${r.name} · ${FLOWERS[f].name==='无'?'无花样':FLOWERS[f].name}`);
});

/* ───────── 抽屉 ───────── */
const sheet=$('#sheet'),scrim=$('#scrim');
let boxTab='note',noteColor='xiang',noteTpl='blank',wordMode='insert',custom={txt:'',shape:'fang',mode:'bai'};
function boxBody(){
  if(boxTab==='note')return `<p class="sub">便签上的字是手写体（龙藏体）。在便签上点一下就能写；按住顶上的胶带拖动；点中后可以换颜色、放大、撕掉。</p>`+
    `<h4>纸色</h4><div class="chips c4" style="grid-template-columns:repeat(5,1fr)">${Object.entries(NOTE_C).map(([k,v])=>`<button class="chip${k===noteColor?' cur':''}" data-ncolor="${k}"><span class="nsw" style="background:${v.c}"></span>${v.n}</button>`).join('')}</div>`+
    `<h4>样式</h4><div class="chips">${Object.entries(NOTE_TPL).map(([k,v])=>`<button class="chip${k===noteTpl?' cur':''}" data-ntpl="${k}">${v.n}</button>`).join('')}</div>`+
    `<div style="display:flex;justify-content:center;margin:16px 0 14px"><div style="width:200px;--u:2px"><div style="width:200px;filter:drop-shadow(0 3px 6px rgba(0,0,0,.18))"><div class="note-paper" style="--nc:${NOTE_C[noteColor].c};min-height:120px;padding:26px 16px 18px"><div class="note-tape" style="width:70px;height:22px;top:-9px"></div><div class="ntxt" style="font-size:20px">${esc(NOTE_TPL[noteTpl].t||'明天记得带伞')}</div></div></div></div></div>`+
    `<button class="big" id="noteGo">贴一张便签</button>`;
  if(boxTab==='stk')return `<p class="sub">点一下贴到纸上，按住拖动；点中后可以转、放大、撕掉。</p>`+STK_GROUPS.map(([g,ks])=>`<h4>${g}</h4><div class="stk-grid">${ks.map(k=>`<button data-stk="${k}" title="${STICKERS[k].name}">${STICKERS[k].svg}<span>${STICKERS[k].name}</span></button>`).join('')}</div>`).join('');
  if(boxTab==='seal')return `<p class="sub">选一枚，再点纸面盖上去。盖歪了可以拖，不要了点中「撕」。</p><div class="seals">${SEAL_PRESETS().map((s,i)=>`<button data-preset="${i}">${sealShape(s.txt,s.shape,s.mode)}<span>${esc(s.label)}</span></button>`).join('')}</div>`+
    `<h4>刻一枚自己的</h4><div class="row"><input id="cTxt" maxlength="4" placeholder="一到四个字" value="${esc(custom.txt)}"></div>`+
    `<div class="chips c4" style="margin-top:8px">${[['fang','方'],['yuan','圆'],['chang','长']].map(([k,n])=>`<button class="chip${custom.shape===k?' cur':''}" data-cshape="${k}">${n}</button>`).join('')}${''}</div>`+
    `<div class="chips" style="margin-top:8px;grid-template-columns:1fr 1fr">${[['bai','白文 · 红底白字'],['zhu','朱文 · 红字']].map(([k,n])=>`<button class="chip${custom.mode===k?' cur':''}" data-cmode="${k}">${n}</button>`).join('')}</div>`+
    `<div style="display:flex;justify-content:center;margin:12px 0" id="cPrev">${sealShape(custom.txt||'素',custom.shape,custom.mode).replace('<svg','<svg style="height:64px;width:auto"')}</div><button class="big" id="cGo">盖这一枚</button>`;
  const modeChips=`<div class="chips" style="grid-template-columns:1fr 1fr;margin-bottom:6px">${[['insert','插进字里'],['stick','贴在纸上']].map(([k,n])=>`<button class="chip${wordMode===k?' cur':''}" data-wmode="${k}">${n}</button>`).join('')}</div>`;
  if(boxTab==='kao')return `<p class="sub">「插进字里」会插到你刚才写字的地方；「贴在纸上」是一张可以拖的字贴。</p>${modeChips}<h4>颜文字</h4><div class="kao">${KAO.map(([n,t],i)=>`<button data-kao="${i}">${esc(t)}<small>${n}</small></button>`).join('')}</div><h4>小符</h4><div class="fu">${FU.map((t,i)=>`<button data-fu="${i}">${t}</button>`).join('')}</div>`;
  return `<p class="sub">古人造的字，今人拿来当表情。</p>${modeChips}<div class="fu" style="grid-template-columns:repeat(4,1fr)">${GU.map(([t,m],i)=>`<button data-gu="${i}" style="height:auto;padding:10px 0">${t}<small>${m}</small></button>`).join('')}</div>`;
}
function openSheet(kind){
  const pg=P(),H=(t,sub)=>`<h3>${t}<button data-close aria-label="关">×</button></h3>${sub?`<p class="sub">${sub}</p>`:''}`;let h='';
  if(kind==='pages')h=H('笺目','一张笺一页。点哪张就翻到哪张。')+`<button class="big" id="sheetNew">＋ 在这张后面铺一张新笺</button>`+
    book.pages.map((p,i)=>{const t=p.texts||{},first=(t.text||'').split('\n')[0];return `<button class="leaf${i===book.cur?' cur':''}" data-go="${i}"><b>第${cnNum(i+1)}笺</b><span>${t.title?esc(t.title):'<span style="color:var(--ink-3)">（无题）</span>'}<small>${esc([t.date,first].filter(Boolean).join(' · '))||'&nbsp;'}</small></span></button>`}).join('')+
    (book.pages.length>1?`<button class="big ghost" id="delPage" style="margin-top:14px">删掉当前这一张</button>`:'');
  if(kind==='style'){const fixed=(RULES.find(r=>r.id===pg.rule)||{}).dir;
    h=H('笺式','这一张笺用什么纸、画什么格、印什么花。')+
    `<h4>纸色</h4><div class="chips">${PAPERS.map(p=>`<button class="chip${p.id===pg.paper?' cur':''}" data-paper="${p.id}"><span class="sw" style="background:${p.c}"></span>${p.name}</button>`).join('')}</div>`+
    `<h4>栏格</h4><div class="chips">${RULES.map(r=>`<button class="chip${r.id===pg.rule?' cur':''}" data-rule="${r.id}"><span class="mini" style="${MINI[r.id]}"></span>${r.name}</button>`).join('')}</div>`+
    `<h4>书写方向</h4><div class="chips"><button class="chip${dirOf(pg)==='h'?' cur':''}" data-dir="h" ${fixed?'disabled':''}>横写</button><button class="chip${dirOf(pg)==='v'?' cur':''}" data-dir="v" ${fixed?'disabled':''}>竖写</button></div>${fixed?`<p class="sub" style="margin-top:6px">${fixed==='v'?'丝栏是竖行，只能竖写':'横格只能横写'}</p>`:''}`+
    `<h4>花样</h4><div class="chips">${Object.entries(FLOWERS).map(([k,f])=>`<button class="chip${k===pg.flower?' cur':''}" data-flower="${k}"><span class="fl">${f.svg?f.svg.split('</svg>')[0].replace(/style="[^"]*"/,'')+'</svg>':'—'}</span>${f.name}</button>`).join('')}</div>`+
    `<h4>落款</h4><div class="chips"><button class="chip${pg.seal?' cur':''}" data-seal="1">盖章落款</button><button class="chip${!pg.seal?' cur':''}" data-seal="0">不落款</button></div>`;}
  if(kind==='weather'){const w=pg.weather;
    h=H('天时','这一笺的天气，手动选。节气、月相按这张笺的日子推算。')+
    `<h4>天气</h4><div class="chips c4">${Object.entries(WX).map(([k,v])=>`<button class="chip${w.type===k?' cur':''}" data-wx="${k}"><span class="wx">${wxSvg(k)}</span>${v.n}</button>`).join('')}</div>`+
    `<h4>气温（度）</h4><div class="row"><input id="wLo" type="number" inputmode="numeric" placeholder="最低" value="${esc(w.lo)}"><span>至</span><input id="wHi" type="number" inputmode="numeric" placeholder="最高" value="${esc(w.hi)}"></div>`+
    `<h4>风</h4><div class="chips c4">${['无风','微风','大风'].map(n=>`<button class="chip${w.wind===n?' cur':''}" data-wind="${n}">${n}</button>`).join('')}<button class="chip${!w.wind?' cur':''}" data-wind="">不记</button></div>`+
    `<h4>附带</h4><div class="chips" style="grid-template-columns:1fr 1fr"><button class="chip${w.jq!==false?' cur':''}" data-wopt="jq">节气${pg.ymd?' · '+jieqiOf(pg.ymd):''}</button><button class="chip${w.moon?' cur':''}" data-wopt="moon">月相${pg.ymd?' · '+moonOf(pg.ymd):''}</button></div>`+
    `<h4>这张笺的日子</h4><div class="row"><input id="wYmd" type="date" value="${esc(pg.ymd||'')}"></div>`+
    `<button class="big ghost" id="wAuto" style="margin-top:16px">日子设为今天</button><button class="big ghost" id="wClear">这一笺不记天时</button>`;}
  if(kind==='box')h=H('百宝匣','')+`<div class="tabs">${[['note','便签'],['stk','贴纸'],['seal','印章'],['kao','颜文字'],['gu','古字']].map(([k,n])=>`<button data-tab="${k}" class="${k===boxTab?'on':''}">${n}</button>`).join('')}</div>`+boxBody();
  if(kind==='settings')h=H('设置','都只存在这台设备上。')+
    `<label class="field">署名<input id="setName" value="${esc(book.name)}" maxlength="12"></label>
     <p class="sub">名章按字数排成一方：一个字配「印」，两个字配「之印」，三个字补一个「印」，四个字刚好一方。</p>
     <label class="field">闲章<input id="setMotto" value="${esc(book.motto)}" maxlength="4"></label>
     <button class="big ghost" id="resetAll">整本恢复成样张</button>`;
  sheet.innerHTML=h;sheet.classList.add('on');scrim.classList.add('on');
}
function closeSheet(){sheet.classList.remove('on');scrim.classList.remove('on')}
$$('[data-open]').forEach(b=>b.addEventListener('click',e=>{if(pendingSeal)return;openSheet(b.dataset.open)}));
scrim.addEventListener('click',closeSheet);
sheet.addEventListener('click',e=>{
  const t=e.target.closest('button');if(!t||t.disabled)return;const pg=P(),d=t.dataset;
  if(t.hasAttribute('data-close'))return closeSheet();
  if(t.id==='sheetNew')return newPage();if(t.id==='delPage')return delPage();
  if(d.go!=null){const i=+d.go;return i===book.cur?closeSheet():go(i,i>book.cur?1:-1)}
  let restyle=false;
  if(d.paper){pg.paper=d.paper;restyle=true}
  if(d.rule){pg.rule=d.rule;const dd=RULES.find(r=>r.id===pg.rule).dir;if(dd)pg.dir=dd;restyle=true}
  if(d.dir){pg.dir=d.dir;restyle=true}
  if(d.flower){pg.flower=d.flower;restyle=true}
  if(d.seal!=null){pg.seal=d.seal==='1';restyle=true}
  if(restyle){save();applyLook();drawAll();return openSheet('style')}
  /* 天时 */
  if(d.wx){pg.weather.type=pg.weather.type===d.wx?'':d.wx;save();renderWeather();return openSheet('weather')}
  if(d.wind!=null){pg.weather.wind=d.wind;save();renderWeather();return openSheet('weather')}
  if(d.wopt){const k=d.wopt;pg.weather[k]=k==='jq'?pg.weather.jq===false:!pg.weather.moon;save();renderWeather();return openSheet('weather')}
  if(t.id==='wClear'){pg.weather={type:'',lo:'',hi:'',wind:'',jq:false,moon:false};save();renderWeather();return closeSheet()}
  if(t.id==='wAuto')return autoWeather();
  /* 百宝匣 */
  if(d.tab){boxTab=d.tab;return openSheet('box')}
  if(d.ncolor){noteColor=d.ncolor;return openSheet('box')}
  if(d.ntpl){noteTpl=d.ntpl;return openSheet('box')}
  if(t.id==='noteGo')return addNote();
  if(d.stk)return addSticker(d.stk);
  if(d.preset!=null){const s=SEAL_PRESETS()[+d.preset];return armSeal({txt:s.txt,shape:s.shape,mode:s.mode})}
  if(d.cshape){custom.shape=d.cshape;return openSheet('box')}
  if(d.cmode){custom.mode=d.cmode;return openSheet('box')}
  if(t.id==='cGo'){if(!custom.txt.trim())return toast('先写上一到四个字');return armSeal(Object.assign({},custom))}
  if(d.wmode){wordMode=d.wmode;return openSheet('box')}
  const word=d.kao!=null?KAO[+d.kao][1]:d.fu!=null?FU[+d.fu]:d.gu!=null?GU[+d.gu][0]:null;
  if(word!=null){if(wordMode==='insert'){closeSheet();insertText(word)}else addWord(word);return}
  if(t.id==='resetAll'&&confirm('整本会恢复成两张样张：写的字、涂鸦、新铺的笺、贴纸和印都会清掉，确定吗？')){store.del(KEY);store.del(OLD);location.reload()}
});
sheet.addEventListener('input',e=>{
  const id=e.target.id,pg=P();
  if(id==='setName'){book.name=e.target.value;save();renderSeal()}
  if(id==='setMotto'){book.motto=e.target.value;save();renderSeal()}
  if(id==='wLo'||id==='wHi'){pg.weather[id==='wLo'?'lo':'hi']=e.target.value;save();renderWeather()}
  if(id==='wYmd'){pg.ymd=e.target.value;save();renderWeather()}
  if(id==='cTxt'){custom.txt=e.target.value;const pv=$('#cPrev');if(pv)pv.innerHTML=sealShape(custom.txt||'素',custom.shape,custom.mode).replace('<svg','<svg style="height:64px;width:auto"')}
});
/* 日子设为今天（节气、月相随之推算；天气手动选） */
function autoWeather(){const pg=P();pg.ymd=ymdToday();save();renderWeather();if(sheet.classList.contains('on'))openSheet('weather');toast('日子设成今天了')}

/* ───────── 存长图 ─────────
   按页面原样画成图，用包内自带的 html-to-image，不联网。自带字体是包内文件，画图时取不到，
   长图里的字会换成系统楷体；存图走容器的 writeTempFile + saveImageToPhotosAlbum。 */
const blobToURL=b=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(r.error);r.readAsDataURL(b)});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const isSafari=/^((?!chrome|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
const miniTool=()=>window.xhs&&window.xhs.miniTool;
const canSaveAlbum=()=>{const m=miniTool();return !!(m&&typeof m.writeTempFile==='function'&&typeof m.saveImageToPhotosAlbum==='function')};
function looksBlank(c){try{const t=document.createElement('canvas');t.width=t.height=32;const x=t.getContext('2d');x.drawImage(c,0,0,32,32);const d=x.getImageData(0,0,32,32).data;let lo=255,hi=0;for(let i=0;i<d.length;i+=4){const v=(d[i]*3+d[i+1]*6+d[i+2])/10;lo=Math.min(lo,v);hi=Math.max(hi,v)}return hi-lo<6}catch(e){return true}}
let lastWhy='';
async function capturePage(ratio){
  const bg=getComputedStyle(page).backgroundColor,lib=window.htmlToImage;
  if(!lib||typeof lib.toCanvas!=='function')throw new Error('长图工具没载入');
  const opt={pixelRatio:ratio,backgroundColor:bg,skipFonts:true,filter:n=>n.id!=='stkTools'&&n.id!=='inkLive'};
  let c=await lib.toCanvas(page,opt);
  if(isSafari){await wait(60);c=await lib.toCanvas(page,opt)}
  if(looksBlank(c)){lastWhy='画出来是空白';throw new Error(lastWhy)}
  return c;
}
function prepCapture(){select(null);if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();page.classList.remove('turn-next','turn-prev');page.classList.add('exporting');window.scrollTo(0,0)}
const MAX_AREA=16e6,MAX_SIDE=16000;
async function renderLeaf(){prepCapture();await wait(60);const w=page.offsetWidth,h=page.offsetHeight;let r=Math.min(3,Math.max(2,1242/w));r=Math.min(r,Math.sqrt(MAX_AREA/(w*h)),MAX_SIDE/h);return capturePage(r)}
async function renderBook(onStep){
  const keep=book.cur;
  try{prepCapture();const w=page.offsetWidth,h=page.offsetHeight,n=book.pages.length,GAP=36,H=h*n+GAP*(n+1);
    const r=Math.min(2,Math.sqrt(MAX_AREA/((w+GAP*2)*H)),MAX_SIDE/H);
    const out=document.createElement('canvas');out.width=Math.round((w+GAP*2)*r);out.height=Math.round(H*r);
    const x=out.getContext('2d');x.fillStyle=getComputedStyle(document.body).backgroundColor||'#e6dcc8';x.fillRect(0,0,out.width,out.height);
    for(let i=0;i<n;i++){onStep&&onStep(i+1,n);book.cur=i;renderPage();page.classList.add('exporting');await wait(80);const c=await capturePage(r);x.drawImage(c,GAP*r,(GAP+i*(h+GAP))*r,w*r,h*r)}
    return out;
  }finally{book.cur=keep;renderPage();page.classList.remove('exporting')}
}
const shot=$('#shot'),shotView=$('#shotView'),shotTip=$('#shotTip'),shotSave=$('#shotSave');
let shotBlob=null,shotName='',shotURL='',shotScope='leaf',shotRun=0;
async function openShot(scope){
  closeSheet();shotScope=scope||shotScope;$$('.seg button').forEach(b=>b.classList.toggle('on',b.dataset.scope===shotScope));
  shot.classList.add('on');document.body.style.overflow='hidden';const run=++shotRun;
  shotBlob=null;shotSave.disabled=true;shotTip.textContent='';if(shotURL){URL.revokeObjectURL(shotURL);shotURL=''}
  shotView.innerHTML='<div class="shot-wait" id="shotWait">正在裱长图…</div>';
  try{
    const c=shotScope==='book'?await renderBook((i,n)=>{const w=$('#shotWait');if(w&&run===shotRun)w.textContent=`正在裱第${cnNum(i)}笺 / 共${cnNum(n)}笺…`}):await renderLeaf();
    if(run!==shotRun)return;
    const big=c.width*c.height>6e6,type=big?'image/jpeg':'image/png',blob=await new Promise(ok=>c.toBlob(ok,type,.92));if(!blob)throw new Error('生成图片失败');if(run!==shotRun)return;
    const title=(P().texts.title||'').trim();
    shotName=(shotScope==='book'?`素笺集-整本-共${cnNum(book.pages.length)}笺`:`素笺集-第${cnNum(book.cur+1)}笺${title?'-'+title:''}`)+(big?'.jpg':'.png');
    shotBlob=blob;shotURL=URL.createObjectURL(blob);const img=new Image();img.alt=shotName;img.src=shotURL;
    shotView.innerHTML='';shotView.appendChild(img);
    shotSave.disabled=false;
    shotTip.textContent=(canSaveAlbum()?'点「存到相册」保存':'这里存不到相册，可以先用系统截图')+` · ${c.width}×${c.height}`;
  }catch(e){if(run!==shotRun)return;shotView.innerHTML=`<div class="shot-wait">没裱成：${esc(e&&e.message||lastWhy||'未知原因')}<br>可以先用系统截图代替</div>`}
  finally{if(run===shotRun)page.classList.remove('exporting')}
}
function closeShot(){if(!shot.classList.contains('on'))return;shotRun++;shot.classList.remove('on');document.body.style.overflow='';page.classList.remove('exporting')}
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

/* ───────── 提示与启动 ───────── */
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2600)}
setU();
renderPage();
document.fonts&&document.fonts.ready.then(()=>{renderSeal();renderStickers();sizeInk()});
window.addEventListener('load',sizeInk);
})();

