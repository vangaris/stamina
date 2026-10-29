# Cloudflare: Pages project (web), R2 buckets, DNS.

locals {
  # Retention is also enforced by the nightly job's own prune step; the lifecycle rule is the backstop.
  backup_retention_seconds = var.backup_retention_days * 86400

  dns_enabled = var.zone_id != null
}

# --- Pages -----------------------------------------------------------------------------------------
# Created by scripts/setup-services.sh as a direct-upload project; CI deploys with wrangler, so
# build settings and per-deployment config are not Terraform's business.

import {
  for_each = var.adopt_existing_resources ? { web = var.pages_project_name } : {}
  to       = cloudflare_pages_project.web
  id       = "${var.cloudflare_account_id}/${each.value}"
}

resource "cloudflare_pages_project" "web" {
  account_id        = var.cloudflare_account_id
  name              = var.pages_project_name
  production_branch = var.pages_production_branch

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [build_config, deployment_configs, source]
  }
}

resource "cloudflare_pages_domain" "web" {
  count = local.dns_enabled && var.web_hostname != null ? 1 : 0

  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.web.name
  name         = var.web_hostname
}

resource "cloudflare_dns_record" "web" {
  count = local.dns_enabled && var.web_hostname != null ? 1 : 0

  zone_id = var.zone_id
  name    = var.web_hostname
  type    = "CNAME"
  content = cloudflare_pages_project.web.subdomain
  proxied = true
  ttl     = 1
  comment = "stamina web (Cloudflare Pages), managed by OpenTofu"
}

resource "cloudflare_dns_record" "extra" {
  for_each = local.dns_enabled ? var.dns_records : {}

  zone_id = var.zone_id
  name    = each.value.name
  type    = each.value.type
  content = each.value.content
  proxied = each.value.proxied
  ttl     = each.value.ttl
  comment = "managed by OpenTofu"
}

# --- R2: backups -----------------------------------------------------------------------------------
# EU jurisdiction: objects stay in the EU. The state bucket (stamina-tfstate) is made by
# infra/bootstrap.sh and is deliberately not managed here: this config's state lives in it.

# Set import_existing_backup_bucket when the bucket was created by hand before the first apply.
import {
  for_each = var.import_existing_backup_bucket ? { backups = var.backup_bucket_name } : {}
  to       = cloudflare_r2_bucket.backups
  id       = "${var.cloudflare_account_id}/${each.value}/eu"
}

resource "cloudflare_r2_bucket" "backups" {
  account_id   = var.cloudflare_account_id
  name         = var.backup_bucket_name
  jurisdiction = "eu"

  lifecycle {
    prevent_destroy = true
  }
}

resource "cloudflare_r2_bucket_lifecycle" "backups" {
  account_id   = var.cloudflare_account_id
  bucket_name  = cloudflare_r2_bucket.backups.name
  jurisdiction = "eu"

  rules = [{
    id      = "expire-backups"
    enabled = true
    conditions = {
      prefix = ""
    }
    delete_objects_transition = {
      condition = {
        type    = "Age"
        max_age = local.backup_retention_seconds
      }
    }
    abort_multipart_uploads_transition = {
      condition = {
        type    = "Age"
        max_age = 86400
      }
    }
  }]
}
