#!/usr/bin/env bash
# One-time setup so GitHub Actions can deploy to the Azure static website
# without storing any Azure secret (OpenID Connect / federated credentials).
#
#   scripts/setup-azure-deploy.sh
#
# Needs: Azure CLI logged in as someone who can create app registrations and
# assign roles on the storage account, and the GitHub CLI logged in with admin
# rights on the repo. Safe to re-run; it skips what already exists.
set -euo pipefail

REPO="${REPO:-austinthedeveloper/picross}"
RESOURCE_GROUP="${RESOURCE_GROUP:-picross}"
ACCOUNT="${ACCOUNT:-picross}"
APP_NAME="${APP_NAME:-picross-github-deploy}"
ENVIRONMENT="production"

echo "== Azure app registration: $APP_NAME"
app_id=$(az ad app list --display-name "$APP_NAME" --query "[0].appId" -o tsv)
if [[ -z "$app_id" ]]; then
  app_id=$(az ad app create --display-name "$APP_NAME" --query appId -o tsv)
fi
az ad sp show --id "$app_id" -o none 2>/dev/null || az ad sp create --id "$app_id" -o none
sp_id=$(az ad sp show --id "$app_id" --query id -o tsv)

echo "== Trust GitHub Actions jobs in the '$ENVIRONMENT' environment of $REPO"
if ! az ad app federated-credential list --id "$app_id" \
  --query "[?name=='github-$ENVIRONMENT'].name" -o tsv | grep -q .; then
  az ad app federated-credential create --id "$app_id" -o none --parameters "{
    \"name\": \"github-$ENVIRONMENT\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"repo:$REPO:environment:$ENVIRONMENT\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }"
fi

echo "== Roles on the storage account only"
scope=$(az storage account show -n "$ACCOUNT" -g "$RESOURCE_GROUP" --query id -o tsv)
for role in "Storage Blob Data Contributor" "Reader"; do
  az role assignment create --assignee-object-id "$sp_id" \
    --assignee-principal-type ServicePrincipal --role "$role" --scope "$scope" -o none
done

echo "== GitHub environment '$ENVIRONMENT' (deploys from v* tags and main only)"
gh api -X PUT "repos/$REPO/environments/$ENVIRONMENT" --silent \
  -F "deployment_branch_policy[protected_branches]=false" \
  -F "deployment_branch_policy[custom_branch_policies]=true"
existing=$(gh api "repos/$REPO/environments/$ENVIRONMENT/deployment-branch-policies" \
  --jq '.branch_policies[] | "\(.type):\(.name)"')
grep -qx "tag:v\*" <<<"$existing" ||
  gh api -X POST "repos/$REPO/environments/$ENVIRONMENT/deployment-branch-policies" \
    -f name='v*' -f type=tag --silent
grep -qx "branch:main" <<<"$existing" ||
  gh api -X POST "repos/$REPO/environments/$ENVIRONMENT/deployment-branch-policies" \
    -f name=main -f type=branch --silent

# These are identifiers, not secrets, so they're stored as variables.
gh variable set AZURE_CLIENT_ID --env "$ENVIRONMENT" --repo "$REPO" --body "$app_id"
gh variable set AZURE_TENANT_ID --env "$ENVIRONMENT" --repo "$REPO" \
  --body "$(az account show --query tenantId -o tsv)"
gh variable set AZURE_SUBSCRIPTION_ID --env "$ENVIRONMENT" --repo "$REPO" \
  --body "$(az account show --query id -o tsv)"
gh variable set AZURE_STORAGE_ACCOUNT --env "$ENVIRONMENT" --repo "$REPO" --body "$ACCOUNT"

echo "Done. Publish a GitHub release (tag v*) to deploy, or run the workflow by hand."
