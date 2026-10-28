# Install gh and move the repo and map to GitHub

Type: task
Status: open

## Question

Install the GitHub CLI, authenticate, create a private GitHub repo for Stamina, push `main` and all `research/*` and `prototype/*` branches, and decide whether to migrate this map from `.scratch/` to GitHub Issues (sub-issues + native blocking) by rerunning `/setup-matt-pocock-skills`. Then bootstrap the repo per Engineering process: squash-only merges with branch deletion, the Projects board (columns + fields), issue forms + PR template, labels (`agent`, types, areas), CODEOWNERS, Dependabot config, and a check whether branch protection / rulesets work on a private repo on GitHub Free. If they don't, **[Vang]** decides on GitHub Pro at US$4/month. HITL: Vang runs `brew install gh && gh auth login` and picks the repo owner/name; the agent does the rest. Answer records the repo URL, whether the map moved, and the protection outcome.
