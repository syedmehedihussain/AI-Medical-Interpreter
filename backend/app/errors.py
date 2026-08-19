"""Application errors, one class per code in schema.md section 2.1.

Two rules govern this file:

1. `message` is written for the end user and is returned verbatim in the
   response. Keep it in the register prd.md section 7 uses: say what happened
   and what to do, do not apologise.
2. `log_detail` is for the server log and is NEVER returned. Upstream provider
   messages, API key problems, and tracebacks go here (schema.md 5.3 rule 5).

Raising one of these anywhere -- a route, a service, even a Pydantic validator
-- produces the correct status and error envelope, because main.py registers a
handler for the base class.
"""

from app.models import ErrorCode


class AppError(Exception):
    """Base class carrying a code, a user-facing message, a status, and retryability."""

    code: ErrorCode = ErrorCode.INTERNAL_ERROR
    status_code: int = 500
    retryable: bool = True
    message: str = "Something went wrong. Try again."

    def __init__(self, message: str | None = None, *, log_detail: str | None = None) -> None:
        # Instance message overrides the class default when a caller has
        # something more specific and still safe to show.
        self.message = message or type(self).message
        self.log_detail = log_detail
        # What lands in the log: the internal detail when there is one, so the
        # traceback carries the real reason rather than the sanitised copy.
        super().__init__(log_detail or self.message)


# --- Input errors. Not retryable: the same request will fail the same way. ---


class EmptyInputError(AppError):
    code = ErrorCode.EMPTY_INPUT
    status_code = 400
    retryable = False
    message = "Enter some text to translate."


class SameLanguageError(AppError):
    code = ErrorCode.SAME_LANGUAGE
    status_code = 400
    retryable = False
    message = "Choose two different languages."


class UnsupportedLanguageError(AppError):
    code = ErrorCode.UNSUPPORTED_LANGUAGE
    status_code = 400
    retryable = False
    message = "That language isn't supported yet."


class TextTooLongError(AppError):
    code = ErrorCode.TEXT_TOO_LONG
    status_code = 400
    retryable = False
    message = "That's too long to translate at once. Keep it under 500 characters."


class ValidationError(AppError):
    code = ErrorCode.VALIDATION_ERROR
    status_code = 422
    retryable = False
    message = "That request wasn't valid."


# --- Provider errors. Retryable: the same request may succeed later. ---


class ProviderUnavailableError(AppError):
    """Upstream is down, or the API key is missing or rejected.

    Deliberately one error for all three. schema.md 2.1 and prd.md E-16 require
    a missing key to look identical to an outage from the outside; telling an
    anonymous caller that the server has no credentials configured is an
    information leak with no upside. The real reason goes to log_detail.
    """

    code = ErrorCode.PROVIDER_UNAVAILABLE
    status_code = 503
    retryable = True
    message = "Translation service unavailable."


class ProviderRateLimitedError(AppError):
    code = ErrorCode.PROVIDER_RATE_LIMITED
    status_code = 429
    retryable = True
    message = "Too many requests right now. Wait a moment and try again."


class ProviderTimeoutError(AppError):
    code = ErrorCode.PROVIDER_TIMEOUT
    status_code = 504
    retryable = True
    message = "That took too long. Try again."


class InternalError(AppError):
    code = ErrorCode.INTERNAL_ERROR
    status_code = 500
    retryable = True
    message = "Translation failed. Try again."
