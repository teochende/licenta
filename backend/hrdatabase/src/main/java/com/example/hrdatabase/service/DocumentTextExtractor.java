package com.example.hrdatabase.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.extractor.WordExtractor;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

/**
 * Extrage text simplu din PDF / DOCX / DOC / TXT (pentru matching și stocare {@code cvContinut}).
 */
@Service
public class DocumentTextExtractor {

    private static final Logger log = LoggerFactory.getLogger(DocumentTextExtractor.class);

    private static final int MAX_CHARS = 80_000;

    public String extractFromBytes(byte[] bytes, String originalFilename) {
        if (bytes == null || bytes.length == 0) {
            return null;
        }
        String ext = AplicatieCvFileStorageService.extensionOf(originalFilename);
        try {
            String raw = switch (ext) {
                case ".pdf" -> extractPdf(bytes);
                case ".docx" -> extractDocx(bytes);
                case ".doc" -> extractDoc(bytes);
                case ".txt" -> extractTxt(bytes);
                default -> null;
            };
            return truncateAndSanitize(raw);
        } catch (Exception e) {
            log.debug("Nu s-a putut extrage text din {}: {}", ext, e.getMessage());
            return null;
        }
    }

    private static String extractPdf(byte[] bytes) throws Exception {
        try (PDDocument doc = PDDocument.load(bytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(doc);
        }
    }

    private static String extractDocx(byte[] bytes) throws Exception {
        try (XWPFDocument doc = new XWPFDocument(new ByteArrayInputStream(bytes));
             XWPFWordExtractor ex = new XWPFWordExtractor(doc)) {
            return ex.getText();
        }
    }

    private static String extractDoc(byte[] bytes) throws Exception {
        try (HWPFDocument doc = new HWPFDocument(new ByteArrayInputStream(bytes));
             WordExtractor ex = new WordExtractor(doc)) {
            return ex.getText();
        }
    }

    private static String extractTxt(byte[] bytes) {
        String s = new String(bytes, StandardCharsets.UTF_8);
        return s.indexOf('\0') < 0 ? s : s.replace("\0", "");
    }

    private static String truncateAndSanitize(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        if (t.isEmpty()) {
            return null;
        }
        if (t.indexOf('\0') >= 0) {
            t = t.replace("\0", "");
        }
        if (t.length() > MAX_CHARS) {
            return t.substring(0, MAX_CHARS);
        }
        return t;
    }
}
