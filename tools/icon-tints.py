# -*- coding: utf-8 -*-
"""lib/package-icon-tints.ts 만들기 — 구성품 아이콘마다 "그 그림의 색" 한 가지.

패키지 카드·상세의 가치 비중 막대가 조각 색으로 쓴다. 젬은 보라, 파괴석은 빨강, 수호석은 파랑처럼
그림과 같은 색이면 조각이 무슨 아이템인지 범례 없이 읽힌다.

색은 그림의 주된 색상(hue)만 가져오고 채도·명도는 한 값으로 맞춘다 — 그대로 쓰면 어떤 건 형광,
어떤 건 거의 검정이라 나란히 놓였을 때 따로 논다. 채도가 낮은 그림(실링·은빛 티켓 등)은
색상이 의미 없으니 청회색 하나로 떨어뜨린다.

  python tools/icon-tints.py
"""
import colorsys
import io
import os
import re
import sys

import numpy as np
from PIL import Image

SAT = 0.50   # 조각 채도
LIG = 0.48   # 조각 명도 (라이트·다크 양쪽에서 흰 글자·본문 글자 둘 다 안 깨지는 중간)
GRAY = '#6b7a99'  # 채도 없는 그림용

SOURCES = ['lib/package-shared.ts', 'data/priceItems.ts', 'lib/items-to-track.ts']


def icon_paths():
    seen = []
    for src in SOURCES:
        s = io.open(src, encoding='utf-8').read()
        for ic in re.findall(r"icon:\s*'([^']+)'", s):
            p = ic.split('?')[0]
            if p not in seen:
                seen.append(p)
    return seen


def tint(path):
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im, np.float64) / 255.0
    rgb, alpha = a[..., :3], a[..., 3]
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    # 채도·불투명·너무 어둡지 않은 픽셀만 (그림자·검정 배경은 색상이 잡음이다)
    w = alpha * sat * (mx > 0.18)
    w = np.where(sat > 0.25, w, 0)
    if w.sum() < 30:  # 색 있는 픽셀이 거의 없다 = 무채색 그림
        return GRAY
    # 색상은 원형이라 평균을 벡터로 낸다
    h = np.zeros_like(mx)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    d = np.maximum(mx - mn, 1e-6)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) / 6.0
    ang = h * 2 * np.pi
    hx, hy = (np.cos(ang) * w).sum(), (np.sin(ang) * w).sum()
    hue = (np.arctan2(hy, hx) / (2 * np.pi)) % 1.0
    rr, gg, bb = colorsys.hls_to_rgb(hue, LIG, SAT)
    return '#%02x%02x%02x' % (round(rr * 255), round(gg * 255), round(bb * 255))


def main():
    rows = []
    for p in icon_paths():
        f = os.path.join('public', p.lstrip('/'))
        if not os.path.exists(f):
            continue
        rows.append((p, tint(f)))
    out = [
        '// 자동 생성 — tools/icon-tints.py (아이콘을 새로 넣으면 다시 돌린다). 손으로 고치지 말 것.',
        '// 구성품 아이콘 경로(쿼리 제외) → 그 그림의 주된 색. 가치 비중 막대의 조각 색.',
        '',
        'export const ICON_TINTS: Record<string, string> = {',
    ]
    for p, c in rows:
        out.append(f"  '{p}': '{c}',")
    out += ['};', '']
    io.open('lib/package-icon-tints.ts', 'w', encoding='utf-8').write('\n'.join(out))
    print(len(rows), '개 →', 'lib/package-icon-tints.ts')
    for p, c in rows:
        print(f'  {c}  {p}')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
