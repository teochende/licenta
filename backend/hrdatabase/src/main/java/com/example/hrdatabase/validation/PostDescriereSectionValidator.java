package com.example.hrdatabase.validation;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Verifică că descrierea publică a postului conține antetele de secțiune așteptate
 * (Job title, Location, Company overview, etc.).
 */
public final class PostDescriereSectionValidator {

    private record SectionCheck(String label, List<Pattern> anyMatch) {}

    private static final List<SectionCheck> CHECKS = List.of(
            new SectionCheck("Job title", List.of(Pattern.compile("(?i)\\bjob\\s+title\\b"))),
            new SectionCheck("Location", List.of(Pattern.compile("(?i)\\blocation\\b"))),
            new SectionCheck("Company overview", List.of(Pattern.compile("(?i)\\bcompany\\s+overview\\b"))),
            new SectionCheck(
                    "Responsibilities",
                    List.of(
                            Pattern.compile("(?i)\\bresponsibilit"),
                            Pattern.compile("(?i)\\bresponsabilit"))),
            new SectionCheck(
                    "Requirements",
                    List.of(
                            Pattern.compile("(?i)\\brequirement"),
                            Pattern.compile("(?i)\\brequierement"),
                            Pattern.compile("(?i)\\brequienrements?"))),
            new SectionCheck("Nice to have", List.of(Pattern.compile("(?i)\\bnice\\s+to\\s+have\\b"))),
            new SectionCheck("Education", List.of(Pattern.compile("(?i)\\beducation\\b"))),
            new SectionCheck("Experience", List.of(Pattern.compile("(?i)\\bexperience\\b"))),
            new SectionCheck("What we offer", List.of(Pattern.compile("(?i)\\bwhat\\s+we\\s+offer\\b")))
    );

    private PostDescriereSectionValidator() {
    }

    public static List<String> missingSections(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        String haystack = " " + text.toLowerCase(Locale.ROOT).replace('\r', '\n') + " ";
        List<String> missing = new ArrayList<>();
        for (SectionCheck c : CHECKS) {
            boolean ok = false;
            for (Pattern p : c.anyMatch()) {
                if (p.matcher(haystack).find()) {
                    ok = true;
                    break;
                }
            }
            if (!ok) {
                missing.add(c.label());
            }
        }
        return missing;
    }

    public static void assertComplete(String text) {
        List<String> missing = missingSections(text);
        if (missing.isEmpty()) {
            return;
        }
        throw new IllegalArgumentException(
                "Descrierea postului trebuie să conțină explicit toate secțiunile: Job title, Location, "
                        + "Company overview, Responsibilities, Requirements, Nice to have, Education, Experience, "
                        + "What we offer. Lipsesc: "
                        + String.join(", ", missing)
                        + ".");
    }
}
