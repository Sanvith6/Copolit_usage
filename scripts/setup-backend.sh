#!/usr/bin/env bash
# setup-backend.sh — Idempotent script to create the S3 bucket and DynamoDB
# table used by Terraform's remote state backend.
#
# Prerequisites:
#   • AWS CLI v2 installed
#   • AWS credentials configured (env vars or ~/.aws/credentials)
#
# Usage:
#   ./scripts/setup-backend.sh                       # uses defaults
#   BACKEND_BUCKET=foo-tfstate BACKEND_TABLE=foo-tflock BACKEND_REGION=us-west-2 \
#       ./scripts/setup-backend.sh                   # override names
set -euo pipefail

BUCKET="${BACKEND_BUCKET:-my-aws-project-tfstate}"
TABLE="${BACKEND_TABLE:-my-aws-project-tflock}"
REGION="${BACKEND_REGION:-us-east-1}"

echo "==> Ensuring S3 bucket '${BUCKET}' exists in ${REGION}..."
if aws s3api head-bucket --bucket "${BUCKET}" 2>/dev/null; then
  echo "    Bucket already exists — skipping creation."
else
  echo "    Creating bucket..."
  if [ "${REGION}" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "${BUCKET}" --region "${REGION}"
  else
    aws s3api create-bucket --bucket "${BUCKET}" --region "${REGION}" \
      --create-bucket-configuration LocationConstraint="${REGION}"
  fi

  aws s3api put-bucket-versioning \
    --bucket "${BUCKET}" \
    --versioning-configuration Status=Enabled

  aws s3api put-bucket-encryption \
    --bucket "${BUCKET}" \
    --server-side-encryption-configuration \
      '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

  aws s3api put-public-access-block \
    --bucket "${BUCKET}" \
    --public-access-block-configuration \
      BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

  echo "    Bucket created and configured."
fi

echo "==> Ensuring DynamoDB table '${TABLE}' exists in ${REGION}..."
if aws dynamodb describe-table --table-name "${TABLE}" --region "${REGION}" >/dev/null 2>&1; then
  echo "    Table already exists — skipping creation."
else
  echo "    Creating table..."
  aws dynamodb create-table \
    --table-name "${TABLE}" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "${REGION}"

  aws dynamodb wait table-exists --table-name "${TABLE}" --region "${REGION}"
  echo "    Table created."
fi

echo "==> Backend resources are ready."
