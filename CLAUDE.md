# CLAUDE.md — 4thBrain v04 (Java Spring Boot)



**Build approach:** Three phases — Skeleton (all architecture in place, actuators stubbed), Implementation (real actuator logic + OpenAI SDK integration), Testing (unit + integration).
# AGENT DIRECTIVE & EXECUTION BOUNDARIES

You are an autonomous CLI coding agent running on a local engine. You must follow strict step-by-step execution rules. Never spew code or complete implementations into raw response text.

## 1. FILE SYSTEM & TOOL USAGE RULES
- **Do NOT stream raw code blocks to the user interface.**
- Write all implementation code, configuration files, or diffs **directly to disk** using your file execution/write tools (`Write`, `Edit`).
- If you need to inspect files, use file reading tools (`Read`, `Glob`, `Grep`) first.

## 2. INTERACTION & STOP GATES
- **One action per turn:** Execute **only one logical step** per turn (e.g., read a file, create a single module, or update a config).
- **Hard Stop Requirement:** After completing a file modification or single action step, **STOP immediately**.
- **Ask to proceed:** Once a step is written to disk, summarize what was done in 1-2 sentences and ask explicit clarifying or confirmation questions before continuing.
- **Do NOT proceed autonomously** to the next file or module until the user gives explicit confirmation in the next prompt turn.

## 3. WORKFLOW FOR IMPLEMENTING STORIES/TASKS
1. **Plan & Confirm:** Break down the task into small steps. Ask the user to confirm the plan.
2. **Execute Single Step:** Modify or write **one** file to disk using tool calls.
3. **Verify & Pause:** State what file was updated/created and prompt the user: *"Step complete. Would you like me to proceed to [Next Step]?"*

## Project Overview

**4thBrain v04** is a complete reimplementation of the v03 Node.js application in Java Spring Boot. Same system requirements (FR1–FR9, NFR1–NFR12), same database schema (SQLite), same high-level flow: Ingest → Sanitize → Classify → Index, plus Briefing synthesis. Different architecture: actuators are Spring Beans running in dedicated threads, communicating via a Coordinator instead of relying on periodic polling.

## Key Decisions

- **No Job table:** Document.status alone tracks pipeline (ingesting → extracting → classifying → indexing → indexed). Simpler, message-driven design.
- **Thread config in YAML:** `actuators.threads.ingestor: 1` etc. Allow horizontal scaling without code changes.
- **ObjectFactory for instances:** ActuatorThreadConfig uses ObjectFactory to create prototype actuators with Spring dependency injection.
- **Synchronized DatabaseService:** Single synchronized service enforces ADR17 (brief transactions, no holding locks).