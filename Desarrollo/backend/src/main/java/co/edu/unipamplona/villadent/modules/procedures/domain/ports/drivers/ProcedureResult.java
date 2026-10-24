package co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers;

public record ProcedureResult(Long id, String name, int durationMinutes, boolean active) {
}
