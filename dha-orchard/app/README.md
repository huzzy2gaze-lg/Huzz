# Orchard Sales System (Phases 1 and 2)

A web app for the DHA Margalla Orchard sales team. It works on a phone, a tablet, a laptop and a TV.
Later, the same code becomes the Android APK.

- **Live map**: the official FGEHA layout plan, with our stock coloured on it. Search by block and plot number.
  The plot positions and numbers come only from the plan.
- **People and permissions**: admins and sales agents. The admins add each person by their Gmail address
  and turn on or off each permission (change prices, add plots, add dealer listings, mark sold, and others).
- **Privacy**: an agent sees only their own clients, deals and requests. The server enforces this, not the screen.
- **Approvals**: an agent asks for a pre-booking or marks a plot sold. The map shows "Sold, waiting for approval"
  at once. Any one admin approves or does not approve.
- **Stock types**: our plots and dealer listings (a client's plot that we help to sell). A sold plot can become
  a dealer listing for its new owner.
- **Notices**: each change shows at the top of the screen for everyone who may see it. Admins can turn on
  browser alerts for new requests.
- **Change log**: every change is recorded with the person and the time (admins only).
- **Deal file**: the 8 stages of a deal (interested, pre-booked, token, NDC submitted, NDC approved, transfer date,
  transfer done, allotment letter). Each stage keeps its details (dates, amounts, authority, receipt number).
- **Documents**: photos and PDFs. A plot with no client takes its LP letter (land provider letter). Each deal stage
  takes only its own documents, and only when the deal is at that stage or past it (agreement, token payment proof, CNIC, NDC, pay order, authority
  receipt, allotment letter). Photos are made smaller before upload.
  Only the agent of the deal and the admins can open them.
- **Protected documents**: photos and PDFs open only inside the app, drawn with the viewer's name and the time
  across them. Agents cannot download: they ask, an admin approves one download. The app hides a document when
  it is not in front, when the screenshot key is pressed (the admins are told) and when someone prints.
  A web page cannot fully block screenshots; the Android app (phase 3) blocks them.
- **Calendar**: Day and Week views with an hour grid (tap an empty hour to add an entry with a start and an end
  time), a Month view and a List view. It shows all deal dates (token agreement, transfer time limit, NDC,
  transfer, allotment letter) and own entries.

Phase 3 (next): APK, phone notifications when the app is closed, WhatsApp alerts, reports.

## Folders

| Folder | What it holds |
| --- | --- |
| `supabase/migrations/` | The database: tables, access rules (row level security) and server functions. |
| `supabase/seed/initial_data.sql` | Our current stock from the first sales map (20 plots in Block A, and the size corrections). |
| `supabase/tests/` | Tests for the access rules. They run on a local Postgres. |
| `web/` | The web app (Vite, plain JavaScript). |
| `web/src/api/` | The data services: `supabase.js` (real server), `demo.js` (database in the browser), `artifact.js` (claude.ai test page). |

## Try it without a server (demo mode)

The demo runs the same database inside the browser (PGlite). The data stays in that browser only.

```bash
cd dha-orchard/app/web
npm install
npm run dev
```

Open the address that Vite shows. With no server settings, the app starts in demo mode. Choose a person
(admin or agent) to see what each one can do. Add `?demo&fresh` to the address to start again with clean data.

## Run the database tests

```bash
dha-orchard/app/supabase/tests/run.sh
```

The script makes a fresh database `orchard_test` on the local Postgres, applies the migration and the seed,
and runs 106 checks: agent privacy, permissions, approvals, closed accounts, deal stages, documents, download requests and calendar.

## The claude.ai test page

`npm run build:artifact` (in `web/`) makes `web/dist-artifact/orchard-sales.html`, with `plan.webp` and
`plotdata.json` beside it. It is published as the team's test page on claude.ai. There, the page's shared database
stands in for the server:

- The Owner and every **Editor** of the page are admins. Every **Contributor** is a sales agent. Viewers see nothing.
- The page's access rules keep `agents/<id>/` (clients, deals, requests, documents, calendar) readable only by that
  agent and the admins. The permission switches and the sale rules are checked by the page in this test version;
  on the real server the database checks all of them.
- Files are kept in the database in pieces, so a file on the test page is limited to 2.5 MB.

## Set up the real system

### 1. Supabase (database, login, live updates)

1. Create an account at supabase.com in the company name. Create a project.
   Choose the region **Mumbai (ap-south-1)** or **Singapore (ap-southeast-1)**. Choose the **Pro** plan for real use
   (daily backups; a free project stops after about one week with no use).
2. In **SQL Editor**, run the files in `supabase/migrations/` in order of their names. Then run `supabase/seed/initial_data.sql`.
   The second migration also makes the private storage bucket `documents` for photos and PDFs.
3. In **SQL Editor**, add the first admin (use your own Gmail address and name):

   ```sql
   insert into public.members (email, full_name, role) values ('your.name@gmail.com', 'Your Name', 'admin');
   ```

   After this, add all other people from the **Team** page of the app.
4. In **Project Settings → API**, copy the **Project URL** and the **anon public key**. The anon key is safe in the
   web app: the access rules on the server protect the data.

### 2. Google login

1. In Google Cloud Console, create an OAuth client of the type **Web application**.
   Add the redirect address that Supabase shows in **Authentication → Providers → Google** (it ends in `/auth/v1/callback`).
2. In Supabase **Authentication → Providers → Google**, turn it on and paste the client ID and secret.
3. In Supabase **Authentication → URL Configuration**, set the **Site URL** to the app address
   (for example `https://sales.example.com`) and add it to **Redirect URLs**.

Anyone can sign in with Google, but only the e-mail addresses on the Team page can see or change anything.

### 3. Hosting (Cloudflare Pages)

1. Connect this GitHub repository to Cloudflare Pages.
2. Build settings: root directory `dha-orchard/app/web`, build command `npm ci && npm run build`, output folder `dist`.
3. Environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (from step 1.4).
4. Connect the company domain name when it is ready.

For a local build against the real server, copy `web/.env.example` to `web/.env.local` and fill in the two values.

## How the security works

- All tables have row level security. A person can read data only when their e-mail is an **active** member.
- Nobody writes to the tables directly. Every change goes through a server function (for example `request_sale`,
  `decide_request`, `set_price`). Each function checks the role and the permission switches.
- `clients`, `deals`, `requests` and `listing_owners` are readable only by the agent who owns the row and by admins.
- The public change feed (`activity`) has no client names or sale prices. Private entries go only to the agent and the admins.
- `audit_log` records the old and new values of every change. Only admins can read it. Nobody can change it from the app.
