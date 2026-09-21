from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..db import db
from ..deps import get_current_user

router = APIRouter(tags=["skills"])

# Comprehensive question bank for skilled trades (MCQs and practical scenarios)
QUESTION_BANK = {
    "electrical": [
        {
            "id": "e1",
            "question": "What is the standard color code for a Phase/Live wire in modern Indian single-phase wiring (IS 732)?",
            "options": ["Red or Brown", "Black", "Green or Yellow-Green", "Blue"],
            "correct": 0,
            "explanation": "Under Indian Standard IS 732, Phase wire is Red (or Brown in harmonized cables), Neutral is Black/Blue, and Earth is Green/Yellow-Green."
        },
        {
            "id": "e2",
            "question": "An MCB continuously trips immediately when a 1.5-ton AC is turned on. What is the most likely cause?",
            "options": ["High room temperature", "Short circuit or undersized MCB rating", "Loose remote battery", "Low refrigerant"],
            "correct": 1,
            "explanation": "Immediate tripping on load indicates an overcurrent draw, short circuit in compressor wiring, or an improperly rated breaker (e.g. 6A instead of 16A/20A)."
        },
        {
            "id": "e3",
            "question": "Which safety device protects human life from electrical shock by detecting small leakage currents (<=30mA)?",
            "options": ["RCCB / ELCB", "Standard Fuse", "Miniature Circuit Breaker (MCB)", "Step-up Transformer"],
            "correct": 0,
            "explanation": "A Residual Current Circuit Breaker (RCCB/ELCB) trips on 30mA residual current to ground, preventing fatal electric shocks."
        },
        {
            "id": "e4",
            "question": "When installing a ceiling fan, what is the primary purpose of the safety wire/pin connected to the downrod?",
            "options": ["Reduces humming noise", "Prevents the fan from falling if the bolt breaks", "Improves motor speed", "Acts as ground wire"],
            "correct": 1,
            "explanation": "The safety split pin and safety wire secure the motor assembly in case the shackle bolt loosens over time."
        }
    ],
    "plumbing": [
        {
            "id": "p1",
            "question": "Which tape must be wrapped clockwise around threaded pipe joints to ensure a watertight seal?",
            "options": ["Electrical PVC tape", "PTFE / Teflon tape", "Duct tape", "Masking tape"],
            "correct": 1,
            "explanation": "PTFE (Teflon) tape lubricates and seals threaded pipe fittings to prevent water leakage under pressure."
        },
        {
            "id": "p2",
            "question": "What is the primary function of a P-trap or S-trap installed under kitchen sinks and washbasins?",
            "options": ["Increases water drainage speed", "Maintains a water barrier to block sewer gases and odor", "Filters drinking water", "Prevents pipe freezing"],
            "correct": 1,
            "explanation": "The water seal trapped in the dip prevents hazardous and foul-smelling sewer gases from entering indoor living spaces."
        },
        {
            "id": "p3",
            "question": "A consumer complains of low water pressure in only one bathroom faucet, while others are fine. What should be checked first?",
            "options": ["Main municipal water meter", "Overhead water tank ball valve", "Faucet aerator for debris/calcification", "Sump motor capacitor"],
            "correct": 2,
            "explanation": "Isolated low flow at a single fixture is almost always caused by sediment or mineral scale clogging the nozzle aerator screen."
        },
        {
            "id": "p4",
            "question": "Which solvent cement is used specifically for joining rigid PVC plumbing pipes?",
            "options": ["Epoxy resin", "PVC Solvent Cement", "Silicone sealant", "Super glue"],
            "correct": 1,
            "explanation": "PVC solvent cement chemically welds the PVC fittings by softening and fusing the polymer layers together."
        }
    ],
    "ac-repair": [
        {
            "id": "a1",
            "question": "In split air conditioners, what symptom usually indicates low refrigerant (gas) levels?",
            "options": ["Ice formation on evaporator coils and low cooling", "Loud fan rattling noise", "Foul odor from vents", "Water overflow in remote control"],
            "correct": 0,
            "explanation": "Low refrigerant causes sub-freezing operating pressures, which causes ambient moisture to freeze into a layer of frost/ice across the cooling coil."
        },
        {
            "id": "a2",
            "question": "Why is nitrogen flushing and vacuuming required before charging new refrigerant?",
            "options": ["To test the room temperature", "To remove moisture and non-condensable air from copper lines", "To lubricate the remote sensor", "To cool the compressor faster"],
            "correct": 1,
            "explanation": "Moisture in the refrigeration circuit forms acid with synthetic oil and clogs capillary tubes, causing premature compressor burnout."
        }
    ]
}


class AssessmentSubmission(BaseModel):
    answers: Any = Field(description="Map or list of answers")


@router.get("/assessments/{category_slug}")
async def get_assessment(category_slug: str, user: dict = Depends(get_current_user)):
    """Retrieves randomized scenario questions for trade skill assessment."""
    slug = category_slug.lower()
    questions = QUESTION_BANK.get(slug) or QUESTION_BANK["electrical"]

    # Strip out the correct answer so client cannot inspect
    sanitized = [
        {"id": q["id"], "question": q["question"], "options": q["options"]}
        for q in questions
    ]

    payload = {
        "category": slug,
        "title": f"{slug.title()} Skill Assessment",
        "disclaimer": "Shramik Skill Assessment · Platform Skill Test (Independent Skill Verification)",
        "passingThreshold": 70,
        "totalQuestions": len(sanitized),
        "questions": sanitized,
    }

    return {
        "success": True,
        "data": payload,
        **payload,
    }


@router.post("/assessments/{category_slug}/submit")
async def submit_assessment(
    category_slug: str,
    submission: AssessmentSubmission,
    user: dict = Depends(get_current_user),
):
    """Evaluates answers, updates worker profile with assessment badge if passing threshold is met."""
    slug = category_slug.lower()
    questions = QUESTION_BANK.get(slug) or QUESTION_BANK["electrical"]

    # Normalize answers into dict: {qid: int_selected}
    answer_map: Dict[str, int] = {}
    if isinstance(submission.answers, list):
        for idx, item in enumerate(submission.answers):
            if isinstance(item, dict):
                qid = str(item.get("questionId") or item.get("id") or questions[min(idx, len(questions) - 1)]["id"])
                opt = item.get("selectedOption") if "selectedOption" in item else item.get("answer", 0)
                answer_map[qid] = int(opt)
    elif isinstance(submission.answers, dict):
        for k, v in submission.answers.items():
            answer_map[str(k)] = int(v)

    correct_count = 0
    feedback = []

    for idx, q in enumerate(questions):
        qid = q["id"]
        # Try both question ID ("e1") and 1-based or 0-based index ("1", "0")
        selected = answer_map.get(qid)
        if selected is None:
            selected = answer_map.get(str(idx + 1))
        if selected is None:
            selected = answer_map.get(str(idx))

        is_correct = selected == q["correct"]
        if is_correct:
            correct_count += 1
        feedback.append({
            "id": qid,
            "question": q["question"],
            "isCorrect": is_correct,
            "explanation": q["explanation"],
        })

    total = len(questions)
    score_percentage = int(round((correct_count / total) * 100)) if total > 0 else 0
    passed = score_percentage >= 70

    # If worker passed, update worker profile in database
    if passed:
        worker = await db.fetchrow('SELECT id, "skillTags" FROM "WorkerProfile" WHERE "userId"=$1', user["id"])
        if worker:
            existing_skills = worker["skillTags"] or []
            if slug not in existing_skills:
                existing_skills.append(slug)
            await db.execute(
                'UPDATE "WorkerProfile" SET "skillTags"=$1, status=$2 WHERE id=$3',
                existing_skills,
                "VERIFIED",
                worker["id"],
            )

    result_data = {
        "score": score_percentage,
        "scorePercentage": score_percentage,
        "correctCount": correct_count,
        "totalQuestions": total,
        "passed": passed,
        "badgeIssued": "Assessment Verified" if passed else None,
        "badgeAwarded": "Assessment Verified" if passed else None,
        "feedback": feedback,
    }

    return {
        "success": True,
        "data": result_data,
        **result_data,
    }
