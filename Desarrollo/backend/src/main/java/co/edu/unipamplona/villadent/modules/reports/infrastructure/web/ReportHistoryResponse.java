package co.edu.unipamplona.villadent.modules.reports.infrastructure.web;

import java.time.Instant;
import java.time.LocalDate;

public record ReportHistoryResponse(Long id, LocalDate from, LocalDate to, Long dentistId,
                                    String dentistName, Instant generatedAt, String generatedBy) {}
