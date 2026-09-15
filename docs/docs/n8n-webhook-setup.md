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
   - **Path**: anything stable, e.g. `conchi`
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
URL) — it looks like `https://your-n8n-instance.example.com/webhook/conchi`.

## 4. Configure the app

In the app: **Settings → CONNEXIÓ**.

- **URL del webhook**: the production webhook URL from step 3, used as-is — the
  app doesn't append any path to it.
- **Secret d'autenticació**: the raw token from step 2, *without* the `Bearer `
  prefix — the app adds that prefix itself on every request.

Tap **Acceptar**. This sends an empty POST to the URL and expects any `2xx`
response — your workflow doesn't need to inspect the request body to pass this
check, just respond successfully. On success the secret is written to the
device's secure storage (`expo-secure-store`) and the URL to local storage
(MMKV); on failure the screen shows whether the problem was the URL format, the
network, or an HTTP error from n8n (e.g. a token mismatch shows up as an HTTP
error here).

## Rotating the token

1. Generate a new token (step 2).
2. Update the Header Auth credential's **Value** in n8n to `Bearer <new token>`.
3. In the app, Settings → CONNEXIÓ → paste the new raw token → **Acceptar**.

Until step 3 completes, the app will fail with an HTTP error on every request —
there's no grace period where both old and new tokens work.

## Note on the payload shape (today)

Right now (Story 1.6, the tracer bullet) the app posts the text you type as a
JSON-encoded string body (e.g. `"hola"`, quotes included) — not the
`{ type, payload }` envelope described in the architecture spine (AD-17
conventions table). That structured envelope, and the real endpoints it routes
to, land with later stories (Epic 2 onward). Keep the workflow above trivial
(auth check → static response) until then; there's nothing meaningful to parse
out of the body yet.
