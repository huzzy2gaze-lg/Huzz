# Orchard Sales System (Phase 1)

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

Phase 2 (next): the 8 deal stages after the token, documents, reminders. Phase 3: APK, WhatsApp alerts, reports.

## Folders

| Folder | What it holds |
| --- | --- |
| `supabase/migrations/` | The database: tables, access rules (row level security) and server functions. |
| `supabase/seed/initial_data.sql` | Our current stock from the first sales map (20 plots in Block A, and the size corrections). |
| `supabase/tests/` | Tests for the access rules. They run on a local Postgres. |
| `web/` | The web app (Vite, plain JavaScript). |

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
and runs 68 checks: agent privacy, permissions, approvals, and closed accounts.

## Set up the real system

### 1. Supabase (database, login, live updates)

1. Create an account at supabase.com in the company name. Create a project.
   Choose the region **Mumbai (ap-south-1)** or **Singapore (ap-southeast-1)**. Choose the **Pro** plan for real use
   (daily backups; a free project stops after about one week with no use).
2. In **SQL Editor**, run the file `supabase/migrations/20261106000000_init.sql`. Then run `supabase/seed/initial_data.sql`.
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
