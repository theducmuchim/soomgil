# 폰트 다시 만들기

`public/fonts/*.woff2` 를 새로 만들어야 할 때(Pretendard 버전 업 등)의 절차입니다.
평소에는 할 일이 없습니다 — 결과물이 저장소에 들어 있습니다.

## 왜 서브셋하나

Pretendard OTF 원본은 한글 전체 글리프 때문에 **한 벌에 1.5MB**입니다.
쓰는 가중치가 5벌이니 그대로 넣으면 7.5MB가 되고, 첫 화면이 눈에 띄게 느려집니다.

KS X 1001 상용 한글 2,350자 + 저장소에서 실제로 쓰는 글자 + 기호만 남기면
**5벌 합쳐 876KB** 입니다.

서브셋에 없는 희귀 음절(드문 도로명 등)이 나와도 깨지지 않습니다.
`fonts.ts` 의 fallback 스택에 있는 시스템 한글 폰트가 그 글자만 대신 그립니다.

## 준비

```bash
pip install fonttools brotli
```

## 1. 문자 집합 만들기

```python
import pathlib

chars = set()
for p in list(pathlib.Path('src').rglob('*.ts')) + list(pathlib.Path('src').rglob('*.tsx')):
    chars |= set(p.read_text(encoding='utf-8'))

# KS X 1001 기본 한글 2,350자
#   EUC-KR 로 인코딩했을 때 두 바이트가 모두 0xA1 이상인 음절이 정확히 그 집합이다.
#   (0xA1 미만이 섞이면 CP949 확장 영역이라 상용 한글이 아니다)
for c in range(0xAC00, 0xD7A4):
    ch = chr(c)
    try:
        b = ch.encode('euc-kr')
    except UnicodeEncodeError:
        continue
    if len(b) == 2 and b[0] >= 0xA1 and b[1] >= 0xA1:
        chars.add(ch)

chars |= set(
    ''.join(chr(c) for c in range(0x20, 0x7F))
    + '←→↑↓▲▼◀▶●○■□★☆·…‘’“”—–±×÷≤≥≈∼~⚠✓✕'
    + '℃℉㎍㎥㎡㎞㎜㏊％‰°'
    + ''.join(chr(c) for c in range(0x3131, 0x3164))
)

pathlib.Path('.subset-chars.txt').write_text(
    ''.join(sorted(c for c in chars if ord(c) > 0x1F)), encoding='utf-8'
)
```

## 2. 서브셋 + WOFF2 변환

```bash
SRC=~/Downloads/Pretendard-1.3.9/public/static
for w in Regular Medium SemiBold Bold ExtraBold; do
  python -m fontTools.subset "$SRC/Pretendard-$w.otf" \
    --text-file=.subset-chars.txt \
    --output-file="public/fonts/Pretendard-$w.woff2" \
    --flavor=woff2 --layout-features='*' --no-hinting \
    --desubroutinize --name-IDs='' --notdef-outline
done
rm .subset-chars.txt
```

## 3. 확인

가중치를 늘리거나 줄였다면 `src/app/fonts.ts` 의 `src` 배열도 함께 고칩니다.
지금 쓰는 건 400·500·600·700·800 다섯 벌이고, Thin/ExtraLight/Light/Black 은
디자인에서 쓰지 않아 넣지 않았습니다.

```bash
npm run build
```
