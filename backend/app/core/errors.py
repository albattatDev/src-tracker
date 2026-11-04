class BadRequest(Exception):
    """Base for errors the client caused and can fix. app.main answers every subclass with
    a 400 and str(error), so the message must be safe to show. A new "invalid X" error only
    needs to subclass this; it needs no handler of its own."""



class FieldError(Exception):
    """A client error tied to one request field. app.main answers it with `status_code` and
    the same detail shape as a 422, so the UI shows the message on that field. The message
    must be safe to show."""

    status_code = 400

    def __init__(self, field: str, message: str) -> None:
        super().__init__(message)
        self.field = field
        self.message = message
