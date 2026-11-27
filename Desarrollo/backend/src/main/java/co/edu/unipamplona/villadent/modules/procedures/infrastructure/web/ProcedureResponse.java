package co.edu.unipamplona.villadent.modules.procedures.infrastructure.web;

import java.util.List;

public record ProcedureResponse(
        Long id, String name, int durationMinutes, boolean active, List<Long> dentistIds) {
}
