package com.fourthbrain.actuators;

import com.fourthbrain.convert.MarkdownConverter;
import com.fourthbrain.messaging.Message;
import com.fourthbrain.persistence.DatabaseService;
import com.fourthbrain.persistence.VaultArea;
import com.fourthbrain.persistence.entity.Document;
import com.fourthbrain.persistence.entity.DocumentCopy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Extraction behaviour for ZIP, PDF and TXT. The database, the Coordinator and
 * the Ingestor are mocks; the converter is a fake. Real files live in a temp dir.
 */
@DisplayName("Extractor Tests")
@SuppressWarnings("null")
class ExtractorTest {

    @TempDir
    Path tmpDir;

    private DatabaseService db;
    private Coordinator coordinator;
    private Ingestor ingestor;
    private MarkdownConverter converter;
    private Extractor extractor;
    private final List<Document> created = new ArrayList<>();
    private final AtomicLong ids = new AtomicLong(100);

    @BeforeEach
    void setUp() {
        db = mock(DatabaseService.class);
        coordinator = mock(Coordinator.class);
        ingestor = mock(Ingestor.class);
        converter = mock(MarkdownConverter.class);
        when(coordinator.get("Ingestor")).thenReturn(ingestor);

        when(db.create(any(Document.class))).thenAnswer(inv -> {
            Document d = inv.getArgument(0);
            d.setId(ids.incrementAndGet());
            created.add(d);
            return d;
        });

        extractor = new Extractor();
        ReflectionTestUtils.setField(extractor, "vaultTmpPath", tmpDir.toString());
        ReflectionTestUtils.setField(extractor, "databaseService", db);
        ReflectionTestUtils.setField(extractor, "markdownConverter", converter);
        ReflectionTestUtils.setField(extractor, "coordinator", coordinator);
    }

    @Test
    @DisplayName("ZIP: one child per member, parentId set, each sent to the Ingestor")
    void zipCreatesOneChildPerMember() throws IOException {
        Path zip = zipOf("a.txt", "alpha", "b.md", "# beta", "sub/c.csv", "1,2,3");
        Document parent = parent(1L, "bundle.zip", ".zip", "application/zip");
        when(db.findLive(1L, VaultArea.TMP)).thenReturn(copy(1L, zip));

        assertNull(extractor.doTheThing(parent));

        assertEquals(3, created.size());
        assertEquals(List.of("a.txt", "b.md", "c.csv"),
                created.stream().map(Document::getName).sorted().toList());
        created.forEach(d -> assertEquals(1L, d.getParentId()));

        ArgumentCaptor<Message> sent = ArgumentCaptor.forClass(Message.class);
        verify(ingestor, times(3)).enqueueMessage(sent.capture());
        assertEquals(created, sent.getAllValues().stream().map(Message::getDocument).toList());

        verify(db, times(3)).addCopy(any(Document.class), eq(VaultArea.TMP), anyString());
        for (Document d : created) {
            ArgumentCaptor<String> path = ArgumentCaptor.forClass(String.class);
            verify(db).addCopy(eq(d), eq(VaultArea.TMP), path.capture());
            assertTrue(Files.exists(Path.of(path.getValue())), "extracted file missing: " + path.getValue());
        }
    }

    @Test
    @DisplayName("ZIP: mime type is inferred from each member's extension")
    void zipMembersGetMimeTypes() throws IOException {
        Path zip = zipOf("a.txt", "alpha", "b.pdf", "%PDF");
        when(db.findLive(1L, VaultArea.TMP)).thenReturn(copy(1L, zip));

        extractor.doTheThing(parent(1L, "bundle.zip", ".zip", "application/zip"));

        assertEquals("text/plain", byName("a.txt").getMimeType());
        assertEquals("application/pdf", byName("b.pdf").getMimeType());
    }

    @Test
    @DisplayName("PDF: converted via the converter into one .md child with parentId set")
    void pdfCreatesOneMarkdownChild() throws Exception {
        Path pdf = tmpDir.resolve("paper.pdf");
        Files.writeString(pdf, "%PDF-1.4 fake");
        when(db.findLive(2L, VaultArea.TMP)).thenReturn(copy(2L, pdf));
        when(converter.convert(pdf, "pdf")).thenReturn("# Paper\n\nbody");

        assertNull(extractor.doTheThing(parent(2L, "paper.pdf", ".pdf", "application/pdf")));

        verify(converter).convert(pdf, "pdf");
        assertEquals(1, created.size());
        Document child = created.get(0);
        assertEquals(2L, child.getParentId());
        assertEquals("paper.md", child.getName());
        assertEquals(".md", child.getExtension());
        assertEquals("text/markdown", child.getMimeType());

        ArgumentCaptor<String> path = ArgumentCaptor.forClass(String.class);
        verify(db).addCopy(eq(child), eq(VaultArea.TMP), path.capture());
        assertEquals("# Paper\n\nbody", Files.readString(Path.of(path.getValue()), StandardCharsets.UTF_8));
        verify(ingestor).enqueueMessage(any(Message.class));
    }

    @Test
    @DisplayName("PDF: a converter failure creates no child and sends nothing")
    void pdfConversionFailureCreatesNothing() throws Exception {
        Path pdf = tmpDir.resolve("bad.pdf");
        Files.writeString(pdf, "junk");
        when(db.findLive(3L, VaultArea.TMP)).thenReturn(copy(3L, pdf));
        when(converter.convert(any(), any())).thenThrow(new com.fourthbrain.convert.ConversionException(
                com.fourthbrain.convert.ConversionException.Reason.CONVERTER_FAILED, "boom"));

        assertNull(extractor.doTheThing(parent(3L, "bad.pdf", ".pdf", "application/pdf")));

        assertTrue(created.isEmpty());
        verify(ingestor, never()).enqueueMessage(any());
    }

    @Test
    @DisplayName("TXT: not handled by Extractor; returns null, creates nothing, never converts")
    void txtIsNotHandled() throws Exception {
        Path txt = tmpDir.resolve("note.txt");
        Files.writeString(txt, "hello");
        when(db.findLive(4L, VaultArea.TMP)).thenReturn(copy(4L, txt));

        String next = extractor.doTheThing(parent(4L, "note.txt", ".txt", "text/plain"));

        assertNull(next, "Extractor returns null for TXT (no next actuator)");
        assertTrue(created.isEmpty());
        verify(converter, never()).convert(any(), any());
        verify(ingestor, never()).enqueueMessage(any());
        verify(db, never()).addCopy(any(Document.class), any(), any());
    }

    // ---- helpers ----

    private Document byName(String name) {
        return created.stream().filter(d -> name.equals(d.getName())).findFirst().orElseThrow();
    }

    private Document parent(long id, String name, String ext, String mime) {
        Document d = Document.builder().name(name).extension(ext).mimeType(mime).content("")
                .status("New").createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now()).build();
        d.setId(id);
        return d;
    }

    private DocumentCopy copy(long docId, Path path) {
        return DocumentCopy.builder().copyId(docId).documentId(docId).area(VaultArea.TMP)
                .path(path.toString()).createdAt(LocalDateTime.now()).build();
    }

    /** Alternating name, body pairs. */
    private Path zipOf(String... nameBodyPairs) throws IOException {
        Path zip = tmpDir.resolve("bundle.zip");
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream out = new ZipOutputStream((OutputStream) bytes)) {
            for (int i = 0; i < nameBodyPairs.length; i += 2) {
                out.putNextEntry(new ZipEntry(nameBodyPairs[i]));
                out.write(nameBodyPairs[i + 1].getBytes(StandardCharsets.UTF_8));
                out.closeEntry();
            }
        }
        Files.write(zip, bytes.toByteArray());
        return zip;
    }
}
