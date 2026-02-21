# Jan-Dhan Gateway 🛡️

> **A secure, blockchain-backed benefit disbursement portal for the Jan-Dhan Yojana scheme** — built with React + Vite.

A real-time welfare payment gateway that validates citizen benefit claims through a 3-gate security pipeline, records approved transactions on an immutable blockchain ledger, and detects tampering via SHA-256 chain verification.

---

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/Adit-Dev05/Jan-Dhan-App.git
cd Jan-Dhan-App

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🏗️ Architecture

```
Jan-Dhan Gateway
├── Client Portal (Public)
│   ├── Submit Claim        → 3-Gate Validation Pipeline
│   └── Track Status        → Hash-based transaction lookup
│
└── Admin Dashboard (Internal)
    ├── Dashboard           → KPIs, system overview, blockchain ledger
    ├── Transaction Monitor → Live transaction feed with risk scoring
    ├── Fraud Analytics     → Region-wise risk heatmap & alerts
    └── Audit Reports       → Step-by-step block verification & tamper demo
```

### Engine Modules (`src/engine/`)

| Module | Purpose |
|---|---|
| `validationEngine.js` | 3-Gate rule-based claim validation |
| `hashUtils.js` | Real SHA-256 hashing (citizen IDs + block hashes) |
| `ledgerManager.js` | Blockchain ledger: append, verify, tamper, export |
| `fraudScoring.js` | Per-citizen anomaly scoring (0–100) |

---

## 🔐 3-Gate Validation Pipeline

Every claim passes through three mandatory gates sequentially:

```
CITIZEN SUBMITS CLAIM
        │
        ▼
┌─────────────────────┐
│  GATE 1: ELIGIBILITY │  Account Active? Aadhaar Linked?
│                     │  Scheme Match? Claim Count ≤ 3?
└────────┬────────────┘
         │ PASS
         ▼
┌─────────────────────┐
│  GATE 2: BUDGET     │  Scheme amount ≤ remaining budget?
└────────┬────────────┘
         │ PASS
         ▼
┌─────────────────────┐
│  GATE 3: FREQUENCY  │  Last claim > 30 days ago?
└────────┬────────────┘
         │ PASS
         ▼
   APPROVED → Written to Blockchain Ledger
   REJECTED → Fraud alert raised, reason logged
```

---

## ⛓️ Blockchain Ledger

- **Genesis block** is created at system startup
- Each approved transaction is appended as a new block containing:
  - `index`, `timestamp`, `citizenHash` (SHA-256), `scheme`, `amount`
  - `previousHash` — links block to predecessor
  - `currentHash` — SHA-256 of all block fields
- **Chain verification** runs after every transaction (`verifyLedgerChain`)
- On tamper detection → system enters `FROZEN` state and blocks all new transactions

### Hash Algorithm
All hashes use **real SHA-256** via the `js-sha256` library:
- Citizen IDs are never stored in plaintext — always SHA-256 hashed
- Block integrity is enforced by recomputing and comparing hashes at verification time

---

## 🔒 Security Features

| Feature | Implementation |
|---|---|
| Citizen ID Privacy | SHA-256 hashed before any storage or comparison |
| Duplicate Prevention | Hash-set lookup — same citizen cannot claim twice |
| Tamper Evidence | Any block field change → chain link broken → system FROZEN |
| 2FA (OTP) | Required for high-value transactions (scheme amount > ₹3,000) |
| Replay Attack Guard | `checkReplayAttack()` prevents hash-reuse attacks |
| Fraud Scoring | 0–100 risk score per citizen based on claim patterns |

---

## 📊 Fraud Analytics

The fraud engine computes a per-citizen risk score based on:

- **Claim count proximity** to limit (up to 40 pts)
- **Frequency violation attempts** (up to 30 pts)
- **Multi-region claim patterns** (up to 20 pts)
- **Duplicate hash collision attempts** → instant HIGH risk (80+ pts)

Risk levels: `LOW` (0–30) · `MEDIUM` (31–60) · `HIGH` (61–100)

---

## 🧪 Tamper Demo Scenarios (Audit Reports Page)

| Scenario | What Happens |
|---|---|
| **Amount Manipulation** | Insider changes disbursement amount 10× — block hash mismatch detected |
| **Hash Collision** | Stored hash replaced with forged value — chain link broken |
| **Block Deletion** | A block is removed — successor's `previousHash` becomes orphaned |

After each demo, **Restore Chain** reverts to the clean backup.

---

## 📁 Dataset

- **File:** `registryData.json` (~565 KB)
- **Citizens:** ~5,000 records
- **Fields:** `Citizen_ID`, `Account_Status`, `Aadhaar_Linked`, `Scheme_Eligibility`, `Scheme_Amount`, `Claim_Count`, `Last_Claim_Date`, `Region_Code`

---

## 🖥️ Sample Outputs

### Approved Transaction
```
Citizen ID: 100023
Scheme: PMJDY-BASIC
Gate 1: ✅ Eligibility Verified
Gate 2: ✅ Budget Allocated
Gate 3: ✅ Frequency Cleared
→ APPROVED | TXN-00001-JDG | ₹1500 disbursed
```

### Rejected Transaction (Duplicate)
```
Citizen ID: 100023
→ REJECTED | Reason: DUPLICATE_REJECTED
→ Alert raised: Risk Level HIGH
```

### Tamper Detection
```
[TAMPER DETECTED]
Block #1: Amount changed ₹1500 → ₹15000
Hash mismatch: expected a3f9c1... received 0xBAD_HASH...
System Status: FROZEN — all transactions blocked
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| State Management | `useReducer` + Context API |
| Hashing | `js-sha256` (real SHA-256) |
| Styling | TailwindCSS v4 (custom dark theme) |
| Icons | Lucide React |
| Persistence | `localStorage` with cross-tab sync |
| Data | Static JSON registry (no backend required) |

---

## 📂 Project Structure

```
src/
├── engine/
│   ├── validationEngine.js   # 3-Gate rule logic
│   ├── hashUtils.js          # SHA-256 utilities
│   ├── ledgerManager.js      # Blockchain operations
│   └── fraudScoring.js       # Risk scoring
├── context/
│   └── AppContext.jsx         # Global state + all business logic
├── pages/
│   ├── SubmitClaim.jsx        # Client: claim form + pipeline visualisation
│   ├── TrackStatus.jsx        # Client: transaction lookup
│   ├── Dashboard.jsx          # Admin: KPIs + blockchain ledger
│   ├── TransactionMonitor.jsx # Admin: live transaction feed
│   ├── FraudAnalytics.jsx     # Admin: fraud heatmap
│   └── AuditReports.jsx       # Admin: block verifier + tamper demo
├── components/
│   ├── ValidationPipeline.jsx # Gate status visualisation
│   ├── BlockchainLedger.jsx   # Block explorer widget
│   ├── KPICard.jsx            # Dashboard stat cards
│   ├── Sidebar.jsx            # Admin navigation
│   ├── TopBar.jsx             # Admin top bar
│   └── FrozenOverlay.jsx      # Full-screen tamper alert
└── layouts/
    ├── AdminLayout.jsx        # Admin shell
    └── ClientLayout.jsx       # Client shell
```

---

## 👥 Team

**Jan-Dhan Gateway** — Built for the National Hackathon 2026
