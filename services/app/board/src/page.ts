// The board's one page: a Discord-style sidebar of agents (30%) and the selected agent's channel. It loads
// /api/sessions every 3 seconds and draws everything in the browser, so selection and folds survive refreshes.
//
// Corners are concentric: an inner radius is the outer radius minus the padding between them, so nested
// curves share one centre instead of bulging (r_inner = r_outer - gap). One ladder drives every corner:
//
//   app 22 ─ pad 8 ─► panel 14 ─ pad 6 ─► row 8 ─ pad 4 ─► chip 4

export const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Run My Agents</title><style>
:root{color-scheme:dark;--r-app:22px;--p1:8px;--r-panel:calc(var(--r-app) - var(--p1));--p2:6px;--r-row:calc(var(--r-panel) - var(--p2));--p3:4px;--r-chip:calc(var(--r-row) - var(--p3));
--text:#ececf1;--muted:rgba(236,236,241,.55);--line:rgba(255,255,255,.07);--green:#22c55e;--mint:#6ee7a0;--amber:#f59e0b;
--body:"Satoshi","DM Sans",system-ui,-apple-system,sans-serif;--mono:"JetBrains Mono",ui-monospace,Menlo,monospace}
*{box-sizing:border-box}html,body{height:100%;margin:0}
body{background:#06060a;color:var(--text);font:13px/1.5 var(--body);-webkit-font-smoothing:antialiased;padding:var(--p1)}
.app{height:100%;display:grid;grid-template-columns:30% minmax(0,1fr);gap:var(--p1);padding:var(--p1);border-radius:var(--r-app);background:linear-gradient(120deg,#0b0b12,#10101a,#0c1210,#0b0b12);background-size:300% 300%;animation:bg 14s ease infinite;box-shadow:inset 0 0 0 1px var(--line)}
@keyframes bg{50%{background-position:100% 50%}}
.side,.main{border-radius:var(--r-panel);background:rgba(18,18,26,.75);box-shadow:inset 0 0 0 1px var(--line);overflow:auto;padding:var(--p2)}
.main{display:flex;flex-direction:column;padding:0}
.proj{padding:8px 10px;font-weight:600;border-radius:var(--r-row);cursor:pointer;display:flex;justify-content:space-between;transition:background .2s}.proj:hover{background:#1e1e28}.proj small{font:11px var(--mono);color:var(--muted)}
.grp{font:11px var(--mono);color:var(--muted);margin:12px 10px 6px;cursor:pointer;user-select:none;transition:color .2s}.grp:hover{color:var(--text)}
.it{display:flex;align-items:center;gap:10px;padding:6px 8px;min-height:56px;border-radius:var(--r-row);cursor:pointer;transition:background .2s,transform .2s}
.it:hover{background:#1e1e28;transform:translateX(3px)}.it:active{transform:scale(.97)}
.it.sel{background:linear-gradient(90deg,#26263a,#1b1b25);box-shadow:inset 2px 0 0 var(--green)}
.it .t{min-width:0;flex:1}.nm{display:block;font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.meta{display:flex;gap:6px;align-items:center;font-size:11px;color:var(--muted);margin:1px 0}.rl{font:600 10px var(--mono);border-radius:var(--r-chip);padding:1px 6px}.it small{display:block;color:var(--muted);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.av{position:relative;flex:none;animation:bob 3s ease-in-out infinite;filter:drop-shadow(0 4px 4px rgba(0,0,0,.55));transition:transform .2s;cursor:pointer}
.av:hover{transform:scale(1.15) rotate(6deg)}.av.jump{animation:jump .6s ease}
@keyframes jump{30%{transform:translateY(-12px) scale(1.15) rotate(-10deg)}60%{transform:translateY(0) scale(.95)}}
@keyframes bob{50%{transform:translateY(-3px) rotate(-3deg)}}
.lid{transform-box:fill-box;transform-origin:center;animation:blink 4.5s infinite}
@keyframes blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.08)}}
.pup{animation:look 5s ease-in-out infinite}
@keyframes look{0%,100%{transform:translate(0,0)}25%{transform:translate(-3px,0)}50%{transform:translate(3px,-2px)}75%{transform:translate(1px,2px)}}
.idle .pup{animation:none;transform:translate(0,3px)}.idle .av{animation-duration:6s}
.dot{position:absolute;right:-2px;bottom:-2px;width:11px;height:11px;border-radius:50%;border:2.5px solid #14141c}
.g{background:var(--green);animation:pulse 1.6s infinite}.y{background:var(--amber);animation:pulsey 1s infinite}.z{background:#55555f}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,.6)}100%{box-shadow:0 0 0 7px rgba(34,197,94,0)}}
@keyframes pulsey{0%{box-shadow:0 0 0 0 rgba(245,158,11,.7)}100%{box-shadow:0 0 0 8px rgba(245,158,11,0)}}
.badge{margin-left:auto;background:var(--amber);color:#2a1a00;font-size:11px;border-radius:999px;padding:0 6px;animation:pop 1.2s ease-in-out infinite}
@keyframes pop{50%{transform:scale(1.18)}}
.hd{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--line)}
.hd small{color:var(--muted);font:11px var(--mono)}
.hb{margin-left:auto;display:flex;gap:6px}.hb span{font-size:11px;padding:4px 10px;border-radius:999px;background:#1d1d27;cursor:pointer;transition:background .2s,transform .2s}.hb span:hover{background:#2a2a38;transform:translateY(-1px)}
.feed{padding:var(--p2) 10px;display:flex;flex-direction:column;gap:4px;flex:1;overflow:auto}
.msg{display:flex;gap:10px;animation:in .4s ease both;padding:8px;border-radius:var(--r-row);cursor:pointer;transition:background .2s}.msg:hover{background:rgba(255,255,255,.04)}
@keyframes in{from{opacity:0;transform:translateY(8px)}}
.msg time{color:var(--muted);font-size:11px;min-width:38px;padding-top:2px}
.msg p{margin:2px 0 0;color:#c9c9d3;white-space:pre-wrap;word-break:break-word;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.msg.open p{-webkit-line-clamp:unset}
.tools{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.tool{font:11px var(--mono);border-radius:var(--r-chip);padding:3px 8px;color:var(--mint);background:linear-gradient(90deg,#1a1a22 0%,#23332a 50%,#1a1a22 100%);background-size:200% 100%;animation:shim 1.8s linear infinite;cursor:pointer;transition:color .2s}.tool:hover{color:#fff}
@keyframes shim{to{background-position:-200% 0}}
.warn{border:1px solid var(--amber);color:var(--amber);border-radius:var(--r-row);padding:8px 10px;font-size:12px;animation:glow 2s ease-in-out infinite;cursor:pointer;display:flex;justify-content:space-between;gap:10px;margin:var(--p2) 10px 0}.warn:hover{background:rgba(245,158,11,.15)}
@keyframes glow{50%{box-shadow:0 0 18px rgba(245,158,11,.35)}}
.typing{display:flex;gap:4px;padding:6px 0 6px 56px}.typing i{width:6px;height:6px;border-radius:50%;background:#8a8a99;animation:ty 1.2s infinite}.typing i:nth-child(2){animation-delay:.2s}.typing i:nth-child(3){animation-delay:.4s}
@keyframes ty{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-5px);opacity:1}}
.box{margin:var(--p2);background:#1a1a22;border-radius:var(--r-row);padding:10px 12px;color:var(--muted);font:11px var(--mono);cursor:pointer;display:flex;justify-content:space-between;gap:10px;transition:background .2s,color .2s}.box:hover{background:#22222d;color:var(--text)}
.box span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.box b{display:inline-block;width:7px;height:13px;background:var(--mint);vertical-align:-2px;animation:cur 1s steps(1) infinite}@keyframes cur{50%{opacity:0}}
.toast{position:fixed;right:24px;bottom:24px;background:var(--green);color:#04120a;font-size:12px;padding:6px 12px;border-radius:var(--r-row);opacity:0;transform:translateY(6px);transition:opacity .3s,transform .3s;pointer-events:none}.toast.on{opacity:1;transform:none}
.ag{font:600 9px var(--mono);letter-spacing:.04em;border-radius:var(--r-chip);padding:1px 5px;background:#2a2340;color:#c4b5fd}.ag.codex{background:#123028;color:#6ee7b7}
.tok{font:10px var(--mono);color:var(--muted)}
.meter{display:flex;align-items:center;gap:8px;padding:8px 16px;border-bottom:1px solid var(--line);font:11px var(--mono);color:var(--muted)}
.bar{flex:1;height:6px;border-radius:999px;background:#1d1d27;overflow:hidden}.bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--green),var(--mint));transition:width .6s;background-size:200% 100%;animation:shim 2.4s linear infinite}
.bar.hot i{background:linear-gradient(90deg,var(--amber),#fb7185);background-size:200% 100%}
.btn{font:600 11px var(--body);padding:4px 10px;border-radius:999px;background:#1d1d27;color:var(--text);cursor:pointer;border:0;transition:background .2s,transform .2s}.btn:hover{background:#2a2a38;transform:translateY(-1px)}.btn.go{background:var(--amber);color:#2a1a00}.btn.go:hover{background:#fbbf24}
.panel{margin:var(--p2);padding:10px;border-radius:var(--r-row);background:#1a1a22;display:flex;flex-direction:column;gap:8px;font-size:12px;animation:in .3s ease both}
.panel input[type=number]{width:100%;background:#0f0f15;border:1px solid var(--line);border-radius:var(--r-chip);color:var(--text);padding:6px 8px;font:12px var(--mono)}
.panel label{display:flex;gap:8px;align-items:center;cursor:pointer;color:var(--muted)}.panel label:hover{color:var(--text)}
.skills{display:grid;grid-template-columns:repeat(auto-fill,minmax(14rem,1fr));gap:6px;padding:var(--p2) 10px;border-bottom:1px solid var(--line);animation:in .3s ease both}
.sk{padding:8px 10px;border-radius:var(--r-row);background:#1a1a22;cursor:pointer;transition:background .2s,transform .2s}.sk:hover{background:#23232e;transform:translateY(-2px)}
.sk b{font:600 12px var(--mono);color:var(--mint)}.sk p{margin:2px 0 0;color:var(--muted);font-size:11px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.compose{position:relative;margin:var(--p2);border-radius:var(--r-row);background:#0b0b10;box-shadow:inset 0 0 0 1px var(--line);overflow:hidden;transition:box-shadow .3s}
.compose:focus-within{box-shadow:inset 0 0 0 1px rgba(110,231,183,.35),0 8px 24px -12px rgba(34,197,94,.5)}
.compose .row{position:relative;display:flex;gap:8px;align-items:flex-end;padding:8px 10px 10px 12px}
.compose .row>*{flex:none;height:28px;display:flex;align-items:center}
#msg{flex:1 1 auto;min-width:0;resize:none;border:0;outline:0;margin:0;padding:4px 0;box-sizing:border-box;height:28px;display:block;background:transparent;color:var(--text);font:13px/20px var(--body);max-height:160px;caret-color:var(--mint);overflow-y:auto}
#msg::placeholder{color:var(--muted)}
.glow{position:absolute;top:-30px;left:0;width:90px;height:90px;border-radius:50%;background:radial-gradient(circle,rgba(167,139,250,.32),rgba(56,189,248,.12) 45%,transparent 70%);pointer-events:none;opacity:0;transition:left .15s ease-out,top .15s ease-out,opacity .3s}
.compose:focus-within .glow{opacity:1}
.line{position:absolute;left:0;right:0;bottom:0;height:3px;background:linear-gradient(90deg,#22c55e,#38bdf8,#a78bfa,#22c55e);background-size:200% 100%;animation:sweep 2.4s linear infinite;opacity:.35;transition:opacity .3s}
.compose:focus-within .line,.compose.typing .line{opacity:1;box-shadow:0 0 12px rgba(56,189,248,.6)}
@keyframes sweep{to{background-position:-200% 0}}
.fill{position:absolute;left:0;bottom:0;height:3px;width:0;background:rgba(255,255,255,.55);mix-blend-mode:overlay;transition:width .15s ease-out;pointer-events:none}
.sh{position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.07) 50%,transparent 70%);background-size:250% 100%;animation:shim2 2.6s linear infinite;pointer-events:none}
@keyframes shim2{from{background-position:150% 0}to{background-position:-100% 0}}
.ch{font:11px var(--mono);color:var(--muted);min-width:26px;justify-content:flex-end}
.eq{gap:3px;align-items:flex-end;padding-bottom:5px}.eq i{width:3px;height:4px;border-radius:2px;background:var(--mint);transition:height .2s}
.compose.typing .eq i{animation:eq .45s ease-in-out infinite alternate}.compose.typing .eq i:nth-child(2){animation-delay:.1s}.compose.typing .eq i:nth-child(3){animation-delay:.2s}.compose.typing .eq i:nth-child(4){animation-delay:.3s}
@keyframes eq{from{height:4px}to{height:18px}}
.fairy{position:absolute;top:3px;left:0;width:30px;height:24px;pointer-events:none;z-index:2;animation:fx 9s ease-in-out infinite alternate,fy 1.8s ease-in-out infinite alternate}
.fairy.f2{top:auto;bottom:6px;animation-duration:12s,2.3s;animation-delay:-5s,-1s}
.compose:focus-within .fairy,.compose.typing .fairy{animation-duration:4s,1s}.compose:focus-within .fairy.f2,.compose.typing .fairy.f2{animation-duration:5.5s,1.3s}
@keyframes fx{from{left:3%}to{left:calc(97% - 30px)}}@keyframes fy{from{translate:0 0}to{translate:0 7px}}
.fairy b{position:absolute;left:11px;top:10px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff,#fde68a 40%,#f59e0b);box-shadow:0 0 9px 3px rgba(253,230,138,.8)}
.fairy.f2 b{background:radial-gradient(circle at 35% 35%,#fff,#c4b5fd 45%,#8b5cf6);box-shadow:0 0 9px 3px rgba(196,181,253,.8)}
.fairy i{position:absolute;top:0;width:13px;height:17px;border-radius:60% 60% 50% 50%;background:linear-gradient(160deg,rgba(255,255,255,.55),rgba(186,230,253,.15));border:1px solid rgba(255,255,255,.4);transform-origin:bottom center;animation:flap .16s ease-in-out infinite alternate}
.fairy i.wl{left:3px;rotate:-28deg}.fairy i.wr{left:14px;rotate:28deg;animation-delay:.08s}
@keyframes flap{from{scale:1 1}to{scale:.35 1}}
.watch{width:28px;transition:transform .3s}.watch .ava{animation:none;filter:none}
.watch .pup{animation:none;transition:transform .15s ease-out}
.compose:focus-within .watch{transform:translateY(-2px) rotate(-4deg)}
.send{border:0;border-radius:var(--r-chip);padding:7px 14px;font:600 12px var(--body);color:#04120a;background:var(--green);cursor:pointer;transition:transform .2s,background .2s}.send:hover{background:var(--mint);transform:translateY(-1px)}.send:disabled{opacity:.5;cursor:wait}
.rs{font:13px var(--mono);color:var(--muted);cursor:pointer;padding:0 4px}.rs:hover{color:var(--text)}
.sent{position:absolute;left:14px;top:10px;right:120px;font:13px/1.5 var(--body);color:var(--mint);white-space:nowrap;overflow:hidden;pointer-events:none;animation:up .6s ease-in forwards}@keyframes up{to{transform:translateY(-20px);opacity:0}}
.empty{color:var(--muted);text-align:center;margin:auto;padding:40px}
@media (max-width:720px){.app{grid-template-columns:1fr}.side{max-height:40vh}}
</style></head><body>
<svg width="0" height="0" style="position:absolute"><defs>
<radialGradient id="sh" cx="35%" cy="28%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>
<radialGradient id="eye" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#cfd3e0"/></radialGradient>
</defs></svg>
<div class="app"><nav class="side" id="side"></nav><main class="main"><div class="hd" id="hd"></div><div id="meter"></div><div id="skills"></div><div id="warns"></div><div class="feed" id="feed"></div><div class="box" id="box"></div></main></div>
<div class="toast" id="toast"></div>
<script>
const SH={circle:c=>'<circle cx="32" cy="32" r="28" fill="'+c+'"/><circle cx="32" cy="32" r="28" fill="url(#sh)"/>',
square:c=>'<rect x="5" y="5" width="54" height="54" rx="12" fill="'+c+'"/><rect x="5" y="5" width="54" height="54" rx="12" fill="url(#sh)"/>',
pill:c=>'<rect x="2" y="12" width="60" height="40" rx="20" fill="'+c+'"/><rect x="2" y="12" width="60" height="40" rx="20" fill="url(#sh)"/>',
tall:c=>'<rect x="12" y="2" width="40" height="60" rx="10" fill="'+c+'"/><rect x="12" y="2" width="40" height="60" rx="10" fill="url(#sh)"/>',
blob:c=>'<path d="M32 4c14 0 28 8 27 26s-9 30-27 30S4 50 5 30 18 4 32 4z" fill="'+c+'"/><path d="M32 4c14 0 28 8 27 26s-9 30-27 30S4 50 5 30 18 4 32 4z" fill="url(#sh)"/>'};
const K='#0b0b10',W='url(#eye)';
const EY={dots:'<g class="lid"><g class="pup"><circle cx="22" cy="30" r="4.5" fill="'+K+'"/><circle cx="42" cy="30" r="4.5" fill="'+K+'"/></g></g>',
wide:'<g class="lid"><circle cx="22" cy="30" r="8" fill="'+W+'"/><circle cx="42" cy="30" r="8" fill="'+W+'"/><g class="pup"><circle cx="22" cy="30" r="3.5" fill="'+K+'"/><circle cx="42" cy="30" r="3.5" fill="'+K+'"/></g></g>',
ovals:'<g class="lid"><ellipse cx="22" cy="30" rx="6" ry="9" fill="'+W+'"/><ellipse cx="42" cy="30" rx="6" ry="9" fill="'+W+'"/><g class="pup"><ellipse cx="22" cy="30" rx="3" ry="4.5" fill="'+K+'"/><ellipse cx="42" cy="30" rx="3" ry="4.5" fill="'+K+'"/><circle cx="23" cy="28" r="1.1" fill="#fff"/><circle cx="43" cy="28" r="1.1" fill="#fff"/></g></g>',
sleepy:'<path d="M15 30h14v3a7 5 0 0 1-14 0z" fill="'+W+'"/><path d="M35 30h14v3a7 5 0 0 1-14 0z" fill="'+W+'"/><g class="pup"><circle cx="22" cy="33" r="2.5" fill="'+K+'"/><circle cx="42" cy="33" r="2.5" fill="'+K+'"/></g><path d="M14 30h16M34 30h16" stroke="'+K+'" stroke-width="2.5" stroke-linecap="round"/>',
visor:'<rect x="12" y="22" width="40" height="16" rx="8" fill="'+K+'"/><g class="pup"><rect x="18" y="27" width="8" height="6" rx="2" fill="#7dd3fc"/><rect x="38" y="27" width="8" height="6" rx="2" fill="#7dd3fc"/></g>',
cyclops:'<g class="lid"><circle cx="32" cy="30" r="12" fill="'+W+'"/><g class="pup"><circle cx="32" cy="30" r="5.5" fill="'+K+'"/><circle cx="34" cy="28" r="1.6" fill="#fff"/></g></g>',
happy:'<g class="pup"><path d="M16 32q6-9 12 0M36 32q6-9 12 0" fill="none" stroke="'+K+'" stroke-width="3.5" stroke-linecap="round"/></g>',
bars:'<g class="lid"><g class="pup"><rect x="20" y="23" width="4" height="13" rx="2" fill="'+K+'"/><rect x="40" y="23" width="4" height="13" rx="2" fill="'+K+'"/></g></g>',
squint:'<g class="lid"><rect x="15" y="27" width="14" height="7" rx="3.5" fill="'+W+'"/><rect x="35" y="27" width="14" height="7" rx="3.5" fill="'+W+'"/><g class="pup"><rect x="20" y="28" width="4" height="5" rx="1.5" fill="'+K+'"/><rect x="40" y="28" width="4" height="5" rx="1.5" fill="'+K+'"/></g></g>'};
let composerFor="",S=[],C=[],L={sessionTokens:0,autoDowngrade:false},showLimits=false,showSkills=false,last="",feedKey="",sel=localStorage.getItem("rma-sel"),fold={},seen={},paused={},muted={},first=true;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const ago=ms=>{const s=Math.round(ms/1e3);return s<60?s+"s":s<3600?Math.round(s/60)+" min":Math.round(s/3600)+" h"};
const kt=n=>n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e3?Math.round(n/1e3)+"k":String(n);
const post=(u,b)=>fetch(u,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json());
const hm=t=>new Date(t).toTimeString().slice(0,5);
function toast(t){const el=$("toast");el.textContent=t;el.classList.add("on");clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove("on"),1400)}
const state=s=>C.some(c=>c.sessions.includes(s.id))?"y":Date.now()-s.updatedAt<120000?"g":"z";
function face(s,n){const f=s.face,i=S.indexOf(s);return '<div class="av" data-face="'+s.id+'" style="width:'+n+'px;height:'+n+'px;animation-delay:-'+(i*0.6)+'s"><svg width="'+n+'" height="'+n+'" viewBox="0 0 64 64">'+SH[f.shape](f.color)+EY[f.eyes]+'</svg>'+(n>32?'<span class="dot '+state(s)+'"></span>':"")+"</div>"}
function render(){
 if(!S.length){$("side").innerHTML='<div class="proj">Run My Agents</div>';$("hd").innerHTML="";$("warns").innerHTML="";$("feed").innerHTML='<p class="empty">No Claude Code sessions in the last hour. Start one and it shows up here.</p>';$("box").innerHTML="";return}
 if(!S.find(s=>s.id===sel))sel=S[0].id;
 const groups=[["Working",s=>state(s)!=="z"],["Idle",s=>state(s)==="z"]];
 $("side").innerHTML='<div class="proj" data-act="proj"><span>Run My Agents</span><small>'+S.length+" agents</small></div>"+'<div style="padding:0 6px"><button class="btn" data-act="limits">'+(L.sessionTokens?"Limit "+kt(L.sessionTokens)+" per session":"Set token limit")+"</button></div>"+(showLimits?'<div class="panel"><div>Tokens per session (0 = no limit)</div><input type="number" id="lim" min="0" step="50000" value="'+L.sessionTokens+'"><label><input type="checkbox" id="auto" '+(L.autoDowngrade?"checked":"")+'> At the limit, move new sessions to a cheaper model</label><div style="color:var(--muted);font-size:11px">Models only move down: Opus, then Sonnet, then Haiku. Never up.</div><button class="btn go" data-act="save">Save</button></div>':"")+groups.map(([g,f])=>{const xs=S.filter(f);if(!xs.length)return"";return '<div class="grp" data-grp="'+g+'">'+(fold[g]?"▸":"▾")+" "+g+" · "+xs.length+"</div>"+(fold[g]?"":xs.map(s=>{const unread=(s.feed.length-(seen[s.id]??s.feed.length));return '<div class="it '+(s.id===sel?"sel ":"")+(state(s)==="z"?"idle":"")+'" data-sel="'+s.id+'">'+face(s,36)+'<div class="t"><b class="nm">'+esc(s.title||"Untitled session")+'</b><span class="meta"><span class="rl" style="color:'+s.face.color+';background:color-mix(in srgb,'+s.face.color+' 18%,transparent)">'+esc(s.role)+'</span><span class="ag '+s.agent+'">'+(s.agent==="codex"?"CODEX":"CLAUDE")+"</span>"+ago(Date.now()-s.updatedAt)+"</span><small>"+esc(s.doing||"")+" · "+kt(s.tokens.used)+" tok"+(s.model?" · "+esc(s.model.replace(/^claude-/,"")):"")+"</small></div>"+(unread>0&&s.id!==sel?'<span class="badge">'+unread+"</span>":"")+"</div>"}).join(""))}).join("");
 const s=S.find(x=>x.id===sel);seen[s.id]=s.feed.length;
 $("hd").innerHTML=face(s,30)+"<div>"+esc(s.role)+" · "+esc(s.title||"Untitled")+"<br><small>"+esc(s.branch||"")+" · "+esc(s.cwd.split("/").pop()||"")+" · session "+s.id.slice(0,8)+'</small></div><div class="hb"><span data-act="skills">Skills</span><span data-act="files">Files</span><span data-act="mute">'+(muted[s.id]?"Unmute":"Mute")+"</span></div>";
 const over=L.sessionTokens&&s.tokens.used>=L.sessionTokens,pct=L.sessionTokens?Math.min(100,s.tokens.used/L.sessionTokens*100):0;
 $("meter").innerHTML='<div class="meter"><span>'+esc(s.model||s.agent)+"</span>"+(L.sessionTokens?'<div class="bar'+(over?" hot":"")+'"><i style="width:'+pct+'%"></i></div><span>'+kt(s.tokens.used)+" / "+kt(L.sessionTokens)+"</span>":'<span style="flex:1">'+kt(s.tokens.used)+" tokens · "+kt(s.tokens.cached)+" cached</span>")+(s.lower?'<button class="btn'+(over?" go":"")+'" data-act="down">Move to '+s.lower+"</button>":"")+"</div>";
 $("skills").innerHTML=showSkills?'<div class="skills">'+s.skills.map(k=>'<div class="sk" data-skill="'+esc(k.name)+'" title="'+esc(k.source+"/"+k.path)+'"><b>/'+esc(k.name)+"</b><p>"+esc(k.what)+"</p></div>").join("")+"</div>":"";
 const mine=C.filter(c=>c.sessions.includes(s.id));
 $("warns").innerHTML=mine.filter(c=>!muted[s.id]).map(c=>{const other=c.sessions.filter(x=>x!==s.id).map(x=>(S.find(y=>y.id===x)||{role:"another session"}).role).join(", ");return '<div class="warn" data-act="go" data-file="'+esc(c.file)+'" data-other="'+c.sessions.find(x=>x!==s.id)+'"><span>⚠ '+esc(other)+" also edited "+esc(c.file.split("/").pop())+" in the last 10 min</span><span>Open "+esc(other)+"</span></div>"}).join("");
 const feed=$("feed"),stick=feed.scrollTop+feed.clientHeight>=feed.scrollHeight-40;
 const key=s.id+":"+s.feed.length+":"+(s.feed.at(-1)?.at??0)+":"+state(s);
 if(key!==feedKey){feedKey=key;
 feed.innerHTML=s.feed.map(m=>'<div class="msg" data-msg><time>'+hm(m.at)+"</time><div><b>"+(m.who==="you"?"You":esc(s.role))+"</b>"+(m.text?"<p>"+esc(m.text)+"</p>":"")+(m.tools.length?'<div class="tools">'+m.tools.map(t=>'<span class="tool" data-act="tool">'+esc(t)+"</span>").join("")+"</div>":"")+"</div></div>").join("")+(state(s)==="g"?'<div class="typing"><i></i><i></i><i></i></div>':"");
 if(stick||first)feed.scrollTop=feed.scrollHeight;}
 if(composerFor!==s.id){composerFor=s.id;$("box").outerHTML='<div class="compose" id="box"><i class="glow"></i><i class="sh"></i><div class="fairy"><i class="wl"></i><i class="wr"></i><b></b></div><div class="fairy f2"><i class="wl"></i><i class="wr"></i><b></b></div><i class="line"></i><i class="fill"></i><div class="row"><div class="watch">'+face(s,28)+'</div><textarea id="msg" rows="1" placeholder="Message '+esc(s.role)+(s.agent==="codex"?" (Codex)":"")+'…"></textarea><span class="ch" id="ch">0</span><div class="eq"><i></i><i></i><i></i><i></i></div><span class="rs" data-act="resume" title="Copy the resume command">⧉</span><button class="send" data-act="send">Send</button></div></div>'}
 const sb=document.querySelector(".send");if(sb){sb.disabled=!!s.sending;sb.textContent=s.sending?"Answering…":"Send"}
 first=false;
}
async function load(){if(showLimits&&document.activeElement?.id==="lim")return;try{const r=await fetch("api/sessions");const t=await r.text();if(t===last)return;last=t;const j=JSON.parse(t);S=j.sessions;C=j.clashes;L=j.limits;render()}catch{}}
document.addEventListener("click",e=>{
 const f=e.target.closest("[data-face]");if(f){f.classList.remove("jump");void f.offsetWidth;f.classList.add("jump");const s=S.find(x=>x.id===f.dataset.face);if(s)toast(s.role+": "+(s.doing||"here"));e.stopPropagation();return}
 const it=e.target.closest("[data-sel]");if(it){sel=it.dataset.sel;try{localStorage.setItem("rma-sel",sel)}catch{}first=true;render();return}
 const g=e.target.closest("[data-grp]");if(g){fold[g.dataset.grp]=!fold[g.dataset.grp];render();return}
 const s=S.find(x=>x.id===sel),a=e.target.closest("[data-act]");
 if(a){const k=a.dataset.act;
  if(k==="go"){sel=a.dataset.other;first=true;render()}
  else if(k==="mute"){muted[s.id]=!muted[s.id];render();toast(muted[s.id]?"Clash warnings hidden for "+s.role:"Clash warnings shown")}
  else if(k==="files"){const fs=[...new Set(s.edits.map(x=>x.file.split("/").pop()))];toast(fs.length?s.role+" edited "+fs.slice(-5).join(", "):s.role+" hasn't edited files")}
  else if(k==="tool"){navigator.clipboard?.writeText(a.textContent).catch(()=>{});toast("Copied "+a.textContent)}
  else if(k==="proj"){last="";load();toast("Refreshed")}
  else if(k==="limits"){showLimits=!showLimits;render()}
  else if(k==="save"){post("api/limits",{sessionTokens:Number($("lim").value),autoDowngrade:$("auto").checked}).then(l=>{L=l;showLimits=false;last="";render();toast(l.sessionTokens?"Limit set: "+kt(l.sessionTokens)+" per session":"No token limit")})}
  else if(k==="resume"){navigator.clipboard?.writeText("cd "+s.cwd+" && "+(s.agent==="codex"?"codex resume ":"claude --resume ")+s.id).catch(()=>{});toast("Copied resume command")}
  else if(k==="send"){sendMsg()}
  else if(k==="skills"){showSkills=!showSkills;render()}
  else if(k==="down"){post("api/downgrade",{id:s.id}).then(r=>{if(r.error){toast(r.error);return}navigator.clipboard?.writeText("/model "+r.model).catch(()=>{});toast("New sessions use "+r.model+". Copied /model "+r.model+" for this one")})}
  return}
 const sk=e.target.closest("[data-skill]");if(sk){navigator.clipboard?.writeText("/"+sk.dataset.skill).catch(()=>{});toast("Copied /"+sk.dataset.skill);return}
 const m=e.target.closest("[data-msg]");if(m){m.classList.toggle("open");return}

});
function fx(cls,x,y,txt,vars){const c=$("box");if(!c)return;const el=document.createElement("span");el.className=cls;el.style.left=x+"px";el.style.top=y+"px";if(txt)el.textContent=txt;for(const k in vars||{})el.style.setProperty(k,vars[k]);c.appendChild(el);el.addEventListener("animationend",()=>el.remove())}
function caretXY(){const t=$("msg"),r=t.getBoundingClientRect(),c=$("box").getBoundingClientRect();const lines=t.value.slice(0,t.selectionStart).split("\\n");const w=Math.max(1,r.width);const col=lines.at(-1).length*7.1;return{x:r.left-c.left+(col%w),y:r.top-c.top+Math.min(r.height,(lines.length-1+Math.floor(col/w))*20)+14}}
document.addEventListener("input",e=>{if(e.target.id!=="msg")return;const t=e.target;t.style.height="28px";t.style.height=Math.min(160,Math.max(28,t.scrollHeight))+"px";follow();const c=$("box");c.classList.add("typing");clearTimeout(c._t);c._t=setTimeout(()=>c.classList.remove("typing"),700)});
document.addEventListener("selectionchange",()=>{if(document.activeElement?.id==="msg")follow()});
function follow(){const t=$("msg"),p=caretXY(),w=t.getBoundingClientRect().width;const g=document.querySelector(".compose .glow");if(g){g.style.left=(p.x-45)+"px";g.style.top=(p.y-45)+"px"}
 const l=document.querySelector(".compose .fill");if(l)l.style.width=Math.min(w+40,t.value.length*7.1)+"px";const ch=$("ch");if(ch)ch.textContent=t.value.length;
 const pu=document.querySelector(".watch .pup");if(pu){const dx=Math.max(-3,Math.min(3,(p.x/w)*6-3));pu.style.transform="translate("+(dx+3)+"px,2px)"}}
document.addEventListener("keydown",e=>{if(e.target.id==="msg"&&e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();sendMsg()}});
async function sendMsg(){const t=$("msg"),s=S.find(x=>x.id===sel);if(!t||!s)return;const text=t.value.trim();if(!text){toast("Type a message first");t.focus();return}
 const r=await post("api/send",{id:s.id,text}).catch(()=>({error:"The board is not answering."}));if(r.error){toast(r.error);return}
 fx("sent",0,0,text.replace(/\\s+/g," "));
 t.value="";t.style.height="28px";follow();s.sending=true;const sb=document.querySelector(".send");if(sb){sb.disabled=true;sb.textContent="Answering…"}toast("Sent to "+s.role);last=""}
load();setInterval(load,3000);
</script></body></html>`;
