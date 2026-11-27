package co.edu.unipamplona.villadent.modules.dentists.domain.model;

import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public record DentistProfile(String firstName, String secondName, String firstSurname, String secondSurname,
                             String photoUrl, String photoPublicId, List<String> academicTitles, String description) {

    private static final Pattern LEGACY_TITLE = Pattern.compile("^Dra?\\.", Pattern.CASE_INSENSITIVE);
    private static final Pattern WHITESPACE = Pattern.compile("\\p{javaWhitespace}+");

    public DentistProfile {
        academicTitles = academicTitles == null ? List.of() : List.copyOf(academicTitles);
    }

    static DentistProfile fromLegacyName(String name) {
        String original = name.strip();
        String stripped = WHITESPACE.matcher(LEGACY_TITLE.matcher(original).replaceFirst("")).replaceAll(" ").trim();
        String[] parts = (stripped.isEmpty() ? original : stripped).split(" ");
        int count = parts.length;
        return new DentistProfile(parts[0],
                count >= 4 ? String.join(" ", List.of(parts).subList(1, count - 2)) : null,
                count >= 2 ? parts[count == 2 ? 1 : count - 2] : null,
                count >= 3 ? parts[count - 1] : null, null, null, List.of(), null);
    }

    public String fullName() {
        return Stream.of(firstName, secondName, firstSurname, secondSurname)
                .filter(Objects::nonNull).filter(part -> !part.isBlank()).collect(Collectors.joining(" "));
    }
}
