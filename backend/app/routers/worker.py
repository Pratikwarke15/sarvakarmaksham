from fastapi import APIRouter, Depends, Query

from ..deps import get_current_user, require_roles
from ..schemas import (
    RegisterWorkerRequest,
    UpdateWorkerLocationRequest,
    UpdateAvailabilityRequest,
)
from ..services import worker_service

router = APIRouter(tags=["workers"])


@router.post("/register")
async def register(
    body: RegisterWorkerRequest,
    user: dict = Depends(require_roles("WORKER")),
):
    profile = await worker_service.register_worker(user["id"], body.model_dump())
    return {"success": True, "message": "Worker registered", "data": profile}


@router.patch("/location")
async def update_location(
    body: UpdateWorkerLocationRequest,
    user: dict = Depends(require_roles("WORKER")),
):
    wp = await worker_service.get_worker_profile_by_user(user["id"])
    profile = await worker_service.update_location(wp["id"], body.latitude, body.longitude)
    return {"success": True, "message": "Location updated", "data": profile}


@router.patch("/availability")
async def update_availability(
    body: UpdateAvailabilityRequest,
    user: dict = Depends(require_roles("WORKER")),
):
    wp = await worker_service.get_worker_profile_by_user(user["id"])
    profile = await worker_service.set_availability(wp["id"], body.isAvailable, body.isOnDuty)
    return {"success": True, "message": "Availability updated", "data": profile}


@router.get("/profile")
async def profile(user: dict = Depends(require_roles("WORKER"))):
    wp = await worker_service.get_worker_profile_by_user(user["id"])
    profile = await worker_service.get_worker_profile(wp["id"])
    return {"success": True, "data": profile}


@router.get("/earnings")
async def earnings(user: dict = Depends(require_roles("WORKER"))):
    wp = await worker_service.get_worker_profile_by_user(user["id"])
    data = await worker_service.get_worker_earnings(wp["id"])
    return {"success": True, "data": data}


@router.get("/recommended-jobs")
async def get_recommended_jobs(
    user: dict = Depends(require_roles("WORKER")),
    destLat: float | None = Query(None),
    destLng: float | None = Query(None),
):
    """Route-aware job recommendations for workers.
    Prioritizes jobs along worker travel corridor, matching skills, and nearby next stops.
    """
    from ..db import db
    from ..utils import matches_skills, haversine_km, deep_serialize
    from ..core.providers.worker_recommendation_provider import WorkerRecommendationEngine

    wp = await worker_service.get_worker_profile_by_user(user["id"])
    worker_skills = wp.get("skillTags") or []
    worker_lat = float(wp.get("latitude") or 28.6145)
    worker_lng = float(wp.get("longitude") or 77.2095)

    jobs_raw = await db.fetch(
        """
        SELECT b.id, b."bookingRef", b.status, b.address, b."consumerLatitude", b."consumerLongitude",
               b."quotedPrice", b."createdAt", b.description,
               s.name as "serviceName", s."categorySlug", s."basePrice",
               u.name as "consumerName"
        FROM "Booking" b
        JOIN "Service" s ON s.id = b."serviceId"
        JOIN "User" u ON u.id = b."consumerId"
        WHERE b.status = 'PENDING'
        ORDER BY b."createdAt" DESC
        LIMIT 20
        """
    )

    recommended = []
    engine = WorkerRecommendationEngine()

    for j in jobs_raw:
        job = dict(j)
        cat = job.get("categorySlug", "")
        # Skill match
        has_skill = matches_skills(worker_skills, [cat])
        j_lat = float(job.get("consumerLatitude") or worker_lat)
        j_lng = float(job.get("consumerLongitude") or worker_lng)

        dist_km = round(haversine_km(worker_lat, worker_lng, j_lat, j_lng), 1)

        corridor_bonus = 0.0
        if destLat is not None and destLng is not None:
            corridor_bonus = engine.calculate_corridor_bonus(
                worker_lat, worker_lng, destLat, destLng, j_lat, j_lng
            )

        affinity_score = 50.0
        reasons = []

        if has_skill:
            affinity_score += 35.0
            reasons.append(f"Exact trade skill fit ({cat.title()})")
        else:
            affinity_score -= 20.0

        if corridor_bonus > 0:
            affinity_score += corridor_bonus
            reasons.append("Along current travel corridor (minimal detour)")

        if dist_km <= 5.0:
            affinity_score += 15.0
            reasons.append(f"Nearby ({dist_km} km)")
        elif dist_km <= 15.0:
            affinity_score += 5.0

        job["distanceKm"] = dist_km
        job["corridorBonus"] = corridor_bonus
        job["affinityScore"] = round(min(100.0, max(0.0, affinity_score)), 1)
        job["recommendationReasons"] = reasons
        job["etaMinutes"] = max(10, round(dist_km * 5))
        recommended.append(job)

    recommended.sort(key=lambda x: -x["affinityScore"])
    return {"success": True, "data": deep_serialize(recommended[:8])}


@router.get("/search")
async def search(
    lat: float = Query(..., description="latitude"),
    lng: float = Query(..., description="longitude"),
    radius: float = Query(10.0),
    skills: str | None = None,
    coopId: str | None = None,
):
    skill_list = None
    if skills:
        skill_list = [s.strip() for s in skills.split(",")]
    workers = await worker_service.search_workers(lat, lng, radius, skill_list, coopId)
    return {"success": True, "data": workers}


@router.get("/{worker_id}")
async def get_worker(worker_id: str):
    profile = await worker_service.get_worker_profile(worker_id)
    return {"success": True, "data": profile}
