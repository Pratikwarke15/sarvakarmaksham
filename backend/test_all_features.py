import json
import time
import requests

BASE_URL = "http://127.0.0.1:4000/api/v1"

class TestReport:
    def __init__(self):
        self.results = []

    def record(self, test_name: str, passed: bool, details: dict):
        self.results.append({
            "test": test_name,
            "passed": passed,
            "details": details,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        })
        status_str = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status_str} | {test_name}")

def run_all_tests():
    report = TestReport()
    session = requests.Session()
    print("\n" + "="*70)
    print("STARTING COMPREHENSIVE SHRAMIK FEATURE VERIFICATION SUITE")
    print("="*70 + "\n")

    # 1. Health Check
    try:
        r = session.get(f"{BASE_URL}/health")
        data = r.json()
        passed = r.status_code == 200 and data.get("status") == "ok"
        report.record("1. System Health Check", passed, data)
    except Exception as e:
        report.record("1. System Health Check", False, {"error": str(e)})

    # 2. Consumer Authentication (Login Seed Consumer)
    consumer_token = None
    try:
        r = session.post(f"{BASE_URL}/auth/login", json={
            "phone": "9812345601",
            "password": "password123"
        })
        data = r.json()
        passed = r.status_code == 200 and data.get("success") is True and "token" in data.get("data", {})
        if passed:
            consumer_token = data["data"]["token"]
            user_info = data["data"]["user"]
            report.record("2. Consumer Auth (Seed 9812345601)", passed, {
                "name": user_info.get("name"),
                "role": user_info.get("role"),
                "token_received": bool(consumer_token)
            })
        else:
            report.record("2. Consumer Auth (Seed 9812345601)", False, data)
    except Exception as e:
        report.record("2. Consumer Auth (Seed 9812345601)", False, {"error": str(e)})

    # 3. Worker Authentication (Login Seed Worker Ramesh Gupta)
    worker_token = None
    try:
        r = session.post(f"{BASE_URL}/auth/login", json={
            "phone": "9876543201",
            "password": "password123"
        })
        data = r.json()
        passed = r.status_code == 200 and data.get("success") is True and "token" in data.get("data", {})
        if passed:
            worker_token = data["data"]["token"]
            user_info = data["data"]["user"]
            report.record("3. Worker Auth (Ramesh Gupta 9876543201)", passed, {
                "name": user_info.get("name"),
                "role": user_info.get("role"),
                "token_received": bool(worker_token)
            })
        else:
            report.record("3. Worker Auth (Ramesh Gupta 9876543201)", False, data)
    except Exception as e:
        report.record("3. Worker Auth (Ramesh Gupta 9876543201)", False, {"error": str(e)})

    # 3b. Consumer Sign Up (Registration Flow)
    test_consumer_phone = f"99{int(time.time()) % 100000000:08d}"
    try:
        r_c_reg = session.post(f"{BASE_URL}/auth/register", json={
            "phone": test_consumer_phone,
            "name": "Arjun Sharma",
            "password": "password123",
            "role": "CONSUMER"
        })
        reg_c_data = r_c_reg.json()
        passed_c = r_c_reg.status_code == 201 and reg_c_data.get("success") is True
        report.record("3b. Consumer Sign Up (New Account)", passed_c, {
            "phone": test_consumer_phone,
            "role": "CONSUMER",
            "token_created": bool(reg_c_data.get("data", {}).get("token"))
        })
    except Exception as e:
        report.record("3b. Consumer Sign Up (New Account)", False, {"error": str(e)})

    # 3c. Worker Sign Up (Technician Registration Flow)
    test_worker_phone = f"98{int(time.time() + 1) % 100000000:08d}"
    try:
        r_w_reg = session.post(f"{BASE_URL}/auth/register", json={
            "phone": test_worker_phone,
            "name": "Sunil Kumar",
            "password": "password123",
            "role": "WORKER"
        })
        reg_w_data = r_w_reg.json()
        passed_w = r_w_reg.status_code == 201 and reg_w_data.get("success") is True
        report.record("3c. Worker Sign Up (New Technician)", passed_w, {
            "phone": test_worker_phone,
            "role": "WORKER",
            "token_created": bool(reg_w_data.get("data", {}).get("token"))
        })
    except Exception as e:
        report.record("3c. Worker Sign Up (New Technician)", False, {"error": str(e)})

    # 4. Trilingual Voice AI Job Extraction (English, Hindi, Marathi)
    prompts = [
        ("English", "My kitchen ceiling fan is sparking and circuit breaker tripped", "electrical"),
        ("Hindi", "मेरे बाथरूम का पाइप लीक कर रहा है और पानी भर गया है", "plumbing"),
        ("Marathi", "माझ्या खोलीतील पंखा चालत नाही आणि वायर जळाली आहे", "electrical")
    ]
    for lang, text, expected_cat in prompts:
        try:
            r = session.post(f"{BASE_URL}/ai/voice-job", json={
                "transcript": text,
                "latitude": 28.6139,
                "longitude": 77.209
            })
            data = r.json()
            res = data.get("data", {})
            passed = r.status_code == 200 and data.get("success") is True and res.get("category") == expected_cat
            report.record(f"4. Voice AI NLU [{lang}]", passed, {
                "transcript": text,
                "extracted_category": res.get("category"),
                "urgency": res.get("urgency"),
                "price_range": f"₹{res.get('priceEstimate', {}).get('p25')} - ₹{res.get('priceEstimate', {}).get('p75')}"
            })
        except Exception as e:
            report.record(f"4. Voice AI NLU [{lang}]", False, {"error": str(e)})

    # 5. Co-op Services Listing
    all_services = []
    try:
        r = session.get(f"{BASE_URL}/coops/services")
        data = r.json()
        all_services = data.get("data", [])
        passed = r.status_code == 200 and len(all_services) > 0
        report.record("5. Co-op Services Catalog", passed, {
            "total_services": len(all_services),
            "sample_categories": list(set(s.get("categorySlug") for s in all_services))
        })
    except Exception as e:
        report.record("5. Co-op Services Catalog", False, {"error": str(e)})

    # 6. Geospatial Nearby Workers (Delhi Coordinates)
    selected_worker = None
    try:
        r = session.get(f"{BASE_URL}/bookings/nearby-workers", params={
            "lat": "28.6139",
            "lng": "77.2090",
            "radius": "15",
            "skills": "electrical,plumbing"
        })
        data = r.json()
        workers = data.get("data", [])
        passed = r.status_code == 200 and len(workers) > 0
        if passed:
            selected_worker = workers[0]
            report.record("6. Geospatial Nearby Worker Match (Delhi)", passed, {
                "worker_found": selected_worker.get("workerName"),
                "skills": selected_worker.get("skillTags"),
                "distance_km": selected_worker.get("distanceKm"),
                "eta_minutes": selected_worker.get("etaMinutes"),
                "rating": selected_worker.get("avgRating"),
                "match_score": selected_worker.get("matchScore")
            })
        else:
            report.record("6. Geospatial Nearby Worker Match (Delhi)", False, data)
    except Exception as e:
        report.record("6. Geospatial Nearby Worker Match (Delhi)", False, {"error": str(e)})

    # 7. Booking Creation & Assignment (Matching Service with Worker Skill)
    created_booking = None
    if consumer_token and selected_worker:
        try:
            # Pick service matching selected worker's skills and coop
            worker_skills = selected_worker.get("skillTags", selected_worker.get("skills", []))
            worker_coop = selected_worker.get("coopId")
            matching_service = next(
                (s for s in all_services if (not worker_coop or s.get("coopId") == worker_coop) and s.get("categorySlug") in worker_skills),
                next((s for s in all_services if s.get("categorySlug") in worker_skills), all_services[0] if all_services else None)
            )

            r = session.post(
                f"{BASE_URL}/bookings",
                headers={"Authorization": f"Bearer {consumer_token}"},
                json={
                    "serviceId": matching_service["id"],
                    "workerId": selected_worker["workerId"],
                    "address": "Connaught Place, New Delhi",
                    "description": "Urgent electrical switchboard repair",
                    "latitude": 28.6139,
                    "longitude": 77.2090
                }
            )
            data = r.json()
            passed = r.status_code in [200, 201] and data.get("success") is True
            if passed:
                created_booking = data.get("data", {})
                report.record("7. Create Consumer Booking", passed, {
                    "booking_id": created_booking.get("id"),
                    "status": created_booking.get("status"),
                    "service_booked": matching_service.get("name"),
                    "assigned_worker": selected_worker.get("workerName")
                })
            else:
                report.record("7. Create Consumer Booking", False, data)
        except Exception as e:
            report.record("7. Create Consumer Booking", False, {"error": str(e)})

    # 8. OSRM Road Route & Turn-by-Turn
    try:
        r = session.post(f"{BASE_URL}/routes/navigate", json={
            "workerLat": 28.6189,
            "workerLng": 77.2120,
            "consumerLat": 28.6139,
            "consumerLng": 77.2090
        })
        data = r.json()
        passed = r.status_code == 200 and data.get("success") is True
        route_info = data.get("data", {})
        report.record("8. OSRM Road Route & Turn-by-Turn", passed, {
            "distance_km": route_info.get("distanceKm"),
            "duration_minutes": route_info.get("durationMinutes"),
            "steps_count": len(route_info.get("steps", [])),
            "sample_instruction": route_info.get("steps", [{}])[0].get("instruction") if route_info.get("steps") else "Head towards destination"
        })
    except Exception as e:
        report.record("8. OSRM Road Route & Turn-by-Turn", False, {"error": str(e)})

    # 9. Multi-Job Route Optimization with Google OR-Tools
    try:
        r = session.post(f"{BASE_URL}/routes/optimize", json={
            "workerOrigin": {"lat": 28.6139, "lng": 77.2090},
            "jobs": [
                {"jobId": "job-1", "lat": 28.6200, "lng": 77.2150, "address": "Barakhamba Road"},
                {"jobId": "job-2", "lat": 28.6300, "lng": 77.2200, "address": "Mandi House"},
                {"jobId": "job-3", "lat": 28.6150, "lng": 77.2050, "address": "Janpath"}
            ]
        })
        data = r.json()
        passed = r.status_code == 200 and data.get("success") is True
        opt_data = data.get("data", {})
        report.record("9. Google OR-Tools Multi-Job Route Optimization", passed, {
            "optimized_order": opt_data.get("optimizedOrder"),
            "total_distance_km": opt_data.get("totalDistanceKm"),
            "total_duration_minutes": opt_data.get("totalDurationMinutes"),
            "distance_saved": opt_data.get("optimizationGain")
        })
    except Exception as e:
        report.record("9. Google OR-Tools Multi-Job Route Optimization", False, {"error": str(e)})

    # 10. Worker Skill Assessment & Auto-Grading
    if worker_token:
        try:
            r_q = session.get(
                f"{BASE_URL}/skills/assessments/electrical",
                headers={"Authorization": f"Bearer {worker_token}"}
            )
            q_data = r_q.json()
            questions = q_data.get("data", {}).get("questions", [])
            
            # Answer keys: e1:0, e2:1, e3:0, e4:1
            answers = {"e1": 0, "e2": 1, "e3": 0, "e4": 1}
            
            r_sub = session.post(
                f"{BASE_URL}/skills/assessments/electrical/submit",
                headers={"Authorization": f"Bearer {worker_token}"},
                json={"answers": answers}
            )
            sub_data = r_sub.json()
            sub_res = sub_data.get("data", sub_data)
            passed = r_sub.status_code == 200 and sub_res.get("passed") is True
            report.record("10. Skill Assessment & Auto-Grading", passed, {
                "category": "electrical",
                "total_questions": len(questions),
                "score": f"{sub_res.get('scorePercentage')}%",
                "passed": sub_res.get("passed"),
                "badge_issued": sub_res.get("badgeIssued") or sub_res.get("badgeAwarded")
            })
        except Exception as e:
            report.record("10. Skill Assessment & Auto-Grading", False, {"error": str(e)})

    # 11. Razorpay Payment Initiation & Mock Verification
    if consumer_token and created_booking:
        try:
            booking_id = created_booking["id"]
            r_init = session.post(
                f"{BASE_URL}/payments/initiate",
                headers={"Authorization": f"Bearer {consumer_token}"},
                json={"bookingId": booking_id}
            )
            r_ord = session.post(
                f"{BASE_URL}/payments/create-order",
                headers={"Authorization": f"Bearer {consumer_token}"},
                json={"bookingId": booking_id}
            )
            order_data = r_ord.json()
            order_id = order_data.get("data", {}).get("id", f"order_mock_{booking_id[:8]}")
            
            r_ver = session.post(
                f"{BASE_URL}/payments/verify",
                headers={"Authorization": f"Bearer {consumer_token}"},
                json={
                    "orderId": order_id,
                    "paymentId": f"pay_mock_{int(time.time())}",
                    "signature": "mock_signature",
                    "bookingId": booking_id
                }
            )
            ver_data = r_ver.json()
            passed = ver_data.get("success") is True
            report.record("11. Razorpay Escrow Order & Verification", passed, {
                "booking_id": booking_id,
                "order_id": order_id,
                "payment_status": "COMPLETED",
                "escrow_verified": passed
            })
        except Exception as e:
            report.record("11. Razorpay Escrow Order & Verification", False, {"error": str(e)})

    print("\n" + "="*70)
    total_tests = len(report.results)
    passed_tests = sum(1 for r in report.results if r["passed"])
    print(f"VERIFICATION COMPLETE: {passed_tests}/{total_tests} TESTS PASSED ({passed_tests/total_tests*100:.1f}%)")
    print("="*70 + "\n")

    with open("test_results.json", "w") as f:
        json.dump(report.results, f, indent=2)
    print("Detailed test report saved to backend/test_results.json")

if __name__ == "__main__":
    run_all_tests()
