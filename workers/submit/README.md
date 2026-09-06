# The submit endpoint

The small HTTP endpoint behind the web forms under `/forms/` on the site. A form posts JSON here; this worker checks it and opens the GitHub issue that the matching issue template would have produced. The **Intake submissions** workflow then parses that issue, writes the data file and opens a pull request, exactly as it does for a submission made through GitHub. Nothing downstream knows or cares which door a submission came through.

The point of it is that nobody needs a GitHub account to contribute. The GitHub issue forms keep working unchanged for people who have one, and if this endpoint is never deployed the site behaves exactly as it did before it existed.

The worker holds one credential, a GitHub App installation key, and can do one thing with it: open and comment on issues in this repository. What it keeps is one installation token in memory, and, where the rate limiter uses KV, a counter per caller keyed by a digest of their address for at most a day. No field value is ever stored anywhere.

Files here:

- `index.mjs` is the whole endpoint. Web platform APIs only (`fetch`, `crypto.subtle`, `TextEncoder`, `URL`, `Request`, `Response`), no `node:` imports, no dependencies. It runs on Cloudflare Workers, Deno Deploy, Netlify Edge and Vercel Edge. The validation and the field descriptors come from `../../scripts/lib/`, shared with the intake script, so a submission is judged by the same rules whichever door it arrives at.
- `wrangler.toml` is the Cloudflare configuration. Deploy from this folder, because of those relative imports.
- `test.mjs` is the test suite. No network and no credentials: it stubs `globalThis.fetch` and generates a throwaway RSA key.

The full operator guide, including how to create the GitHub App, how to switch the forms on and off, what to do about spam, and how photos will work one day, is [`../../docs/web-forms.md`](../../docs/web-forms.md). Read that first if you are setting this up for the first time.

## Environment variables

| Name | What it is | Secret |
| --- | --- | --- |
| `GITHUB_APP_ID` | The App's numeric ID, from its settings page | No |
| `GITHUB_APP_PRIVATE_KEY` | The whole `.pem`, BEGIN and END lines included | **Yes** |
| `GITHUB_INSTALLATION_ID` | The installation number, from the installation URL | No |
| `GITHUB_OWNER` | The account that owns this repository | No |
| `GITHUB_REPO` | The repository name | No |
| `ALLOWED_ORIGIN` | The site origin allowed to post here, for example `https://xbtinchina.github.io`. A comma-separated list is accepted. Never `*`, which the worker ignores | No |
| `TURNSTILE_SECRET` | Cloudflare Turnstile secret key. Optional, and not usable as things stand: see below | **Yes** |
| `RATE_SALT` | Optional. Salts the rate-limit keys, which are digests of the caller's address. The built-in default is public | **Yes** |
| `TRUSTED_IP_HEADER` | Optional. The header that carries the caller's address on a host that is not Cloudflare, for example `x-forwarded-for`. Leave unset on Cloudflare | No |
| `RATE_LIMITER` | The rate-limiting binding, not a variable. In `wrangler.toml` and on by default | No |
| `RATE_LIMIT` | Optional KV namespace binding, not a variable. Adds the hour and day windows | No |

The ones marked secret go in the host's secret store and nowhere else. The rest are configuration and live in `wrangler.toml`.

The private key is accepted in either of the two shapes a secret store might hand over: real newlines, or literal `\n` escapes. Both PKCS#8 (`BEGIN PRIVATE KEY`) and PKCS#1 (`BEGIN RSA PRIVATE KEY`, which is what GitHub downloads) work; the worker wraps a PKCS#1 key in the PKCS#8 envelope itself, so there is no `openssl` step. If you would rather convert it yourself:

```bash
openssl pkcs8 -topk8 -nocrypt -in downloaded.pem -out app-key-pkcs8.pem
```

## Deploy

```bash
cd workers/submit
npx wrangler login                               # once, opens a browser
# now edit wrangler.toml [vars]: GITHUB_OWNER, GITHUB_REPO, GITHUB_APP_ID, GITHUB_INSTALLATION_ID
npx wrangler secret put GITHUB_APP_PRIVATE_KEY   # paste the whole .pem
npx wrangler secret put RATE_SALT                # optional, any string of your own
npx wrangler deploy                              # prints the endpoint URL
```

Copy `GITHUB_OWNER` and `GITHUB_REPO` exactly as they appear in this repository's address (`git remote -v` prints them). A wrong name reaches the submitter only as a generic `500`, and the preflight check below still passes.

A secret takes effect as soon as you set it. Anything you change under `[vars]` needs another `npx wrangler deploy`.

Then put the endpoint URL in `submit_url` in `data/network.yml` and merge that change; the forms appear on the next site build. Clearing `submit_url` stops the site offering the form, but it does not close the endpoint: anyone who already has its address can keep posting. To shut the door, delete the Worker or its route at the host.

`npx wrangler tail` streams the logs. They are one JSON line per request carrying the outcome, the submission type and the issue number, and never a field value, a token or an address. The one line worth looking for is `E_NO_RATE_LIMIT`, said once per instance when nothing is throttling the endpoint. Confirm all that once, then leave it alone.

## Test it

Run the tests first. They need nothing but Node 22:

```bash
node workers/submit/test.mjs
```

Against a deployment, start with the preflight, which creates nothing:

```bash
curl -i -X OPTIONS https://<your endpoint> \
  -H "Origin: https://xbtinchina.github.io" \
  -H "Access-Control-Request-Method: POST"
```

That must answer `204` with `Access-Control-Allow-Origin: https://xbtinchina.github.io`, naming the site rather than `*`. An origin that is not in `ALLOWED_ORIGIN` must answer `403`.

Next a submission that deliberately fails validation. This too creates nothing, and it proves the whole path down to the shared validation:

```bash
curl -sS -X POST https://<your endpoint> \
  -H "Origin: https://xbtinchina.github.io" \
  -H "Content-Type: application/json" \
  -d '{"type":"lab","trap":"","elapsed":30000,"fields":{"pi":"Test Person"}}'
```

Expect `400` and a list of readable problems, starting with `"Institution" is required.` Those strings are meant for the submitter and the form shows them verbatim.

Then check the two spam traps. Both answer like an ordinary success and file nothing, because telling a bot that it failed only teaches it:

```bash
# the honeypot filled in
curl -sS -X POST https://<your endpoint> -H "Origin: https://xbtinchina.github.io" \
  -H "Content-Type: application/json" \
  -d '{"type":"lab","trap":"x","elapsed":30000,"fields":{}}'

# filled in faster than a person reads the questions
curl -sS -X POST https://<your endpoint> -H "Origin: https://xbtinchina.github.io" \
  -H "Content-Type: application/json" \
  -d '{"type":"lab","trap":"","elapsed":500,"fields":{}}'
```

Both must answer `{"ok":true,...}` and no issue must appear.

One more that creates nothing: a value carrying a line that repeats one of the form's own questions.

```bash
curl -sS -X POST https://<your endpoint> \
  -H "Origin: https://xbtinchina.github.io" \
  -H "Content-Type: application/json" \
  -d '{"type":"tutorial","trap":"","elapsed":30000,"fields":{"title":"T","authors":"A","url":"https://example.org","topics":"t","description":"HEAD\n### Description (max 700 characters)\nTAIL","consent":["The material is openly accessible at the link and I am an author or have the authors'"'"' permission"]}}'
```

Expect `400` naming that field and that line. This is the check that keeps the issue and the data file the workflow writes from saying different things.

Finally submit one real test entry through the form itself at `/forms/lab/`, and follow it all the way: the issue, the workflow run, the pull request. Close the issue and the pull request without merging, and delete the branch. A `curl` with a complete valid payload does the same thing, so if you use one, remember it opens a real issue.

## What it does, in order

1. `OPTIONS` gets the preflight answer if the origin is allowed, `403` otherwise.
2. A non-`POST` gets `405`. A post from an origin outside `ALLOWED_ORIGIN`, or with no `Origin` at all, gets `403`.
3. The body must be JSON and at most about 64 KB.
4. The honeypot and the fill time are checked. Either one failing means a `200` that looks ordinary, with nothing created.
5. Turnstile is verified, if `TURNSTILE_SECRET` is set. It is not set by default; see below.
6. The type is resolved against `scripts/lib/forms.mjs`. Only the field ids that type declares are read, and a value for the photo field is refused outright, because there is no photo route in this version.
7. The fields are validated by `readValues` and then by `crossChecks`, both from `scripts/lib/validate.mjs`: the same per-field ladder and the same rules across fields that `scripts/intake.mjs` applies, so a submission that the intake would refuse is refused here instead, while the submitter is still at the keyboard. A failure is `400` with the problems.
8. The body is rendered from the validated values and parsed straight back with the intake's own parser. Unless it reads as exactly those values, the answer is `400` and nothing is filed. A value that repeats one of the form's questions as a `### heading` is named in its own message before that.
9. One rate-limit slot is taken, immediately before anything is created. Over the limit is `429`.
10. A GitHub App JWT is signed and exchanged for an installation token, which is cached in memory until shortly before it expires.
11. The issue is created: the fields as `### Label` blocks in the order the form declares them, the title prefix and short name, and the labels the workflow looks for. The note saying the submission came through the web form goes in a separate comment, because anything appended to the body would become part of the last field's value.
12. The answer is `200` with the issue URL and number.

An unexpected failure is a generic `500` with a short code in the log and nothing else: no internals, no tokens, no stack traces.

## Rate limiting

Throttling is part of the deployment, not an extra. `wrangler.toml` ships with Cloudflare's rate-limiting binding switched on: 5 accepted submissions a minute from one address, counted inside the edge itself, so two requests that arrive together cannot both pass. Its period can only be 10 or 60 seconds, so it is a brake on bursts.

Binding a KV namespace as well adds the longer windows, 5 an hour and 20 a day for one address:

```bash
npx wrangler kv namespace create RATE_LIMIT     # then paste the id into wrangler.toml
```

The KV counter is read and written one higher before the issue is created, not counted afterwards, and it is read with `cacheTtl: 0` so a counter cached at that edge cannot be reused for a minute after it changed. Even so, KV is eventually consistent: a burst spread across several Cloudflare locations can overshoot. Treat the numbers as a brake rather than a hard limit.

Only submissions that pass every check are counted, so somebody correcting a typo is never locked out. If neither binding is configured the endpoint still serves, and says `E_NO_RATE_LIMIT` once per instance in the log so that a throttle-free deployment is a deliberate act rather than a surprise.

The store never holds an address. It holds a truncated SHA-256 of it, salted with `RATE_SALT` if you set one and with a value from `index.mjs` if you do not; that default is public, so set your own if you would rather the keys were not guessable. A caller the runtime cannot identify shares one bucket with every other unidentified caller, which throttles them rather than letting them through: only `CF-Connecting-IP`, or a header you name in `TRUSTED_IP_HEADER`, is read, because a client can write anything into `X-Forwarded-For` and mint itself a fresh counter per request.

## Spam and abuse

In the order they matter:

1. **The rate limit above.** The one defence a scripted client cannot simply set a field to satisfy.
2. **The honeypot and the minimum fill time.** Cheap filters, both answered with an ordinary-looking `200` that creates nothing, because telling a bot that it failed only teaches it what to change. A client that knows about them can send `trap: ""` and `elapsed: 20000` and pass both.
3. **The `Origin` allowlist.** It keeps other people's pages from posting here from a browser. It is not a defence against `curl`.
4. **A coordinator merging the pull request.** The real gate. Nothing a submission says reaches the site until a person merges it.

Two known limitations, both deliberate:

- **@-mentions are not neutralised.** Text a submitter typed reaches the issue as written, so `@someone` notifies that account and `owner/repo#1` leaves a reference on that issue, under the network's App rather than under a person. Escaping them would put a backslash into the value, and therefore into the published data file, and would break the round-trip comparison that keeps the issue and the data file honest. Round-trip fidelity wins; the answer to abuse here is the rate limit and the merge gate.
- **Turnstile is not usable as things stand.** The worker still verifies a token when `TURNSTILE_SECRET` is set, but the form page renders no widget and sends no token, so setting that secret alone refuses every submission. Switching it on means adding `https://challenges.cloudflare.com/turnstile/v0/api.js` to the form page, which is the one thing this site does not do: it loads no third-party script, so that it stays usable from mainland campuses. If you turn it on, turn it on in both places at once and test reachability from the mainland again before merging.

## Two things worth knowing

**It must be a GitHub App installation token.** Not `GITHUB_TOKEN` and not a personal token belonging to a coordinator. GitHub does not start new workflow runs from events created with a workflow's own `GITHUB_TOKEN`, which would leave the issue sitting there with no intake run behind it. An installation token is outside that rule. It also belongs to the network rather than to a person, and its permissions are one line wide: issues, in this repository, and nothing else.

**No photo upload, on purpose.** The intake script downloads photos only from `github.com` and `*.githubusercontent.com`, a guard that stops a submitted link from pointing the workflow at an arbitrary host. An upload here would need object storage plus a hole in that allowlist. Photos are optional anyway, the roster shows initials, and the form says a photo can be added later. The endpoint refuses a value for the photo field rather than merely not offering one, so a direct post cannot steer that downloader either. The upgrade path is written down in `../../docs/web-forms.md`.
