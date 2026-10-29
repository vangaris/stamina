# Identifiers only. Secrets (API tokens, R2 access keys) are never variables: they come from the
# environment, see docs/infra.md.

variable "adopt_existing_resources" {
  description = "Import the Pages project, the Neon project and the `dev` branch into state. Needed for the first apply only (they already exist); harmless afterwards. Tests turn it off because `tofu test` cannot import."
  type        = bool
  default     = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID (CLOUDFLARE_ACCOUNT_ID)."
  type        = string
}

variable "pages_project_name" {
  description = "Existing Cloudflare Pages project (direct upload) that serves the web app."
  type        = string
  default     = "stamina-web"
}

variable "pages_production_branch" {
  description = "Pages branch that counts as production. Deploys to any other branch name are previews."
  type        = string
  default     = "main"
}

variable "backup_bucket_name" {
  description = "R2 bucket (EU jurisdiction) for the nightly encrypted pg_dump."
  type        = string
  default     = "stamina-backups"
}

variable "import_existing_backup_bucket" {
  description = "Adopt a backup bucket that already exists instead of creating it (first apply only)."
  type        = bool
  default     = false
}

variable "backup_retention_days" {
  description = "Objects in the backup bucket are deleted after this many days."
  type        = number
  default     = 30

  validation {
    condition     = var.backup_retention_days >= 1
    error_message = "backup_retention_days must be at least 1."
  }
}

variable "zone_id" {
  description = "Cloudflare DNS zone ID. null while no domain is owned: then no DNS record or Pages custom domain is created."
  type        = string
  default     = null
}

variable "web_hostname" {
  description = "Custom hostname for the web app (for example app.example.com), inside the zone. Needs zone_id."
  type        = string
  default     = null

  validation {
    condition     = var.web_hostname == null || var.zone_id != null
    error_message = "web_hostname needs zone_id."
  }
}

variable "dns_records" {
  description = "Extra DNS records in the zone (API hostname, Brevo sender-domain authentication, ...). Ignored while zone_id is null."
  type = map(object({
    name    = string
    type    = string
    content = string
    ttl     = optional(number, 1)
    proxied = optional(bool, false)
  }))
  default = {}
}

variable "neon_project_id" {
  description = "Existing Neon project (Frankfurt) to adopt, for example 'shiny-cell-31746257' (NEON_PROJECT_ID)."
  type        = string
}

variable "neon_org_id" {
  description = "Neon organisation owning the project. Only read when the project is created; an adopted project ignores it."
  type        = string
  default     = null
}

variable "neon_dev_branch_id" {
  description = "ID (br-...) of the existing data-free `dev` branch, to adopt it. null leaves `dev` unmanaged: it is never created here, because a branch cut from `main` after launch would copy user data into the Preview parent."
  type        = string
  default     = null
}

variable "sentry_base_url" {
  description = "Sentry API base URL. EU region: https://de.sentry.io/api/ (the provider needs the /api/ suffix)."
  type        = string
  default     = "https://de.sentry.io/api/"
}

variable "sentry_organization" {
  description = "Slug of the Sentry organisation, created by hand in the EU region (SENTRY_ORG)."
  type        = string
}

variable "sentry_team" {
  description = "Slug of the Sentry team that owns the projects. Managed here; adopt an existing one with an import block (docs/infra.md)."
  type        = string
  default     = "stamina"
}

variable "neon_region" {
  description = "Neon region for a newly created project (Frankfurt). An adopted project keeps its own region."
  type        = string
  default     = "aws-eu-central-1"
}
