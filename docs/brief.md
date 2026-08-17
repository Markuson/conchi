
---

## Conchita — Technical Briefing for React Native App Development

### What Conchita is

Conchita is a personal AI accounting agent built on n8n (self-hosted), currently operated exclusively through a Telegram bot. It processes personal and professional expenses and invoices automatically.

---

### Infrastructure

- **n8n** self-hosted on a Proxmox LXC container (`192.168.1.52`), exposed publicly at `https://n8n.marcuson.dev` via Cloudflare Tunnel
- **PostgreSQL 15** on a second LXC (`192.168.1.53`), database `contable`
- **Google Drive** for file storage (receipts and invoices as images/PDFs)
- **Google Sheets** as a visual dashboard (tabs: `Personal`, `Feina/Work`)
- **LLM:** Gemini 2.5 Flash Lite (via direct Google API) for data extraction and classification
- **Paperless-ngx** installed via Docker Compose on the DB container — pending integration

---

### Current Input Channels

**1. Telegram — plain text**
User sends a short message like `"12€ coffee"` or `"47€ Mercadona"`. Conchita infers category, amount, date and stores it in PostgreSQL + Sheets.

**2. Telegram — photo (receipt)**
User sends a photo. Conchita detects if it's a receipt (confidence ≥ 0.7), extracts data via Gemini vision, uploads the image to Google Drive `/Tickets` folder, stores in PostgreSQL + Sheets, and replies with a confirmation + Drive link.

**3. Telegram — PDF document**
User sends a PDF invoice directly via Telegram. Conchita extracts data, uploads to Drive `/Factures` folder, stores in PostgreSQL + Sheets.

**4. Gmail — automatic PDF invoice detection**
n8n polls Gmail periodically. If an email from a known sender (stored in `remitents_factura` table) has a PDF attachment, Conchita extracts data automatically and stores it. If the sender is unknown, it sends a Telegram notification asking whether to save the sender or discard.

---

### Telegram Bot Commands

| Command | Action |
|---------|--------|
| `/afegir-remitent` | Save a new known sender to DB |
| `/eliminar-remitent` | Remove a sender |
| `/remitents` | List all known senders |
| `/eliminar-factura <drive_id> <db_id>` | Delete invoice from Drive + PostgreSQL + Sheets |
| `/ajuda` | Help message |

---

### PostgreSQL Schema (`contable` DB)

**`transaccions`**
```
id, data, import, descripcio, remitent, categoria_id,
ambit (personal/feina), origen (telegram/gmail),
tipus (despesa/ingrés), base_imposable, quota_iva,
creat_a, drive_url
```

**`categories`** — 14 entries
```
id, nom, ambit
```
Examples: Alimentació, Menjar fora, Transport, Habitatge, Llum, Aigua, Gas, Salut, Oci, Roba, Altres

**`remitents_factura`**
```
email, nom, categoria, actiu
```

---

### What the React Native App Should Do

Replace (or complement) the Telegram interface with a proper mobile UI. The app should interact with Conchita by calling n8n webhook endpoints. The main capabilities needed:

- **Log an expense** — text input or voice → sends to n8n webhook → same flow as Telegram text
- **Send a receipt photo** → sends image to n8n webhook → same flow as Telegram photo
- **Send a PDF invoice** → same flow as Telegram PDF
- **View transaction history** — read from PostgreSQL (via n8n webhook or direct API) or Google Sheets
- **Dashboard** — monthly summary, category breakdown, budget usage
- **Manage known senders** — list, add, delete
- **Delete an invoice** — triggers `/eliminar-factura` equivalent

---

### Integration Approach

n8n supports **webhooks** natively. The recommended approach is:

1. Create dedicated webhook triggers in n8n for each app action (replacing the Telegram Trigger for those flows)
2. The app sends `multipart/form-data` or JSON POST requests to these webhooks
3. n8n processes and responds with JSON confirmation
4. For read operations (history, dashboard), either expose a webhook that queries PostgreSQL and returns JSON, or connect directly to the Sheets API

The existing Telegram bot continues to work in parallel — the app is an additional interface, not a replacement.

---

### Key Technical Constraints to Keep in Mind

- n8n binary storage (`filesystem-v2`): binary data (images, PDFs) must be handled carefully — `getBinaryDataBuffer()` only works on the direct input item of the current node
- Gemini 2.5 Flash Lite is used for both text classification and vision (receipt photos)
- All monetary amounts stored in EUR
- Dates stored as ISO format `YYYY-MM-DD`
- `origen` field distinguishes source: `telegram`, `gmail`, or the new `app` value you'll add
- Confidence threshold for receipt detection: `0.7`
- Google Drive folder IDs: Tickets `1mF6s9ZQkwloFezGsZmSUbcb8B99MJyxf`, Factures `1i_AE8oowbgtgOYq4izMs1rZj8qt6vETk`

---

*This briefing covers the current state as of early May 2026. The Telegram bot is fully operational. The React Native app will be a new interface layer on top of the existing n8n infrastructure.*