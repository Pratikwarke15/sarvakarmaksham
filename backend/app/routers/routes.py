from typing import Any, Dict, List, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..core.providers.routing_provider import get_routing_provider
from ..core.providers.optimization_provider import MultiJobRouteOptimizer

router = APIRouter(tags=["routes"])

routing_provider = get_routing_provider()
optimizer = MultiJobRouteOptimizer()


class NavigateRequest(BaseModel):
    originLat: Optional[float] = None
    originLng: Optional[float] = None
    destLat: Optional[float] = None
    destLng: Optional[float] = None
    workerLat: Optional[float] = None
    workerLng: Optional[float] = None
    consumerLat: Optional[float] = None
    consumerLng: Optional[float] = None


class OptimizeScheduleRequest(BaseModel):
    workerLat: Optional[float] = None
    workerLng: Optional[float] = None
    workerOrigin: Optional[Dict[str, float]] = None
    jobs: List[Dict[str, Any]] = Field(description="List of daily jobs to optimize")


@router.post("/navigate")
async def get_navigation_route(request: NavigateRequest):
    """Returns driving route, polyline coordinates, road distance, and real-time ETA."""
    orig_lat = request.originLat if request.originLat is not None else (request.workerLat or 28.6189)
    orig_lng = request.originLng if request.originLng is not None else (request.workerLng or 77.2120)
    dst_lat = request.destLat if request.destLat is not None else (request.consumerLat or 28.6139)
    dst_lng = request.destLng if request.destLng is not None else (request.consumerLng or 77.2090)

    route = await routing_provider.get_route(
        origin_lat=orig_lat,
        origin_lng=orig_lng,
        dest_lat=dst_lat,
        dest_lng=dst_lng,
    )
    return {"success": True, "data": route}


@router.post("/optimize")
async def optimize_worker_routes(request: OptimizeScheduleRequest):
    """Optimizes multi-job sequence for a worker's daily appointments (VRP/TSP)."""
    w_lat = request.workerLat if request.workerLat is not None else (request.workerOrigin.get("lat") if request.workerOrigin else 28.6139)
    w_lng = request.workerLng if request.workerLng is not None else (request.workerOrigin.get("lng") if request.workerOrigin else 77.2090)

    schedule = await optimizer.optimize_schedule(
        worker_lat=w_lat,
        worker_lng=w_lng,
        jobs=request.jobs,
    )
    return {"success": True, "data": schedule}
