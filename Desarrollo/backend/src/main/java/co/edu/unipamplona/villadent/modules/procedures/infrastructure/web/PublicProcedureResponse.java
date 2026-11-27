package co.edu.unipamplona.villadent.modules.procedures.infrastructure.web;

import java.util.List;

public record PublicProcedureResponse(
        Long id, String name, int durationMinutes, List<Long> dentistIds) {
}
