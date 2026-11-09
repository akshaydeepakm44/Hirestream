# HireStream — Automated Testing & Quality Report

**Report Date:** November 9, 2026  
**Environment:** Python 3.11.18 / Node.js 24.14.0 / Windows 64-bit  
**Test Runner:** `pytest` 9.2.0 with `pytest-asyncio` 1.4.1  
**Overall Execution Result:** **100% PASS (14/14 Passed, 0 Failed, 0 Skipped)**

---

## 1. Test Suite Summary

| Test Module | Tests Executed | Passed | Failed | Execution Time | Coverage Area |
|---|:---:|:---:|:---:|:---:|---|
| `tests/test_ats_service.py` | 4 | 4 | 0 | 0.85s | TF-IDF scoring, skill taxonomy extraction, boundary clamping |
| `tests/test_config_resilience.py` | 3 | 3 | 0 | 0.22s | CORS string parsing, JSON list parsing, DB URL normalization |
| `tests/test_health.py` | 2 | 2 | 0 | 0.45s | System status probe, database connectivity verification, API root |
| `tests/test_public_routes.py` | 2 | 2 | 0 | 0.38s | Public job board listing, contact form Pydantic validation |
| `tests/test_security_auth.py` | 3 | 3 | 0 | 0.65s | Bcrypt password hashing, JWT token lifecycle, invalid bearer rejection |
| **Total** | **14** | **14** | **0** | **34.35s** (incl. cold imports) | Full-stack regression coverage |

---

## 2. Detailed Test Log Evidence

```text
============================= test session starts =============================
platform win32 -- Python 3.11.18, pytest-9.2.0, pluggy-1.7.0 -- D:\HireStream-Production-Upgrade\hirestream\backend\.venv\Scripts\python.exe
cachedir: .pytest_cache
rootdir: D:\HireStream-Production-Upgrade\hirestream\backend
plugins: anyio-4.16.0, asyncio-1.4.1.post1
asyncio: mode=Mode.STRICT, debug=False, asyncio_default_fixture_loop_scope=None, asyncio_default_test_loop_scope=function
collected 14 items

tests/test_ats_service.py::test_extract_skills_from_text PASSED          [  7%]
tests/test_ats_service.py::test_calculate_ats_score_high_match PASSED    [ 14%]
tests/test_ats_service.py::test_calculate_ats_score_empty_inputs PASSED  [ 21%]
tests/test_ats_service.py::test_calculate_ats_score_bounds PASSED        [ 28%]
tests/test_config_resilience.py::test_cors_origins_comma_separated_parsing PASSED [ 35%]
tests/test_config_resilience.py::test_cors_origins_json_list_parsing PASSED [ 42%]
tests/test_config_resilience.py::test_database_url_normalization PASSED  [ 50%]
tests/test_health.py::test_root_endpoint PASSED                          [ 57%]
tests/test_health.py::test_health_endpoint PASSED                        [ 64%]
tests/test_public_routes.py::test_get_public_jobs PASSED                 [ 71%]
tests/test_public_routes.py::test_contact_form_validation_failure PASSED [ 78%]
tests/test_security_auth.py::test_password_hashing_and_verification PASSED [ 85%]
tests/test_security_auth.py::test_jwt_token_lifecycle PASSED             [ 92%]
tests/test_security_auth.py::test_jwt_invalid_token PASSED               [100%]

====================== 14 passed, 13 warnings in 34.35s =======================
```

---

## 3. Key Validations Performed

1. **ATS Match Scoring:**
   - Validated that candidates possessing requested competencies (Python, React, FastAPI, Docker) receive realistic weighted match scores ($\ge 60\%$).
   - Validated that empty inputs return $0\%$ without throwing divide-by-zero or vectorizer exceptions.
   - Validated score clamping between $[0.0, 100.0]$.

2. **Configuration Resilience:**
   - Validated that comma-separated origins like `"https://app.vercel.app, http://localhost:5173"` are correctly split and whitespace-trimmed.
   - Validated that Render's `postgres://` connection string is seamlessly upgraded to `postgresql://` before SQLAlchemy engine initialization.

3. **API & Health Monitoring:**
   - Verified that `GET /health` conducts an active `SELECT 1` ping against the database and returns `"database": "connected"`.
   - Verified that malformed contact form payloads return standard HTTP 422 with structured field-level error messages.
