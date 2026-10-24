package co.edu.unipamplona.villadent.modules.procedures.infrastructure.web;

public record ProcedureResponse(Long id, String name, int durationMinutes, boolean active) {
}
