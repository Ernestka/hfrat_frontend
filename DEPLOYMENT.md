# HFRAT Frontend - Deployment Guide

## Local Development

### Setup
```bash
cd hfrat_frontend
npm install
cp .env.example .env
```

### Environment Variables
Update `.env`:
```
VITE_API_URL=http://localhost:5000/api
```

### Run Development Server
```bash
npm run dev
```

Access at: `http://localhost:5173`

---

## Production Build

### Create Optimized Build
```bash
npm run build
```

This generates optimized files in the `dist/` directory.

### Test Production Build Locally
```bash
npm run preview
```

Access at: `http://localhost:4173`

---

## Deployment Platforms

### Netlify

#### Option 1: Direct Deploy
1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Deploy:
```bash
netlify deploy --prod
```

#### Option 2: GitHub Integration
1. Push code to GitHub
2. Connect repository in Netlify dashboard
3. Set build command: `npm run build`
4. Set publish directory: `dist`
5. Set environment variable:
   - Key: `VITE_API_URL`
   - Value: `https://your-backend-domain.com/api`

#### Configuration File
`netlify.toml` is already configured with:
- Correct build and publish directories
- Redirect rules for SPA routing
- Environment variable setup

---

### Vercel

#### Option 1: GitHub Integration (Recommended)
1. Push code to GitHub
2. Import project in Vercel dashboard
3. Framework: Select "Vite"
4. Build Command: `npm run build` (auto-detected)
5. Output Directory: `dist` (auto-detected)
6. Set Environment Variables:
   - Key: `VITE_API_URL`
   - Value: `https://your-backend-domain.com/api`
7. Deploy

#### Option 2: CLI Deploy
1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel --prod
```

#### Configuration File
`vercel.json` is pre-configured with:
- Build settings
- Environment variable requirements
- SPA routing configuration

---

## Environment Variables by Deployment

### Local Development
```
VITE_API_URL=http://localhost:5000/api
```

### Staging
```
VITE_API_URL=https://staging-backend.example.com/api
```

### Production
```
VITE_API_URL=https://api.example.com/api
```

---

## Pre-deployment Checklist

- [ ] Backend API is deployed and accessible
- [ ] CORS is configured on backend to allow frontend domain
- [ ] Environment variables are set on deployment platform
- [ ] `.env.production` is updated with production API URL
- [ ] `npm run build` runs without errors
- [ ] `npm run preview` works and connects to backend
- [ ] All authentication flows tested
- [ ] All protected routes work correctly

---

## Common Issues

### CORS Errors
**Problem**: "Access to XMLHttpRequest blocked by CORS"

**Solution**: Ensure backend has CORS configured to allow your frontend domain:
```python
# Flask backend example
CORS_ORIGINS = ['https://your-frontend-domain.com', 'http://localhost:3000']
```

### 404 on Page Refresh
**Problem**: Refreshing on non-root path gives 404

**Solution**: 
- Netlify: `netlify.toml` already configured
- Vercel: `vercel.json` already configured
- Custom server: Configure SPA fallback to `index.html`

### API Connection After Deploy
**Problem**: API calls fail in production

**Solution**: 
1. Check `VITE_API_URL` is set correctly
2. Verify backend domain is accessible
3. Check backend CORS configuration
4. Test API directly: `curl https://your-api.com/api/health`

### Missing Dependencies After Deploy
**Problem**: Build fails due to missing packages

**Solution**: 
```bash
npm install
npm run build
```

---

## Monitoring

After deployment, verify:
1. Frontend loads without errors
2. Login works with valid credentials
3. API requests complete successfully
4. Pages redirect correctly based on user role
5. Logout clears authentication properly

Check browser console for errors:
- Open DevTools (F12)
- Check Console tab for JavaScript errors
- Check Network tab for failed API calls

---

## Rollback

### Netlify
1. Go to Deploys section
2. Find previous successful deployment
3. Click "..." > "Publish deploy"

### Vercel
1. Go to Deployments
2. Find previous successful deployment
3. Click "..." > "Promote to Production"

---

## Security Notes

- Never commit `.env` files with real credentials
- Always use HTTPS for production
- Use environment-specific variables for each deployment
- Rotate JWT secrets periodically
- Monitor API rate limits and errors

---

## Support

For issues:
1. Check browser console (F12)
2. Check network requests in DevTools
3. Verify backend is running
4. Check environment variables are set
5. Review deployment logs on platform
