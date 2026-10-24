package co.edu.unipamplona.villadent.modules.dentists.infrastructure.web;

import java.time.LocalTime;

public record RegisterScheduleRequest(int dayOfWeek, LocalTime start, LocalTime end) {
}
