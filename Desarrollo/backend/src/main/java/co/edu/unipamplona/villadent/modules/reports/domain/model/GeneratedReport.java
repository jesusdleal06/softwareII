package co.edu.unipamplona.villadent.modules.reports.domain.model;

import java.time.Instant;
import java.time.LocalDate;

public record GeneratedReport(Long id, LocalDate from, LocalDate to, Long dentistId, long userId,
                              Instant generatedAt, String cloudinaryPublicId) {}
