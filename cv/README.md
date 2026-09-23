# CV

`cv/<lang>/resume.tex` is the source for `/files/skill/cv`. Run `make cv` to
compile and publish PDF + sources to `frontend/public/cv/` (commit both —
Vercel's build has no LaTeX).

- `en/`: pdfLaTeX (the file says "Compile with pdfLaTeX")
- `zh/`: XeLaTeX with `resume.cls` (ctex)

The public copies carry no phone number; keep a private version for direct
applications.

BasicTeX is missing some packages. Install them without sudo:

    tlmgr init-usertree
    tlmgr --usermode option repository https://ftp.math.utah.edu/pub/tex/historic/systems/texlive/2025/tlnet-final
    tlmgr --usermode install enumitem titlesec needspace xurl lastpage footmisc helvetic ctex xecjk zhnumber

If LaTeX then reports "Mismatched LaTeX support files", remove core packages
(latex, l3kernel, graphics, …) that tlmgr pulled into ~/Library/texmf.
