"""Seam 5: the text-to-speech provider interface.

Added in response to a real limitation rather than speculatively: browser
speech synthesis can only use voices the operating system already has, and
Bangla voices are absent on most desktop Linux installs and many others
(scope.md section 7). A frontend cannot fix that, because the missing piece is
on the machine, not in the code.

Shaped exactly like seam 1 (services/base.py) so the two read the same way.
Routers depend on this Protocol, never on a vendor. Moving from the keyless
development endpoint to Google Cloud Text-to-Speech, or to a self-hosted
model, is one new file plus one environment variable.

See decisions.md D-016.
"""

from typing import Protocol, runtime_checkable


@runtime_checkable
class TtsProvider(Protocol):
    """Turns text into speech audio bytes.

    Returns the audio and its MIME type together, because the caller streams
    both to the browser and must not have to assume a format.
    """

    name: str
    #: MIME type this provider emits, e.g. "audio/mpeg".
    media_type: str

    async def synthesize(self, text: str, lang: str) -> bytes: ...
