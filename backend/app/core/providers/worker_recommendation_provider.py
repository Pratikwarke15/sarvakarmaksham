import math
from typing import Any, Dict, List, Optional
from .routing_provider import OSRMProvider


class WorkerRecommendationEngine:
    """Intelligent Worker Recommendation & Candidate Ranking Engine.
    Combines PostGIS spatial proximity with multi-attribute ranking:
    Skill match, Government/Assessment badges, ratings, reliability, and route corridor heading.
    """

    def __init__(self):
        self.router = OSRMProvider()

    @staticmethod
    def calculate_corridor_bonus(
        worker_lat: float,
        worker_lng: float,
        dest_lat: Optional[float],
        dest_lng: Optional[float],
        job_lat: float,
        job_lng: float,
    ) -> float:
        """Rewards jobs that lie along the worker's current travel corridor.
        e.g., if traveling Mumbai -> Thane, a job in Mulund receives high corridor affinity.
        """
        if dest_lat is None or dest_lng is None:
            return 0.0

        # Vector from worker to destination
        v_dest = (dest_lat - worker_lat, dest_lng - worker_lng)
        # Vector from worker to job
        v_job = (job_lat - worker_lat, job_lng - worker_lng)

        len_dest = math.hypot(v_dest[0], v_dest[1])
        len_job = math.hypot(v_job[0], v_job[1])

        if len_dest < 0.001 or len_job < 0.001:
            return 0.0

        # Cosine angle between route vector and job vector
        cos_sim = (v_dest[0] * v_job[0] + v_dest[1] * v_job[1]) / (len_dest * len_job)
        if cos_sim > 0.7:  # Within ~45 degrees of corridor
            return 15.0  # +15% corridor bonus
        return 0.0

    def rank_candidates(
        self,
        job_lat: float,
        job_lng: float,
        required_skills: List[str],
        candidates: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Ranks worker candidates and assigns a normalized matchScore (0 - 100)."""
        scored_candidates = []
        req_skills_set = {s.lower().replace("-", "").replace(" ", "") for s in required_skills}

        for c in candidates:
            # 1. Skill Match Score (Max 35 pts)
            worker_skills = [
                s.lower().replace("-", "").replace(" ", "") for s in (c.get("skillTags") or [])
            ]
            common_skills = req_skills_set.intersection(worker_skills)
            if not common_skills and req_skills_set:
                skill_score = 0.0  # Zero points for unrelated trade
            else:
                skill_score = 35.0

            # 2. Distance & ETA Score (Max 25 pts)
            c_lat = c.get("latitude") or job_lat
            c_lng = c.get("longitude") or job_lng
            dist_km = self.router._haversine(c_lat, c_lng, job_lat, job_lng) * 1.28
            dist_score = max(0.0, 25.0 - (dist_km * 1.5))

            # 3. Trust & Verification Badge Score (Max 20 pts)
            badge_score = 0.0
            badges = []
            if c.get("aadhaarVerified"):
                badge_score += 8.0
                badges.append("Identity Verified")
            if c.get("kycStatus") == "VERIFIED":
                badge_score += 6.0
                badges.append("KYC Verified")
            if c.get("status") == "VERIFIED":
                badge_score += 6.0
                badges.append("Skill Verified")

            # 4. Rating & Reliability Score (Max 15 pts)
            avg_rating = float(c.get("avgRating") or 4.0)
            rating_score = (avg_rating / 5.0) * 10.0
            completed_jobs = int(c.get("totalJobs") or 0)
            reliability_bonus = min(5.0, completed_jobs * 0.1)

            # 5. Route Corridor Affinity (Max 5 pts)
            corridor_bonus = self.calculate_corridor_bonus(
                c_lat, c_lng,
                c.get("destinationLatitude"), c.get("destinationLongitude"),
                job_lat, job_lng
            )

            total_score = min(
                99.0,
                max(
                    50.0,
                    skill_score + dist_score + badge_score + rating_score + reliability_bonus + corridor_bonus
                )
            )

            duration_min = max(5, int(round((dist_km / 22.0) * 60)))

            scored_candidates.append({
                **c,
                "distanceKm": round(dist_km, 1),
                "etaMinutes": duration_min,
                "matchScore": int(round(total_score)),
                "badges": badges or ["Verified Member"],
            })

        # Sort descending by matchScore
        scored_candidates.sort(key=lambda x: x["matchScore"], reverse=True)
        return scored_candidates
