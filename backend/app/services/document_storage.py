"""Validates and stores uploaded contractor documents on disk.

The database keeps only a path relative to UPLOAD_DIR plus the name the user uploaded.
The file on disk is always named by a random uuid, never by anything the client sent.
"""

import re
import uuid
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import BinaryIO, Protocol

from app.core.config import settings

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
CHUNK_SIZE = 64 * 1024
MAX_FILENAME_LENGTH = 255

# extension -> (magic bytes the file must start with, extension used on disk)
_TYPES: dict[str, tuple[bytes, str]] = {
    ".pdf": (b"%PDF-", "pdf"),
    ".jpg": (b"\xff\xd8\xff", "jpg"),
    ".jpeg": (b"\xff\xd8\xff", "jpg"),
    ".png": (b"\x89PNG\r\n\x1a\n", "png"),
}
ALLOWED_EXTENSIONS = tuple(_TYPES)

MEDIA_TYPES = {"pdf": "application/pdf", "jpg": "image/jpeg", "png": "image/png"}

_CONTROL_CHARACTERS = re.compile(r"[\x00-\x1f\x7f]")


class UnsupportedFileType(Exception):
    """Wrong extension, or the content does not match it. app.main answers with a 415."""


class FileTooLarge(Exception):
    """More than MAX_UPLOAD_BYTES. app.main answers with a 413."""


class InvalidUpload(Exception):
    """The upload is unusable (for example empty). app.main answers with a 422."""


class DocumentNotFound(Exception):
    """The document row or its file does not exist (or the stored path is not safe)."""


class UploadedFile(Protocol):
    """The part of Starlette's UploadFile this module uses, so tests can pass plain objects."""

    filename: str | None
    file: BinaryIO


@dataclass(frozen=True)
class StoredFile:
    relative_path: str  # relative to UPLOAD_DIR, what goes into contractor_documents.file_path
    original_filename: str  # sanitized display name, only ever used in the download header
    extension: str  # "pdf" | "jpg" | "png"


def upload_root() -> Path:
    return Path(settings.upload_dir)


def sanitize_filename(name: str | None, fallback_extension: str) -> str:
    """A safe display name: the last path part (split on both / and \\), no control
    characters, at most 255 characters with the extension kept. It is never used on disk."""
    fallback = f"document.{fallback_extension}"
    if not name:
        return fallback
    last_part = re.split(r"[\\/]", name)[-1]
    cleaned = _CONTROL_CHARACTERS.sub("", last_part).strip()
    if not cleaned or cleaned in {".", ".."}:
        return fallback
    if len(cleaned) > MAX_FILENAME_LENGTH:
        suffix = PurePosixPath(cleaned).suffix
        if suffix and len(suffix) < 20:
            cleaned = cleaned[: MAX_FILENAME_LENGTH - len(suffix)] + suffix
        else:
            cleaned = cleaned[:MAX_FILENAME_LENGTH]
    return cleaned


def _extension_of(name: str | None) -> str:
    if not name:
        return ""
    return PurePosixPath(re.split(r"[\\/]", name)[-1]).suffix.lower()


def save_upload(upload: UploadedFile, contractor_id: int) -> StoredFile:
    """Checks the extension and the first bytes, then copies the file to
    UPLOAD_DIR/contractors/{contractor_id}/{uuid}.{ext} in chunks, stopping as soon as it
    passes the size limit. A rejected upload leaves nothing on disk."""
    suffix = _extension_of(upload.filename)
    if suffix not in _TYPES:
        raise UnsupportedFileType("Only PDF, JPG and PNG files are allowed")
    magic, disk_extension = _TYPES[suffix]

    first_chunk = upload.file.read(CHUNK_SIZE)
    if not first_chunk:
        raise InvalidUpload("The file is empty")
    if not first_chunk.startswith(magic):
        raise UnsupportedFileType("The file content does not match its extension")

    relative = PurePosixPath("contractors", str(contractor_id), f"{uuid.uuid4().hex}.{disk_extension}")
    target = upload_root() / relative
    target.parent.mkdir(parents=True, exist_ok=True)

    written = 0
    chunk = first_chunk
    try:
        with open(target, "wb") as out:
            while chunk:
                written += len(chunk)
                if written > MAX_UPLOAD_BYTES:
                    raise FileTooLarge("The file is larger than 10 MB")
                out.write(chunk)
                chunk = upload.file.read(CHUNK_SIZE)
    except BaseException:
        target.unlink(missing_ok=True)
        raise

    return StoredFile(
        relative_path=str(relative),
        original_filename=sanitize_filename(upload.filename, disk_extension),
        extension=disk_extension,
    )


def delete_stored(relative_path: str) -> None:
    """Best-effort removal (used to undo a save when the database write fails). It goes
    through resolve_stored's safety check and never raises."""
    try:
        resolve_stored(relative_path).unlink(missing_ok=True)
    except (DocumentNotFound, OSError):
        pass


def resolve_stored(relative_path: str) -> Path:
    """The real path of a stored file. It must stay inside UPLOAD_DIR and be a regular
    file, otherwise DocumentNotFound: a bad path in the database cannot read other files."""
    try:
        root = upload_root().resolve()
        path = (root / relative_path).resolve()
        if not path.is_relative_to(root) or not path.is_file():
            raise DocumentNotFound()
    except (ValueError, OSError) as error:  # ValueError: for example a null byte in the path
        raise DocumentNotFound() from error
    return path
