# shellcheck shell=bash
# Sourced by backup-upload.sh and restore-fetch.sh: points the aws CLI at the R2 bucket.
# Needs R2_ENDPOINT, R2_BACKUP_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.
: "${R2_ENDPOINT:?R2_ENDPOINT is required}"
: "${R2_BACKUP_BUCKET:?R2_BACKUP_BUCKET is required}"
: "${R2_ACCESS_KEY_ID:?R2_ACCESS_KEY_ID is required}"
: "${R2_SECRET_ACCESS_KEY:?R2_SECRET_ACCESS_KEY is required}"

AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
export AWS_DEFAULT_REGION=auto
export AWS_EC2_METADATA_DISABLED=true
# R2 does not accept the default additional checksums of recent aws CLI v2 releases.
export AWS_REQUEST_CHECKSUM_CALCULATION=when_required
export AWS_RESPONSE_CHECKSUM_VALIDATION=when_required

aws_r2() {
  aws --endpoint-url "$R2_ENDPOINT" "$@"
}
