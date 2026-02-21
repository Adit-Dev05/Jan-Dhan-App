<div align="center">

# 🛡️ Jan-Dhan Gateway

**A blockchain-secured, real-time benefit disbursement portal for the Jan-Dhan Yojana scheme**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![SHA-256](https://img.shields.io/badge/SHA--256-NIST%20FIPS%20180--4-00d4aa?style=for-the-badge)](https://csrc.nist.gov/publications/detail/fips/180/4/final)
[![Blockchain](https://img.shields.io/badge/Blockchain-Immutable%20Ledger-4a90d9?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge)]()

> _"Every rupee disbursed is verified, hashed, chained, and tamper-proof."_

</div>

---

## 📌 Problem Statement

India's welfare benefit system — including **Jan-Dhan Yojana** — faces critical challenges:

| Problem | Impact |
|---|---|
| 🔁 **Duplicate claims** | Same citizen collects benefits multiple times |
| 💰 **Budget overrun** | No real-time cap enforcement |
| 🕵️ **Insider fraud** | Officials manually manipulate disbursement amounts |
| 📋 **No audit trail** | Payments leave no tamper-proof record |
| ⏳ **Frequency abuse** | Citizens claim repeatedly before cooldown period |

**Jan-Dhan Gateway** solves all five with a cryptographically enforced, rule-based payment pipeline.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| ⛓️ **Blockchain Ledger** | Every approved payment is appended as a SHA-256 chained block |
| 🔐 **3-Gate Pipeline** | Eligibility → Budget → Frequency — all rules must pass |
| 🔒 **Tamper Detection** | Chain verification after every transaction; system **FREEZES** on breach |
| 👁️ **Real SHA-256** | `js-sha256` (NIST FIPS 180-4 compliant) — verified with standard test vectors |
| 🛡️ **2FA / OTP** | High-value transactions require one-time password |
| 🕵️ **Fraud Analytics** | Per-citizen anomaly scoring (0–100) with region-level risk heatmaps |
| 📤 **CSV Export** | Audit trail with embedded integrity certificate |
| 🔁 **Cross-tab Sync** | Real-time state sync across browser tabs via `localStorage` events |

---

## 🚀 Quick Start

```bash
git clone https://github.com/Adit-Dev05/Jan-Dhan-App.git
cd Jan-Dhan-App
npm install
npm run dev
```

Open **http://localhost:5173** — no backend or API key required.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Jan-Dhan Gateway                   │
│                                                     │
│  CLIENT PORTAL              ADMIN DASHBOARD         │
│  ┌─────────────┐            ┌──────────────────┐    │
│  │ Submit Claim│            │ Dashboard (KPIs) │    │
│  │ Track Status│            │ Transaction Feed │    │
│  └──────┬──────┘            │ Fraud Analytics  │    │
│         │                  │ Audit & Forensics│    │
│         ▼                  └──────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │           ENGINE LAYER (src/engine/)        │    │
│  │  validationEngine ─ hashUtils ─ ledger      │    │
│  │  fraudScoring ──── AppContext (state)       │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## 🔐 The 3-Gate Validation Pipeline

```
 CITIZEN SUBMITS CLAIM
         │
         ▼
 ╔═══════════════════╗
 ║  GATE 1           ║  ✦ Account Active?
 ║  ELIGIBILITY      ║  ✦ Aadhaar Linked?
 ║                   ║  ✦ Scheme matches enrollment?
 ╚════════╤══════════╝  ✦ Claim count ≤ 3?
          │ ALL PASS
          ▼
 ╔═══════════════════╗
 ║  GATE 2           ║  ✦ Scheme amount ≤ remaining budget?
 ║  BUDGET           ║  ✦ Auto-halt when BUDGET_EXHAUSTED
 ╚════════╤══════════╝
          │ PASS
          ▼
 ╔═══════════════════╗
 ║  GATE 3           ║  ✦ Last claim > 30 days ago?
 ║  FREQUENCY        ║  ✦ Prevents repeated monthly abuse
 ╚════════╤══════════╝
          │ PASS
          ▼
 ┌─────────────────┐
 │  APPROVED ✅    │──→ SHA-256 block appended to ledger
 │  REJECTED ❌    │──→ Fraud alert raised + reason logged
 └─────────────────┘
```

---

## ⛓️ Blockchain Ledger — How It Works

Each approved transaction creates a new block:

```json
{
  "index": 3,
  "timestamp": "2026-02-21T04:02:11.042Z",
  "citizenHash": "a3f9c1b2...<SHA-256 of Citizen ID>",
  "scheme": "PMJDY-BASIC",
  "amount": 1500,
  "previousHash": "6d1a9f04...",
  "currentHash":  "b8e3c720...<SHA-256 of all fields>",
  "status": "APPROVED"
}
```

**Tamper Detection:** If **any** field in any block is modified, its `currentHash` changes. The next block's `previousHash` then mismatches — the chain is broken. The system instantly enters `FROZEN` state.

---

## 🔑 SHA-256 Implementation

> **Library:** [`js-sha256`](https://github.com/emn178/js-sha256) — standards-compliant, synchronous SHA-256.

### Live Proof (in-app)

Go to **Admin → Audit Reports → SHA-256 Live Verifier** to see:

| Input | Expected SHA-256 | Status |
|---|---|---|
| `abc` | `ba7816bf8f01cfea...` | ✅ NIST FIPS 180-4 Vector 1 |
| *(empty)* | `e3b0c44298fc1c14...` | ✅ NIST FIPS 180-4 Empty |
| `The quick brown fox...` | `d7a8fbb307d78094...` | ✅ Common test vector |

You can type any string in the verifier and cross-check the output at [emn178.github.io/online-tools/sha256.html](https://emn178.github.io/online-tools/sha256.html).

**Usage in the engine:**

```js
// src/engine/hashUtils.js
import { sha256 } from 'js-sha256';

export function hashCitizenId(citizenId) {
    return sha256(String(citizenId)); // real SHA-256, 64-char hex
}

export function computeBlockHash(timestamp, citizenHash, scheme, amount, previousHash) {
    return sha256(`${timestamp}|${citizenHash}|${scheme}|${amount}|${previousHash}`);
}
```

---

## 🛡️ Security Design

| Threat | Mitigation |
|---|---|
| **Double-spend / Duplicate claim** | SHA-256 hash stored in `processedHashes` Set; checked before every transaction |
| **Insider amount manipulation** | Block hash recomputed on verification — field change = hash mismatch = FROZEN |
| **Hash collision attack** | SHA-256 forged hash breaks `previousHash` chain link |
| **Block deletion** | Successor block's `previousHash` becomes orphaned — detected immediately |
| **Replay attacks** | `checkReplayAttack()` guards against transactionHash reuse |
| **High-value fraud** | OTP/2FA required for scheme amounts > ₹3,000 |

---

## 🕵️ Fraud Analytics Engine

Risk score per citizen (0–100):

```
score += claim_count_near_limit   → up to 40 pts
score += frequency_violations × 15 → up to 30 pts
score += multi_region_claims       → up to 20 pts
duplicate attempt detected?       → score = max(score, 80)
```

| Score | Risk Level |
|---|---|
| 0 – 30 | 🟢 LOW |
| 31 – 60 | 🟡 MEDIUM |
| 61 – 100 | 🔴 HIGH |

---

## 🧪 Forensic Tamper Simulation (Demo)

Available in **Admin → Audit Reports → Forensic Tamper Simulation**:

| Scenario | What's Changed | How It's Detected |
|---|---|---|
| **Insider Amount Manipulation** | Amount field × 10 | Block hash mismatch (SHA-256 changes) |
| **Hash Collision Attack** | `currentHash` replaced with forged value | Next block's `previousHash` breaks |
| **Block Deletion** | Block removed from array | Gap in index + orphaned `previousHash` |

After demo → click **Restore Chain** to revert to the clean backup.

---

## 📁 Dataset

- **File:** `src/data/registryData.json`
- **Records:** ~5,000 citizens
- **Fields:** `Citizen_ID`, `Account_Status`, `Aadhaar_Linked`, `Scheme_Eligibility`, `Scheme_Amount`, `Claim_Count`, `Last_Claim_Date`, `Region_Code`

---

## 📊 Sample Outputs

**✅ Approved Claim**
```
Citizen: 100023  |  Scheme: PMJDY-BASIC
Gate 1: PASS — Eligibility Verified
Gate 2: PASS — Budget Allocated (₹1500 from ₹998500)
Gate 3: PASS — Frequency Cleared (45 days since last claim)
→ APPROVED  |  TXN-00001-JDG  |  ₹1500 disbursed
Block #1 appended to ledger. Chain: VERIFIED ✓
```

**❌ Rejected — Duplicate**
```
Citizen: 100023  |  Scheme: PMJDY-BASIC
Hash 0xa3f9c1b2... already in processedHashes
→ REJECTED  |  Reason: DUPLICATE_REJECTED
→ Alert raised  |  Risk Level: HIGH
```

**🔴 Tamper Detected**
```
[TAMPER SIMULATION — Amount Manipulation]
Block #1: amount changed ₹1500 → ₹15000
Recomputed hash: b8e3c720...
Stored hash:     6f1d8a49... ← MISMATCH
→ System Status: FROZEN — All transactions blocked
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite 7 |
| State | `useReducer` + Context API |
| SHA-256 | `js-sha256` (NIST FIPS 180-4) |
| Styling | TailwindCSS v4 + Custom dark theme |
| Icons | Lucide React |
| Persistence | `localStorage` + cross-tab event sync |
| Data | Static JSON (no backend) |

---

## 📂 Project Structure

```
src/
├── engine/
│   ├── validationEngine.js   # 3-gate rule logic
│   ├── hashUtils.js          # Real SHA-256 (js-sha256)
│   ├── ledgerManager.js      # Blockchain: append/verify/tamper/export
│   └── fraudScoring.js       # Risk scoring 0–100
├── context/
│   └── AppContext.jsx         # All business logic + global state
├── pages/
│   ├── SubmitClaim.jsx        # Claim form + pipeline visualisation
│   ├── TrackStatus.jsx        # Transaction hash lookup
│   ├── Dashboard.jsx          # KPIs + blockchain ledger widget
│   ├── TransactionMonitor.jsx # Live transaction feed
│   ├── FraudAnalytics.jsx     # Region-wise risk heatmap
│   └── AuditReports.jsx       # SHA-256 verifier + forensic tamper demo
├── components/
│   ├── ValidationPipeline.jsx # Gate status visualisation
│   ├── BlockchainLedger.jsx   # Block explorer widget
│   ├── FrozenOverlay.jsx      # Full-screen tamper alert UI
│   ├── KPICard.jsx, Sidebar.jsx, TopBar.jsx
└── layouts/
    ├── AdminLayout.jsx
    └── ClientLayout.jsx
```

---

<div align="center">

Built for **National Hackathon 2026** — Jan-Dhan Gateway 🇮🇳

</div>
