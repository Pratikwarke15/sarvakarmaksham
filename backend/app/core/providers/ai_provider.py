import re
import time
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class JobIntent(BaseModel):
    jobToken: str = Field(description="Unique structured job identifier token")
    categorySlug: str = Field(description="Normalized service category slug")
    categoryName: str = Field(description="Human readable category name")
    requiredSkills: List[str] = Field(description="List of skilled trades required")
    detectedLanguage: str = Field(description="Detected language code (en, hi, mr)")
    urgency: str = Field(default="MEDIUM", description="Urgency level (LOW, MEDIUM, HIGH)")
    problemSummary: str = Field(description="Clean normalized summary of the issue")
    confidence: float = Field(ge=0.0, le=1.0, description="Model classification confidence")
    needsClarification: bool = Field(default=False)
    clarificationQuestion: Optional[str] = None


class AIJobUnderstandingProvider:
    """Multilingual Speech & Text NLU Engine for Shramik Co.
    Operates 100% locally with ₹0 API costs.
    Detects English, Hindi, and Marathi code-switched problem descriptions.
    """

    PATTERNS = [
        {
            "category": "electrical",
            "name": "Electrical",
            "skills": ["electrician", "electrical"],
            "keywords": [
                # Chargers & Electronics
                r"charger", r"mobile charger", r"phone charger", r"laptop charger", r"adapter",
                r"charging", r"cable", r"power cord", r"powerbank", r"battery", r"mobile", r"phone",
                r"laptop", r"gadget", r"electronics", r"electronic",
                # Sockets, Plugs, Switches
                r"socket", r"plug", r"switch", r"switchboard", r"board", r"outlet", r"extension",
                r"power strip", r"multi plug", r"power point",
                # Fans & Lights
                r"fan", r"pankha", r"majha pankha", r"kaam karat nahiye", r"chalat nahi", r"firat nahi",
                r"ceiling fan", r"exhaust fan", r"table fan", r"regulator", r"light",
                r"bulb", r"tube light", r"tubelight", r"led", r"lamp", r"chandelier", r"holder",
                # Power, Wiring, Faults
                r"mcb", r"fuse", r"breaker", r"circuit breaker", r"tripping", r"tripped",
                r"wire", r"wiring", r"short circuit", r"spark", r"sparking", r"current",
                r"shock", r"electric shock", r"voltage", r"fluctuation", r"earthing",
                r"inverter", r"ups", r"generator", r"meter", r"power cut",
                # Hindi Keywords
                "चार्जर", "मोबाइल चार्जर", "फोन चार्जर", "चार्जिग", "एडाप्टर", "केबल", "तार",
                "प्लग", "सॉकेट", "स्विच", "बोर्ड", "स्विचबोर्ड", "पंखा", "लाइट", "बल्ब", "एलईडी",
                "रेगुलेटर", "एमसीबी", "फ्यूज", "शॉर्ट सर्किट", "स्पार्क", "करंट", "बिजली",
                "विद्युत", "वोल्टेज", "अर्थिंग", "इनवर्टर", "मीटर", "झटका", "शॉक",
                # Marathi Keywords
                "चार्जर", "मोबाईल चार्जर", "चार्जिंग", "अडॅप्टर", "केबल", "वायर", "प्लग",
                "सॉकेट", "बटण", "बोर्ड", "लाईट", "दिवा", "पंखा", "माझा पंखा", "काम करत नाहीये",
                "चालत नाही", "फिरत नाही", "रेग्युलेटर", "एमसीबी",
                "फ्यूज", "शॉर्ट सर्किट", "स्पार्किंग", "करंट", "वीज", "व्होल्टेज", "इन्व्हर्टर", "जळाली"
            ],
            "urgency_keywords": [
                "spark", "sparking", "smoke", "fire", "burning", "shock", "short circuit",
                "धुआं", "आग", "चमक", "शॉक", "जलना", "धूर", "जळाली"
            ]
        },
        {
            "category": "plumbing",
            "name": "Plumbing",
            "skills": ["plumbing", "plumber"],
            "keywords": [
                # Pipes & Leaks
                r"pipe", r"pipeline", r"leak", r"leakage", r"leaking", r"burst pipe", r"dripping",
                r"seepage", r"water seepage",
                # Taps & Valves
                r"tap", r"taps", r"faucet", r"valve", r"stop cock", r"shower", r"hand shower",
                r"jet spray", r"health faucet",
                # Sanitary & Drains
                r"sink", r"wash basin", r"washbasin", r"basin", r"commode", r"toilet", r"flush",
                r"cistern", r"drain", r"drainage", r"clog", r"clogged", r"blocked", r"choke",
                r"overflow", r"sewer", r"gutter",
                # Water Supply & Tanks
                r"water tank", r"tank", r"submersible", r"water pump", r"tullu pump", r"motor pump",
                # Hindi Keywords
                "नल", "पाइप", "पाइपलाइन", "लीक", "लीकेज", "टपकना", "पानी", "टंकी", "टोंटी",
                "शावर", "वॉशबेसिन", "सिंक", "कमोड", "फ्लश", "जेट स्प्रे", "ड्रेन", "नाली",
                "जाम", "सीवर", "गटर", "पानी का मोटर", "टुल्लू पंप", "ओवरफ्लो",
                # Marathi Keywords
                "नळ", "पाईप", "गळती", "पाणी", "टाकी", "वॉशबेसिन", "सिंक", "फ्लश", "शॉवर",
                "ड्रेनेज", "तुंबले", "अडकले", "गटार", "पाण्याचा पंप", "मोटार"
            ],
            "urgency_keywords": [
                "burst", "overflow", "flooding", "water everywhere", "बाढ़", "फूट", "भर गया", "पूर", "गळती"
            ]
        },
        {
            "category": "ac-repair",
            "name": "AC & Appliance Repair",
            "skills": ["ac-repair", "appliance-repair"],
            "keywords": [
                # AC
                r"ac", r"air conditioner", r"split ac", r"window ac", r"cooling", r"not cooling",
                r"gas leak", r"gas refill", r"compressor", r"ac remote", r"ac service",
                # Large Appliances
                r"fridge", r"refrigerator", r"freezer", r"washing machine", r"microwave",
                r"oven", r"geyser", r"water heater", r"cooler", r"air cooler", r"ro",
                r"water purifier", r"purifier", r"chimney", r"induction", r"mixer grinder",
                # Hindi Keywords
                "एसी", "एयर कंडीशनर", "कूलिंग", "ठंडा", "गैस", "कंप्रेसर", "फ्रिज",
                "वाशिंग मशीन", "गीजर", "कूलर", "माइक्रोवेव", "पानी का हीटर", "आरओ", "चिमनी",
                # Marathi Keywords
                "एसी", "थंड", "गॅस", "कंप्रेसर", "फ्रिज", "वॉशिंग मशीन", "गिझर", "कुलर"
            ],
            "urgency_keywords": ["gas leak", "water dripping", "गैस लीक", "पानी गिर रहा"]
        },
        {
            "category": "carpentry",
            "name": "Carpentry",
            "skills": ["carpentry", "carpenter"],
            "keywords": [
                # Doors & Windows
                r"door", r"wooden door", r"window", r"sliding", r"mesh",
                # Wood & Materials
                r"wood", r"wooden", r"timber", r"plywood", r"sunmica", r"laminate",
                # Hardware
                r"lock", r"door lock", r"padlock", r"handle", r"hinge", r"latch", r"kundi",
                r"channel", r"drawer channel",
                # Furniture
                r"furniture", r"table", r"chair", r"bed", r"sofa", r"wardrobe", r"cupboard",
                r"almirah", r"cabinet", r"drawer", r"shelf",
                # Hindi Keywords
                "दरवाजा", "लकड़ी", "ताला", "कुंडी", "कब्जा", "हैंडल", "फर्नीचर", "मेज",
                "कुर्सी", "अलमारी", "बेड", "दराज", "प्लाईवुड", "बढ़ई", "कारपेंटर",
                # Marathi Keywords
                "लाकडी", "दार", "खिडकी", "कुलूप", "कडी", "कपाट", "टेबल", "खुर्ची", "सुतार"
            ],
            "urgency_keywords": ["broken lock", "locked out", "ताला टूट", "कुलूप अडकले"]
        },
        {
            "category": "painting",
            "name": "Painting",
            "skills": ["painting", "painter"],
            "keywords": [
                r"paint", r"painting", r"painter", r"wall paint", r"distemper", r"putty",
                r"primer", r"texture", r"waterproofing", r"whitewash", r"color",
                # Hindi Keywords
                "पेंट", "पुट्टी", "सफेदी", "रंग", "दीवार", "वाटरप्रूफिंग",
                # Marathi Keywords
                "रंगकाम", "भिंत", "कलर", "पुट्टी"
            ],
            "urgency_keywords": []
        },
        {
            "category": "cleaning",
            "name": "Cleaning",
            "skills": ["cleaning", "cleaner"],
            "keywords": [
                r"clean", r"cleaning", r"deep clean", r"dusting", r"mopping", r"sanitization",
                r"home cleaning", r"bathroom clean", r"kitchen clean", r"sofa clean",
                # Hindi Keywords
                "सफाई", "धुलाई", "झाड़ू", "पोछा", "डीप क्लीनिंग", "स्वच्छता",
                # Marathi Keywords
                "साफसफाई", "स्वच्छता", "धुणे"
            ],
            "urgency_keywords": []
        },
    ]

    @staticmethod
    def detect_language(text: str) -> str:
        """Detects whether text is in Marathi, Hindi, or English based on vocabulary and Devanagari scripts."""
        text_lower = text.lower()

        # 1. Romanized Marathi detection (e.g. 'majha pankha kaam karat nahiye')
        roman_marathi_triggers = [
            "majha", "majhya", "majhe", "karat", "nahiye", "chalat", "firat",
            "jhalay", "jhala", "durust", "duruusti", "gharat", "kholit"
        ]
        if any(re.search(rf"\b{w}\b", text_lower) for w in roman_marathi_triggers):
            return "mr"

        has_devanagari = any("\u0900" <= ch <= "\u097F" for ch in text)
        if not has_devanagari:
            # Romanized Hindi triggers
            if any(re.search(rf"\b{w}\b", text_lower) for w in ["mera", "meri", "karein", "nahin", "raha", "rahi"]):
                return "hi"
            return "en"

        # 2. Devanagari Marathi markers
        marathi_markers = [
            "आहे", "नाही", "नाहीये", "माझा", "माझ्या", "माझे", "घरचा", "घरातील", "खोलीतील",
            "काम", "करत", "चालत", "फिरत", "गळती", "झाले", "झालाय", "करा", "होत", "हवे",
            "आणखी", "करायचे", "पाहिजे", "दुरुस्ती", "बिघाड"
        ]
        if any(marker in text for marker in marathi_markers):
            return "mr"
        return "hi"

    def analyze(self, raw_input: str) -> JobIntent:
        """Analyzes text/transcribed voice and produces structured Pydantic JobIntent."""
        text = raw_input.strip()
        text_lower = text.lower()
        lang = self.detect_language(text)

        best_category = None
        best_name = "General Electrical & Maintenance"
        best_skills = ["electrical"]
        max_matches = 0
        is_urgent = False

        for pattern in self.PATTERNS:
            matches = 0
            for kw in pattern["keywords"]:
                # Check for whole-word or substring match
                pattern_regex = rf"\b{re.escape(kw.lower())}\b" if kw.isascii() else re.escape(kw)
                if re.search(pattern_regex, text_lower):
                    # Direct word match gets high weight
                    matches += 2
                elif kw.lower() in text_lower:
                    matches += 1

            for ukw in pattern["urgency_keywords"]:
                if ukw.lower() in text_lower:
                    is_urgent = True

            if matches > max_matches:
                max_matches = matches
                best_category = pattern["category"]
                best_name = pattern["name"]
                best_skills = pattern["skills"]

        # Intelligent Fallback if no exact keyword match:
        if not best_category or max_matches == 0:
            # Semantic fallback checks:
            # 1. Electronics/Power/Charging words
            if any(w in text_lower for w in ["charg", "phone", "mobile", "battery", "laptop", "screen", "power", "display", "device", "gadget", "socket", "plug"]):
                best_category = "electrical"
                best_name = "Electrical"
                best_skills = ["electrician", "electrical"]
                confidence = 0.85
                needs_clarification = False
                question = None
            # 2. Water / Liquid words
            elif any(w in text_lower for w in ["water", "liquid", "drip", "moist", "wet", "drain", "flow", "sink", "flush"]):
                best_category = "plumbing"
                best_name = "Plumbing"
                best_skills = ["plumbing", "plumber"]
                confidence = 0.85
                needs_clarification = False
                question = None
            # 3. Cooling / Appliance words
            elif any(w in text_lower for w in ["cool", "cold", "heat", "freeze", "ice", "machine", "motor", "spin", "wash"]):
                best_category = "ac-repair"
                best_name = "AC & Appliance Repair"
                best_skills = ["ac-repair", "appliance-repair"]
                confidence = 0.85
                needs_clarification = False
                question = None
            # 4. Wood / Structural words
            elif any(w in text_lower for w in ["wood", "door", "window", "lock", "hinge", "frame", "crack", "cabinet", "chair", "table"]):
                best_category = "carpentry"
                best_name = "Carpentry"
                best_skills = ["carpentry", "carpenter"]
                confidence = 0.85
                needs_clarification = False
                question = None
            else:
                # Default to Electrical inspection (NEVER blindly default to plumbing!)
                best_category = "electrical"
                best_name = "Electrical & General Maintenance"
                best_skills = ["electrical", "electrician"]
                confidence = 0.50
                needs_clarification = True
                question = (
                    "Could you please specify which item or appliance needs repair (e.g., electrical wiring, plumbing, or carpentry)?"
                    if lang == "en"
                    else (
                        "कृपया स्पष्ट करें कि किस उपकरण या वस्तु में खराबी है (जैसे बिजली/चार्जर, नल/प्लंबिंग, या बढ़ईगीरी)?"
                        if lang == "hi"
                        else "कृपया सांगा की कोणत्या उपकरणात किंवा वस्तूत बिघाड आहे (उदा. वीज/चार्जर, नळ/प्लंबिंग, किंवा लाकडी काम)?"
                    )
                )
        else:
            confidence = min(0.98, 0.70 + (max_matches * 0.05))
            needs_clarification = False
            question = None

        urgency_level = "HIGH" if is_urgent else ("MEDIUM" if max_matches >= 3 else "LOW")
        token_num = int(time.time()) % 1000000
        job_token = f"JOB-2026-{token_num:06d}"

        return JobIntent(
            jobToken=job_token,
            categorySlug=best_category,
            categoryName=best_name,
            requiredSkills=best_skills,
            detectedLanguage=lang,
            urgency=urgency_level,
            problemSummary=text[:200],
            confidence=round(confidence, 2),
            needsClarification=needs_clarification,
            clarificationQuestion=question,
        )
