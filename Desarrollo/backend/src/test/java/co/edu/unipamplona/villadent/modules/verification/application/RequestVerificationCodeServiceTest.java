package co.edu.unipamplona.villadent.modules.verification.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.NormalizePhoneUseCase;
import co.edu.unipamplona.villadent.modules.verification.domain.error.TooManyCodeRequestsException;
import co.edu.unipamplona.villadent.modules.verification.domain.error.VerificationDeliveryException;
import co.edu.unipamplona.villadent.modules.verification.domain.model.PhoneVerificationCode;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivers.RequestVerificationCodeUseCase;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens.VerificationCodeRepository;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens.VerificationSecrets;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens.VerificationSender;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RequestVerificationCodeServiceTest {

    private static final String PHONE = "3001234567";
    private static final String CLIENT_IP = "10.0.0.7";
    private static final String CODE = "123456";
    private static final String CODE_HASH = "hash-of-123456";
    private static final Instant NOW = Instant.parse("2026-10-26T15:00:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneId.of("America/Bogota"));
    private static final Instant ONE_HOUR_AGO = NOW.minus(1, ChronoUnit.HOURS);
    private static final int MAX_CODES_PER_PHONE_PER_HOUR = 3;
    private static final int MAX_CODES_PER_IP_PER_HOUR = 10;

    @Mock
    private NormalizePhoneUseCase phones;
    @Mock
    private VerificationCodeRepository codes;
    @Mock
    private VerificationSender sender;
    @Mock
    private VerificationSecrets secrets;

    private RequestVerificationCodeUseCase service;

    @BeforeEach
    void setUp() {
        service = new RequestVerificationCodeService(
                phones, codes, sender, secrets, CLOCK, MAX_CODES_PER_PHONE_PER_HOUR, MAX_CODES_PER_IP_PER_HOUR);
    }

    @Test
    @DisplayName("CP-RF02-04: a code request stores only the hash and sends the code through WhatsApp")
    void storesOnlyTheHashAndSendsTheCode() {
        when(phones.normalize(PHONE)).thenReturn(PHONE);
        when(codes.countByPhoneSince(PHONE, ONE_HOUR_AGO)).thenReturn(0L);
        when(codes.countByClientIpSince(CLIENT_IP, ONE_HOUR_AGO)).thenReturn(0L);
        when(secrets.newCode()).thenReturn(CODE);
        when(secrets.hash(CODE)).thenReturn(CODE_HASH);
        when(codes.save(any(PhoneVerificationCode.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.request(new RequestVerificationCodeUseCase.RequestCodeCommand(PHONE, CLIENT_IP));

        ArgumentCaptor<PhoneVerificationCode> captor = ArgumentCaptor.forClass(PhoneVerificationCode.class);
        verify(codes).save(captor.capture());
        PhoneVerificationCode saved = captor.getValue();
        assertThat(saved.phone()).isEqualTo(PHONE);
        assertThat(saved.codeHash()).isEqualTo(CODE_HASH);
        assertThat(saved.codeHash()).isNotEqualTo(CODE);
        assertThat(saved.expiresAt()).isEqualTo(NOW.plus(5, ChronoUnit.MINUTES));
        assertThat(saved.attempts()).isZero();
        assertThat(saved.clientIp()).isEqualTo(CLIENT_IP);
        verify(codes).invalidateActiveByPhone(PHONE);
        verify(sender).sendVerificationCode(PHONE, CODE);
    }

    @Test
    @DisplayName("CP-RF02-08: the phone and IP counters are read under their transaction locks in a fixed order")
    void countersAreReadUnderTheirTransactionLocks() {
        when(phones.normalize(PHONE)).thenReturn(PHONE);
        when(codes.countByPhoneSince(PHONE, ONE_HOUR_AGO)).thenReturn(0L);
        when(codes.countByClientIpSince(CLIENT_IP, ONE_HOUR_AGO)).thenReturn(0L);
        when(secrets.newCode()).thenReturn(CODE);
        when(secrets.hash(CODE)).thenReturn(CODE_HASH);
        when(codes.save(any(PhoneVerificationCode.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.request(new RequestVerificationCodeUseCase.RequestCodeCommand(PHONE, CLIENT_IP));

        org.mockito.InOrder order = org.mockito.Mockito.inOrder(codes);
        order.verify(codes).lockPhoneRequests(PHONE);
        order.verify(codes).lockClientIpRequests(CLIENT_IP);
        order.verify(codes).countByPhoneSince(PHONE, ONE_HOUR_AGO);
        order.verify(codes).countByClientIpSince(CLIENT_IP, ONE_HOUR_AGO);
        order.verify(codes).invalidateActiveByPhone(PHONE);
        order.verify(codes).save(any(PhoneVerificationCode.class));
    }

    @Test
    @DisplayName("CP-RF02-08: a request without a client IP skips the IP counter and the IP lock")
    void requestsWithoutAClientIpSkipTheIpLimit() {
        when(phones.normalize(PHONE)).thenReturn(PHONE);
        when(codes.countByPhoneSince(PHONE, ONE_HOUR_AGO)).thenReturn(0L);
        when(secrets.newCode()).thenReturn(CODE);
        when(secrets.hash(CODE)).thenReturn(CODE_HASH);
        when(codes.save(any(PhoneVerificationCode.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.request(new RequestVerificationCodeUseCase.RequestCodeCommand(PHONE, "  "));

        verify(codes, never()).lockClientIpRequests(any());
        verify(codes, never()).countByClientIpSince(any(), any());
        verify(sender).sendVerificationCode(PHONE, CODE);
    }

    @Test
    @DisplayName("CP-RF02-04: a WhatsApp failure invalidates the code and reports the delivery error")
    void whatsAppFailureInvalidatesTheCode() {
        when(phones.normalize(PHONE)).thenReturn(PHONE);
        when(codes.countByPhoneSince(PHONE, ONE_HOUR_AGO)).thenReturn(0L);
        when(codes.countByClientIpSince(CLIENT_IP, ONE_HOUR_AGO)).thenReturn(0L);
        when(secrets.newCode()).thenReturn(CODE);
        when(secrets.hash(CODE)).thenReturn(CODE_HASH);
        when(codes.save(any(PhoneVerificationCode.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        org.mockito.Mockito.doThrow(new IllegalStateException("meta down"))
                .when(sender).sendVerificationCode(PHONE, CODE);

        assertThatThrownBy(() -> service.request(
                new RequestVerificationCodeUseCase.RequestCodeCommand(PHONE, CLIENT_IP)))
                .isInstanceOf(VerificationDeliveryException.class)
                .hasMessage("No pudimos enviar el código. Intenta de nuevo en unos minutos.");

        ArgumentCaptor<PhoneVerificationCode> captor = ArgumentCaptor.forClass(PhoneVerificationCode.class);
        verify(codes, org.mockito.Mockito.times(2)).save(captor.capture());
        List<PhoneVerificationCode> saved = captor.getAllValues();
        assertThat(saved.get(saved.size() - 1).invalidated()).isTrue();
    }

    @Test
    @DisplayName("CP-RF02-08: the fourth code request for the same phone is rejected")
    void fourthCodeRequestForTheSamePhoneIsRejected() {
        when(phones.normalize(PHONE)).thenReturn(PHONE);
        when(codes.countByPhoneSince(PHONE, ONE_HOUR_AGO)).thenReturn(3L);

        assertThatThrownBy(() -> service.request(
                new RequestVerificationCodeUseCase.RequestCodeCommand(PHONE, CLIENT_IP)))
                .isInstanceOf(TooManyCodeRequestsException.class)
                .hasMessage("Has solicitado demasiados códigos. Intenta de nuevo más tarde.");

        verify(sender, never()).sendVerificationCode(any(), any());
        verify(codes, never()).save(any(PhoneVerificationCode.class));
    }

    @Test
    @DisplayName("CP-RF02-08: the eleventh code request from the same IP is rejected")
    void eleventhCodeRequestFromTheSameIpIsRejected() {
        when(phones.normalize(PHONE)).thenReturn(PHONE);
        when(codes.countByPhoneSince(PHONE, ONE_HOUR_AGO)).thenReturn(0L);
        when(codes.countByClientIpSince(eq(CLIENT_IP), eq(ONE_HOUR_AGO))).thenReturn(10L);

        assertThatThrownBy(() -> service.request(
                new RequestVerificationCodeUseCase.RequestCodeCommand(PHONE, CLIENT_IP)))
                .isInstanceOf(TooManyCodeRequestsException.class);

        verify(sender, never()).sendVerificationCode(any(), any());
    }

    @Test
    @DisplayName("CP-RF02-08: the phone limit comes from configuration instead of the default of three")
    void phoneLimitComesFromConfiguration() {
        RequestVerificationCodeUseCase relaxed = new RequestVerificationCodeService(
                phones, codes, sender, secrets, CLOCK, 1000, MAX_CODES_PER_IP_PER_HOUR);
        when(phones.normalize(PHONE)).thenReturn(PHONE);
        when(codes.countByPhoneSince(PHONE, ONE_HOUR_AGO)).thenReturn(3L);
        when(codes.countByClientIpSince(CLIENT_IP, ONE_HOUR_AGO)).thenReturn(0L);
        when(secrets.newCode()).thenReturn(CODE);
        when(secrets.hash(CODE)).thenReturn(CODE_HASH);
        when(codes.save(any(PhoneVerificationCode.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        relaxed.request(new RequestVerificationCodeUseCase.RequestCodeCommand(PHONE, CLIENT_IP));

        verify(sender).sendVerificationCode(PHONE, CODE);
    }

    @Test
    @DisplayName("CP-RF02-08: the IP limit comes from configuration instead of the default of ten")
    void ipLimitComesFromConfiguration() {
        RequestVerificationCodeUseCase strict = new RequestVerificationCodeService(
                phones, codes, sender, secrets, CLOCK, MAX_CODES_PER_PHONE_PER_HOUR, 5);
        when(phones.normalize(PHONE)).thenReturn(PHONE);
        when(codes.countByPhoneSince(PHONE, ONE_HOUR_AGO)).thenReturn(0L);
        when(codes.countByClientIpSince(eq(CLIENT_IP), eq(ONE_HOUR_AGO))).thenReturn(5L);

        assertThatThrownBy(() -> strict.request(
                new RequestVerificationCodeUseCase.RequestCodeCommand(PHONE, CLIENT_IP)))
                .isInstanceOf(TooManyCodeRequestsException.class);

        verify(sender, never()).sendVerificationCode(any(), any());
    }
}
