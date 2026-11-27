package co.edu.unipamplona.villadent.modules.procedures.infrastructure.web;

import java.util.List;

public record UpdateProcedureDentistsRequest(List<Long> dentistIds) {
}
