---
title: Web forms
summary: The forms on this site that need no GitHub account, how to create the GitHub App and deploy the endpoint behind them, how to switch them on and off, what holds off abuse, what they deliberately do not do, and what to watch for from mainland networks.
audience: coordinators
order: 65
---

The forms under `/forms/` on this site take a submission from anyone, with no account of any kind. They exist because the network should not turn away a PI in Guangzhou who has never used GitHub and has no reason to start. This page is for the coordinator who deploys and runs the small endpoint that makes them work. If you only review submissions, the [operations handbook](../operations/) is the page you want; reviewing is the same whichever form a submission came through, but repairing a broken one is not, because a web submitter has no account and cannot edit anything. The handbook says what a coordinator does about that, and so does the table at the end of this page.

The GitHub issue forms keep working exactly as before. They are the open alternative for people who do have accounts, and they are the fallback whenever the endpoint is unavailable. Nothing about the intake workflow, the data files or the review changes.

## How a submission travels

1. Someone opens a form on the site, for example `/forms/lab/`, and fills it in. The page is static, like every other page here.
2. The browser posts the answers as JSON to the endpoint set in `submit_url` in `data/network.yml`. We call that endpoint the worker.
3. The worker checks the answers with the same rules the intake workflow uses, field by field and then across fields, and refuses anything it cannot file faithfully. If they are usable it opens an issue in this repository using a GitHub App credential. The issue is byte for byte the issue that the matching issue template would have produced: the same title prefix, the same `### Label` blocks in the same order, the same labels. Its author is the App, though, not the person who filled the form in, which is the one difference that matters later.
4. The **Intake submissions** workflow sees a new issue with an `intake` label, parses it, writes the data file and opens a pull request.
5. A coordinator reads the pull request and merges it. Only then does anything appear on the site.

The worker adds nothing to the data and decides nothing. It is a doorway that converts a form post into an issue, so that the one reviewed, auditable path stays the same for everybody.

## Creating the GitHub App

Create the App under the account that owns this repository, ideally the network's organisation rather than a person, so that it survives a coordinator handover.

1. Go to *Settings* for that account, then *Developer settings*, then *GitHub Apps*, then *New GitHub App*.
2. Name it something plain, such as `GBA-CCN intake`. Homepage URL: the site address. Untick *Active* under Webhook; the worker calls GitHub, GitHub never calls the worker.
3. Permissions: under *Repository permissions* set **Issues: Read and write**. Leave everything else at *No access*. Grant no account permissions and subscribe to no events. This App can open and comment on issues and can do nothing else, not even read code beyond what a public repository already shows anyone.
4. Under *Where can this GitHub App be installed?* choose *Only on this account*.
5. Create it. The **App ID** is on the App's settings page. Write it down; it is not a secret, but it is not worth publishing either.
6. Still on that page, under *Private keys*, choose *Generate a private key*. A `.pem` file downloads once. That file is the credential: store it in the coordinators' password manager, and delete the download. If it leaks, generate a new key and delete the old one from the same page.
7. Choose *Install App*, install it on this account, and select **Only select repositories**, this repository alone.
8. After installing, the browser is on a URL ending in `/settings/installations/<number>`. That number is the **installation ID**.

### Why a GitHub App and not a personal access token

- It belongs to the network, not to whoever set it up. A coordinator can leave without the forms breaking.
- Its permissions are one line wide. A personal token capable of opening issues in this repository is usually capable of much more, across everything that person can reach.
- It can be revoked on its own, by deleting the key or uninstalling the App, without touching anybody's account.
- Its issues trigger the intake workflow. That one is a requirement, not a preference. GitHub deliberately does not start new workflow runs from events created with a workflow's own `GITHUB_TOKEN` (`workflow_dispatch` and `repository_dispatch` aside), so that workflows cannot trigger themselves in a loop. An installation token belonging to a GitHub App is not that token and is outside the rule, so the issue it opens does start the intake run. GitHub's own `GITHUB_TOKEN` documentation says so; it was checked rather than assumed while this was built. If the behaviour ever changes, the symptom is unmistakable: an issue appears with the right labels and no workflow run behind it.

## Deploying the endpoint

The worker is a single small script with no dependencies at runtime. Cloudflare Workers is the recipe below because its free tier is generous, the deployment is a handful of commands, and it has points of presence close to the region. Nothing in the code is specific to it.

### Cloudflare Workers

You need a Cloudflare account and Node 22 or newer. The order below matters: a setting under `[vars]` only reaches the running Worker when you deploy, so filling those in after deploying leaves the endpoint answering `500` to every real submission.

1. **Go to the worker's folder.** Everything here is run from `workers/submit`, the folder holding `wrangler.toml`, not from the repository root: the worker imports the shared field list and validation from `scripts/lib/`, and `wrangler` bundles them in from there.

   ```bash
   cd workers/submit
   npx wrangler login     # opens a browser once
   ```

2. **Fill in `[vars]` in `wrangler.toml`.** All five are plain configuration and belong in the repository:

   - `GITHUB_OWNER` and `GITHUB_REPO`: copy the account and the repository name exactly as they appear in this repository's own address bar, capital letters included. A wrong name is the one mistake nothing here catches for you: the preflight check below still passes, and every real submission answers a generic `500`.
   - `GITHUB_APP_ID` and `GITHUB_INSTALLATION_ID`: from the App's settings page and from the installation URL, as recorded above.
   - `ALLOWED_ORIGIN`: the site origin, for example `https://xbtinchina.github.io`. Never `*`; the worker ignores a wildcard.

3. **Set up the rate limit.** It is part of the deployment, not an option to add later. Open the rate-limit block near the bottom of `wrangler.toml` and follow what it says. On Cloudflare it binds the platform's own rate limiter, which counts atomically at the edge and needs nothing created beforehand. Where that is not available, the same two counters live in a KV namespace you create yourself:

   ```bash
   npx wrangler kv namespace create RATE_LIMIT   # for the KV form; paste the id it prints
   ```

   Do not delete the block to get a first deploy working. Without a binding nothing limits how many entries one address can send, and every accepted post opens a public issue and starts a full Actions run.

4. **Set the private key as a secret**, so it never enters the repository:

   ```bash
   npx wrangler secret put GITHUB_APP_PRIVATE_KEY   # paste the whole .pem, BEGIN and END lines included
   ```

5. **Deploy.**

   ```bash
   npx wrangler deploy    # publishes and prints the endpoint URL
   ```

Secrets take effect as soon as you set them. Anything under `[vars]`, and the rate-limit binding, takes effect at the next `npx wrangler deploy`, so deploy again after every change to that file. `workers/submit/README.md` is the same recipe in short form, with the rest of the test commands next to it.

The `workers.dev` URL that `deploy` prints is enough to start with. A custom hostname, for example `forms.<your domain>`, is better in the long run: it can be repointed at a different host later without another change to `data/network.yml`. Add it in the Cloudflare dashboard under the Worker's *Triggers*, or as a `route` in `wrangler.toml`.

### Checking it works, without creating anything

Before deploying at all, run the worker's own tests, from the repository root. They need nothing but Node 22, no network and no credentials:

```bash
node workers/submit/test.mjs
```

Against the deployment, start with the CORS preflight:

```bash
curl -i -X OPTIONS https://<your endpoint> \
  -H "Origin: https://xbtinchina.github.io" \
  -H "Access-Control-Request-Method: POST"
```

That must come back `204` or `200` with an `Access-Control-Allow-Origin` header naming the site, not `*`. An origin that is not in `ALLOWED_ORIGIN` must come back `403`.

Then a submission that deliberately fails validation. This proves the whole path down to the shared validation and creates nothing, because a submission that does not validate is never filed:

```bash
curl -sS -X POST https://<your endpoint> \
  -H "Origin: https://xbtinchina.github.io" \
  -H "Content-Type: application/json" \
  -d '{"type":"lab","trap":"","elapsed":30000,"fields":{"pi":"Test Person"}}'
```

Expect `400` and a list of readable problems beginning with `"Institution" is required.` Those strings are written for the submitter and the form shows them word for word.

Then the two cheap traps. Both answer like an ordinary success and file nothing, because telling a bot that it failed only teaches it:

```bash
# the honeypot filled in
curl -sS -X POST https://<your endpoint> -H "Origin: https://xbtinchina.github.io" \
  -H "Content-Type: application/json" \
  -d '{"type":"lab","trap":"x","elapsed":30000,"fields":{}}'

# filled in faster than a person can read the questions
curl -sS -X POST https://<your endpoint> -H "Origin: https://xbtinchina.github.io" \
  -H "Content-Type: application/json" \
  -d '{"type":"lab","trap":"","elapsed":500,"fields":{}}'
```

Both must answer `{"ok":true,...}` with an empty issue URL, and no issue must appear in the repository.

What none of this proves is that the GitHub credential works, because nothing above reaches GitHub. Only a complete valid submission does that, and it opens a real issue whichever way you send it. So finish by submitting one real test entry through the form itself once `submit_url` is set, and follow it all the way: the issue, the workflow run, the pull request. Then close the issue and the pull request without merging, and delete the branch.

`npx wrangler tail` streams the Worker's logs while you test. Watch it once to confirm it prints no field values (see Privacy below), then leave it alone.

### Other hosts

The same code also runs on Deno Deploy, Netlify Edge Functions and Vercel Edge Functions. All four speak the standard `Request` and `Response` objects, and nothing in the file needs a Node API or a dependency. What changes per platform is the few lines at the bottom that hand the worker its surroundings:

- **The settings.** Every setting reaches the worker through the second argument of `fetch(request, env, ctx)`. Cloudflare supplies that bag itself. Deno Deploy passes connection information there, Netlify Edge passes its own context object and Vercel Edge passes nothing, so on those three you build the bag once from the platform's environment (`Deno.env.toObject()`, or `process.env`) and pass it in yourself. Miss this and every request, including the preflight, answers `403`, because `ALLOWED_ORIGIN` reads as undefined.
- **The rate limit.** The binding is a Cloudflare shape. Elsewhere you point it at that platform's own key-value store, or at a small Redis, and keep the same two windows. The address it counts against is host-specific too: Cloudflare sets `CF-Connecting-IP` itself and a client cannot forge it, while `X-Forwarded-For` is whatever the client sent plus whatever the platform appended. Check which header the worker reads before you rely on the limit somewhere new, because a limiter counting a header the caller controls is not a limiter.
- **`ctx.waitUntil`.** Cloudflare uses it to post the "came through the web form" comment after the response has gone out. Where there is no `ctx`, the worker awaits the comment instead, which is a fraction of a second slower and otherwise identical.
- **The entry point.** Each platform has its own convention: a default export with a `fetch` method on Cloudflare, `Deno.serve(handler)` on Deno Deploy, a default export function on Netlify Edge and on Vercel Edge, where Vercel also wants its `runtime: 'edge'` marker.

So moving host is an afternoon, and the site side of it really is one line in `data/network.yml`. The worker side is a handful of lines at the bottom of the file, not a rewrite, but more than an export line. Run the checks above after moving: getting this wrong shows up as a `403` on everything, which reads like a wrong origin rather than a wrong host.

## Environment variables

| Name | What it is | Secret |
| --- | --- | --- |
| `GITHUB_APP_ID` | The App's numeric ID, from its settings page | No |
| `GITHUB_APP_PRIVATE_KEY` | The full contents of the `.pem`, including the BEGIN and END lines | **Yes** |
| `GITHUB_INSTALLATION_ID` | The installation number, from the installation URL | No |
| `GITHUB_OWNER` | The account that owns this repository | No |
| `GITHUB_REPO` | The repository name | No |
| `ALLOWED_ORIGIN` | The site origin allowed to post, for example `https://xbtinchina.github.io`. A comma-separated list is accepted, for a preview deployment or a mirror. Never `*` | No |
| `RATE_LIMIT` | The rate limiter: a binding in `wrangler.toml`, not a variable. Part of the deployment, not an option; see step 3 above and *Spam and abuse* below | No |
| `TURNSTILE_SECRET` | Cloudflare Turnstile secret key. Leave it unset. The worker verifies a token whenever this exists, and no page on the site produces one, so setting it alone takes every form offline; see *Spam and abuse* | **Yes** |

The one marked secret goes in the host's secret store and nowhere else: not in `wrangler.toml`, not in a `.env` file that could be committed, not in a chat message. The same is true of `TURNSTILE_SECRET` if a later version of the site ever uses it. The rest are configuration and can sit in `wrangler.toml` in the repository.

## Turning the forms on and off

On: set `submit_url` in `data/network.yml` to the endpoint address and merge the change.

```yaml
submit_url: "https://forms.example.org/intake"
```

Off: set it back to `""` and merge. The Join page goes back to the email and GitHub routes it showed before, and every other page links the GitHub form again. One line each way and no code change. With `submit_url` empty nothing on the site links to a web form; the pages under `/forms/` still build, but each one only says the form is not switched on, carries a `noindex` and is kept out of the sitemap, so a visitor arriving from anywhere finds the site as it was before any of this existed.

### If you need to shut the door quickly

Clearing `submit_url` is not that. It stops the site offering the form, at the next deploy, which is a couple of minutes. It does not close the endpoint: the address is public, and a page already open in somebody's tab, a cached copy of it, or a hand-written `curl` carrying the right `Origin` header all keep working. Two things actually stop it, and you can do either in a minute:

- **Take the endpoint away.** `npx wrangler delete` from `workers/submit`, or remove the Worker's route in the Cloudflare dashboard. Posts then fail at the network, and the form falls back to its "could not reach the server, use the GitHub form" message.
- **Take the credential away.** On the App's settings page, generate a new private key and delete the old one. The deployed Worker is now holding a key GitHub rejects, so every submission answers `500` and nothing is filed, and no other coordinator has to be online for it to happen. This is also the right move if you think the key itself has leaked: set the new key with `npx wrangler secret put GITHUB_APP_PRIVATE_KEY` when you want the forms back.

Clearing `submit_url` is the tidying-up that follows either one, so that the site stops showing a form nobody can send.

## Reachability from mainland China

Be honest about this: we do not know in advance. The site itself is built to keep cross-border dependencies to a minimum, with no third-party fonts, scripts or analytics, but an endpoint hosted overseas is one more overseas request, and traffic from a mainland campus to any single overseas host can be slow, intermittent or blocked outright, for reasons that change without notice. Nobody can promise otherwise, ourselves included.

So test it before advertising it. Concretely:

1. Ask two or three people, at least one in Shenzhen and one in Guangzhou, to try the real form at `/forms/lab/` with a genuine test entry.
2. Each of them tries twice: once on the campus wired or Wi-Fi network, once on mobile data. Note the carrier.
3. Try once in the evening peak (roughly 20:00 to 23:00 local) and once in a quiet morning hour, on different days. Reachability is not a yes or no; it varies by hour.
4. Record for each attempt: did the page load, did the form submit, how many seconds until the confirmation, and the exact wording of any error.
5. Repeat over a week before you announce the forms. A single successful test proves very little.

Fallbacks, in order of effort:

1. **The email route.** Set `contact_email` in `data/network.yml`. The Join page then offers a pre-filled email with the same questions. It is the fallback with the fewest moving parts and the one people reach for on their own; we have not measured it crossing the border either. This costs nothing and should be in place regardless.
2. **The GitHub issue form.** Still there, still linked on every relevant page. GitHub has been reachable in the few attempts anyone in the project has made so far, not always quickly. That is a handful of data points, not a guarantee, which is why the standing ask in the README is for members to report what loads from their own campus.
3. **A mainland-hosted mirror of the endpoint.** The same code and the same site origin in `ALLOWED_ORIGIN`, deployed on a mainland cloud, with `submit_url` pointing at whichever copy serves members better. Note two costs before going down this road: a custom domain served from inside mainland China needs an ICP filing, which takes weeks and a domestic entity to hold it; and the mirror needs its own copy of the App private key, so it is a second place a credential can leak. Consider it only if the testing above shows the overseas endpoint failing often enough to lose submissions.

Keep the [operations handbook](../operations/) note in mind too: the whole site sits on GitHub Pages, so the endpoint is not the only cross-border dependency, just the newest one.

## Spam and abuse

Four defences, in the order a submission meets them. Only the first costs an automated client anything, and only the last is a real gate.

- **A rate limit, per address. This is the primary defence, and setting up its binding is a required step of the deploy above.** Which ceiling applies depends on which binding you set up, and `wrangler.toml` ships with the first of them enabled:
  - the platform rate limiter, bound out of the box and needing nothing created beforehand, allows five submissions a minute from one address. It stops a burst, and that is all it is for.
  - the KV counters, which you create yourself, add the longer windows: five entries an hour and twenty a day. Set these up as well if you want a ceiling on a patient abuser rather than only on a fast one.

  Over either ceiling the endpoint answers `429` and the form tells the person to wait and offers the GitHub form. The count is kept against a hash of the address, never the address itself, and only submissions that pass validation count against it, so somebody correcting a typo four times is not locked out. A deployment without the binding has nothing that costs an abuser anything at all, which is why the block is in `wrangler.toml` from the start rather than offered as an option.
- **A honeypot field**, hidden from people and invisible to screen readers, that automated form fillers tend to complete. Anything with it filled in is discarded. The submitter sees the ordinary confirmation, because telling a bot it failed only teaches it.
- **A minimum fill time.** The page records when the form was rendered and sends the elapsed milliseconds. Under three seconds is treated as automated. A person reading the questions takes far longer.
- **A coordinator merges the pull request.** This is the real gate, and the only one that decides what appears on the site. Spam that gets past everything above costs somebody thirty seconds to close an issue; it never reaches a page. Treat it as a nuisance to be managed, not a breach.

Be clear about what the two cheap filters are worth. Both are values the client sends, so anything written specifically against this endpoint sets them correctly and walks past both. They catch the indiscriminate form fillers that try every form on the web, which is most of what arrives, and that is all they are for. The rate limit is what a determined script runs into.

**Cloudflare Turnstile is off, and switching it on is a code change, not a setting.** The worker can verify a Turnstile token and does so whenever `TURNSTILE_SECRET` exists. No page on this site produces one: rendering the widget means loading a script from `challenges.cloudflare.com`, and this site deliberately loads no third-party scripts at all, so that it keeps working from a campus network that cannot reach them. So setting the secret on its own takes every form offline for everybody, and the failure reads to submitters as an accusation of spamming. If you decide the endpoint needs Turnstile, it is three steps together: add the widget and its external script to the form page, set the secret, and then test reachability from mainland networks again from the beginning, because you have just added a cross-border dependency to the form itself. Do not do the middle step alone.

If the endpoint is abused:

1. **Tighten the rate limit and deploy again.** The two windows are a pair of numbers in the worker; halve them, or drop the hourly one to one or two, and see whether that ends it. This is usually enough. A Cloudflare rate-limiting rule in front of the route is the blunter version, useful if the traffic is not even reaching the worker's own counter.
2. **Rotate the private key**: generate a new one on the App's settings page, set it as the secret, then delete the old key. Old key gone, nothing else changed.
3. **Close the door** as described above, and clear `submit_url` so the site stops offering a form nobody can send. Everything else keeps working; contributors use email or GitHub in the meantime.

## Privacy

The worker handles real personal data: names, institutions, email addresses, sometimes a personal web page. It sees them in transit, on a host outside mainland China, and it must not write any of it down. Rules for anyone editing the worker:

- Never log field values. Log the submission type, the outcome, and the issue number if one was created. That is enough to debug and no more.
- Never echo submitted values back in an error message beyond the field label that failed.
- Do not enable request-body logging or log forwarding at the host.
- `submit_url` must be `https`, which `src/lib/network.ts` enforces at build time.
- The one thing the endpoint does keep is the rate-limit counter, which is held against a hash of the submitter's address and expires within a day. No field value is stored anywhere, by anything, at any point.

The submission itself becomes a public GitHub issue, which is exactly what the issue forms do already, and the consent checkboxes on the form say so. What the network publishes, on what basis, and how to have it removed, is in [privacy and consent](../privacy-and-consent/). When you switch the forms on, add a sentence there naming the host of the endpoint, so the path personal data takes stays fully described on the page that describes it.

## Known limitations

Three things this door does not do, all of them deliberate. Say them out loud to anyone who asks how the forms work; none of them is a secret and each is a trade we made on purpose.

### Anything typed into a form is published verbatim

A field goes into the public issue exactly as the submitter typed it. That is the whole point of the design: the intake workflow has to read back the same text the endpoint checked, so that what a coordinator approves is what gets published, and any escaping we did on the way in would end up inside the stored data file with the escape still in it.

The cost is that GitHub reads that text too. A submission can contain `@someone`, which GitHub turns into a real notification, or `owner/repo#123`, which GitHub turns into a cross-reference on somebody else's issue, and it arrives under the network's own App rather than under a person's name. We keep the exact round trip and accept this. The mitigations are the two that already exist: the rate limit makes doing it at any volume expensive, and nothing reaches the site until a coordinator merges. If you see it used to pester somebody, close the issue, say so to the other coordinators, and treat the sender as abuse.

The same faithfulness rule works the other way as well. A long answer that contains a line beginning `###` and repeating one of the form's own questions would be read back as the start of a different field, so the endpoint refuses that submission with a message naming the line, rather than filing something it knows would be parsed differently.

### A web submission has no author who can fix it

The issue belongs to the App, so when the intake workflow rejects one, the `needs-changes` label is a coordinator's task and not the submitter's. Most rejections happen at the door instead, in the browser, while the person can still act on them: the endpoint runs the same cross-field rules as the intake workflow, not just the per-field ones. What survives that is described in the [operations handbook](../operations/) and in the table at the end of this page.

### No photo upload

The web form does not accept a photo upload, on purpose, and the endpoint refuses to carry one: a `photo` value posted straight to it never reaches the issue. The intake script downloads photos only from `github.com` and `*.githubusercontent.com`, an allowlist that stops a submitted link from pointing the workflow at an arbitrary host. A file uploaded through the web form would have to live somewhere else, so it would need object storage plus a hole in that allowlist, and neither is worth it for v1.

Photos are optional in any case: the roster shows initials without one. The form says plainly that a photo can be added later, and later means one of these:

- reply to the coordinator on the pull request or the issue with the photo attached, and a coordinator adds it;
- or send it to the contact address;
- or, for people who do have an account, submit through the GitHub issue form, which does take an upload.

The upgrade path, when someone wants to build it:

1. Add object storage, for example a Cloudflare R2 bucket, and have the worker hand the browser a short-lived upload URL for one image under a small size limit.
2. Put the resulting stable public URL into the photo field of the issue body, as a link, exactly where a GitHub attachment link would go.
3. Add that storage host, and only that host, to `allowedPhotoHost` in `scripts/intake.mjs`. One exact hostname, no wildcards; the guard is there to keep the workflow from being pointed anywhere it is told.
4. Delete the uploaded file once the pull request is merged and the resized photo is committed, so the bucket does not become a second, unreviewed store of personal data.

## When something looks wrong

| Symptom | Likely cause |
| --- | --- |
| The form says it could not reach the server | The endpoint is down, blocked from that network, or the origin is missing from `ALLOWED_ORIGIN`. Ask the submitter to use the GitHub form, then check the host's dashboard and `npx wrangler tail`. |
| The form lists problems above the fields | Ordinary validation. The text is meant to be read by the submitter; fix the field and send again. |
| The form says an answer repeats one of the form's own questions | A line inside that answer begins with `###` and matches a question on this form, so the intake parser would read it as the start of another field. The endpoint refuses rather than file something that would be read back differently. Reword or remove the line. |
| Every submission answers with a generic failure, and the log shows `E_CONFIG` or `E_ISSUE_404` | The deployed Worker does not have the settings you think it has. `[vars]` only reaches it on a deploy, so run `npx wrangler deploy` again, and check `GITHUB_OWNER` and `GITHUB_REPO` against the repository's address bar. |
| A submitter reports being told to wait | The rate limit answered `429`: five submissions a minute with the platform limiter alone, or five an hour and twenty a day once the KV counters are set up too. If it is a genuine flurry from one institution, that is what the GitHub form and the contact address are for; if it happens often, the windows are too tight. |
| The issue appears but no workflow runs | The issue is missing its `intake` label or the title prefix, or the token used was not an App installation token. Check the App's permissions and that the labels exist (the *Create labels* workflow creates them). |
| The issue appears and the workflow fails | Not a worker problem, but it is your problem: an issue opened by the App has no author who can edit it. Read the workflow comment, then fix the issue body yourself, which re-runs the workflow, or write to the contact address in the submission. See the standing task in the [operations handbook](../operations/). Never leave a `needs-changes` label sitting on an App-authored issue waiting for a submitter to act. |
| A submission's last field is truncated or has a stray line | The issue body is malformed. The worker must emit the fields in the order `scripts/lib/forms.mjs` declares them and put any note of its own in a separate comment, never appended to the body. |
