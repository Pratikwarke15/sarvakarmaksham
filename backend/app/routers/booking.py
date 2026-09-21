from fastapi import APIRouter, Depends, Query

from ..deps import get_current_user, require_roles
from ..schemas import (
    CreateBookingRequest,
    UpdateBookingStatusRequest,
    RateBookingRequest,
    CancelBookingRequest,
)
from ..services import booking_service, coop_service, worker_service

router = APIRouter(tags=["bookings"])


@router.post("", status_code=201)
@router.post("/", status_code=201)
async def create(
    body: CreateBookingRequest,
    user: dict = Depends(require_roles("CONSUMER")),
):
    booking = await booking_service.create_booking(user["id"], body.model_dump())
    return {"success": True, "message": "Booking created", "data": booking}


@router.get("")
async def list_bookings(user: dict = Depends(get_current_user)):
    bookings = await booking_service.get_user_bookings(user["id"], user["role"])
    return {"success": True, "data": bookings}


@router.get("/nearby-workers")
async def nearby_workers(
    lat: float = Query(...),
    lng: float = Query(...),
    radius: float = Query(10.0),
    skills: str | None = None,
    coopId: str | None = None,
):
    skill_list = None
    if skills:
        skill_list = [s.strip() for s in skills.split(",")]
    workers = await booking_service.get_nearby_workers(lat, lng, radius, skill_list, coopId)
    return {"success": True, "data": workers}


@router.get("/{booking_id}")
async def get(booking_id: str, user: dict = Depends(get_current_user)):
    booking = await booking_service.get_booking(booking_id)
    if user["role"] == "CONSUMER" and booking.get("consumer_id") != user["id"]:
        return {"success": False, "error": "You can only view your own bookings"}
    if user["role"] == "WORKER" and booking.get("worker_name") is not None:
        wp = await worker_service.get_worker_profile_by_user(user["id"])
        if booking.get("worker_wp_id") != wp["id"]:
            return {"success": False, "error": "You can only view assigned bookings"}
    if user["role"] == "COOP_ADMIN":
        await coop_service.assert_coop_access(user["id"], user["role"], booking.get("coopId"))
    return {"success": True, "data": booking}


@router.patch("/{booking_id}/status")
async def update_status(
    booking_id: str,
    body: UpdateBookingStatusRequest,
    user: dict = Depends(require_roles("WORKER")),
):
    wp = await worker_service.get_worker_profile_by_user(user["id"])
    booking = await booking_service.update_booking_status(booking_id, wp["id"], body.status)
    return {"success": True, "message": "Status updated", "data": booking}


@router.post("/{booking_id}/rate", status_code=201)
async def rate(
    booking_id: str,
    body: RateBookingRequest,
    user: dict = Depends(require_roles("CONSUMER", "WORKER")),
):
    review = await booking_service.rate_booking(booking_id, user["id"], body.rating, body.comment)
    return {"success": True, "message": "Review submitted successfully", "data": review}


@router.post("/{booking_id}/cancel")
async def cancel(
    booking_id: str,
    body: CancelBookingRequest,
    user: dict = Depends(require_roles("CONSUMER")),
):
    booking = await booking_service.cancel_booking(booking_id, user["id"], body.reason)
    return {"success": True, "message": "Booking cancelled", "data": booking}
