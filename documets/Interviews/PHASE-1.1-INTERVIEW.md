# **PHASE-1.1-INTERVIEW.md**

## **Requirements Discovery & Context Capture**

**Date:** August 23, 2026  
**Session Goal:** Elicit core architectural goals, functional constraints, privacy boundaries, and ingestion workflows for the Personal Knowledge & Executive Assistant System.

### ---

**Key Insights & User Constraints**

> * **Privacy & Execution Environment:** Must run strictly locally on the workstation. No external cloud API costs, with total data privacy. Overnight batch execution is acceptable for background heavy tasks.  
> * **Knowledge Vault Structure:** Storage uses plain-text Markdown files organized in an Obsidian-compatible directory. Local vector database (RAG) indexes the vault for dynamic context retrieval by a local LLM.  
> * **Proactive Daily Briefing:** The system must run an overnight background job to digest incoming emails and calendar appointments, outputting a consolidated Daily Report Markdown file before the user begins the day.  
> * **Two-Tier Ingestion Pipeline:**  
  * *Structured Pathway:* Direct intake for clean text, voice-to-text transcripts, and native .md files without transformation.  
  * *Unstructured Pathway:* Sanitization pipeline for URLs (stripping navigation/headers/footers HTML noise), PDFs, Word documents, and images to produce clean Markdown notes.  
> * **User Hints & Tagging:** Allows optional manual tag assignment during capture (e.g., \#software, \#religion) to serve as primary seed hints for LLM vault classification.

### ---

**Transcript Summary**

**User:** Established constraints around local execution, Obsidian Markdown compatibility, RAG vector indexing, voice dictation, and daily email summaries.  
**Architect:** Formulated Functional Requirements FR1 through FR6, explicitly distinguishing between direct structured intake and unstructured extraction pipelines.