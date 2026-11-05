import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

// Independent RFC 6238 client fixture, not the server's TOTP generator.
export function authenticatorCode(uri: string) {
  const secret = new URL(uri).searchParams.get("secret");
  assert.ok(secret);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret.replace(/=+$/, "")]
    .map((character) =>
      alphabet.indexOf(character).toString(2).padStart(5, "0"),
    )
    .join("");
  const bytes = Buffer.from(
    (bits.match(/.{8}/g) ?? []).map((byte) => Number.parseInt(byte, 2)),
  );
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac("sha1", bytes).update(counter).digest();
  const offset = (digest[digest.length - 1] ?? 0) & 15;
  return String(
    (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000,
  ).padStart(6, "0");
}
