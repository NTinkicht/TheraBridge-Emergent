# External independent PR reviews (Mistral / Grok / Codex)

This repository's existing GitHub Codex integration is independent from the
optional **Mistral AI** and **xAI Grok** API-based reviewer automation.

The single workflow at `.github/workflows/auto-review-trigger.yml` is
conservative by default: it does **not** invoke paid model APIs until the
repository owner explicitly enables them. A PR comment is not evidence that a
model actually reviewed a change.

## What is automatic

On a non-draft, same-repository PR open/reopen/new commit/ready-for-review,
the workflow:
1. Re-fetches the live PR and verifies both exact head and base SHAs;
2. Posts one SHA-deduplicated `@codex review` request using the existing GitHub
   integration. Codex's own review receipt is the evidence of completion;
3. Only when the **explicit paid API opt-in** is enabled, gathers a complete,
   bounded text-only PR patch and invokes the configured Mistral and/or Grok
   API endpoint with read-only, no-tool reviewer instructions;
4. Validates the model's response shape, finding file paths and severities,
   re-fetches exact head/base, then posts a SHA-scoped advisory result with
   model name and provider response ID. Failure, incomplete source evidence
   and malformed responses are `INSUFFICIENT_EVIDENCE`, never PASS.

No workflow step checks out or executes arbitrary PR content with provider
credentials. Fork PRs are skipped instead of being silently given write
permissions. No signing, clinical release, approvals, auto-merge or deploy.
The independent API result is published by `github-actions[bot]`: it is
**not** a native Mistral/Grok GitHub App approval or a replacement for human
review or six-job exact-head GitHub CI.

## Owner configuration (paid API approach only)

**Do not enable merely because keys are available.** Provider chat
subscriptions and connected GitHub Apps do not by themselves supply API
credentials or guarantee included usage. Calling provider APIs may consume
billable tokens.

Under the TheraBridge-Emergent repository **Settings -> Secrets and variables
-> Actions**, add only the providers you expressly wish to use:

- Secret `TB_MISTRAL_REVIEW_API_KEY`: an authorized Mistral API key.
- Secret `TB_XAI_REVIEW_API_KEY`: an authorized xAI API key.
- Variable `TB_PAID_REVIEW_OPT_IN=true`: enable metered inference only when
  you have separately verified billing/limits and approved this spending.
- Optional variables `TB_MISTRAL_REVIEW_MODEL` (default:
  `mistral-large-latest`) and `TB_GROK_REVIEW_MODEL` (default: `grok-4`).
  Specify only a model currently supported by the respective account.

Never put API keys in ChatGPT conversations, files, commits, PRs, GitHub
issues or workflow logs. Configure them only using GitHub's secret controls.
To stop inference, unset or set `TB_PAID_REVIEW_OPT_IN=false`. The zero-spend
default survives missing secrets and disabled variables.

The GH workflow does not include CI polling: the existing `ci` workflow
already exposes the six actual job conclusions. The previous PR #97
implementation incorrectly mistook workflow names for those jobs.

## Call a model reviewer on demand from a ChatGPT GitHub comment

Once this workflow is merged to the repository **default branch**, its
`issue_comment` trigger accepts exactly these commands, authored by the
owner's authenticated `NTinkicht` account in a PR conversation:

```text
/review-mistral <current exact 40-character HEAD SHA>
/review-grok <current exact 40-character HEAD SHA>
/review-both <current exact 40-character HEAD SHA>
```

ChatGPT with an authorized, **write-enabled** GitHub integration can
obtain the current HEAD and post one of these exact comments, similar to
requesting `@codex review`. A read-only GitHub connection cannot post these
commands. The workflow
revalidates the current live PR/head before any provider call. This command
**does not magically connect an existing subscription**. Without the
explicit API billing opt-in and the relevant secret, the workflow reports
NOT EXECUTED. It never reports a completed review without a model response.

For a newer commit use its newer SHA; old results cannot be reused. The
workflow's `issue_comment` job rejects other authors and other comment
formats, prevents bot-message loops, and does not run any PR code.

## Existing subscription-backed alternatives

The Mistral reviewer under `NTinkicht/OneCompany` has included-plan,
owner-dispatched read-only infrastructure, but its TheraBridge exception was
pinned **only to PR #53 at an exact historical SHA**. It cannot be invoked
for arbitrary TheraBridge PRs without a separate reviewed and owner-authorized
OneCompany policy/dispatch update. Do not reuse the old pinned command.

Grok Bot under OneCompany has a provider-native read-only cloud workflow, but
the authenticated GitHub result publisher and cross-repo authority for
TheraBridge are not established. Posting a Grok prompt to GitHub does not wake
or authenticate that reviewer.

If the owner's requirement is **no additional API spending**, leave the
paid API path OFF and extend those provider-native integrations only after
their independent authorization, zero-overage checks and real execution proof.
There is no supported way to move a Mistral/Grok subscription session into
this GitHub workflow as though it were a GitHub API key.

## Dispatch reliability and model-output safety

Review jobs use **job-level** concurrency keyed by PR number with
`cancel-in-progress: false`. Skipped or irrelevant comment events cannot
interrupt a provider request, and eligible jobs serialize. Both the exact
HEAD **and BASE** are part of request and provider-result deduplication:
retargeting a PR with the same HEAD changes the diff and requires a new
source-qualified result.

**Metered-call reservation:** Before contacting a paid provider, the workflow
persists a `therabridge-provider-attempt` marker scoped to provider, HEAD
and BASE. If this GitHub write fails, the model is never called. If the call
succeeds but result publication fails, or the outcome is otherwise uncertain,
the attempt marker **prevents all automatic retries for the same comparison**.
A reservation is NOT evidence of review success or a valid model verdict;
mark it **UNKNOWN / INSUFFICIENT_EVIDENCE**. Do not delete its marker or
re-trigger a paid review without separately checking the provider invoice and
explicit owner approval. If the PR becomes stale during a provider call,
discard the result and stop dispatching any remaining providers. Case-insensitive
manual commands are normalized (including an uppercase exact SHA) before
matching against the live GitHub head. For renames, both the source
`previous_filename` and destination `filename` are checked against forbidden
paths before a provider receives diff content.

Review text and finding descriptions are **untrusted** model output. They
are HTML-escaped and mention-neutralized before GitHub bot comments are
posted; workflow-owned exact-head evidence markers are kept separate.
The safety guard does not claim a provider actually reviewed anything unless
a real API result was received. Invalid JSON, HTTP failure, incomplete or
oversized diffs, and head/base movement remain fail-closed and cannot grant
a PASS. Unit fixtures are offline and **never send paid provider requests**.

## Merge requirements

Both providers are optional advisory reviewers, not self-reviewers or merge
bots. Each result applies only to the exact SHA recorded on its comment.
Review source completeness, authorization, resolved review threads, all six
current-head CI jobs, and material-author independence separately before any
owner-authorized merge. The hosted #61 QA acceptance ledger is separate.
