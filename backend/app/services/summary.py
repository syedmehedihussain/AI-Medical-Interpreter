"""Conversation summary backed by Gemini (the app's "medical brain").

This does not go through the translation provider seam. A summary needs a
generative model, and the seam's other providers (mymemory, google_free) cannot
produce one, so the summarizer calls Gemini directly via
gemini.generate_text -- regardless of TRANSLATION_PROVIDER. If GEMINI_API_KEY is
not configured, generate_text raises PROVIDER_UNAVAILABLE, exactly as it does
for a Gemini translation.

The prompt is written for clinical safety: the model may only use what is in the
transcript and must write "Not discussed" for an empty section rather than
inferring anything. A summary tool that invents symptoms is worse than no tool.
"""

import logging

from app.models import SummaryTurn
from app.services.gemini import generate_text

logger = logging.getLogger(__name__)

SPEAKER_LABELS = {"doctor": "Doctor", "patient": "Patient"}

# The exact section headers the model is told to emit. Kept as data so the
# rendered note and the prompt cannot drift apart.
SECTIONS = (
    "Chief complaint",
    "Key symptoms",
    "History / meds mentioned",
    "Suggested follow-up",
)


def build_summary_prompt(turns: list[SummaryTurn]) -> str:
    """Assemble the transcript and instruction sent to Gemini."""
    lines = []
    for turn in turns:
        label = SPEAKER_LABELS.get(turn.speaker.lower(), turn.speaker)
        lines.append(f"{label}: {turn.text}")
    transcript = "\n".join(lines)

    sections = "\n".join(SECTIONS)
    return (
        "You are a clinical scribe. Read the transcript of a consultation "
        "between a doctor and a patient and write a concise summary for the "
        "doctor to review after the visit.\n"
        "Output EXACTLY these four sections, each starting with the header on "
        "its own line, followed by short bullet points (prefixed with '- ') or "
        "a single short sentence:\n"
        f"{sections}\n"
        "Rules:\n"
        "- Use ONLY information stated in the transcript. Do not infer, "
        "diagnose, or add anything that was not said.\n"
        "- Preserve drug names, dosages, numbers, and units exactly.\n"
        "- If a section has no relevant information, write 'Not discussed' "
        "under its header.\n"
        "- Write in English. Output only the four sections, with no preamble, "
        "title, or closing remark.\n\n"
        f"Transcript:\n{transcript}"
    )


async def summarize_conversation(turns: list[SummaryTurn]) -> str:
    """Return a clinical-note summary of the conversation.

    Raises a provider AppError if Gemini is unavailable or fails.
    """
    prompt = build_summary_prompt(turns)
    return await generate_text(prompt)
