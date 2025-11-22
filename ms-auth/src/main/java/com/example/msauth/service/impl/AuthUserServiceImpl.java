package com.example.msauth.service.impl;

import com.example.msauth.dto.AuthUserDto;
import com.example.msauth.dto.ClientDto;
import com.example.msauth.entity.AuthUser;
import com.example.msauth.entity.TokenDto;
import com.example.msauth.enums.Roles;
import com.example.msauth.feign.ClientFeign;
import com.example.msauth.repository.AuthUserRepository;
import com.example.msauth.security.JwtProvider;
import com.example.msauth.service.AuthUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class AuthUserServiceImpl implements AuthUserService {

    @Autowired
    private AuthUserRepository authUserRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtProvider jwtProvider;

    @Autowired
    private ClientFeign clientFeign;

    @Override
    public List<AuthUser> findAll() {
        return authUserRepository.findAll();
    }

    @Override
    public AuthUser save(AuthUserDto authUserDto) {
        Optional<AuthUser> user = authUserRepository.findByUserName(authUserDto.getUserName());
        if (user.isPresent()) {
            System.out.println("⚠️ Usuario ya existe: " + authUserDto.getUserName());
            return null;
        }

        // Convertir rol seguro
        Roles role;
        try {
            role = Roles.valueOf(authUserDto.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            System.out.println("❌ Rol inválido: " + authUserDto.getRole());
            return null;
        }

        // Crear y guardar usuario sin clientId
        String password = passwordEncoder.encode(authUserDto.getPassword());
        AuthUser authUser = AuthUser.builder()
                .userName(authUserDto.getUserName())
                .password(password)
                .role(role)
                .build();

        AuthUser savedUser = authUserRepository.save(authUser);

        // Crear cliente en microservicio externo
        ClientDto client = new ClientDto();
        client.setName(authUserDto.getName());
        client.setDocument(authUserDto.getDocument());
        client.setEmail(authUserDto.getUserName()); // userName como email
        client.setTelefono(authUserDto.getTelefono());

        try {
            ClientDto clientResponse = clientFeign.createClient(client);
            System.out.println("✅ Cliente creado correctamente: " + clientResponse);

            // Asignar clientId al usuario y guardar de nuevo
            savedUser.setClientId(clientResponse.getId());
            savedUser = authUserRepository.save(savedUser);

        } catch (Exception e) {
            System.out.println("❌ Error al crear cliente vía Feign: " + e.getMessage());
            // Opcional: lanzar excepción o rollback
        }

        return savedUser;
    }

    @Override
    public TokenDto login(AuthUserDto authUserDto) {
        Optional<AuthUser> userOpt = authUserRepository.findByUserName(authUserDto.getUserName());

        if (userOpt.isEmpty()) {
            System.out.println("❌ Usuario no encontrado: " + authUserDto.getUserName());
            return null;
        }

        AuthUser user = userOpt.get();

        if (passwordEncoder.matches(authUserDto.getPassword(), user.getPassword())) {
            return new TokenDto(
                    jwtProvider.createToken(user),
                    user.getUserName(),
                    user.getRole().name(),
                    user.getClientId(),
                    user.getId() // <-- se añade el id del usuario aquí
            );
        }

        System.out.println("❌ Contraseña incorrecta");
        return null;
    }

    @Override
    public TokenDto validate(String token) {
        if (!jwtProvider.validate(token)) {
            System.out.println("❌ Token inválido");
            return null;
        }

        String username = jwtProvider.getUserNameFromToken(token);
        Optional<AuthUser> userOpt = authUserRepository.findByUserName(username);

        if (userOpt.isEmpty()) {
            System.out.println("❌ Usuario no encontrado con token");
            return null;
        }

        AuthUser user = userOpt.get();

        // ✅ Ahora se devuelven los datos que necesita el Gateway
        return new TokenDto(
                token,
                user.getUserName(),
                user.getRole().name(),
                user.getClientId(),
                user.getId() // <-- se añade el id del usuario aquí
        );
    }
}
