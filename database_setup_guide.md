# HackMatrix: Actual Database Setup & Production Dataset Guide

This guide walks you through connecting your **real persistent MongoDB database**, seeding the **actual production-style synthetic dataset**, and testing the **live optical camera QR scanning & generation** on real mobile and desktop devices.

---

## Part 1: Choose Your Actual Database Setup

Choose either **Option A (MongoDB Atlas Cloud — Recommended, 0 installs)** or **Option B (Local MongoDB on Windows)**.

---

### Option A: MongoDB Atlas Cloud (Recommended, 2 Minutes, Zero-Install)

MongoDB Atlas gives you a free persistent M0 cloud database hosted on AWS/Google Cloud with zero software installation on your Windows machine.

1. **Sign Up / Log In**:
   - Visit [https://www.mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register).
   - Sign up with Google or your email (free forever).

2. **Deploy Free Cluster**:
   - Select **M0 Free** (Shared).
   - Provider: **AWS** or **Google Cloud** (choose any nearby region, e.g. Mumbai / `ap-south-1`).
   - Click **Create Deployment**.

3. **Set Database User Credentials**:
   - Username: `hackmatrix_admin`
   - Password: Choose a secure password (e.g., `HackMatrix2026!`). Note down this password.
   - Click **Create Database User**.

4. **Configure Network Access (IP Whitelist)**:
   - In the "Where would you like to connect from?" section, choose **My Local Environment**.
   - Under IP Access List, enter `0.0.0.0/0` (Description: `Allow from anywhere`).
   - Click **Add Entry** and then **Finish and Close**.

5. **Copy Your Connection String**:
   - On the Overview dashboard, click **Connect** -> **Drivers** -> **Node.js**.
   - Copy the connection string. It looks like:
     ```text
     mongodb+srv://hackmatrix_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
     ```

6. **Add to `server/.env`**:
   - Open [`server/.env`](file:///c:/Users/SANKET/Downloads/HackMatrix-Healthcare-Platform-UI/server/.env).
   - Replace the `MONGODB_URI` line with your actual Atlas connection string (replace `<password>` with your actual password, and append `/hackmatrix` before the `?`):
     ```env
     MONGODB_URI=mongodb+srv://hackmatrix_admin:HackMatrix2026!@cluster0.xxxxx.mongodb.net/hackmatrix?retryWrites=true&w=majority
     ```

---

### Option B: Local MongoDB Community Server on Windows

If you prefer running a local database daemon on your Windows machine:

1. **Download Installer**:
   - Go to [MongoDB Community Download](https://www.mongodb.com/try/download/community).
   - Select Platform: **Windows**, Package: **msi**, and click **Download**.

2. **Run Installer**:
   - Follow setup wizard -> Select **"Complete"** setup.
   - Ensure the checkbox **"Install MongoDB as a Service"** is checked (Service Name: `MongoDB`).
   - Uncheck "Install MongoDB Compass" (optional).
   - Click **Install** and complete setup.

3. **Verify Local Service**:
   - Press `Win + R`, type `services.msc`, press Enter.
   - Confirm that **MongoDB Server** is in state `Running`.
   - Your local connection string is already configured in [`server/.env`](file:///c:/Users/SANKET/Downloads/HackMatrix-Healthcare-Platform-UI/server/.env):
     ```env
     MONGODB_URI=mongodb://localhost:27017/hackmatrix
     ```

---

## Part 2: Verify Database Connection (1 Command)

Open PowerShell in the `server` directory and run our pre-built connection verification tool:

```powershell
cd c:\Users\SANKET\Downloads\HackMatrix-Healthcare-Platform-UI\server
npm run test:db
```

Expected output upon successful connection:
```text
✔ SUCCESS: Connected to MongoDB in 142ms!
Database Name: hackmatrix
Host: cluster0-shard-00-00.xxxxx.mongodb.net
Collections present: 0
Database is currently empty. Run "npm run seed" to populate the full dataset!
```

---

## Part 3: Seed the Actual Comprehensive Dataset

Run the automated seed command to populate your real database:

```powershell
npm run seed
```

This populates **12 collections** with authentic clinical and public-health data:
- **Organizations**: Sunrise Multispecialty Hospital, City Medical Centre, Karnataka State Health HQ.
- **Practitioners**: Dr. Rohit Verma (Emergency Medicine), Dr. Neha Kapoor (Internal Medicine).
- **Patients**: 6 complete profiles (Ananya Sharma, Meera Nair, Rajesh Patel, Sunita Rao, Devendra Kumar, Priya Menon) with ABHA identifiers, blood groups, and chronic conditions.
- **Encounters & Observations**: Real vitals (BP, SpO2, Heart rate, Temp) and ER clinical encounters.
- **Clinical Resources**: FHIR Active medications (Amlodipine, Cetirizine), Allergies (Penicillin anaphylaxis), Diagnostic reports, and Care plans.
- **Consent Grants**: Scoped active and expired grants.
- **QR Authorizations**: Cryptographic single-use intake tokens.
- **Audit Events**: Real tamper-evident access events with HMAC integrity hashes.
- **Surveillance Snapshots**: Regional epidemiological cohorts with $k$-anonymity suppression.

---

## Part 4: Start the Authoritative Server with Real Database

```powershell
node dist/server.js
```

You will see:
```text
[DB] Connected to MongoDB (hackmatrix)
[Server] HackMatrix API running in development mode on port 4000
[Server] Base URL: http://localhost:4000/api/v1
```

---

## Part 5: Actual Phone App & Live Optical Camera QR Scanner

We have built real ISO QR generation and live optical camera scanning into the frontend:

### 1. Generating Real QR Code on Patient Phone
- Open **Patient Portal** on PC: `http://localhost:8080/patient.html`
- Or open on your **actual physical smartphone** (connected to the same Wi-Fi):
  - **`http://192.168.137.90:8080/patient.html`**
- Sign in as **Ananya Sharma** and navigate to **QR Pass**.
- A real, high-density ISO-compliant QR code is rendered on screen with a live 5-minute countdown timer. Any phone camera or QR scanner can point at this screen and read the token!

### 2. Optical Camera Scanner on Clinician Workstation
- Open **Clinician Portal**: `http://localhost:8080/clinician.html` (or on a mobile device at `http://192.168.137.90:8080/clinician.html`).
- Sign in as **Dr. Rohit Verma** and tap **"Scan Patient QR"**.
- Your browser will request camera permission:
  - Click **Allow**.
  - Your real laptop webcam or phone back-camera will activate with an optical viewfinder reticle and scanning line.
- Point the camera at the QR code displayed on the Patient screen:
  - The optical scanner (`jsQR`) instantly detects the QR code in video frames.
  - Plays an audio confirmation beep chime.
  - Reticle turns green and automatically submits to `/clinicians/qr/resolve`.
  - Verifies token validity and opens Ananya Sharma's scoped chart!
- *Fallback*: If no camera is available or permission is blocked, you can use the built-in **"Paste"** button or enter the token manually.
