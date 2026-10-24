"""
把塞壬唱片官方音源（WAV）压缩成适合网页播放的尺寸。

只做三件事，全部用标准库：
  1. 降采样到 16kHz（线性插值）
  2. 立体声混成单声道
  3. 写成 16bit PCM WAV

为什么不用 ffmpeg：本机 playwright 自带的 ffmpeg 是精简版，没有 mp3/opus/vorbis 编码器。
"""
import json
import os
import sys
import math
import struct
import urllib.request
from array import array
import wave

TARGET_SR = 16000

SONGS = [
    ('461164', '深蓝之树', 'caerula-arbor'),
    ('306827', '海愿', 'seawishes'),
    ('232271', '大群之殇', 'sorrow-of-we-many'),
    ('514555', '共振', 'resonance'),
    ('461163', '倾听', 'listen'),
    ('048717', '倒置树影', 'tree-reflections'),
]

RAW = 'src/assets/music-raw'
OUT = 'src/assets/music'


def download(cid, title):
    os.makedirs(RAW, exist_ok=True)
    dst = os.path.join(RAW, f'{cid}.wav')
    if os.path.exists(dst) and os.path.getsize(dst) > 1024 * 100:
        return dst
    meta = json.load(urllib.request.urlopen(
        f'https://monster-siren.hypergryph.com/api/song/{cid}', timeout=25))
    url = meta['data']['sourceUrl']
    print(f'  下载 {title} …', end='', flush=True)
    urllib.request.urlretrieve(url, dst)
    print(f' {os.path.getsize(dst)/1048576:.1f} MB')
    return dst


def convert(src, dst):
    """一次循环完成：降采样 + 混单声道 + 24bit 转 16bit。"""
    with wave.open(src, 'rb') as w:
        ch, width, sr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
        raw = w.readframes(n)

    ratio = sr / TARGET_SR
    outn = int(n / ratio)
    res = array('h')
    shift = max(0, width * 8 - 16)          # 24bit -> 右移 8 位

    for i in range(outn):
        off = int(i * ratio) * ch * width
        if ch == 2:
            L = int.from_bytes(raw[off:off + width], 'little', signed=True)
            R = int.from_bytes(raw[off + width:off + 2 * width], 'little', signed=True)
            v = (L + R) // 2
        else:
            v = int.from_bytes(raw[off:off + width], 'little', signed=True)
        v >>= shift
        if v > 32767: v = 32767
        elif v < -32768: v = -32768
        res.append(v)

    with wave.open(dst, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(TARGET_SR)
        w.writeframes(res.tobytes())
    return outn / TARGET_SR


def main():
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for cid, title, slug in SONGS:
        src = download(cid, title)
        dst = os.path.join(OUT, f'{slug}.wav')
        dur = convert(src, dst)
        size = os.path.getsize(dst) / 1048576
        total += size
        print(f'  {title:8} {dur:5.1f}s -> {size:5.2f} MB  {slug}.wav')
    print(f'合计 {total:.1f} MB')


main()
