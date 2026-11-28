package co.edu.unipamplona.villadent.shared.whatsapp;

/**
 * Formats Colombian mobile numbers for the WhatsApp Cloud API, which expects
 * the country code prefixed to the local number.
 */
public final class InternationalPhoneFormatter {

    private static final String COUNTRY_CODE = "57";

    private InternationalPhoneFormatter() {
    }

    public static String toInternational(String phone) {
        if (phone == null) {
            return null;
        }
        if (phone.length() == COUNTRY_CODE.length() + 10 && phone.startsWith(COUNTRY_CODE)) {
            return phone;
        }
        return COUNTRY_CODE + phone;
    }
}
