"""Fake translation provider. No network, no API key, no cost.

Exists so the entire pipeline -- router, models, error handling, and later the
whole frontend -- can be built and tested before a Google API key is in hand,
and so the app stays developable offline afterwards.

Note that this class does not inherit from TranslationProvider and does not
import it. It satisfies the Protocol structurally, by having a `name` and a
matching `translate`. That is the seam working as intended.
"""

import asyncio

from app.models import TranslationResult

# Deliberately slow. A provider that returned instantly would make the
# frontend's loading state (prd.md F-3) impossible to see, and the request-race
# handling in edge case E-17 impossible to trigger by hand.
SIMULATED_LATENCY_SECONDS = 0.3


class StubProvider:
    """Echoes the input back, tagged with the target language code."""

    name = "stub"

    async def translate(
        self, text: str, source_lang: str, target_lang: str, context: str | None = None
    ) -> TranslationResult:
        # asyncio.sleep, not time.sleep. time.sleep would block the event loop
        # and stall every other request for 300ms; asyncio.sleep yields control
        # back so the server keeps serving. This is the whole reason the
        # protocol method is `async`.
        await asyncio.sleep(SIMULATED_LATENCY_SECONDS)

        # The four clinical fields (detected_dialect, confidence, risk_flags,
        # needs_review) are left at their TranslationResult defaults of
        # None/None/[]/False. A general translation API has nothing to put in
        # them and neither does a stub. TorongoNet will (decisions.md D-011).
        return TranslationResult(translated_text=f"[{target_lang}] {text}")
