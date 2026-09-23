#!/usr/bin/env bash
# Compile the CV sources with XeLaTeX and publish them for /files/skill/cv.
#   cv/<lang>/resume.tex (+ resume.cls, fonts, images) -> frontend/public/cv/
# Usage: make cv   (or: bash cv/build.sh en zh)
set -euo pipefail
cd "$(dirname "$0")"
out=../frontend/public/cv
mkdir -p "$out"
langs=("$@"); [ ${#langs[@]} -eq 0 ] && langs=(en zh)
for lang in "${langs[@]}"; do
  if [ ! -f "$lang/resume.tex" ]; then echo "skip ${lang}: no ${lang}/resume.tex"; continue; fi
  echo "compiling ${lang}..."
  # Engine per source: a file that says "Compile with pdfLaTeX" uses pdflatex,
  # everything else (e.g. the ctex/CJK version) uses xelatex.
  engine=xelatex
  grep -qi 'compile with pdflatex' "$lang/resume.tex" && engine=pdflatex
  # Two passes so references and page counts settle.
  (cd "$lang" && $engine -interaction=nonstopmode -halt-on-error resume.tex >/dev/null \
               && $engine -interaction=nonstopmode -halt-on-error resume.tex >/dev/null) \
    || { echo "$engine failed for ${lang}, see cv/${lang}/resume.log"; exit 1; }
  cp "$lang/resume.pdf" "$out/yongkang-zou-cv-$lang.pdf"
  cp "$lang/resume.tex" "$out/resume-$lang.tex"
  [ -f "$lang/resume.cls" ] && cp "$lang/resume.cls" "$out/resume-$lang.cls"
  echo "  -> frontend/public/cv/yongkang-zou-cv-$lang.pdf"
done
