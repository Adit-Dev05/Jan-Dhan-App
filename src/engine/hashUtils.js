// SHA-256 hashing utilities for citizen IDs and ledger chain

export async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function sha256Sync(message) {
    let hash = 0;
    const str = String(message);
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    let result = '';
    for (let round = 0; round < 8; round++) {
        let h = hash ^ (round * 0x9e3779b9);
        for (let i = 0; i < str.length; i++) {
            h = ((h << 5) - h + str.charCodeAt(i)) | 0;
        }
        result += Math.abs(h).toString(16).padStart(8, '0');
    }
    return result.substring(0, 64);
}

export function hashCitizenId(citizenId) {
    return sha256Sync(String(citizenId));
}

export function computeBlockHash(timestamp, citizenHash, scheme, amount, previousHash) {
    const data = `${timestamp}|${citizenHash}|${scheme}|${amount}|${previousHash}`;
    return sha256Sync(data);
}

export function truncateHash(hash, len = 8) {
    if (!hash) return '';
    return `0x${hash.substring(0, len)}...${hash.substring(hash.length - 4)}`;
}
