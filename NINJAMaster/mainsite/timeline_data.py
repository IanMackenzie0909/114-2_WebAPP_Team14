import json
import re
from pathlib import Path

try:
    from django.conf import settings
except ImportError:
    settings = None


if settings is not None and settings.configured:
    PROJECT_ROOT = settings.BASE_DIR.parent
else:
    PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE_FILES = [
    PROJECT_ROOT / "data" / "sources" / "timeline" / "BeforeNinjaEra.md",
    PROJECT_ROOT / "data" / "sources" / "timeline" / "NINJAGOMastersofSpinjitzu.md",
    PROJECT_ROOT / "data" / "sources" / "timeline" / "NINJAGODragonsRising.md",
]
DEFAULT_OUTPUT_FILE = PROJECT_ROOT / "data" / "ninjago_timeline_events.json"

SOURCE_PREFIXES = {
    "BeforeNinjaEra.md": "before-ninja-era",
    "NINJAGOMastersofSpinjitzu.md": "masters-of-spinjitzu",
    "NINJAGODragonsRising.md": "dragons-rising",
}


def clean_heading(value):
    text = value.strip()
    text = re.sub(r"^#+\s*", "", text)
    text = re.sub(r"^\*+|\*+$", "", text.strip())
    text = text.strip(" =\t\r\n")
    return text.strip()


def clean_content_line(value):
    text = value.strip()
    text = re.sub(r"^[-*]\s+", "", text)
    return text.strip()


def source_relative_path(path):
    try:
        return path.resolve().relative_to(PROJECT_ROOT.resolve()).as_posix()
    except ValueError:
        return path.as_posix()


def first_non_empty(lines, default=""):
    for line in lines:
        if line.strip():
            return line.strip()
    return default


def make_summary(details, max_items=2, max_length=260):
    summary = " ".join(details[:max_items]).strip()
    if len(summary) <= max_length:
        return summary
    return summary[: max_length - 1].rstrip() + "..."


def extract_keywords(title, details, parents):
    text = "\n".join([title, *parents, *details])
    keywords = []

    for value in [title, *parents]:
        if value and value not in keywords:
            keywords.append(value)

    for pattern in [r"[（(]([^（）()]{2,80})[）)]", r"[「『]([^」』]{2,80})[」』]"]:
        for match in re.finditer(pattern, text):
            keyword = match.group(1).strip()
            if keyword and keyword not in keywords:
                keywords.append(keyword)

    for match in re.finditer(r"\b[A-Z][A-Za-z0-9.'-]{1,}\b", text):
        keyword = match.group(0).strip()
        if keyword and keyword not in keywords:
            keywords.append(keyword)

    return keywords[:40]


def parse_markdown_timeline_file(path, source_index=0):
    path = Path(path)
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    root_title = path.stem
    heading_stack = []
    current = None
    events = []
    source_prefix = SOURCE_PREFIXES.get(path.name, path.stem.lower())

    def finalize_current():
        nonlocal current
        if not current:
            return

        details = current["details"]
        if not details:
            current = None
            return

        event_index = len(events) + 1
        parents = current["parents"]
        title = current["title"]
        section = title if current["depth"] == 2 else first_non_empty(
            [parent["title"] for parent in reversed(parents) if parent["depth"] == 2],
            title,
        )
        subsection = first_non_empty(
            [parent["title"] for parent in reversed(parents) if parent["depth"] in {3, 4}],
            "",
        )
        parent_titles = [parent["title"] for parent in parents if parent["depth"] > 1]

        events.append(
            {
                "id": f"{source_prefix}-{event_index:03d}",
                "order": source_index * 1000 + event_index,
                "source_order": event_index,
                "era": root_title,
                "section": section,
                "subsection": subsection,
                "title": title,
                "path": [root_title, *parent_titles, title],
                "depth": current["depth"],
                "summary": make_summary(details),
                "details": details,
                "keywords": extract_keywords(title, details, parent_titles),
                "source": {
                    "file": source_relative_path(path),
                    "line": current["line_number"],
                },
                "search_text": "\n".join([root_title, *parent_titles, title, *details]),
            }
        )
        current = None

    for line_number, line in enumerate(lines, start=1):
        heading_match = re.match(r"^(#{1,4})\s+(.+)$", line.strip())
        if heading_match:
            finalize_current()

            depth = len(heading_match.group(1))
            title = clean_heading(heading_match.group(2))
            if depth == 1:
                root_title = title or root_title
                heading_stack = [{"depth": depth, "title": root_title}]
                continue

            while heading_stack and heading_stack[-1]["depth"] >= depth:
                heading_stack.pop()

            parents = list(heading_stack)
            current = {
                "depth": depth,
                "title": title,
                "line_number": line_number,
                "parents": parents,
                "details": [],
            }
            heading_stack.append({"depth": depth, "title": title})
            continue

        if current:
            content = clean_content_line(line)
            if content:
                current["details"].append(content)

    finalize_current()
    return events


def build_timeline_payload(source_files=None):
    source_files = [Path(path) for path in (source_files or DEFAULT_SOURCE_FILES)]
    events = []
    sources = []

    for index, source_file in enumerate(source_files):
        file_events = parse_markdown_timeline_file(source_file, source_index=index)
        events.extend(file_events)
        sources.append(
            {
                "file": source_relative_path(source_file),
                "event_count": len(file_events),
            }
        )

    return {
        "schema_version": 1,
        "description": "Ninjago timeline events generated from Markdown source files.",
        "sources": sources,
        "event_count": len(events),
        "events": events,
    }


def write_timeline_payload(output_file=None, source_files=None):
    output_path = Path(output_file or DEFAULT_OUTPUT_FILE)
    payload = build_timeline_payload(source_files=source_files)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return output_path, payload


def load_timeline_payload(data_file=None):
    data_path = Path(data_file or DEFAULT_OUTPUT_FILE)
    with data_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def search_timeline_events(events, query):
    query_text = (query or "").strip().lower()
    if not query_text:
        return list(events)

    terms = [term for term in re.split(r"\s+", query_text) if term]
    scored = []

    for event in events:
        search_text = event.get("search_text", "").lower()
        title = event.get("title", "").lower()
        score = 0
        if query_text in search_text:
            score += 20
        if query_text in title:
            score += 15
        for term in terms:
            if term in title:
                score += 6
            if term in search_text:
                score += 3
        if score:
            scored.append((score, event))

    scored.sort(key=lambda item: (-item[0], item[1].get("order", 0)))
    return [event for _, event in scored]
