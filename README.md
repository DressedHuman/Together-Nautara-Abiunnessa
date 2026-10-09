# Together — Nautara Abiunnessa Alumni

The verified alumni network of Nautara Abiunnessa B.L. High School. Alumni sign up, confirm their email, describe their batch, and appear in a public directory once the alumni committee verifies them. The product spec is in `documentatjion.json`.

| Folder | Stack |
|---|---|
| `backend/` | Django 5.2 LTS, Django REST Framework, SimpleJWT, SQLite, Cloudinary (optional) |
| `frontend/` | React 19, TypeScript, Vite, Redux Toolkit, React Router, Tailwind CSS v4 |

## Features

- **Accounts:** register with email and phone, verify by emailed 6-digit code, sign in by email *or* phone, forgot/reset password, change password, sign out (refresh token revoked).
- **Profiles:** SSC batch, roll, section, names in English and Bangla, work, education, location, bio, Facebook/LinkedIn links, and photo upload.
- **Directory:** public search by name (English/Bangla), profession or company, filters by batch, country and profession, sorting and pagination. Public profile pages.
- **Verification workflow:**
  - Batch **coordinators** see everyone in their batch and recommend people they recognise.
  - The **committee** approves or rejects with a note (emailed to the member), revokes approvals, browses all profiles and reads the audit log.
  - The committee also manages batches and assigns or removes coordinators.
- **Re-review:** changing name, batch, roll or section on an approved profile sends it back for review. Editing a rejected profile resubmits it.

### Who sees what

| Information | Visible to |
|---|---|
| Name, batch, photo, profession, workplace, university, city, country, bio | Everyone (approved profiles only) |
| Roll, section, Facebook, LinkedIn | Signed-in **approved** alumni and the committee |
| Email, phone | The member, their batch coordinators, the committee |

## Running locally

Requirements: Python 3.11+ and Node 20+.

```bash
# API on :8000
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env                 # DEBUG=True is fine locally
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_demo  # optional: fictional alumni + demo committee/coordinator logins (printed)
.venv/bin/python manage.py runserver

# Web app on :5173 (proxies /api and /media to :8000)
cd frontend
npm install
npm run dev
```

In development, emails (verification and reset codes) are **printed in the `runserver` terminal**.

To make a real committee member, run `.venv/bin/python manage.py createsuperuser`. Superusers get the `committee` role and can also use the Django admin at `/admin/`. You can also change a user's role in the Django admin.

## Tests

```bash
cd backend && .venv/bin/python manage.py test              # 35 API tests: features, permissions, uploads, OTP and throttling
cd frontend && npm run lint && npm run build                # type check, lint, production build
```

## API (`/api/v1/`)

| Area | Endpoints |
|---|---|
| Auth | `auth/register/`, `auth/verify-otp/`, `auth/request-otp/`, `auth/login-email/`, `auth/login-phone/`, `auth/refresh-token/`, `auth/logout/`, `auth/me/`, `auth/password-reset/`, `auth/password-reset/confirm/`, `auth/change-password/` |
| Alumni | `alumni/me/` (GET, POST, PUT/PATCH, multipart), `alumni/<id>/` |
| Directory | `directory/`, `directory/<id>/`, `directory/filters/`, `directory/stats/` |
| Batches | `batches/`, `batches/<year>/`, `batches/<year>/alumni/`, `batches/<year>/coordinators/[<id>/]` (writes are committee-only) |
| Coordinator | `coordinator/batch-alumni/`, `coordinator/verify-alumni/` |
| Committee | `approvals/pending/`, `approvals/alumni/`, `approvals/stats/`, `approvals/<id>/approve/`, `approvals/<id>/reject/`, `approvals/logs/` |

## Security notes

- **OTP codes:** 6 random digits from `secrets`, stored **hashed**, expire after 10 minutes, burned after 5 wrong guesses, separate codes for verify and reset, 60-second resend cooldown. They are never returned by the API.
- **No account enumeration:** code requests always give the same response, and login failures are generic. Phone login does the same password-hashing work whether or not the account exists.
- **Rate limits per IP:** login 10/min, register 5/hour, codes 10/hour. Set `NUM_PROXIES` behind a proxy so the real client IP is used.
- **Passwords:** Django's validators. Refresh tokens rotate and are blacklisted, and a password change or reset revokes all sessions.
- **Photos:** checked by content (not file name or MIME type), capped in size and pixels, and **re-encoded to JPEG**. This removes EXIF/GPS data and anything hidden in the file. Stored under random names.
- **Social links:** only `facebook.com` and `linkedin.com` URLs are accepted, normalised to `https`. The browsable API is disabled.
- **Production (`DEBUG=False`):** refuses to start without `SECRET_KEY`, and enables HSTS, secure cookies and an SSL redirect. The frontend's `vercel.json` sets a strict Content-Security-Policy.

## Deploying

**Backend (Render or Railway).**

```bash
pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate
```

Start command: `gunicorn config.wsgi --bind 0.0.0.0:$PORT`.

Set these variables:
- `SECRET_KEY` and `DEBUG=False`
- `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS` and `FRONTEND_URL`
- `NUM_PROXIES=1`
- the Brevo SMTP variables (`EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`)
- the Cloudinary variables, so uploaded photos survive redeploys

SQLite needs a persistent disk: point `SQLITE_PATH` at it. See `backend/.env.example`.

**Frontend (Vercel).** Use `frontend/` as the root directory, `npm run build` as the build command and `dist` as the output. Set `VITE_API_URL=https://<your-api-host>/api/v1`.
