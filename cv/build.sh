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
  # Two passes so references and page counts settle.
  (cd "$lang" && xelatex -interaction=nonstopmode -halt-on-error resume.tex >/dev/null \
               && xelatex -interaction=nonstopmode -halt-on-error resume.tex >/dev/null) \
    || { echo "xelatex failed for $lang — see cv/${lang}/resume.log"; exit 1; }
  cp "$lang/resume.pdf" "$out/yongkang-zou-cv-$lang.pdf"
  cp "$lang/resume.tex" "$out/resume-$lang.tex"
  [ -f "$lang/resume.cls" ] && cp "$lang/resume.cls" "$out/resume-$lang.cls"
  echo "  -> frontend/public/cv/yongkang-zou-cv-$lang.pdf"
done
