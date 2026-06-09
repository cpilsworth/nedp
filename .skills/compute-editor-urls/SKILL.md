---
name: compute-editor-urls
description: Compute the DA editor URL for a structured content document or schema from org, site, and (for documents) path. Use when the user asks "what's the editor URL for X", "where can I edit this", or similar — even casual phrasing. Skip when the user wants creation, import, validation, or serialization (those are different skills).
license: Apache-2.0
metadata:
  version: "0.1.0"
---

# Compute Editor URLs

Construct the DA editor URL for a structured content document or schema. This skill is the **canonical source of truth** for editor URL templates — when the DA scheme changes, update the table below first and propagate to any mirrored copies.

## When to Delegate vs. Inline

Two usage modes:

- **Standalone invocation** — for direct user questions like *"what's the editor URL for X?"*. Invoke this skill via the Skill tool; it produces the user-facing response.
- **Mirrored inline** — for orchestrated workflows. The calling skill embeds the URL template from the table below and computes the URL inline instead of invoking this skill via `Skill(...)`. Inline computation avoids an extra context switch and resumption point in the chain.

Prefer inline for any non-terminal step in a chain of skills. When a calling skill mirrors a template, it must reference this skill by name in a comment so mirrors can be kept in sync when the canonical changes.

## Trigger / Skip

- **Trigger when:** the user wants to know where to edit a specific structured content document or where to find the schema editor.
- **Skip when:** the user wants to create, import, validate, or serialize content (different skills own those flows).

## Prerequisites

None beyond org and site (and a docPath for the document case). No MCP tools required — this skill is pure computation.

## Invocation Modes

This skill runs in one of two modes, detected from the Skill invocation `args`:

- **Standalone (default):** no `mode` arg present, or `mode=standalone`. Return the computed URL to the user with a one-line explanation.
- **Delegated:** `args` contains `mode=delegated` (typically with `caller=<parent-skill>`). Return only the structured handoff payload below. The caller owns the final user response.

If args are ambiguous, default to standalone.

**After the handoff (CRITICAL — resumption rule):** the handoff payload is machine-internal — never the final visible output of your turn. After emitting it, immediately continue the caller's workflow at the step that invoked you, in the same assistant turn. Stopping or waiting for user input after the handoff violates the resumption protocol.

## How Input Reaches This Skill (delegated mode)

When called by another skill, inputs arrive in the caller's invocation message (immediately before the `Skill(...)` call). `args` carries only the mode signal.

Required inputs:

- `type`: `"document"` or `"schema"` — the discriminator.
- `org`, `site`.
- `docPath` — required only when `type=document`. The path is normalized (see Step 1).

If `type`, `org`, `site`, or (for documents) `docPath` is missing from context, return a `failed` handoff payload with `error.code = "missing_input"` and stop. Do not ask the user — in delegated mode the caller owns user interaction.

## URL Templates (owned by this skill)

| Type | Template |
|---|---|
| `document` | `https://da.live/form#/<org>/<site>/<path-without-.html>` |
| `schema` | `https://da.live/apps/schema#/<org>/<site>` |

Notes:
- The document path **must not** have an `.html` suffix in the URL. Strip it if present.
- The schema URL does not include a schema name. DA's schema editor presents a list for the org/site; the user navigates to the specific schema from there. When messaging the user, include the schema name in the surrounding prose (e.g., "Schema editor (find `{schemaName}` in the list)") rather than embedding it in the URL.
- Structured content documents use the `/form` route, **not** `/edit`. The `/edit` route is for regular DA content; structured content can only be edited through `/form`. Do not substitute one for the other.

## Workflow

### Step 1 — Normalize inputs
- If `type=document` and `docPath` ends with `.html`, strip the suffix.
- If `docPath` starts with a leading `/`, keep it as-is (template assumes one).
- Trim any trailing slashes.

### Step 2 — Apply template
Substitute `org`, `site`, and (for documents) the normalized path into the matching template above.

### Step 3 — Return
- **Standalone:** the URL plus a one-line description (e.g., "Document editor URL for `<path>` in `<org>/<site>`.").
- **Delegated:** the handoff payload below.

## Handoff Payload (delegated mode)

**Success:**
```json
{
  "status": "ok",
  "editorUrl": "https://da.live/...",
  "notes": "<one-line summary, e.g. 'document editor URL for /content/blog/hello'>"
}
```

**Failure:**
```json
{
  "status": "failed",
  "error": {
    "code": "missing_input | invalid_type | ...",
    "message": "Human-readable description"
  },
  "notes": "<optional context>"
}
```

This skill never returns `needs_user_decision` — there is nothing to decide.

## Boundaries

- No DA writes, no schema/document creation, no validation, no serialization.
- No preview or live URL construction (out of scope per current product needs).
- No MCP calls — URL construction is pure computation.

## Troubleshooting

| Issue | Likely Cause | Fix |
|---|---|---|
| URL has `.html` at the end | Step 1 normalization skipped | Strip `.html` from `docPath` before substitution |
| Schema URL has a schema name in it | Misread the template | Schema URL stops at `<org>/<site>`; surface the schema name in surrounding prose |
| URL points to wrong host | DA scheme changed | Update the templates in this skill — single source of truth |
| Caller passed `type=document` without `docPath` | Missing input | Return `failed` with `error.code = "missing_input"` |
