/**
 * 生成「深海石碑」材质球（matcap）。
 *
 * 为什么是材质球：这个站的材质全部通过 MatCap 实现 —— 片元里把法线映射成球面 UV，
 * 再去采样这一张图。所以「换材质」等于「换这颗球」，不需要碰任何 shader。
 *
 * 造型依据（对应 CG pic_rogue_2_28 的深海石碑）：
 *   · 球心（正对观察者）是粗糙的青灰岩石，带细密斑驳与放射状裂纹
 *   · 球缘（掠射角）是被海水折射出的青色辉光
 *   · 主光在左上方，冷白；补光在右下，极弱
 *   · 全程不用彩虹色，避免和深海底色打架
 *
 * 输出：src/assets/art/matcap-mizuki.jpg（512×512，与原版同规格）
 */
import fs from 'node:fs';
import sharp from 'sharp';

const S = 512;
const out = 'src/assets/art/matcap-mizuki.jpg';

/* ---------- 噪声 ---------- */
function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
function fbm(x, y, oct = 4) {
  let sum = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { sum += vnoise(x * f, y * f) * amp; f *= 2.07; amp *= 0.5; }
  return sum;
}
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/* ---------- 光照方向 ---------- */
const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
const L1 = norm([-0.42, 0.56, 0.72]);
const L2 = norm([0.62, 0.10, 0.78]);
const H1 = norm([L1[0], L1[1], L1[2] + 1]);
const H2 = norm([L2[0], L2[1], L2[2] + 1]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/* ---------- 色板 ---------- */
const ROCK_DARK = [0.105, 0.185, 0.215];
const ROCK_LIGHT = [0.400, 0.560, 0.600];
const RIM = [0.28, 0.86, 0.98];

const buf = Buffer.alloc(S * S * 3);

for (let py = 0; py < S; py++) {
  for (let px = 0; px < S; px++) {
    const u = (px + 0.5) / S;
    const v = 1 - (py + 0.5) / S;          // matcap 的 v 轴朝上
    const x = (u - 0.5) / 0.5;
    const y = (v - 0.5) / 0.5;
    const d2 = x * x + y * y;
    const o = (py * S + px) * 3;

    if (d2 > 1) { buf[o] = buf[o + 1] = buf[o + 2] = 0; continue; }

    const n = [x, y, Math.sqrt(Math.max(0, 1 - d2))];
    const r = Math.sqrt(d2);

    // 岩面斑驳：两层噪声。球心附近要给足细节 —— 平面模型的法线几乎全落在球心。
    const mott = fbm(x * 6.5 + 11.0, y * 6.5 - 4.0, 4);
    const fine = fbm(x * 26.0 - 3.0, y * 26.0 + 7.0, 3);

    const t = clamp01(mott * 1.05 + fine * 0.55 - 0.22);
    let rock = ROCK_DARK.map((c, i) => c + (ROCK_LIGHT[i] - c) * t);

    // 放射状裂纹：从球心向外发散的细亮缝
    const ang = Math.atan2(y, x);
    const veinPhase = ang * 4.0 + mott * 3.4 + fine * 1.2;
    const vein = Math.pow(Math.abs(Math.sin(veinPhase)), 34.0)
               * Math.pow(1.0 - r, 0.6)
               * clamp01(0.45 + fine * 1.4);
    rock = rock.map((c, i) => c + RIM[i] * vein * 1.15);

    // 主光 + 补光
    const ndl1 = Math.max(0, dot(n, L1));
    const ndl2 = Math.max(0, dot(n, L2));
    const lum = 0.46 + Math.pow(ndl1, 1.10) * 0.86 + Math.pow(ndl2, 2.4) * 0.24;

    // 高光（岩面粗糙，宽而弱）
    const spec = Math.pow(Math.max(0, dot(n, H1)), 26) * 0.42
               + Math.pow(Math.max(0, dot(n, H2)), 60) * 0.16;

    const col = rock.map((c) => c * lum + spec * 0.85);

    // 球缘辉光：掠射角最亮，做出被海水折射的冷光边
    const rim = Math.pow(1 - clamp01(n[2]), 3.2) * 1.45;
    for (let i = 0; i < 3; i++) col[i] += RIM[i] * rim * (0.35 + 0.65 * clamp01(ndl1 + 0.35));

    // 极边缘轻收，避免轮廓外扩
    const edge = 1 - Math.pow(r, 12) * 0.55;

    buf[o] = Math.round(clamp01(col[0]) * 255 * edge);
    buf[o + 1] = Math.round(clamp01(col[1]) * 255 * edge);
    buf[o + 2] = Math.round(clamp01(col[2]) * 255 * edge);
  }
}

fs.mkdirSync('src/assets/art', { recursive: true });
await sharp(buf, { raw: { width: S, height: S, channels: 3 } })
  .jpeg({ quality: 94 })
  .toFile(out);

const { size } = fs.statSync(out);
console.log(`${out}  ${S}x${S}  ${(size / 1024).toFixed(1)} KB`);
