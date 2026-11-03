import io
from dataclasses import dataclass

import pytest

from app.services import document_storage as storage
from app.services.document_storage import (
    DocumentNotFound,
    FileTooLarge,
    InvalidUpload,
    UnsupportedFileType,
    resolve_stored,
    sanitize_filename,
    save_upload,
)

PDF = b"%PDF-1.4\nhello\n%%EOF\n"
JPG = b"\xff\xd8\xff\xe0" + b"\x00" * 20
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 20


@dataclass
class FakeUpload:
    filename: str | None
    file: io.BytesIO


def upload(name: str | None, content: bytes) -> FakeUpload:
    return FakeUpload(name, io.BytesIO(content))


@pytest.fixture(autouse=True)
def upload_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(storage.settings, "upload_dir", str(tmp_path))
    return tmp_path


def files_on_disk(root):
    return [p for p in root.rglob("*") if p.is_file()]


@pytest.mark.parametrize(
    ("name", "content", "ext"),
    [
        ("cert.pdf", PDF, "pdf"),
        ("CERT.PDF", PDF, "pdf"),
        ("photo.jpg", JPG, "jpg"),
        ("photo.jpeg", JPG, "jpg"),
        ("scan.png", PNG, "png"),
    ],
)
def test_valid_files_are_saved_under_a_uuid_name(upload_dir, name, content, ext):
    stored = save_upload(upload(name, content), contractor_id=7)

    assert stored.extension == ext
    assert stored.original_filename == name
    assert stored.relative_path.startswith("contractors/7/")
    assert stored.relative_path.endswith(f".{ext}")
    assert name.lower() not in stored.relative_path  # the user's name is never used on disk
    assert (upload_dir / stored.relative_path).read_bytes() == content


@pytest.mark.parametrize("name", ["notes.txt", "run.exe", "archive.pdf.zip", "noextension", None, ""])
def test_wrong_extension_is_415(upload_dir, name):
    with pytest.raises(UnsupportedFileType):
        save_upload(upload(name, PDF), contractor_id=1)
    assert files_on_disk(upload_dir) == []


@pytest.mark.parametrize(
    ("name", "content"),
    [
        ("fake.pdf", PNG),  # right extension, wrong content
        ("fake.pdf", b"just some text"),
        ("fake.png", PDF),
        ("fake.jpg", PNG),
        ("fake.png", b"\x89PNG"),  # truncated signature
    ],
)
def test_wrong_magic_bytes_is_415(upload_dir, name, content):
    with pytest.raises(UnsupportedFileType):
        save_upload(upload(name, content), contractor_id=1)
    assert files_on_disk(upload_dir) == []


def test_empty_file_is_rejected(upload_dir):
    with pytest.raises(InvalidUpload):
        save_upload(upload("empty.pdf", b""), contractor_id=1)
    assert files_on_disk(upload_dir) == []


def test_file_over_10_mb_is_rejected_and_leaves_nothing_behind(upload_dir):
    too_big = PDF + b"0" * storage.MAX_UPLOAD_BYTES  # one byte past the limit and more

    with pytest.raises(FileTooLarge):
        save_upload(upload("big.pdf", too_big), contractor_id=1)
    assert files_on_disk(upload_dir) == []


def test_file_of_exactly_10_mb_is_accepted(upload_dir):
    content = PDF + b"0" * (storage.MAX_UPLOAD_BYTES - len(PDF))

    stored = save_upload(upload("max.pdf", content), contractor_id=1)

    assert (upload_dir / stored.relative_path).stat().st_size == storage.MAX_UPLOAD_BYTES


def test_oversize_upload_stops_reading_early(upload_dir):
    class CountingFile(io.BytesIO):
        total_read = 0

        def read(self, size=-1):
            data = super().read(size)
            CountingFile.total_read += len(data)
            return data

    huge = CountingFile(PDF + b"0" * (storage.MAX_UPLOAD_BYTES * 3))
    with pytest.raises(FileTooLarge):
        save_upload(FakeUpload("huge.pdf", huge), contractor_id=1)

    assert CountingFile.total_read <= storage.MAX_UPLOAD_BYTES + storage.CHUNK_SIZE


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        (None, "document.pdf"),
        ("", "document.pdf"),
        ("   ", "document.pdf"),
        ("a/b.pdf", "b.pdf"),
        ("..\\..\\secret.pdf", "secret.pdf"),
        ("C:\\Users\\me\\scan.pdf", "scan.pdf"),
        ("../../etc/passwd.pdf", "passwd.pdf"),
        ("bad\x00name\x1f.pdf", "badname.pdf"),
        ("..", "document.pdf"),
        ("folder/", "document.pdf"),
    ],
)
def test_sanitize_filename(raw, expected):
    assert sanitize_filename(raw, "pdf") == expected


def test_sanitize_filename_trims_to_255_and_keeps_the_extension():
    result = sanitize_filename("x" * 400 + ".pdf", "pdf")

    assert len(result) == 255
    assert result.endswith(".pdf")


def test_resolve_stored_returns_a_saved_file(upload_dir):
    stored = save_upload(upload("cert.pdf", PDF), contractor_id=1)

    assert resolve_stored(stored.relative_path) == (upload_dir / stored.relative_path).resolve()


@pytest.mark.parametrize(
    "bad_path",
    [
        "../outside.pdf",
        "contractors/../../outside.pdf",
        "/etc/passwd",
        "contractors/1/missing.pdf",
        "contractors",  # a directory, not a file
        "",
        "bad\x00path.pdf",
    ],
)
def test_resolve_stored_rejects_unsafe_or_missing_paths(upload_dir, tmp_path_factory, bad_path):
    outside = tmp_path_factory.mktemp("outside") / "outside.pdf"
    outside.write_bytes(PDF)
    (upload_dir / "contractors").mkdir()

    with pytest.raises(DocumentNotFound):
        resolve_stored(bad_path)


def test_resolve_stored_rejects_a_symlink_that_leaves_the_upload_dir(upload_dir, tmp_path_factory):
    secret = tmp_path_factory.mktemp("elsewhere") / "secret.pdf"
    secret.write_bytes(PDF)
    (upload_dir / "link.pdf").symlink_to(secret)

    with pytest.raises(DocumentNotFound):
        resolve_stored("link.pdf")
