import re,hashlib,json,shutil,os,sys
SRC='/tmp/claude-0/-home-claude/481a1bd1-1cf9-58e0-b881-a47419fa7a1c/scratchpad/'
ROOT='/home/claude/eredon-kov/'
SHELL='1.2.0'
h=open(SRC+'knights-of-valor.html').read()
ver=re.search(r"const KOV_VER='([\d.]+)'",h).group(1)
h=h.replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','three.min.js')
for d in (ROOT+'game/',ROOT+'site/game/'):
    os.makedirs(d,exist_ok=True)
    open(d+'game.html','w').write(h);shutil.copy(SRC+'t3/three.min.js',d+'three.min.js')
    sha=lambda f:hashlib.sha256(open(d+f,'rb').read()).hexdigest()
    json.dump({'ver':ver,'shell':SHELL,'files':{'game.html':sha('game.html'),'three.min.js':sha('three.min.js')}},open(d+'version.json','w'),indent=1)
print('published',ver,len(h),'-> site/game and game')
