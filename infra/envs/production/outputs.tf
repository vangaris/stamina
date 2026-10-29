output "pages_project_subdomain" {
  description = "Pages production hostname (<project>.pages.dev)."
  value       = cloudflare_pages_project.web.subdomain
}

output "backup_bucket" {
  description = "EU-jurisdiction R2 bucket for nightly backups (R2_BACKUP_BUCKET)."
  value       = cloudflare_r2_bucket.backups.name
}

output "r2_endpoint" {
  description = "S3 endpoint of the EU-jurisdiction R2 buckets (R2_ENDPOINT)."
  value       = "https://${var.cloudflare_account_id}.eu.r2.cloudflarestorage.com"
}

output "neon_project_id" {
  description = "Neon project ID (NEON_PROJECT_ID)."
  value       = neon_project.stamina.id
}

output "neon_default_branch_id" {
  description = "Neon ID of `main`, the production branch."
  value       = neon_project.stamina.default_branch_id
}

output "neon_dev_branch_id" {
  description = "Neon ID of `dev`, the data-free parent of Preview branches. null while unmanaged."
  value       = try(neon_branch.dev["dev"].id, null)
}

# DSNs only identify the project to Sentry (they ship in the web bundle), but they are still marked
# sensitive so they never show up in a posted plan. Read one with `tofu output -raw sentry_dsn_api`.
output "sentry_dsn_api" {
  description = "DSN for the API (SENTRY_DSN_API)."
  value       = sentry_key.api.dsn["public"]
  sensitive   = true
}

output "sentry_dsn_web" {
  description = "DSN for the web app (SENTRY_DSN_WEB)."
  value       = sentry_key.web.dsn["public"]
  sensitive   = true
}
