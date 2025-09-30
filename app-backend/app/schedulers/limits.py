from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from pytz import timezone
from app.core.database import get_db
from app.models.subscription import Subscription
from app.models.usage_stat import UsageStats
from app.models.user import User
from dateutil.relativedelta import relativedelta

tz = timezone("Europe/Warsaw")


# resetujemy tylko dla planow free (reszta planow resetuje sie automatycznie przy oplacie lub skonczeniu platnego planu)
def run_job():
    db = get_db()
    try:
        users = db.query(User).all()
        for u in users:
            subs = db.query(Subscription) \
                .filter(Subscription.user_id == u.id, Subscription.is_active == True) \
                .all()

            if len(subs) > 1:  # w tedy mamy zmiane planu z lepszego na gorszy
                continue

            if subs[0].plan_id != 1:  # w tedy mamy inny plan niz free
                continue

            usage_stat = db.query(UsageStats) \
                .filter(UsageStats.user_id == u.id) \
                .first()

            now = datetime.utcnow()
            if usage_stat.period_end < now:
                usage_stat.period_start = now
                usage_stat.period_end = now + relativedelta(months=1)
                usage_stat.chat_messages = 0
                usage_stat.total_file_mb = 0
                usage_stat.number_of_generated_questions = 0
                usage_stat.generated_study_cards = 0
                usage_stat.study_sessions = 0
                usage_stat.number_of_generating_notes = 0
                usage_stat.number_of_enhance_notes = 0

                db.commit()

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def add_daily_rollover_job(scheduler: AsyncIOScheduler):
    trigger = CronTrigger(hour=0, minute=1, timezone=tz)
    scheduler.add_job(run_job, trigger, id="usage_rollover_daily", replace_existing=True)


def start_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler(timezone=tz)
    add_daily_rollover_job(scheduler)
    scheduler.start()
    return scheduler
