# Deployment

The site is a static HTML app with a Vercel serverless API proxy. Browser requests
stay on the site's origin; the proxy forwards them to the SkillBridge API, so the
browser does not need cross-origin CORS access to the API.

## Vercel

1. Import this repository into Vercel and keep the project root at the repository
   root. No frontend build command or output directory is required; the HTML,
   JavaScript, CSS, and assets are served directly.
2. Deploy the project. The proxy uses
   `https://skillbridge-api.tb-skillbridge-backend.workers.dev` by default.
   Optionally set `SKILLBRIDGE_API_ORIGIN` in Vercel's environment variables to
   another backend origin, with no trailing path.
3. Use a valid backend account to sign in. The browser stores the API's
   short-lived bearer token and the proxy forwards it to protected API routes.

For local development with the same proxy, install/use the Vercel CLI and run
`npx vercel dev` from the repository root. Opening HTML files directly or using
a plain static Live Server does not run the proxy functions.

## CV upload limit

The web upload limit is 4 MiB to stay below Vercel Functions' request body limit.
The backend API may accept larger CV files from other clients, but this web
deployment must keep uploads within the proxy limit.
