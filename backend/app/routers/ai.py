from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from ..db import db
from ..deps import get_current_user
from ..core.providers.ai_provider import AIJobUnderstandingProvider
from ..core.providers.price_estimation_provider import PriceEstimationService
from ..core.providers.worker_recommendation_provider import WorkerRecommendationEngine

router = APIRouter(tags=["ai"])

ai_engine = AIJobUnderstandingProvider()
price_engine = PriceEstimationService()
recommendation_engine = WorkerRecommendationEngine()


class VoiceJobRequest(BaseModel):
    speechTranscript: Optional[str] = Field(default=None, description="Raw transcribed spoken audio or entered problem text")
    transcript: Optional[str] = Field(default=None, description="Alternative field for speech transcript")
    prompt: Optional[str] = Field(default=None, description="Prompt text")
    text: Optional[str] = Field(default=None, description="Raw issue text")
    language: Optional[str] = Field(default=None, description="User selected language code")
    latitude: Optional[float] = Field(default=28.6139, description="Consumer latitude")
    longitude: Optional[float] = Field(default=77.2090, description="Consumer longitude")
    distanceKm: Optional[float] = Field(default=5.0, description="Estimated distance in km")
    audioDurationSeconds: Optional[float] = Field(default=None)


@router.post("/voice-job")
async def process_voice_job(request: VoiceJobRequest):
    """Processes spoken or typed natural language problem in English, Hindi, or Marathi.
    Produces structured JobToken, low-cost baseline price range (starting at ₹50),
    transparent travel calculation (₹15 for 5km + ₹3.25/km), and recommended nearby workers.
    """
    raw_text = (
        request.speechTranscript
        or request.transcript
        or request.prompt
        or request.text
        or ""
    )

    # 1. NLU Intent & Skill Extraction
    intent = ai_engine.analyze(raw_text)
    user_lang = request.language or intent.detectedLanguage

    # 2. Transparent Price Range Estimation starting at ₹50 with exact distance formula
    dist = request.distanceKm if request.distanceKm is not None else 5.0
    price_info = price_engine.estimate_price(
        category_slug=intent.categorySlug,
        problem_text=raw_text,
        duration_minutes=45,
        distance_km=dist,
        urgency=intent.urgency,
        language=user_lang,
    )

    # 3. Fetch nearby available workers from DB
    candidates_raw = await db.fetch(
        """
        SELECT 
            wp.id, wp."userId", wp."coopId", wp.status, wp."skillTags", wp.bio,
            wp."experienceYears", wp.latitude, wp.longitude, wp."isAvailable", wp."isOnDuty",
            wp."avgRating", wp."totalJobs", wp."aadhaarVerified", wp."kycStatus",
            u.name, u.phone
        FROM "WorkerProfile" wp
        JOIN "User" u ON u.id = wp."userId"
        WHERE wp."isAvailable" = true
        LIMIT 100
        """
    )

    candidate_dicts = [dict(c) for c in candidates_raw]

    # Prioritize candidates who strictly match the required trade skills
    from ..utils import matches_skills
    trade_skills = intent.requiredSkills + [intent.categorySlug]
    skill_matched = [c for c in candidate_dicts if matches_skills(c.get("skillTags"), trade_skills)]
    candidates_to_rank = skill_matched if skill_matched else candidate_dicts

    # 4. Rank Candidates via Multi-Attribute ML Engine
    ranked_workers = recommendation_engine.rank_candidates(
        job_lat=request.latitude or 28.6139,
        job_lng=request.longitude or 77.2090,
        required_skills=intent.requiredSkills,
        candidates=candidates_to_rank,
    )

    return {
        "success": True,
        "data": {
            "category": intent.categorySlug,
            "categoryName": intent.categoryName,
            "skills": intent.requiredSkills,
            "problem": intent.problemSummary,
            "urgency": intent.urgency,
            "detectedLanguage": intent.detectedLanguage,
            "priceEstimate": price_info,
            "recommendedWorkers": ranked_workers[:4],
        },
        "jobIntent": intent.model_dump(),
        "priceEstimation": price_info,
        "recommendedWorkers": ranked_workers[:4],
        "meta": {
            "speechProcessed": True,
            "detectedLanguage": intent.detectedLanguage,
        },
    }


@router.post("/analyze-job")
async def analyze_job(body: Dict[str, str]):
    """Analyzes text problem description and classifies category, skills, and urgency."""
    text = body.get("description", "")
    intent = ai_engine.analyze(text)
    return {"success": True, "data": intent.model_dump()}
