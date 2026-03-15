terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Note: For production, prefer using environment variables (AWS_ACCESS_KEY_ID,
# AWS_SECRET_ACCESS_KEY), AWS profiles, or IAM roles instead of passing
# credentials as Terraform variables.
provider "aws" {
  region     = var.aws_region
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key

  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "Terraform"
    }
  }
}
