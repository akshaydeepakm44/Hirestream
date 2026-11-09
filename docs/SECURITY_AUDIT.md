# HireStream — Application Security Audit

**Audit Date:** November 9, 2026  
**Auditor:** Application Security & Infrastructure Engineering Team  
**Scope:** Authentication, Authorization (RBAC), Secrets Management, Transport Security, API Guards

---

## 1. Security Findings & Remediation Register

| Vulnerability / Risk | Severity | Initial Status | Remediation Implemented |
|---|:---:|:---:|---|
| **Hardcoded Database Passwords in Logs** | **HIGH** | Exposed via raw print statements | Sanitized in `database.py` via regex masking (`postgresql://user:***@host`) |
| **Unrestricted File Upload Types** | **HIGH** | Potential for arbitrary file execution | Strict validation in `minio_client.py` and `candidate_routes.py` allowing only PDF MIME types |
| **CORS Misconfiguration on Cloud Envs** | **HIGH** | Could fail or expose open wildcard | Hardened Pydantic validator supporting explicit origin arrays |
| **Missing Root `.gitignore` Protection** | **MEDIUM** | Risk of accidental `.env` leaks | Created root-level `.gitignore` with comprehensive secret/credential exclusions |
| **Destructive Database Seeder Script** | **MEDIUM** | Inadvertent database drop | Added `ENV=production` abort guard preventing wipeouts on live databases |
| **Missing Security HTTP Headers on Frontend** | **LOW** | Vulnerable to clickjacking / sniffing | Added `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection` to `vercel.json` |

---

## 2. Authentication & Authorization Architecture

### 2.1 Password Security
- Passwords are encrypted using standard **Bcrypt** (`passlib[bcrypt]`, cost factor 12).
- Plaintext passwords are never logged, persisted, or returned in API responses.

### 2.2 JWT Token Mechanics
- Access tokens are signed using HMAC-SHA256 (`HS256`) with a cryptographically strong secret key.
- Tokens encode `sub` (user primary key ID) and `role` claim.
- Lifetime is enforced via standard `exp` claims (default: 24 hours).
- Expired or malformed tokens are rejected with HTTP 401 Unauthorized by the `get_current_user` dependency.

### 2.3 Persona Role-Based Access Control (RBAC)
- All protected endpoints utilize the `require_role(*roles)` dependency guard:
  ```python
  def require_role(*roles: UserRole):
      def checker(current_user: User = Depends(get_current_user)):
          if current_user.role not in roles:
              raise HTTPException(status_code=403, detail="Insufficient permissions")
          return current_user
      return checker
  ```
- Super Admin routes (`/admin/*`) require `UserRole.super_admin`.
- Recruiter routes (`/rm/*`, `/hm/*`) enforce role verification and approval status checking (`UserStatus.approved`). Pending or rejected recruiters are blocked with HTTP 403.
- Candidates cannot inspect or manipulate other candidates' applications (filtered by `Candidate.user_id == current_user.id`).

---

## 3. Git History & Secrets Scan

- Full history git audit (`git log --all --full-history`) confirmed that **no production secrets or `.env` credential files were ever committed to repository history**.
- Only `.env.example` templates with placeholder values exist in version control.
