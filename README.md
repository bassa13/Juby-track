# 🎱 Juby Club — Management, Multi-Branch & Financial System

Welcome to the **Juby Club** official repository. This project powers the daily operations, table management, café orders, staff payroll, and financial profit-sharing for **Juby Club Tarfaya** and **Juby Club Laayoune**.

---

## 🌟 Quick Start — Standalone Web Application (`index.html`)

The repository includes the standalone, self-contained **Juby Club Manager** (`index.html`), which runs entirely in the browser with local storage persistence and optional Firebase cloud synchronization.

### Running Locally
To launch the application locally:
```bash
python3 -m http.server 8080
```
Then navigate in your browser to:
👉 **`http://localhost:8080/index.html`**

---

## 🏢 Multi-Branch Architecture

The application provides a branch selection screen allowing administrators and managers to access their specific club branch with complete data isolation:

1. **Juby Club Tarfaya**
   - Operational since 2024
   - 2-partner profit sharing and cash settlement engine
   - Owner PIN: `1342` · Manager PIN: `0000`
2. **Juby Club Laayoune**
   - 3-stakeholder partnership structure
   - Dedicated expense responsibility and profit distribution engine
   - Owner PIN: `1234` · Manager PIN: `0000`

---

## 🤝 Juby Club Laayoune — Partnership & Financial Management

Juby Club Laayoune operates under a specialized 3-stakeholder ownership structure:

| Stakeholder | Ownership Stake | Shared Operating Expenses | Partners-Only Expenses |
| :--- | :---: | :---: | :---: |
| **👑 Investor** | **25.0%** | **25.0%** | **0.00 DH (100% EXCLUDED)** |
| **👑 Partner 1 (Me)** | **37.5%** | **37.5%** | **50.0%** |
| **👑 Partner 2 (Business Partner)** | **37.5%** | **37.5%** | **50.0%** |

### Accounting Logic & Net Profit Formulas
The investor receives 25% of business profits after deducting only shared business expenses. **Expenses concerning only the partners never reduce the investor's profit share:**

$$\text{Investor Net Profit} = (\text{Total Revenue} - \text{Shared Business Expenses}) \times 25\%$$

$$\text{Partner 1 Net Profit} = [(\text{Total Revenue} - \text{Shared Business Expenses}) \times 37.5\%] - (\text{Partners-Only Expenses} \times 50\%)$$

$$\text{Partner 2 Net Profit} = [(\text{Total Revenue} - \text{Shared Business Expenses}) \times 37.5\%] - (\text{Partners-Only Expenses} \times 50\%)$$

$$\text{Total Distributed Profits} = \text{Investor Net} + \text{Partner 1 Net} + \text{Partner 2 Net} = \text{Total Revenue} - \text{Total Expenses}$$

### Verified Test Benchmark (Section 9 Specification)
- **Revenue**: 100,000 DH
- **Shared Expenses**: 20,000 DH
- **Partners-Only Expenses**: 10,000 DH

```text
Profit Before Partners-Only = 80,000 DH

• Investor:
  - Shared expense contribution: 5,000 DH (25%)
  - Net Profit: 20,000 DH (Protected)

• Partner 1:
  - Shared expense contribution: 7,500 DH (37.5%)
  - Partners-Only deduction: 5,000 DH (50%)
  - Net Profit: 25,000 DH

• Partner 2:
  - Shared expense contribution: 7,500 DH (37.5%)
  - Partners-Only deduction: 5,000 DH (50%)
  - Net Profit: 25,000 DH

Total Net Profit Distributed: 70,000 DH (✓ 100% Mathematically Balanced)
```

---

## 💸 Expense Classification System

Every expense in Juby Club Laayoune is classified under a mandatory responsibility field:

1. **👥 Shared Business (All Stakeholders)**:
   - Operating expenses: Rent, Electricity, Water, Internet, Coffee Supplies, Sidi Ali Water, Enerys, Municipal Taxes, Maintenance.
   - Cost split: 25% Investor / 37.5% Partner 1 / 37.5% Partner 2.
2. **🤝 Partners-Only (Investor Excluded)**:
   - Partner-specific costs: TV subscriptions, Tombola prizes, CPP expenses, partner equipment.
   - Cost split: 0 DH Investor / 50% Partner 1 / 50% Partner 2.
3. **⚙️ Custom Allocation**:
   - Custom percentage breakdown per stakeholder with real-time validation (total must equal 100%).
4. **Live Allocation Preview**:
   - The expense creation modal renders a live preview in Moroccan Dirhams (DH) before saving.

---

## 📑 Transparency & Reports

The partnership module provides three tabbed executive reports:

- **Report C — Profit Distribution Statement**: Complete stakeholder breakdown with gross profit shares, partner deductions, final net profits, and category distribution.
- **Report A — Shared Business Operating Expenses**: Itemized list of normal operating costs with 25% / 37.5% / 37.5% contributions.
- **Report B — Partners-Only Expenses**: Itemized list of partner costs with Investor share fixed at **0.00 DH (EXCLUDED)**.
- **🖨️ Printable Statements**: Generates print-ready formal statements complete with executive summary and stakeholder signature rows.

---

## 👥 Decoupled Staff Management & Local Mode

- **Staff Payroll Decoupling**: Staff salaries, advances (تسبيقات), and worker attendance are managed exclusively in the **Staff page**, keeping the **Charges page** clean and focused on club operating bills.
- **Default Local Mode**: The application defaults to **`💾 Local Mode (Offline)`** for immediate startup without internet latency. One-click toggle to **`☁️ Cloud Online`** is available on the login screen.

---

## 🚀 Modernized Fullstack Architecture (`client/` & `server/`)

In addition to `index.html`, the repository includes a modernized React 19 + Node.js fullstack architecture:

- **Frontend (`client/`)**: React 19, Vite, Zustand state management, Tailwind CSS.
- **Backend (`server/`)**: Express API with SMS/Telegram notifications and Supabase database integration.
- **Database (`supabase/`)**: PostgreSQL schema, Row Level Security policies, and real-time event streams.

### Development Commands
```bash
# Install dependencies
npm run install:all

# Run React frontend + Express backend
npm run dev
```

---

---

## 📱 Independent Telegram Notifications & Prominent Club Identification

Both branches have isolated Telegram bot configurations and independent notification destinations:

- **Prominent Club Identification**: Every notification starts prominently with the club name:
  ```text
  🔔 <b>JUBY CLUB LAAYOUNE</b>
  Club: JUBY CLUB LAAYOUNE
  ━━━━━━━━━━━━━━━━
  ```
  or:
  ```text
  🔔 <b>JUBY CLUB TARFAYA</b>
  Club: JUBY CLUB TARFAYA
  ━━━━━━━━━━━━━━━━
  ```
  Searching for `TARFAYA` or `LAAYOUNE` in Telegram search immediately surfaces all notifications for that specific club.
- **Delivery Verification**: Notifications are verified via the Telegram Bot API (`result.ok === true`) with masked, secure server and console logging.
- **Admin Test Notification**: Built-in test button in **Settings ➔ Telegram Notifications** to verify delivery with real-time feedback.

---

## 💼 Investor Role (Read-Only Viewer) & Multi-Layer Security

A dedicated **Investor (Viewer Only)** role allows club investors to log in and inspect financial records with complete transparency while strictly preventing any data modification:

- **Investor Credentials**:
  - Email: `investor@jubyclub.com`
  - Password: `investor123` (or PIN `7777`)
- **Investor Access & Permissions**:
  - View full dashboard KPIs, net profits, and revenues.
  - View daily shifts, expenses, charges, staff, debts, credits, and reminders.
  - Access executive financial statements (Report A, B, and C profit distribution).
  - Inspect partnership breakdown and 25% ownership allocation.
- **Strict Read-Only Enforcement**:
  - All creation, update, and deletion action buttons are suppressed (`.role-investor`).
  - Settings, administrative actions, and user/PIN configuration are blocked.
  - Programmatic and backend guards (`isReadOnlyUser()`, `saveData()`, `saveDataToCloud()`, REST API calls) reject all unauthorized write attempts.

---

## ⚡ Double-Click Prevention & Instant UI Updates (Laayoune & Tarfaya)

A comprehensive UI interaction guard and transaction deduplication engine prevents accidental duplicate clicks, duplicate financial entries, and frozen interface states:

- **0ms Visual Feedback**:
  - Buttons immediately scale, enter a loading state (`.btn-processing`), and display an animated spinner upon clicking.
  - Floating status toast (`showActionToast`) confirms the action instantly.
- **Action Guard & Cooldown Locking**:
  - Concurrency locks (`runGuardedAction`) temporarily disable the action trigger and suppress rapid clicks across a 320ms cooldown period.
  - Global click listener intercepts and dampens rapid button clicks (< 280ms) across all modals, tables, and forms.
- **Financial Deduplication Engine**:
  - `isDuplicateTransaction` checks amount, date, and stakeholder/person fingerprints to reject duplicate database inserts within a 2.5s window.
- **Optimistic State Updates**:
  - Modals close and dashboard summaries update immediately, while cloud database synchronization completes asynchronously in the background without freezing the screen.
- **Protected Operations**:
  - Shifts (saving, closing, deleting)
  - Charges & operating expenses
  - Staff profiles, advances, and salary payments
  - Client debts, advances, and payments
  - Jetons sales & transfers
  - Match queueing, frame additions, and score management
  - Settings, PINs, and branch authentication

---

## 🔒 Credentials & Roles

| Branch | Role | Login Method / Credentials | Access Level |
| :--- | :--- | :--- | :--- |
| **Laayoune** | **Owner (المالك)** | PIN: **`1234`** | Full access: Partnership, Profits, Expenses, Staff, Settings |
| **Laayoune** | **Manager (المسير)** | PIN: **`0000`** | Operations: Tables, Café, Shifts, Attendance |
| **Laayoune** | **Investor (المستثمر)** | Email: **`investor@jubyclub.com`**<br>Pwd: **`investor123`** (or PIN `7777`) | **Read-Only Viewer**: Dashboard, Shifts, Charges, Reports, 25% Share |
| **Tarfaya** | **Owner (المالك)** | PIN: **`1342`** | Full access: Tarfaya Partner Settlement & Accounts |
| **Tarfaya** | **Manager (المسير)** | PIN: **`0000`** | Operations: Tables, Café, Shifts, Attendance |
| **Tarfaya** | **Investor (المستثمر)** | Email: **`investor@jubyclub.com`**<br>Pwd: **`investor123`** (or PIN `7777`) | **Read-Only Viewer**: Dashboard, Shifts, Charges, Reports, Accounts |

*(PINs and passwords can be updated anytime in the Settings page).*

---

## 📄 License

Private repository for Juby Club (Tarfaya & Laayoune).
