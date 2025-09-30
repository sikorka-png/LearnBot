from app.core.database import SessionLocal

from app.models.subscription_plan import SubscriptionPlan


def initialize_plans():
    db = SessionLocal()

    default_plans = [
        {
            "id": 1,
            "name": "free",
            "max_chat_messages": 1,
            "max_chat_groups": 1,
            "max_number_of_files": 1,
            "max_total_file_mb": 100,
            "max_number_of_exams": 1,
            "max_number_of_generated_questions": 10,
            "max_generated_study_cards": 1,
            "max_study_sessions": 1,
            "max_number_of_notes": 1,
            "max_number_of_generating_notes": 1,
            "max_number_of_enhance_notes": 1,
        },
        {
            "id": 2,
            "name": "basic",
            "max_chat_messages": 2,
            "max_chat_groups": 2,
            "max_number_of_files": 2,
            "max_total_file_mb": 200,
            "max_number_of_exams": 2,
            "max_number_of_generated_questions": 20,
            "max_generated_study_cards": 2,
            "max_study_sessions": 2,
            "max_number_of_notes": 2,
            "max_number_of_generating_notes": 2,
            "max_number_of_enhance_notes": 2,
        },
        {
            "id": 3,
            "name": "pro",
            "max_chat_messages": 3,
            "max_chat_groups": 3,
            "max_number_of_files": 3,
            "max_total_file_mb": 300,
            "max_number_of_exams": 3,
            "max_number_of_generated_questions": 30,
            "max_generated_study_cards": 3,
            "max_study_sessions": 3,
            "max_number_of_notes": 3,
            "max_number_of_generating_notes": 3,
            "max_number_of_enhance_notes": 3,
        },
        {
            "id": 4,
            "name": "premium",
            "max_chat_messages": 4,
            "max_chat_groups": 4,
            "max_number_of_files": 4,
            "max_total_file_mb": 400,
            "max_number_of_exams": 4,
            "max_number_of_generated_questions": 40,
            "max_generated_study_cards": 4,
            "max_study_sessions": 4,
            "max_number_of_notes": 4,
            "max_number_of_generating_notes": 4,
            "max_number_of_enhance_notes": 4,
        }
    ]

    for plan_data in default_plans:
        existing = db.query(SubscriptionPlan)\
            .filter_by(name=plan_data["name"])\
            .first()

        if not existing:
            db.add(SubscriptionPlan(**plan_data))

    db.commit()
    db.close()
