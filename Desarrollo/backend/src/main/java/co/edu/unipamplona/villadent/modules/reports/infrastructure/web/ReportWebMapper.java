package co.edu.unipamplona.villadent.modules.reports.infrastructure.web;

import co.edu.unipamplona.villadent.modules.reports.domain.model.DailyReport;
import co.edu.unipamplona.villadent.modules.reports.domain.model.Report;
import co.edu.unipamplona.villadent.modules.reports.domain.model.ReportCounts;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivers.ReportHistoryUseCase;
import co.edu.unipamplona.villadent.shared.config.CentralMapperConfig;
import org.mapstruct.Mapper;

@Mapper(config = CentralMapperConfig.class)
public interface ReportWebMapper {
    ReportHistoryResponse toHistoryResponse(ReportHistoryUseCase.Entry entry);

    ReportResponse toResponse(Report report);

    DailyReportResponse toDailyResponse(DailyReport report);

    ReportCountsResponse toCountsResponse(ReportCounts counts);
}
