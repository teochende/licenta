package com.example.hrdatabase.service;

import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Matching simplu CV ↔ descriere job, bazat pe cuvinte cheie.
 * Scorul este intenționat „lightweight”: nu folosește ML și nu depinde de servicii externe.
 */
@Service
public class CvJobMatchService {

    /**
     * HashSet (nu {@code Set.of}) ca să evităm crash la duplicate în listă.
     * Tokenurile sunt deja normalizate în {@link #normalize(String)}.
     */
    private static final Set<String> STOPWORDS = new HashSet<>(Arrays.asList(
            // ro
            "si", "sau", "in", "din", "cu", "pe", "la", "de", "despre", "pentru", "catre", "către",
            "un", "o", "unei", "al", "a", "ai", "ale", "cel", "cea", "cei", "cele",
            "este", "sunt", "fost", "fi", "sa", "se", "mai", "foarte", "care", "ce", "cum", "unde",
            // en
            "and", "or", "in", "on", "at", "to", "from", "for", "with", "about",
            "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
            "of", "by", "as", "it", "this", "that", "these", "those"
    ));

    /**
     * Întoarce scorul ca procent (0-100). Dacă nu există suficient text, întoarce {@code null}.
     */
    public Integer computeMatchScorePercent(String jobDescriere, String cvText) {
        // Cerință: keywords job vin doar din liniile care încep cu "=keywords="
        Set<String> jobTokens = extractJobKeywordsFromKeywordLines(jobDescriere);
        return computeMatchScorePercentFromJobKeywords(jobTokens, cvText);
    }

    /**
     * Variantă utilă pentru apelanți care vor să logheze keywords-urile jobului (de ex. pe {@code postId}).
     */
    public Integer computeMatchScorePercentFromJobKeywords(Set<String> jobTokens, String cvText) {
        if (jobTokens == null || jobTokens.isEmpty()) {
            return null;
        }
        String cv = normalizeSearchable(cvText);
        if (cv.isEmpty()) {
            return null;
        }
        int common = 0;
        for (String t : jobTokens) {
            // cerință: keyword-ul jobului trebuie să se regăsească în CV fie ca atare, fie ca parte din alte cuvinte
            if (t != null && !t.isBlank() && cv.contains(t)) {
                common++;
            }
        }
        double ratio = (double) common / (double) jobTokens.size();
        int pct = (int) Math.round(ratio * 100.0);
        if (pct < 0) pct = 0;
        if (pct > 100) pct = 100;
        return pct;
    }

    /**
     * Extrage keywords din descrierea jobului DOAR din liniile care încep cu tokenul {@code =keywords=}.
     * Separatori acceptați: virgulă și/sau spații.
     * <p>
     * Păstrează aceeași normalizare/filtrare ca {@link #extractKeywords(String)}.
     */
    public Set<String> extractJobKeywordsFromKeywordLines(String jobText) {
        if (jobText == null) {
            return Set.of();
        }
        String raw = jobText;
        // păstrăm newline-urile, dar normalizăm pentru comparație
        String normalized = normalize(raw);
        String[] lines = normalized.split("\\r?\\n");
        Set<String> out = new HashSet<>();
        for (String line : lines) {
            if (line == null) continue;
            String l = line.trim();
            if (l.isEmpty()) continue;
            if (!l.startsWith("=keywords=")) continue;
            String rest = l.substring("=keywords=".length()).trim();
            if (rest.isEmpty()) continue;
            // virgule => spații, apoi tokenizare pe whitespace
            rest = rest.replace(',', ' ');
            // la fel ca în extractKeywords: păstrăm doar [a-z0-9+.#]
            rest = rest.replaceAll("[^a-z0-9+.#]+", " ");
            String[] toks = rest.split("\\s+");
            for (String tok : toks) {
                if (tok == null) continue;
                String t = tok.trim();
                if (t.isEmpty()) continue;
                if (t.length() < 2) continue;
                if (STOPWORDS.contains(t)) continue;
                if (t.chars().allMatch(Character::isDigit)) continue;
                out.add(t);
            }
        }
        if (out.size() > 2000) {
            List<String> sorted = out.stream().sorted().toList();
            out = new HashSet<>(sorted.subList(0, 2000));
        }
        return out;
    }

    /**
     * Extrage „cuvinte cheie” (tokenuri) din text: normalizează, separă, elimină stopwords, păstrează tokenuri relevante.
     */
    public Set<String> extractKeywords(String text) {
        if (text == null) {
            return Set.of();
        }
        String s = text.trim();
        if (s.isEmpty()) {
            return Set.of();
        }
        s = normalize(s);
        // separare simplă: non-alfanumeric => spațiu
        s = s.replaceAll("[^a-z0-9+.#]+", " ");

        String[] raw = s.split("\\s+");
        Set<String> out = new HashSet<>();
        for (String tok : raw) {
            if (tok == null) continue;
            String t = tok.trim();
            if (t.isEmpty()) continue;
            if (t.length() < 2) continue;
            if (STOPWORDS.contains(t)) continue;
            // filtrează tokenuri foarte „numerice”
            if (t.chars().allMatch(Character::isDigit)) continue;
            out.add(t);
        }

        // limită de siguranță (scorul devine prea mic dacă jobul are mii de tokenuri)
        if (out.size() > 2000) {
            // păstrează o parte deterministă: sort lexicografic și ia primele N
            List<String> sorted = out.stream().sorted().toList();
            out = new HashSet<>(sorted.subList(0, 2000));
        }
        return out;
    }

    /**
     * Normalizare ca în tokenizare, dar păstrează un string "searchable" pentru contains().
     */
    public String normalizeSearchable(String text) {
        if (text == null) {
            return "";
        }
        String s = text.trim();
        if (s.isEmpty()) {
            return "";
        }
        s = normalize(s);
        // la fel ca în tokenizare: păstrăm doar [a-z0-9+.#] ca să evităm mismatch-uri de punctuație
        s = s.replaceAll("[^a-z0-9+.#]+", " ");
        return s;
    }

    private static String normalize(String s) {
        String lower = s.toLowerCase(Locale.ROOT);
        String n = Normalizer.normalize(lower, Normalizer.Form.NFD);
        // strip diacritics
        n = n.replaceAll("\\p{M}+", "");
        return n;
    }
}

