#!/usr/bin/env python3
"""APK-only HTML enhancements; do not modify website source or GitHub Pages."""
from pathlib import Path
import shutil

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

for name in ['arcade-shell.js','arcade-shell.css','game-timur.css','game-tea.css','toffi-mobile-b2.js','toffi-mobile-b2.css','toffi-pixel-ui.css','toffi-pixel-ui.js']:
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
  const expected=['function drawBoss(){','const bob=Math.sin(state.time*5)*4;','drawHUD();drawBoss();drawPopText();','window.__toffi={'];
  for(const token of expected){if(!shell.includes(token))throw Error('Bonus boss layout mismatch: '+token);}
  // Beam and lane warnings remain on the road; the sprite/dialogue are
  // drawn in a separate fullscreen parent layer above the mobile cockpit.
  shell=shell.replace('function drawBoss(){','function drawBossBeam(){');
  shell=shell.replace('const bob=Math.sin(state.time*5)*4;','ctx.restore();return;const bob=Math.sin(state.time*5)*4;');
  shell=shell.replace('drawTopLabel();drawPlayer();','drawPlayer();');
  shell=shell.replace('drawHUD();drawBoss();drawPopText();','drawHUD();drawBossBeam();drawPopText();');
  shell=shell.replace('window.__toffi={', 'window.__toffiBossBridge={snapshot:()=>({boss:state.boss,time:state.time,lines:bossSpeechLines()}),idle:WALRUS_IDLE,attack:WALRUS_ATTACK};window.__toffi={');
  return shell;
}""")
game.write_text(source,encoding='utf-8')

for rel in ['android-arcade-shell.js','android-arcade-shell.css',
            'android-game-timur.css','android-game-tea.css',
            'android-toffi-mobile-b2.js','android-toffi-mobile-b2.css',
            'android-toffi-pixel-ui.js','android-toffi-pixel-ui.css',
            'club.js','progress.js']:
    if not (site/rel).is_file():
        raise SystemExit(f'Missing required Android asset: {rel}')

assert 'android-arcade-shell.js' in (site/'index.html').read_text()
assert 'android-toffi-mobile-b2.js' in (site/'toffi-rage/index.html').read_text()
assert 'android-toffi-pixel-ui.css' in (site/'toffi-rage/index.html').read_text()
assert 'android-toffi-pixel-ui.js' in (site/'toffi-rage/index.html').read_text()
assert "drawBossBeam()" in (site/'toffi-rage/index.html').read_text()
print('Android-exclusive arcade fullscreen, pause menu and stage styles packaged.')
