package com.fourthbrain.actuators;

import com.fourthbrain.actuators.Classifier.Classification;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Story P2.4 (ADR31 decision 3) — the reply parser and the tag normaliser.
 *
 * No Spring, no model, no database: these are the static helpers on Classifier, and
 * this is where the real coverage of the classification contract is. The cases are
 * the ones a local 7B model actually produces — a bare object, an object buried in
 * prose, an object inside a fence, and a reply with no object at all.
 */
@DisplayName("Classifier parsing and normalisation")
class ClassifierParseTest {

    private static final String OBJECT = "{\"topic\": \"Spring Boot\", \"tags\": [\"java\", \"spring\"]}";

    // ---- extractJsonObject ----

    @Test
    @DisplayName("a bare JSON object is returned whole")
    void bareObject() {
        assertEquals(OBJECT, Classifier.extractJsonObject(OBJECT));
    }

    @Test
    @DisplayName("an object wrapped in prose is found")
    void objectInProse() {
        String reply = "Sure! Here is the classification you asked for:\n" + OBJECT + "\nLet me know if that helps.";

        assertEquals(OBJECT, Classifier.extractJsonObject(reply));
    }

    @Test
    @DisplayName("an object inside a code fence is found")
    void objectInFence() {
        String reply = "```json\n" + OBJECT + "\n```";

        assertEquals(OBJECT, Classifier.extractJsonObject(reply));
    }

    @Test
    @DisplayName("a brace inside a string value does not truncate the span")
    void braceInsideStringValue() {
        String tricky = "{\"topic\": \"the } character\", \"tags\": [\"punctuation\"]}";

        String extracted = Classifier.extractJsonObject("Here: " + tricky);

        assertEquals(tricky, extracted, "the span must run to the object's own closing brace");
        Classification parsed = Classifier.parse(tricky);
        assertNotNull(parsed);
        assertEquals(List.of("punctuation"), parsed.tags(), "the last tag must survive the extraction");
    }

    @Test
    @DisplayName("an escaped quote inside a string value does not end the literal")
    void escapedQuoteInsideStringValue() {
        String tricky = "{\"topic\": \"a \\\" quote } here\", \"tags\": [\"quoting\"]}";

        assertEquals(tricky, Classifier.extractJsonObject(tricky));
        assertEquals(List.of("quoting"), Classifier.parse(tricky).tags());
    }

    @Test
    @DisplayName("a nested object is spanned to the outer closing brace")
    void nestedObject() {
        String nested = "{\"topic\": \"x\", \"meta\": {\"a\": 1}, \"tags\": [\"deep\"]}";

        assertEquals(nested, Classifier.extractJsonObject(nested));
        assertEquals(List.of("deep"), Classifier.parse(nested).tags());
    }

    @Test
    @DisplayName("a reply with no object at all returns null rather than throwing")
    void noObject() {
        assertNull(Classifier.extractJsonObject("I am sorry, I cannot classify that."));
        assertNull(Classifier.extractJsonObject(""));
        assertNull(Classifier.extractJsonObject(null));
    }

    @Test
    @DisplayName("an object that opens and never closes returns null")
    void unbalancedObject() {
        assertNull(Classifier.extractJsonObject("{\"topic\": \"cut off\", \"tags\": [\"a\""));
    }

    // ---- parse ----

    @Test
    @DisplayName("parse reads the topic and the tag array")
    void parseReadsBoth() {
        Classification c = Classifier.parse(OBJECT);

        assertNotNull(c);
        assertEquals("Spring Boot", c.topic());
        assertEquals(List.of("java", "spring"), c.tags());
    }

    @Test
    @DisplayName("a brace-balanced span that is not JSON parses to null, not an exception")
    void balancedButNotJson() {
        assertNull(Classifier.parse("here you go {not json at all}"));
    }

    @Test
    @DisplayName("a missing tags field yields an empty list, not null")
    void missingTags() {
        Classification c = Classifier.parse("{\"topic\": \"only a topic\"}");

        assertNotNull(c);
        assertEquals("only a topic", c.topic());
        assertTrue(c.tags().isEmpty());
    }

    @Test
    @DisplayName("a comma-separated tags string is accepted as well as an array")
    void tagsAsString() {
        Classification c = Classifier.parse("{\"topic\": \"t\", \"tags\": \"java, spring boot\"}");

        assertEquals(List.of("java", "spring-boot"), c.tags());
    }

    @Test
    @DisplayName("a topic longer than 256 characters is truncated")
    void longTopicTruncated() {
        String longTopic = "t".repeat(400);

        Classification c = Classifier.parse("{\"topic\": \"" + longTopic + "\", \"tags\": []}");

        assertEquals(256, c.topic().length());
    }

    @Test
    @DisplayName("a blank topic comes back null")
    void blankTopic() {
        assertNull(Classifier.parse("{\"topic\": \"   \", \"tags\": []}").topic());
        assertNull(Classifier.parse("{\"tags\": []}").topic());
    }

    // ---- normalise ----

    @Test
    @DisplayName("a leading # is stripped and spaces become hyphens")
    void hashAndSpaces() {
        assertEquals(List.of("machine-learning"), Classifier.normalise(List.of("#Machine Learning")));
        assertEquals(List.of("spaced-out"), Classifier.normalise(List.of("  SPACED  OUT ")));
        assertEquals(List.of("snake-case"), Classifier.normalise(List.of("snake_case")));
    }

    @Test
    @DisplayName("characters outside [a-z0-9-] are dropped and runs of - collapsed")
    void strippedCharacters() {
        assertEquals(List.of("c-notes"), Classifier.normalise(List.of("C++ / notes!")));
        assertEquals(List.of("a-b"), Classifier.normalise(List.of("a---b")));
    }

    @Test
    @DisplayName("a tag that normalises to nothing is dropped")
    void emptyAfterNormalisation() {
        assertTrue(Classifier.normalise(Arrays.asList("---", "   ", "###", "!!!", null)).isEmpty());
    }

    @Test
    @DisplayName("a tag longer than the configured maximum is dropped")
    void overlongTagDropped() {
        List<String> tags = Classifier.normalise(List.of("x".repeat(200), "short"));

        assertEquals(List.of("short"), tags);
    }

    @Test
    @DisplayName("duplicates collapse and order is preserved")
    void duplicatesCollapse() {
        List<String> tags = Classifier.normalise(List.of("Java", "java", "#JAVA", "spring"));

        assertEquals(List.of("java", "spring"), tags);
    }

    @Test
    @DisplayName("a nine-tag list is capped at eight")
    void cappedAtEight() {
        List<String> nine = List.of("a", "b", "c", "d", "e", "f", "g", "h", "i");

        List<String> tags = Classifier.normalise(nine);

        assertEquals(8, tags.size());
        assertEquals(List.of("a", "b", "c", "d", "e", "f", "g", "h"), tags);
    }

    @Test
    @DisplayName("a null list yields an empty list")
    void nullList() {
        assertTrue(Classifier.normalise(null).isEmpty());
    }

    // ---- truncate ----

    @Test
    @DisplayName("content shorter than the cap is returned stripped and unmarked")
    void shortContentUntouched() {
        assertEquals("hello world", Classifier.truncate("  hello world  ", 8000));
        assertEquals("", Classifier.truncate(null, 8000));
    }

    @Test
    @DisplayName("long content is cut on a whitespace boundary and marked")
    void longContentMarked() {
        String content = "word ".repeat(100);

        String truncated = Classifier.truncate(content, 50);

        assertTrue(truncated.endsWith("…[truncated]"), "expected the truncation marker, got: " + truncated);
        assertFalse(truncated.contains("wor\n"), "expected the cut to land on a whitespace boundary");
        assertTrue(truncated.length() < content.length());
    }

    @Test
    @DisplayName("one unbroken token is cut mid-word rather than to nothing")
    void unbrokenTokenStillTruncates() {
        String truncated = Classifier.truncate("x".repeat(500), 50);

        assertTrue(truncated.startsWith("x".repeat(50)));
        assertTrue(truncated.endsWith("…[truncated]"));
    }
}
