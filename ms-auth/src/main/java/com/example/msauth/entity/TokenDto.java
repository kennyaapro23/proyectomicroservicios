package com.example.msauth.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TokenDto {

    @JsonProperty("token")
    private String token;

    @JsonProperty("userName")
    private String userName;

    @JsonProperty("role")
    private String role;

    @JsonProperty("clientId")
    private Integer clientId;

    @JsonProperty("id")
    private Integer id; // Cambiado de Long a Integer para coincidir con AuthUser.id
}
