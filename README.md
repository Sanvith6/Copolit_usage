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
| `DB_PASSWORD` | RDS database master password | Choose a strong password (min 8 chars, avoid `/`, `"`, `@`, spaces) |

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

3. **Edit `terraform.tfvars`** and fill in your desired settings:

   ```hcl
   aws_region  = "us-east-1"
   db_password = "YOUR_STRONG_DB_PASSWORD"
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
| `db_password` | Database master password | *(required — no default)* |

---

## Quick Reference: All Manual Configuration

Below is a consolidated checklist of everything you must provide manually before the pipeline and infrastructure work end-to-end.

### Dependencies (install before local development)

| Dependency | Minimum Version | Install Guide |
|---|---|---|
| [Terraform CLI](https://www.terraform.io/downloads) | >= 1.0 | `brew install terraform` / [official docs](https://developer.hashicorp.com/terraform/install) |
| [AWS CLI](https://aws.amazon.com/cli/) | v2 (recommended) | `brew install awscli` / [official docs](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) |
| AWS account with IAM credentials | — | [AWS Console](https://console.aws.amazon.com/) |

### Environment Variables (local development)

| Variable | Description | Example |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key | `export AWS_ACCESS_KEY_ID="AKIA..."` |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key | `export AWS_SECRET_ACCESS_KEY="wJalr..."` |
| `TF_VAR_db_password` | RDS master password (passed to Terraform's `db_password` variable) | `export TF_VAR_db_password="MyStr0ng!Pass"` |

> **Note:** `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are read directly by the AWS provider. `TF_VAR_db_password` is the Terraform convention for setting the `db_password` variable via the environment instead of a `.tfvars` file. Alternatively, set `db_password` in your local `terraform.tfvars` (see Quick Start above).

### GitHub Secrets (CI/CD pipeline)

| Secret Name | Maps To | Description |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | AWS provider credentials | IAM access key for Terraform to manage AWS resources |
| `AWS_SECRET_ACCESS_KEY` | AWS provider credentials | IAM secret key (paired with the access key above) |
| `DB_PASSWORD` | `TF_VAR_db_password` | RDS master password used during plan and apply |

### GitHub Environment (CI/CD apply gate)

| Environment Name | Purpose |
|---|---|
| `production` | Required for the Apply job. Optionally enable **Required reviewers** for manual approval before each deployment. |

### One-Time AWS Resources (remote state backend)

Before the first CI/CD run, create these resources manually (see full commands in the [Terraform Remote Backend](#3-terraform-remote-backend-required-for-cicd) section above):

| Resource | Purpose |
|---|---|
| S3 bucket (`<PROJECT>-tfstate`) | Stores Terraform state file remotely |
| DynamoDB table (`<PROJECT>-tflock`) | Provides state locking to prevent concurrent modifications |

After creating these, uncomment the `backend "s3"` block in `terraform/provider.tf` and replace `<YOUR_PROJECT_NAME>` with your actual project name.
