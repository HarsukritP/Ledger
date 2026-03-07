"""Pre-seeded demo data: 8 weeks of transactions, subscription decisions, goal progress, and memory snapshots."""
from datetime import date, timedelta
import random

random.seed(42)


def _date_str(d: date) -> str:
    return d.isoformat()


START = date(2026, 1, 12)
TODAY = date(2026, 3, 7)


def generate_transactions() -> list[dict]:
    txns = []
    d = START
    txn_id = 1

    while d <= TODAY:
        day_of_month = d.day

        if day_of_month == 15 or day_of_month == 30 or (day_of_month == 28 and d.month == 2):
            txns.append({
                "id": f"txn_{txn_id}", "date": _date_str(d), "amount": 1600.00,
                "merchant_name": "Employer Direct Deposit", "category": "Income",
                "type": "income", "is_recurring": True
            })
            txn_id += 1

        if day_of_month == 1:
            txns.append({
                "id": f"txn_{txn_id}", "date": _date_str(d), "amount": -1200.00,
                "merchant_name": "Landlord Payment", "category": "Housing",
                "type": "bill", "is_recurring": True
            })
            txn_id += 1

            txns.append({
                "id": f"txn_{txn_id}", "date": _date_str(d), "amount": -50.00,
                "merchant_name": "FitLife Gym", "category": "Fitness",
                "type": "bill", "is_recurring": True
            })
            txn_id += 1

            txns.append({
                "id": f"txn_{txn_id}", "date": _date_str(d), "amount": -17.99,
                "merchant_name": "Netflix", "category": "Entertainment",
                "type": "bill", "is_recurring": True
            })
            txn_id += 1

        if day_of_month == 3:
            txns.append({
                "id": f"txn_{txn_id}", "date": _date_str(d), "amount": -11.99,
                "merchant_name": "Spotify", "category": "Entertainment",
                "type": "bill", "is_recurring": True
            })
            txn_id += 1

        if day_of_month == 2:
            txns.append({
                "id": f"txn_{txn_id}", "date": _date_str(d), "amount": -12.99,
                "merchant_name": "Apple News+", "category": "News",
                "type": "bill", "is_recurring": True
            })
            txn_id += 1

        if day_of_month == 5:
            txns.append({
                "id": f"txn_{txn_id}", "date": _date_str(d), "amount": -54.99,
                "merchant_name": "Adobe Creative Cloud", "category": "Software",
                "type": "bill", "is_recurring": True
            })
            txn_id += 1

            txns.append({
                "id": f"txn_{txn_id}", "date": _date_str(d), "amount": -13.99,
                "merchant_name": "YouTube Premium", "category": "Entertainment",
                "type": "bill", "is_recurring": True
            })
            txn_id += 1

        if day_of_month == 8:
            txns.append({
                "id": f"txn_{txn_id}", "date": _date_str(d), "amount": -65.00,
                "merchant_name": "T-Mobile", "category": "Bills",
                "type": "bill", "is_recurring": True
            })
            txn_id += 1

        if day_of_month == 15:
            txns.append({
                "id": f"txn_{txn_id}", "date": _date_str(d), "amount": -60.00,
                "merchant_name": "Comcast Internet", "category": "Bills",
                "type": "bill", "is_recurring": True
            })
            txn_id += 1

        if day_of_month == 28:
            txns.append({
                "id": f"txn_{txn_id}", "date": _date_str(d), "amount": -2.99,
                "merchant_name": "Apple iCloud+", "category": "Software",
                "type": "bill", "is_recurring": True
            })
            txn_id += 1

        if d.weekday() < 5:
            if random.random() < 0.3:
                amount = round(random.uniform(8, 22), 2)
                txns.append({
                    "id": f"txn_{txn_id}", "date": _date_str(d), "amount": -amount,
                    "merchant_name": random.choice(["Starbucks", "Chipotle", "Uber Eats", "McDonald's", "Sweetgreen"]),
                    "category": "Dining", "type": "expense", "is_recurring": False
                })
                txn_id += 1

        if d.weekday() in (4, 5, 6) and random.random() < 0.25:
            amount = round(random.uniform(25, 80), 2)
            txns.append({
                "id": f"txn_{txn_id}", "date": _date_str(d), "amount": -amount,
                "merchant_name": random.choice(["The Keg", "Cactus Club", "Earls", "Local Pub", "Wine Bar"]),
                "category": "Dining", "type": "expense", "is_recurring": False
            })
            txn_id += 1

        if d.weekday() == 6 and random.random() < 0.4:
            amount = round(random.uniform(30, 120), 2)
            txns.append({
                "id": f"txn_{txn_id}", "date": _date_str(d), "amount": -amount,
                "merchant_name": random.choice(["Amazon", "Best Buy", "Apple Store", "Walmart", "Costco"]),
                "category": "Shopping", "type": "expense", "is_recurring": False
            })
            txn_id += 1

        if random.random() < 0.15:
            amount = round(random.uniform(8, 25), 2)
            txns.append({
                "id": f"txn_{txn_id}", "date": _date_str(d), "amount": -amount,
                "merchant_name": random.choice(["Uber", "Lyft"]),
                "category": "Transport", "type": "expense", "is_recurring": False
            })
            txn_id += 1

        d += timedelta(days=1)

    return sorted(txns, key=lambda t: t["date"], reverse=True)


DEMO_TRANSACTIONS = generate_transactions()

DEMO_MEMORIES = [
    {"type": "pay_cycle", "content": "Gets paid biweekly on the 15th and 30th via direct deposit. ~$1,600 per paycheck.", "created": "2026-01-27"},
    {"type": "bill_cadence", "content": "Rent $1,200 due on the 1st. Phone bill $65 on the 8th. Internet $60 on the 15th.", "created": "2026-01-27"},
    {"type": "pattern", "content": "Tends to overspend on dining in the first week of the month, especially after payday.", "created": "2026-02-10"},
    {"type": "pattern", "content": "Weekend spending averages $60-120, mostly dining and occasional shopping.", "created": "2026-02-15"},
    {"type": "sub_decision", "content": "Kept gym membership in February despite low usage — said they planned to go more. Revisit in 4 weeks.", "created": "2026-02-05"},
    {"type": "sub_decision", "content": "Cancelled cloud storage service in January — was paying $9.99/mo for only 2GB used.", "created": "2026-01-20"},
    {"type": "seasonal", "content": "January spending was higher than usual due to post-holiday purchases and new year subscriptions.", "created": "2026-02-01"},
    {"type": "preference", "content": "Prefers brief weekly summaries over daily notifications. Likes a balanced tone — not too strict, not too lenient.", "created": "2026-01-15"},
    {"type": "goal_change", "content": "Originally set Japan Trip goal at $3,000 but increased to $5,000 after researching flight costs in February.", "created": "2026-02-18"},
    {"type": "goal_progress", "content": "Emergency fund on track — $1,450 of $2,000 saved. Consistent $183/mo contributions.", "created": "2026-03-01"},
    {"type": "pattern", "content": "Tight weeks are typically the 10th-14th (after rent, before mid-month paycheck).", "created": "2026-02-20"},
]

DEMO_SUBSCRIPTION_DECISIONS = [
    {"subscription": "FitLife Gym", "decision": "keep", "reason": "Planning to go more regularly", "date": "2026-02-05", "revisit": "2026-03-05"},
    {"subscription": "Cloud Storage Pro", "decision": "cancel", "reason": "Only using 2GB of 100GB", "date": "2026-01-20", "savings": 9.99},
    {"subscription": "Apple News+", "decision": "pending", "reason": "Only read 2 articles last month — flagged for review", "date": "2026-03-03"},
]

DEMO_GOAL_SNAPSHOTS = [
    {"goal": "Japan Trip", "snapshots": [
        {"date": "2026-01-15", "amount": 400, "feasibility": "on_track"},
        {"date": "2026-02-01", "amount": 650, "feasibility": "on_track"},
        {"date": "2026-02-15", "amount": 850, "feasibility": "at_risk"},
        {"date": "2026-03-01", "amount": 1200, "feasibility": "at_risk"},
    ]},
    {"goal": "Emergency Fund", "snapshots": [
        {"date": "2026-01-15", "amount": 900, "feasibility": "on_track"},
        {"date": "2026-02-01", "amount": 1083, "feasibility": "on_track"},
        {"date": "2026-02-15", "amount": 1266, "feasibility": "on_track"},
        {"date": "2026-03-01", "amount": 1450, "feasibility": "on_track"},
    ]},
    {"goal": "New Laptop", "snapshots": [
        {"date": "2026-02-01", "amount": 0, "feasibility": "on_track"},
        {"date": "2026-02-15", "amount": 100, "feasibility": "on_track"},
        {"date": "2026-03-01", "amount": 300, "feasibility": "behind"},
    ]},
]


def get_spending_summary() -> dict:
    """Calculate summary stats from demo transactions."""
    income = sum(t["amount"] for t in DEMO_TRANSACTIONS if t["amount"] > 0)
    expenses = sum(t["amount"] for t in DEMO_TRANSACTIONS if t["amount"] < 0)

    march_txns = [t for t in DEMO_TRANSACTIONS if t["date"].startswith("2026-03")]
    march_spent = abs(sum(t["amount"] for t in march_txns if t["amount"] < 0))

    categories: dict[str, float] = {}
    for t in DEMO_TRANSACTIONS:
        if t["amount"] < 0:
            cat = t.get("category", "Other")
            categories[cat] = categories.get(cat, 0) + abs(t["amount"])

    return {
        "total_income": income,
        "total_expenses": abs(expenses),
        "net": income + expenses,
        "march_spent": march_spent,
        "top_categories": sorted(categories.items(), key=lambda x: x[1], reverse=True)[:5],
        "transaction_count": len(DEMO_TRANSACTIONS),
    }
