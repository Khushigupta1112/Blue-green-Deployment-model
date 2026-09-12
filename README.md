# Enterprise Blue-Green & Canary Deployment Orchestrator


---

## 📌 Executive Summary & Architecture

Blue-Green Deployment is a deployment strategy that reduces downtime and risk by running two identical hardware/software environments, called **Blue (v1.0.0 Stable)** and **Green (v2.0.0 New Release)**. At any time, only one environment is live and serving production traffic.

This platform enhances basic deployment switching by adding **Canary Weighted Traffic Splitting**, **Automated Circuit-Breaker Rollback**, **Live Telemetry**, and a **Visual Control Dashboard** designed for local Windows laptop execution as well as Docker / Kubernetes containerization.

```
                      ┌──────────────────────────────────────────────┐
                      │    Interactive Visual Control Dashboard      │
                      │  (Real-Time Traffic, Latency, Chaos Control)  │
                      └──────────────────────┬───────────────────────┘
                                             │ Controls & Telemetry API
                                             ▼
 ┌─────────────────┐           ┌──────────────────────────────────────────┐
 │  Client Traffic │ ────────> │   Smart Reverse Proxy / Traffic Router   │
 │ Load Generator  │           │   (Supports 100% Blue, 100% Green,       │
 └─────────────────┘           │    Canary Traffic Splitting & Rollback)  │
                               └────────────┬─────────────────┬───────────┘
                                            │                 │
                                 80% / 100% │                 │ 20% / 0%
                                            ▼                 ▼
                               ┌──────────────────┐  ┌──────────────────┐
                               │  BLUE SERVICE    │  │  GREEN SERVICE   │
                               │  v1.0 (Stable)   │  │  v2.0 (New Rel)  │
                               │  Port 8081       │  │  Port 8082       │
                               └──────────────────┘  └──────────────────┘
```

---

## ✨ Key Features (Project Highlights)

1. **Zero-Downtime Traffic Routing**: Instantaneous switching between Blue (v1.0.0) and Green (v2.0.0) without dropping active HTTP requests.
2. **Canary Weighted Traffic Splitting**: Dynamically route user traffic by percentage (e.g., 90% Blue / 10% Green -> 50/50 -> 0/100) using a random probability selector.
3. **Automated Health Probes & Circuit-Breaker Rollback**: Background health monitor probes services every 3 seconds. If Green exhibits 500 status codes, high latency, or connection drops, traffic **automatically reverts 100% back to Blue** instantaneously with visual alerts.
4. **Interactive Telemetry Dashboard (Web UI)**: Dark-mode dashboard built with Tailwind CSS, Chart.js, and FontAwesome featuring:
   - Live Topology Map with animated SVG traffic streams
   - Real-Time Traffic Distribution Doughnut Chart
   - Latency & Status Code Line Chart
   - Instant Deployment Buttons & Weight Range Slider
   - Built-in Traffic Simulator (10 req/sec)
5. **Chaos Engineering Engine**: Test auto-rollback live during project presentations by injecting synthetic 500 errors or 1.5s latency into the Green release.
6. **Dual Deployment Capabilities**:
   - **Local Windows Mode**: Run natively with Node.js & PowerShell (`start-all.ps1`).
   - **Container & K8s Mode**: Complete `docker-compose.yml` and Kubernetes manifests (`k8s/*.yaml`) included.

---

## 📁 Repository Structure

```
blue-green-deployment-platform/
├── blue-service/            # Blue Environment v1.0.0 (Node.js API - Port 8081)
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── green-service/           # Green Environment v2.0.0 (Node.js API - Port 8082 + Chaos)
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── proxy/                   # Smart Dynamic Traffic Router & Telemetry Proxy (Port 8000)
│   ├── router.js
│   ├── package.json
│   └── Dockerfile
├── dashboard/               # Frontend Visual Control Center
│   └── public/
│       └── index.html       # Single Page Telemetry Dashboard
├── scripts/                 # PowerShell Automation Scripts
│   ├── start-all.ps1        # One-Click Launcher for Windows
│   ├── switch-traffic.ps1   # CLI Traffic Switcher Tool
│   └── test-load.ps1        # Zero-Downtime Test Verifier
├── k8s/                     # Kubernetes Manifests
│   ├── blue-deployment.yaml
│   ├── green-deployment.yaml
│   ├── service-router.yaml
│   └── ingress.yaml
├── .github/workflows/       # CI/CD Pipeline Configuration
│   └── blue-green-cicd.yml
├── docker-compose.yml       # Container Orchestration
└── README.md                # Documentation & Viva Q&A Guide
```

---

## 🚀 Quick Start Guide (Windows Laptop)

### Prerequisites
- **Node.js**: v18+ installed
- **PowerShell**: Windows PowerShell or PowerShell Core

### Step 1: Install Dependencies & Start All Services
Open PowerShell as Administrator in the project folder and run:

```powershell
.\scripts\start-all.ps1
```

Or start manually in three terminal windows:
```cmd
:: Terminal 1: Blue Service
cd blue-service && npm install && npm start

:: Terminal 2: Green Service
cd green-service && npm install && npm start

:: Terminal 3: Smart Router Proxy & Dashboard
cd proxy && npm install && npm start
```

### Step 2: Open Dashboard in Browser
Navigate to:
👉 **`http://localhost:8000`**

---

## 🧪 Demonstration & Verification Guide

### 1. Test Zero-Downtime Deployment
1. Click **"Start Load Generator"** on the dashboard.
2. Click **"Switch 100% to BLUE"**, then **"Canary Release"**, then **"Promote 100% to GREEN"**.
3. Observe the **Success Rate stays at 100%** with zero dropped requests.

### 2. Test Automated Rollback (Chaos Injection)
1. Switch traffic to **GREEN** (or Canary 50/50).
2. Click **"Inject 500 Error (Green)"**.
3. Within 3 seconds, observe:
   - The health probe detects Green degradation.
   - The system triggers an **AUTOMATED ROLLBACK**!
   - Traffic instantly shifts back 100% to **BLUE**.
   - An alert log appears in the Live Terminal.
