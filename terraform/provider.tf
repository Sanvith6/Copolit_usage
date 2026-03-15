terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote backend for state persistence (required for CI/CD).
  # Create the S3 bucket and DynamoDB table before enabling this block.
  # See README.md for setup instructions.
  #
  # backend "s3" {
  #   bucket         = "<YOUR_PROJECT_NAME>-tfstate"
  #   key            = "terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "<YOUR_PROJECT_NAME>-tflock"
  #   encrypt        = true
  # }
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
