package co.edu.unipamplona.villadent.modules.verification.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.NormalizePhoneUseCase;
import co.edu.unipamplona.villadent.modules.verification.domain.error.CodeExpiredException;
import co.edu.unipamplona.villadent.modules.verification.domain.error.InvalidCodeException;
import co.edu.unipamplona.villadent.modules.verification.domain.error.TooManyAttemptsException;
import co.edu.unipamplona.villadent.modules.verification.domain.model.PhoneVerificationCode;
import co.edu.unipamplona.villadent.modules.verification.domain.model.VerificationToken;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivers.VerifyPhoneCodeUseCase.VerificationResult;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivers.VerifyPhoneCodeUseCase.VerifyCodeCommand;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens.VerificationCodeRepository;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens.VerificationSecrets;
import co.edu.unipamplona.villadent.modules.verification.domain.ports.drivens.VerificationTokenRepository;
import co.edu.unipamplona.villadent.support.MutableClock;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VerifyPhoneCodeServiceTest {

    private static final String PHONE = "3001234567";
    private static final String CODE = "123456";
    private static final String CODE_HASH = "hash-of-123456";
    private static final String RAW_TOKEN = "raw-verification-token";
    private static final String TOKEN_HASH = "hash-of-token";
    private static final Instant NOW = Instant.parse("2026-10-26T15:00:00Z");
    private static final ZoneId ZONE = ZoneId.of("America/Bogota");
    private static final Clock CLOCK = Clock.fixed(NOW, ZONE);

    @Mock
    private NormalizePhoneUseCase phones;

    @Mock
    private VerificationCodeRepository codes;

    @Mock
    private VerificationTokenRepository tokens;

    @Mock
    private VerificationSecrets secrets;

    private VerifyPhoneCodeService service;

    @BeforeEach
    void setUp() {
        service = new VerifyPhoneCodeService(phones, codes, tokens, secrets, CLOCK);
        when(phones.normalize(PHONE)).thenReturn(PHONE);
    }

    @Test
    @DisplayName("CP-RF02-05: a wrong code is rejected and counts one attempt")
    void wrongCodeIsRejectedAndCountsOneAttempt() {
        PhoneVerificationCode active = code(0, false, false, NOW.plusSeconds(300));
        when(codes.findLatestByPhone(PHONE)).thenReturn(Optional.of(active));
        when(secrets.hash(CODE)).thenReturn("another-hash");
        when(codes.registerWrongAttempt(1L, NOW))
                .thenReturn(Optional.of(code(1, false, false, NOW.plusSeconds(300))));

        assertThrows(InvalidCodeException.class,
                () -> service.verify(new VerifyCodeCommand(PHONE, CODE)));

        verify(codes).registerWrongAttempt(1L, NOW);
        verify(tokens, never()).save(any(VerificationToken.class));
    }

    @Test
    @DisplayName("CP-RF02-06: an expired code is rejected even when the digits match")
    void expiredCodeIsRejected() {
        MutableClock clock = new MutableClock(NOW, ZONE);
        PhoneVerificationCode active = code(0, false, false, NOW.plusSeconds(300));
        when(codes.findLatestByPhone(PHONE)).thenReturn(Optional.of(active));
        VerifyPhoneCodeService withMutableClock =
                new VerifyPhoneCodeService(phones, codes, tokens, secrets, clock);

        clock.advanceMinutes(PhoneVerificationCode.VALIDITY_MINUTES);

        CodeExpiredException failure = assertThrows(CodeExpiredException.class,
                () -> withMutableClock.verify(new VerifyCodeCommand(PHONE, CODE)));

        assertEquals("El código venció. Solicita uno nuevo.", failure.getMessage());
        verify(codes, never()).registerWrongAttempt(any(), any());
        verify(codes, never()).markUsedIfUsable(any(), any());
        verify(tokens, never()).save(any(VerificationToken.class));
    }

    @Test
    @DisplayName("CP-RF02-07: the third wrong attempt invalidates the code")
    void thirdWrongAttemptInvalidatesTheCode() {
        PhoneVerificationCode active = code(2, false, false, NOW.plusSeconds(300));
        when(codes.findLatestByPhone(PHONE)).thenReturn(Optional.of(active));
        when(secrets.hash(CODE)).thenReturn("another-hash");
        when(codes.registerWrongAttempt(1L, NOW))
                .thenReturn(Optional.of(code(3, false, true, NOW.plusSeconds(300))));

        assertThrows(TooManyAttemptsException.class,
                () -> service.verify(new VerifyCodeCommand(PHONE, CODE)));

        verify(tokens, never()).save(any(VerificationToken.class));
    }

    @Test
    @DisplayName("CP-RF02-07: the right code stops working after the code was invalidated")
    void rightCodeStopsWorkingAfterInvalidation() {
        PhoneVerificationCode invalidated = code(3, false, true, NOW.plusSeconds(300));
        when(codes.findLatestByPhone(PHONE)).thenReturn(Optional.of(invalidated));

        assertThrows(CodeExpiredException.class,
                () -> service.verify(new VerifyCodeCommand(PHONE, CODE)));

        verify(codes, never()).registerWrongAttempt(any(), any());
        verify(codes, never()).markUsedIfUsable(any(), any());
        verify(tokens, never()).save(any(VerificationToken.class));
    }

    @Test
    @DisplayName("CP-RF02-04: a correct code marks the code used and issues a token")
    void correctCodeIssuesAVerificationToken() {
        PhoneVerificationCode active = code(0, false, false, NOW.plusSeconds(300));
        when(codes.findLatestByPhone(PHONE)).thenReturn(Optional.of(active));
        when(secrets.hash(CODE)).thenReturn(CODE_HASH);
        when(codes.markUsedIfUsable(1L, NOW)).thenReturn(true);
        when(secrets.newToken()).thenReturn(RAW_TOKEN);
        when(secrets.hash(RAW_TOKEN)).thenReturn(TOKEN_HASH);
        when(tokens.save(any(VerificationToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        VerificationResult result = service.verify(new VerifyCodeCommand(PHONE, CODE));

        assertEquals(RAW_TOKEN, result.verificationToken());
        verify(codes).markUsedIfUsable(1L, NOW);

        ArgumentCaptor<VerificationToken> savedToken = ArgumentCaptor.forClass(VerificationToken.class);
        verify(tokens).save(savedToken.capture());
        assertEquals(TOKEN_HASH, savedToken.getValue().tokenHash());
        assertEquals(PHONE, savedToken.getValue().phone());
        assertEquals(NOW.plusSeconds(900), savedToken.getValue().expiresAt());
    }

    @Test
    @DisplayName("CP-RF02-04: a code already used by a parallel verify does not issue a second token")
    void aSecondTokenIsNotIssuedWhenTheCodeWasConsumedByAnotherRequest() {
        PhoneVerificationCode active = code(0, false, false, NOW.plusSeconds(300));
        when(codes.findLatestByPhone(PHONE)).thenReturn(Optional.of(active));
        when(secrets.hash(CODE)).thenReturn(CODE_HASH);
        when(codes.markUsedIfUsable(1L, NOW)).thenReturn(false);

        assertThrows(CodeExpiredException.class,
                () -> service.verify(new VerifyCodeCommand(PHONE, CODE)));

        verify(tokens, never()).save(any(VerificationToken.class));
    }

    private static PhoneVerificationCode code(
            int attempts, boolean used, boolean invalidated, Instant expiresAt) {
        return new PhoneVerificationCode(
                1L, PHONE, CODE_HASH, expiresAt, attempts, used, invalidated, "10.0.0.1", NOW.minusSeconds(60));
    }
}
