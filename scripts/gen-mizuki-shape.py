"""
生成品牌徽标几何轮廓：海月水母（Aurelia aurita）俯视图。

形制依据解剖照片：
  · 伞盖近圆形，伞缘 9 个大波浪瓣
  · 中央四枚马蹄形生殖腺，粗环带、开口一律朝向伞盖中心，拼成四叶草
  · 环内留出十字空腔

注意：这个几何被 home / About / tree 三个场景共用，改动会同时影响三处。
输出 src/assets/mizuki-shape.json，格式 [[外环, 孔1, 孔2, ...], ...]
"""
import json
import math

W = 1.62                 # 伞盖直径
R = W / 2
LOBES = 9

R_D = W * 0.108          # 生殖腺分布半径
RO = W * 0.076           # 马蹄外径
RI = W * 0.047           # 马蹄内径 → 环带厚 0.029W
SPAN = 5.15              # 环跨度 ≈295°，开口约 65°


def ring(points):
    return [[round(x, 4), round(y, 4)] for x, y in points]


def bell():
    """俯视伞盖：圆形轮廓 + 9 个浅波浪瓣 + 边缘细微波。"""
    n = 900
    pts = []
    for i in range(n):
        a = math.tau * i / n
        lobe = 0.5 - 0.5 * math.cos(LOBES * a)
        r = R * (1 - 0.048 * lobe - 0.003 * math.sin(a * 113))
        pts.append((r * math.cos(a), r * math.sin(a)))
    return ring(pts)


def horseshoe(cx, cy, opening, ro, ri, span=SPAN, seg=90):
    """
    马蹄形环带。环形扇区覆盖 [opening - span/2, opening + span/2]，
    缺口落在 opening + π 一侧 —— 所以要让开口朝向伞盖圆心，opening 直接传圆心方向角。
    """
    a0 = opening - span / 2
    a1 = opening + span / 2

    outer = [(cx + ro * math.cos(a0 + (a1 - a0) * i / seg),
              cy + ro * math.sin(a0 + (a1 - a0) * i / seg)) for i in range(seg + 1)]
    inner = [(cx + ri * math.cos(a1 - (a1 - a0) * i / seg),
              cy + ri * math.sin(a1 - (a1 - a0) * i / seg)) for i in range(seg + 1)]
    return ring(outer + inner)


# 四枚马蹄形生殖腺必须是伞盖上的【镂空孔】，不是独立实体 ——
# 做成独立块会被伞盖盘面整个遮住，四叶就消失了。
gonad_holes = []
for i in range(4):
    a = (math.pi / 2) * i + math.pi / 4
    cx, cy = math.cos(a) * R_D, math.sin(a) * R_D
    # 缺口在 opening + π 一侧 → 传 a 才能让开口朝向圆心
    gonad_holes.append(horseshoe(cx, cy, a, RO, RI))

polys = [[bell()] + gonad_holes]

out = "src/assets/mizuki-shape.json"
with open(out, "w", encoding="utf-8") as f:
    json.dump(polys, f, separators=(",", ":"))

xs = [p[0] for poly in polys for p in poly[0]]
ys = [p[1] for poly in polys for p in poly[0]]
print(f"已写入 {out}")
print(f"多边形 {len(polys)} 个 | 外环点数 {sum(len(p[0]) for p in polys)} | 孔 {sum(len(p) - 1 for p in polys)} 个")
print(f"包围盒 x[{min(xs):.3f}, {max(xs):.3f}] y[{min(ys):.3f}, {max(ys):.3f}]")
