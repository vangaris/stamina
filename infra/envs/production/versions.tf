terraform {
  required_version = ">= 1.10.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "5.28.1"
    }
    # Community provider sponsored by Neon (https://github.com/kislerdm/terraform-provider-neon).
    neon = {
      source  = "kislerdm/neon"
      version = "0.18.0"
    }
    # Community provider sponsored by Sentry (https://github.com/jianyuan/terraform-provider-sentry).
    sentry = {
      source  = "jianyuan/sentry"
      version = "0.15.8"
    }
  }

  # State lives in the EU-jurisdiction R2 bucket made by infra/bootstrap.sh. Cloudflare's documented
  # S3-compatible settings (https://developers.cloudflare.com/terraform/advanced-topics/remote-backend/).
  # The bucket's S3 endpoint (https://<account>.eu.r2.cloudflarestorage.com) and the R2 access key
  # come from AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, which infra/tofu.sh
  # sets; backends cannot read variables, and none of those values belong in a file.
  backend "s3" {
    bucket = "stamina-tfstate"
    key    = "production/terraform.tfstate"
    region = "auto"

    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
    use_path_style              = true

    # A lock object next to the state; R2 evaluates If-None-Match writes atomically.
    use_lockfile = true
  }
}

# The API token comes from CLOUDFLARE_API_TOKEN.
provider "cloudflare" {}

# The API key comes from NEON_API_KEY.
provider "neon" {}

# The token comes from SENTRY_AUTH_TOKEN. Stamina's Sentry organisation lives in the EU (de.sentry.io).
provider "sentry" {
  base_url = var.sentry_base_url
}
