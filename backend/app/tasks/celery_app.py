"""The Celery app, shared by the worker, Beat and the code that enqueues tasks.

Run with:  celery -A app.tasks.celery_app worker   /   celery -A app.tasks.celery_app beat
"""

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "srct",
    broker=settings.redis_url,
    include=[
        "app.tasks.email_task",
        "app.tasks.invoice_jobs",
        "app.tasks.document_jobs",
    ],
)

celery_app.conf.update(
    timezone=settings.app_timezone,  # Beat's crontab below is read in Riyadh time
    enable_utc=True,
    broker_connection_retry_on_startup=True,
    beat_schedule={
        "scan-invoices-daily": {
            "task": "app.tasks.invoice_jobs.scan_invoices_daily",
            "schedule": crontab(hour=6, minute=0),
        },
        "scan-documents-daily": {
            "task": "app.tasks.document_jobs.scan_documents_daily",
            "schedule": crontab(hour=6, minute=0),
        },
    },
)
