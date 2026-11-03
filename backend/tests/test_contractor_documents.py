from datetime import date, datetime, timedelta

import pytest

from app.models import AuditLog, Contractor, ContractorDocument, DocType
from app.services import document_storage as storage
from tests.helpers import auth_headers

TODAY = date(2026, 11, 3)
PDF = b"%PDF-1.4\nhello\n%%EOF\n"
JPG = b"\xff\xd8\xff\xe0" + b"\x00" * 20
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 20


@pytest.fixture(autouse=True)
def fixed_today_and_upload_dir(tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.contractors.riyadh_today", lambda: TODAY)
    monkeypatch.setattr("app.services.contractor_documents.riyadh_today", lambda: TODAY)
    monkeypatch.setattr(storage.settings, "upload_dir", str(tmp_path))
    return tmp_path


@pytest.fixture
def contractor(db_session, users):
    row = Contractor(
        name="Acme Safety",
        contact_email="acme@example.com",
        internal_manager_id=users["manager"].id,
    )
    db_session.add(row)
    db_session.commit()
    return row


def upload(client, user, contractor_id, *, name="cert.pdf", content=PDF, doc_type="HIP", expiry=None):
    expiry = expiry or (TODAY + timedelta(days=90)).isoformat()
    return client.post(
        f"/contractors/{contractor_id}/documents",
        data={"doc_type": doc_type, "expiry_date": expiry},
        files={"file": (name, content, "application/octet-stream")},
        headers=auth_headers(user),
    )


def files_on_disk(root):
    return [p for p in root.rglob("*") if p.is_file()]


# ------------------------------------------------------------------------ upload ok


@pytest.mark.parametrize(
    ("name", "content"),
    [("cert.pdf", PDF), ("photo.jpg", JPG), ("scan.png", PNG), ("PHOTO.JPEG", JPG)],
)
def test_manager_uploads_pdf_jpg_png(client, db_session, users, contractor, tmp_path, name, content):
    response = upload(client, users["manager"], contractor.id, name=name, content=content)

    assert response.status_code == 201
    body = response.json()
    assert body["doc_type"] == "HIP"
    assert body["original_filename"] == name
    assert body["status"] == "valid"
    assert body["days_left"] == 90
    assert body["is_current"] is True
    assert body["uploaded_by_name"] == users["manager"].full_name

    row = db_session.get(ContractorDocument, body["id"])
    assert row.uploaded_by == users["manager"].id
    assert row.file_path.startswith(f"contractors/{contractor.id}/")
    assert (tmp_path / row.file_path).read_bytes() == content
    assert "file_path" not in body  # the server path is never sent to the client


def test_upload_writes_an_audit_row(client, db_session, users, contractor):
    response = upload(client, users["manager"], contractor.id, doc_type="JSA")

    entry = db_session.query(AuditLog).filter_by(
        entity_type="contractor_document", entity_id=response.json()["id"]
    ).one()
    assert entry.action == "create"
    assert entry.user_id == users["manager"].id
    assert entry.old_values is None
    assert entry.new_values["doc_type"] == "JSA"
    assert entry.new_values["contractor_id"] == contractor.id
    assert entry.new_values["original_filename"] == "cert.pdf"


def test_uploading_the_same_type_again_keeps_the_old_row_as_history(
    client, db_session, users, contractor
):
    first = upload(client, users["manager"], contractor.id, name="v1.pdf").json()
    second = upload(client, users["manager"], contractor.id, name="v2.pdf").json()

    detail = client.get(f"/contractors/{contractor.id}", headers=auth_headers(users["manager"])).json()
    history = client.get(
        f"/contractors/{contractor.id}/documents",
        params={"doc_type": "HIP"},
        headers=auth_headers(users["manager"]),
    ).json()

    assert db_session.query(ContractorDocument).count() == 2
    (current,) = detail["current_documents"]
    assert current["id"] == second["id"]
    assert current["upload_count"] == 2
    assert [(d["id"], d["is_current"]) for d in history] == [(second["id"], True), (first["id"], False)]


def test_an_already_expired_date_is_accepted_and_shows_expired(client, users, contractor):
    response = upload(
        client,
        users["manager"],
        contractor.id,
        expiry=(TODAY - timedelta(days=5)).isoformat(),
    )

    assert response.status_code == 201
    assert response.json()["status"] == "expired"
    assert response.json()["days_left"] == -5


def test_hostile_filename_is_only_a_display_name(client, db_session, users, contractor, tmp_path):
    response = upload(client, users["manager"], contractor.id, name="../../../etc/evil.pdf")

    assert response.status_code == 201
    assert response.json()["original_filename"] == "evil.pdf"
    (path,) = files_on_disk(tmp_path)
    assert path.parent == tmp_path / "contractors" / str(contractor.id)
    assert "evil" not in path.name


# ---------------------------------------------------------------- upload rejections


def test_wrong_extension_is_415(client, db_session, users, contractor, tmp_path):
    response = upload(client, users["manager"], contractor.id, name="notes.txt")

    assert response.status_code == 415
    assert db_session.query(ContractorDocument).count() == 0
    assert files_on_disk(tmp_path) == []


@pytest.mark.parametrize(
    ("name", "content"), [("fake.pdf", PNG), ("fake.pdf", b"<html>not a pdf</html>"), ("fake.png", PDF)]
)
def test_wrong_magic_bytes_is_415(client, db_session, users, contractor, tmp_path, name, content):
    response = upload(client, users["manager"], contractor.id, name=name, content=content)

    assert response.status_code == 415
    assert "does not match" in response.json()["detail"]
    assert db_session.query(ContractorDocument).count() == 0
    assert files_on_disk(tmp_path) == []


def test_file_over_10_mb_is_413(client, db_session, users, contractor, tmp_path):
    big = PDF + b"0" * storage.MAX_UPLOAD_BYTES

    response = upload(client, users["manager"], contractor.id, content=big)

    assert response.status_code == 413
    assert response.json() == {"detail": "The file is larger than 10 MB"}
    assert db_session.query(ContractorDocument).count() == 0
    assert files_on_disk(tmp_path) == []


def test_empty_file_is_422(client, db_session, users, contractor, tmp_path):
    response = upload(client, users["manager"], contractor.id, content=b"")

    assert response.status_code == 422
    assert response.json() == {"detail": "The file is empty"}
    assert files_on_disk(tmp_path) == []


@pytest.mark.parametrize(
    "data",
    [
        {"doc_type": "NOPE", "expiry_date": "2027-01-01"},
        {"doc_type": "HIP", "expiry_date": "not-a-date"},
        {"doc_type": "HIP"},
        {"expiry_date": "2027-01-01"},
    ],
)
def test_invalid_form_fields_are_422(client, users, contractor, tmp_path, data):
    response = client.post(
        f"/contractors/{contractor.id}/documents",
        data=data,
        files={"file": ("cert.pdf", PDF)},
        headers=auth_headers(users["manager"]),
    )

    assert response.status_code == 422
    assert files_on_disk(tmp_path) == []


def test_missing_file_is_422(client, users, contractor):
    response = client.post(
        f"/contractors/{contractor.id}/documents",
        data={"doc_type": "HIP", "expiry_date": "2027-01-01"},
        headers=auth_headers(users["manager"]),
    )

    assert response.status_code == 422


def test_upload_to_an_inactive_contractor_is_409(client, db_session, users, contractor, tmp_path):
    contractor.is_active = False
    db_session.commit()

    response = upload(client, users["manager"], contractor.id)

    assert response.status_code == 409
    assert db_session.query(ContractorDocument).count() == 0
    assert files_on_disk(tmp_path) == []


def test_unknown_contractor_is_404_before_the_file_is_looked_at(client, users, tmp_path):
    # Even a bad file gets the 404: the contractor is checked before anything is read.
    response = upload(client, users["manager"], 999_999, name="notes.txt")

    assert response.status_code == 404
    assert files_on_disk(tmp_path) == []


def test_inactive_contractor_409_removes_the_file_it_already_saved(
    client, db_session, users, contractor, tmp_path
):
    # The file is saved before the contractor row is locked and checked, so the 409 path
    # must clean it up.
    contractor.is_active = False
    db_session.commit()

    response = upload(client, users["manager"], contractor.id)

    assert response.status_code == 409
    assert files_on_disk(tmp_path) == []


def test_upload_to_unknown_contractor_is_404(client, users, tmp_path):
    response = upload(client, users["manager"], 999_999)

    assert response.status_code == 404
    assert files_on_disk(tmp_path) == []


def test_failed_audit_write_leaves_no_row_and_no_file(
    client, db_session, users, contractor, tmp_path, monkeypatch
):
    def boom(*args, **kwargs):
        raise RuntimeError("audit failed")

    monkeypatch.setattr("app.services.contractor_documents.log_action", boom)

    with pytest.raises(RuntimeError):
        upload(client, users["manager"], contractor.id)

    assert db_session.query(ContractorDocument).count() == 0
    assert files_on_disk(tmp_path) == []


def test_failed_commit_deletes_the_saved_file(client, db_session, users, contractor, tmp_path, monkeypatch):
    real_commit = db_session.commit

    def failing_commit():
        raise RuntimeError("database went away")

    # Only the commit inside upload_document fails; the fixtures above already committed.
    monkeypatch.setattr(db_session, "commit", failing_commit)

    with pytest.raises(RuntimeError, match="database went away"):
        upload(client, users["manager"], contractor.id)

    monkeypatch.setattr(db_session, "commit", real_commit)
    assert files_on_disk(tmp_path) == []
    assert db_session.query(ContractorDocument).count() == 0


# ---------------------------------------------------------------------------- RBAC


def test_admin_cannot_upload(client, db_session, users, contractor, tmp_path):
    response = upload(client, users["admin"], contractor.id)

    assert response.status_code == 403
    assert db_session.query(ContractorDocument).count() == 0
    assert files_on_disk(tmp_path) == []


@pytest.mark.parametrize("who", ["engineer1", "operations"])
def test_engineer_and_operations_cannot_upload(client, users, contractor, tmp_path, who):
    assert upload(client, users[who], contractor.id).status_code == 403
    assert files_on_disk(tmp_path) == []


def test_upload_without_token_is_401(client, contractor):
    response = client.post(
        f"/contractors/{contractor.id}/documents",
        data={"doc_type": "HIP", "expiry_date": "2027-01-01"},
        files={"file": ("cert.pdf", PDF)},
    )

    assert response.status_code == 401


# -------------------------------------------------------------------------- download


@pytest.mark.parametrize("who", ["manager", "admin"])
def test_manager_and_admin_download_the_original_bytes_with_the_original_name(
    client, users, contractor, who
):
    created = upload(client, users["manager"], contractor.id, name="Safety Plan.pdf").json()

    response = client.get(f"/documents/{created['id']}/download", headers=auth_headers(users[who]))

    assert response.status_code == 200
    assert response.content == PDF
    assert response.headers["content-type"] == "application/pdf"
    # A name with a space is sent in the RFC 5987 form, which browsers decode back.
    assert "filename*=utf-8''Safety%20Plan.pdf" in response.headers["content-disposition"]


def test_download_uses_the_media_type_of_the_stored_file(client, users, contractor):
    created = upload(client, users["manager"], contractor.id, name="scan.png", content=PNG).json()

    response = client.get(f"/documents/{created['id']}/download", headers=auth_headers(users["manager"]))

    assert response.headers["content-type"] == "image/png"


@pytest.mark.parametrize("who", ["engineer1", "operations"])
def test_engineer_and_operations_cannot_download(client, users, contractor, who):
    created = upload(client, users["manager"], contractor.id).json()

    response = client.get(f"/documents/{created['id']}/download", headers=auth_headers(users[who]))

    assert response.status_code == 403


def test_download_without_token_is_401(client, users, contractor):
    created = upload(client, users["manager"], contractor.id).json()

    assert client.get(f"/documents/{created['id']}/download").status_code == 401


def test_download_unknown_document_is_404(client, users):
    response = client.get("/documents/999999/download", headers=auth_headers(users["manager"]))

    assert response.status_code == 404
    assert response.json() == {"detail": "Document not found"}


def make_row_with_path(db_session, users, contractor, file_path):
    row = ContractorDocument(
        contractor_id=contractor.id,
        doc_type=DocType.HIP,
        file_path=file_path,
        original_filename="x.pdf",
        expiry_date=TODAY,
        uploaded_by=users["manager"].id,
        uploaded_at=datetime(2026, 10, 1),
    )
    db_session.add(row)
    db_session.commit()
    return row


@pytest.mark.parametrize(
    "bad_path",
    [
        "../../etc/passwd",
        "contractors/../../../etc/passwd",
        "/etc/passwd",
        "contractors/1/never-saved.pdf",
        "contractors",
        "bad\x00path.pdf",
    ],
)
def test_download_never_serves_a_path_outside_the_upload_dir(
    client, db_session, users, contractor, bad_path
):
    row = make_row_with_path(db_session, users, contractor, bad_path)

    response = client.get(f"/documents/{row.id}/download", headers=auth_headers(users["manager"]))

    assert response.status_code == 404
    assert response.json() == {"detail": "Document not found"}  # no path or stack trace leaks


def test_download_refuses_a_file_next_to_but_outside_the_upload_dir(
    client, db_session, users, contractor, tmp_path
):
    # "<upload_dir>-evil" starts with the upload dir's text but is a different directory.
    sibling = tmp_path.parent / f"{tmp_path.name}-evil"
    sibling.mkdir()
    (sibling / "secret.pdf").write_bytes(PDF)
    row = make_row_with_path(db_session, users, contractor, f"../{sibling.name}/secret.pdf")

    response = client.get(f"/documents/{row.id}/download", headers=auth_headers(users["manager"]))

    assert response.status_code == 404
