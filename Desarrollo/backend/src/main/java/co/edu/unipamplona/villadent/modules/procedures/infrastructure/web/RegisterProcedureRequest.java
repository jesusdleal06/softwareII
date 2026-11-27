package co.edu.unipamplona.villadent.modules.procedures.infrastructure.web;

import java.util.List;

public record RegisterProcedureRequest(String name, int durationMinutes, List<Long> dentistIds) {

    public RegisterProcedureRequest {
        dentistIds = dentistIds == null ? List.of() : List.copyOf(dentistIds);
    }
}
