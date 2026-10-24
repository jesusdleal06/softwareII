package co.edu.unipamplona.villadent.modules.users.infrastructure.persistence;

import co.edu.unipamplona.villadent.modules.users.domain.model.Role;
import co.edu.unipamplona.villadent.modules.users.domain.model.User;
import co.edu.unipamplona.villadent.modules.users.domain.ports.drivens.UserRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class UserPersistenceAdapter implements UserRepository {

    private final UserJpaRepository users;
    private final RoleJpaRepository roles;
    private final UserPersistenceMapper mapper;

    public UserPersistenceAdapter(
            UserJpaRepository users,
            RoleJpaRepository roles,
            UserPersistenceMapper mapper) {
        this.users = users;
        this.roles = roles;
        this.mapper = mapper;
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return users.findByEmailIgnoreCase(email).map(this::toDomain);
    }

    @Override
    public Optional<User> findById(Long id) {
        return users.findById(id).map(this::toDomain);
    }

    @Override
    public List<User> findAll() {
        return users.findAll().stream().map(this::toDomain).toList();
    }

    @Override
    public boolean existsActiveByRole(Role role) {
        return users.existsByRoleIdAndActiveTrue(roleId(role));
    }

    @Override
    public User save(User user) {
        UserJpaEntity entity = user.id() == null
                ? new UserJpaEntity()
                : users.findById(user.id()).orElseGet(UserJpaEntity::new);
        mapper.updateEntity(user, roleId(user.role()), entity);
        return toDomain(users.save(entity));
    }

    private User toDomain(UserJpaEntity entity) {
        RoleJpaEntity role = roles.findById(entity.getRoleId())
                .orElseThrow(() -> new IllegalStateException("Role not found for user " + entity.getId()));
        return mapper.toDomain(entity, Role.valueOf(role.getName()));
    }

    private Long roleId(Role role) {
        return roles.findByName(role.name())
                .orElseThrow(() -> new IllegalStateException("Role not found: " + role.name()))
                .getId();
    }
}
