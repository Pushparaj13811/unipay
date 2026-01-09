# Deploying UniPay Documentation to Vercel

## Prerequisites

- Vercel account connected to your GitHub repository
- Repository: `Pushparaj13811/unipay`

## Deployment Steps

### 1. Configure Vercel Project Settings

In your Vercel dashboard for this project:

1. Go to **Settings** → **General**

2. Set **Root Directory** to:
   ```
   web-documentation
   ```

3. Set **Framework Preset** to:
   ```
   Next.js
   ```

4. Set **Build Command** to:
   ```
   pnpm run build
   ```

5. Set **Output Directory** to:
   ```
   .next
   ```

6. Set **Install Command** to:
   ```
   pnpm install
   ```

### 2. Environment Variables

No environment variables are required for the documentation site.

### 3. Deploy

**Option A: Deploy from Dashboard**
- Click "Deploy" button in Vercel dashboard

**Option B: Deploy from Git**
- Push to the connected branch (e.g., `main` or `feature/razorpay-adapter`)
- Vercel will automatically deploy

### 4. Custom Domain (Optional)

To use a custom domain like `docs.unipay.dev`:

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Configure DNS records as instructed by Vercel

## Important Notes

- **Search Functionality**: The Pagefind search index is generated during build via the `postbuild` script
- **Build Time**: First build may take 2-3 minutes
- **Monorepo**: The `web-documentation` subdirectory is configured as the root for deployment

## Troubleshooting

### Build Fails

**Issue**: `pnpm: command not found`
**Solution**: In Vercel settings, ensure the Node.js version is set to 18.x or higher

**Issue**: Search not working
**Solution**: Verify that the `postbuild` script runs successfully in the build logs

**Issue**: 404 on pages
**Solution**: Check that all MDX files are properly committed and the build completed successfully

## Build Logs

To check build logs:
1. Go to your project in Vercel dashboard
2. Click on the deployment
3. View "Building" logs to see the build process

Expected successful output should show:
```
Running Pagefind v1.4.0
Indexed 12 pages
Indexed 839 words
```

## Production URL

Once deployed, your documentation will be available at:
- **Vercel URL**: `https://your-project.vercel.app`
- **Custom Domain**: (if configured)

## Support

For deployment issues:
- Check Vercel deployment logs
- Verify build succeeds locally with `pnpm run build`
- Review Vercel documentation: https://vercel.com/docs
