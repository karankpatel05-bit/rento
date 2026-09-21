# 🏠 Rento — Modern Property & Rent Tracking Mobile App

A clean, minimalist mobile application built with **React Native & Expo** designed for a landlord managing multiple properties.

---

## 🌟 Core Features & Modules

### 1. 📋 Tenant Registration & Onboarding Module
- **Step-by-step card onboarding form** capturing:
  - Tenant Full Name & Contact Phone
  - Property Address & Unit / Flat Designation
  - Monthly Rent Amount
  - **Rent Increment Conditions** (Percentage `%` or Fixed Amount `₹` annual escalation with custom notes)
  - **Electricity Board Load Details** (e.g., *5 kW Three-Phase BESCOM*)
  - **Electricity Deposit Given by Owner** (Amount in ₹)
  - **Maintenance Workflow Mode** (*Variable Rent Deduction* vs *Standard Maintenance*)

### 2. 📑 Monthly Payment Tracking Ledger
- Chronological payment history ledger for each tenant.
- **Payment Logging with FAB**:
  - Billing month/period
  - Expected gross rent
  - Amount actually paid
  - Multi-line **Remarks / Transaction Notes**
  - Paid in Full vs. Partial payment status indicators

### 3. 🔧 Advanced Maintenance Tracking System
- Supports two distinct landlord maintenance workflows:
  - **Standard**: Tenants pay society / RWA maintenance separately.
  - **Variable Rent Deduction**: For properties where maintenance is deducted directly from the rent payout twice a year with varying amounts and months.
- **Prominent Maintenance Deduction Toggle Switch**:
  - Revealing deduction input when switched on.
  - **Auto-calculates Net Payout Received**: `Net = Rent Amount - Maintenance Deduction`.
  - Prominent deduction tag and formula breakdown in the payment ledger history.

### 4. 🔔 Automated May Push Notifications (Electricity Deposit Rebate)
- **Local Push Scheduling (`expo-notifications`)**:
  - Automatically schedules annual reminders on **May 1st at 09:00 AM** for every tenant with an electricity deposit:
    > *"Collect electricity deposit interest from [Tenant Name]."*
  - Tap on notification takes the landlord directly to the tenant's profile.
- **In-App Alerts Tab**:
  - Active throughout May with pending rebate tracking and one-tap collection logging.
  - **"Test Push Alert"** button to trigger the notification immediately on your device.

---

## 🚀 Getting Started

### Run Locally on Mobile (Expo Go)
```bash
npx expo start
```
- Scan the QR code using the **Expo Go** app on your Android or iOS phone.
- Press `a` to run on an Android emulator.
- Press `w` to run in web browser mode.

---

## 📦 Building Standalone Android APK

### Option A: Via GitHub Actions (Automated CI/CD)
The repository includes `.github/workflows/build-apk.yml`.
1. Push this repository to GitHub.
2. Go to the **Actions** tab on your GitHub repo.
3. The **Build Android APK** workflow will automatically compile and produce a downloadable standalone `.apk` under the workflow artifacts.

### Option B: Via Expo EAS Build
The repository includes `eas.json` configured for preview APKs:
```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```
This will compile a standalone `.apk` in the cloud without needing local Android Studio installed.
