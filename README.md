# plink

Shareable payment links for the Cosmos ecosystem — no backend required.

plink lets anyone create a payment request as a URL. The sender opens the link, connects their Keplr wallet, reviews the details, and broadcasts a `bank/MsgSend` transaction on-chain. The entire payment intent is encoded in the URL hash, so there's no server to run and nothing to store.

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
4. Click generate — plink encodes the payment intent into a URL hash and provides a shareable link + QR code

### Paying a Link

1. Open a plink URL (e.g. `https://example.com/send#v=1&c=cosmos:cosmoshub-4&d=uatom&to=cosmos1...&a=1000000`)
2. The app decodes and validates the payment intent from the hash
3. Connect your Keplr wallet
4. Review the payment details (recipient, amount, fees, memo)
5. Confirm — the app broadcasts the transaction and shows the tx hash with a block explorer link

### URL Format

Payment intents are encoded as URL hash parameters:

```
/send#v=1&c={caip2}&d={denom}&to={address}&a={amount}&m={memo}&label={label}&exp={timestamp}
```

| Param   | Required | Description                                    |
| ------- | -------- | ---------------------------------------------- |
| `v`     | yes      | Schema version (always `1`)                    |
| `c`     | yes      | CAIP-2 chain ID (e.g. `cosmos:cosmoshub-4`)    |
| `d`     | yes      | Token denom (e.g. `uatom`)                     |
| `to`    | yes      | Recipient bech32 address                       |
| `a`     | yes      | Amount in smallest unit (e.g. `1000000` = 1 ATOM) |
| `m`     | no       | Memo (max 256 chars)                           |
| `label` | no       | Human-readable label (max 100 chars)           |
| `exp`   | no       | Expiration timestamp (ISO 8601)                |

## Architecture

### Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **CosmJS** (Stargate + Proto-signing) for transaction construction and broadcasting
- **Keplr Wallet** integration via browser extension API
- **Zod** for payment intent schema validation
- **Tailwind CSS 4** for styling (dark mode supported)
- **qrcode.react** for QR code generation

### Project Structure

```
src/
├── app/
│   ├── page.tsx              # Home — payment link creation form
│   └── send/page.tsx         # Payment flow — decode link, connect wallet, send
├── components/
│   ├── intent-form.tsx       # Form for creating payment intents
│   ├── payment-preview.tsx   # Review & confirm payment details
│   ├── keplr-connect-button.tsx  # Wallet connection UI
│   └── qr-code.tsx           # QR code display
└── lib/
    ├── intent-schema.ts      # Zod schema, allowed currencies, validation
    ├── intent-url.ts         # URL hash encoding/decoding
    ├── chains.ts             # Chain registry (RPC endpoints, chain configs)
    ├── cosmos.ts             # CosmJS client, fee building, tx broadcasting
    └── validation.ts         # Address and amount validation utilities
```

### Key Decisions

- **Stateless, hash-based URLs**: The entire payment intent lives in the URL fragment. No backend, no database, no API keys. Links are self-contained and work forever (unless expired).
- **Smallest-unit amounts**: All amounts are stored and transmitted as base units (e.g. `uatom`) to avoid floating-point precision issues. Display conversion happens at the UI layer.
- **Multi-layer validation**: URL parsing → Zod schema → bech32 prefix matching → amount sanitization. Invalid links fail fast with clear error messages.
- **Security headers**: HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, strict Referrer-Policy — all configured in `next.config.ts`.
- **No wallet state management**: Keplr handles all key management. The app connects per-session and listens for `keplr_keystorechange` events to stay in sync.
- **Fixed gas limit**: 200,000 gas with per-chain gas price steps. Fee estimation is deterministic and displayed before confirmation.

## Getting Started

### Prerequisites

- **Node.js** 18+
- **pnpm** (package manager)
- **Keplr** browser extension installed

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

The app runs at `http://localhost:3000`.

## Limitations

- **Same-chain only** — no IBC or cross-chain transfers
- **4 hardcoded currencies** — adding chains requires code changes and redeployment
- **No payment persistence** — no backend means no payment history, no "paid" status, no receipts
- **Client-side expiry only** — expiration is advisory; there's no on-chain enforcement
- **Keplr-only** — no support for other wallets (Leap, Cosmostation, etc.)
- **Hardcoded RPC endpoints** — public endpoints may be rate-limited; no custom endpoint configuration
- **No payment confirmation callbacks** — the creator of a link has no way to know if it was paid

## Roadmap

### SDK (`@plink/core`)

The `lib/` layer is cleanly separated from the UI and could be extracted into a standalone package for developers who want to generate or parse plink-compatible URLs from their own apps.

A potential `@plink/core` would expose:

- **`buildPaymentUrl()`** / **`decodeIntent()`** — create and parse payment links
- **`PaymentIntentSchema`** — Zod schema for validation
- **`CHAIN_REGISTRY`** — chain configs with RPC endpoints
- **`connectClient()`** / **`sendPayment()`** — CosmJS helpers for wallet connection and tx broadcasting

**Prerequisites before this makes sense**: configurable chain registry (not hardcoded), a payment status system, and actual demand from integrators. In the meantime, the URL format documented above serves as a developer reference — anyone can generate compatible links today.

### Real-Time Payment Notifications

A WebSocket-based notification system would turn plink into a commerce primitive. The flow:

1. Merchant generates a payment link with a unique identifier
2. Merchant's backend subscribes to a WebSocket channel for that link
3. Customer opens the link and pays
4. A lightweight indexer watches the chain for matching `MsgSend` transactions
5. When the tx confirms, the merchant receives a real-time push notification
6. Merchant backend triggers fulfillment (ship order, grant access, send receipt, etc.)

This would require a thin backend service (indexer + WebSocket server) that monitors on-chain events, but the client-side payment flow would remain unchanged.
