package co.edu.unipamplona.villadent.modules.procedures.infrastructure.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface ProcedureDentistJpaRepository
        extends JpaRepository<ProcedureDentistJpaEntity, ProcedureDentistId> {

    @Query("""
            select link.dentistId
            from ProcedureDentistJpaEntity link
            where link.procedureId = :procedureId
            order by link.dentistId
            """)
    List<Long> findDentistIdsByProcedureId(@Param("procedureId") Long procedureId);

    List<ProcedureDentistJpaEntity> findByProcedureId(Long procedureId);

    @Modifying(flushAutomatically = true)
    @Transactional
    @Query("delete from ProcedureDentistJpaEntity link where link.procedureId = :procedureId")
    void removeByProcedureId(@Param("procedureId") Long procedureId);
}
