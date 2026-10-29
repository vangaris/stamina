# Neon (Frankfurt). The project already exists (scripts/setup-services.sh), so it is adopted, never
# recreated: every attribute that could force a replacement is ignored, and destroy is blocked.
#
# Branches: `main` is the project's default (root) branch and holds production data. `dev` is the
# data-free parent every Preview branch is cut from. Per-PR `preview/pr-N` branches are made and
# deleted by .github/workflows/preview.yml, not here.

import {
  for_each = var.adopt_existing_resources ? { stamina = var.neon_project_id } : {}
  to       = neon_project.stamina
  id       = each.value
}

resource "neon_project" "stamina" {
  name      = "stamina"
  region_id = var.neon_region
  org_id    = var.neon_org_id

  # Keep database passwords out of the state file; DATABASE_URLs come from the Neon console.
  store_password = "no"

  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      region_id,
      org_id,
      pg_version,
      branch,
      primary_compute,
      history_retention_seconds,
      autoscaling_limit_min_cu,
      autoscaling_limit_max_cu,
      suspend_timeout_seconds,
    ]
  }
}

locals {
  # `dev` is adopt-only: it is never created here. A branch cut from `main` once users exist would
  # copy their data into the Preview parent, so it is made right after the project (while `main`
  # is empty) by scripts/setup-services.sh and adopted by its ID.
  neon_dev_branches = var.neon_dev_branch_id == null ? {} : { dev = var.neon_dev_branch_id }
  neon_dev_imports  = var.adopt_existing_resources ? local.neon_dev_branches : {}
}

import {
  for_each = local.neon_dev_imports
  to       = neon_branch.dev[each.key]
  id       = "${var.neon_project_id}/${each.value}"
}

resource "neon_branch" "dev" {
  for_each = local.neon_dev_branches

  project_id = neon_project.stamina.id
  name       = each.key
  parent_id  = neon_project.stamina.default_branch_id

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [parent_id, parent_lsn, parent_timestamp]
  }
}
