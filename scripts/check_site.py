"""Basic GitHub Pages build-sanity checks; no external network calls."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import sys

ROOT = Path(__file__).resolve().parents[1]
PAGES = [
    ROOT / "index.html",
    ROOT / "index-next.html",
    ROOT / "projects" / "codeatlas-mcp.html",
    ROOT / "projects" / "agentgate.html",
    ROOT / "projects" / "routewise.html",
    ROOT / "projects" / "codeatlas-guide.html",
    ROOT / "projects" / "agentgate-guide.html",
    ROOT / "projects" / "routewise-guide.html",
    ROOT / "projects" / "lab-guide.html",
    ROOT / "enterprise-knowledge-assistant.html",
    ROOT / "agentic-search.html",
    ROOT / "voice-assistant.html",
]

class Tags(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.links = []
        self.titles = 0
        self.lang = False
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "html" and attrs.get("lang") == "en":
            self.lang = True
        if tag == "title":
            self.titles += 1
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        attr = ("href" if tag in {"a", "link"} else "src" if tag in {"script", "img"} else None)
        if attr and attrs.get(attr):
            self.links.append((tag, attrs[attr]))

def run():
    failures = []
    cache = {}
    for page in PAGES:
        if not page.is_file():
            failures.append(f"Missing page: {page}")
            continue
        html = page.read_text(encoding="utf-8")
        parser = Tags()
        parser.feed(html)
        cache[page.resolve()] = parser
        if not parser.lang:
            failures.append(f"{page}: missing html lang=en")
        if parser.titles != 1:
            failures.append(f"{page}: expected exactly one page title")
        for tag, url in parser.links:
            parsed = urlsplit(url)
            if parsed.scheme in {"http", "https", "mailto", "tel", "data"} or url.startswith("//"):
                continue
            if parsed.scheme:
                failures.append(f"{page}: unexpected href scheme {url}")
                continue
            if parsed.path:
                candidate = (ROOT / unquote(parsed.path).lstrip("/")) if parsed.path.startswith("/") else (page.parent / unquote(parsed.path))
                if not candidate.exists():
                    failures.append(f"{page.relative_to(ROOT)}: missing {tag} target {url}")
                elif parsed.fragment and candidate.suffix.lower() in {".html", ".htm"}:
                    target = candidate.resolve()
                    nested = cache.get(target)
                    if nested is None:
                        nested = Tags()
                        nested.feed(target.read_text(encoding="utf-8"))
                        cache[target] = nested
                    if unquote(parsed.fragment) not in nested.ids:
                        failures.append(f"{page.relative_to(ROOT)}: missing target anchor {url}")
            elif parsed.fragment and parsed.fragment not in parser.ids:
                failures.append(f"{page.relative_to(ROOT)}: missing anchor #{parsed.fragment}")
        print(f"Checked {page.relative_to(ROOT)}: {len(parser.links)} links/assets")
    if failures:
        print("\n".join(failures), file=sys.stderr)
        raise SystemExit(1)
    print("All checked portfolio pages passed local link, anchor, and structure checks.")

if __name__ == "__main__":
    run()
