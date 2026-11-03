from app.models import User
from app.seed import seed_users


def test_seed_is_idempotent(db_session):
    first = seed_users(db_session)
    assert first == {"created": 5, "skipped": 0}
    assert db_session.query(User).count() == 5

    second = seed_users(db_session)
    assert second == {"created": 0, "skipped": 5}
    assert db_session.query(User).count() == 5

    emails = [u.email for u in db_session.query(User).all()]
    assert len(emails) == len(set(emails))


def test_seed_links_engineers_to_manager(db_session):
    seed_users(db_session)

    manager = db_session.query(User).filter(User.email == "manager@srct.local").one()
    engineer1 = db_session.query(User).filter(User.email == "engineer1@srct.local").one()
    engineer2 = db_session.query(User).filter(User.email == "engineer2@srct.local").one()

    assert engineer1.manager_id == manager.id
    assert engineer2.manager_id == manager.id


def test_seed_demo_invoices_is_idempotent_and_covers_every_aging_band(db_session):
    from app.models import ApprovalStatus, Invoice
    from app.seed import seed_demo_invoices
    from app.services.aging import AgingBand, compute_aging
    from app.services.dates import riyadh_today

    seed_users(db_session)
    assert seed_demo_invoices(db_session) == {"requests": 2, "invoices": 6}
    assert seed_demo_invoices(db_session) == {"requests": 0, "invoices": 0}

    pending = db_session.query(Invoice).filter(Invoice.approval_status == ApprovalStatus.PENDING)
    bands = {compute_aging(i.due_date, i.submission_date, riyadh_today())[1] for i in pending}
    assert bands == set(AgingBand)
    assert db_session.query(Invoice).filter(
        Invoice.approval_status == ApprovalStatus.APPROVED
    ).count() == 1
    assert db_session.query(Invoice).filter(
        Invoice.approval_status == ApprovalStatus.REJECTED
    ).count() == 1


def test_seed_demo_contractors_is_idempotent_and_covers_every_status(db_session, tmp_path, monkeypatch):
    from app.models import Contractor
    from app.seed import seed_demo_contractors
    from app.services import document_storage
    from app.services.compliance import DocumentStatus, document_status
    from app.services.contractor_documents import current_documents
    from app.services.dates import riyadh_today

    monkeypatch.setattr(document_storage.settings, "upload_dir", str(tmp_path))
    seed_users(db_session)

    assert seed_demo_contractors(db_session) == {"contractors": 3, "documents": 13}
    assert seed_demo_contractors(db_session) == {"contractors": 0, "documents": 0}
    assert db_session.query(Contractor).count() == 3

    by_name = {c.name: c for c in db_session.query(Contractor)}
    today = riyadh_today()

    def statuses(name):
        docs = current_documents(db_session, [by_name[name].id])
        return {d.doc_type.value: document_status(d.expiry_date, today) for d in docs}

    assert set(statuses("Demo: Northgate Safety Services").values()) == {DocumentStatus.VALID}
    assert len(statuses("Demo: Northgate Safety Services")) == 5

    eastline = statuses("Demo: Eastline Maintenance Co.")
    assert eastline["HIP"] == DocumentStatus.EXPIRING_SOON  # the +12 days one, not the old row
    assert eastline["JSA"] == DocumentStatus.EXPIRED
    assert len(eastline) == 5

    assert set(statuses("Demo: Redsand Electrical")) == {"HIP", "JSA"}


def test_seed_demo_contractors_writes_downloadable_pdfs_and_repairs_a_wiped_volume(
    client, db_session, tmp_path, monkeypatch
):
    import shutil

    from app.models import ContractorDocument
    from app.seed import seed_demo_contractors
    from app.services import document_storage
    from tests.helpers import auth_headers, get_user

    monkeypatch.setattr(document_storage.settings, "upload_dir", str(tmp_path))
    seed_users(db_session)
    seed_demo_contractors(db_session)
    manager = get_user(db_session, "manager@srct.local")

    document = db_session.query(ContractorDocument).first()
    response = client.get(f"/documents/{document.id}/download", headers=auth_headers(manager))
    assert response.status_code == 200
    assert response.content.startswith(b"%PDF-")

    shutil.rmtree(tmp_path / "contractors")  # the upload volume was wiped
    assert seed_demo_contractors(db_session) == {"contractors": 0, "documents": 0}
    response = client.get(f"/documents/{document.id}/download", headers=auth_headers(manager))
    assert response.status_code == 200


def test_placeholder_pdf_has_a_valid_xref_table():
    """Every xref entry must point at the start of its object, and startxref at the table:
    that is what keeps viewers from calling the file damaged."""
    import re

    from app.seed import PLACEHOLDER_PDF

    pdf = PLACEHOLDER_PDF
    assert pdf.startswith(b"%PDF-") and pdf.rstrip().endswith(b"%%EOF")

    xref_at = int(re.search(rb"startxref\n(\d+)\n", pdf).group(1))
    assert pdf[xref_at:].startswith(b"xref\n")

    count = int(re.match(rb"xref\n0 (\d+)\n", pdf[xref_at:]).group(1))
    entries = pdf[xref_at:].split(b"\n")[2 : 2 + count]
    assert all(len(entry) + 1 == 20 for entry in entries)  # 19 characters plus the newline
    assert entries[0] == b"0000000000 65535 f "
    for number, entry in enumerate(entries[1:], start=1):
        offset = int(entry[:10])
        assert pdf[offset:].startswith(b"%d 0 obj\n" % number)
    assert b"/Size %d" % count in pdf


def test_seed_rewrites_a_stale_placeholder_file(db_session, tmp_path, monkeypatch):
    from app.models import ContractorDocument
    from app.seed import PLACEHOLDER_PDF, seed_demo_contractors
    from app.services import document_storage

    monkeypatch.setattr(document_storage.settings, "upload_dir", str(tmp_path))
    seed_users(db_session)
    seed_demo_contractors(db_session)
    document = db_session.query(ContractorDocument).first()
    path = tmp_path / document.file_path
    path.write_bytes(b"%PDF-1.4\nold broken placeholder\n")  # what an older seed left behind

    assert seed_demo_contractors(db_session) == {"contractors": 0, "documents": 0}

    assert path.read_bytes() == PLACEHOLDER_PDF
