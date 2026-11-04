"""The task that actually sends an alert. The scans only claim rows and enqueue this."""

from app.core.database import SessionLocal
from app.services import notifications
from app.services.dates import riyadh_today
from app.tasks.celery_app import celery_app

MAX_ATTEMPTS = 3


@celery_app.task(
    bind=True,
    autoretry_for=notifications.RETRYABLE_ERRORS,
    retry_backoff=True,  # 1s, 2s, ... between attempts
    retry_backoff_max=300,
    retry_jitter=True,
    max_retries=MAX_ATTEMPTS - 1,  # the first run plus 2 retries = 3 attempts
)
def send_notification(self, log_id: int) -> None:
    with SessionLocal() as db:
        notifications.deliver(
            db,
            log_id,
            today=riyadh_today(),
            final_attempt=self.request.retries >= self.max_retries,
        )
