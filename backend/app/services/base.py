"""Seam 1: the translation provider interface.

This is the most important architectural piece in v0.1 (stack.md section 4,
decisions.md D-008). Routers depend on this Protocol and never on a vendor, so
swapping Google for Microsoft, or eventually for a self-hosted TorongoNet, is
one new file in this package plus one environment variable. No router changes.

The signature below is quoted verbatim from stack.md section 4. Do not widen or
narrow it without recording the reason in decisions.md.
"""

from typing import Protocol, runtime_checkable

from app.models import TranslationResult


@runtime_checkable
class TranslationProvider(Protocol):
    """What every translation backend must look like.

    This is structural typing, Python's answer to "if it walks like a duck".
    A class becomes a TranslationProvider by having the right attribute and
    method, not by inheriting from anything. StubProvider and the coming
    GoogleProvider both satisfy this without importing it or subclassing it,
    which is precisely why the dependency arrow points the right way: the
    router depends on the interface, and the implementations depend on nothing.

    Compare with the alternative, a router that does
    `from app.services.stub import StubProvider`. That router now knows which
    vendor it is talking to, and every provider change edits the router.

    runtime_checkable only enables isinstance() to confirm the members exist;
    it does not check signatures. It is here so conformance can be asserted in
    a check rather than assumed.
    """

    name: str

    async def translate(
        self, text: str, source_lang: str, target_lang: str, context: str | None
    ) -> TranslationResult: ...
