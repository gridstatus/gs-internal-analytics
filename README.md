# GS Internal Analytics Dashboard

A full-stack TypeScript application for visualizing user analytics data, built with Next.js 14, Mantine UI, and PostgreSQL.

## Prerequisites

- Node.js 18+
- PostgreSQL database with the required schema

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables by editing `.env.local`:
```
APPLICATION_POSTGRES_USER=your_username
APPLICATION_POSTGRES_PASSWORD=your_password
APPLICATION_POSTGRES_HOST=your_host
APPLICATION_POSTGRES_DATABASE=your_database
```

3. Update the MAU data file at `src/data/maus.csv` with your monthly active user data.

## Running

### Development
```bash
npm run dev
```
Open http://localhost:3000

### Production
```bash
npm run build
npm start
```

## Features

- **Time Series Charts**: Visualize user growth, MAUs, API usage over time with MoM change indicators
- **Domain Distribution**: Bar chart showing corporate domains grouped by user count
- **Summary Metrics**: Key metrics with trend indicators
- **Export**: Download all charts as PNG images in a zip file

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Mantine provider setup
│   ├── page.tsx            # Main dashboard page
│   └── api/metrics/        # API endpoint
├── components/             # React components
├── lib/                    # Database and query utilities
├── sql/                    # SQL query files
└── data/                   # MAU CSV data
```

## Data Sources

- **Database**: User data, API usage from PostgreSQL
- **CSV**: Monthly active user counts (manually updated)

## Deployment to Render

### Option 1: Using render.yaml (Recommended)

1. **Push your code to GitHub/GitLab/Bitbucket**

2. **Connect to Render:**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Blueprint"
   - Connect your repository
   - Render will automatically detect `render.yaml` and create the services

3. **Configure Environment Variables:**
   In the Render dashboard, add these environment variables to your web service:
   ```
   APPLICATION_POSTGRES_USER=<your_db_user>
   APPLICATION_POSTGRES_PASSWORD=<your_db_password>
   APPLICATION_POSTGRES_HOST=<your_db_host>
   APPLICATION_POSTGRES_DATABASE=api_server
   POSTHOG_PROJECT_ID=<your_posthog_project_id>
   POSTHOG_PERSONAL_API_KEY=<your_posthog_api_key>
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your_clerk_publishable_key>
   CLERK_SECRET_KEY=<your_clerk_secret_key>
   ```

4. **If using Render's PostgreSQL:**
   - The `render.yaml` includes a database service
   - Use the connection details from Render's database dashboard
   - Update environment variables with the database connection string

### Option 2: Manual Setup

1. **Create a Web Service:**
   - Go to Render Dashboard → "New +" → "Web Service"
   - Connect your repository
   - Settings:
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`
     - **Environment**: `Node`

2. **Add Environment Variables** (same as above)

3. **Deploy**

### Notes

- Render automatically detects Next.js and sets up the build
- The app runs on port 10000 by default on Render (Next.js will auto-detect)
- Make sure your Clerk dashboard has the Render URL added to allowed origins
- For production, ensure your PostgreSQL database allows connections from Render's IPs
