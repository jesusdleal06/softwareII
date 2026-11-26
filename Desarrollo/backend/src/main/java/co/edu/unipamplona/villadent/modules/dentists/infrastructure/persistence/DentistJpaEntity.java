package co.edu.unipamplona.villadent.modules.dentists.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@DynamicUpdate
@Table(name = "odontologos")
public class DentistJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_odontologo")
    private Long id;

    @Column(name = "nombre", nullable = false)
    private String name;

    @Column(name = "primer_nombre")
    private String firstName;

    @Column(name = "segundo_nombre")
    private String secondName;

    @Column(name = "primer_apellido")
    private String firstSurname;

    @Column(name = "segundo_apellido")
    private String secondSurname;

    @Column(name = "foto_url")
    private String photoUrl;

    @Column(name = "foto_public_id")
    private String photoPublicId;

    @Column(name = "titulos_academicos", columnDefinition = "text[]")
    private String[] academicTitles;

    @Column(name = "descripcion", length = 500)
    private String description;

    @Column(name = "especialidad")
    private String specialty;

    @Column(name = "id_usuario", unique = true)
    private Long userId;

    @Column(name = "activo", nullable = false)
    private boolean active;

    @CreationTimestamp
    @Column(name = "creado_en", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "actualizado_en", nullable = false)
    private Instant updatedAt;

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getSpecialty() {
        return specialty;
    }

    public Long getUserId() {
        return userId;
    }

    public boolean isActive() {
        return active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setSpecialty(String specialty) {
        this.specialty = specialty;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }
    public String getSecondName() {
        return secondName;
    }

    public void setSecondName(String secondName) {
        this.secondName = secondName;
    }
    public String getFirstSurname() {
        return firstSurname;
    }

    public void setFirstSurname(String firstSurname) {
        this.firstSurname = firstSurname;
    }
    public String getSecondSurname() {
        return secondSurname;
    }

    public void setSecondSurname(String secondSurname) {
        this.secondSurname = secondSurname;
    }
    public String getPhotoUrl() {
        return photoUrl;
    }

    public void setPhotoUrl(String photoUrl) {
        this.photoUrl = photoUrl;
    }
    public String getPhotoPublicId() {
        return photoPublicId;
    }

    public void setPhotoPublicId(String photoPublicId) {
        this.photoPublicId = photoPublicId;
    }
    public String[] getAcademicTitles() {
        return academicTitles;
    }

    public void setAcademicTitles(String[] academicTitles) {
        this.academicTitles = academicTitles;
    }
    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
