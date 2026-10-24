package co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentStatus;
import java.time.LocalDate;

/** Minimal appointment view for the reports module. */
public record AppointmentReportRow(LocalDate date, AppointmentStatus status) {}
