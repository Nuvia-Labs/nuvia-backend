# Deployment Guide - Manual Fork Workflow

## Branch Strategy

- **main** → Production environment
- **testing** → Testing environment

## Setup Overview

1. Organization repo → Fork to personal repo
2. Deploy forked repo in Vercel
3. Main branch = production, testing branch = testing

## Environment Configuration

### Testing Branch
Uses current `.env` configuration (development database)

### Production Branch (main)
Uses `.env.production` with separate production database

## Steps to Deploy

### 1. Create Production Database

**MongoDB Atlas:**
1. Create new cluster for production
2. Get connection string:
   ```
   mongodb+srv://user:pass@cluster.mongodb.net/nuvia-finance-production
   ```

### 2. Configure Vercel

**In Vercel Dashboard → Project Settings → Environment Variables:**

**Production Environment (main branch):**
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/nuvia-finance-production
CORS_ORIGIN=https://yourdomain.com
JWT_SECRET=<generate-secure-secret>
# ... other production values
```

**Preview Environment (testing branch):**
```env
NODE_ENV=development
MONGODB_URI=<your-testing-database>
CORS_ORIGIN=http://localhost:5173
# ... same as current .env
```

### 3. Seed Production Database

```bash
# Set production MongoDB URI locally
export MONGODB_URI="mongodb+srv://..."
npm run seed
```

## Deployment Workflow

### Deploy Testing
```bash
git checkout testing
# make changes
git add .
git commit -m "Update testing"
git push origin testing
```
→ Vercel auto-deploys preview from testing branch

### Deploy Production
```bash
git checkout main
git merge testing  # or cherry-pick specific commits
git push origin main
```
→ Vercel auto-deploys production from main branch

## Update from Organization Repo

```bash
# Add organization repo as upstream (one time)
git remote add upstream <org-repo-url>

# Pull updates from organization
git fetch upstream
git checkout main
git merge upstream/main

# Update testing too
git checkout testing
git merge upstream/main  # or merge main

# Push to your fork
git push origin main
git push origin testing
```

That's it! Simple manual workflow with branch-based environments.
