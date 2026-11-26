# JADIDULU Office

## QoderWake is the source of truth

The office uses the live `qoderwake waker list` result as the only Waker inventory. `jadidulu_roster_33-waker.json` is metadata only: role text, team room, squad, pod, and sharing defaults. A metadata entry without a live QoderWake match is planned, not a Waker. Planned entries are hidden in the Team tab toggle and are never drawn, counted, or routed.

Live Wakers are matched case-insensitively by name and retain their QoderWake ID. A live Waker without metadata remains visible with team `Unassigned` and a default avatar. The list refreshes at startup, every 30 seconds, on window focus, and through **Resync**. If QoderWake is unreachable, the last live list remains visible as stale/offline and Send is disabled.

The header shows `Live · existing/existing synced`. The Team counter is `working/existing`. Demo mode is off: the model starts in `live` mode and does not create demo Wakers, tasks, approvals, or credits.

## Role resolution and adding Wakers

Workflow routing uses roles, not personal names:

- `intake`: Q&A Specialist — the only role required to accept a project request.
- `product`: Product Manager.
- `estimate`: Estimator & Proposal.
- `plan`: Project Administrator and the fallback flow watcher when no Orchestrator exists.
- `design`, `frontend`, `backend`, `qa`, `devops`, and `change`: resolved through roster squad metadata.

Squad leads handle dispatch when several live Wakers share a squad. Orchestrator, Guardrail, Data Analyst, Client Comms, Invoicing, and Finance are not intake prerequisites. A missing later role is reported in Indonesian and pauses only that later stage.

To add a Waker, create it in QoderWake with its real role/description. Add matching metadata to the roster JSON only when you want a specific room, pod, squad, or appearance. It will appear within 30 seconds or immediately after **Resync**; no code edit is required. Unknown live Wakers are never dropped.

## Start

```bash
source "D:/kumpulan project/jadidulu-config/session-drive-d.sh"
export JADIDULU_QODERWAKE_CLI="D:/kumpulan project/qoderwake-data/.qoderwake/bin/qoderwake.exe"
export QODER_CONFIG_DIR="D:/kumpulan project/qoderwake-data/.qoderwake/qodercli"
cd "D:/kumpulan project/aiworkspace"
npm start
```

Open `http://127.0.0.1:19821`. All temporary files, package caches, the CLI, office source, and Waker workspaces stay under `D:\kumpulan project\`.

## Checks

```bash
node --test tests/resolver.test.mjs tests/chat.test.mjs tests/office.test.mjs
node tests/browser-check.mjs
```

Fixture tests are labeled `TEST FIXTURE` or `MOCK development only`; they do not prove a real task ran. Real acceptance requires a QoderWake message and task ID.
