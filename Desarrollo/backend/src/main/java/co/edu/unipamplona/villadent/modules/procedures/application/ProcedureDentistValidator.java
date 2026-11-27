package co.edu.unipamplona.villadent.modules.procedures.application;

import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.DentistResult;
import co.edu.unipamplona.villadent.modules.dentists.domain.ports.drivers.FindDentistUseCase;
import co.edu.unipamplona.villadent.modules.procedures.domain.error.InvalidProcedureDataException;
import java.util.LinkedHashSet;
import java.util.List;

final class ProcedureDentistValidator {

    private ProcedureDentistValidator() {
    }

    static List<Long> requireActive(FindDentistUseCase dentists, List<Long> dentistIds) {
        if (dentistIds == null || dentistIds.isEmpty()) {
            throw new InvalidProcedureDataException("Seleccione al menos un odontólogo.");
        }
        List<Long> unique = List.copyOf(new LinkedHashSet<>(dentistIds));
        for (Long dentistId : unique) {
            DentistResult dentist = dentists.findById(dentistId).orElse(null);
            if (dentist == null || !dentist.active()) {
                throw new InvalidProcedureDataException(
                        "El odontólogo seleccionado no está activo.");
            }
        }
        return unique;
    }
}
