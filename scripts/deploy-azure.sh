#!/usr/bin/env bash
# Uploads a Vite build to an Azure Storage static website ($web container).
#
#   scripts/deploy-azure.sh <storage-account> [dist-dir]
#
# Auth: uses your Azure CLI login. Set AZ_AUTH_MODE=key to use the account key
# instead (needs permission to list keys); the pipeline uses the default,
# which needs the "Storage Blob Data Contributor" role on the account.
set -euo pipefail

account="${1:?usage: deploy-azure.sh <storage-account> [dist-dir]}"
dist="${2:-dist}"
auth="${AZ_AUTH_MODE:-login}"

if [[ ! -f "$dist/index.html" ]]; then
  echo "No $dist/index.html. Run npm run build first." >&2
  exit 1
fi

# 1. Hashed assets first, cached for a year. Their names change every build,
#    so the old page keeps working until the new index.html lands.
if [[ -d "$dist/assets" ]]; then
  az storage blob upload-batch \
    --account-name "$account" --auth-mode "$auth" \
    --destination '$web' --destination-path assets --source "$dist/assets" \
    --overwrite --only-show-errors --output none \
    --content-cache-control 'public, max-age=31536000, immutable'
fi

# 2. Everything else (index.html, the art, icons, 3d/ for Cubed's old links, ...) is always
#    revalidated. Not .vite/, the build's manifest for npm run check:budget.
find "$dist" -type f -not -path "$dist/assets/*" -not -path "$dist/.vite/*" | while read -r file; do
  az storage blob upload \
    --account-name "$account" --auth-mode "$auth" \
    --container-name '$web' --name "${file#"$dist"/}" --file "$file" \
    --overwrite --only-show-errors --output none \
    --content-cache-control 'no-cache'
done

url=$(az storage account show --name "$account" --query primaryEndpoints.web --output tsv)
echo "Deployed $dist to $url"
# In GitHub Actions, expose the URL as a step output.
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then echo "url=$url" >>"$GITHUB_OUTPUT"; fi
