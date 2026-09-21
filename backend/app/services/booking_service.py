import random
import string
import uuid
from datetime import datetime, timezone

from ..db import db, row_to_dict, rows_to_dicts
from ..errors import AppError
from ..utils import haversine_km, matches_skills, worker_match_score, num, deep_serialize, now_utc

VALID_TRANSITIONS = {
    "PENDING": ["ACCEPTED", "CANCELLED"],
    "ACCEPTED": ["EN_ROUTE", "CANCELLED"],
    "EN_ROUTE": ["IN_PROGRESS", "CANCELLED"],
    "IN_PROGRESS": ["COMPLETED", "DISPUTED"],
    "COMPLETED": [],
    "CANCELLED": [],
    "DISPUTED": ["RESOLVED"],
}


_SVC_SELECT = (
    's.id AS svc_id, s.name AS svc_name, s.description AS svc_description, '
    's."categoryName" AS svc_category_name, s."categorySlug" AS svc_category_slug, '
    's."coopId" AS svc_coop_id, s."basePrice" AS svc_base_price, s.unit AS svc_unit, '
    's."pricePerUnit" AS svc_price_per_unit, s."minPrice" AS svc_min_price, '
    's."maxPrice" AS svc_max_price, s."estimatedDuration" AS svc_estimated_duration, '
    's."isActive" AS svc_is_active, s."createdAt" AS svc_created_at, s."updatedAt" AS svc_updated_at'
)


def _format_booking(b: dict) -> dict:
    out = dict(b)
    service = {
        "id": b.get("svc_id"), "name": b.get("svc_name"), "unit": b.get("svc_unit"),
        "description": b.get("svc_description"), "categoryName": b.get("svc_category_name"),
        "categorySlug": b.get("svc_category_slug"), "coopId": b.get("svc_coop_id"),
        "basePrice": num(b.get("svc_base_price")),
        "pricePerUnit": num(b.get("svc_price_per_unit")),
        "minPrice": num(b.get("svc_min_price")),
        "maxPrice": num(b.get("svc_max_price")),
        "estimatedDuration": b.get("svc_estimated_duration"),
        "isActive": b.get("svc_is_active"),
    }
    consumer = {
        "id": b.get("consumer_id"), "name": b.get("consumer_name"), "phone": b.get("consumer_phone"),
    }
    worker = None
    if b.get("worker_wp_id"):
        worker = {
            "id": b.get("worker_wp_id"), "coopId": b.get("worker_coop_id"),
            "user": {"id": b.get("worker_user_id"), "name": b.get("worker_name"), "phone": b.get("worker_phone")},
        }
    for key in (
        "svc_id", "svc_name", "svc_description", "svc_category_name", "svc_category_slug",
        "svc_coop_id", "svc_base_price", "svc_unit", "svc_price_per_unit", "svc_min_price",
        "svc_max_price", "svc_estimated_duration", "svc_is_active", "svc_created_at",
        "svc_updated_at", "consumer_id", "consumer_name", "consumer_phone",
        "worker_wp_id", "worker_user_id", "worker_name", "worker_phone", "worker_coop_id",
    ):
        out.pop(key, None)
    for key in ("quotedPrice", "finalPrice", "commissionRate", "commissionAmount", "workerPayout"):
        v = b.get(key)
        out[key] = num(v) if v is not None else None
    out["service"] = service
    out["consumer"] = consumer
    out["worker"] = worker
    return deep_serialize(out)


def generate_booking_ref() -> str:
    now = datetime.now()
    date_str = f"{now.year}{now.month:02d}{now.day:02d}"
    code = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"BG-{date_str}-{code}"


async def create_booking(consumer_id: str, data: dict) -> dict:
    service = await db.fetchrow('SELECT * FROM "Service" WHERE id=$1', data["serviceId"])
    if service is None or not service["isActive"]:
        raise AppError("Service not found or inactive", 404)
    coop = await db.fetchrow('SELECT * FROM "CoOp" WHERE id=$1', service["coopId"])
    quoted_price = num(service["basePrice"])
    commission_rate = min(num(coop["commissionRate"]), 5.0)
    service_skills = [service["categorySlug"], service["categoryName"]]
    radius_km = num(coop["radiusKm"]) or 10

    candidates = await db.fetch(
        """
        SELECT wp.*, u.name AS "user_name", u.phone AS "user_phone"
        FROM "WorkerProfile" wp
        JOIN "User" u ON u.id=wp."userId"
        WHERE wp."coopId"=$1 AND wp.status='VERIFIED' AND wp."isAvailable"=true
          AND wp."isOnDuty"=true AND wp.latitude IS NOT NULL AND wp.longitude IS NOT NULL
          AND u."isActive"=true
        """,
        service["coopId"],
    )

    matched = []
    for c in candidates:
        d = haversine_km(data["latitude"], data["longitude"], num(c["latitude"]), num(c["longitude"]))
        distance_km = round(d * 100) / 100
        entry = {
            "worker": c, "distanceKm": distance_km,
            "matchScore": worker_match_score(num(c["avgRating"]), c["totalJobs"], distance_km, radius_km),
        }
        if distance_km <= radius_km and matches_skills(c["skillTags"], service_skills):
            matched.append(entry)

    if data.get("workerId"):
        selected = next((e for e in matched if e["worker"]["id"] == data["workerId"]), None)
        if selected is None:
            raise AppError("Selected worker is unavailable, out of range, or not skilled for this service", 400)
        matched = [selected]

    matched.sort(key=lambda e: (-e["matchScore"], e["distanceKm"]))
    nearest = matched[0]["worker"] if matched else None

    booking_ref = generate_booking_ref()
    booking_id = str(uuid.uuid4())
    now = now_utc()
    worker_id = nearest["id"] if nearest else None
    scheduled = data.get("scheduledAt")
    if scheduled:
        try:
            scheduled_dt = datetime.fromisoformat(scheduled.replace("Z", "+00:00"))
            if scheduled_dt.tzinfo is not None:
                scheduled_dt = scheduled_dt.astimezone(timezone.utc).replace(tzinfo=None)
        except ValueError:
            raise AppError("Invalid datetime format", 400)
    else:
        scheduled_dt = None

    await db.execute(
        """
        INSERT INTO "Booking" (id, "bookingRef", "consumerId", "workerId", "serviceId", status,
            "scheduledAt", "consumerLatitude", "consumerLongitude", address, description,
            "quotedPrice", "commissionRate", "paymentStatus", "createdAt", "updatedAt")
        VALUES ($1,$2,$3,$4,$5,'PENDING',$6,$7,$8,$9,$10,$11,$12,'PENDING',$13,$13)
        """,
        booking_id, booking_ref, consumer_id, worker_id, data["serviceId"], scheduled_dt,
        data["latitude"], data["longitude"], data["address"], data.get("description"),
        quoted_price, commission_rate, now,
    )

    booking = await db.fetchrow(
        f"""
        SELECT {_SVC_SELECT},
               c.id AS "consumer_id", c.name AS "consumer_name", c.phone AS "consumer_phone",
               b."workerId" AS "worker_wp_id", w.id AS "worker_user_id",
               w.name AS "worker_name", w.phone AS "worker_phone",
               b.*
        FROM "Booking" b
        JOIN "Service" s ON s.id=b."serviceId"
        JOIN "User" c ON c.id=b."consumerId"
        LEFT JOIN "WorkerProfile" wp ON wp.id=b."workerId"
        LEFT JOIN "User" w ON w.id=wp."userId"
        WHERE b.id=$1
        """,
        booking_id,
    )
    return _format_booking(booking)


async def get_booking(booking_id: str) -> dict:
    booking = await db.fetchrow(
        f"""
        SELECT {_SVC_SELECT},
               c.id AS "consumer_id", c.name AS "consumer_name", c.phone AS "consumer_phone",
               wp.id AS "worker_wp_id", w.id AS "worker_user_id",
               w.name AS "worker_name", w.phone AS "worker_phone",
               b.*
        FROM "Booking" b
        JOIN "Service" s ON s.id=b."serviceId"
        JOIN "User" c ON c.id=b."consumerId"
        LEFT JOIN "WorkerProfile" wp ON wp.id=b."workerId"
        LEFT JOIN "User" w ON w.id=wp."userId"
        WHERE b.id=$1
        """,
        booking_id,
    )
    if booking is None:
        raise AppError("Booking not found", 404)
    return _format_booking(booking)


async def get_user_bookings(user_id: str, role: str) -> list[dict]:
    if role == "WORKER":
        rows = await db.fetch(
            f"""
            SELECT {_SVC_SELECT},
                   c.id AS "consumer_id", c.name AS "consumer_name",
                   wp.id AS "worker_wp_id", w.id AS "worker_user_id",
                   w.name AS "worker_name",
                   b.*
            FROM "Booking" b
            JOIN "Service" s ON s.id=b."serviceId"
            JOIN "User" c ON c.id=b."consumerId"
            LEFT JOIN "WorkerProfile" wp ON wp.id=b."workerId"
            LEFT JOIN "User" w ON w.id=wp."userId"
            WHERE wp."userId"=$1
            ORDER BY b."createdAt" DESC
            """,
            user_id,
        )
    else:
        rows = await db.fetch(
            f"""
            SELECT {_SVC_SELECT},
                   c.id AS "consumer_id", c.name AS "consumer_name",
                   wp.id AS "worker_wp_id", w.id AS "worker_user_id",
                   w.name AS "worker_name",
                   b.*
            FROM "Booking" b
            JOIN "Service" s ON s.id=b."serviceId"
            JOIN "User" c ON c.id=b."consumerId"
            LEFT JOIN "WorkerProfile" wp ON wp.id=b."workerId"
            LEFT JOIN "User" w ON w.id=wp."userId"
            WHERE b."consumerId"=$1
            ORDER BY b."createdAt" DESC
            """,
            user_id,
        )
    return [_format_booking(dict(r)) for r in rows]


async def update_booking_status(booking_id: str, worker_wp_id: str, status: str) -> dict:
    booking = await db.fetchrow('SELECT * FROM "Booking" WHERE id=$1', booking_id)
    if booking is None:
        raise AppError("Booking not found", 404)
    if booking["workerId"] != worker_wp_id:
        raise AppError("You are not assigned to this booking", 403)
    allowed = VALID_TRANSITIONS.get(booking["status"], [])
    if status not in allowed:
        raise AppError(f"Cannot transition from {booking['status']} to {status}", 400)

    update_sets = ['status=$1', '"updatedAt"=$2']
    params = [status, now_utc()]
    if status == "IN_PROGRESS":
        update_sets.append('"startedAt"=$%d' % (len(params) + 1))
        params.append(now_utc())
    elif status == "COMPLETED":
        commission_rate = min(num(booking["commissionRate"]), 5.0)
        commission_amount = num(booking["quotedPrice"]) * (commission_rate / 100)
        worker_payout = num(booking["quotedPrice"]) - commission_amount
        update_sets.append('"completedAt"=$%d' % (len(params) + 1))
        params.append(now_utc())
        update_sets.append('"finalPrice"=$%d' % (len(params) + 1))
        params.append(num(booking["quotedPrice"]))
        update_sets.append('"commissionAmount"=$%d' % (len(params) + 1))
        params.append(commission_amount)
        update_sets.append('"workerPayout"=$%d' % (len(params) + 1))
        params.append(worker_payout)
        update_sets.append('"paymentStatus"=$%d' % (len(params) + 1))
        params.append("HELD_IN_ESCROW")
    params.append(booking_id)
    await db.execute(
        f'UPDATE "Booking" SET {", ".join(update_sets)} WHERE id=${len(params)}',
        *params,
    )
    updated = await db.fetchrow(
        f"""
        SELECT {_SVC_SELECT},
               c.id AS "consumer_id", c.name AS "consumer_name", c.phone AS "consumer_phone",
               wp.id AS "worker_wp_id", w.id AS "worker_user_id",
               w.name AS "worker_name", w.phone AS "worker_phone",
               b.*
        FROM "Booking" b
        JOIN "Service" s ON s.id=b."serviceId"
        JOIN "User" c ON c.id=b."consumerId"
        LEFT JOIN "WorkerProfile" wp ON wp.id=b."workerId"
        LEFT JOIN "User" w ON w.id=wp."userId"
        WHERE b.id=$1
        """,
        booking_id,
    )
    return _format_booking(updated)


async def rate_booking(booking_id: str, user_id: str, rating: int, comment: str | None = None) -> dict:
    booking = await db.fetchrow('SELECT * FROM "Booking" WHERE id=$1', booking_id)
    if booking is None:
        raise AppError("Booking not found", 404)
    if booking["status"] != "COMPLETED":
        raise AppError("Can only rate completed bookings", 400)
    worker_user = await db.fetchrow('SELECT "userId" FROM "WorkerProfile" WHERE id=$1', booking["workerId"])
    is_consumer = booking["consumerId"] == user_id
    is_worker = worker_user and worker_user["userId"] == user_id
    if not (is_consumer or is_worker):
        raise AppError("Only the consumer or assigned technician can rate this booking", 403)
    if not booking["workerId"]:
        raise AppError("Cannot rate a booking without an assigned worker", 400)
    existing = await db.fetchrow(
        'SELECT * FROM "Review" WHERE "bookingId"=$1 AND "authorId"=$2', booking_id, user_id,
    )
    if existing is not None:
        raise AppError("You have already rated this booking", 409)

    review_id = str(uuid.uuid4())
    now = now_utc()
    await db.execute(
        """
        INSERT INTO "Review" (id, "bookingId", "authorId", "workerId", rating, comment, "isPublic", "createdAt")
        VALUES ($1,$2,$3,$4,$5,$6,true,$7)
        """,
        review_id, booking_id, user_id, booking["workerId"], rating, comment, now,
    )
    if is_consumer:
        reviews = await db.fetch('SELECT rating FROM "Review" WHERE "workerId"=$1 AND "authorId"=$2', booking["workerId"], booking["consumerId"])
        if reviews:
            avg = sum(num(r["rating"]) for r in reviews) / len(reviews)
            await db.execute(
                'UPDATE "WorkerProfile" SET "avgRating"=$1, "updatedAt"=$2 WHERE id=$3',
                round(avg * 10) / 10, now_utc(), booking["workerId"],
            )
    review = await db.fetchrow('SELECT * FROM "Review" WHERE id=$1', review_id)
    return deep_serialize(dict(review))


async def get_nearby_workers(lat: float, lng: float, radius_km: float,
                             skill_tags=None, coop_id: str | None = None) -> list[dict]:
    rows = await db.fetch(
        """
        SELECT wp.*, u.name AS "user_name"
        FROM "WorkerProfile" wp JOIN "User" u ON u.id=wp."userId"
        WHERE wp.status='VERIFIED' AND wp."isAvailable"=true AND wp."isOnDuty"=true
          AND wp.latitude IS NOT NULL AND wp.longitude IS NOT NULL AND u."isActive"=true
          AND ($1::text IS NULL OR wp."coopId"=$1)
        LIMIT 100
        """,
        coop_id,
    )
    result = []
    for w in rows:
        d = haversine_km(lat, lng, num(w["latitude"]), num(w["longitude"]))
        item = {
            "workerId": w["id"], "workerName": w["user_name"], "skillTags": w["skillTags"],
            "avgRating": num(w["avgRating"]), "totalJobs": w["totalJobs"], "bio": w["bio"],
            "experienceYears": w["experienceYears"], "distanceKm": round(d * 100) / 100,
            "coopId": w["coopId"],
        }
        if not matches_skills(w["skillTags"], skill_tags):
            continue
        if item["distanceKm"] > radius_km:
            continue
        item["etaMinutes"] = max(10, round(item["distanceKm"] * 5))
        item["matchScore"] = worker_match_score(item["avgRating"], item["totalJobs"], item["distanceKm"], radius_km)
        result.append(item)
    result.sort(key=lambda x: (-x["matchScore"], x["distanceKm"]))
    return deep_serialize(result[:50])


async def cancel_booking(booking_id: str, user_id: str, reason: str) -> dict:
    booking = await db.fetchrow('SELECT * FROM "Booking" WHERE id=$1', booking_id)
    if booking is None:
        raise AppError("Booking not found", 404)
    if booking["consumerId"] != user_id:
        raise AppError("Only the consumer can cancel a booking", 403)
    non_cancellable = ["COMPLETED", "CANCELLED", "DISPUTED"]
    if booking["status"] in non_cancellable:
        raise AppError(f"Cannot cancel a booking with status {booking['status']}", 400)
    if booking["status"] != "PENDING":
        now = now_utc()
        delta_min = (now - booking["createdAt"]).total_seconds() / 60
        if delta_min > 15:
            raise AppError("Cannot cancel after 15 minutes of booking acceptance", 400)

    await db.execute(
        'UPDATE "Booking" SET status=$1, "cancelReason"=$2, "updatedAt"=$3 WHERE id=$4',
        "CANCELLED", reason, now_utc(), booking_id,
    )
    updated = await db.fetchrow(
        f"""
        SELECT {_SVC_SELECT},
               c.id AS "consumer_id", c.name AS "consumer_name",
               wp.id AS "worker_wp_id", w.id AS "worker_user_id",
               w.name AS "worker_name",
               b.*
        FROM "Booking" b
        JOIN "Service" s ON s.id=b."serviceId"
        JOIN "User" c ON c.id=b."consumerId"
        LEFT JOIN "WorkerProfile" wp ON wp.id=b."workerId"
        LEFT JOIN "User" w ON w.id=wp."userId"
        WHERE b.id=$1
        """,
        booking_id,
    )
    return _format_booking(updated)
