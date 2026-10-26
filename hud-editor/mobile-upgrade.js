/* HUD Editor v2: mobile layout and phone-shaped canvas. */
window.OLDfagHudMobileUpgrade=function(html){
 const rep=(a,b,name)=>{const n=html.split(a).length-1;if(n!==1)throw Error('Editor v2 '+name+' ('+n+')');html=html.replace(a,b);};
 rep('<option value="original">Оригинал · HUD справа</option><option value="phone">Телефон · 412×915</option><option value="small">Телефон · 360×800</option><option value="wide">Альбомный · 960×540</option><option value="custom">Свой размер</option>',
 '<option value="oneplus15">OnePlus 15 · 424×924</option><option value="iphone17">iPhone 17 · 402×874</option><option value="small">Телефон · 360×800</option><option value="original">Старый холст · 760×900</option><option value="wide">Альбомный · 960×540</option><option value="custom">Свой размер</option>','options');
 rep('<span id="boardSizeLabel">760 × 900 px</span>','<span id="boardSizeLabel">424 × 924 CSS px</span><span id="deviceLabel" class="device-label">ONEPLUS 15</span>','size title');
 rep('<button id="reset">↺ Исходный HUD</button>','<button id="reset">↺ Начальная схема</button>','reset title');
 rep('<div id="items"></div></div></div></div>','<div id="items"></div><div id="safeOverlay" aria-hidden="true"><div class="safeTop"></div><div class="safeBottom"></div><div class="camera"></div></div></div></div></div>','safe overlay');
 rep('<div class="heading">ОБЩАЯ КОМПОНОВКА</div>','<p class="hint">Размеры — в логических CSS-пикселях телефона. На ноутбуке схема уменьшена для просмотра, координаты X/Y/W/H не меняются.</p><div class="heading">ОБЩАЯ КОМПОНОВКА</div>','help');
 rep('<button id="layoutSide">HUD справа</button><button id="layoutTop">HUD сверху</button>','<button id="layoutSide">HUD справа</button><button id="layoutTop">HUD сверху</button><button id="layoutMobile">▣ Мобильная схема</button>','layoutMobile button');
 rep('</style></head><body>',[
 '.board-wrap.phone-preview{border-radius:26px;box-shadow:0 0 0 4px #182c40,0 0 0 7px #8194a1,0 15px 50px #000d;background:#03080e}',
 '.board.phone-preview{border-radius:20px;box-shadow:none}',
 '#safeOverlay{display:none;position:absolute;inset:0;pointer-events:none;z-index:100;border-radius:20px;overflow:hidden}',
 '.board.phone-preview #safeOverlay{display:block}',
 '.safeTop,.safeBottom{position:absolute;left:0;right:0;border-color:#99dfed66;border-style:dashed}',
 '.safeTop{top:0;height:var(--safe-top,36px);border-width:0 0 1px;background:linear-gradient(#3d9cba24,transparent)}',
 '.safeBottom{bottom:0;height:var(--safe-bottom,18px);border-width:1px 0 0;background:linear-gradient(transparent,#3d9cba24)}',
 '.camera{position:absolute;left:50%;top:9px;transform:translateX(-50%);width:100px;height:19px;border-radius:15px;background:#02060cf0;box-shadow:0 0 0 1px #8295a174}',
 '.device-label{display:inline-block;color:#efc579!important;font:800 11px monospace!important;margin-left:10px!important;letter-spacing:.5px}',
 '.workspace{overflow:auto!important}.footbar{flex-wrap:wrap}',
 '</style></head><body>'].join('\n'),'phone css');
 rep('const boardPresets={original:{w:760,h:900},phone:{w:412,h:915},small:{w:360,h:800},wide:{w:960,h:540}};',
 'const boardPresets={oneplus15:{w:424,h:924},iphone17:{w:402,h:874},small:{w:360,h:800},original:{w:760,h:900},wide:{w:960,h:540}};','presets');
 rep("const STORE='toffi-hud-editor-layout-v1';","const STORE='toffi-hud-editor-layout-v2';",'save v2');
 const phoneFn=[
 'function phoneLayout(W,H){',
 'const pad=Math.max(6,Math.round(W*.018)),gap=Math.max(4,Math.round(W*.012)),top=Math.round(H*.057);',
 'const a=Math.round(W*.30),b=Math.round(W*.34),bx=pad+a+gap,cx=bx+b+gap,c=W-cx-pad;',
 'const roadY=top+222;',
 'const boxes={logo:{x:pad,y:top,w:a,h:36},timer:{x:pad,y:top+40,w:a,h:51},speed:{x:pad,y:top+93,w:a,h:51},truck:{x:pad,y:top+146,w:a,h:65},',
 'route:{x:bx,y:top+24,w:b,h:162},igor:{x:cx,y:top+15,w:c,h:97},dialog:{x:cx,y:top+116,w:c,h:86},',
 'road:{x:0,y:roadY,w:W,h:H-roadY}};',
 'return deep(defaults).map(i=>{i.rect=boxes[i.id];i.fit=i.id==="road"?"cover":"contain";return i;});',
 '}'].join('\n');
 rep("let state={version:1,canvas:{w:760,h:900},items:deep(defaults)},selected='truck';",
 phoneFn+"\nlet state={version:2,canvas:{w:424,h:924},items:phoneLayout(424,924)},selected='road';",'phone first');
 rep('const usableW=Math.max(200,parent.clientWidth-32),usableH=Math.max(240,parent.clientHeight-32);',
 'const usableW=Math.max(120,parent.clientWidth-32),usableH=Math.max(160,parent.clientHeight-32);','fit phone');
 rep("$('guides').classList.toggle('show',grid);",[
 "$('guides').classList.toggle('show',grid);",
 "const portrait=bh>bw*1.35,iphone=$('preset').value==='iphone17';",
 "$('boardWrap').classList.toggle('phone-preview',portrait);$('board').classList.toggle('phone-preview',portrait);",
 "$('board').style.setProperty('--safe-top',(iphone?62:36)+'px');",
 "$('board').style.setProperty('--safe-bottom',(iphone?34:18)+'px');",
 "const names={iphone17:'IPHONE 17',oneplus15:'ONEPLUS 15',small:'360×800',original:'СТАРЫЙ ХОЛСТ',wide:'АЛЬБОМНЫЙ'};",
 "$('deviceLabel').textContent=names[$('preset').value]||'СВОЙ РАЗМЕР';"
 ].join('\n'),'frame sync');
 rep("$('grid').addEventListener('change',e=>{grid=e.target.checked;fitBoard();});",
 "$('layoutMobile').addEventListener('click',()=>{if(state.canvas.h<=state.canvas.w){inform('Выбери вертикальный экран');return;}if(!confirm('Заменить текущую схему мобильной компоновкой?'))return;state.items=phoneLayout(state.canvas.w,state.canvas.h);selected='road';createItems();fitBoard();inform('Готова мобильная схема — элементы можно двигать вручную');});\n$('grid').addEventListener('change',e=>{grid=e.target.checked;fitBoard();});",'phone action');
 rep("state={version:1,canvas:{w:760,h:900},items:deep(defaults)};selected='truck';$('preset').value='original';createItems();fitBoard();inform('Восстановлена исходная компоновка');",
 "const w=state.canvas.w,h=state.canvas.h;state={version:2,canvas:{w,h},items:h>w?phoneLayout(w,h):deep(defaults)};selected=h>w?'road':'truck';createItems();fitBoard();inform('Начальная схема восстановлена');",'reset phone');
 rep("$('preset').addEventListener('change',()=>{const p=boardPresets[$('preset').value];if(p)applyCanvas(p.w,p.h);});",
 "$('preset').addEventListener('change',()=>{const p=boardPresets[$('preset').value];if(p)applyCanvas(p.w,p.h);inform('Формат изменён, ручная компоновка пропорционально сохранена');});",'switch format');
 rep("try{const s=JSON.parse(localStorage.getItem(STORE)||'null');if(s)loadJSON(s);}catch(e){}",
 "$('preset').value='oneplus15';try{const s=JSON.parse(localStorage.getItem(STORE)||'null');if(s){loadJSON(s);const pair=Object.entries(boardPresets).find(([k,v])=>v.w===state.canvas.w&&v.h===state.canvas.h);$('preset').value=pair?.[0]||'custom';}}catch(e){console.warn('HUD layout restore',e)}",'initial selected device');
 return html;
};