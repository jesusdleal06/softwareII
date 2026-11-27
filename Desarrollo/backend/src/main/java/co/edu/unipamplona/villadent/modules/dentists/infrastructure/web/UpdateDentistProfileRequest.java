package co.edu.unipamplona.villadent.modules.dentists.infrastructure.web;

import java.util.List;

public record UpdateDentistProfileRequest(String firstName, String secondName, String firstSurname,
                                          String secondSurname, List<String> academicTitles,
                                          String description) {}
