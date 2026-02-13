# plink

Shareable payment links for the Cosmos ecosystem.

plink lets anyone create a payment request as a short URL. The sender opens the link, connects their Keplr wallet, reviews the details, and broadcasts a `bank/MsgSend` transaction on-chain. Payment links are stored in a Turso (LibSQL) database, and the backend verifies transactions on-chain before marking them as paid — preventing double payments and providing real-time status tracking.

## Supported Chains

| Chain      | Token | Denom   | CAIP-2 ID            |
| ---------- | ----- | ------- | -------------------- |
| Cosmos Hub | ATOM  | `uatom` | `cosmos:cosmoshub-4` |
| Osmosis    | OSMO  | `uosmo` | `cosmos:osmosis-1`   |
| Celestia   | TIA   | `utia`  | `cosmos:celestia`    |
| Noble      | USDC  | `uusdc` | `cosmos:noble-1`     |

## How It Works

### Creating a Link

1. Pick a currency from the supported chains
2. Enter the recipient address, amount, and optional memo/label
3. Optionally set an expiration time
4. Click generate — plink stores the payment intent in the database and returns a short URL (`/pay/{id}`) with a shareable link + QR code

### Paying a Link

1. Open a plink URL (e.g. `https://example.com/pay/abc123def456`)
2. The app fetches the payment intent from the backend and validates it
3. Connect your Keplr wallet
4. Review the payment details (recipient, amount, fees, memo)
5. Confirm — the app broadcasts the transaction, submits the tx hash to the backend for on-chain verification, and polls for confirmation
6. Once verified, the link is marked as paid with the tx hash and block explorer link

### Payment Verification Flow

```
Client broadcasts tx → POST /api/links/{id}/pay (txHash, payerAddress)
                          ↓
                    Atomic claim (prevents double-pay)
                          ↓
                    RPC: fetch tx → decode → verify MsgSend fields
                          ↓
                    Mark paid  ←or→  Reset claim (allow retry)
                          ↓
Client polls GET /api/links/{id}/status every 4s until terminal state
```

## API Endpoints

| Endpoint                   | Method | Description                                     |
| -------------------------- | ------ | ----------------------------------------------- |
| `/api/links`               | POST   | Create a payment link (returns short ID and URL) |
| `/api/links/[id]`          | GET    | Fetch full link details                          |
| `/api/links/[id]/status`   | GET    | Poll payment status (no-cache)                   |
| `/api/links/[id]/pay`      | POST   | Submit tx hash + payer address for verification  |

## Architecture

### Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Turso** (LibSQL) for payment link persistence — serverless SQLite
- **CosmJS** (Stargate + Proto-signing) for transaction construction, broadcasting, and on-chain verification
- **Keplr Wallet** integration via browser extension API
- **Zod** for request/schema validation
- **nanoid** for short link ID generation
- **Tailwind CSS 4** for styling (dark mode supported)
- **qrcode.react** for QR code generation

### Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Home — payment link creation wizard
│   ├── pay/[id]/page.tsx           # Payment flow — fetch link, connect wallet, send
│   ├── send/page.tsx               # Legacy stateless send flow (URL hash-based)
│   └── api/links/
│       ├── route.ts                # POST — create payment link
│       └── [id]/
│           ├── route.ts            # GET — fetch link details
│           ├── status/route.ts     # GET — poll payment status
│           └── pay/route.ts        # POST — submit tx for verification
├── components/
│   ├── wizard/                     # Multi-step link creation wizard
│   ├── payment-preview.tsx         # Review & confirm payment details
│   ├── keplr-connect-button.tsx    # Wallet connection UI
│   └── qr-code.tsx                 # QR code display
├── hooks/
│   └── use-link-status.ts          # Polls /api/links/[id]/status every 4s
└── lib/
    ├── db.ts                       # Turso client, CRUD operations, atomic claiming
    ├── init-db.ts                  # Database migration (runs once on first request)
    ├── verify.ts                   # On-chain tx verification via RPC
    ├── intent-schema.ts            # Zod schema, allowed currencies, validation
    ├── intent-url.ts               # URL hash encoding/decoding (legacy)
    ├── chains.ts                   # Chain registry (RPC endpoints, chain configs)
    ├── cosmos.ts                   # CosmJS client, fee building, tx broadcasting
    └── validation.ts               # Address and amount validation utilities
```

### Key Decisions

- **Database-backed links**: Payment intents are stored in Turso with a short nanoid. This enables status tracking, expiration enforcement, and double-payment prevention.
- **Atomic claiming**: A SQL `UPDATE...WHERE tx_hash IS NULL` ensures only one payment attempt can claim a link at a time. Failed verifications reset the claim for retry.
- **On-chain verification**: The backend fetches the transaction via RPC, decodes the proto body, and validates the `MsgSend` recipient, sender, denom, and amount — never trusts the client's word.
- **Polling-based status**: The client polls `/api/links/[id]/status` every 4 seconds until a terminal state (`paid` or `expired`). No WebSocket complexity.
- **Lazy expiry**: Expiration is checked when a link is loaded, not via a cron job. Expired links are updated in-place on read.
- **Smallest-unit amounts**: All amounts are base units (e.g. `uatom`) to avoid floating-point precision issues.
- **Security headers**: HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, strict Referrer-Policy.
- **No wallet state management**: Keplr handles all key management. The app connects per-session and listens for `keplr_keystorechange` events.

## Getting Started

### Prerequisites

- **Node.js** 18+
- **pnpm** (package manager)
- **Keplr** browser extension installed
- **Turso** account — [sign up at turso.tech](https://turso.tech) and create a database

### Environment Variables

Create a `.env.local` file in the project root:

```bash
TURSO_DATABASE_URL=libsql://your-database-your-org.turso.io
TURSO_AUTH_TOKEN=your-auth-token
```

You can get these values from the Turso CLI or dashboard after creating a database.

### Install & Run

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

The app runs at `http://localhost:3000`. The database schema is created automatically on the first request.

## Limitations

- **Same-chain only** — no IBC or cross-chain transfers
- **4 hardcoded currencies** — adding chains requires code changes and redeployment
- **Client-side expiry only** — expiration is checked on load, not enforced via cron
- **Keplr-only** — no support for other wallets (Leap, Cosmostation, etc.)
- **Hardcoded RPC endpoints** — public endpoints may be rate-limited; no custom endpoint configuration
- **No rate limiting** — API endpoints have no request throttling
- **No link creator authentication** — anyone can create links; there's no account system
- **Polling, not push** — status updates rely on 4-second client polling, not WebSockets

## Roadmap

### SDK (`@plink/core`)

The `lib/` layer is cleanly separated from the UI and could be extracted into a standalone package for developers who want to generate or parse plink-compatible URLs and interact with the payment link API from their own apps.

A potential `@plink/core` would expose:

- **`createPaymentLink()`** / **`getPaymentLink()`** — API client for link CRUD
- **`PaymentIntentSchema`** — Zod schema for validation
- **`CHAIN_REGISTRY`** — chain configs with RPC endpoints
- **`connectClient()`** / **`sendPayment()`** — CosmJS helpers for wallet connection and tx broadcasting

**Prerequisites before this makes sense**: configurable chain registry (not hardcoded), multi-wallet support, and actual demand from integrators.

### Real-Time Payment Notifications

The current polling-based status system works for basic use cases. A WebSocket upgrade would enable instant merchant notifications:

1. Merchant generates a payment link
2. Merchant's backend subscribes to a WebSocket channel for that link
3. Customer opens the link and pays
4. Backend detects the verified payment and pushes a notification
5. Merchant backend triggers fulfillment (ship order, grant access, send receipt, etc.)

This would replace the 4-second polling interval with sub-second push notifications.
