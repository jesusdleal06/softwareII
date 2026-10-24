package co.edu.unipamplona.villadent.modules.procedures.domain.ports.drivers;

public interface SetProcedureActiveUseCase {

    ProcedureResult setActive(Long id, boolean active);
}
