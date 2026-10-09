# Together — Nautara Abiunnessa Alumni

The verified alumni network of Nautara Abiunnessa B.L. High School. Alumni sign up, confirm their email, describe their batch, and appear in a public directory once the alumni committee verifies them. The product spec is in `documentatjion.json`.

| Folder | Stack |
|---|---|
| `backend/` | Laravel 13 (PHP 8.3+). JSON API under `/api/v1/` that also serves the built React app. MySQL/MariaDB in production, SQLite locally. No extra Composer packages. |
| `frontend/` | React 19, TypeScript, Vite, Redux Toolkit, React Router, Tailwind CSS v4. `npm run build` writes into `backend/public/app/`. |
| `scripts/package-cpanel.sh` | Builds an upload-ready zip for cPanel shared hosting. |

Everything runs on a single domain on ordinary shared hosting: there's no Node.js on the server, no queue worker, no cron job and no symlinks.

## Features

- **Accounts:** register with email and phone, verify by emailed 6-digit code, sign in by email *or* phone, forgot/reset password, change password, sign out.
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

Requirements: PHP 8.3+ (with `pdo_sqlite`, `gd`, `mbstring`, `fileinfo`), Composer, and Node 20+.

```bash
# API on :8000
cd backend
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
php artisan together:seed-demo   # optional: fictional alumni + demo logins (printed)
php artisan serve

# Web app on :5173 (proxies /api and /uploads to :8000)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

- **Emails in development:** verification and reset codes go to `backend/storage/logs/mail.log`, not a real inbox.
- **Committee access:** `php artisan together:committee you@example.com` gives an account committee access, creating it if needed. Add `--demote` to take it away.

## Tests

```bash
cd backend && php artisan test          # 43 API tests: features, permissions, uploads, OTP, tokens, throttling
cd frontend && npm run lint && npm run build
```

## Deploying to cPanel

1. **Build the package** on your computer: run `./scripts/package-cpanel.sh`. It writes `dist/together-cpanel-<date>.zip`, which contains the built frontend and the production `vendor/`, and no `.env`, database or uploads.
2. **In cPanel:**
   - **Select PHP Version / MultiPHP Manager:** PHP 8.3 or newer with the `pdo_mysql`, `gd`, `mbstring`, `fileinfo` and `exif` extensions.
   - **MySQL Databases:** create a database and a user, and give the user *All privileges* on it.
   - **File Manager:** upload the zip to your home folder (not `public_html`) and extract it. You get `~/together/`.
3. **Point the website at `together/public`.** Pick one:
   - **Subdomain or addon domain (simplest):** set its document root to `together/public`.
   - **Main domain (`public_html`):** move everything inside `together/public/` (including `.htaccess`) into `public_html/`. Then edit `public_html/index.php` and change the paths `/../storage/`, `/../vendor/` and `/../bootstrap/` to `/../together/storage/`, `/../together/vendor/` and `/../together/bootstrap/`.
4. **Configure.** Copy `together/.env.example` to `together/.env` and set:
   - `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://your-domain` and `FRONTEND_URL=https://your-domain`
   - `DB_CONNECTION=mysql` and the `DB_*` values from step 2
   - `MAIL_MAILER=smtp` and the `MAIL_*` values. A cPanel email account works (host `mail.your-domain`, port 465, scheme `smtps`), or Brevo SMTP.
   - `COMMITTEE_EMAILS=chair@example.org`: these accounts become committee members when they verify their email, so you don't need a terminal to create the first admin.
5. **Finish in cPanel → Terminal** (or over SSH):
   ```bash
   cd ~/together
   php artisan key:generate --force
   php artisan migrate --force
   php artisan optimize
   ```
   With no terminal at all, run `php artisan key:generate --show` on your computer and paste the result into `APP_KEY`. Then ask your host to run the `migrate` command once.
6. Turn on **SSL/TLS** (AutoSSL) for the domain, then open the site and register with a `COMMITTEE_EMAILS` address.

**Updating:** upload and extract a new zip over the old folder, keeping your `.env` and `public/uploads/`. Then run `php artisan migrate --force && php artisan optimize`.

**Backups:** back up the MySQL database (cPanel → Backup) and the `public/uploads/` folder.

## API (`/api/v1/`, trailing slashes optional)

| Area | Endpoints |
|---|---|
| Auth | `auth/register`, `auth/verify-otp`, `auth/request-otp`, `auth/login-email`, `auth/login-phone`, `auth/refresh-token`, `auth/logout`, `auth/me`, `auth/password-reset`, `auth/password-reset/confirm`, `auth/change-password` |
| Alumni | `alumni/me` (GET, POST, PUT/PATCH as JSON), `alumni/me/update` (POST, multipart, for photos), `alumni/{id}` |
| Directory | `directory`, `directory/{id}`, `directory/filters`, `directory/stats` |
| Batches | `batches`, `batches/{year}`, `batches/{year}/alumni`, `batches/{year}/coordinators[/{id}]` (writes are committee-only) |
| Coordinator | `coordinator/batch-alumni`, `coordinator/verify-alumni` |
| Committee | `approvals/pending`, `approvals/alumni`, `approvals/stats`, `approvals/{id}/approve`, `approvals/{id}/reject`, `approvals/logs` |

Errors look like `{"field": ["message"]}` for validation and `{"detail": "..."}` otherwise.

## Security notes

- **Sessions:** opaque bearer tokens, stored only as SHA-256 hashes. Access tokens last 30 minutes. Refresh tokens last 7 days and rotate on every use; replaying an old one signs that user out everywhere. Changing or resetting a password revokes all sessions. The API sets no cookies, so there is no CSRF surface.
- **OTP codes:** random, stored hashed, expire after 10 minutes, burned after 5 wrong guesses, separate codes for verify and reset, 60-second resend cooldown. They are never returned by the API.
- **No account enumeration:** code requests always give the same response, and login failures are generic, with equal hashing work whether or not the account exists.
- **Rate limits per IP:** login 10/min, register 5/hour, codes 10/hour, plus general limits. Set `TRUSTED_PROXIES` only if you're behind Cloudflare.
- **Passwords:** minimum 8 characters, not only digits, not a common password and not the email name.
- **Photos:** checked by real content, capped in size and pixels, and **re-encoded to JPEG with GD**. This removes EXIF/GPS data and anything hidden in the file. Stored under random names in `public/uploads/`, where script execution is disabled.
- **Social links:** only `facebook.com` and `linkedin.com` URLs are accepted, normalised to `https`.
- **Headers:** `nosniff`, `DENY` framing, a strict Content-Security-Policy on the app, `no-store` on API responses, and HSTS on HTTPS in production. `.htaccess` blocks dotfiles.
