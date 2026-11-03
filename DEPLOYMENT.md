# Deployment

The frontend calls the SkillBridge API directly from the browser. The default
API URL is `https://skillbridge-api.tb-skillbridge-backend.workers.dev`; set
`window.SKILLBRIDGE_API_BASE_URL` before loading `js/api-client.js` only when
using a different API.

Deploy the static site to your hosting provider as usual. Before browser API
requests can succeed, the backend must allow the deployed site's exact origin
through CORS. Ask the backend maintainer to:

- Allow the production site origin (scheme and hostname, with no page path),
  such as `https://your-site.example`.
- Allow `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, and `OPTIONS`.
- Allow the `Authorization` and `Content-Type` request headers.
- Return the appropriate `Access-Control-Allow-Origin` header on API responses.

If using separate preview and production domains, each origin must be allowed.
The frontend sends bearer tokens in the `Authorization` header and does not
require cross-origin cookies.

CV uploads are limited to 10 MB by the frontend.

## Backend requirements

Auth endpoints are `/api/auth/*` (not `/api/v1/auth/*`). CORS must allow the site origin. `POST /api/v1/roadmaps/generate` returns 503 until the backend has an AI provider configured; `POST /api/v1/cvs/{id}/analyze` returns 502 if the AI step fails.
