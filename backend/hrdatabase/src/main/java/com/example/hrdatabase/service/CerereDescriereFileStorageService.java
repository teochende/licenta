package com.example.hrdatabase.service;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Locale;
import java.util.List;
import java.util.UUID;

/**
 * Stochează fișierele de descriere pentru cereri (pdf/docx) sub {@code app.upload.dir}.
 */
@Service
public class CerereDescriereFileStorageService {

    private static final long MAX_BYTES = 10 * 1024 * 1024L;

    private final Path uploadRoot;
    private final List<Path> legacyRoots;

    public CerereDescriereFileStorageService(
            @Value("${app.upload.dir:uploads}") String uploadDir,
            @Value("${app.upload.legacy-dirs:}") String legacyDirsCsv) {
        this.uploadRoot = Path.of(uploadDir).toAbsolutePath().normalize();
        this.legacyRoots = parseLegacyRoots(legacyDirsCsv);
    }

    @PostConstruct
    public void ensureDirectories() throws IOException {
        Files.createDirectories(uploadRoot.resolve("cereri"));
    }

    public Path resolveStoredPath(String relativePath) {
        Path primary = resolveUnderRoot(uploadRoot, relativePath);
        if (Files.exists(primary)) {
            return primary;
        }
        for (Path root : legacyRoots) {
            Path candidate = resolveUnderRoot(root, relativePath);
            if (Files.exists(candidate)) {
                return candidate;
            }
        }
        return primary;
    }

    private static Path resolveUnderRoot(Path root, String relativePath) {
        Path p = root.resolve(relativePath).normalize();
        if (!p.startsWith(root)) {
            throw new IllegalArgumentException("Cale invalidă");
        }
        return p;
    }

    private static List<Path> parseLegacyRoots(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        String[] parts = csv.split(",");
        List<Path> out = new ArrayList<>();
        for (String raw : parts) {
            String s = raw != null ? raw.trim() : "";
            if (s.isEmpty()) continue;
            out.add(Path.of(s).toAbsolutePath().normalize());
        }
        return List.copyOf(out);
    }

    public Path getUploadRoot() {
        return uploadRoot;
    }

    /**
     * Salvează fișierul și întoarce calea relativă (ex.: {@code cereri/uuid.pdf}).
     */
    public String store(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Fișier lipsă.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("Fișierul depășește limita de 10 MB.");
        }
        String original = file.getOriginalFilename();
        String ext = extensionOf(original);
        if (!".pdf".equals(ext) && !".docx".equals(ext)) {
            throw new IllegalArgumentException("Sunt permise doar fișiere .pdf sau .docx.");
        }
        String relative = "cereri/" + UUID.randomUUID() + ext;
        Path dest = uploadRoot.resolve(relative).normalize();
        if (!dest.startsWith(uploadRoot)) {
            throw new IllegalStateException("Cale invalidă");
        }
        Files.createDirectories(dest.getParent());
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, dest, StandardCopyOption.REPLACE_EXISTING);
        }
        return relative;
    }

    private static String extensionOf(String name) {
        if (name == null || !name.contains(".")) {
            return "";
        }
        String lower = name.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".docx")) {
            return ".docx";
        }
        if (lower.endsWith(".pdf")) {
            return ".pdf";
        }
        return "";
    }
}
