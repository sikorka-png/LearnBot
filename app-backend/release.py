import stripe

STRIPE_KEY = "sk_test_51RksBt2fKuvpViwjPGZhsACCDhRi7umgdwR3Fy8sdCuz6hxjVxBJ1rgP5khiB49t2fiEPeaBYy0RZnXGsfL0UJMM00oLahFCrI"
stripe.api_key = STRIPE_KEY


schedules = stripe.SubscriptionSchedule.list(customer="cus_SioAhAOPRUWgGg")
for schedule in schedules.auto_paging_iter():
    if (
            schedule.get("subscription") == "sub_1RnMZU2fKuvpViwjvdyEaEEm"
            and schedule["status"] == "active"
            and schedule["current_phase"]
    ):
        stripe.SubscriptionSchedule.release(schedule["id"])
