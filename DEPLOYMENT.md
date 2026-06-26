# 🚀 SkillSphere - Production Deployment Guide

This comprehensive guide describes the architecture, environment configurations, and step-by-step instructions for deploying the **SkillSphere** platform (Node.js/Express backend, React frontend) in a secure, high-performance production environment.

---

## 🏗️ Production Architecture Overview

The production deployment of SkillSphere splits the frontend client and the backend API service to maximize scalability, performance, and security:

```mermaid
graph TD
    Client[React Client on Vercel]
    Router[React Router SPA]
    API[Express Server on Render/Railway]
    Atlas[MongoDB Atlas Cluster]
    Cloudinary[Cloudinary CDN]
    SMTP[SMTP Mail Provider]
    Razorpay[Razorpay Payment Gateway]

    Client --> Router
    Client -- HTTPS Request --> API
    API --> Atlas
    API --> Cloudinary
    API --> SMTP
    API --> Razorpay
```

- **Frontend Client**: Hosted on **Vercel** as a static Single Page Application (SPA), utilizing edge network caching and custom rewrite rules.
- **Backend API**: Hosted on **Render** or **Railway** as a state-managed, secured web service running on Node.js.
- **Database**: Dedicated managed cluster on **MongoDB Atlas** with IP whitelisting.
- **Asset/Media Management**: Media files (avatars, gig attachments) uploaded to **Cloudinary** for image processing and content delivery.
- **Email Notification Engine**: Outgoing authentication, verification, and transaction receipts routed via a production **SMTP server**.
- **Payment Processing**: Payment checkout and secure billing webhooks handled via **Razorpay**.

---

## 📁 1. MongoDB Atlas Database Setup

MongoDB Atlas provides a fully-managed database-as-a-service. Follow these steps to set up your production database:

### Step 1: Create a Cluster
1. Log in or sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new project named `SkillSphere`.
3. Deploy a new Database cluster (choose the **M0 Shared Free Tier** or a dedicated tier based on your usage). Select your preferred cloud provider (e.g., AWS) and region nearest to your application servers.

### Step 2: Configure Database Users & Roles
1. Navigate to **Security** -> **Database Access** in the left sidebar.
2. Click **Add New Database User**.
3. Set the authentication method to **Password**. Choose a strong username (e.g., `skillsphere_prod`) and generate a secure password.
4. Set the **Database User Privileges** to `Read and write to any database`.
5. Click **Add User**.

### Step 3: Configure Network Access (IP Whitelisting)
Since Render/Railway application instances run on dynamic server IPs, you must whitelist access from any IP address to allow your backend to establish database connections:
1. Navigate to **Security** -> **Network Access** in the left sidebar.
2. Click **Add IP Address**.
3. Under the **Access List Entry**, click **Allow Access From Anywhere** (which inserts `0.0.0.0/0`).
4. (Optional) Provide a comment such as `Allow traffic from Render/Railway API instances`.
5. Click **Confirm**.

### Step 4: Retrieve the Connection String
1. Go to the **Database** menu (formerly Clusters) under Deployment.
2. Click the **Connect** button next to your cluster.
3. Choose **Drivers** (under "Connect to your application").
4. Copy the connection URI string. It will look like this:
   `mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
5. Replace `<username>` and `<password>` with the credentials created in Step 2. Keep this URI ready for your backend environment variables configuration (`MONGODB_URI`).

---

## ☁️ 2. Cloudinary Media Integration

Cloudinary manages avatar photos, portfolio media, and task attachments with automatic format delivery.

### Step 1: Obtain API Credentials
1. Register or sign in to your [Cloudinary Dashboard](https://cloudinary.com).
2. On your main dashboard view, note down your **Product Environment Credentials**:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

### Step 2: Configure Folder Structures
*Note: SkillSphere will automatically handle folders specified in config files, but ensure your API Key and Secret are never checked into git repos.*

---

## 🖥️ 3. Backend Deployment (Render or Railway)

Choose either **Render** or **Railway** for hosting the Node.js backend.

### Option A: Hosting on Render
1. Sign in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository.
4. Configure the service settings:
   - **Name**: `skillsphere-backend`
   - **Region**: Choose the region closest to your MongoDB Atlas cluster.
   - **Branch**: `main` or your production branch.
   - **Root Directory**: Leave blank (the backend package is at the root).
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Choose the **Free** instance type (or upgrade to a starter tier to prevent spin-down/cold-starts).
6. Click **Advanced** and scroll down to the **Environment Variables** section. Add all the variables detailed in the [Environment Variables Reference](#-5-environment-variables-reference) section below.
7. Under **Health Check Path**, enter `/api/v1/health` (or your application health check path) to allow Render to monitor server boots.
8. Click **Create Web Service**.

### Option B: Hosting on Railway
1. Sign in to your [Railway Dashboard](https://railway.app).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select your repository.
4. Choose to configure the service before deploying:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Navigate to the **Variables** tab for the service.
6. Click **Raw Editor** and copy-paste your environment variables in standard `KEY=VALUE` format, or enter them individually using the UI form. Refer to the table below.
7. Under **Settings**, click **Generate Domain** to get a public endpoint URL.

---

## 🎨 4. Frontend Deployment (Vercel)

Vercel provides performance hosting tailored for React Single Page Applications.

### Step 1: Configure Project
1. Sign in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Import your GitHub repository.
4. Configure Project settings:
   - **Project Name**: `skillsphere-frontend`
   - **Framework Preset**: `Create React App` (or `Other` as it automatically detects react-scripts).
   - **Root Directory**: Set this to **`frontend`** (Click "Edit" next to Root Directory and select the `frontend` folder, then click **Continue**).
5. Under the **Build and Development Settings**, confirm that:
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`
6. Expand **Environment Variables** and add the following:
   - **`REACT_APP_API_URL`**: Point this to your deployed backend API URL (e.g. `https://skillsphere-backend.onrender.com/api/v1`).
7. Click **Deploy**.

> [!NOTE]
> **Vercel Single-Page Application (SPA) Routing**:
> The `frontend/vercel.json` configuration file is already initialized with:
> ```json
> {
>   "rewrites": [
>     { "source": "/(.*)", "destination": "/index.html" }
>   ]
> }
> ```
> This ensures that when users reload pages like `/gigs` or `/profile` directly in their browser, Vercel routes the request to `index.html` allowing React Router to correctly render the clientside page instead of showing a `404 Not Found` error.

---

## 🔑 5. Environment Variables Reference

Ensure these configuration keys are loaded securely. **Do not commit `.env` files into source control.**

### Backend Environment Variables (`skillsphere-backend` on Render/Railway)

| Environment Variable | Required | Example/Format | Description |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Yes | `production` | Set to `production` to trigger security mechanisms, cookie restrictions, and optimized logs. |
| `PORT` | Yes | `5000` | The port the Express application runs on. This is automatically assigned by Render/Railway, but declare it as fallback. |
| `MONGODB_URI` | Yes | `mongodb+srv://skillsphere_prod:PASSWORD@cluster0.xxxx.mongodb.net/skillsphere` | MongoDB Atlas cluster connection URI. |
| `CORS_ORIGIN` | Yes | `https://skillsphere-frontend.vercel.app` | **CRITICAL**: Set to the exact deployed URL of your Vercel frontend. *Do not include a trailing slash, and do not use wildcard `*` because credentials are enabled.* |
| `CLIENT_URL` | Yes | `https://skillsphere-frontend.vercel.app` | Base client URL used in email templates and redirection paths. |
| `ACCESS_TOKEN_SECRET` | Yes | *`cryptographic_random_string`* | Secure key used to sign JWT Access Tokens. (Run `openssl rand -hex 64` to generate). |
| `ACCESS_TOKEN_EXPIRY` | Yes | `15m` | Lifetime of the JWT Access Token (recommended `15m` or `30m`). |
| `REFRESH_TOKEN_SECRET`| Yes | *`cryptographic_random_string`* | Secure key used to sign JWT Refresh Tokens. |
| `REFRESH_TOKEN_EXPIRY`| Yes | `7d` | Lifetime of the JWT Refresh Token (recommended `7d` or `30d`). |
| `SMTP_HOST` | Yes | `smtp.resend.com` | Production mail server host. |
| `SMTP_PORT` | Yes | `587` or `465` | SMTP transmission port. |
| `SMTP_USER` | Yes | `resend` or `your_username` | SMTP authorization username. |
| `SMTP_PASS` | Yes | *`smtp_secure_password`* | SMTP authorization password or secret key. |
| `SMTP_FROM_EMAIL` | Yes | `no-reply@yourcustomdomain.com` | Outbound sender email address. |
| `CLOUDINARY_CLOUD_NAME`| Yes | `skillsphere-cdn` | Cloudinary Product Environment Cloud Name. |
| `CLOUDINARY_API_KEY` | Yes | `123456789012345` | Cloudinary credentials identifier key. |
| `CLOUDINARY_API_SECRET`| Yes | *`cloudinary_api_secret_key`*| Cloudinary signature secret key. |
| `HUGGINGFACE_API_KEY` | No | *`hf_api_key`* | Hugging Face token for AI categorization or recommendation matching services. |
| `RAZORPAY_KEY_ID` | No | `rzp_live_xxxxxxxx` | Razorpay Live Gateway Client ID. |
| `RAZORPAY_KEY_SECRET` | No | *`razorpay_live_secret_key`*| Razorpay Live Gateway signing credentials. |
| `RAZORPAY_WEBHOOK_SECRET`| No | *`razorpay_webhook_secret`*| Signing secret to verify event headers on incoming billing webhooks. |

### Frontend Environment Variables (`skillsphere-frontend` on Vercel)

| Environment Variable | Required | Example/Format | Description |
| :--- | :---: | :--- | :--- |
| `REACT_APP_API_URL` | Yes | `https://skillsphere-backend.onrender.com/api/v1` | Publicly accessible root URL of the deployed backend server API endpoints. |

---

## 🛡️ 6. Post-Deployment Verification & Checklist

Ensure these post-deployment checks are executed to confirm health:

1. **Verify Root Health**: Navigate to the deployed API root or health endpoint (e.g. `https://skillsphere-backend.onrender.com/api/v1/health` or similar check route) to verify that the Express app is running and the database connection succeeded.
2. **Verify CORS**: Open your deployed Vercel frontend, load the login page, and check the browser console. If you see CORS blocking errors, verify that `CORS_ORIGIN` matches your exact Vercel subdomain URL without trailing slashes.
3. **Verify Auth Flow (HttpOnly Cookies)**:
   - Perform a sign-in or registration.
   - Inspect the Application tab in DevTools -> Cookies. Verify that the refresh token cookie is stored under the appropriate secure HTTP context.
4. **Test Media Uploads**: Navigate to the freelancer setup page, upload a profile avatar, and confirm it uploads and renders correctly. In your Cloudinary dashboard, check that the image is successfully compressed and hosted.
5. **Check HTTPS Status**: Ensure both backend and frontend URLs are secured under `https://` protocols, since cookies in production use the `secure: true` flag.

---

## 🧹 7. Maintenance & Logs

- **Backend logs**: Use the Render or Railway dashboard log stream viewer to inspect realtime output:
  - Render: Service Dashboard -> select your service -> **Logs**.
  - Railway: Project Dashboard -> select your service -> **Deployments** -> **Logs**.
- **Database logs**: Access Mongoose queries and connection states via the MongoDB Atlas **Real-time Performance Panel** (Metrics section).
