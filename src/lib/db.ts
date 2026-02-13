import { createClient, type Client } from "@libsql/client";

export interface PaymentLinkRow {
  id: string;
  version: string;
  chain_id: string;
  denom: string;
  recipient: string;
  amount: string;
  memo: string | null;
  label: string | null;
  status: "pending" | "paid" | "expired";
  created_at: string;
  expires_at: string | null;
  paid_at: string | null;
  tx_hash: string | null;
  tx_verified: number;
  payer_address: string | null;
}

let _client: Client | null = null;

function getClient(): Client {
  if (_client) return _client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error("TURSO_DATABASE_URL is not set");
  }

  _client = createClient({ url, authToken });
  return _client;
}

export async function migrateDatabase(): Promise<void> {
  const client = getClient();
  await client.execute(`
    CREATE TABLE IF NOT EXISTS payment_links (
      id              TEXT PRIMARY KEY,
      version         TEXT NOT NULL DEFAULT '1',
      chain_id        TEXT NOT NULL,
      denom           TEXT NOT NULL,
      recipient       TEXT NOT NULL,
      amount          TEXT NOT NULL,
      memo            TEXT,
      label           TEXT,
      status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired')),
      created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      expires_at      TEXT,
      paid_at         TEXT,
      tx_hash         TEXT,
      tx_verified     INTEGER NOT NULL DEFAULT 0,
      payer_address   TEXT
    )
  `);
}

export async function createLink(params: {
  id: string;
  chainId: string;
  denom: string;
  recipient: string;
  amount: string;
  memo?: string;
  label?: string;
  expiresAt?: string;
}): Promise<PaymentLinkRow> {
  const client = getClient();

  await client.execute({
    sql: `INSERT INTO payment_links (id, chain_id, denom, recipient, amount, memo, label, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      params.id,
      params.chainId,
      params.denom,
      params.recipient,
      params.amount,
      params.memo ?? null,
      params.label ?? null,
      params.expiresAt ?? null,
    ],
  });

  const row = await getLinkById(params.id);
  if (!row) throw new Error("Failed to create payment link");
  return row;
}

export async function getLinkById(
  id: string,
): Promise<PaymentLinkRow | null> {
  const client = getClient();

  const result = await client.execute({
    sql: `SELECT * FROM payment_links WHERE id = ?`,
    args: [id],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0] as unknown as PaymentLinkRow;

  // Lazy expiry check
  if (
    row.status === "pending" &&
    row.expires_at &&
    new Date(row.expires_at) < new Date()
  ) {
    await client.execute({
      sql: `UPDATE payment_links SET status = 'expired' WHERE id = ? AND status = 'pending'`,
      args: [id],
    });
    row.status = "expired";
  }

  return row;
}

/**
 * Atomically claim a link for payment by setting the tx_hash.
 * Returns true if this caller won the claim, false if already claimed.
 */
export async function claimLinkForPayment(
  id: string,
  txHash: string,
  payerAddress: string,
): Promise<boolean> {
  const client = getClient();

  const result = await client.execute({
    sql: `UPDATE payment_links
          SET tx_hash = ?, payer_address = ?
          WHERE id = ? AND status = 'pending' AND tx_hash IS NULL`,
    args: [txHash, payerAddress, id],
  });

  return result.rowsAffected > 0;
}

/**
 * Mark a link as paid after on-chain verification succeeds.
 */
export async function markLinkAsPaid(id: string): Promise<void> {
  const client = getClient();

  await client.execute({
    sql: `UPDATE payment_links
          SET status = 'paid', tx_verified = 1, paid_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
          WHERE id = ? AND status = 'pending'`,
    args: [id],
  });
}

/**
 * Reset tx_hash after failed verification so another payment can be attempted.
 */
export async function resetLinkPayment(id: string): Promise<void> {
  const client = getClient();

  await client.execute({
    sql: `UPDATE payment_links
          SET tx_hash = NULL, payer_address = NULL
          WHERE id = ? AND status = 'pending'`,
    args: [id],
  });
}
