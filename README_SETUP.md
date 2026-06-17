# Tournament Results Portal

Supabase project URL:

`https://mueolsjzwitvlgxwtfbi.supabase.co`

## Included links

Rulebook:

`https://docs.google.com/document/d/1hpJPhy6sgMaQy_zUnnN32-BB2NjgAT9Soz7_4RZXt78`

Google Form:

`https://docs.google.com/forms/d/e/1FAIpQLScfhYYJk2NckttjyZHfSH4GRCMiBYT2jp4dw2z7VKuWB9KBWw/viewform?edit2=2_ABaOnueI47O1nQ0i9v7gQXXCgyARsdqv-CCfXSEtanddJZlCVbEIHBXNwN6SxzMlBQ`

## Setup

1. In Supabase, open SQL Editor.
2. Run `supabase_schema.sql`.
3. Go to Project Settings → API and copy the public anon key.
4. Paste it into `assets/js/config.js`.
5. Enable email magic link login in Supabase Auth.
6. Add your deployed site URL to Supabase Auth redirect URLs.
7. Upload this folder to GitHub Pages or any static host.

## First admin

After your admin email logs in once, run:

```sql
update public.profiles
set role = 'admin'
where lower(email) = lower('YOUR_ADMIN_EMAIL');
```

## Google Form sync

Use `google_forms/SyncGoogleFormToSupabase.gs`.

Script Properties:

```text
SUPABASE_URL=https://mueolsjzwitvlgxwtfbi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TOURNAMENT_SLUG=main-event
RESPONSE_SHEET_NAME=Form responses 1
FORM_ID=your-google-form-editor-id
REGISTRATION_FORM_URL=https://docs.google.com/forms/d/e/1FAIpQLScfhYYJk2NckttjyZHfSH4GRCMiBYT2jp4dw2z7VKuWB9KBWw/viewform?edit2=2_ABaOnueI47O1nQ0i9v7gQXXCgyARsdqv-CCfXSEtanddJZlCVbEIHBXNwN6SxzMlBQ
```

Run:

```text
populateEditResponseUrls()
syncAllRegistrationResponses()
```

## Access rule

A user can enter the dashboard only if their Supabase Auth email exists in:

`public.registered_access.email`

with status:

`registered`, `approved`, or `active`.

## Pages

- `index.html` - login page
- `dashboard.html` - registered user results/rulebook/announcements
- `admin.html` - admin console for announcements and results
