# 🥟 MoMo Tantra & Ichheydotcom Deployment Guide

This guide walks you through uploading the codebase to **GitHub** and deploying it to **Vercel** as a live, production-ready, full-stack application.

We have implemented two free cloud database solutions for serverless data persistence:
1. **Vercel KV (Redis)**: Recommended! 100% free, 1-click activation, zero configuration.
2. **MongoDB Atlas**: Free Tier MongoDB option if you prefer.

---

## 💾 Database Option A (Recommended): Vercel KV (1-Click & 100% Free)
Vercel's serverless environment is **ephemeral & stateless**. Any order placed or user registration saved to local `.json` files will be lost when Vercel scales down.

To achieve **100% persistent storage** (so user registration is one-time only and order history is permanent), our system dynamically detects and switches to **Vercel KV** if active.

No setup is needed beforehand! Vercel KV is activated with a single click in your Vercel Dashboard after deploying (see **Phase 2**).

---

## 💾 Database Option B: MongoDB Atlas
If you prefer MongoDB Atlas:
1. Sign up/Log in at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas/register).
2. Create a free **M0 cluster**.
3. Create a Database User (e.g., username `momotantra_user` and password).
4. Go to **Security → Network Access**, add a new IP address, and select **Allow Access from Anywhere** (`0.0.0.0/0`).
5. Copy your connection string and replace `<db_password>` with your database user's password. Save this for your Vercel Environment Variables.

---

## 🚀 Phase 1: Uploading the Code to GitHub

We will initialize Git specifically inside the `momotantra-node` folder to keep the code clean and isolated.

### Step 1: Open Terminal inside the project folder
Open command prompt or PowerShell, then navigate to your folder:
```bash
cd "C:\Users\MONOJIT\Desktop\New folder (2)\momotantra-node"
```

### Step 2: Initialize Git & Commit Files
Initialize git, stage all files, and create a commit:
```bash
# Initialize git repository
git init

# Add all files to staging area (.gitignore will automatically skip node_modules and logs)
git add .

# Commit changes
git commit -m "Initial commit: MoMo Tantra & Ichheydotcom full-stack build"
```

### Step 3: Create GitHub Repository
1. Go to [github.com/new](https://github.com/new).
2. Set the repository name (e.g., `momotantra-app`).
3. Set the repository to **Private** (Private is recommended to protect your configs).
4. Do **NOT** initialize the repository with a README, `.gitignore`, or license.
5. Click **Create repository**.

### Step 4: Link Local Repository and Push
Copy the commands from the GitHub instruction page and run them in your terminal:
```bash
# Change main branch name
git branch -M main

# Link to your remote GitHub repository (replace with your actual GitHub URL)
git remote add origin https://github.com/your-username/momotantra-app.git

# Push the code
git push -u origin main
```

---

## 🌐 Phase 2: Deploying to Vercel

Once your code is pushed to GitHub, Vercel will automatically track changes and deploy your project on every push.

### Step 1: Import Project to Vercel
1. Log in to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** and select **Project**.
3. Under "Import Git Repository", find your repository `momotantra-app` and click **Import**.

### Step 2: Add Environment Variables
Before clicking deploy, expand the **Environment Variables** section and add the following:

| Name | Value / Description | Required / Optional |
|---|---|---|
| `JWT_SECRET` | A secure, random string (e.g., `momo_tantra_super_secret_2026`) used to encrypt user auth tokens. | **Required** |
| `STRIPE_SECRET_KEY` | Your Stripe secret key (`sk_live_...` or `sk_test_...`) | Optional (falls back to Sandbox simulation) |
| `RAZORPAY_KEY_ID` | Your Razorpay API Key ID | Optional (falls back to Sandbox simulation) |
| `RAZORPAY_KEY_SECRET`| Your Razorpay API Key Secret | Optional (falls back to Sandbox simulation) |
| `EMAIL_USER` | `ichheyhelpdesk@gmail.com` (Gmail address to send order confirmations) | Optional (falls back to console log) |
| `EMAIL_PASS` | Gmail App Password (created in Google Account under App Passwords) | Optional (falls back to console log) |
| `MONGO_URI` | Your MongoDB connection string (only if using MongoDB Atlas, otherwise leave empty) | Optional |

### Step 3: Click Deploy
1. Click the **Deploy** button.
2. Vercel will build the serverless functions and bundle public static assets. This takes less than 1 minute.
3. Once completed, you will receive a custom `.vercel.app` domain link!

### Step 4: Enable Free Vercel KV Database (1-Click Persistence)
If you are using Vercel KV (recommended), enable it now:
1. In your project dashboard on Vercel, click the **Storage** tab at the top.
2. Click **Create Database** and select **KV (Redis)**.
3. Choose **Create New** (or accept terms) and click **Create**.
4. Click **Connect** (or link to your project). Vercel will automatically configure and inject the environment variables (`KV_REST_API_URL`, `KV_REST_API_TOKEN`, etc.) into your project.
5. Go to **Settings → Deployments** and click **Redeploy** on your latest build.
6. **Done!** Your app is now live, connected to a secure, persistent KV Redis database for free! User registrations and order statuses will persist forever.

---

## ⚡ How the Application database works (JSON vs KV vs MongoDB)

Our application has been upgraded with a hybrid database layer:
1. **Local Mode (No KV / Mongo configs)**: Writes and reads data to local `.json` files inside the `data/` folder. This is ideal for offline local testing and development.
2. **Vercel KV Mode**: If running on Vercel with KV linked, it connects to your KV store, seeds default menu data if empty, and keeps user profiles and order tracking information persistent.
3. **MongoDB Mode**: If `MONGO_URI` is provided, it connects to your Atlas database.

This architecture ensures the serverless functions stay ultra-fast while achieving permanent cloud data persistence!

---

## 🛡️ Updating and Pushing Changes
Whenever you want to update the app in the future:
1. Edit the files on your desktop.
2. Open terminal in the directory and run:
   ```bash
   git add .
   git commit -m "Update descriptive message"
   git push origin main
   ```
3. Vercel will automatically detect the push, rebuild, and deploy the changes live with zero downtime!
