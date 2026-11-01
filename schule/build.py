#!/usr/bin/env python3
"""Baut schule/index.html aus vorlage.html und den gesicherten Inhalten in inhalte/.

Texte stammen ausschließlich aus inhalte/*.md (gesichert von der alten Website).
Liegt eine Datei mit demselben Namen in inhalte/wortlaut/, wird sie bevorzugt
(Originalwortlaut, z. B. aus einem WordPress-Export) und die Seite gilt als wörtlich.

Aufruf:  python3 schule/build.py
"""
import html, json, os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
INH = os.path.join(ROOT, "inhalte")
WORT = os.path.join(INH, "wortlaut")
UP = "https://www.christian-schad-volksschule.de/wp-content/uploads/"

# Bilder, die auf dem alten Server nicht erreichbar sind (geprüft 01.11.2026)
BROKEN = {"2021/01/cropped-Grüne_Meile_1.jpg", "2021/01/cropped-Grüne_Meile_2.jpg",
          "2021/02/Räuber-Hotzenplotz_1-scaled.jpg"} | {f"2022/07/Bürgergest_{n}" for n in
          ["1.jpeg", "2.jpeg", "3-scaled.jpeg", "4.jpeg", "5.jpeg", "6.jpeg"]}

# ---------------------------------------------------------------- Markdown
SKIP_LINE = re.compile(r"^(>|Quelle:|Kontakt:|Seitentitel:|Dokumente/Bilder|Die Seite enthält|Übersichtsseite|"
                       r"Christian-Schad-Grundschule ·|Die Seite verlinkt|Zitat:|Hauptüberschrift:|\(Hinweis|\(Wiederholt|\(Identischer|\(Die Aufgaben|\(Nummerierung|\(Vier Bilder|"
                       r"- PDF-/Dokumentlinks|- Keine PDF|Keine PDF|- Bilder|- Bild[ :(]|Bild-URL:|!\[)")
SKIP_SECTION = re.compile(r"^(Dokumente|Bilder|Links und Bilder|Links / Dokumente|Links$|Zusammenfassung$|Kacheln$)", re.I)

NOTE = re.compile(r"\s*\((so auf der Seite[^)]*|sinngemäß|zweiter Abschnitt|Bilder von[^)]*|Zusammenfassung|"
                  r"Einlass ins Schulgebäude|Urheberrecht|Datenschutz|Mitteilungen für zu Hause|Entschuldigung bei Krankheit|"
                  r"Geburtstagsfeiern|Ferienregel|Hausaufgaben|Hausschuhe|Kleidung|Kontroll- und Übungsarbeiten|Zusammenarbeit mit Eltern|"
                  r"Pausenverpflegung|Sportunterricht|Persönliche Gespräche|Unterrichtsausfall)\)")

def inline(s):
    s = NOTE.sub("", s)
    s = html.escape(s, quote=False)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"\[([^\]]+)\]\(mailto:[^)]+\)", r"\1", s)
    s = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r'<a href="\2" target="_blank" rel="noopener">\1</a>', s)
    s = re.sub(r"(?<![\"'>=])(https?://[^\s<)]+)", r'<a href="\1" target="_blank" rel="noopener">\1</a>', s)
    return s

def md(text):
    lines = text.splitlines()
    out, para, lst, tbl = [], [], [], []
    skip_lvl = None

    def flush():
        nonlocal para, lst, tbl
        if para:
            out.append("<p>" + " ".join(inline(x) for x in para) + "</p>"); para = []
        if lst:
            tag = "ol" if lst[0][0] else "ul"
            items, cur = [], None
            for num, ind, txt in lst:
                if ind >= 2 and cur is not None:
                    cur[1].append(txt)
                else:
                    cur = [txt, []]; items.append(cur)
            out.append(f"<{tag}>" + "".join(
                "<li>" + inline(t) + ("<ul>" + "".join(f"<li>{inline(c)}</li>" for c in sub) + "</ul>" if sub else "") + "</li>"
                for t, sub in items) + f"</{tag}>")
            lst = []
        if tbl:
            rows = [r for r in tbl if not re.match(r"^\|[\s:|-]+\|$", r)]
            cells = [[c.strip() for c in r.strip("|").split("|")] for r in rows]
            head, body = cells[0], cells[1:]
            out.append('<div class="tbl"><table><thead><tr>' + "".join(f"<th>{inline(c)}</th>" for c in head) +
                       "</tr></thead><tbody>" + "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in body) +
                       "</tbody></table></div>")
            tbl = []

    for raw in lines:
        line = raw.rstrip()
        h = re.match(r"^(#{1,4})\s+(.*)", line)
        if h:
            lvl = len(h.group(1))
            if skip_lvl is not None and lvl > skip_lvl:
                continue
            skip_lvl = None
            flush()
            if lvl == 1:
                continue
            title = h.group(2).strip()
            if re.match(r"^(Überschriften|Kernpunkte|Weitere Abschnitte)", title):
                continue
            if SKIP_SECTION.match(title):
                skip_lvl = lvl; continue
            tag = "h2" if lvl == 2 else "h3"
            out.append(f"<{tag}>{inline(title)}</{tag}>")
            continue
        if skip_lvl is not None:
            continue
        s = line.strip()
        if not s:
            flush(); continue
        if SKIP_LINE.match(s) or "WebFetch" in s or "Abrufwerkzeug" in s:
            continue
        if s.startswith("|"):
            if para or lst: flush()
            tbl.append(s); continue
        m = re.match(r"^(\s*)([-*]|\d+\.)\s+(.*)", line)
        if m:
            if para or tbl: flush()
            ind = len(m.group(1))
            lst.append((m.group(2)[0].isdigit() if not lst else lst[0][0], ind, m.group(3)))
            continue
        if lst and raw.startswith("   "):
            num, ind, txt = lst[-1]; lst[-1] = (num, ind, txt + " " + s); continue
        if lst or tbl: flush()
        para.append(s)
    flush()
    return "\n".join(out)

def read(slug):
    w = os.path.join(WORT, slug + ".md")
    if os.path.exists(w):
        return open(w, encoding="utf-8").read(), True
    return open(os.path.join(INH, slug + ".md"), encoding="utf-8").read(), False

def img(path, cap=""):
    return {"src": UP + path, "cap": cap} if path not in BROKEN else None

# ---------------------------------------------------------------- Seiten
# id, Originaltitel, Bereich, Quelldatei, wörtlich laut Quelle?, Bilder
PAGES = [
  ("ansprechpartner", "Ansprechpartner", "schule", "ansprechpartner", True, []),
  ("team", "Team Lehrkräfte", "schule", "team-lehrkraefte", True, []),
  ("ueber-uns", "Über uns", "schule", "ueber-uns", False, []),
  ("kooperation", "Kooperation – Elternhaus – Schule", "schule", "kooperation", False, []),
  ("elternbeirat", "Elternbeirat", "schule", "elternbeirat", True, ["2020/12/Elternbeirat.png"]),
  ("schulhausordnung", "Schulhausordnung", "schule", "schulhausordnung", True, []),
  ("schulsozialpaedagogin", "Schulsozialpädagogin", "schule", "schulsozialpaedagogin", False, []),
  ("leitbild", "Unser Leitbild", "schule", "leitbild", True, ["2023/03/Leitbild-scaled.jpg"]),
  ("pausenordnung", "Pausenordnung", "schule", "pausenordnung", True, []),
  ("vonabisz", "Von A bis Z", "schule", "vonabisz", False, []),
  ("russisch", "от А до Я (русский)", "schule", "russisch", False, []),
  ("informationen", "Informationen", "schule", "informationen", False, []),
  ("ganztag", "Unsere Ganztagsangebote", "bildung", "ganztag", True, []),
  ("kindergaerten", "Zusammenarbeit mit den Kindergärten", "bildung", "kindergaerten", False, []),
  ("filby", "Filby", "bildung", "filby", False, ["2020/12/cropped-Logo-1.png"]),
  ("pausenhelfer", "Pausenhelfer", "bildung", "pausenhelfer", False, ["2020/12/Pausenhelfer-4-1.png"]),
  ("klassenrat", "Klassenrat", "bildung", "klassenrat", False,
     ["2021/01/cropped-Klassenrat-1.jpg", "2021/01/Klassenrat-2-134x300.jpg", "2021/01/Klassenrat-3-199x300.jpg",
      "2021/01/Klassenrat-4-199x300.jpg", "2021/01/Klassenrat-5-242x300.jpg", "2021/01/Klassenrat-6-1.jpg", "2021/01/Klassenrat-7-768x481.jpg"]),
  ("singklasse", "Singklasse", "bildung", "singklasse", False,
     ["2021/01/kisspng-childrens-choir-singing-illustration-vector-free-children-chorus-5aa5476cadbb14.9349138915207811647116-300x152.png", "2021/01/Ohne-Titel-2-300x151.png"]),
  ("schulchor", "Schulchor", "bildung", "schulchor", False,
     ["2021/01/kisspng-clip-art-karaoke-image-singing-illustration-5cd070fe55b836.1400935615571642863511-300x276.png"]),
  ("medienkonzept", "Medienkonzept", "bildung", "medienkonzept", False,
     ["2021/01/cropped-Medienkonzept1-1.jpg", "2021/01/cropped-Medienkonzept2.jpg", "2021/01/cropped-Medienkonzept3.jpg", "2021/01/Medienkonzept4.jpg"]),
  ("gruene-meilen", "Grüne Meilen", "bildung", "gruene-meilen", False, []),
  ("buergerfest", "Bürgerfest", "schulleben", "buergerfest", False, []),
  ("schulkleidung", "Schulkleidung und mehr", "schulkleidung", "schulkleidung", False,
     ["2024/03/IMG_7684-scaled.jpg", "2024/03/IMG_7685-scaled.jpg", "2024/03/IMG_7686-scaled.jpg", "2024/03/IMG_7687-scaled.jpg"]),
  ("impressum", "Impressum", "recht", "impressum", False, []),
  ("datenschutz", "Datenschutz", "recht", "datenschutz", False, []),
]

pages = {}
for pid, title, area, src, verb, imgs in PAGES:
    text, wort = read(src)
    pages[pid] = {"title": title, "area": area, "html": md(text), "exact": bool(wort or verb),
                  "imgs": [i for i in (img(p) for p in imgs) if i]}

# Von A bis Z als einzelne Einträge (durchsuchbar)
abc = []
text, _ = read("vonabisz")
for sec in re.split(r"^## ", text, flags=re.M)[1:]:
    head, _, body = sec.partition("\n")
    body = body.strip()
    if head.startswith("Links") or body.startswith("("):
        continue
    abc.append([head.strip(), md(body)])

# Galerie
gal = []
text, _ = read("galerie")
for sec in re.split(r"^## ", text, flags=re.M)[1:]:
    head, _, body = sec.partition("\n")
    title = re.sub(r"^\d+\.\s*", "", head.strip())
    caps = re.findall(r"\"([^\"]+)\"", body)
    urls = []
    for u in re.findall(r"wp-content/uploads/(\S+?\.(?:jpe?g|png))", body):
        if u not in urls and u not in BROKEN:
            urls.append(u)
    if urls:
        gal.append({"t": title, "caps": caps, "imgs": [UP + u for u in urls]})

data = {"pages": pages, "abc": abc, "gal": gal}
tpl = open(os.path.join(ROOT, "vorlage.html"), encoding="utf-8").read()
out = tpl.replace("/*__DATA__*/null", json.dumps(data, ensure_ascii=False).replace("</", "<\\/"))
open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8").write(out)
print(f"index.html gebaut: {len(pages)} Seiten, {len(abc)} A–Z-Einträge, {len(gal)} Galerie-Alben, "
      f"{sum(len(a['imgs']) for a in gal)} Galeriebilder; wörtlich: {sum(p['exact'] for p in pages.values())}/{len(pages)}")
