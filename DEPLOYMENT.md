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

CV uploads are limited to 10 MB by the frontend. The upload progress bar
reports bytes transferred to the API; analysis is shown as in progress until
the analysis endpoint responds, because the API does not expose a progress
stream.

The onboarding flow uploads the CV first, then calls
`POST /api/v1/cvs/{cvId}/analyze` with the selected survey career focus as
`targetJobTitle`. The Career Paths page uses the saved analysis and CV-matched
opportunities to render recommendations.

The supplied OpenAPI contract lists authentication routes under `/api/auth`,
but this frontend uses the previously working `/api/v1/auth` routes for
registration, login, password reset, and email verification. The supplied
contract does not include the email-verification route, so the deployed
backend must support that route for signup verification to work. Confirm the
production API contract with the backend maintainer before changing these
paths.

The supplied OpenAPI file advertises `http://localhost:3000` as its server,
while deployed frontend requests use the production Worker URL above. Keep the
production base URL for deployed sites; use the local URL only when running the
API locally.
