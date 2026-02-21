// SHA-256 hashing utilities for citizen IDs and ledger chain
// Uses js-sha256 — a standards-compliant, synchronous SHA-256 implementation

import { sha256 } from 'js-sha256';

/**
 * Synchronous SHA-256 hash (real SHA-256 via js-sha256).
 * Returns a 64-character hex string.
 */
export function sha256Sync(message) {
    return sha256(String(message));
}

/**
 * Async SHA-256 using Web Crypto API (available for external use if needed).
 */
export async function sha256Async(message) {
    const msgBuffer = new TextEncoder().encode(String(message));
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a citizen ID with SHA-256.
 * This ensures citizen IDs are never stored or transmitted in plaintext.
 */
export function hashCitizenId(citizenId) {
    return sha256Sync(String(citizenId));
}

/**
 * Compute a deterministic SHA-256 block hash from all block fields.
 * Ensures tamper-evidence: any field change produces a completely different hash.
 */
export function computeBlockHash(timestamp, citizenHash, scheme, amount, previousHash) {
    const data = `${timestamp}|${citizenHash}|${scheme}|${amount}|${previousHash}`;
    return sha256Sync(data);
}

/**
 * Truncate a hash for display purposes: 0x<first8>...<last4>
 */
export function truncateHash(hash, len = 8) {
    if (!hash) return '';
    return `0x${hash.substring(0, len)}...${hash.substring(hash.length - 4)}`;
}
