package co.edu.unipamplona.villadent.modules.appointments.infrastructure.web;

import co.edu.unipamplona.villadent.modules.appointments.domain.model.AppointmentOrigin;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.AppointmentResult;
import co.edu.unipamplona.villadent.modules.appointments.domain.ports.drivers.BookAppointmentUseCase.BookAppointmentCommand;
import co.edu.unipamplona.villadent.shared.config.CentralMapperConfig;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = CentralMapperConfig.class)
public interface AppointmentWebMapper {

    PublicAppointmentResponse toPublicResponse(AppointmentResult result);

    StaffAppointmentResponse toStaffResponse(AppointmentResult result);

    @Mapping(target = "patientName", source = "request.patientName")
    @Mapping(target = "patientPhone", source = "request.patientPhone")
    @Mapping(target = "dentistId", source = "request.dentistId")
    @Mapping(target = "procedureId", source = "request.procedureId")
    @Mapping(target = "date", source = "request.date")
    @Mapping(target = "time", source = "request.time")
    @Mapping(target = "origin", source = "origin")
    BookAppointmentCommand toCommand(BookAppointmentRequest request, AppointmentOrigin origin);
}
