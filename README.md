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

3. **Edit `terraform.tfvars`** and fill in your AWS credentials and desired settings:

   ```hcl
   aws_access_key = "YOUR_AWS_ACCESS_KEY"
   aws_secret_key = "YOUR_AWS_SECRET_KEY"
   aws_region     = "us-east-1"
   db_password    = "YOUR_STRONG_DB_PASSWORD"
   ```

4. **Initialize Terraform:**

   ```bash
   terraform init
   ```

5. **Preview the infrastructure changes:**

   ```bash
   terraform plan
   ```

6. **Apply the configuration:**

   ```bash
   terraform apply
   ```

7. **After apply completes**, the outputs will display:
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
| `aws_access_key` | AWS access key | *(required)* |
| `aws_secret_key` | AWS secret key | *(required)* |
| `aws_region` | AWS region | `us-east-1` |
| `project_name` | Prefix for resource names | `my-aws-project` |
| `vpc_cidr` | VPC CIDR block | `10.0.0.0/16` |
| `instance_type` | EC2 instance type | `t3.micro` |
| `asg_min_size` | ASG minimum instances | `1` |
| `asg_max_size` | ASG maximum instances | `3` |
| `asg_desired_capacity` | ASG desired instances | `2` |
| `db_instance_class` | RDS instance class | `db.t3.micro` |
| `db_name` | Database name | `appdb` |
| `db_username` | Database master username | `admin` |
| `db_password` | Database master password | *(required)* |
