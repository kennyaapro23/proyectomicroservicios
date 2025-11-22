package com.example.msgatewayserver.config;

import com.example.msgatewayserver.dto.TokenDto;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.Arrays;
import java.util.List;

@Component
public class AuthFilter extends AbstractGatewayFilterFactory<AuthFilter.Config> {

    private final WebClient.Builder webClient;

    // Rutas que se excluirán de validación
    private static final List<String> excludePaths = Arrays.asList(
            "/uploads", "/uploads/", "/uploads/**"
    );

    public AuthFilter(WebClient.Builder webClient) {
        super(Config.class);
        this.webClient = webClient;
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {

            String path = exchange.getRequest().getURI().getPath();
            System.out.println("AuthFilter: Incoming request to " + path);

            // Permitir solicitudes OPTIONS sin validación (CORS preflight)
            if (exchange.getRequest().getMethod() == HttpMethod.OPTIONS) {
                System.out.println("AuthFilter: OPTIONS request - permitiendo sin validación");
                return chain.filter(exchange);
            }

            // Excluir rutas públicas como /uploads/**
            if (excludePaths.stream().anyMatch(path::startsWith)) {
                System.out.println("AuthFilter: Ruta pública detectada, sin validación: " + path);
                return chain.filter(exchange);
            }

            // Log: mostrar headers que llegaron al gateway
            System.out.println("AuthFilter: Incoming raw headers: " + exchange.getRequest().getHeaders());

            // Validación del token
            if (!exchange.getRequest().getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
                System.out.println("AuthFilter: No Authorization header present");
                return onError(exchange, HttpStatus.BAD_REQUEST);
            }

            String tokenHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
            System.out.println("AuthFilter: Authorization header = " + tokenHeader);

            String[] chunks = tokenHeader.split(" ");
            if (chunks.length != 2 || !chunks[0].equals("Bearer")) {
                System.out.println("AuthFilter: Invalid Authorization header format");
                return onError(exchange, HttpStatus.BAD_REQUEST);
            }

            String token = chunks[1];
            System.out.println("AuthFilter: Validating token = " + token);

            return webClient.build()
                    .post()
                    .uri("http://ms-auth-service/auth/validate?token=" + token)
                    .retrieve()
                    .bodyToMono(TokenDto.class)
                    .flatMap(t -> {
                        System.out.println("🟢 Inyectando headers desde token:");
                        System.out.println("x-username: " + t.getUserName());
                        System.out.println("x-role: " + t.getRole());
                        System.out.println("token clientId: " + t.getClientId());
                        System.out.println("token id claim: " + t.getId());

                        // --- RESOLVER CLIENT ID EN UNA VARIABLE FINAL (NO REASIGNAR) ---
                        final Integer resolvedClientId;
                        if (t.getClientId() != null) {
                            resolvedClientId = t.getClientId();
                        } else if ("CLIENTE".equalsIgnoreCase(t.getRole()) && t.getId() != null) {
                            resolvedClientId = t.getId();
                            System.out.println("AuthFilter: usando claim 'id' como x-client-id para token de CLIENTE: " + resolvedClientId);
                        } else {
                            resolvedClientId = null;
                        }
                        // --------------------------------------------------------------

                        ServerWebExchange mutatedExchange = exchange.mutate()
                                .request(builder -> builder
                                        .headers(httpHeaders -> {
                                            if (t.getUserName() != null) {
                                                httpHeaders.add("x-username", t.getUserName());
                                            }
                                            if (t.getRole() != null) {
                                                httpHeaders.add("x-role", t.getRole());
                                            }

                                            // No sobrescribimos si ya viene
                                            if (!exchange.getRequest().getHeaders().containsKey("x-client-id")) {
                                                if (resolvedClientId != null) {
                                                    httpHeaders.add("x-client-id", String.valueOf(resolvedClientId));
                                                    System.out.println("AuthFilter: inyectado x-client-id = " + resolvedClientId);
                                                } else {
                                                    System.out.println("AuthFilter: token no contiene clientId ni id aplicable; no añadimos x-client-id.");
                                                }
                                            } else {
                                                System.out.println("AuthFilter: client-id already present in request, not overwriting.");
                                            }
                                        })
                                )
                                .build();

                        return chain.filter(mutatedExchange);
                    })
                    .onErrorResume(err -> {
                        System.out.println("❌ Token validation error: " + err.getMessage());
                        return onError(exchange, HttpStatus.UNAUTHORIZED);
                    });
        };
    }

    public Mono<Void> onError(ServerWebExchange exchange, HttpStatus status) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(status);
        return response.setComplete();
    }

    public static class Config {
    }
}