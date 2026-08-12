"""Build the canonical P8 safety-question migration from DATA-EPS/SXCT-ATLD.pdf.

The PDF remains the source of truth. This helper only normalizes wrapped PDF text,
keeps Korean questions/answers verbatim, and records the Vietnamese topic caption.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import fitz


ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = ROOT / "DATA-EPS" / "SXCT-ATLD.pdf"
OUTPUT_PATH = ROOT / "supabase" / "migrations" / "202608110002_seed_workplace_safety_p8.sql"

TOPIC_RE = re.compile(r"^주제\s*(\d+)\.\s*(.+)$")


def group_for_topic(number: int) -> tuple[str, str]:
    if number <= 6:
        return "before_work", "Trước khi làm việc"
    if number <= 20:
        return "during_work", "Trong khi làm việc"
    if number <= 25:
        return "after_work", "Sau khi làm việc"
    return "incident_response", "Khi có sự cố"


def normalize_lines(document: fitz.Document) -> list[str]:
    lines: list[str] = []
    for page in document:
        for raw_line in page.get_text("text").splitlines():
            line = " ".join(raw_line.replace("\u00a0", " ").split())
            if line:
                lines.append(line)
    return lines


def parse_questions(lines: list[str]) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    topic_number = 0
    topic_ko = ""
    topic_vi = ""
    current: dict[str, object] | None = None
    awaiting_topic_vi = False
    buffer = ""
    buffer_is_bullet = False

    def flush_question() -> None:
        nonlocal current
        if current is not None:
            rows.append(current)
        current = None

    def flush_buffer() -> None:
        nonlocal buffer, buffer_is_bullet, current
        text = buffer.strip()
        buffer = ""
        buffer_is_bullet = False
        if not text:
            return
        if text.endswith("?"):
            flush_question()
            group_id, group_label = group_for_topic(topic_number)
            current = {
                "topic_number": topic_number,
                "topic_ko": topic_ko,
                "topic_vi": topic_vi,
                "group_id": group_id,
                "group_label": group_label,
                "question_text": text,
                "suggested_answers": [],
            }
            return
        if current is not None:
            answers = current["suggested_answers"]
            assert isinstance(answers, list)
            answers.append(text)

    for line in lines:
        topic_match = TOPIC_RE.match(line)
        if topic_match:
            flush_buffer()
            flush_question()
            topic_number = int(topic_match.group(1))
            heading = topic_match.group(2).strip()
            topic_ko, separator, topic_vi = heading.partition(":")
            topic_ko = topic_ko.strip()
            topic_vi = topic_vi.strip().rstrip(".") if separator else ""
            awaiting_topic_vi = not bool(topic_vi)
            continue

        if awaiting_topic_vi:
            topic_vi = line.strip().rstrip(".")
            awaiting_topic_vi = False
            continue

        if topic_number == 0:
            continue

        if line.startswith("-"):
            flush_buffer()
            buffer_is_bullet = True
            buffer = line[1:].strip()
        else:
            buffer = f"{buffer} {line}".strip()

        # PDF lines are visually wrapped. A terminal question mark or Korean
        # sentence ending closes the logical paragraph.
        if line.endswith("?") or line.endswith(".") or line.endswith("다"):
            flush_buffer()

    flush_buffer()
    flush_question()

    seen: set[str] = set()
    unique_rows: list[dict[str, object]] = []
    for row in rows:
        key = str(row["question_text"])
        if key in seen:
            continue
        seen.add(key)
        unique_rows.append(row)
    return unique_rows


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def build_sql(rows: list[dict[str, object]]) -> str:
    values: list[str] = []
    for row in rows:
        answers = json.dumps(row["suggested_answers"], ensure_ascii=False)
        values.append(
            "(" + ", ".join(
                [
                    f"md5('safety:' || {sql_literal(str(row['question_text']))})::uuid",
                    sql_literal("An toàn lao động"),
                    sql_literal(str(row["question_text"])),
                    sql_literal(str(row["topic_vi"])),
                    f"{sql_literal(answers)}::jsonb",
                    sql_literal("Sản xuất chế tạo"),
                    sql_literal(str(row["group_id"])),
                    str(row["topic_number"]),
                    sql_literal(str(row["topic_ko"])),
                    sql_literal(str(row["topic_vi"])),
                ]
            ) + ")"
        )

    return f"""-- Generated from DATA-EPS/SXCT-ATLD.pdf. Do not hand-edit source content.
INSERT INTO public.interview_questions (
    id, category, question_text, vietnamese_meaning, suggested_answers,
    industry, safety_group, safety_topic_number, safety_topic_ko, safety_topic_vi
)
VALUES
{',\n'.join(values)}
ON CONFLICT (id) DO UPDATE SET
    category = EXCLUDED.category,
    question_text = EXCLUDED.question_text,
    vietnamese_meaning = EXCLUDED.vietnamese_meaning,
    suggested_answers = EXCLUDED.suggested_answers,
    industry = EXCLUDED.industry,
    safety_group = EXCLUDED.safety_group,
    safety_topic_number = EXCLUDED.safety_topic_number,
    safety_topic_ko = EXCLUDED.safety_topic_ko,
    safety_topic_vi = EXCLUDED.safety_topic_vi,
    updated_at = now();
"""


def main() -> None:
    document = fitz.open(PDF_PATH)
    rows = parse_questions(normalize_lines(document))
    topics = {int(row["topic_number"]) for row in rows}
    if topics != set(range(1, 31)):
        raise RuntimeError(f"Expected topics 1..30, found: {sorted(topics)}")
    OUTPUT_PATH.write_text(build_sql(rows), encoding="utf-8")
    print(f"Created {OUTPUT_PATH.relative_to(ROOT)} with {len(rows)} questions across {len(topics)} topics")


if __name__ == "__main__":
    main()
