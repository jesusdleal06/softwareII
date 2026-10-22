#!/usr/bin/env python3
"""Append a row to the change-control table (Fecha | Versión | Descripción | Autor).

The new row copies the formatting of the last row, so the document keeps its look.
Uses only the standard library, so it runs without installing anything.

Examples:
  python3 scripts/change-log/record_change.py --description "Esqueleto del backend..." --dry-run
  python3 scripts/change-log/record_change.py --description "..." --author-email someone@example.com
"""

import argparse
import datetime
import os
import re
import subprocess
import sys
import tempfile
import zipfile
from xml.sax.saxutils import escape

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEFAULT_DOC = os.path.join(
    REPO_ROOT,
    "Documentacion",
    "pruebas",
    "Actividad módulo 2_Tabla Control de cambios y versiones.docx",
)
DOCUMENT_PART = "word/document.xml"

# Git author email -> name as written in the table.
AUTHORS = {
    "josuerangel262005@gmail.com": "Yenderson Josué Rangel Martínez",
    "diegoandresbecerrabonilla@gmail.com": "Diego Andrés Becerra Bonilla",
    "jesusdleal06@gmail.com": "Jesús David Leal Espinel",
}

ROW_RE = re.compile(r"<w:tr[ >].*?</w:tr>", re.S)
CELL_RE = re.compile(r"<w:tc>.*?</w:tc>", re.S)
TEXT_RE = re.compile(r"(<w:t(?: [^>]*)?>)([^<]*)(</w:t>)")


def fail(message):
    print(f"error: {message}", file=sys.stderr)
    sys.exit(1)


def cell_text(cell_xml):
    return "".join(m.group(2) for m in TEXT_RE.finditer(cell_xml))


def set_cell_text(cell_xml, text):
    """Put the text in the first <w:t> and empty any others."""
    count = 0

    def replace(match):
        nonlocal count
        count += 1
        value = escape(text) if count == 1 else ""
        return f"{match.group(1)}{value}{match.group(3)}"

    result = TEXT_RE.sub(replace, cell_xml)
    if count == 0:
        fail("the last row has a cell without text to copy the format from")
    return result


def next_version(version):
    match = re.fullmatch(r"(\d+)\.(\d+)", version.strip())
    if not match:
        fail(f"cannot parse the last version '{version}'; pass --version")
    return f"{match.group(1)}.{int(match.group(2)) + 1}"


def version_key(version):
    match = re.fullmatch(r"(\d+)\.(\d+)", version.strip())
    if not match:
        fail(f"invalid version '{version}', expected MAJOR.MINOR such as 1.3")
    return int(match.group(1)), int(match.group(2))


def resolve_author(args):
    if args.author:
        return args.author
    email = args.author_email
    if not email:
        email = subprocess.run(
            ["git", "config", "user.email"], capture_output=True, text=True, cwd=REPO_ROOT
        ).stdout.strip()
    name = AUTHORS.get(email.lower())
    if not name:
        fail(f"unknown author email '{email}'; pass --author or add it to AUTHORS")
    return name


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--description", required=True, help="Change description, in Spanish.")
    parser.add_argument("--version", help="Version for the row (default: last version + 0.1).")
    parser.add_argument("--date", help="Date as dd/mm/yyyy (default: today).")
    parser.add_argument("--author", help="Author name as written in the table.")
    parser.add_argument("--author-email", help="Git author email, mapped to a team member name.")
    parser.add_argument("--file", default=DEFAULT_DOC, help="Path to the .docx file.")
    parser.add_argument("--dry-run", action="store_true", help="Print the row without writing it.")
    args = parser.parse_args()

    description = args.description.strip()
    if not description:
        fail("--description is empty")
    date = args.date or datetime.date.today().strftime("%d/%m/%Y")
    if not re.fullmatch(r"\d{2}/\d{2}/\d{4}", date):
        fail(f"invalid date '{date}', expected dd/mm/yyyy")
    author = resolve_author(args)

    with zipfile.ZipFile(args.file) as source:
        document = source.read(DOCUMENT_PART).decode("utf-8")

    rows = ROW_RE.findall(document)
    if len(rows) < 2:
        fail("the change-control table was not found in the document")
    last_row = rows[-1]
    cells = CELL_RE.findall(last_row)
    if len(cells) != 4:
        fail(f"expected 4 columns in the last row, found {len(cells)}")

    last_version = cell_text(cells[1])
    version = args.version or next_version(last_version)
    if version_key(version) <= version_key(last_version):
        fail(f"version {version} must be greater than the last one ({last_version})")

    new_row = last_row
    for cell, value in zip(cells, (date, version, description, author)):
        new_row = new_row.replace(cell, set_cell_text(cell, value), 1)

    print(f"{date} | {version} | {description} | {author}")
    if args.dry_run:
        print("(dry run: the document was not changed)")
        return

    position = document.rindex(last_row) + len(last_row)
    updated = document[:position] + new_row + document[position:]

    directory = os.path.dirname(os.path.abspath(args.file))
    handle, temp_path = tempfile.mkstemp(suffix=".docx", dir=directory)
    os.close(handle)
    try:
        with zipfile.ZipFile(args.file) as source, zipfile.ZipFile(
            temp_path, "w", zipfile.ZIP_DEFLATED
        ) as target:
            for item in source.infolist():
                data = updated.encode("utf-8") if item.filename == DOCUMENT_PART else source.read(item)
                target.writestr(item, data)
        os.replace(temp_path, args.file)
    except BaseException:
        os.unlink(temp_path)
        raise
    print(f"Recorded version {version} in {os.path.relpath(args.file, REPO_ROOT)}")


if __name__ == "__main__":
    main()
