package com.example.hrdatabase.config;

import com.example.hrdatabase.repository.AplicatieRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Backfill pentru coloane noi, când Hibernate ddl-auto=update nu poate rezolva rânduri vechi cu NULL.
 */
@Component
public class DatabaseBackfillRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseBackfillRunner.class);

    private final AplicatieRepository aplicatieRepository;

    public DatabaseBackfillRunner(AplicatieRepository aplicatieRepository) {
        this.aplicatieRepository = aplicatieRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        int n = aplicatieRepository.backfillAiCvReviewFalse();
        if (n > 0) {
            log.info("Backfill: set ai_cv_review=false pentru {} aplicări existente.", n);
        }
    }
}

