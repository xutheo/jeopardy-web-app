from PIL import Image
from pathlib import Path
frames=[Image.open(p).convert('RGB') for p in sorted(Path('artifacts/bomb-demo-frames').glob('*.png'))]
frames[0].save('public/bomb-defusal-demo.gif',save_all=True,append_images=frames[1:],duration=100,loop=0,optimize=True)
frames[25].save('public/bomb-defusal-demo-poster.png')
print('GIF created:',Path('public/bomb-defusal-demo.gif').stat().st_size,'bytes')
