"""A first, minimal clinical safety check on provider output.

This is the response envelope's `needs_review` and `risk_flags` fields being
used for the first time. Until now they were always false and empty, present
only so the shape would not change when a real safety layer arrived
(decisions.md D-011). This is the beginning of that layer.

What prompted it: MyMemory returned Hindi (`शुभ प्रभात`) for an English phrase
requested in Bangla. Handing a Bangla-speaking patient text in a language they
may not read, with no indication anything went wrong, is a real harm, not a
cosmetic defect. The check below is deliberately shallow -- it verifies the
script, not the meaning -- but a wrong script is both the most detectable
failure and the most obviously wrong to a reader.

It flags rather than blocks. A flagged translation is still returned and still
displayed, because a suspicious translation is more useful than none, and the
operator is a clinician who can judge. The flag makes the doubt visible.
"""

from app.models import RiskFlag, RiskFlagType, TranslationResult

# Unicode block boundaries for the scripts v0.1 handles.
BENGALI_RANGE = ("ঀ", "৿")

# Below this share of expected-script letters, the output is treated as
# suspect. Not 1.0: correct Bangla legitimately contains Latin characters for
# drug names, dosages, and units ("Napa 500mg"), and those must not trip it.
MIN_EXPECTED_SCRIPT_RATIO = 0.5

# Below this many alphabetic characters there is not enough evidence to judge.
# A translation whose entire output is "500 mg" or "ORS" is legitimate: units
# and drug names do not translate. Flagging those would train the operator to
# ignore the warning, which is worse than not showing it. Long enough strings
# still get caught: "I am fine" is seven letters.
MIN_LETTERS_TO_JUDGE = 4


def _is_bengali(char: str) -> bool:
    return BENGALI_RANGE[0] <= char <= BENGALI_RANGE[1]


def expected_script_ratio(text: str, lang: str) -> float:
    """Share of alphabetic characters that belong to `lang`'s script.

    Digits, punctuation, and whitespace are ignored: they are shared across
    scripts and would dilute the measurement.
    """
    letters = [c for c in text if c.isalpha()]
    if len(letters) < MIN_LETTERS_TO_JUDGE:
        return 1.0  # Too little evidence; stay silent rather than cry wolf.

    if lang == "bn":
        matching = [c for c in letters if _is_bengali(c)]
    elif lang == "en":
        matching = [c for c in letters if c.isascii()]
    else:
        return 1.0  # Unknown language: no opinion rather than a false alarm.

    return len(matching) / len(letters)


def check_translation(result: TranslationResult, target_lang: str) -> TranslationResult:
    """Return `result`, flagged if its script does not match the target.

    Returns a copy rather than mutating, so a provider's object is never
    modified behind its back.
    """
    text = result.translated_text
    ratio = expected_script_ratio(text, target_lang)
    if ratio >= MIN_EXPECTED_SCRIPT_RATIO:
        return result

    flag = RiskFlag(
        type=RiskFlagType.LOW_CONFIDENCE,
        span=(0, len(text)),
        severity="high",
        note=(
            f"Translation does not appear to be in the expected script for "
            f"'{target_lang}'. It may be in the wrong language, or transliterated. "
            f"Verify before relying on it."
        ),
    )
    return result.model_copy(
        update={
            "risk_flags": [*result.risk_flags, flag],
            "needs_review": True,
        }
    )
