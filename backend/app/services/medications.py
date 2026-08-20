"""Medication extraction backed by Gemini (the app's "medical brain").

Like the summary feature, this needs a generative model and so calls Gemini
directly via gemini.generate_text rather than going through the translation
provider seam. After each translated turn the frontend sends that turn's English
text here; the model returns any medications named in it, each with a canonical
English name, whatever dosage/frequency was said, and a `confident` flag that is
False when the name is unclear or possibly misheard. Uncertain names surface a
confirm/edit control for the doctor.

Robustness matters more than completeness: this runs on every turn, so a model
reply that is not clean JSON must degrade to "no medications this turn" rather
than raise. parse_medications strips code fences, isolates the JSON array, and
returns [] on anything it cannot read.
"""

import json
import logging
import re

from app.models import Medication
from app.services.gemini import generate_text

logger = logging.getLogger(__name__)

# Grabs the first [...] array in the model's reply, even if it wrapped the JSON
# in prose or a ```json fence. DOTALL so the array can span newlines.
_ARRAY_RE = re.compile(r"\[.*\]", re.DOTALL)


def build_extraction_prompt(text: str) -> str:
    """The instruction sent to the model for one turn of conversation."""
    return (
        "You extract medications from a single utterance in a doctor-patient "
        "consultation. Read the text and list every medication (drug) that is "
        "explicitly named.\n"
        "Return ONLY a JSON array. Each element is an object with keys:\n"
        '  "name": the canonical English brand or generic name (normalise a '
        "Bangla mention or a likely misspelling to the standard English name),\n"
        '  "dosage": the dose if stated (e.g. "500mg"), else "",\n'
        '  "times_per_day": how many times a day if stated, as a short string '
        '(e.g. "2" or "twice"), else "",\n'
        '  "timing": when it is taken if stated (e.g. "before breakfast", "at '
        'night"), else "",\n'
        '  "confident": true if you are sure you identified the drug name '
        "correctly, false if the name is unclear, ambiguous, or possibly "
        "misheard.\n"
        "Rules:\n"
        "- Include a medication only if a drug is actually named. Do not infer "
        "or suggest medications that were not mentioned.\n"
        "- If no medication is named, return exactly [].\n"
        "- Output only the JSON array, no prose, no code fence.\n\n"
        f"Text:\n{text}"
    )


def parse_medications(raw: str) -> list[Medication]:
    """Turn the model's reply into Medication objects, tolerating noise.

    Returns [] for an empty list, unparseable JSON, or a shape that is not a
    list of objects. Individual malformed entries are skipped rather than failing
    the whole turn.
    """
    match = _ARRAY_RE.search(raw or "")
    if not match:
        return []
    try:
        items = json.loads(match.group(0))
    except (json.JSONDecodeError, ValueError):
        logger.warning("medication extraction returned non-JSON: %r", raw[:200])
        return []
    if not isinstance(items, list):
        return []

    medications: list[Medication] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name", "")).strip()
        if not name:
            continue
        medications.append(
            Medication(
                name=name,
                dosage=str(item.get("dosage", "") or "").strip(),
                # Coerced to str: the model sometimes returns a bare number.
                times_per_day=str(item.get("times_per_day", "") or "").strip(),
                timing=str(item.get("timing", "") or "").strip(),
                # Default to needing confirmation unless the model is explicit.
                confident=bool(item.get("confident", False)),
            )
        )
    return medications


async def extract_medications(text: str) -> list[Medication]:
    """Return the medications named in one turn of text.

    Raises a provider AppError if Gemini itself is unavailable; the caller (the
    router) maps that, and the frontend simply leaves the list unchanged for the
    failed turn.
    """
    prompt = build_extraction_prompt(text)
    raw = await generate_text(prompt)
    return parse_medications(raw)
