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

The supplied OpenAPI contract serves the versioned resource routes under
`/api/v1`, but its authentication routes are under `/api/auth` (without `/v1`).
The frontend uses those documented paths for registration, login, and password
reset. The supplied contract does not define an account email-verification
endpoint. Signup therefore does not call an undocumented verification route;
if registration returns an unverified account, the frontend reports that the
documented API flow is incomplete and cannot continue to the survey until the
backend provides that endpoint and its request/response contract.

The supplied OpenAPI file advertises `http://localhost:3000` as its server,
while deployed frontend requests use the production Worker URL above. Keep the
production base URL for deployed sites; use the local URL only when running the
API locally.
