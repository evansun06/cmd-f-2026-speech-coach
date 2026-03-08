from __future__ import annotations

from typing import Any

from celery.result import AsyncResult

from sessions.models import CoachOrchestrationRun, CoachOrchestrationRunStatus

from .ledger import mark_run_processing
from .subagent_workflow import create_subagent_execution_for_window
from .tasks import (
    finalize_subagent_run_task,
    run_flagship_final_reconcile_task,
    run_subagent_window_task,
)


def enqueue_subagent_window_job(
    *,
    run: CoachOrchestrationRun,
    session_id: str,
    system_prompt: str,
    window_start_ms: int,
    window_end_ms: int,
    events: list[dict[str, Any]],
    word_map: list[dict[str, Any]],
    metadata: dict[str, Any] | None = None,
) -> tuple[AsyncResult, str]:
    """Create one queued window execution and enqueue its subagent task."""
    if run.status == CoachOrchestrationRunStatus.QUEUED:
        run = mark_run_processing(run=run)

    execution = create_subagent_execution_for_window(
        run=run,
        window_start_ms=window_start_ms,
        window_end_ms=window_end_ms,
    )
    async_result = run_subagent_window_task.apply_async(
        kwargs={
            "execution_id": str(execution.id),
            "session_id": str(session_id),
            "system_prompt": system_prompt,
            "events": events,
            "word_map": word_map,
            "metadata": dict(metadata or {}),
        }
    )
    return async_result, str(execution.id)


def enqueue_subagent_window_jobs(
    *,
    run: CoachOrchestrationRun,
    session_id: str,
    system_prompt: str,
    windows: list[dict[str, Any]],
    metadata: dict[str, Any] | None = None,
) -> list[dict[str, str]]:
    """Enqueue many subagent window jobs in deterministic chronological order."""
    sorted_windows = sorted(
        windows,
        key=lambda item: (
            int(item.get("window_start_ms", 0)),
            int(item.get("window_end_ms", 0)),
        ),
    )
    jobs: list[dict[str, str]] = []
    for window in sorted_windows:
        async_result, execution_id = enqueue_subagent_window_job(
            run=run,
            session_id=str(session_id),
            system_prompt=system_prompt,
            window_start_ms=int(window["window_start_ms"]),
            window_end_ms=int(window["window_end_ms"]),
            events=list(window.get("events", [])),
            word_map=list(window.get("word_map", [])),
            metadata={**dict(metadata or {}), **dict(window.get("metadata", {}))},
        )
        jobs.append({"task_id": async_result.id, "execution_id": execution_id})
    return jobs


def enqueue_subagent_finalize_job(*, run_id: str) -> AsyncResult:
    """Enqueue the explicit finalize job that flushes Redis live-ledger to DB."""
    return finalize_subagent_run_task.apply_async(kwargs={"run_id": str(run_id)})


def enqueue_flagship_final_reconciliation_job(
    *,
    run_id: str,
    system_prompt: str | None = None,
) -> AsyncResult:
    """Enqueue flagship-final reconciliation graph execution for a run."""
    kwargs: dict[str, Any] = {"run_id": str(run_id)}
    if system_prompt is not None:
        kwargs["system_prompt"] = str(system_prompt)
    return run_flagship_final_reconcile_task.apply_async(kwargs=kwargs)
