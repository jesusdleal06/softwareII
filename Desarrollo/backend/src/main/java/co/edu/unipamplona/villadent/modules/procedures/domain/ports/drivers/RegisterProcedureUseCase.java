package co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers;

public interface RegisterProcedureUseCase {

    ProcedureResult register(RegisterProcedureCommand command);

    record RegisterProcedureCommand(String name, int durationMinutes) {
    }
}
