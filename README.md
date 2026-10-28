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

## 🕵️ Complete Change History & Audit Trail

A secure, append-only modification history tracks all critical data updates across the club:

- **Tracked Entities**:
  - Financial amounts & expense descriptions (e.g. `400 DH` ➔ `480 DH`, `Coffee supplies` ➔ `Coffee and drinks supplies`).
  - Shift receipts (tables, café, staff).
  - Staff profiles, base salaries, advances, and payments.
  - Credit and old debt repayments.
  - Club settings (currency, name, PINs, Telegram destinations).
- **Audit Detail**: Every audit log record preserves the entity type, ID, reference, field modified, previous value (`oldValue`), new value (`newValue`), exact timestamp, active user identity (`Owner 👑` / `Manager`), and club name.
- **Audit Trail UI**: An interactive page (`#page-audit`) with search filtering, club filtering, category filtering, visual diff badges (`old ➔ new`), and CSV export for financial audits.
- **Access Control**: Audit trail is accessible exclusively to the **Owner (👑)**.

---

## 🔒 Credentials & Roles

| Branch | Role | Default PIN | Access Level |
| :--- | :--- | :---: | :--- |
| **Laayoune** | **Owner (المالك)** | **`1234`** | Full access: Partnership, Profits, Expenses, Staff, Settings, Audit Trail |
| **Laayoune** | **Manager (المسير)** | **`0000`** | Operations: Tables, Café, Shifts, Attendance |
| **Tarfaya** | **Owner (المالك)** | **`1342`** | Full access: Tarfaya Partner Settlement & Accounts, Audit Trail |
| **Tarfaya** | **Manager (المسير)** | **`0000`** | Operations: Tables, Café, Shifts, Attendance |

*(PINs can be updated anytime in the Settings page).*

---

## 📄 License

Private repository for Juby Club (Tarfaya & Laayoune).
