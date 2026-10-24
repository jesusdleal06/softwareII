package co.edu.unipamplona.villadent.modules.users.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "roles")
public class RoleJpaEntity {

    @Id
    @Column(name = "id_rol")
    private Long id;

    @Column(name = "nombre_rol", nullable = false, unique = true)
    private String name;

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }
}
