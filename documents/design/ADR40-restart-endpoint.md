---
name: ADR40-restart-endpoint
description: ADR40 — POST /api/restart spawns a detached PowerShell relauncher and then calls System.exit, and what that script's contract is
date: 2026-09-09
metadata:
  version: 1.0
  created-by: Claude Opus 5
  adr: 40
  arises-from: P1.22
---

# ADR40 — Restart is a detached script plus `System.exit`

**Date:** 2026-09-09
**Status:** Accepted
**Amends:** ADR36, on one point — the no-`System.exit` rule, for the restart path only
**Arises from:** Story P1.22

*Numbered 40, not 39: ADR38 reserves ADR39 for whatever closes DD-4.*

*Written as its own file rather than appended to `ADRS.md`, for the reason ADR29, ADR30, ADR31, ADR35
and ADR38 were. It folds into `ADRS.md` with the others.*

## Context

`POST /api/shutdown` stops the application (P1.15, ADR36). Nothing starts it again. Restarting means
going to a terminal and running `bootRun`, which is the loop anyone changing configuration is in all
day — `application.yaml` is read once at startup, so every key in it costs a manual round trip.

A process cannot relaunch itself. Once the context closes the web server stops, and the thing that
would issue the new launch is the thing that just died. Whatever performs the relaunch has to be
running outside the JVM before the JVM goes away.

Two facts about the current code shape the decision.

**The process exit code carries no information.** `ShutdownController` calls
`SpringApplication.exit(context, () -> 0)`, which computes an exit code and closes the context. It
does not exit the JVM. The JVM ends on its own once the web server's non-daemon thread stops, and it
ends with 0 whatever that generator returned. So a supervisor cannot tell "restart me" from "stop"
by watching the exit code — not without adding a call that sets it.

**ADR36 deliberately has no `System.exit`.** Its reasoning is sound for shutdown: closing the context
is sufficient, because the web server holds the only non-daemon thread and every actuator thread is a
daemon. Nothing needs forcing.

## Decision

### 1. `POST /api/restart` spawns a detached PowerShell process, then calls `System.exit`

In order: stop the actuator threads inline the way `/api/shutdown` does, spawn the relauncher, answer
`202 Accepted`, then exit the JVM after the existing `shutdown.close-delay-ms` grace period so the
response reaches the caller first.

The spawned process is detached — started so that it outlives its parent. On Windows a process
created by `ProcessBuilder` is not placed in the parent's job object, so it survives the parent's
exit without anything extra being done. That property is what the whole design rests on, and it is
worth a test rather than an assumption.

### 2. `System.exit` is used here, and this amends ADR36 on that one point

ADR36's no-`System.exit` rule stands for `/api/shutdown` and is not reopened. Restart is different in
a way that matters: **the successor needs port 8080, so the predecessor has to be gone at a
predictable moment, not merely on its way out.** Closing the context and letting the JVM wind down
when its last non-daemon thread finishes is an unbounded wait as far as the caller is concerned.
`System.exit` makes it bounded, and it still runs the Spring shutdown hook, so the context closes
properly rather than being skipped.

The cost is real and accepted: a forced exit is a worse citizen than a clean wind-down, and if a
non-daemon thread is ever added that must finish its work, this path will cut it off. That is a
reason to revisit, recorded here so it is found.

### 3. The relauncher's contract

`scripts/restart.ps1`, given the old JVM's process id and the repository root. It:

1. Waits 30 seconds.
2. Checks whether the old process is still running.
3. If the old process is gone **and** something is listening on 8080, exits silently — someone else
   has already brought the application back, and a second `bootRun` would only fail to bind.
4. Otherwise, launches `bootRun`.

Step 4 goes through `scripts/build-log.ps1 -Task bootRun`, the way every other Gradle invocation in
this repository does, so the run is logged in `@logs/` like any other.

The 30-second wait is doing more than letting the JVM die. `bootRun` holds the Gradle project lock
for as long as the application runs, and a second Gradle invocation blocks on it rather than failing
— P1.19 hit exactly this. The wait gives the old Gradle process time to release it.

### 4. The old process id is passed to the script, not discovered by it

`ProcessHandle.current().pid()` is the JVM's own id. Passing it removes the only ambiguous step the
script would otherwise have: "which java process was the old one" has no good answer from outside,
and guessing by port would race the successor it is meant to detect.

## Known gap, accepted for now

**If the old process is still alive after 30 seconds, the script launches `bootRun` anyway, and that
launch fails to bind port 8080.** This follows from the contract as specified: the silent exit is
conditioned on the old process being gone *and* a new listener existing, so an old process that
refuses to die falls into the "otherwise" branch.

This is recorded rather than designed around, deliberately. The failure is visible — it lands in
`@logs/v04-bootRun.log` as a bind error, with the old application still serving — which is a better
first version than a retry loop written before anyone has seen the case occur. Refining the script is
expected; this ADR is not the last word on it.

Two smaller gaps in the same category:

- The wait is a fixed 30 seconds rather than a poll. A restart therefore always costs 30 seconds of
  downtime even when the JVM exits in two.
- The endpoint has no authentication, exactly like `/api/shutdown`. A single-user application on a
  desktop, but it now binds all interfaces (the phone reaches it at `192.168.1.166:8080`), so anyone
  on the network can restart it. Worth a decision if the application ever leaves this machine.

## Alternatives rejected

| | Why not |
|---|---|
| Supervisor loop (`run.ps1` relaunches on a sentinel file) | Cleaner in principle, and the restart logic never enters the server. Rejected because it only works when the supervisor started the application — from VS Code or a bare `bootRun` it silently degrades to a shutdown, and the server cannot tell which case it is in without an environment variable the launcher has to remember to set |
| Signal restart through the process exit code | Needs `System.exit` anyway to set the code at all, so it buys nothing over decision 1 while still requiring the wrapper the option above was rejected for |
| Spring Boot DevTools restart | Restarts the context in a second classloader, not the JVM. Does not pick up `application.yaml` changes reliably and does not help when the reason to restart is freshly compiled code, which is most of the time here |
| Close the context and let the JVM wind down, as `/api/shutdown` does | Leaves the moment the port frees unbounded, which is the one thing the successor depends on |
