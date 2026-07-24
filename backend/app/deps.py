"""Seam 2: the current user.

v0.1 has no login. Every request is the same anonymous operator
(decisions.md D-007). This file exists anyway so the *shape* is right.

Endpoints already declare `user = Depends(get_current_user)` even though
nothing reads the result yet. The point is that adding authentication in v0.2
changes the body of one function here and nothing else: no endpoint signature
moves, no route is rewritten, and the ownership rules in schema.md section 5
become implementable without restructuring. Retrofitting auth the other way
round means editing every endpoint in the app.

v0.2 replaces the body of get_current_user with: read the Authorization
header, decode the JWT, look the user up, raise 401 if any of that fails.
"""

from uuid import uuid4

from pydantic import BaseModel


async def new_request_id() -> str:
    """A short id identifying one request, for the `meta.request_id` field.

    Eight hex characters, matching the examples in schema.md section 2. Not a
    full UUID because this is a correlation handle for reading logs, not an
    identifier for anything stored. Short enough to quote in a bug report.

    Declared as a dependency so every route gets one the same way, and so a
    later version can read an incoming X-Request-ID header instead of minting
    one without touching any route.
    """
    return uuid4().hex[:8]


class CurrentUser(BaseModel):
    """Who is making this request.

    `role` uses the vocabulary from schema.md 4.1 once real users exist
    (doctor, nurse, pharmacist, interpreter, admin, researcher). v0.1 has one
    role, "operator", because there is nobody to distinguish.
    """

    id: str
    role: str
    is_anonymous: bool


async def get_current_user() -> CurrentUser:
    """Return the anonymous operator.

    Async purely so the signature does not change when v0.2 needs to await a
    database lookup. FastAPI handles sync dependencies fine; switching a
    dependency from sync to async later is a change every caller would have to
    tolerate, and there is no reason to take that on.
    """
    return CurrentUser(id="anonymous", role="operator", is_anonymous=True)
