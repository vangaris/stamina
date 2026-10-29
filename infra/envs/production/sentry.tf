# Sentry, EU region (https://de.sentry.io). The organisation is created by hand when signing up: the
# region is chosen then and an organisation-level token cannot create organisations.
#
# Personal-data scrubbing is organisation-level and has no provider resource: see docs/infra.md
# ("Sentry settings OpenTofu cannot manage").

data "sentry_organization" "this" {
  slug = var.sentry_organization
}

resource "sentry_team" "stamina" {
  organization = data.sentry_organization.this.slug
  name         = var.sentry_team
  slug         = var.sentry_team
}

resource "sentry_project" "web" {
  organization = data.sentry_organization.this.slug
  teams        = [sentry_team.stamina.slug]
  name         = "stamina-web"
  slug         = "stamina-web"
  platform     = "javascript-vue"

  # The key is managed below so it has a stable name.
  default_key = false
}

resource "sentry_project" "api" {
  organization = data.sentry_organization.this.slug
  teams        = [sentry_team.stamina.slug]
  name         = "stamina-api"
  slug         = "stamina-api"
  platform     = "deno"

  default_key = false
}

resource "sentry_key" "web" {
  organization = data.sentry_organization.this.slug
  project      = sentry_project.web.slug
  name         = "production"
}

resource "sentry_key" "api" {
  organization = data.sentry_organization.this.slug
  project      = sentry_project.api.slug
  name         = "production"
}
