# Self-Hosting — MinIO

Standalone MinIO instance for Conchi's app-uploaded photos and PDFs. n8n and
PostgreSQL are already running on the VPS (deployed separately) — this folder
only adds the missing piece: an S3-compatible object store, plus the bucket
policy and wiring instructions to connect n8n's existing S3 node to it.

Google Drive stays the separate, unmodified pipeline that files invoices found
via the Gmail-watching workflow — MinIO is not involved in that flow.

This compose file is standalone and doesn't reference n8n or PostgreSQL in any
way, but MinIO should be brought up **on the same host** as your existing n8n
instance, so the S3 node can reach it over the local Docker network / a
private address instead of the public internet.

## Setup

1. Copy the env template and fill in real values:

   ```bash
   cp .env.example .env
   ```

   Edit `.env`: set `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` to strong,
   unique credentials (not the placeholders), and pick a bucket name in
   `MINIO_BUCKET`. Leave `MINIO_PORT` / `MINIO_CONSOLE_PORT` unless they
   conflict with something else already running on the host.

2. Start MinIO:

   ```bash
   docker compose up -d
   ```

3. Confirm it's healthy:

   ```bash
   docker compose ps
   docker compose logs minio
   ```

   `docker compose ps` should show the `minio` service as `healthy`. If it
   stays `starting` or flips to `unhealthy`, see [Troubleshooting](#troubleshooting).

   **Network exposure:** by default Docker publishes `MINIO_PORT` and
   `MINIO_CONSOLE_PORT` on all host interfaces (`0.0.0.0`), not just the
   private network. On a public VPS this exposes both the S3 API and the
   root-credentialed web console to the public internet unless the host is
   firewalled. Firewall the host (e.g. `ufw`/`iptables`, allowing only
   trusted IPs / the n8n host) or bind the ports to a private/loopback
   address in `docker-compose.yml` (e.g. `127.0.0.1:9000:9000`). The console
   in particular is plaintext HTTP carrying root credentials — put it behind
   a TLS-terminating reverse proxy, or restrict it to a private
   network/VPN, if it must be reachable at all.

## Create the bucket and set public-read

Only the single upload bucket should be public-read — never the MinIO root
or console. This can be done with the `mc` CLI or the web console; `mc` is
shown here because it's scriptable and doesn't require opening a port to a
browser.

The recommended policy grants anonymous `GetObject` only — enough for AD-6
(fetching a known object URL without auth) without also allowing anonymous
bucket listing. The simpler `mc anonymous set download` canned policy is
mentioned as an alternative below, but note that it grants listing too.

### Option A — `mc` CLI

`mc` is bundled in the MinIO image, so you can run it inside the running
container without installing anything on the host. First, write the
GetObject-only policy to a local file:

```bash
cat > bucket-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::<MINIO_BUCKET>/*"]
    }
  ]
}
EOF
docker compose cp bucket-policy.json minio:/tmp/bucket-policy.json
docker compose exec minio mc alias set local http://localhost:9000 <MINIO_ROOT_USER> <MINIO_ROOT_PASSWORD>
docker compose exec minio mc mb --ignore-existing local/<MINIO_BUCKET>
docker compose exec minio mc anonymous set-json /tmp/bucket-policy.json local/<MINIO_BUCKET>
```

- `mc alias set` registers this MinIO instance under the local name `local`,
  authenticated with your root credentials from `.env`. This alias is stored
  in the container's own filesystem (not the `minio-data` volume), so it does
  **not** survive a container recreation (image upgrade, `--force-recreate`,
  a host reboot that recreates the container) — re-run `mc alias set` before
  other `mc` commands after any of those.
- `mc mb --ignore-existing` creates the bucket; `--ignore-existing` avoids an
  error if the bucket was already created by a previous run of this guide.
- `mc anonymous set-json` applies the custom policy above, which allows
  anonymous `GET` (download) on objects in the bucket but not `LIST`, `PUT`,
  or admin access. This is the fix for a 403 on an otherwise-correct object
  URL.

**Simpler alternative:** `mc anonymous set download local/<MINIO_BUCKET>`
applies MinIO's built-in "download" canned policy instead of the JSON file
above. It also allows anonymous `GET`, but — unlike the custom policy —
**it additionally allows anonymous bucket listing**: an anonymous
`GET /<bucket>?list-type=2` returns a full XML listing of every object in the
bucket, so anyone who finds the bucket URL can enumerate all uploaded
filenames (receipts/invoices), not just fetch a URL they already know. Only
use this if that tradeoff is acceptable.

### Option B — web console

Open `http://your-minio-host.example.com:<MINIO_CONSOLE_PORT>`, log in with
`MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`, create the bucket, then under the
bucket's **Access Policy** add a custom policy matching the JSON above (or,
for the simpler but more permissive option, set it to **Public**, which maps
to the same `download` anonymous policy — including anonymous listing —
described above).

### Verify public-read

Upload a test object, then fetch its URL with no `Authorization` header:

```bash
curl -i http://your-minio-host.example.com:<MINIO_PORT>/<MINIO_BUCKET>/test-object.txt
```

Expect `HTTP/1.1 200 OK` and the file bytes back. A `403 AccessDenied` means
the bucket policy step above didn't take — re-run the `mc anonymous
set-json` command (or `mc anonymous set download` if using the simpler
alternative).

## Wiring n8n's S3 node to this instance

n8n already has an S3-compatible node in its existing workflows (or add a new
S3 credential) — point it at this MinIO instance:

| Field | Value |
|---|---|
| Endpoint | `http://your-minio-host.example.com:<MINIO_PORT>` (or the Docker-network hostname, e.g. `http://minio:9000`, if n8n runs in the same Compose/Docker network) |
| Region | Any placeholder value, e.g. `us-east-1` — MinIO ignores it but most S3 node UIs require a non-empty region |
| Access Key ID | `MINIO_ROOT_USER` from `.env` (or a dedicated MinIO user with bucket-scoped access, if you've set one up) |
| Secret Access Key | `MINIO_ROOT_PASSWORD` from `.env` |
| Force Path Style | **Enabled** — see below |
| Bucket | `MINIO_BUCKET` from `.env` |

**Force path style** is the most common connection mistake: AWS S3 addresses
buckets as a subdomain (`bucket.s3.amazonaws.com`), but MinIO by default
expects path-style addressing (`s3.host.com/bucket`). If the S3 node's "force
path style" (sometimes labeled "s3ForcePathStyle" or "Path Style") option is
left off against MinIO, requests fail to resolve the bucket. Turn it on.

After saving the credential, run n8n's S3 node once against a test file to
confirm the upload succeeds.

## Troubleshooting

**Container won't go healthy**
```bash
docker compose ps
docker compose logs minio
```
Check for a port conflict (something else already bound to `MINIO_PORT` /
`MINIO_CONSOLE_PORT` on the host) or a missing/invalid `.env` value — MinIO
refuses to start if `MINIO_ROOT_PASSWORD` is shorter than 8 characters or if
`MINIO_ROOT_USER` is shorter than 3 characters.

**Changed `.env` credentials didn't take effect**
Editing `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` in `.env` after the
container's first start does **not** rotate already-initialized credentials
— MinIO persists the original root credentials in the `minio-data` volume
and ignores the new environment values on restart. To actually rotate
credentials, either run `mc admin user` commands against the running
instance, or recreate the volume (which deletes all uploaded files — see
[Notes](#notes)).

**n8n S3 node can't connect**
- Wrong endpoint — double-check host and port, and whether n8n should use the
  Docker-network hostname (`http://minio:9000`) instead of a public URL, if
  n8n and MinIO share a Docker network.
- Path-style vs virtual-host addressing — see "Force Path Style" above.
- Unreachable network — confirm n8n's container/host can actually reach
  MinIO's host and port (`curl` the endpoint from where n8n runs); if MinIO
  is firewalled to only accept local/VPN traffic, n8n needs to be on that
  same network.

**Anonymous fetch returns 403**
- The bucket-level public-read policy wasn't set (or was reset) — re-run
  the `mc anonymous set-json bucket-policy.json local/<MINIO_BUCKET>`
  command from [Option A](#option-a--mc-cli) above (or `mc anonymous set
  download local/<MINIO_BUCKET>` if using the simpler alternative).
- Confirm you're fetching an object *inside* the public bucket, not the
  MinIO root or console.
- If you recreated the `minio` container since last running `mc alias set`
  (image upgrade, `--force-recreate`, host reboot), the `local` alias is
  gone — re-run `mc alias set` before retrying the `mc anonymous` command.

## Notes

- `.env` is gitignored — never commit real credentials or hostnames. Every
  value in this README and in `.env.example` is a placeholder
  (`your-minio-host.example.com`, etc.) — substitute your own when you set
  this up.
- This compose file defines MinIO only. It does not start, configure, or
  depend on n8n or PostgreSQL — those are deployed and managed separately,
  wherever your existing instances already run.
- Wiring the app's Settings screen to a webhook URL is a separate, later
  story — this folder is infrastructure only, not app configuration.
- `docker compose down -v` destroys the `minio-data` volume — this deletes
  **all uploaded files**, not just the containers. It's easy to reach for
  `-v` out of habit when doing routine cleanup; leave it off unless you
  specifically intend to wipe stored data. Plain `docker compose down` (no
  `-v`) stops and removes the containers while keeping the volume intact.
