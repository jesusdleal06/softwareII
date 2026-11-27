package co.edu.unipamplona.villadent.modules.reports.infrastructure.pdf;

import co.edu.unipamplona.villadent.modules.reports.domain.model.Report;
import co.edu.unipamplona.villadent.modules.reports.domain.ports.drivens.ReportPdfRenderer;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Locale;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

@Component
public class HtmlReportPdfRenderer implements ReportPdfRenderer {

    private static final Locale COLOMBIA = Locale.forLanguageTag("es-CO");
    private static final DateTimeFormatter GENERATED_AT =
            DateTimeFormatter.ofPattern("dd/MM/uuuu HH:mm z", COLOMBIA);
    private final SpringTemplateEngine templates;
    private final String logo;

    public HtmlReportPdfRenderer(SpringTemplateEngine templates) throws IOException {
        this.templates = templates;
        try (var input = new ClassPathResource("report/villadent-logo.png").getInputStream()) {
            logo = "data:image/png;base64," + Base64.getEncoder().encodeToString(input.readAllBytes());
        }
    }

    @Override
    public byte[] render(Report report, String dentistName, ZonedDateTime generatedAt) {
        var context = new Context(COLOMBIA);
        context.setVariable("report", report);
        context.setVariable("dentistName", dentistName);
        context.setVariable("generatedAt", GENERATED_AT.format(generatedAt));
        context.setVariable("logo", logo);
        String html = templates.process("appointment-report", context);
        var output = new ByteArrayOutputStream();
        var renderer = new PdfRendererBuilder();
        renderer.withHtmlContent(html, null).toStream(output);
        try {
            renderer.run();
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to render the report PDF", exception);
        }
        return output.toByteArray();
    }
}
