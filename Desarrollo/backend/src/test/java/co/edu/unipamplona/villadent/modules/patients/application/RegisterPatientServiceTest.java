package co.edu.unipamplona.villadent.modules.patients.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import co.edu.unipamplona.villadent.modules.patients.domain.model.Patient;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivers.RegisterPatientUseCase.RegisterPatientCommand;
import co.edu.unipamplona.villadent.modules.patients.domain.ports.drivens.PatientRepository;
import co.edu.unipamplona.villadent.shared.error.ConflictException;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RegisterPatientServiceTest {

    @Mock
    private PatientRepository patients;

    private RegisterPatientService service;

    @BeforeEach
    void setUp() {
        service = new RegisterPatientService(patients);
    }

    @Test
    void createsANewPatient() {
        when(patients.findByPhone("3001234567")).thenReturn(Optional.empty());
        when(patients.save(any(Patient.class))).thenAnswer(invocation -> {
            Patient patient = invocation.getArgument(0);
            return new Patient(5L, patient.fullName(), patient.phone(), true);
        });

        var result = service.register(new RegisterPatientCommand("Ana María", "3001234567"));

        assertThat(result.id()).isEqualTo(5L);
        assertThat(result.phone()).isEqualTo("3001234567");
        assertThat(result.active()).isTrue();
    }

    @Test
    @DisplayName("An inactive phone is reactivated instead of duplicated")
    void reactivatesAnInactivePatient() {
        Patient existing = new Patient(5L, "Ana María", "3001234567", false);
        when(patients.findByPhone("3001234567")).thenReturn(Optional.of(existing));
        when(patients.save(any(Patient.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.register(new RegisterPatientCommand("Ana María Rueda", "3001234567"));

        assertThat(result.id()).isEqualTo(5L);
        assertThat(result.fullName()).isEqualTo("Ana María Rueda");
        assertThat(result.active()).isTrue();
        verify(patients).save(org.mockito.ArgumentMatchers.argThat(saved ->
                saved.id().equals(5L)
                        && saved.fullName().equals("Ana María Rueda")
                        && saved.phone().equals("3001234567")
                        && saved.isActive()));
    }

    @Test
    void rejectsAnActiveDuplicate() {
        Patient existing = new Patient(5L, "Ana María", "3001234567", true);
        when(patients.findByPhone("3001234567")).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> service.register(new RegisterPatientCommand("Ana María", "3001234567")))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Ya existe un paciente con ese celular.");

        verify(patients, never()).save(any());
    }
}
