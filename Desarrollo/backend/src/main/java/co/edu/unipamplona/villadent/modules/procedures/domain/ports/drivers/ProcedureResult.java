package co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers;

import java.util.List;

public record ProcedureResult(
        Long id,
        String name,
        int durationMinutes,
        boolean active,
        List<Long> dentistIds) {

    public ProcedureResult {
        dentistIds = dentistIds == null ? List.of() : List.copyOf(dentistIds);
    }

    public ProcedureResult(Long id, String name, int durationMinutes, boolean active) {
        this(id, name, durationMinutes, active, List.of());
    }

    /**
     * A procedure without linked dentists is treated as unrestricted so that
     * legacy catalog entries created before the dentist link existed stay usable.
     */
    public boolean isPerformedBy(Long dentistId) {
        return dentistIds.isEmpty() || dentistIds.contains(dentistId);
    }
}
