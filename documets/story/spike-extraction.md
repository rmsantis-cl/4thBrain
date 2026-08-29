---
name: spike-extraction
description: Evaluate and select libraries for document extraction (PDF, images, archives to text)
metadata:
  version: 1.0
  created-by: Claude Code
  date: 2026-08-28
---

# Spike: Document Extraction Library Selection

## Abstract
Research and evaluate available libraries for converting binary documents (PDF, Word, images, archives) to plain text, then recommend the most suitable tool for 4thBrain's Extractor implementation.

## Description
The Extractor action (Story 1.2) needs to convert binary files into plain text for downstream indexing. This spike will survey available tools, evaluate them against 4thBrain requirements, and recommend a single library for implementation.

## Evaluation Criteria
- **Local execution** — no cloud API calls or external service dependencies
- **Format support** — PDF, DOCX/Word, images (with OCR), ZIP/archive contents
- **Extraction quality** — preserves semantic structure; handles tables, lists, embedded images
- **Dependency footprint** — minimal external dependencies, fits Node.js/Python ecosystem
- **OCR capability** — ability to extract text from image-based PDFs and scanned documents
- **License** — open-source or compatible with 4thBrain's use case
- **Ease of integration** — straightforward Node.js/Python integration

## Candidates to Evaluate
- PDF extraction (pdf-parse, pdfjs, pypdf, PyPDF2, pdfplumber, etc.)
- Office document extraction (mammoth, python-docx, etc.)
- OCR tools (Tesseract, EasyOCR, PaddleOCR, etc.)
- Archive handling (unzip libraries + recursive extraction)
- All-in-one tools (Pandoc, LibreOffice CLI, etc.)

## Deliverables
1. Comparison table: library name, supported formats, pros, cons, license, local-capable (yes/no)
2. Recommendation with rationale
3. Proof-of-concept: extract text from 5 diverse file types (PDF text-based, PDF image-based, DOCX, PNG image, ZIP archive)

## Acceptance Criteria
- ✅ At least 5 candidate libraries evaluated
- ✅ Comparison documented with scoring against criteria above
- ✅ Recommended library tested with proof-of-concept (working code sample)
- ✅ Integration path documented (Node.js module, Python fallback, or both)

## Status
**READY**

## Changelog
- **2026-08-28** — Spike created to unblock Story 1.2 (Extractor implementation)
