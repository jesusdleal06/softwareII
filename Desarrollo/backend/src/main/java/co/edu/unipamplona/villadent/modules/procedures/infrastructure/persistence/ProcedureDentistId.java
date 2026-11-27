package co.edu.unipamplona.villadent.modules.procedures.infrastructure.persistence;

import java.io.Serializable;
import java.util.Objects;

public class ProcedureDentistId implements Serializable {

    private Long procedureId;
    private Long dentistId;

    public ProcedureDentistId() {
    }

    public ProcedureDentistId(Long procedureId, Long dentistId) {
        this.procedureId = procedureId;
        this.dentistId = dentistId;
    }

    public Long getProcedureId() {
        return procedureId;
    }

    public void setProcedureId(Long procedureId) {
        this.procedureId = procedureId;
    }

    public Long getDentistId() {
        return dentistId;
    }

    public void setDentistId(Long dentistId) {
        this.dentistId = dentistId;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof ProcedureDentistId that)) {
            return false;
        }
        return Objects.equals(procedureId, that.procedureId)
                && Objects.equals(dentistId, that.dentistId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(procedureId, dentistId);
    }
}
