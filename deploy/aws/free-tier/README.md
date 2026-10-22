# Zero-Rupee (₹0 / $0) AWS Free Tier Deployment Guide

This guide explains how to host and test **UniFlow / SmartEdu Cloud** completely **free of cost (₹0 / $0)** using the **AWS 12-Month Free Tier**.

---

## 1. What Is 100% Free in the AWS Free Tier

| AWS Resource | Free Tier Allocation | Our Usage | Monthly Cost |
| :--- | :--- | :--- | :--- |
| **EC2 Compute** | **750 hours/month** (runs 24/7 all month) of `t2.micro` or `t3.micro` | 1 instance running Frontend, Backend, DB & Redis | **₹0.00** |
| **EBS Storage** | **30 GB** gp2/gp3 SSD storage | 25 GB gp3 SSD storage | **₹0.00** |
| **Data Transfer** | **100 GB/month** internet egress | Typical testing takes < 5 GB | **₹0.00** |
| **S3 Cloud Storage** | **5 GB** standard storage, 20,000 GET, 2,000 PUT | Student assignment and file uploads | **₹0.00** |
| **SSL / HTTPS** | Free Let's Encrypt via Caddy / Certbot | Automated SSL certificates | **₹0.00** |

---

## 2. What To AVOID So You Are Never Charged ₹1

> [!CAUTION]
> The following AWS services **DO NOT** have a permanent free tier and will bill you money if launched. **DO NOT ENABLE THEM**:
> 1. **DO NOT create a NAT Gateway** (Costs ~₹2,700 / $32 per month). Use a Public Subnet with Internet Gateway instead (100% Free).
> 2. **DO NOT create an Application Load Balancer (ALB)** (Costs ~₹1,700 / $20 per month). Use Caddy / Nginx on the EC2 instance instead (100% Free).
> 3. **DO NOT create a Multi-AZ RDS instance** (Costs extra).
> 4. **DO NOT enable AWS WAFv2** (Costs ~₹500 / $5 per month).
> 5. **DO NOT choose instances larger than `t2.micro` or `t3.micro`**. Always look for the green **"Free tier eligible"** badge in the AWS Console.

---

## 3. Step-by-Step Deployment (Takes 10 Minutes)

### Step 1: Launch a Free Tier EC2 Instance
1. Log in to the [AWS Management Console](https://console.aws.amazon.com/).
2. In the top search bar, type **EC2** and click **Launch instance**.
3. Configure the instance:
   - **Name**: `smartedu-free-tier`
   - **Application and OS Image**: Select **Ubuntu** $\rightarrow$ **Ubuntu Server 24.04 LTS (HVM)** *(marked "Free tier eligible")*.
   - **Instance type**: Select **`t3.micro`** (or **`t2.micro`** if `t3.micro` is not available in your region) *(marked "Free tier eligible")*.
   - **Key pair (login)**: Click **Create new key pair**, name it `smartedu-key`, download the `.pem` file to your computer.
   - **Network settings**:
     - Check **Allow SSH traffic from Anywhere** (0.0.0.0/0).
     - Check **Allow HTTP traffic from the internet** (port 80).
     - Check **Allow HTTPS traffic from the internet** (port 443).
   - **Configure storage**: Set to **25 GiB gp3** *(up to 30 GB is free)*.
   - **Advanced details**: Scroll down to **User data** and paste the contents of `deploy/aws/free-tier/user-data.sh`.
4. Click **Launch instance**.

---

### Step 2: Connect to Your EC2 Instance
In your terminal / PowerShell:
```powershell
ssh -i "path\to\smartedu-key.pem" ubuntu@<YOUR_EC2_PUBLIC_IP>
```

---

### Step 3: Clone Your Code and Configure Environment
On the EC2 instance:
```bash
# Clone project repository
git clone <YOUR_GIT_REPO_URL> ~/app
cd ~/app

# Create .env file for production
cp backend/.env.example backend/.env
```

Set your production environment variables in `backend/.env`:
```ini
ENVIRONMENT=production
DEBUG=false
SEED_SAMPLE_DATA=false

# Generate secure secrets
SECRET_KEY=change-this-to-a-secure-random-64-character-string
JWT_SECRET_KEY=change-this-to-another-secure-random-64-character-string
DATABASE_URL=postgresql://smartedu_user:your_db_password@db:5432/smartedu_db
```

---

### Step 4: Start the Entire Application
Run with 1 command using Docker Compose:
```bash
docker compose up -d --build
```
This automatically starts:
- **PostgreSQL 16** container (with durable volume)
- **Redis 7** container (cache & session storage)
- **FastAPI Backend** (with Alembic migrations applied automatically)
- **Next.js Frontend** (production-optimized build)

---

### Step 5: Bootstrap the Initial Administrator User
Create your genuine administrator login with **zero dummy records**:
```bash
docker compose exec backend python -m app.cli.bootstrap_admin \
  --email "admin@youruniversity.edu" \
  --first-name "Super" \
  --last-name "Admin"
```
It will output your temporary initial password securely.

---

### Step 6: Enable Free Automatic HTTPS (Optional)
Copy the `Caddyfile` to `/etc/caddy/Caddyfile`:
```bash
sudo cp deploy/aws/free-tier/Caddyfile /etc/caddy/Caddyfile
sudo systemctl restart caddy
```
Now access `http://<YOUR_EC2_PUBLIC_IP>` or your free domain in your browser!

---

## 4. Cost Verification
At the end of the month, your AWS billing dashboard will show:
- EC2 `t3.micro`: **$0.00** (Within 750 free hours)
- EBS 25 GB gp3: **$0.00** (Within 30 GB free tier)
- Total Billed: **₹0.00 / $0.00**
