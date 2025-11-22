package com.example.msgatewayserver.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@Builder
@AllArgsConstructor
@Data
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
    private Integer id;
}
