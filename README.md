# Copolit_usage

This repo is made for Copilot usage.

## Terraform AWS Architecture

This project contains a Terraform configuration to deploy a 3-tier AWS architecture consisting of:

- **VPC** with public and private subnets across 2 Availability Zones
- **Internet Gateway** for public internet access
- **NAT Gateway** for outbound internet access from private subnets
- **Application Load Balancer (ALB)** in public subnets
- **Auto Scaling Group** with EC2 instances in private subnets
- **RDS MySQL** database in private subnets
- **S3 Bucket** for static assets with encryption and versioning
- **Security Groups** to control traffic between layers

---

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/terraform.yml`) automates the full lifecycle:

| Job | Trigger | Steps |
|---|---|---|
| **Validate** | PRs and pushes to `main` | `fmt -check` → `init -backend=false` → `validate` |
| **Plan** | PRs and pushes to `main` | `init` → `plan` (using real AWS credentials) |
| **Apply** | Push to `main` only | `init` → `plan` → `apply -auto-approve` (gated by `production` environment) |

---

## Manual Setup Required

### 1. GitHub Secrets (Required)

Go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret Name | Description | How to obtain |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key | AWS Console → IAM → Users → Security credentials → Create access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key | Generated alongside the access key above |

### 2. GitHub Environment (Required for Apply)

The Apply job uses a `production` environment for deployment protection.

1. Go to **Settings → Environments → New environment**
2. Name it **`production`**
3. *(Recommended)* Enable **Required reviewers** so someone must manually approve each deployment

### 3. Terraform Remote Backend (Required for CI/CD)

The pipeline runs on ephemeral GitHub runners, so Terraform state **must** be stored remotely. Create these AWS resources **once** before the first pipeline run:

```bash
# Replace <YOUR_PROJECT_NAME> with your project name (e.g. my-aws-project)

# Create S3 bucket for state
aws s3api create-bucket \
  --bucket <YOUR_PROJECT_NAME>-tfstate \
  --region us-east-1

aws s3api put-bucket-versioning \
  --bucket <YOUR_PROJECT_NAME>-tfstate \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket <YOUR_PROJECT_NAME>-tfstate \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

aws s3api put-public-access-block \
  --bucket <YOUR_PROJECT_NAME>-tfstate \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name <YOUR_PROJECT_NAME>-tflock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

Then **uncomment** the `backend "s3"` block in `terraform/provider.tf` and replace `<YOUR_PROJECT_NAME>` with your actual project name.

### 4. AWS IAM Permissions

The IAM user whose credentials are stored in GitHub Secrets needs permissions for all resources Terraform manages. At minimum, attach these AWS managed policies:

- `AmazonVPCFullAccess`
- `ElasticLoadBalancingFullAccess`
- `AmazonEC2FullAccess`
- `AmazonRDSFullAccess`
- `AmazonS3FullAccess`
- `AmazonDynamoDBFullAccess` *(for state locking via DynamoDB)*

> **Tip:** For production, create a dedicated IAM user (or use OIDC with `aws-actions/configure-aws-credentials`) rather than using your personal credentials.

---

## Local Development

### Prerequisites

- [Terraform](https://www.terraform.io/downloads) >= 1.0
- AWS account with an access key and secret key

### Quick Start

1. **Navigate to the terraform directory:**

   ```bash
   cd terraform
   ```

2. **Create your variable values file:**

   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

3. **Edit `terraform.tfvars`** and optionally customise settings:

   ```hcl
   aws_region  = "us-east-1"
   # db_password is auto-generated — no need to set it
   ```

4. **Export AWS credentials as environment variables:**

   ```bash
   export AWS_ACCESS_KEY_ID="YOUR_AWS_ACCESS_KEY"
   export AWS_SECRET_ACCESS_KEY="YOUR_AWS_SECRET_KEY"
   ```

5. **Initialize Terraform:**

   ```bash
   terraform init
   ```

6. **Preview the infrastructure changes:**

   ```bash
   terraform plan
   ```

7. **Apply the configuration:**

   ```bash
   terraform apply
   ```

8. **After apply completes**, the outputs will display:
   - ALB DNS name (to access your application)
   - RDS endpoint (for database connections)
   - S3 bucket name (for static assets)
   - To retrieve the auto-generated RDS password: `terraform output -raw rds_password`

### Clean Up

To destroy all resources created by Terraform:

```bash
terraform destroy
```

### Configuration Variables

| Variable | Description | Default |
|---|---|---|
| `aws_region` | AWS region | `us-east-1` |
| `project_name` | Prefix for resource names | `my-aws-project` |
| `vpc_cidr` | VPC CIDR block | `10.0.0.0/16` |
| `public_subnet_cidrs` | CIDR blocks for public subnets | `["10.0.1.0/24", "10.0.2.0/24"]` |
| `private_subnet_cidrs` | CIDR blocks for private subnets | `["10.0.3.0/24", "10.0.4.0/24"]` |
| `instance_type` | EC2 instance type | `t3.micro` |
| `ami_id` | AMI ID for EC2 instances (leave empty to use latest Amazon Linux 2023) | `""` |
| `asg_min_size` | ASG minimum instances | `1` |
| `asg_max_size` | ASG maximum instances | `3` |
| `asg_desired_capacity` | ASG desired instances | `2` |
| `db_instance_class` | RDS instance class | `db.t3.micro` |
| `db_name` | Database name | `appdb` |
| `db_username` | Database master username | `admin` |
| `db_password` | Database master password | *(auto-generated if not set — retrieve with `terraform output -raw rds_password`)* |

---

## Quick Reference: All Manual Configuration

Below is a consolidated checklist of **every single thing** you must provide manually, what it is, and exactly where to find or create it.

### ✅ Master Checklist

Use this to track your progress — every box must be checked before the full pipeline works:

- [ ] **Install** Terraform CLI (>= 1.0)
- [ ] **Install** AWS CLI v2
- [ ] **Create** an AWS account and IAM user with required permissions
- [ ] **Obtain** `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` from AWS IAM
- [ ] **Add** both GitHub Secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- [ ] **Create** the `production` GitHub Environment
- [ ] **Create** the S3 bucket and DynamoDB table for Terraform remote state
- [ ] **Uncomment** the `backend "s3"` block in `terraform/provider.tf` and fill in your project name
- [ ] **Copy** `terraform.tfvars.example` → `terraform.tfvars` (all values have sensible defaults)

> **What's automatic:** The RDS database password (`db_password`) is **auto-generated** by Terraform using a secure random password. You do **not** need to choose or store it. After `terraform apply`, retrieve it with `terraform output -raw rds_password`.

---

### 1 · Dependencies (install before local development)

| # | What to install | Minimum Version | Where to get it |
|---|---|---|---|
| 1 | **Terraform CLI** | >= 1.0 | **macOS:** `brew install terraform` · **Linux/Windows:** download from [developer.hashicorp.com/terraform/install](https://developer.hashicorp.com/terraform/install) · Verify: `terraform version` |
| 2 | **AWS CLI** | v2 recommended | **macOS:** `brew install awscli` · **Linux/Windows:** follow [docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) · Verify: `aws --version` |
| 3 | **AWS Account** | — | Sign up at [aws.amazon.com](https://aws.amazon.com/) if you don't have one |

---

### 2 · AWS IAM User & Credentials (needed for both local dev and CI/CD)

You need an **IAM access key pair** (`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`). Here is exactly how to get them:

1. Open [console.aws.amazon.com/iam](https://console.aws.amazon.com/iam/)
2. In the left sidebar click **Users** → **Create user**
3. Name it (e.g. `terraform-deployer`), click **Next**
4. Choose **Attach policies directly** and add these managed policies:
   - `AmazonVPCFullAccess`
   - `ElasticLoadBalancingFullAccess`
   - `AmazonEC2FullAccess`
   - `AmazonRDSFullAccess`
   - `AmazonS3FullAccess`
   - `AmazonDynamoDBFullAccess` *(for state-lock table)*
5. Click **Next** → **Create user**
6. Click the new user name → **Security credentials** tab → **Create access key**
7. Choose **Command Line Interface (CLI)**, check the confirmation, click **Next** → **Create access key**
8. **Copy both values now** — the secret is shown only once:

| Value | What it looks like | Where you just found it |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | `AKIAIOSFODNN7EXAMPLE` | Shown on the "Create access key" success page (step 8) |
| `AWS_SECRET_ACCESS_KEY` | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` | Shown on the same page — **copy it immediately, it won't be shown again** |

---

### 3 · Database Password (`db_password`) — Auto-Generated ✅

| What | Details |
|---|---|
| **What it is** | The master password for the RDS MySQL database created by Terraform |
| **Where it comes from** | **Automatically generated** by Terraform using the `random_password` resource — you do NOT need to provide it |
| **How to retrieve it** | After `terraform apply`: `terraform output -raw rds_password` |
| **Override (optional)** | If you prefer your own password, set `db_password` in `terraform.tfvars` or `export TF_VAR_db_password="YourPassword"` |

---

### 4 · Environment Variables (local development only)

Set these in your terminal before running `terraform plan` or `terraform apply` locally:

| # | Variable Name | Value Source | How to set it |
|---|---|---|---|
| 1 | `AWS_ACCESS_KEY_ID` | From [step 2 above](#2--aws-iam-user--credentials-needed-for-both-local-dev-and-cicd) | `export AWS_ACCESS_KEY_ID="AKIA..."` |
| 2 | `AWS_SECRET_ACCESS_KEY` | From [step 2 above](#2--aws-iam-user--credentials-needed-for-both-local-dev-and-cicd) | `export AWS_SECRET_ACCESS_KEY="wJalr..."` |

> **Note:** `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are read directly by the AWS provider. The `db_password` is auto-generated — you do not need to set `TF_VAR_db_password` unless you want to override the auto-generated value.

---

### 5 · GitHub Secrets (CI/CD pipeline)

The GitHub Actions workflow reads these secrets at runtime. Here is exactly where to add them:

1. Go to your repository on GitHub
2. Click **Settings** (top menu) → **Secrets and variables** (left sidebar) → **Actions**
3. Click **New repository secret**
4. Add each secret one at a time:

| # | Secret Name | What to paste | Where the value comes from |
|---|---|---|---|
| 1 | `AWS_ACCESS_KEY_ID` | Your IAM access key (e.g. `AKIA...`) | [Step 2 above](#2--aws-iam-user--credentials-needed-for-both-local-dev-and-cicd), item 8 |
| 2 | `AWS_SECRET_ACCESS_KEY` | Your IAM secret key (e.g. `wJalr...`) | [Step 2 above](#2--aws-iam-user--credentials-needed-for-both-local-dev-and-cicd), item 8 |

> **How the workflow uses them:** `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are passed as env vars to every Terraform command in the Plan and Apply jobs. The `db_password` is auto-generated by Terraform — no `DB_PASSWORD` secret is needed. See the `env:` blocks in `.github/workflows/terraform.yml`.

---

### 6 · GitHub Environment (CI/CD apply gate)

The Apply job will **not run** unless a `production` environment exists:

1. Go to your repository on GitHub
2. Click **Settings** → **Environments** (left sidebar)
3. Click **New environment**, name it **`production`**, click **Configure environment**
4. *(Recommended)* Under **Environment protection rules**, enable **Required reviewers** and add yourself — this forces manual approval before every deployment

| What | Where it is used |
|---|---|
| `production` environment | `.github/workflows/terraform.yml` line 75: `environment: production` |

---

### 7 · One-Time AWS Resources (remote state backend)

Terraform state must be stored remotely so CI/CD runners can share it. Create these **once** before the first pipeline run:

| # | Resource | Name Format | Purpose | Where to create it |
|---|---|---|---|---|
| 1 | **S3 bucket** | `<YOUR_PROJECT_NAME>-tfstate` | Stores `terraform.tfstate` remotely | AWS Console → S3 → Create bucket, **or** use the AWS CLI commands in the [Terraform Remote Backend](#3-terraform-remote-backend-required-for-cicd) section |
| 2 | **DynamoDB table** | `<YOUR_PROJECT_NAME>-tflock` | Prevents concurrent state modifications | AWS Console → DynamoDB → Create table (partition key: `LockID`, type `String`), **or** use the AWS CLI commands in the [Terraform Remote Backend](#3-terraform-remote-backend-required-for-cicd) section |

After creating them:
1. Open `terraform/provider.tf`
2. **Uncomment** lines 15-21 (the `backend "s3" { ... }` block)
3. Replace every `<YOUR_PROJECT_NAME>` with your actual project name (e.g. `my-aws-project`)

---

### 8 · Terraform Variables File (local development)

| Step | Command / Action |
|---|---|
| Copy the example file | `cp terraform/terraform.tfvars.example terraform/terraform.tfvars` |
| Ready to go! | All variables have sensible defaults. The RDS password is auto-generated. Optionally customise region, instance sizes, etc. — see the [Configuration Variables](#configuration-variables) table above |

> **Security note:** `terraform.tfvars` is already in `.gitignore` so it will never be committed. The auto-generated database password is stored in Terraform state — protect your state file accordingly.
