package co.edu.unipamplona.villadent.modules.dentists.infrastructure.web;

import java.util.List;

public record PublicDentistResponse(Long id, String name, String specialty, String photoUrl,
                                    List<String> academicTitles, String description) {}
