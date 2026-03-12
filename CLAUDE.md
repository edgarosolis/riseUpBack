# RiseUp — riseUpBack

## Deployment
- **Deploy branch:** `main`
- **Deploy method:** ec2-ssh
- **Testing branch:** `testing`
- **Testing URL:** https://testing.theriseupculture.com

## Workflow
- Push to `main` triggers auto-deployment via GitHub Actions
- Edgar (owner) pushes directly to `main`
- All other contributors use feature branches and PRs

## Branch Rules
- Feature branches: `zadok/{task-id}-{description}`
- PRs target `main`
- Never force push to `main`
