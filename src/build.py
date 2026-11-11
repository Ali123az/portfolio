#!/usr/bin/env python3
"""Générateur statique du portfolio.

    python src/build.py

Lit src/site.json et src/content/*.json, rend les gabarits Jinja2 de src/templates
et écrit le site à la racine du projet : index.html (FR), en/ (EN), une page par
projet, 404.html et sitemap.xml. Seule dépendance : jinja2.
"""
import datetime
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path
from urllib.parse import urlparse

from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape
from markupsafe import Markup

SRC = Path(__file__).resolve().parent
ROOT = SRC.parent
LANGS = ("fr", "en")
# Clés dont la valeur est technique (jamais retouchée par la typographie)
RAW_KEYS = {"slug", "id", "logo", "logo_bg", "key", "project", "kind", "visual",
            "lang", "locale", "home_dir", "projects_dir"}


def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def typo(text, lang):
    """Apostrophes typographiques ; espaces insécables de la ponctuation française."""
    text = text.replace("'", "\u2019")
    if lang == "fr":
        text = re.sub(r" ([:;!?»%])", "\u00a0\\1", text)
        text = text.replace("« ", "«\u00a0")
        text = re.sub(r"(\d) (kB|ms|µs|ns|MHz|V|h|pages)\b", "\\1\u00a0\\2", text)
    return text


def polish(node, lang, key=None):
    if isinstance(node, str):
        return node if key in RAW_KEYS else typo(node, lang)
    if isinstance(node, list):
        return [polish(v, lang, key) for v in node]
    if isinstance(node, dict):
        return {k: polish(v, lang, k) for k, v in node.items()}
    return node


def num(value, decimals, lang):
    s = f"{value:.{int(decimals)}f}"
    return s.replace(".", ",") if lang == "fr" else s


def jsonld(obj):
    """JSON-LD sûr à insérer dans une balise <script>."""
    return Markup(json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/"))


def page_dir(lang_content, project=None):
    """Répertoire (relatif à la racine du site) d'une page, '' pour l'accueil FR."""
    if project is None:
        return lang_content["home_dir"]
    return f"{lang_content['projects_dir']}/{project[lang_content['lang']]['slug']}"


def abs_url(site, d):
    return site["site_url"] + (d + "/" if d else "")


def rel_link(root, d):
    return (root + d + "/") if d else (root or "./")


def person_node(site, c):
    pid = site["site_url"] + "#person"
    return {
        "@type": "Person",
        "@id": pid,
        "name": site["name"],
        "givenName": site["given_name"],
        "familyName": site["family_name"],
        "jobTitle": c["meta"]["job_title"],
        "description": c["meta"]["description"],
        "url": site["site_url"],
        "image": site["site_url"] + site["portrait"],
        "email": "mailto:" + site["email"],
        "address": {
            "@type": "PostalAddress",
            "addressLocality": site["locality"],
            "addressRegion": site["region"],
            "addressCountry": site["country"],
        },
        "worksFor": {"@type": "Organization", "name": site["employer"]["name"], "url": site["employer"]["url"]},
        "alumniOf": [
            {"@type": "CollegeOrUniversity", "name": "ENSEEIHT (Toulouse INP)"},
            {"@type": "CollegeOrUniversity", "name": "École Hassania des Travaux Publics (EHTP)"},
        ],
        "knowsAbout": c["meta"]["knows_about"],
        "knowsLanguage": ["fr", "en", "ar", "es"],
        "sameAs": [site["linkedin"]],
    }


def main():
    site = load(SRC / "site.json")
    if not site["site_url"].endswith("/"):
        site["site_url"] += "/"
    projects_raw = load(SRC / "content" / "projects.json")
    content = {l: polish(load(SRC / "content" / f"{l}.json"), l) for l in LANGS}
    projects = []
    for p in projects_raw:
        q = {k: v for k, v in p.items() if k not in LANGS}
        for l in LANGS:
            q[l] = polish(p[l], l)
        projects.append(q)
    projects_by_id = {p["id"]: p for p in projects}

    env = Environment(
        loader=FileSystemLoader(SRC / "templates"),
        autoescape=select_autoescape(["html"]),
        undefined=StrictUndefined,
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.filters["num"] = num

    def digest(rel):
        return hashlib.md5((ROOT / rel).read_bytes()).hexdigest()[:8]

    ver = {"css": digest("assets/css/style.css"), "js": digest("assets/js/main.js")}
    cv = {l: (site["cv"][l] if (ROOT / site["cv"][l]).exists() else "") for l in LANGS}
    today = datetime.date.today()
    website_id = site["site_url"] + "#website"
    person_id = site["site_url"] + "#person"
    written, sitemap = [], []

    def emit(template, d, ctx):
        out = ROOT / d / "index.html" if d else ROOT / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(env.get_template(template).render(**ctx), encoding="utf-8", newline="\n")
        written.append(out.relative_to(ROOT).as_posix())

    def common(lang, d, alt_dirs):
        c = content[lang]
        other = content["en" if lang == "fr" else "fr"]
        root = "../" * len(Path(d).parts) if d else ""
        home = rel_link(root, c["home_dir"])
        alternates = [{"hreflang": l, "url": abs_url(site, alt_dirs[l])} for l in LANGS]
        alternates.append({"hreflang": "x-default", "url": abs_url(site, alt_dirs["fr"])})
        sitemap.append({"loc": abs_url(site, d), "alts": alternates})
        return c, other, root, home, alternates

    # --- Accueil -----------------------------------------------------------
    for lang in LANGS:
        dirs = {l: content[l]["home_dir"] for l in LANGS}
        d = dirs[lang]
        c, other, root, home, alternates = common(lang, d, dirs)
        url = abs_url(site, d)
        graph = [
            {"@type": "WebSite", "@id": website_id, "url": site["site_url"], "name": site["name"],
             "inLanguage": list(LANGS), "author": {"@id": person_id}},
            {"@type": "ProfilePage", "@id": url + "#profilepage", "url": url, "name": c["meta"]["title"],
             "description": c["meta"]["description"], "inLanguage": lang, "isPartOf": {"@id": website_id},
             "mainEntity": {"@id": person_id}, "dateModified": today.isoformat()},
            person_node(site, c),
        ]
        page = {
            "kind": "home", "title": c["meta"]["title"], "description": c["meta"]["description"],
            "url": url, "alternates": alternates, "og_type": "profile",
            "home": home, "section_base": "", "alt_href": rel_link(root, other["home_dir"]),
            "jsonld": jsonld({"@context": "https://schema.org", "@graph": graph}),
        }
        emit("home.html", d, dict(site=site, c=c, other=other, page=page, root=root, ver=ver, cv=cv,
                                  year=today.year, projects=projects, projects_by_id=projects_by_id))

    # --- Études de cas -----------------------------------------------------
    for i, p in enumerate(projects):
        dirs = {l: page_dir(content[l], p) for l in LANGS}
        for lang in LANGS:
            d = dirs[lang]
            c, other, root, home, alternates = common(lang, d, dirs)
            pd = p[lang]
            url = abs_url(site, d)
            home_url = abs_url(site, c["home_dir"])
            graph = [
                {"@type": "TechArticle", "@id": url + "#article", "headline": pd["title"],
                 "description": pd["seo_desc"], "url": url, "inLanguage": lang,
                 "image": site["site_url"] + site["og_image"][lang], "keywords": ", ".join(pd["tags"]),
                 "author": {"@id": person_id}, "isPartOf": {"@id": website_id},
                 "dateModified": today.isoformat()},
                {"@type": "BreadcrumbList", "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": c["ui"]["home"], "item": home_url},
                    {"@type": "ListItem", "position": 2, "name": c["projects"]["label"],
                     "item": home_url + "#" + c["nav"][1]["id"]},
                    {"@type": "ListItem", "position": 3, "name": pd["title"], "item": url},
                ]},
                {"@type": "Person", "@id": person_id, "name": site["name"], "url": site["site_url"],
                 "jobTitle": c["meta"]["job_title"]},
            ]
            page = {
                "kind": "project", "title": pd["seo_title"], "description": pd["seo_desc"],
                "url": url, "alternates": alternates, "og_type": "article",
                "home": home, "section_base": home, "alt_href": rel_link(root, dirs[other["lang"]]),
                "jsonld": jsonld({"@context": "https://schema.org", "@graph": graph}),
            }
            emit("project.html", d, dict(site=site, c=c, other=other, page=page, root=root, ver=ver, cv=cv,
                                         year=today.year, p=p, prev=projects[i - 1],
                                         next=projects[(i + 1) % len(projects)]))

    # --- 404, sitemap, divers ---------------------------------------------
    base = urlparse(site["site_url"]).path
    (ROOT / "404.html").write_text(env.get_template("404.html").render(site=site, base=base),
                                   encoding="utf-8", newline="\n")
    written.append("404.html")

    rows = ['<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
            'xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for u in sitemap:
        rows.append("  <url>")
        rows.append(f"    <loc>{u['loc']}</loc>")
        rows.append(f"    <lastmod>{today.isoformat()}</lastmod>")
        for a in u["alts"]:
            rows.append(f'    <xhtml:link rel="alternate" hreflang="{a["hreflang"]}" href="{a["url"]}"/>')
        rows.append("  </url>")
    rows.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(rows) + "\n", encoding="utf-8", newline="\n")
    written.append("sitemap.xml")
    (ROOT / ".nojekyll").write_text("", encoding="utf-8")

    # Nettoyage : dossiers de projets devenus orphelins après un changement de slug
    for lang in LANGS:
        base_dir = ROOT / content[lang]["projects_dir"]
        keep = {p[lang]["slug"] for p in projects}
        if base_dir.is_dir():
            for child in base_dir.iterdir():
                if child.is_dir() and child.name not in keep and (child / "index.html").exists():
                    shutil.rmtree(child)

    print(f"{len(written)} fichiers générés -> {site['site_url']}")
    for w in written:
        print("  ", w)
    for l in LANGS:
        if not cv[l]:
            print(f"  (!) CV {l.upper()} absent : {site['cv'][l]} — boutons de téléchargement masqués")
    return 0


if __name__ == "__main__":
    sys.exit(main())
