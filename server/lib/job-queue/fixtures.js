const MOCK_HTML_WITH_IMAGES = `
<!DOCTYPE html>
<html>
<head><title>Sample Article</title></head>
<body>
<h1>Introduction to Web Clipping</h1>
<p>This is a sample article that demonstrates web clipping. It contains useful information about various topics.</p>
<img src="image1.png" alt="First diagram" />
<p>Another paragraph of content.</p>
<img src="image2.png" alt="Second diagram" />
<p>Conclusion paragraph.</p>
</body>
</html>
`;

const MOCK_MARKDOWN = `# Sample Markdown Document

This is a mock markdown document used for testing.

## Section 1

Content for section 1.

## Section 2

More content for section 2.
`;

const MOCK_PDF_URL_TEXT = `PDF Document: Sample Report

This is mock text extracted from a PDF document.

Contents:
1. Introduction
2. Methods
3. Results
4. Conclusion

End of PDF.
`;

const MOCK_ZIP_LISTING = `Archive: sample.zip
  Length      Date    Time    Name
---------  ---------- -----   ----
      125  2026-08-29 10:00   readme.txt
      340  2026-08-29 10:05   notes.md
      512  2026-08-29 10:10   data.json
---------                     -------
      977                     3 files
`;

const MOCK_PDF_EXTRACTED_TEXT = `Extracted PDF Text

This is text that was extracted from a PDF document using OCR.

Page 1:
Content on page one.

Page 2:
More content on page two.
`;

const MOCK_OCR_TEXT = `Optical Character Recognition Result

This is text recognized from an image file via OCR.

Line 1: Sample text
Line 2: More sample text
Line 3: Final line
`;

const MOCK_DOCX_EXTRACTED_TEXT = `Word Document Text

This is text extracted from a Microsoft Word document.

Paragraph 1: Opening statement.

Paragraph 2: Supporting details.

Paragraph 3: Closing remarks.
`;

const MOCK_GENERIC_TRANSCRIPTION_NOTE = `Transcription Note

This is a generic transcription of the original document content.

It serves as a text representation that can be indexed and searched.

Original Format: [binary/archive/mixed media]
`;

module.exports = {
  MOCK_HTML_WITH_IMAGES,
  MOCK_MARKDOWN,
  MOCK_PDF_URL_TEXT,
  MOCK_ZIP_LISTING,
  MOCK_PDF_EXTRACTED_TEXT,
  MOCK_OCR_TEXT,
  MOCK_DOCX_EXTRACTED_TEXT,
  MOCK_GENERIC_TRANSCRIPTION_NOTE,
};
