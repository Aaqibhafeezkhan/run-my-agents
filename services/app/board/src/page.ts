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
.it .t{min-width:0;flex:1}.nm{display:block;font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.meta{display:flex;gap:6px;align-items:center;font-size:11px;color:var(--muted);margin:1px 0}.md{font:600 9px var(--mono);letter-spacing:.04em;border-radius:var(--r-chip);padding:1px 5px}
.meta{flex-wrap:wrap}
.rl{font:600 10px var(--mono);border-radius:var(--r-chip);padding:1px 6px}.it small{display:block;color:var(--muted);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.av{position:relative;flex:none;animation:bob 3s ease-in-out infinite;filter:drop-shadow(0 4px 4px rgba(0,0,0,.55));transition:transform .2s;cursor:pointer}
.av:hover{transform:scale(1.15) rotate(6deg)}.av{animation-duration:var(--spin,3s);animation-delay:var(--dl,0s)}
.av.low{animation:shake var(--shake,.5s) linear infinite;animation-delay:0s}
.av.low .pup{animation-duration:.5s}.av.low .lid{animation-duration:1.2s}
.av.low .dot{background:#f43f5e;animation:pulsey .5s infinite}
@keyframes shake{0%,100%{transform:translate(0,0) rotate(0)}20%{transform:translate(-2px,1px) rotate(-6deg)}40%{transform:translate(2px,-1px) rotate(6deg)}60%{transform:translate(-2px,-1px) rotate(-5deg)}80%{transform:translate(2px,1px) rotate(5deg)}}
.av.jump{animation:jump .6s ease}
@keyframes jump{30%{transform:translateY(-12px) scale(1.15) rotate(-10deg)}60%{transform:translateY(0) scale(.95)}}
@keyframes bob{50%{transform:translateY(-3px) rotate(-3deg)}}
.lid{transform-box:fill-box;transform-origin:center;animation:blink calc(var(--spin,3s)*1.5) infinite}
@keyframes blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.08)}}
.pup{animation:look calc(var(--spin,3s)*1.7) ease-in-out infinite}
@keyframes look{0%,100%{transform:translate(0,0)}25%{transform:translate(-3px,0)}50%{transform:translate(3px,-2px)}75%{transform:translate(1px,2px)}}
.idle .pup{animation:none;transform:translate(0,3px)}
.dot{position:absolute;right:-2px;bottom:-2px;width:11px;height:11px;border-radius:50%;border:2.5px solid #14141c}
.g{background:var(--green);animation:pulse 1.6s infinite}.y{background:var(--amber);animation:pulsey 1s infinite}.z{background:#55555f}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,.6)}100%{box-shadow:0 0 0 7px rgba(34,197,94,0)}}
@keyframes pulsey{0%{box-shadow:0 0 0 0 rgba(245,158,11,.7)}100%{box-shadow:0 0 0 8px rgba(245,158,11,0)}}
.badge{margin-left:auto;background:var(--amber);color:#2a1a00;font-size:11px;border-radius:999px;padding:0 6px;animation:pop 1.2s ease-in-out infinite}
@keyframes pop{50%{transform:scale(1.18)}}
.hd{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--line)}
.hd small{color:var(--muted);font:11px var(--mono)}
.hb{margin-left:auto;display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.hb span{white-space:nowrap;font-size:11px;padding:4px 10px;border-radius:999px;background:#1d1d27;cursor:pointer;transition:background .2s,transform .2s}.hb span:hover{background:#2a2a38;transform:translateY(-1px)}
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
.compose .row{position:relative;display:flex;gap:8px;align-items:flex-end;padding:2px 10px 10px 12px}
.compose .row>*{flex:none;height:28px;display:flex;align-items:center}
#msg{flex:1 1 auto;min-width:0;resize:none;border:0;outline:0;margin:0;padding:4px 0;box-sizing:border-box;height:28px;display:block;background:transparent;color:var(--text);font:13px/20px var(--body);max-height:160px;caret-color:var(--mint);overflow-y:auto}
#msg::placeholder{color:var(--muted)}
.glow{position:absolute;top:-30px;left:0;width:90px;height:90px;border-radius:50%;background:radial-gradient(circle,rgba(167,139,250,.32),rgba(56,189,248,.12) 45%,transparent 70%);pointer-events:none;opacity:0;transition:left .15s ease-out,top .15s ease-out,opacity .3s}
.compose:focus-within .glow{opacity:1}
.line{position:absolute;left:0;right:0;bottom:0;height:3px;background:linear-gradient(90deg,#22c55e,#38bdf8,#a78bfa,#22c55e);background-size:200% 100%;animation:sweep 2.4s linear infinite;opacity:.35;transition:opacity .3s}
.compose:focus-within .line,.compose.hot .line{opacity:1;box-shadow:0 0 12px rgba(56,189,248,.6)}
@keyframes sweep{to{background-position:-200% 0}}
.fill{position:absolute;left:0;bottom:0;height:3px;width:0;background:rgba(255,255,255,.55);mix-blend-mode:overlay;transition:width .15s ease-out;pointer-events:none}
.sh{position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.07) 50%,transparent 70%);background-size:250% 100%;animation:shim2 2.6s linear infinite;pointer-events:none}
@keyframes shim2{from{background-position:150% 0}to{background-position:-100% 0}}
.ch{font:11px var(--mono);color:var(--muted);min-width:26px;justify-content:flex-end}
.eq{gap:3px;align-items:flex-end;padding-bottom:5px}.eq i{width:3px;height:4px;border-radius:2px;background:var(--mint);transition:height .2s}
.compose.hot .eq i{animation:eq .45s ease-in-out infinite alternate}.compose.hot .eq i:nth-child(2){animation-delay:.1s}.compose.hot .eq i:nth-child(3){animation-delay:.2s}.compose.hot .eq i:nth-child(4){animation-delay:.3s}
@keyframes eq{from{height:4px}to{height:18px}}
.sky{position:relative;height:20px;margin:0 10px;pointer-events:none}
.fairy{position:absolute;top:1px;left:0;width:30px;height:24px;scale:.7;transform-origin:left top;pointer-events:none;animation:fx 9s ease-in-out infinite alternate,fy 1.8s ease-in-out infinite alternate}
.fairy.f2{animation-duration:12s,2.3s;animation-delay:-5s,-1s}
@keyframes fx{from{left:0}to{left:calc(100% - 22px)}}@keyframes fy{from{translate:0 0}to{translate:0 3px}}
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
.btn.new{background:var(--green);color:#04120a}.btn.new:hover{background:var(--mint)}
.side .btns{display:flex;gap:6px;flex-wrap:wrap;padding:0 6px}
.dlg{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center}.dlg[hidden]{display:none}
.dbg{position:absolute;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(3px)}
.dcard{position:relative;width:min(560px,92vw);max-height:92vh;overflow:auto;background:#14141c;border-radius:var(--r-app);padding:var(--p1);box-shadow:inset 0 0 0 1px var(--line),0 30px 80px rgba(0,0,0,.6);animation:in .25s ease both}
.dcard .in{background:#1a1a22;border-radius:var(--r-panel);padding:14px;display:flex;flex-direction:column;gap:10px}
.dcard h3{margin:0;font-size:15px}
.lbl{font:11px var(--mono);color:var(--muted);display:flex;gap:8px;align-items:center}.lbl em{color:var(--mint);font-style:normal}
#ntext{width:100%;resize:vertical;min-height:70px;max-height:200px;background:#0f0f15;border:1px solid var(--line);border-radius:var(--r-row);color:var(--text);padding:10px;font:13px/1.5 var(--body);outline:0}#ntext:focus{border-color:rgba(110,231,183,.45)}
.seg{display:flex;gap:6px;flex-wrap:wrap}.sg{padding:6px 12px;border-radius:var(--r-chip);background:#0f0f15;cursor:pointer;transition:background .2s;font-size:12px;border:1px solid transparent}.sg:hover{background:#23232e}.sg.on{border-color:var(--green);background:rgba(34,197,94,.12)}.sg.off{opacity:.45}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.rc{display:inline-flex;align-items:center;gap:5px;padding:3px 9px 3px 4px;border-radius:999px;background:#0f0f15;cursor:pointer;font-size:12px;border:1px solid transparent;transition:background .2s,transform .2s}.rc:hover{background:#23232e;transform:translateY(-1px)}.rc.on{border-color:var(--c);background:color-mix(in srgb,var(--c) 16%,transparent)}.rc em{font:600 9px var(--mono);font-style:normal;color:var(--mint);margin-left:2px}
.dcard select,.dcard input.f{background:#0f0f15;border:1px solid var(--line);border-radius:var(--r-row);color:var(--text);padding:7px 9px;font:12px var(--mono);outline:0;width:100%}
.dact{display:flex;gap:8px;justify-content:flex-end}
.roles{display:flex;flex-wrap:wrap;gap:6px;padding:var(--p2) 10px;border-bottom:1px solid var(--line);animation:in .3s ease both}
.cmenu{position:fixed;z-index:60;min-width:240px;max-width:320px;max-height:92vh;overflow:auto;padding:var(--p3);border-radius:var(--r-panel);background:#1a1a22;box-shadow:inset 0 0 0 1px var(--line),0 18px 50px rgba(0,0,0,.6);font-size:12.5px;transform-origin:top left;animation:mpop .14s ease-out both}
@keyframes mpop{from{opacity:0;transform:scale(.94) translateY(-4px)}}
.cmenu .mh{display:flex;gap:8px;align-items:center;padding:6px 8px 8px;margin-bottom:var(--p3);border-bottom:1px solid var(--line);font-weight:600}.cmenu .mh span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mi{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:6px 10px;border-radius:calc(var(--r-panel) - var(--p3));cursor:pointer;transition:background .15s,transform .15s}.mi:hover{background:#2a2a38;transform:translateX(2px)}
.mi em{font:11px var(--mono);color:var(--muted);font-style:normal}.mi.dng{color:#fb7185}
.msep{height:1px;background:var(--line);margin:var(--p3) 6px}
.msub{display:none;flex-wrap:wrap;gap:6px;padding:4px 8px 8px}.msub.on{display:flex}
.gx{--ro:20px;--ri:calc(var(--ro) - var(--p1));--rc:calc(var(--ri) - 6px)}
.gsv{display:block;width:100%;height:auto;overflow:visible}
.gc{border-radius:var(--ri);background:radial-gradient(120% 90% at 50% 0%,#262633,#15151d);box-shadow:inset 0 1px 0 rgba(255,255,255,.07),inset 0 0 0 1px var(--line);padding:8px 6px;text-align:center;min-width:0;transition:transform .25s,box-shadow .25s}
.gc:hover{transform:translateY(-2px);box-shadow:inset 0 1px 0 rgba(255,255,255,.1),inset 0 0 0 1px rgba(110,231,183,.28),0 10px 24px -12px rgba(56,189,248,.45)}
.gc.off{opacity:.45}
.gcap{font:600 9px var(--mono);letter-spacing:.06em;color:var(--muted);margin-top:2px;text-transform:uppercase}.gcap b{display:block;font-size:12px;color:var(--text);letter-spacing:0}
.arc{stroke-dashoffset:calc(100 - var(--p));transition:stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)}
.gx:not(.live) .arc{--p:0}
.needle{--cur:var(--a);transform-origin:60px 62px;transform:rotate(var(--cur));transition:transform 1s cubic-bezier(.3,1.5,.5,1);filter:drop-shadow(0 0 3px rgba(255,255,255,.55))}
.gx:not(.live) .needle{--cur:-90deg}
.needle line{transform-origin:60px 62px}.needle.idle line{animation:sway 3.2s ease-in-out infinite}
@keyframes sway{50%{transform:rotate(1.8deg)}}
.needle.hot{animation:jit .18s linear infinite}@keyframes jit{50%{translate:.8px -.5px}}
.mdot{cursor:pointer;transform-box:fill-box;transform-origin:center;transition:transform .2s,filter .2s}.mdot:hover{transform:scale(1.6);filter:brightness(1.5)}
.mls{display:flex;justify-content:space-between;gap:4px;margin-top:4px}
.ml{flex:1;font:600 9px var(--mono);letter-spacing:.04em;padding:4px 0;border-radius:var(--rc);cursor:pointer;color:var(--muted);background:#12121a;transition:color .2s,background .2s,transform .2s,box-shadow .2s}.ml:hover{color:var(--text);transform:translateY(-2px);background:#1d1d29}
.ml.on{color:#06060a;background:var(--c);box-shadow:0 0 14px -2px var(--c);animation:glowp 2.2s ease-in-out infinite}@keyframes glowp{50%{box-shadow:0 0 20px 0 var(--c)}}
.leds{display:flex;gap:5px;align-items:flex-end;justify-content:center;height:64px;padding-top:6px}
.led{width:14px;border-radius:5px;background:#33334a;box-shadow:inset 0 1px 0 rgba(255,255,255,.08);cursor:pointer;transition:background .3s,box-shadow .3s,transform .2s;transition-delay:calc(var(--i)*70ms),calc(var(--i)*70ms),0s}
.led.on{background:var(--c);box-shadow:0 0 10px -1px var(--c);animation:ledp 2.4s ease-in-out infinite;animation-delay:calc(var(--i)*.15s)}@keyframes ledp{50%{filter:brightness(1.35)}}
.led:hover{transform:translateY(-3px) scaleY(1.06);filter:brightness(1.4)}
.gx:not(.live) .led.on{background:#33334a;box-shadow:none}
.elab{display:flex;justify-content:center;gap:5px;font:600 8px var(--mono);color:var(--muted);margin-top:3px}.elab span{width:14px;text-align:center;cursor:pointer;transition:color .2s,transform .2s}.elab span:hover{color:var(--text);transform:translateY(-1px)}
.autob{display:inline-block;margin-top:4px;font:600 8px var(--mono);letter-spacing:.06em;padding:2px 8px;border-radius:999px;background:#12121a;color:var(--muted);cursor:pointer;transition:background .2s,color .2s,transform .2s}.autob:hover{background:#23232e;color:var(--text);transform:translateY(-1px)}
.swr{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:7px 9px;border-radius:var(--rc,8px);cursor:pointer;font-size:12px;transition:background .2s,transform .2s}.swr:hover{background:#1f1f2a;transform:translateX(2px)}
.swt{position:relative;flex:none;width:40px;height:22px;border-radius:999px;background:linear-gradient(#0d0d13,#1a1a24);box-shadow:inset 0 2px 4px rgba(0,0,0,.7),0 1px 0 rgba(255,255,255,.06);transition:background .3s,box-shadow .3s}
.swt b{position:absolute;left:2px;top:2px;width:18px;height:18px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#9aa0b4 55%,#5b6075);box-shadow:0 2px 4px rgba(0,0,0,.6);transition:transform .35s cubic-bezier(.3,1.6,.5,1)}
.swr:hover .swt b{filter:brightness(1.15)}
.swt.on{background:linear-gradient(#16a34a,#22c55e);box-shadow:inset 0 2px 4px rgba(0,0,0,.35),0 0 14px -2px #22c55e;animation:glowg 2.4s ease-in-out infinite}.swt.on b{transform:translateX(18px)}
@keyframes glowg{50%{box-shadow:inset 0 2px 4px rgba(0,0,0,.35),0 0 20px 0 #22c55e}}
.swg,.gcard{border-radius:var(--ri);background:#15151d;box-shadow:inset 0 0 0 1px var(--line);padding:4px}
.gt2{display:flex;flex-wrap:wrap;gap:5px;padding:2px 2px 4px}
.cmenu.gp{--ro:20px;width:min(348px,94vw);min-width:0;max-width:none;padding:var(--p1);border-radius:var(--ro);background:linear-gradient(160deg,#1d1d28,#11111a);box-shadow:inset 0 1px 0 rgba(255,255,255,.08),inset 0 0 0 1px var(--line),0 26px 80px rgba(0,0,0,.75),0 0 60px -20px rgba(56,189,248,.28);display:flex;flex-direction:column;gap:6px;animation:gpop .42s cubic-bezier(.2,1.25,.4,1) both}
@keyframes gpop{from{opacity:0;transform:scale(.86) translateY(-8px)}}
.gp>*{animation:in .4s ease both}.gp>*:nth-child(2){animation-delay:.05s}.gp>*:nth-child(3){animation-delay:.1s}.gp>*:nth-child(4){animation-delay:.15s}.gp>*:nth-child(5){animation-delay:.2s}.gp>*:nth-child(6){animation-delay:.25s}.gp>*:nth-child(7){animation-delay:.3s}
.gh{display:flex;gap:10px;align-items:center;padding:6px 8px;border-radius:var(--ri);background:linear-gradient(90deg,rgba(255,255,255,.06),transparent);transition:background .3s}.gh:hover{background:linear-gradient(90deg,rgba(110,231,183,.14),transparent)}
.gh b{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:240px}.gh .tags{display:flex;gap:5px;align-items:center;margin-top:3px;flex-wrap:wrap}
.gg2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
.tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.tl{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 2px;border-radius:var(--ri);background:linear-gradient(#232330,#17171f);box-shadow:inset 0 1px 0 rgba(255,255,255,.07),inset 0 0 0 1px var(--line),0 3px 0 #0b0b10;cursor:pointer;font:600 9px var(--mono);color:var(--muted);transition:transform .15s,box-shadow .15s,color .2s}
.tl:hover{color:var(--mint);transform:translateY(-2px)}.tl:active{transform:translateY(2px);box-shadow:inset 0 1px 0 rgba(255,255,255,.07),inset 0 0 0 1px var(--line),0 0 0 #0b0b10}.tl svg{width:20px;height:20px;transition:transform .3s}.tl:hover svg{transform:scale(1.2) rotate(-6deg)}
.cpy{display:flex;gap:6px}.cb{flex:1;text-align:center;padding:7px 0;border-radius:var(--rc);background:#15151d;box-shadow:inset 0 0 0 1px var(--line);font:600 10px var(--mono);color:var(--muted);cursor:pointer;transition:background .2s,color .2s,transform .2s}.cb:hover{background:#23232e;color:var(--text);transform:translateY(-2px)}
.dcard{animation:dpop .45s cubic-bezier(.2,1.25,.4,1) both;--ro:var(--r-app)}@keyframes dpop{from{opacity:0;transform:scale(.88) translateY(14px)}}
.dbg{animation:fade .3s ease both}@keyframes fade{from{opacity:0}}
.dhd{display:flex;align-items:baseline;gap:10px}.dsub{font:11px var(--mono);color:var(--muted)}
.tbox,.fbox{position:relative;border-radius:var(--r-row);padding:1px;background:linear-gradient(120deg,#2a2a40,#1f3a2c,#2a2a40);background-size:300% 100%;animation:tflow 8s linear infinite;transition:box-shadow .3s}
.tbox:focus-within,.fbox:focus-within{animation-duration:2.5s;box-shadow:0 0 26px -6px rgba(110,231,183,.55)}
@keyframes tflow{to{background-position:-300% 0}}
.dcard .tbox #ntext{border:0;border-radius:calc(var(--r-row) - 1px);background:#0f0f15}
.dcard .fbox input.f{border:0;border-radius:calc(var(--r-row) - 1px);background:#0f0f15}
.fch{display:flex;flex-wrap:wrap;gap:6px}
.fc{display:inline-flex;align-items:center;padding:4px 10px;border-radius:999px;background:#0f0f15;font:11px var(--mono);color:var(--muted);cursor:pointer;border:1px solid transparent;transition:background .2s,color .2s,transform .2s,border-color .2s,box-shadow .2s}
.fc:hover{background:#23232e;color:var(--text);transform:translateY(-2px)}.fc.on{border-color:var(--green);color:var(--text);background:rgba(34,197,94,.12);box-shadow:0 0 14px -4px var(--green)}
.nrow{display:grid;grid-template-columns:1.7fr 1fr;gap:8px}
.sg.on{animation:glowg2 2.4s ease-in-out infinite}@keyframes glowg2{50%{box-shadow:0 0 16px -3px var(--green)}}
.btn{position:relative;overflow:hidden}
.btn.new::after,.btn.go::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.45) 50%,transparent 70%);transform:translateX(-120%);transition:transform .6s;pointer-events:none}
.btn.new:hover::after,.btn.go:hover::after{transform:translateX(120%)}
.panel.lp{animation:none}
.lp .lnum{display:flex;align-items:center;justify-content:center;gap:12px}
.lbtn{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(#232330,#17171f);box-shadow:inset 0 1px 0 rgba(255,255,255,.08),inset 0 0 0 1px var(--line),0 3px 0 #0b0b10;cursor:pointer;font:600 16px var(--mono);user-select:none;transition:transform .15s,box-shadow .15s,color .2s}
.lbtn:hover{transform:translateY(-2px);color:var(--mint)}.lbtn:active{transform:translateY(2px);box-shadow:inset 0 0 0 1px var(--line),0 0 0 #0b0b10}
#limv{font:700 24px var(--mono);min-width:76px;text-align:center;text-shadow:0 0 14px rgba(110,231,183,.4)}#limv.bump{animation:bump .3s ease}@keyframes bump{40%{transform:scale(1.25);color:var(--mint)}}
.lchips{justify-content:center}
.dcard .chips .rc:nth-child(1){animation-delay:0.04s}.dcard .chips .rc:nth-child(2){animation-delay:0.07s}.dcard .chips .rc:nth-child(3){animation-delay:0.11s}.dcard .chips .rc:nth-child(4){animation-delay:0.14s}.dcard .chips .rc:nth-child(5){animation-delay:0.18s}.dcard .chips .rc:nth-child(6){animation-delay:0.21s}.dcard .chips .rc:nth-child(7){animation-delay:0.25s}.dcard .chips .rc:nth-child(8){animation-delay:0.28s}.dcard .chips .rc:nth-child(9){animation-delay:0.32s}.dcard .chips .rc:nth-child(10){animation-delay:0.35s}.dcard .chips .rc:nth-child(11){animation-delay:0.39s}.dcard .chips .rc:nth-child(12){animation-delay:0.42s}
.dcard .chips .rc{animation:in .4s ease both}
.empty{color:var(--muted);text-align:center;margin:auto;padding:40px}
@media (max-width:720px){.app{grid-template-columns:1fr}.side{max-height:40vh}}
</style></head><body>
<svg width="0" height="0" style="position:absolute"><defs>
<radialGradient id="sh" cx="35%" cy="28%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>
<radialGradient id="eye" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#cfd3e0"/></radialGradient>
<linearGradient id="gz" gradientUnits="userSpaceOnUse" x1="10" y1="0" x2="110" y2="0"><stop offset="0" stop-color="#22c55e"/><stop offset=".55" stop-color="#6ee7a0"/><stop offset=".72" stop-color="#f59e0b"/><stop offset="1" stop-color="#f43f5e"/></linearGradient>
<linearGradient id="gm" gradientUnits="userSpaceOnUse" x1="10" y1="0" x2="110" y2="0"><stop offset="0" stop-color="#a1a1b3"/><stop offset=".3" stop-color="#6ee7a0"/><stop offset=".65" stop-color="#38bdf8"/><stop offset="1" stop-color="#fbbf24"/></linearGradient>
<radialGradient id="hub" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#8a90a6"/><stop offset="1" stop-color="#3a3f52"/></radialGradient>
</defs></svg>
<div class="app"><nav class="side" id="side"></nav><main class="main"><div class="hd" id="hd"></div><div id="meter"></div><div id="skills"></div><div id="roles"></div><div id="warns"></div><div class="feed" id="feed"></div><div class="box" id="box"></div></main></div>
<div class="toast" id="toast"></div>
<div class="dlg" id="dlg" hidden></div>
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
let BUILD0="",composerFor="",S=[],C=[],L={sessionTokens:0,autoDowngrade:false},showLimits=false,showSkills=false,last="",feedKey="",sel=localStorage.getItem("rma-sel"),fold={},seen={},paused={},muted={},first=true;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const ago=ms=>{const s=Math.round(ms/1e3);return s<60?s+"s":s<3600?Math.round(s/60)+" min":Math.round(s/3600)+" h"};
const limLabel=n=>n>=1e6?(n%1e5===0?(n/1e6).toFixed(1):(n/1e6).toFixed(2))+"M":n>=1e3?Math.round(n/1e3)+"k":String(n);
const kt=n=>n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e3?Math.round(n/1e3)+"k":String(n);
const post=(u,b)=>fetch(u,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)}).then(r=>r.json());
const TIER={opus:"#fbbf24",sonnet:"#38bdf8",haiku:"#6ee7a0"};
function mdl(m){m=(m||"").toLowerCase();const t=/opus|sonnet|haiku/.exec(m);if(t)return{label:t[0].toUpperCase(),color:TIER[t[0]]};const g=/gpt-?(\\d+)/.exec(m);return m?{label:g?"GPT-"+g[1]:m.slice(0,8).toUpperCase(),color:"#6ee7b7"}:null}
function mtag(s){const m=mdl(s.model);return m?'<span class="md" title="'+esc(s.model)+'" style="color:'+m.color+';background:color-mix(in srgb,'+m.color+' 16%,transparent)">'+m.label+"</span>":""}
function motion(s){const h=[...s.id].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7);const age=Date.now()-s.updatedAt;
 /* every agent has its own base rate; recent work speeds it up, idling slows it down */
 const base=2.2+(h%20)/10,act=age<10000?.5:age<120000?.8:1.7;
 const p=L.sessionTokens?s.tokens.used/L.sessionTokens:0;
 /* from 70% of its token limit it shakes, faster the closer it gets: 0.6s at 70%, 0.15s at the limit and beyond */
 const low=p>=.7,shake=Math.max(.15,.6-Math.min(1,(p-.7)/.3)*.45);
 return{style:"--spin:"+(base*act).toFixed(2)+"s;--dl:-"+((h%37)/10).toFixed(1)+"s;"+(low?"--shake:"+shake.toFixed(2)+"s;":""),low}}
const hm=t=>new Date(t).toTimeString().slice(0,5);
function toast(t){const el=$("toast");el.textContent=t;el.classList.add("on");clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove("on"),1400)}
const state=s=>C.some(c=>c.sessions.includes(s.id))?"y":Date.now()-s.updatedAt<120000?"g":"z";
function face(s,n){const f=s.face,m=motion(s);return '<div class="av'+(m.low?" low":"")+'" data-face="'+s.id+'" style="width:'+n+'px;height:'+n+'px;'+m.style+'"><svg width="'+n+'" height="'+n+'" viewBox="0 0 64 64">'+SH[f.shape](f.color)+EY[f.eyes]+'</svg>'+(n>32?'<span class="dot '+state(s)+'"></span>':"")+"</div>"}
function render(){
 if(!S.length){$("side").innerHTML='<div class="proj">Run My Agents</div><div class="btns"><button class="btn new" data-act="newopen">+ New session</button></div>';$("hd").innerHTML="";$("warns").innerHTML="";$("feed").innerHTML='<p class="empty">No Claude Code sessions in the last hour. Start one and it shows up here.</p>';$("box").innerHTML="";return}
 if(!S.find(s=>s.id===sel))sel=S[0].id;
 const groups=[["Pinned",s=>s.pinned],["Working",s=>!s.pinned&&s.viaApp!==false&&state(s)!=="z"],["Idle",s=>!s.pinned&&s.viaApp!==false&&state(s)==="z"],["Not in the Claude app",s=>!s.pinned&&s.viaApp===false]];
 $("side").innerHTML='<div class="proj" data-act="proj"><span>Run My Agents</span><small>'+S.length+" agents</small></div>"+'<div class="btns"><button class="btn new" data-act="newopen">+ New session</button><button class="btn" data-act="limits">'+(L.sessionTokens?"Limit "+kt(L.sessionTokens)+" per session":"Set token limit")+"</button></div>"+(showLimits?limPanel():"")+groups.map(([g,f])=>{const xs=S.filter(f);if(!xs.length)return"";return '<div class="grp" data-grp="'+g+'">'+(fold[g]?"▸":"▾")+" "+g+" · "+xs.length+"</div>"+(fold[g]?"":xs.map(s=>{const unread=(s.feed.length-(seen[s.id]??s.feed.length));return '<div class="it '+(s.id===sel?"sel ":"")+(state(s)==="z"?"idle":"")+'" data-sel="'+s.id+'">'+face(s,36)+'<div class="t"><b class="nm">'+esc(s.title||"Untitled session")+'</b><span class="meta"><span class="rl" style="color:'+s.face.color+';background:color-mix(in srgb,'+s.face.color+' 18%,transparent)">'+esc(s.role)+'</span><span class="ag '+s.agent+'">'+(s.agent==="codex"?"CODEX":"CLAUDE")+"</span>"+mtag(s)+ago(Date.now()-s.updatedAt)+"</span><small>"+[esc(s.doing||""),kt(s.tokens.used)+" tok"+(L.sessionTokens?" / "+kt(L.sessionTokens):"")].filter(Boolean).join(" · ")+"</small></div>"+(unread>0&&s.id!==sel?'<span class="badge">'+unread+"</span>":"")+"</div>"}).join(""))}).join("");
 const s=S.find(x=>x.id===sel);seen[s.id]=s.feed.length;
 $("hd").innerHTML=face(s,30)+"<div>"+esc(s.role)+" · "+esc(s.title||"Untitled")+"<br><small>"+esc(s.branch||"")+" · "+esc(s.cwd.split("/").pop()||"")+" · session "+s.id.slice(0,8)+'</small></div><div class="hb"><span data-act="pin">'+(s.pinned?"Unpin":"Pin")+'</span><span data-act="roles">Type: '+esc(s.role)+'</span><span data-act="skills">Skills</span><span data-act="files">Files</span><span data-act="mute">'+(muted[s.id]?"Unmute":"Mute")+"</span></div>";
 const over=L.sessionTokens&&s.tokens.used>=L.sessionTokens,pct=L.sessionTokens?Math.min(100,s.tokens.used/L.sessionTokens*100):0;
 $("meter").innerHTML='<div class="meter"><span>'+(mtag(s)||esc(s.agent))+"</span>"+(L.sessionTokens?'<div class="bar'+(over?" hot":"")+'"><i style="width:'+pct+'%"></i></div><span>'+kt(s.tokens.used)+" / "+kt(L.sessionTokens)+"</span>":'<span style="flex:1">'+kt(s.tokens.used)+" tokens · "+kt(s.tokens.cached)+" cached</span>")+(s.lower?'<button class="btn'+(over?" go":"")+'" data-act="down">Move to '+s.lower+"</button>":"")+"</div>";
 $("skills").innerHTML=showSkills?'<div class="skills">'+s.skills.map(k=>'<div class="sk" data-skill="'+esc(k.name)+'" title="'+esc(k.source+"/"+k.path)+'"><b>/'+esc(k.name)+"</b><p>"+esc(k.what)+"</p></div>").join("")+"</div>":"";
 $("roles").innerHTML=showRoles&&OPT?'<div class="roles"><span class="rc'+(s.roleSet?"":" on")+'" data-act="setrole" data-role="" style="--c:#8a8a99">Auto</span>'+chips(s.roleSet?s.role:"","","setrole")+"</div>":"";
 const mine=C.filter(c=>c.sessions.includes(s.id));
 $("warns").innerHTML=mine.filter(c=>!muted[s.id]).map(c=>{const other=c.sessions.filter(x=>x!==s.id).map(x=>(S.find(y=>y.id===x)||{role:"another session"}).role).join(", ");return '<div class="warn" data-act="go" data-file="'+esc(c.file)+'" data-other="'+c.sessions.find(x=>x!==s.id)+'"><span>⚠ '+esc(other)+" also edited "+esc(c.file.split("/").pop())+" in the last 10 min</span><span>Open "+esc(other)+"</span></div>"}).join("");
 const feed=$("feed"),stick=feed.scrollTop+feed.clientHeight>=feed.scrollHeight-40;
 const key=s.id+":"+s.feed.length+":"+(s.feed.at(-1)?.at??0)+":"+state(s);
 if(key!==feedKey){feedKey=key;
 feed.innerHTML=s.feed.map(m=>'<div class="msg" data-msg><time>'+hm(m.at)+"</time><div><b>"+(m.who==="you"?"You":esc(s.role))+"</b>"+(m.text?"<p>"+esc(m.text)+"</p>":"")+(m.tools.length?'<div class="tools">'+m.tools.map(t=>'<span class="tool" data-act="tool">'+esc(t)+"</span>").join("")+"</div>":"")+"</div></div>").join("")+(state(s)==="g"?'<div class="typing"><i></i><i></i><i></i></div>':"");
 if(stick||first)feed.scrollTop=feed.scrollHeight;}
 if(composerFor!==s.id){composerFor=s.id;$("box").outerHTML='<div class="compose" id="box"><i class="glow"></i><i class="sh"></i><i class="line"></i><i class="fill"></i><div class="sky"><div class="fairy"><i class="wl"></i><i class="wr"></i><b></b></div><div class="fairy f2"><i class="wl"></i><i class="wr"></i><b></b></div></div><div class="row"><div class="watch">'+face(s,28)+'</div><textarea id="msg" rows="1" placeholder="Message '+esc(s.role)+(s.agent==="codex"?" (Codex)":"")+'…"></textarea><span class="ch" id="ch">0</span><div class="eq"><i></i><i></i><i></i><i></i></div><span class="rs" data-act="resume" title="Copy the resume command">⧉</span><button class="send" data-act="send">Send</button></div></div>';restoreDraft(s.id)}
 const sb=document.querySelector(".send");if(sb){sb.disabled=!!s.sending;sb.textContent=s.sending?"Answering…":"Send"}
 first=false;
}
async function load(){if(showLimits&&document.activeElement?.id==="lim")return;try{const r=await fetch("api/sessions");const t=await r.text();if(t===last)return;last=t;const j=JSON.parse(t);if(j.build){if(!BUILD0)BUILD0=j.build;else if(j.build!==BUILD0){location.reload();return}}S=j.sessions;C=j.clashes;L=j.limits;if(wantSel&&S.find(x=>x.id===wantSel)){sel=wantSel;first=true;wantSel=""}render()}catch{}}
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
  else if(k==="limits"){showLimits=!showLimits;if(showLimits)LIM={tokens:L.sessionTokens,auto:L.autoDowngrade};render()}
  else if(k==="save"){post("api/limits",{sessionTokens:LIM.tokens,autoDowngrade:LIM.auto}).then(l=>{L=l;showLimits=false;last="";render();toast(l.sessionTokens?"Limit set: "+kt(l.sessionTokens)+" per session":"No token limit")})}
  else if(k==="resume"){navigator.clipboard?.writeText("cd "+s.cwd+" && "+(s.agent==="codex"?"codex resume ":"claude --resume ")+s.id).catch(()=>{});toast("Copied resume command")}
  else if(k==="send"){sendMsg()}
  else if(k==="pin"){pinSession(s.id,!s.pinned)}
  else if(k==="newopen"){openNew()}
  else if(k==="newcancel"){$("dlg").hidden=true}
  else if(k==="newgo"){startNew()}
  else if(k==="newagent"){if(OPT.agents[a.dataset.agent]){ND.agent=a.dataset.agent;ND.agentManual=true;drawNew()}else toast("Not installed on this computer")}
  else if(k==="newrole"){ND.role=a.dataset.role;ND.manual=true;drawNew()}
  else if(k==="roles"){showRoles=!showRoles;opts().then(render)}
  else if(k==="setrole"){post("api/role",{id:s.id,role:a.dataset.role}).then(()=>{last="";load();toast(a.dataset.role?"Now a "+a.dataset.role+" agent":"Back to automatic")})}
  else if(k==="skills"){showSkills=!showSkills;render()}
  else if(k==="down"){post("api/downgrade",{id:s.id}).then(r=>{if(r.error){toast(r.error);return}navigator.clipboard?.writeText("/model "+r.model).catch(()=>{});toast("New sessions use "+r.model+". Copied /model "+r.model+" for this one")})}
  return}
 const lb=e.target.closest("[data-lim]");if(lb){LIM.tokens=Math.max(0,LIM.tokens+Number(lb.dataset.lim));renderLim();return}
 const ls=e.target.closest("[data-limset]");if(ls){LIM.tokens=Number(ls.dataset.limset);renderLim();return}
 const lw=e.target.closest("#lp [data-sw]");if(lw){LIM.auto=!LIM.auto;renderLim();return}
 const sk=e.target.closest("[data-skill]");if(sk){navigator.clipboard?.writeText("/"+sk.dataset.skill).catch(()=>{});toast("Copied /"+sk.dataset.skill);return}
 const m=e.target.closest("[data-msg]");if(m){m.classList.toggle("open");return}

});
function fx(cls,x,y,txt,vars){const c=$("box");if(!c)return;const el=document.createElement("span");el.className=cls;el.style.left=x+"px";el.style.top=y+"px";if(txt)el.textContent=txt;for(const k in vars||{})el.style.setProperty(k,vars[k]);c.appendChild(el);el.addEventListener("animationend",()=>el.remove())}
function caretXY(){const t=$("msg"),r=t.getBoundingClientRect(),c=$("box").getBoundingClientRect();const lines=t.value.slice(0,t.selectionStart).split("\\n");const w=Math.max(1,r.width);const col=lines.at(-1).length*7.1;return{x:r.left-c.left+(col%w),y:r.top-c.top+Math.min(r.height,(lines.length-1+Math.floor(col/w))*20)+14}}
document.addEventListener("input",e=>{if(e.target.id!=="msg")return;saveDraft(composerFor,e.target.value);const t=e.target;t.style.height="28px";t.style.height=Math.min(160,Math.max(28,t.scrollHeight))+"px";follow();const c=$("box");c.classList.add("hot");clearTimeout(c._t);c._t=setTimeout(()=>c.classList.remove("hot"),700)});
document.addEventListener("selectionchange",()=>{if(document.activeElement?.id==="msg")follow()});
function follow(){const t=$("msg"),p=caretXY(),w=t.getBoundingClientRect().width;const g=document.querySelector(".compose .glow");if(g){g.style.left=(p.x-45)+"px";g.style.top=(p.y-45)+"px"}
 const l=document.querySelector(".compose .fill");if(l)l.style.width=Math.min(w+40,t.value.length*7.1)+"px";const ch=$("ch");if(ch)ch.textContent=t.value.length;
 const pu=document.querySelector(".watch .pup");if(pu){const dx=Math.max(-3,Math.min(3,(p.x/w)*6-3));pu.style.transform="translate("+(dx+3)+"px,2px)"}}
document.addEventListener("keydown",e=>{if(e.target.id==="msg"&&e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();sendMsg()}});
async function sendMsg(){const t=$("msg"),s=S.find(x=>x.id===sel);if(!t||!s)return;const text=t.value.trim();if(!text){toast("Type a message first");t.focus();return}
 const r=await post("api/send",{id:s.id,text}).catch(()=>({error:"The board is not answering."}));if(r.error){toast(r.error);return}
 fx("sent",0,0,text.replace(/\\s+/g," "));
 t.value="";saveDraft(s.id,"");t.style.height="28px";follow();s.sending=true;const sb=document.querySelector(".send");if(sb){sb.disabled=true;sb.textContent="Answering…"}toast("Sent to "+s.role);last=""}
let OPT=null,ND=null,wantSel="",showRoles=false,dt=0,LIM={tokens:0,auto:false};
const dk=id=>"rma-draft-"+id;
function saveDraft(id,v){try{if(v)localStorage.setItem(dk(id),v);else localStorage.removeItem(dk(id))}catch(e){}}
function loadDraft(id){try{return localStorage.getItem(dk(id))||""}catch(e){return""}}
function restoreDraft(id){const t=$("msg");if(!t)return;t.value=loadDraft(id);if(t.value){t.style.height="28px";t.style.height=Math.min(160,Math.max(28,t.scrollHeight))+"px";follow()}}
function mini(f,n){return '<svg width="'+n+'" height="'+n+'" viewBox="0 0 64 64">'+SH[f.shape](f.color)+EY[f.eyes]+"</svg>"}
const EFFORTS=["low","medium","high","xhigh","max"],ECOL=["#22c55e","#6ee7a0","#fbbf24","#fb923c","#f43f5e"],ELAB={low:"L",medium:"M",high:"H",xhigh:"X",max:"MAX"};
const MODELS=[["","AUTO",-72,"#a1a1b3"],["haiku","HAIKU",-24,"#6ee7a0"],["sonnet","SONNET",24,"#38bdf8"],["opus","OPUS",72,"#fbbf24"]];
function polar(a,r){const t=a*Math.PI/180;return[60+r*Math.sin(t),62-r*Math.cos(t)]}
function dialHtml(cur){const d=MODELS.find(m=>m[0]===cur)||MODELS[0];let ticks="";
 for(let i=0;i<=12;i++){const a=-90+15*i,p1=polar(a,39),p2=polar(a,i%3?37:34);ticks+='<line x1="'+p1[0].toFixed(1)+'" y1="'+p1[1].toFixed(1)+'" x2="'+p2[0].toFixed(1)+'" y2="'+p2[1].toFixed(1)+'" stroke="#3a3a48" stroke-width="1"/>'}
 const dots=MODELS.map(([k,l,a,c])=>{const p=polar(a,46);return '<circle class="mdot" data-model="'+k+'" data-k="'+k+'" data-c="'+c+'" cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="5" fill="'+(k===cur?c:"#2c2c3a")+'"/>'}).join("");
 return '<svg viewBox="0 0 120 70" class="gsv"><path d="M10 62A50 50 0 0 1 110 62" fill="none" stroke="url(#gm)" stroke-width="5" stroke-linecap="round" opacity=".5"/>'+ticks+dots+'<g class="needle idle" data-needle="1" style="--a:'+d[2]+'deg"><line x1="60" y1="62" x2="60" y2="25" stroke="#fff" stroke-width="2" stroke-linecap="round"/></g><circle cx="60" cy="62" r="6" fill="url(#hub)"/></svg><div class="mls">'+MODELS.map(([k,l,a,c])=>'<span class="ml'+(k===cur?" on":"")+'" data-model="'+k+'" style="--c:'+c+'">'+l+"</span>").join("")+"</div>"}
function updateDial(root,m){const d=MODELS.find(x=>x[0]===m)||MODELS[0];root.querySelector("[data-needle]").style.setProperty("--a",d[2]+"deg");root.querySelectorAll(".mdot").forEach(c=>c.setAttribute("fill",c.dataset.k===m?c.dataset.c:"#2c2c3a"));root.querySelectorAll(".ml").forEach(l=>l.classList.toggle("on",l.dataset.model===m))}
function ledsHtml(cur){const ci=EFFORTS.indexOf(cur);return '<div class="leds">'+EFFORTS.map((e,i)=>'<i class="led'+(i<=ci?" on":"")+'" data-effort="'+e+'" title="'+e+'" style="--i:'+i+';--c:'+ECOL[i]+';height:'+(14+i*7)+'px"></i>').join("")+'</div><div class="elab">'+EFFORTS.map(e=>'<span data-effort="'+e+'">'+ELAB[e]+"</span>").join("")+'</div><div class="gcap">effort<b data-ecap>'+(cur?cur.toUpperCase():"AUTO")+'</b></div><span class="autob" data-effort="">AUTO</span>'}
function updateLeds(root,ef){const i=EFFORTS.indexOf(ef);root.querySelectorAll(".led").forEach((l,j)=>l.classList.toggle("on",j<=i));root.querySelector("[data-ecap]").textContent=ef?ef.toUpperCase():"AUTO"}
async function opts(){if(!OPT)OPT=await fetch("api/options").then(r=>r.json());return OPT}
function chips(cur,auto,act){return OPT.roles.map(o=>'<span class="rc'+(o.role===cur?" on":"")+'" data-act="'+act+'" data-role="'+esc(o.role)+'" style="--c:'+o.color+'">'+mini(o,20)+esc(o.role)+(auto&&o.role===auto?"<em>AUTO</em>":"")+"</span>").join("")}
function folderName(p){const a=p.split("/").filter(Boolean);return a.slice(-2).join("/")||p}
function markFolders(){const v=$("ncwd")?$("ncwd").value.trim():"";document.querySelectorAll("#nfold .fc").forEach(c=>c.classList.toggle("on",c.dataset.folder===v))}
function drawNew(){const o=OPT;
 $("nagent").innerHTML=[["claude","Claude Code"],["codex","Codex"]].map(([k,l])=>'<span class="sg'+(ND.agent===k?" on":"")+(o.agents[k]?"":" off")+'" data-act="newagent" data-agent="'+k+'">'+l+(o.agents[k]?"":" (not installed)")+"</span>").join("");
 $("nrole").innerHTML=chips(ND.role,ND.manual?"":ND.role,"newrole");
 $("nauto").textContent=ND.manual?"you picked":"detected from your text";
 $("nmrow").style.display=ND.agent==="claude"?"":"none";markFolders()}
async function openNew(){await opts();const cur=S.find(x=>x.id===sel)||S[0]||{};
 ND={agent:OPT.defaultAgent,role:"Code",manual:false,agentManual:false,model:"",effort:""};
 const d=$("dlg");d.hidden=false;
 d.innerHTML='<div class="dbg" data-act="newcancel"></div><div class="dcard gx"><div class="in"><div class="dhd"><h3>New session</h3><span class="dsub">the board starts it for you</span></div><div class="tbox"><textarea id="ntext" placeholder="What should the agent do?"></textarea></div><div class="lbl">AI</div><div class="seg" id="nagent"></div><div class="lbl">Agent type <em id="nauto"></em></div><div class="chips" id="nrole"></div><div class="lbl">Folder</div><div class="fch" id="nfold">'+OPT.folders.map(f=>'<span class="fc" data-folder="'+esc(f)+'" title="'+esc(f)+'">'+esc(folderName(f))+"</span>").join("")+'</div><div class="fbox"><input class="f" id="ncwd" autocomplete="off" spellcheck="false" placeholder="/path/to/project"></div><div id="nmrow" class="nrow"><div class="gc"><div class="gcap" style="margin:0 0 2px">model</div>'+dialHtml("")+'</div><div class="gc">'+ledsHtml("")+'</div></div><div class="dact"><button class="btn" data-act="newcancel">Cancel</button><button class="btn new" data-act="newgo">Start</button></div></div></div>';
 $("ncwd").value=cur.cwd||OPT.folders[0]||"";$("ntext").value=loadDraft("new");drawNew();$("ntext").focus();
 const card=d.querySelector(".dcard");requestAnimationFrame(()=>requestAnimationFrame(()=>card.classList.add("live")))}
$("dlg").addEventListener("click",e=>{const t=e.target;let el;
 if(el=t.closest("[data-model]")){ND.model=el.dataset.model;updateDial($("dlg"),ND.model);e.stopPropagation();return}
 if(el=t.closest("[data-effort]")){ND.effort=el.dataset.effort;updateLeds($("dlg"),ND.effort);e.stopPropagation();return}
 if(el=t.closest("[data-folder]")){$("ncwd").value=el.dataset.folder;markFolders();e.stopPropagation();return}});
document.addEventListener("input",e=>{if(e.target.id==="ncwd")markFolders()});
document.addEventListener("input",e=>{if(e.target.id!=="ntext")return;saveDraft("new",e.target.value);clearTimeout(dt);dt=setTimeout(async()=>{const t=$("ntext")&&$("ntext").value;if(!t||!ND)return;const r=await fetch("api/detect?text="+encodeURIComponent(t)).then(r=>r.json()).catch(()=>null);if(!r||!ND)return;if(!ND.manual)ND.role=r.role;if(!ND.agentManual&&r.agent)ND.agent=r.agent;drawNew()},200)});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){hideMenu();if(!$("dlg").hidden)$("dlg").hidden=true}if(e.target.id==="ntext"&&e.key==="Enter"&&(e.metaKey||e.ctrlKey)){e.preventDefault();startNew()}});
async function startNew(){const text=$("ntext").value.trim();if(!text){toast("Describe the task first");$("ntext").focus();return}
 const r=await post("api/new",{agent:ND.agent,cwd:$("ncwd").value.trim(),text,role:ND.manual?ND.role:"",model:ND.agent==="claude"?ND.model:"",effort:ND.agent==="claude"?ND.effort:""}).catch(()=>({error:"The board is not answering."}));
 if(r.error){toast(r.error);return}
 $("dlg").hidden=true;saveDraft("new","");wantSel=r.id||"";toast("Started a "+ND.role+" agent on "+(ND.agent==="codex"?"Codex":"Claude Code"));[1500,5000,12000].forEach(t=>setTimeout(()=>{last="";load()},t))}
function limPanel(){const pre=[[0,"OFF"],[500000,"500k"],[1000000,"1M"],[2000000,"2M"],[5000000,"5M"]];
 return '<div class="panel lp gx live" id="lp"><div class="lbl">Token limit per session</div><div class="lnum"><span class="lbtn" data-lim="-250000">&minus;</span><b id="limv">'+(LIM.tokens?limLabel(LIM.tokens):"OFF")+'</b><span class="lbtn" data-lim="250000">+</span></div><div class="fch lchips">'+pre.map(([v,l])=>'<span class="fc'+(LIM.tokens===v?" on":"")+'" data-limset="'+v+'">'+l+"</span>").join("")+'</div><div class="swr" data-sw="auto"><span>At the limit, move new sessions to a cheaper model</span><i class="swt'+(LIM.auto?" on":"")+'"><b></b></i></div><div class="lbl" style="font-size:10px">Models only move down: Opus, then Sonnet, then Haiku.</div><button class="btn go" data-act="save">Save</button></div>'}
function renderLim(){const p=$("lp");if(!p)return;const v=$("limv");v.textContent=LIM.tokens?limLabel(LIM.tokens):"OFF";v.classList.remove("bump");void v.offsetWidth;v.classList.add("bump");p.querySelectorAll("[data-limset]").forEach(c=>c.classList.toggle("on",Number(c.dataset.limset)===LIM.tokens));p.querySelector(".swt").classList.toggle("on",LIM.auto)}
function pinSession(id,on){post("api/pin",{id,pinned:on}).then(r=>{if(r.error){toast(r.error);return}last="";load();toast(on?"Pinned to the top":"Unpinned")})}
function cp(t){navigator.clipboard?.writeText(t).catch(()=>{});toast("Copied")}
function openIn(id,target){post("api/open",{id,target}).then(r=>toast(r.error||"Opened"))}
let MENU=null;
function hideMenu(){if(MENU){MENU.el.remove();MENU=null}}
function showMenu(x,y,items,head,sid){hideMenu();const m=document.createElement("div");m.className="cmenu";
 m.innerHTML=(head||"")+items.map((it,i)=>it==="-"?'<div class="msep"></div>':'<div class="mi'+(it.danger?" dng":"")+'" data-mi="'+i+'"><span>'+esc(it.label)+"</span><em>"+esc(it.hint||"")+"</em></div>"+(it.sub?'<div class="msub" data-sub="'+i+'">'+it.sub+"</div>":"")).join("");
 m.addEventListener("click",menuClick);document.body.appendChild(m);const r=m.getBoundingClientRect();
 m.style.left=Math.max(6,Math.min(x,innerWidth-r.width-6))+"px";m.style.top=Math.max(6,Math.min(y,innerHeight-r.height-6))+"px";MENU={el:m,items,sid}}
function menuClick(e){e.stopPropagation();
 const rc=e.target.closest("[data-mrole]");if(rc){const id=MENU.sid,role=rc.dataset.mrole;hideMenu();post("api/role",{id,role}).then(()=>{last="";load();toast(role?"Now a "+role+" agent":"Back to automatic")});return}
 const mi=e.target.closest("[data-mi]");if(!mi)return;const item=MENU.items[Number(mi.dataset.mi)];
 if(item.sub){MENU.el.querySelector('[data-sub="'+mi.dataset.mi+'"]').classList.toggle("on");return}
 hideMenu();if(item.run)item.run()}
const ICON={finder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',terminal:'<path d="M4 6l6 6-6 6M12 18h8" stroke-linecap="round"/>',vscode:'<path d="M9 7l-5 5 5 5M15 7l5 5-5 5" stroke-linecap="round"/>',skills:'<path d="M12 3l2.4 5.2 5.6.7-4.1 3.9 1.1 5.6-5-2.8-5 2.8 1.1-5.6L4 8.9l5.6-.7z" stroke-linejoin="round"/>'};
const TILES=[["finder","Finder"],["terminal","Terminal"],["vscode","VS Code"],["skills","Skills"]];
function gaugePanel(s){
 const lim=L.sessionTokens,pct=Math.max(0,Math.min(1,s.tokens.used/(lim||2000000))),claude=s.agent==="claude",cm=(s.tune&&s.tune.model)||"",ce=(s.tune&&s.tune.effort)||"";
 let ticks="";for(let i=0;i<=10;i++){const a=-90+18*i,p1=polar(a,41),p2=polar(a,i%5?38:35);ticks+='<line x1="'+p1[0].toFixed(1)+'" y1="'+p1[1].toFixed(1)+'" x2="'+p2[0].toFixed(1)+'" y2="'+p2[1].toFixed(1)+'" stroke="#3a3a48" stroke-width="1"/>'}
 const tok='<svg viewBox="0 0 120 70" class="gsv"><path d="M10 62A50 50 0 0 1 110 62" fill="none" stroke="#242430" stroke-width="9" stroke-linecap="round"/><path class="arc" d="M10 62A50 50 0 0 1 110 62" fill="none" stroke="url(#gz)" stroke-width="9" stroke-linecap="round" pathLength="100" stroke-dasharray="100" style="--p:'+(pct*100).toFixed(1)+'"/>'+ticks+'<g class="needle'+(pct>=.7?" hot":" idle")+'" style="--a:'+(-90+180*pct).toFixed(1)+'deg"><line x1="60" y1="62" x2="60" y2="24" stroke="#fff" stroke-width="2" stroke-linecap="round"/></g><circle cx="60" cy="62" r="6" fill="url(#hub)"/></svg>';
 return '<div class="gh">'+mini(s.face,34)+'<div style="min-width:0"><b>'+esc(s.title||"Untitled session")+'</b><div class="tags"><span class="rl" style="color:'+s.face.color+';background:color-mix(in srgb,'+s.face.color+' 18%,transparent)">'+esc(s.role)+'</span><span class="ag '+s.agent+'">'+(s.agent==="codex"?"CODEX":"CLAUDE")+"</span>"+mtag(s)+"</div></div></div>"
 +'<div class="gg2"><div class="gc">'+tok+'<div class="gcap">tokens<b>'+kt(s.tokens.used)+(lim?" / "+kt(lim):"")+'</b></div></div><div class="gc'+(claude?"":" off")+'">'+ledsHtml(ce)+"</div></div>"
 +'<div class="gc'+(claude?"":" off")+'"><div class="gcap" style="margin:0 0 2px">model for this agent'+(claude?"":" (Claude Code only)")+"</div>"+dialHtml(cm)+"</div>"
 +'<div class="swg"><div class="swr" data-sw="pin"><span>Pinned</span><i class="swt'+(s.pinned?" on":"")+'"><b></b></i></div><div class="swr" data-sw="mute"><span>Mute clash warnings</span><i class="swt'+(muted[s.id]?" on":"")+'"><b></b></i></div></div>'
 +'<div class="gcard"><div class="gcap" style="margin:2px 4px 4px;text-align:left">agent type</div><div class="gt2"><span class="rc'+(s.roleSet?"":" on")+'" data-mrole="" style="--c:#8a8a99">Auto</span>'+OPT.roles.map(o=>'<span class="rc'+(s.roleSet&&o.role===s.role?" on":"")+'" data-mrole="'+esc(o.role)+'" style="--c:'+o.color+'">'+mini(o,18)+esc(o.role)+"</span>").join("")+"</div></div>"
 +'<div class="tiles">'+TILES.map(([k,l])=>'<div class="tl" data-tile="'+k+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">'+ICON[k]+"</svg>"+l+"</div>").join("")+"</div>"
 +'<div class="cpy"><span class="cb" data-copy="name">Name</span><span class="cb" data-copy="id">ID</span><span class="cb" data-copy="resume">Resume cmd</span></div>'}
function tune(s,patch){s.tune=Object.assign({},s.tune,patch);return post("api/tune",Object.assign({id:s.id},patch)).then(r=>{if(r.error)toast(r.error);return r})}
function showPanel(x,y,s){hideMenu();const el=document.createElement("div");el.className="cmenu gp gx";el.innerHTML=gaugePanel(s);el.addEventListener("click",gpClick);document.body.appendChild(el);
 const r=el.getBoundingClientRect();el.style.left=Math.max(6,Math.min(x,innerWidth-r.width-6))+"px";el.style.top=Math.max(6,Math.min(y,innerHeight-r.height-6))+"px";MENU={el,items:[],sid:s.id};
 requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add("live")))}
function gpClick(e){e.stopPropagation();const s=S.find(x=>x.id===MENU.sid);if(!s)return;const t=e.target,root=MENU.el;let el;
 if(el=t.closest("[data-model]")){if(s.agent!=="claude"){toast("Model applies to Claude Code agents");return}const m=el.dataset.model;updateDial(root,m);tune(s,{model:m}).then(r=>{if(r.error)return;if(m)navigator.clipboard?.writeText("/model "+m).catch(()=>{});toast(m?m.toUpperCase()+" for messages from the board. Copied /model "+m+" for the Claude app":"Model back to automatic")});return}
 if(el=t.closest("[data-effort]")){if(s.agent!=="claude"){toast("Effort applies to Claude Code agents");return}const ef=el.dataset.effort;updateLeds(root,ef);tune(s,{effort:ef}).then(r=>{if(!r.error)toast(ef?ef.toUpperCase()+" effort for messages from the board":"Effort back to automatic")});return}
 if(el=t.closest("[data-sw]")){const k=el.dataset.sw;el.querySelector(".swt").classList.toggle("on");if(k==="pin"){const on=!s.pinned;s.pinned=on;pinSession(s.id,on)}else{muted[s.id]=!muted[s.id];render();toast(muted[s.id]?"Clash warnings hidden":"Clash warnings shown")}return}
 if(el=t.closest("[data-mrole]")){const role=el.dataset.mrole;hideMenu();post("api/role",{id:s.id,role}).then(()=>{last="";load();toast(role?"Now a "+role+" agent":"Back to automatic")});return}
 if(el=t.closest("[data-tile]")){const k=el.dataset.tile;hideMenu();if(k==="skills"){sel=s.id;showSkills=true;first=true;render()}else openIn(s.id,k);return}
 if(el=t.closest("[data-copy]")){const k=el.dataset.copy;cp(k==="name"?(s.title||""):k==="id"?s.id:"cd "+s.cwd+" && "+(s.agent==="codex"?"codex resume ":"claude --resume ")+s.id);return}}
document.addEventListener("contextmenu",async e=>{const tg=e.target.tagName;if(tg==="TEXTAREA"||tg==="INPUT"||tg==="SELECT")return;e.preventDefault();if(e.target.closest(".cmenu"))return;hideMenu();
 const x=e.clientX,y=e.clientY,row=e.target.closest("[data-sel]"),face=e.target.closest("[data-face]"),hd=e.target.closest("#hd");
 const id=row?row.dataset.sel:face?face.dataset.face:hd?sel:"";
 if(id){const s=S.find(v=>v.id===id);if(s){await opts();showPanel(x,y,s)}return}
 const m=e.target.closest("[data-msg]");if(m){const tx=(m.querySelector("p")||{}).textContent||"";showMenu(x,y,[{label:"Copy message",run:()=>cp(tx)}],"","")}});
document.addEventListener("click",e=>{if(MENU&&!e.target.closest(".cmenu"))hideMenu()});
window.addEventListener("blur",hideMenu);window.addEventListener("resize",hideMenu);
load();setInterval(load,3000);
</script></body></html>`;
