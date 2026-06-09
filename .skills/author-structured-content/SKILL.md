---
name: author-structured-content
description: Orchestrate end-to-end DA Structured Content creation from any source — URL, JSON, file, image/PDF, topic, or plain-language brief. Use whenever a user describes source material (a website, a JSON blob, a topic, a document) AND wants the result ending up in DA (mentions org/site, "import", "create as structured content", "save to DA") — even if they don't say "schema" or "structured content" explicitly. Skip when only HTML output is needed (use serialize-structured-content), only a schema (use generate-schema), only an import into an existing schema (use import-structured-content), or only validation (use validate-structured-content).
license: Apache-2.0
compatibility: Pure orchestrator — delegates all work to generate-schema, import-structured-content, and (via import) serialize-structured-content. Editor URL templates have a canonical source in compute-editor-urls but are mirrored inline by the sub-skills (no runtime delegation). Requires those skills installed plus DA MCP and DA-SC MCP for the sub-skills. Uses general WebFetch/Read for source ingestion.
metadata:
  version: "0.1.0"
---

# Author Structured Content (Orchestrator)

This skill is a pure orchestrator. It coordinates schema generation and document import to produce structured content stored in DA. It does not call `sc_*` or `da_*` tools directly — every piece of real work is delegated to a sub-skill. The reason for this strict separation: when each topic has one owner, a change to (say) schema-key policy only needs to happen in one place, and the orchestrator's job stays small enough that the routing logic is easy to verify.

## Delegation Chain

```
author-structured-content (this skill — orchestrator, owns final user response)
├── generate-schema           (delegated, Step 2)
└── import-structured-content (delegated, Step 3)
    └── serialize-structured-content (delegated, internally by import)
```

This skill drives the chain. Each sub-skill runs in **delegated mode**, returns a structured handoff payload, and yields back to this skill's workflow. The user sees only what Step 4 below produces.

## Trigger / Skip

- **Trigger when:** the user wants the result stored in DA (`org` + `site` mentioned, "import", "save to DA", "create as structured content", etc.) from any source. Covers URL → SC, JSON → SC, topic → demo SC, file → SC.
- **Skip when:** only HTML output is wanted (**serialize-structured-content**), only a schema is wanted (**generate-schema**), the schema already exists and only a document is needed (**import-structured-content**), or only validation is wanted (**validate-structured-content**).

## Required Inputs

- **`org` and `site`** — the DA tenant. **Always ask the user.** Never derive from memory, prior sessions, or a source URL. Wrong-tenant writes are hard for the user to undo.
- **Source input** — URL, file path, image, PDF, raw payload, topic/brief, etc.
- **`schemaName`** — derive from source if missing; confirm only if truly ambiguous. The storage location is fixed (`/.da/forms/schemas/{schemaName}.html`).
- **`docPath`** — always confirm with the user before saving. The document's location is the user's choice. Propose a sensible default based on `schemaName` and content; never save without confirmation.

These requirements override any general "don't stop and ask" preference. If source input is missing or unclear, ask the user.

## How Delegation Passes Data

Two channels, separate concerns:

1. **Mode signal** via the Skill tool `args` string: `mode=delegated, caller=author-structured-content`.
2. **Actual data** (payload, names, paths, user decisions) — state these clearly in the message immediately before invoking `Skill(...)`. The sub-skill reads its inputs from that message.

`args` is kept small because it's a single string and stuffing large JSON payloads into it is brittle. The invocation message is the channel for data.

**`caller` field semantics:** the immediate calling skill's name, used for logging and traceability. It does not change sub-skill behavior. In nested chains (author → import → serialize), each invocation reports its own immediate caller — when import invokes serialize, `caller=import-structured-content`, not `caller=author-structured-content`.

## Handoff Payload Status (shared across all sub-skills)

Every sub-skill's handoff payload starts with a `status` field. Branch on it:

| `status`              | Meaning                                                                      | Orchestrator action                                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`                  | Sub-skill completed; payload fields populated.                               | Continue to the next step.                                                                                                                     |
| `needs_user_decision` | Sub-skill paused awaiting a user choice; payload contains `decisionRequest`. | Surface options to the user; once they decide, re-invoke the same sub-skill with the decision stated in your message (see "Resumption" below). |
| `failed`              | Sub-skill could not proceed; payload contains `error`.                       | Stop the orchestration and surface the failure with context. Do not silently try to recover.                                                   |

## Resumption (after `needs_user_decision`)

When a sub-skill returns `status: "needs_user_decision"`:

1. **Read `decisionRequest.type` first.** The rest of `decisionRequest`'s shape depends on the type — there is no single "options" field that works for every kind of decision. Known types and their shapes:
   - `reserved_key` — per-key decisions under `decisionRequest.keys[i]`, each with its own `options` array, `key`, and `path`. Present each key separately.
   - `validation_errors` — flat `decisionRequest.options` (typically `["proceed_anyway", "abort"]`) plus `decisionRequest.errors` listing the validation issues. Present errors with options once.
   - Other types may be added by future sub-skills; treat `decisionRequest.type` as the discriminator and follow the shape the sub-skill documented.
2. Present the relevant options to the user clearly.
3. Wait for the user's reply.
4. **If the user aborts** (says "abort", "cancel", "stop", etc.), do NOT re-invoke the sub-skill. Surface the abort as your final response (e.g., "Aborted at user request — no schema or document was created.") and stop. The orchestration ends here.
5. **Otherwise:** in your next message, state both the original source payload and the user's decisions (e.g., "Source payload: … Reserved-key decisions: `$ref → ref`."), then invoke the same sub-skill again with the same `args` (`mode=delegated, caller=author-structured-content`). The sub-skill reads the decisions from the invocation message and proceeds.

## Orchestration Workflow

### Step 0 — Confirm target with the user (org, site, document path)

Before any delegation, all three values must be confirmed by the user in the current conversation. Memory, prior sessions, and hints in the source URL do not count.

- **`org` and `site`** — always ask. Do not propose defaults; do not derive from source URL or memory.
- **`docPath`** — the schema location is fixed (`/.da/forms/schemas/{schemaName}.html`) and needs no confirmation, but the document path is the user's choice. Propose a sensible default based on `schemaName`, content, and any folder hint, then ask the user to confirm or correct.

A general "don't stop and ask" preference does not override this step. Wait for explicit confirmation of all three before invoking any sub-skill.

### Step 1 — Detect source type and prepare a structured payload

Identify the source type and produce a structured payload to pass downstream:

- **URL:** fetch (using your general WebFetch / browsing ability — not an `sc_*`/`da_*` tool) and identify candidate structures (lists, cards, repeating sections). Build a structured representation.
- **Image / PDF:** extract structured content using your general reading abilities.
- **Raw structured payload (JSON, etc.):** parse, do not modify keys or shape.
- **Plain-language brief / topic (use case "demo"):** synthesize a small, plausible sample data shape for the topic — enough fields to be a useful demo (typically 3–6 fields, at least one nested structure if natural). Keep names simple and human-readable; the schema generated from this will be the user's first impression of structured content.

Pass the structured payload through to **generate-schema** without reshaping it. Key/shape policy is owned downstream — restating it here would put the rule in two places and risk drift.

### Step 2 — Delegate schema work to generate-schema

State the payload, `schemaName`, `org`, `site` in your message, then invoke:

```
Skill(skill="generate-schema", args="mode=delegated, caller=author-structured-content")
```

Branch on the returned `status`:

- **`ok`** — `keyMappings` may be non-empty; apply those renames to the source payload before Step 3 (the schema and the data must agree). Continue.
- **`needs_user_decision`** — follow the Resumption protocol above. Re-invoke with the user's decision in context. Loop until `ok` or `failed`.
- **`failed`** — stop. Surface `error.code` and `error.message`.

Expected `ok` payload:

```json
{
  "status": "ok",
  "schemaJson": {},
  "schemaPath": "/.da/forms/schemas/{schemaName}.html",
  "schemaEditorUrl": "https://da.live/apps/schema#/<org>/<site>",
  "keyMappings": [],
  "notes": "..."
}
```

### Step 3 — Delegate document work to import-structured-content

State the (renamed if needed) source payload, `schemaName`, `org`, `site`, `docPath`, and a title hint (prefer source `title`, otherwise derive) in your message, then invoke:

```
Skill(skill="import-structured-content", args="mode=delegated, caller=author-structured-content")
```

Branch on `status`:

- **`ok`** — capture the editor URL and continue to Step 4.
- **`needs_user_decision`** — for example, validation surfaced errors and the user must choose to fix or override. Follow the Resumption protocol.
- **`failed`** — stop and surface the failure.

Expected `ok` payload:

```json
{
  "status": "ok",
  "docPath": "...",
  "validationResult": { "ok": true, "errors": [] },
  "editorUrl": "https://da.live/form#/<org>/<site>/<path>",
  "notes": "..."
}
```

### Step 4 — Compose the final user-facing response

You own this. Sub-skills produced no user-facing output (they ran in delegated mode), so the user sees only what you write here:

- Source type summary (e.g., "URL → 3 structures detected", "JSON → product catalog shape", "Demo for topic: blog posts")
- `schemaName` and saved schema path (from Step 2)
- **Schema editor URL** (from Step 2's `schemaEditorUrl`). Note: the URL is for the org/site schema list; mention the schema name in surrounding prose so the user knows what to look for (e.g., "Schema editor (find `{schemaName}` in the list): \<url\>").
- Saved document path (from Step 3)
- **Document editor URL** (from Step 3's `editorUrl` — use directly, do not re-fetch or re-compute)
- Any notable decisions: key mappings, validation issues resolved, derived titles

## Boundaries

- Schema design / validation / save / key policy → **generate-schema**.
- Document payload shape → **serialize-structured-content** (driven through **import-structured-content**).
- Document validation and DA write → **import-structured-content**.
- Editor URL templates → canonical source in **compute-editor-urls**. At runtime, **generate-schema** and **import-structured-content** compute URLs inline using mirrored templates (no `Skill(...)` delegation hop), and this orchestrator reads the resulting URLs from their handoff payloads (`schemaEditorUrl`, `editorUrl`) — author never constructs URLs itself.

This skill calls no `sc_*` or `da_*` tools directly. If a sub-skill is unavailable or returns `failed`, stop and surface the failure with the `error.code` and `error.message` from its handoff — silently routing around a missing sub-skill defeats the ownership model and produces inconsistent results.

**When a sub-skill returns `error.code = "tool_unavailable"`** (DA or DA-SC MCP not installed), the sub-skill's `error.message` should contain the install command. Surface that command verbatim to the user so they have a clear next step, e.g.:

> "I couldn't complete the import because the DA MCP server isn't installed in this environment. To enable it, run:
>
> ```
> claude mcp add da --scope user --transport http https://mcp.adobeaemcloud.com/adobe/mcp/da
> ```
>
> Then ask me to retry."

## Troubleshooting

| Issue                                                                     | Likely Cause                                                 | Fix                                                                           |
| ------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Sub-skill returned a user-facing wrap-up instead of handoff payload       | Missing `mode=delegated` in args                             | Re-invoke with correct args                                                   |
| Sub-skill returned `status: "needs_user_decision"`                        | Reserved key, validation conflict, etc.                      | Follow the Resumption protocol; do not skip the user step                     |
| Sub-skill returned `status: "failed"` with `error.code = "missing_input"` | Forgot to state required data in the message before invoking | Restate inputs and re-invoke                                                  |
| Sub-skill returned `status: "failed"` with `error.code = "tool_unavailable"` | DA MCP or DA-SC MCP not installed | Surface the install command from `error.message` verbatim to the user (sub-skills include it). If the message lacks a command, the canonical ones are: DA-SC MCP — `claude mcp add da-sc --scope user --transport http https://da-sc-mcp.adobeaem.workers.dev/mcp`; DA MCP — `claude mcp add da --scope user --transport http https://mcp.adobeaemcloud.com/adobe/mcp/da`. Do not retry until the user confirms the MCP is installed. |
| Sub-skill returned `status: "failed"` with another `error.code`           | Genuine downstream failure                                   | Surface to user with full error context; do not retry blindly                 |
| Handoff payload missing the `status` field                                | Sub-skill is out of date                                     | Treat as `failed`; ask user to update the sub-skill                           |
| Editor URL missing in final response                                      | Step 2 or Step 3 handoff payload was not captured            | Re-run the relevant sub-skill; never construct URLs manually — use the URL from the sub-skill's handoff, whose canonical template lives in **compute-editor-urls** |
| Sub-skill's handoff JSON appears as the final user-visible text of the turn | Resumption protocol skipped after the sub-skill returned | After every `Skill(...)` invocation, the next assistant text must be the caller's next workflow step (Step 4 for this orchestrator — composing the user-facing summary). A raw handoff payload must never be the final turn output. Re-read the sub-skill's "After the handoff" rule and continue the parent's workflow in the same turn. |
