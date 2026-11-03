class BadRequest(Exception):
    """Base for errors the client caused and can fix. app.main answers every subclass with
    a 400 and str(error), so the message must be safe to show. A new "invalid X" error only
    needs to subclass this; it needs no handler of its own."""
