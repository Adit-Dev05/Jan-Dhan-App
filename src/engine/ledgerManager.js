import { computeBlockHash, sha256Sync } from './hashUtils';

export function createGenesisBlock() {
    return {
        index: 0,
        timestamp: new Date().toISOString(),
        citizenHash: '0x0000000000000000',
        scheme: 'GENESIS',
        amount: 0,
        previousHash: '0'.repeat(64),
        currentHash: sha256Sync('GENESIS_BLOCK_JAN_DHAN_GATEWAY'),
        status: 'GENESIS'
    };
}

export function appendToLedger(ledger, citizenHash, scheme, amount) {
    const previousBlock = ledger[ledger.length - 1];
    const timestamp = new Date().toISOString();
    const currentHash = computeBlockHash(timestamp, citizenHash, scheme, amount, previousBlock.currentHash);

    const newBlock = {
        index: ledger.length,
        timestamp,
        citizenHash,
        scheme,
        amount,
        previousHash: previousBlock.currentHash,
        currentHash,
        status: 'APPROVED'
    };

    return [...ledger, newBlock];
}

export function verifyLedgerChain(ledger) {
    for (let i = 1; i < ledger.length; i++) {
        const block = ledger[i];
        const prevBlock = ledger[i - 1];

        // Check chain link
        if (block.previousHash !== prevBlock.currentHash) {
            return {
                valid: false,
                brokenIndex: i,
                expectedHash: prevBlock.currentHash,
                receivedHash: block.previousHash,
                error: 'CHAIN_LINK_BROKEN'
            };
        }

        // Recompute and verify block hash
        const expectedHash = computeBlockHash(
            block.timestamp, block.citizenHash, block.scheme, block.amount, block.previousHash
        );
        if (block.currentHash !== expectedHash) {
            return {
                valid: false,
                brokenIndex: i,
                expectedHash,
                receivedHash: block.currentHash,
                error: 'HASH_MISMATCH'
            };
        }
    }
    return { valid: true };
}

// Step-by-step verification: returns array of per-block results
export function stepByStepVerify(ledger) {
    const results = [];

    // Genesis block always valid
    results.push({
        index: 0,
        status: 'VALID',
        blockType: 'GENESIS',
        hash: ledger[0]?.currentHash,
        detail: 'Genesis block — chain root'
    });

    for (let i = 1; i < ledger.length; i++) {
        const block = ledger[i];
        const prevBlock = ledger[i - 1];

        // Check chain link
        const chainLinked = block.previousHash === prevBlock.currentHash;
        // Recompute hash
        const expectedHash = computeBlockHash(
            block.timestamp, block.citizenHash, block.scheme, block.amount, block.previousHash
        );
        const hashValid = block.currentHash === expectedHash;

        if (!chainLinked) {
            results.push({
                index: i,
                status: 'BROKEN',
                blockType: 'TRANSACTION',
                hash: block.currentHash,
                expectedPrevHash: prevBlock.currentHash,
                actualPrevHash: block.previousHash,
                detail: `Chain link broken: previousHash does not match block #${i - 1}'s hash`
            });
        } else if (!hashValid) {
            results.push({
                index: i,
                status: 'TAMPERED',
                blockType: 'TRANSACTION',
                hash: block.currentHash,
                expectedHash,
                detail: `Hash mismatch: block data was modified after creation`
            });
        } else {
            results.push({
                index: i,
                status: 'VALID',
                blockType: 'TRANSACTION',
                hash: block.currentHash,
                detail: `SHA-256 verified ✓ — chain link intact`
            });
        }
    }

    return results;
}

export function tamperLedgerEntry(ledger, index) {
    return ledger.map((block, i) => {
        if (i === index) {
            return {
                ...block,
                currentHash: `0xBAD_HASH_COLLISION_${Math.random().toString(36).substring(2, 8)}`
            };
        }
        return block;
    });
}

export function exportLedgerCSV(ledger) {
    const header = 'Index,Timestamp,Citizen_Hash,Scheme,Amount,Previous_Hash,Current_Hash,Status\n';
    const rows = ledger.map(b =>
        `${b.index},"${b.timestamp}","${b.citizenHash}","${b.scheme}",${b.amount},"${b.previousHash}","${b.currentHash}","${b.status}"`
    ).join('\n');

    const verification = verifyLedgerChain(ledger);
    const certificate = `\n\n--- INTEGRITY CERTIFICATE ---\nGenerated: ${new Date().toISOString()}\nBlocks: ${ledger.length}\nChain Status: ${verification.valid ? 'VERIFIED — ALL BLOCKS VALID' : `COMPROMISED — Break at block #${verification.brokenIndex}`}\nHash Algorithm: SHA-256 (sync variant)\nSignature: ${sha256Sync(`JDG_AUDIT_${Date.now()}`)}\n`;

    return header + rows + certificate;
}
