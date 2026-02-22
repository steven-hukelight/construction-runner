# Connect Supabase

## 1. Get your project credentials

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project (or create one)
3. **Settings → API**:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`
4. **Settings → General** → copy **Reference ID** (for linking)

## 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your real values.

## 3. Link the project (for migrations)

From the **parent** project directory (where `supabase/config.toml` lives):

```bash
cd /Users/steven_hukelight/supabase-project
supabase link --project-ref YOUR_PROJECT_REF
```

Replace `YOUR_PROJECT_REF` with the Reference ID from step 1.

## 4. Apply migrations

If using the parent Supabase CLI:

```bash
supabase db push
```

**Or** run the SQL manually in **Supabase Dashboard → SQL Editor**:

- Paste the contents of `supabase/migrations/20250217000000_add_modules_tables.sql`
- Click **Run**

## 5. Verify

Start the app:

```bash
cd sitehub-admin
npm run dev
```

If env vars are set correctly, the app should connect to Supabase.
