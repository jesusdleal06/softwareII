package co.edu.unipamplona.villadent.modules.reports.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "reportes_generados")
public class GeneratedReportJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "desde", nullable = false)
    public LocalDate from;

    @Column(name = "hasta", nullable = false)
    public LocalDate to;

    @Column(name = "id_odontologo")
    public Long dentistId;

    @Column(name = "id_usuario", nullable = false)
    public long userId;

    @Column(name = "generado_en", nullable = false)
    public Instant generatedAt;

    @Column(name = "cloudinary_public_id", nullable = false)
    public String cloudinaryPublicId;
}
