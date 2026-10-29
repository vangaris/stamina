# Offline checks of the conditional parts of the config. Every provider is mocked, so no
# credentials and no network are needed: `tofu test` runs in CI and locally.

mock_provider "cloudflare" {}
mock_provider "neon" {}
mock_provider "sentry" {
  mock_resource "sentry_key" {
    defaults = {
      dsn = { public = "https://public@o0.ingest.de.sentry.io/0" }
    }
  }
}

variables {
  adopt_existing_resources = false
  cloudflare_account_id    = "0123456789abcdef0123456789abcdef"
  neon_project_id          = "shiny-cell-31746257"
  sentry_organization      = "vangaris"
}

run "default_plan_has_no_dns_and_no_dev_branch" {
  command = plan

  assert {
    condition     = length(cloudflare_dns_record.extra) == 0 && length(cloudflare_dns_record.web) == 0 && length(cloudflare_pages_domain.web) == 0
    error_message = "Without a zone no DNS record or Pages domain may be planned."
  }

  assert {
    condition     = length(neon_branch.dev) == 0
    error_message = "`dev` must not be planned unless its ID is supplied."
  }
}

run "backups_are_eu_and_expire_after_30_days" {
  command = plan

  assert {
    condition     = cloudflare_r2_bucket.backups.jurisdiction == "eu" && cloudflare_r2_bucket_lifecycle.backups.jurisdiction == "eu"
    error_message = "The backup bucket must be in the EU jurisdiction."
  }

  assert {
    condition     = cloudflare_r2_bucket_lifecycle.backups.rules[0].delete_objects_transition.condition.max_age == 30 * 86400
    error_message = "Backups must expire after 30 days."
  }
}

run "zone_creates_web_domain_and_extra_records" {
  command = plan

  variables {
    zone_id      = "zone123"
    web_hostname = "app.example.com"
    dns_records = {
      dkim = { name = "mail._domainkey.example.com", type = "TXT", content = "v=DKIM1; k=rsa; p=abc" }
    }
  }

  assert {
    condition     = length(cloudflare_dns_record.web) == 1 && length(cloudflare_pages_domain.web) == 1 && length(cloudflare_dns_record.extra) == 1
    error_message = "A zone and hostname must plan the Pages domain, its CNAME and the extra records."
  }
}

run "dev_branch_is_adopted_when_its_id_is_given" {
  command = plan

  variables {
    neon_dev_branch_id = "br-snowy-mountain-a5jkb18i"
  }

  assert {
    condition     = length(neon_branch.dev) == 1
    error_message = "`dev` must be planned when its ID is supplied."
  }
}

run "hostname_without_zone_is_rejected" {
  command = plan

  variables {
    web_hostname = "app.example.com"
  }

  expect_failures = [var.web_hostname]
}
