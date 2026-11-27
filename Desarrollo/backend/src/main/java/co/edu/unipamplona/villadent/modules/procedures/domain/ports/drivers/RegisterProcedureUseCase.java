package co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers;

import java.util.List;

public interface RegisterProcedureUseCase {

    ProcedureResult register(RegisterProcedureCommand command);

    record RegisterProcedureCommand(String name, int durationMinutes, List<Long> dentistIds) {

        public RegisterProcedureCommand {
            dentistIds = dentistIds == null ? null : List.copyOf(dentistIds);
        }

        /**
         * Legacy/internal registration without an explicit selection: the procedure is
         * performed by every active dentist. The HTTP API always sends the selection.
         */
        public RegisterProcedureCommand(String name, int durationMinutes) {
            this(name, durationMinutes, null);
        }
    }
}
