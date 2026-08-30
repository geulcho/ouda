# -*- coding: utf-8 -*-
"""
prefix_seed.py — data/prefixverbs.js 에 넣을 뼈대를 뽑아 준다.

아직 시드에 없는 파생 동사 중에서 골라, 자동으로 알 수 있는 것(접두사·기본 동사·
분리 여부·활용형)을 채운 객체를 찍어 준다. 뜻과 예문만 손으로 적으면 된다.

    python tools/prefix_seed.py                 # 파생어 많은 계열부터 20개
    python tools/prefix_seed.py --prefix auf    # auf- 만
    python tools/prefix_seed.py --base gehen    # gehen 계열만
    python tools/prefix_seed.py --level A1 -n 40

찍힌 것을 data/prefixverbs.js 의 배열 안에 붙여넣고 meanings 를 채우세요.
transparency 는 실제로 뜻을 적어 본 뒤에 정하는 게 맞습니다 — 직역과 얼마나
떨어져 있는지는 뜻을 알아야 판단할 수 있습니다.
"""
import argparse
import io
import json
import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# node 로 기존 엔진을 그대로 돌린다 — 분해 규칙을 파이썬에 다시 쓰면 두 벌이 된다
NODE = r"""
var fs=require('fs'),vm=require('vm');
var s={};s.window=s;s.console=console;
s.localStorage={getItem:function(){return null},setItem:function(){},removeItem:function(){}};
s.setTimeout=function(){};
vm.createContext(s);
['data/verbs.js','data/prefixes.js','data/prefixverbs.js',
 'js/store.js','js/declension.js','js/conjugation.js','js/prefix.js']
  .forEach(function(f){vm.runInContext(fs.readFileSync(ROOT+'/'+f,'utf8'),s,{filename:f})});
var P=s.Prefix,C=s.Conjugation,W=s.VERBS;
P.prime(W);
var out=[];
P.decomposable(W).forEach(function(e){
  var n=P.info(e,W);
  if(n.seed) return;                        // 이미 시드에 있는 것은 뺀다
  var c=P.forConjugation(e,W);
  out.push({
    lemma:P.bare(e.de), prefix:n.prefix, base:n.base,
    separable:n.separable, levels:e.levels||[],
    baseKo:n.baseKo||null, core:n.prefixData.coreKo,
    pres3:C.present(c,'er')||null, pp:P.clean(c.pp)||null,
    zu:C.zuInfinitive(c)||null,
    main:C.mainClause(c,'er')||null,
    ex:(e.ex||[]).slice(0,2).map(function(x){return x.de}),
    family:P.family(n.base,W).length
  });
});
console.log(JSON.stringify(out));
"""

LEVEL_RANK = {"A1": 0, "A2": 1, "B1": 2, "B2": 3}


def load():
    script = "var ROOT=" + json.dumps(ROOT).replace("\\\\", "/") + ";\n" + NODE
    fd, path = tempfile.mkstemp(suffix=".js")
    os.close(fd)
    try:
        io.open(path, "w", encoding="utf-8").write(script)
        raw = subprocess.check_output(["node", path], cwd=ROOT)
        return json.loads(raw.decode("utf-8"))
    finally:
        os.unlink(path)


def rank(v):
    lv = [LEVEL_RANK.get(x, 9) for x in v["levels"]] or [9]
    # 낮은 레벨 먼저, 그 다음 파생어가 많은 계열 먼저
    return (min(lv), -v["family"], v["lemma"])


def emit(v):
    lit = "%s + %s" % (v["core"].split(" · ")[0], v["baseKo"]) if v["baseKo"] else None
    forms = " · ".join(x for x in [v["main"], v["pp"], v["zu"]] if x)

    lines = []
    lines.append("  {")
    lines.append("    lemma: %s," % json.dumps(v["lemma"], ensure_ascii=False))
    lines.append("    // %s + %s  ·  %s  ·  %s"
                 % (v["prefix"], v["base"],
                    "분리" if v["separable"] else "비분리",
                    "/".join(v["levels"]) or "-"))
    lines.append("    //    %s" % forms)
    for ex in v["ex"]:
        lines.append("    //    %s" % ex)
    lines.append("    literalKo: %s," % (json.dumps(lit, ensure_ascii=False) if lit else "null"))
    lines.append("    meanings: [{ ko: '', en: '', freq: 'high' }],   // ← 여기를 채우세요")
    lines.append("    transparency: 'medium',   // high | medium | low")
    lines.append("    whyKo: '',")
    lines.append("    ex: [{ de: '', ko: '' }],")
    lines.append("    confusions: [],")
    lines.append("    warning: null")
    lines.append("  },")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prefix", help="이 접두사만")
    ap.add_argument("--base", help="이 기본 동사 계열만")
    ap.add_argument("--level", help="이 레벨에 속한 것만")
    ap.add_argument("-n", type=int, default=20, help="몇 개까지 (기본 20)")
    args = ap.parse_args()

    rows = load()
    if args.prefix:
        rows = [v for v in rows if v["prefix"] == args.prefix]
    if args.base:
        rows = [v for v in rows if v["base"] == args.base]
    if args.level:
        rows = [v for v in rows if args.level in v["levels"]]

    rows.sort(key=rank)
    picked = rows[: args.n]

    out = []
    out.append("// 아직 시드에 없는 파생 동사 %d개 (전체 후보 %d개)" % (len(picked), len(rows)))
    out.append("// meanings 를 채워 data/prefixverbs.js 배열 안에 붙여넣으세요.")
    out.append("")
    for v in picked:
        out.append(emit(v))
    text = "\n".join(out)

    if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
        sys.stdout.buffer.write(text.encode("utf-8"))
        sys.stdout.buffer.write(b"\n")
    else:
        print(text)


if __name__ == "__main__":
    main()
