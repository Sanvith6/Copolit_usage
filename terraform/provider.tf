terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Remote backend for state persistence (required for CI/CD).
  # The S3 bucket and DynamoDB table are created automatically by
  # scripts/setup-backend.sh (also runs in the CI/CD workflow).
  backend "s3" {
    bucket         = "my-aws-project-tfstate"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "my-aws-project-tflock"
    encrypt        = true
  }
}

# Credentials are provided via environment variables (AWS_ACCESS_KEY_ID,
# AWS_SECRET_ACCESS_KEY) or IAM roles. Do not hardcode credentials.
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "Terraform"
    }
  }
}
