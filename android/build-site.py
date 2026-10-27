#!/usr/bin/env python3
"""APK-only HTML enhancements; do not modify website source or GitHub Pages."""
from pathlib import Path
import shutil
import base64

root=Path(__file__).resolve().parent.parent
android=root/'android'
site=android/'app/src/main/assets/site'
if not (site/'index.html').is_file():
    raise SystemExit('Build the site folder before applying Android overrides.')

def inject(path, markup, anchor):
    f=site/path
    html=f.read_text(encoding='utf-8')
    if html.count(anchor)!=1:
        raise SystemExit(f'Invalid HTML insertion location: {path} ({anchor})')
    f.write_text(html.replace(anchor,markup+'\n'+anchor,1),encoding='utf-8')

for name in ['arcade-shell.js','arcade-shell.css','game-timur.css','game-tea.css','toffi-mobile-b2.js','toffi-mobile-b2.css','toffi-pixel-ui.css','toffi-pixel-ui.js','tea-start-menu.css','tea-start-menu.js']:
    shutil.copy2(android/name,site/('android-'+name))

inject(Path('index.html'),
       '<link rel="stylesheet" href="android-arcade-shell.css">',
       '</head>')
inject(Path('index.html'),
       '<script src="android-arcade-shell.js" defer></script>',
       '</body>')
inject(Path('arcade/index.html'),
       '<link rel="stylesheet" href="../android-game-timur.css">',
       '</head>')
inject(Path('krymskiy-chai/index.html'),
       '<link rel="stylesheet" href="../android-game-tea.css">',
       '</head>')

# Pixelated approved title-screen painting is decoded ONLY into APK assets.
art=android/'tea-menu-art.b64'
if not art.is_file():
    raise SystemExit('Missing approved Krymskiy Chai menu artwork')
menu_image=site/'krymskiy-chai/assets/tea-menu.webp'
menu_image.write_bytes(base64.b64decode(art.read_text(encoding='ascii').strip(),validate=True))
if not menu_image.read_bytes().startswith(b'RIFF'):
    raise SystemExit('Invalid menu artwork')

# The original game already keeps a local best score. Add Android-only
# API for the launcher and separate persisted volume controls, preserving
# web gameplay and its score logic unchanged.
tea_file=site/'krymskiy-chai/game.js'
tea=tea_file.read_text(encoding='utf-8')
def tea_patch(old,new):
    global tea
    if tea.count(old)!=1:
        raise SystemExit(f'Tea script changed; patch anchor found {tea.count(old)} times: {old[:90]}')
    tea=tea.replace(old,new,1)
tea_patch("soundtrack.volume = .35;",
"""let musicVolume=.35,sfxVolume=.85;
try{
 const cfg=JSON.parse(localStorage.getItem('krymskiy-tea-audio-v1')||'null');
 if(cfg){musicVolume=clamp(Number(cfg.music),0,1);sfxVolume=clamp(Number(cfg.effects),0,1);}
 if(!Number.isFinite(musicVolume))musicVolume=.35;
 if(!Number.isFinite(sfxVolume))sfxVolume=.85;
}catch(_e){}
soundtrack.volume=musicVolume;
function saveVolumes(){try{localStorage.setItem('krymskiy-tea-audio-v1',JSON.stringify({music:musicVolume,effects:sfxVolume}))}catch(_e){}}
""")
tea_patch("if(soundOn && phase === 'playing' && !document.hidden){",
          "if(soundOn && musicVolume>0 && phase === 'playing' && !document.hidden){")
tea_patch("function noise(f=540,d=.12,kind='square'){if(!soundOn)return;",
          "function noise(f=540,d=.12,kind='square'){if(!soundOn || sfxVolume<=0)return;")
tea_patch("g.gain.setValueAtTime(.085,now)","g.gain.setValueAtTime(.085*sfxVolume,now)")
tea_patch("  score+=amount;","  score+=amount;saveBest();")
# Existing native record key remains unchanged across app updates.
tea_patch("Promise.all(Object.entries(files).map(",
"""window.KrymskiyTeaAndroid={
  isReady:()=>!['loading','error'].includes(phase),
  getPhase:()=>phase,
  start:()=>{if(['loading','error'].includes(phase))return false;reset();return true;},
  getBest:()=>Math.max(best,score),
  getVolumes:()=>({music:musicVolume,effects:sfxVolume}),
  setVolumes:(music,effects)=>{
   musicVolume=clamp(Number(music)||0,0,1);sfxVolume=clamp(Number(effects)||0,0,1);
   soundtrack.volume=musicVolume;saveVolumes();syncSoundtrack();
  }
};
Promise.all(Object.entries(files).map(""")
tea_patch("setPhase('ready'); showStartDialog();","setPhase('ready'); showStartDialog();window.dispatchEvent(new Event('tea-game-ready'));")
tea_file.write_text(tea,encoding='utf-8')
inject(Path('krymskiy-chai/index.html'),
       '<link rel="stylesheet" href="../android-tea-start-menu.css">',
       '</head>')
inject(Path('krymskiy-chai/index.html'),
       '<script src="../android-tea-start-menu.js"></script>',
       '</body>')


# New pixel-rendered HUD B2 is opt-in for the bundled Android game only.
# Main GitHub Pages Toffi Rage retains the old right-hand HUD untouched.
inject(Path('toffi-rage/index.html'),
       '<link rel="stylesheet" href="../android-toffi-mobile-b2.css">',
       '</head>')
inject(Path('toffi-rage/index.html'),
       '<script src="../android-toffi-mobile-b2.js"></script>',
       '</body>')
# This stylesheet is placed after the source CSS so it wins all specificity ties.
inject(Path('toffi-rage/index.html'),
       '<link rel="stylesheet" href="../android-toffi-pixel-ui.css">',
       '</head>')
inject(Path('toffi-rage/index.html'),
       '<script src="../android-toffi-pixel-ui.js"></script>',
       '</body>')
# Remove the black "ТВОЁ УПРАВЛЕНИЕ" banner from the APK game scene itself.
# This function is called on every decompressed level before its iframe loads.
game = site/'toffi-rage/index.html'
source=game.read_text(encoding='utf-8')
needle='function patchLevelHTML(i,shell){return shell;}'
if source.count(needle)!=1:
    raise SystemExit('Unsupported Toffi wrapper: patchLevelHTML changed')
source=source.replace(needle,
    """function patchLevelHTML(i,shell){
  shell=shell.replace('drawHUD();drawTopLabel();','drawHUD();');
  if(i!==3)return shell;
  // The source of truth is the actual in-game drawBoss() code.
  // Split it into two rendering passes without recreating sprite animation,
  // dialogue text, frame timing, or movement.
  const start=shell.indexOf('function drawBoss(){');
  const NL=String.fromCharCode(10);
  const end=shell.indexOf(NL+'function drawTraffic()',start);
  if(start<0||end<0)throw Error('Original bonus drawBoss() not found');
  const original=shell.slice(start,end);
  const pivot=original.indexOf(' const bob=Math.sin(state.time*5)*4;');
  if(pivot<0||!original.trimEnd().endsWith(' ctx.restore();'+NL+'}'))throw Error('Bonus drawBoss() changed');
  const beam=original.slice(0,pivot).replace('function drawBoss(){','function drawBossBeam(){')+
    ' ctx.restore();'+NL+'}';
  if(!original.includes('const bx=clamp(b.x+36,10,W-bw-10), by=8;'))
    throw Error('Original bonus speech layout changed');
  const foreground='function drawBossForeground(targetCtx){'+NL+' const ctx=targetCtx;'+NL+
    " const b=state.boss;"+NL+" if(b.phase==='hidden'||b.phase==='gone')return;"+NL+
    ' ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();'+NL+
    original.slice(pivot).replace(
      // The original bubble used the full 435px desktop scene as its bounds.
      // Mobile shows the original 270px road, so clamp within that visible area.
      'const bx=clamp(b.x+36,10,W-bw-10), by=8;',
      'const bx=clamp(b.x+36,10,VW-bw-10), by=8;'
    );
  // Foreground is drawn by the SAME original code in the Android overlay.
  // Beam and warnings remain in original road canvas.
  shell=shell.slice(0,start)+beam+NL+foreground+shell.slice(end);
  const oldRender='drawHUD();drawBoss();drawPopText();';
  if(!shell.includes(oldRender))throw Error('Original bonus render call changed');
  shell=shell.replace(oldRender,'drawHUD();drawBossBeam();drawPopText();');
  // Remove original translucent КПП / gate instruction from road.
  shell=shell.replace('drawTopLabel();drawPlayer();','drawPlayer();');
  const exposed='window.__toffi={';
  if(!shell.includes(exposed))throw Error('Original bonus debug bridge changed');
  shell=shell.replace(exposed,
    "window.__toffiBossBridge={renderForeground:(targetCtx)=>drawBossForeground(targetCtx),"+
    "active:()=>!['hidden','gone'].includes(state.boss.phase),"+
    "snapshot:()=>({phase:state.boss.phase,x:state.boss.x})};window.__toffi={");
  return shell;
}""")

game.write_text(source,encoding='utf-8')

for rel in ['android-arcade-shell.js','android-arcade-shell.css',
            'android-game-timur.css','android-game-tea.css',
            'android-toffi-mobile-b2.js','android-toffi-mobile-b2.css',
            'android-toffi-pixel-ui.js','android-toffi-pixel-ui.css',
            'android-tea-start-menu.css','android-tea-start-menu.js',
            'club.js','progress.js']:
    if not (site/rel).is_file():
        raise SystemExit(f'Missing required Android asset: {rel}')

assert 'android-arcade-shell.js' in (site/'index.html').read_text()
assert 'android-toffi-mobile-b2.js' in (site/'toffi-rage/index.html').read_text()
assert 'android-toffi-pixel-ui.css' in (site/'toffi-rage/index.html').read_text()
assert 'android-toffi-pixel-ui.js' in (site/'toffi-rage/index.html').read_text()
assert "drawBossForeground(targetCtx)" in (site/'toffi-rage/index.html').read_text()
assert "VW-bw-10" in (site/'toffi-rage/index.html').read_text()
assert "verticalShift" in (site/'android-toffi-mobile-b2.js').read_text()
assert "drawBossBeam()" in (site/'toffi-rage/index.html').read_text()
print('Android-exclusive arcade fullscreen, pause menu and stage styles packaged.')
