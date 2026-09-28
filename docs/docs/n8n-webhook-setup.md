---
sidebar_position: 2
---

# Connecting the app to n8n

Conchi talks to Conchita's brain over a single n8n webhook, authenticated with a
bearer token (AD-5). This guide covers creating that webhook and token on your
own n8n instance and wiring them into the app's Settings screen. It assumes n8n
and PostgreSQL are already running on your VPS (AD-17) — this guide doesn't
install n8n itself.

All URLs and tokens below are placeholders. Never commit a real VPS hostname or
token to this repo or any doc (AD-5).

## 1. Create the workflow

1. In n8n, create a new workflow (e.g. `Conchi — App Gateway`).
2. Add a **Webhook** node as the trigger:
   - **HTTP Method**: `POST`
   - **Path**: `send-expense` — the app hardcodes this exact suffix (`SEND_EXPENSE_PATH`,
     `src/lib/constants.ts`) when it posts tracer-bullet text and pings the
     connection from Settings, so the workflow must live at this path.
   - **Authentication**: `Header Auth`
   - **Respond**: `Immediately` (simplest for now — see [Note on the payload shape](#note-on-the-payload-shape-today) below)
3. Give the Webhook node a **Response Data** of type `Text` with something like
   `Rebut, Conchita ha llegit el missatge.` so the tracer bullet has a visible
   response to show in the app.

## 2. Generate a token and create the Header Auth credential

The "auth secret" is just a long random string — n8n never sees or generates it
for you, you provide it.

Generate one:

```bash
openssl rand -hex 32
```

Then, on the Webhook node's **Authentication** field, create a new **Header
Auth** credential:

- **Name**: `Authorization`
- **Value**: `Bearer <the token you just generated>`

Save the credential. n8n will now reject any request whose `Authorization`
header doesn't match this exact value.

Keep the raw token (without `Bearer `) somewhere safe (password manager) — you
paste it into the app in step 4.

## 3. Activate the workflow

Save and toggle the workflow **Active**. This matters: an inactive workflow only
responds on the **Test URL** (and only while the editor is open and "listening"),
never on the **Production URL** the app needs.

Once active, copy the **Production** webhook URL from the node (not the Test
URL) — it looks like `https://your-n8n-instance.example.com/webhook/send-expense`.

## 4. Configure the app

In the app: **Settings → CONNEXIÓ**.

- **URL del webhook**: the **base** URL only — everything up to and including
  `/webhook` (e.g. `https://your-n8n-instance.example.com/webhook`), **without**
  the `/send-expense` suffix from step 3. The app is what appends
  endpoint-specific paths onto this base (`/send-expense` for this workflow and
  the connection check, `/register-token` for FCM device-token registration —
  `joinWebhookUrl`, `src/lib/api/n8nClient.ts`); pointing this field at one
  workflow's full path instead of the shared base makes every other endpoint
  404.
- **Secret d'autenticació**: the raw token from step 2, *without* the `Bearer `
  prefix — the app adds that prefix itself on every request.

Tap **Acceptar**. This sends an empty POST to `{URL del webhook}/send-expense`
and expects any `2xx` response — your workflow doesn't need to inspect the
request body to pass this check, just respond successfully. On success the
secret is written to the device's secure storage (`expo-secure-store`) and the
base URL to local storage (MMKV); on failure the screen shows whether the
problem was the URL format, the network, or an HTTP error from n8n (e.g. a
token mismatch, or a missing `/send-expense` workflow, shows up as an HTTP
error here).

## Rotating the token

1. Generate a new token (step 2).
2. Update the Header Auth credential's **Value** in n8n to `Bearer <new token>`.
3. In the app, Settings → CONNEXIÓ → paste the new raw token → **Acceptar**.

Until step 3 completes, the app will fail with an HTTP error on every request —
there's no grace period where both old and new tokens work.

## Categories & subcategories endpoint (Story 2.2, assumed contract)

The app also fetches the categories/subcategories/contexts list it needs for
the entry picker (Story 2.3) from a second workflow, at startup:

- **Path**: `get-categories` — joined onto the same webhook base as every
  other endpoint (`CATEGORIES_PATH`, `src/lib/constants.ts`), e.g.
  `https://your-n8n-instance.example.com/webhook/get-categories`.
- **HTTP Method**: `POST` (matches every other endpoint in this doc).
- **Authentication**: `Header Auth`, same credential as step 2 above.
- **Expected response body** (JSON):

  ```json
  {
    "categories": [
      { "name": "PLACEHOLDER_CATEGORY", "subcategories": ["PLACEHOLDER_SUBCATEGORY"] }
    ],
    "contexts": ["PLACEHOLDER_CONTEXT"]
  }
  ```

  This is exactly the shape `useReferenceDataStore` holds internally — the
  app applies no translation layer, so the workflow's response must match
  field-for-field.

**This contract is an assumption, not a verified spec** — no real n8n
categories workflow exists yet to confirm it against (flagged unresolved in
the architecture's adversarial review). A fetch failure here degrades
gracefully (the app keeps whatever it last cached, or empty lists on first
launch) and retries once automatically, so wiring this workflow up
incorrectly won't crash the app — but the app's category/subcategory picker
(Story 2.3) has nothing to show until a real workflow matching this shape is
activated at this path.

## Note on the payload shape (today)

Right now (Story 1.6, the tracer bullet) the app posts the text you type as a
JSON-encoded string body (e.g. `"hola"`, quotes included) — not the
`{ type, payload }` envelope described in the architecture spine (AD-17
conventions table). That structured envelope, and the real endpoints it routes
to, land with later stories (Epic 2 onward). Keep the workflow above trivial
(auth check → static response) until then; there's nothing meaningful to parse
out of the body yet.
