package co.edu.unipamplona.villadent.modules.dentists.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalTime;

@Entity
@Table(name = "horarios_odontologo")
public class ScheduleJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_horario")
    private Long id;

    @Column(name = "id_odontologo", nullable = false)
    private Long dentistId;

    @Column(name = "dia_semana", nullable = false)
    private int dayOfWeek;

    @Column(name = "hora_inicio", nullable = false)
    private LocalTime start;

    @Column(name = "hora_fin", nullable = false)
    private LocalTime end;

    @Column(name = "activo", nullable = false)
    private boolean active;

    public Long getId() {
        return id;
    }

    public Long getDentistId() {
        return dentistId;
    }

    public int getDayOfWeek() {
        return dayOfWeek;
    }

    public LocalTime getStart() {
        return start;
    }

    public LocalTime getEnd() {
        return end;
    }

    public boolean isActive() {
        return active;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setDentistId(Long dentistId) {
        this.dentistId = dentistId;
    }

    public void setDayOfWeek(int dayOfWeek) {
        this.dayOfWeek = dayOfWeek;
    }

    public void setStart(LocalTime start) {
        this.start = start;
    }

    public void setEnd(LocalTime end) {
        this.end = end;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
