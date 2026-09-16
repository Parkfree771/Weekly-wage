# -*- coding: utf-8 -*-
"""public/icon-fill 만들기 — 배경이 박힌 아이콘의 "그림만 줄인" 판.

패키지 갤러리 카드는 배경이 박힌 아이콘(원본 안에 갈색·주황 판이 같이 들어 있는 것)을
칸에 꽉 채워 그린다. 그런데 칸이 커지면 그림까지 같이 커져 어색해서, 배경은 그대로
프레임을 채우고 그 안 그림만 78% 로 줄인 판을 따로 만들어 둔다.

만드는 방법:
  1) 원본을 k 배로 줄인다 (그림 + 그림이 깔고 있는 배경이 통째로 줄어든다)
  2) 줄인 판을 흐리게 뭉갠 뒤 가장자리 색을 바깥으로 늘여 빈 테두리를 메운다
     — 늘이는 층이 이미 뭉개져 있어 줄무늬가 안 생기고, 경계에서 색이 정확히 이어진다
  3) 그 위에 줄인 원본을 선명하게 얹는다 (가장자리 몇 px 만 페더)

대상 목록은 알파 채널로 뽑았다 — 네 모서리가 모두 불투명하고 불투명 픽셀이 97% 를
넘으면 "배경이 박힌 그림". 단, 그림이 프레임 밖까지 꽉 차 배경이랄 게 없는 것
(카드팩류)은 줄이면 테두리에 번진 자국만 남아서 뺀다.

  python tools/shrink-fill-icons.py            # 목록 전체 다시 생성
  python tools/shrink-fill-icons.py a.webp b.webp   # 지정한 파일만
"""
import sys
import os
import numpy as np
from PIL import Image, ImageFilter

K = 0.78
OUT_DIR = os.path.join('public', 'icon-fill')

# 배경이 박힌 그림 중 "줄인 판"을 두는 것들 (components/package/PackageGalleryCard.tsx 와 같이 간다)
ICONS = [
    '/ancient-necklace.webp', '/ancient-ring.webp', '/azena-blessing.png',
    '/destiny-breakthrough-stone2.webp', '/destiny-destruction-stone2.webp',
    '/destiny-guardian-stone2.webp', '/djqlfflxltmxhs.webp', '/dptmej.webp',
    '/engraving2.webp', '/gem-chaos-collapse.webp', '/gem-chaos-distortion.webp',
    '/gem-chaos-erosion.webp', '/gem-fear-10.webp', '/gem-fear-8.webp',
    '/gem-order-immutable.webp', '/gem-order-solid.webp', '/gem-order-stable.webp',
    '/master-metallurgy-1.webp', '/master-metallurgy-2.webp', '/master-metallurgy-3.webp',
    '/master-metallurgy-4.webp', '/master-tailoring-1.webp', '/master-tailoring-2.webp',
    '/master-tailoring-3.webp', '/master-tailoring-4.webp', '/metallurgy-karma.webp',
    '/metallurgy-thrill.webp', '/tailoring-karma.webp',
    '/tailoring-thrill.webp', '/vkfwl.webp', 
]


def shrink(src, dst, k=K):
    im = Image.open(src).convert('RGB')
    w, h = im.size
    sw, sh = max(1, int(round(w * k))), max(1, int(round(h * k)))
    ox, oy = (w - sw) // 2, (h - sh) // 2
    small = im.resize((sw, sh), Image.LANCZOS)

    # 테두리 메움판 — 줄인 그림을 뭉갠 뒤 가장자리를 바깥으로 늘인다
    blur = small.filter(ImageFilter.GaussianBlur(radius=max(2.0, w * 0.055)))
    pad = np.pad(np.asarray(blur, np.uint8),
                 ((oy, h - sh - oy), (ox, w - sw - ox), (0, 0)), mode='edge')
    plate = Image.fromarray(pad).filter(ImageFilter.GaussianBlur(radius=max(1.5, w * 0.03)))

    # 얹기 — 가장자리 몇 px 만 페더해서 뭉갠 판과의 경계선을 없앤다
    f = max(1, int(round(w * 0.012)))
    m = np.full((sh, sw), 255.0)
    for i, v in enumerate(np.linspace(0, 1, f + 2)[1:-1]):
        m[i, :] = np.minimum(m[i, :], v * 255)
        m[sh - 1 - i, :] = np.minimum(m[sh - 1 - i, :], v * 255)
        m[:, i] = np.minimum(m[:, i], v * 255)
        m[:, sw - 1 - i] = np.minimum(m[:, sw - 1 - i], v * 255)
    plate.paste(small, (ox, oy), Image.fromarray(m.astype(np.uint8)))
    plate.save(dst, 'WEBP', quality=92, method=6)


def main(argv):
    os.makedirs(OUT_DIR, exist_ok=True)
    targets = argv or ICONS
    for ic in targets:
        src = os.path.join('public', ic.lstrip('/'))
        dst = os.path.join(OUT_DIR, os.path.splitext(os.path.basename(ic))[0] + '.webp')
        shrink(src, dst)
        print('ok', dst, os.path.getsize(dst) // 1024, 'KB')


if __name__ == '__main__':
    main(sys.argv[1:])
