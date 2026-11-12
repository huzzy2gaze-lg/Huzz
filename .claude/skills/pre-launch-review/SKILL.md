---
name: pre-launch-review
description: Security, legal and launch-readiness review for an app or website Huzaifa vibe-coded, before it goes live. Use when he says "check before launch", "is this safe to ship", "security review", or before deploying a site such as whventures.com.pk.
---

# Pre-launch review

A first-pass check, not a professional audit. Say that once in the report.

Sources: reels #18 (27-point prompt), #17, #19, #37 (security), #15 (legal), #32 (launch basics), #22 (speed).

## How to run

1. Map the app first: list pages, API routes, forms, auth, database, file uploads, payments, third-party scripts, env files. Write the map in 5-10 lines.
2. Go through every check below. For each one, mark PASS, FAIL or N/A, with the file and line for each FAIL.
3. Fix only what the user approves. Never rotate or delete keys yourself; tell him which key to revoke and where.
4. Re-check each fix. Then give the report.

## A. Secrets (most common vibe-coding leak)
- A1 No API key, password or token in frontend code or in a public `NEXT_PUBLIC_` / `VITE_` variable.
- A2 `.env` files are not served by the web server and are in `.gitignore`.
- A3 Scan git history for leaked secrets (`git log -p | grep -iE "key|secret|token|password"`). Any hit: list it as "revoke and replace".
- A4 Build logs and error pages do not print secrets or stack traces. Debug mode is off in production.

## B. Login and access
- B1 Every private page and every API route checks login on the server.
- B2 Admin routes check the admin role on the server, not only by hiding the link.
- B3 Users can only read or change their own records (no IDOR: changing an id in the URL must not show someone else's data).
- B4 Database row-level security is on (Supabase: RLS enabled on every table).
- B5 Passwords are hashed (bcrypt or argon2), never stored as plain text.
- B6 Session cookies are HttpOnly, Secure, SameSite.
- B7 Password-reset and magic links expire and work only once.
- B8 Login and sign-up are rate-limited; repeated failed logins are logged.
- B9 Passwords and tokens never go in a URL query string; login uses POST.
- B10 The login cookie cannot be forged (signed session id, not a plain user id).

## C. Input and data
- C1 Every form is validated on the server, not only in the browser.
- C2 Database queries are parameterized (no string building with user input).
- C3 User content is escaped before it is shown (XSS).
- C4 CSRF protection on forms that change data.
- C5 Prices, totals and discounts are calculated on the server.
- C6 File uploads: allowed types and max size checked on the server; storage buckets are private.
- C7 Webhooks verify their signature.
- C8 API responses return only the fields the page needs.

## D. Transport and headers
- D1 HTTPS forced.
- D2 Security headers: Content-Security-Policy, X-Content-Type-Options, Referrer-Policy, frame protection.
- D3 CORS allows only the site's own domain.
- D4 Public forms have bot protection (CAPTCHA or honeypot).

## E. Packages
- E1 Run `npm audit` (or the stack's equivalent). List high and critical issues.
- E2 Remove packages the app does not use.

## F. Legal and trust (reel #15)
- F1 Privacy policy and terms pages exist and match what the site collects.
- F2 Real business details: company name, city, contact.
- F3 No unsupported claims (no "guaranteed returns", no fake reviews or fake numbers).
- F4 Cookie banner if analytics or ad cookies are used.
- F5 Forms say what the data is used for; marketing emails have an unsubscribe link.
- F6 Fonts and images are licensed.
- F7 Users can ask for their data to be deleted.

## G. Launch basics (reel #32) and speed (reel #22)
- G1 Title and meta description on every page; Open Graph image; favicon.
- G2 robots.txt and sitemap.xml.
- G3 Custom 404 page and a thank-you page after forms.
- G4 Main call to action above the fold; sticky CTA on mobile.
- G5 Alt text on images; mobile layout tested at 390px.
- G6 Analytics installed.
- G7 Static pages served from a CDN; images compressed; API responses gzipped.

## Report format (ASD-STE100: short sentences, simple words)

```
PRE-LAUNCH REVIEW: <app name>
This is a first-pass check. It is not a professional security audit.

MUST FIX BEFORE LAUNCH
- <check id> <one line>. File: <path:line>. Fix: <one line>.

SHOULD FIX SOON
- ...

PASSED: <n> checks. N/A: <n> checks.

KEYS TO REVOKE: <list or "none found">
```
