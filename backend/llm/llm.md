# LLM Orchestration Workflow (Event-Ledger Model)

## Overview
Speech Coach phase-2 orchestration uses one shared append-only ledger.

Two model roles write to the ledger:
- Subagents: small models that analyze ML events in short fixed windows and write notes.
- Flagship model: larger model that periodically reviews ledger notes and writes impressions.

The system is intentionally time-driven. It avoids stage/barrier orchestration and agent dependency graphs.

## Current State -> Gap -> Proposed Change -> Impact
Current State:
- ML pipeline generates objective speech events.
- LLM orchestration needs a single, traceable reasoning surface.

Gap:
- Without a unified workflow contract, agent responsibilities and context boundaries can drift.

Proposed Change:
- Adopt a simple event-ledger loop:
  - ML writes events.
  - Subagents run on 30-second windows and append notes.
  - Flagship runs every 2 minutes and appends impressions from ledger updates.
  - Flagship runs one final summary pass at the end.

Impact:
- Continuous reasoning during processing.
- Strong auditability from events -> notes -> impressions.
- Lower orchestration complexity for hackathon delivery.

## System Flow
```text
Video Upload
     |
     v
ML Processing Pipeline (audio + vision)
     |
     v
Event Store
     |\
     | \-- Subagents (every 30s window) --> append NOTES to ledger
     |
      \-- Flagship (every 2 min) -------> append IMPRESSIONS to ledger
```

All reasoning accumulates in the ledger.

## Component Responsibilities
### Event Store
- Stores objective ML outputs from audio/vision analysis.
- Contains detection signals such as pacing shifts, pauses, filler clusters, gaze, gesture, posture.
- Is never edited by LLM components.

### Subagents
- Process one fixed time window at a time (30 seconds).
- Read only events inside the active window.
- Write localized notes about what happened in that window.
- Do not produce global speech judgments.

### Flagship Model
- Runs on a fixed interval (every 2 minutes).
- Reads only ledger entries since its last run.
- Writes impressions that capture cross-window patterns and open questions.
- Performs one final full-ledger summary pass after processing completes.

### Ledger
- Shared append-only memory for model reasoning.
- Stores only model outputs (notes and impressions).
- Is never rewritten or backfilled by models.

## Agent Context Contract
| Agent | Trigger | Reads | Writes | Must Not Read |
|---|---|---|---|---|
| Subagent | Every 30-second window | Events in current window | Notes | Ledger history |
| Flagship (periodic) | Every 2 minutes | New ledger entries since last impression | Impression | Raw events |
| Flagship (final) | End of run | Entire ledger | Final summary impression | Raw events |

This separation keeps subagents local/objective and flagship global/synthetic.

## Runtime Loop
1. ML pipeline populates the event store for the session.
2. Subagent scheduler iterates through contiguous 30-second windows.
3. For each window, subagents append notes to the ledger.
4. In parallel, flagship scheduler runs every 2 minutes, reads new ledger slices, and appends impressions.
5. Steps 2-4 continue until all windows are processed.
6. Flagship performs one final pass over the full ledger and appends the final session summary.

## Final Summary Pass
The final flagship pass produces the closing evaluation for the session, including consolidated strengths, weaknesses, and coaching priorities. This pass is appended as the final ledger entry.

## Design Principles
- Ledger is the shared memory surface.
- Reasoning is incremental and traceable over time.
- Model roles are strict:
  - ML detects objective events.
  - Subagents interpret local windows.
  - Flagship synthesizes global patterns.
- Workflow stays simple and time-driven.

## Non-Goals (This Document)
- Database schema or storage field definitions.
- JSON payload contracts.
- Prompt text details or model-specific tuning.

## References
- `README.md` section 4.2 (Two-Phase Orchestration)
- `README.md` section 4.5 (Data Contracts and Ownership)
- `backend/backend.md` sections 1 and 3 (Architecture summary and ownership)
