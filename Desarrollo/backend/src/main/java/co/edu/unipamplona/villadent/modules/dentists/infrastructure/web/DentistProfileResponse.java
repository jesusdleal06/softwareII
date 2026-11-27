package co.edu.unipamplona.villadent.modules.dentists.infrastructure.web;

import java.util.List;

public record DentistProfileResponse(Long id, String firstName, String secondName,
                                     String firstSurname, String secondSurname, String fullName,
                                     String specialty, String photoUrl, List<String> academicTitles,
                                     String description) {}
