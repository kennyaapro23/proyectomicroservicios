package com.example.msventa.entity;

import com.example.msventa.dto.OrderDto;  // DTO para la información de la orden
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "sales")
@Data

public class Sale {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;  // Identificador único de la venta

    private Integer orderId;  // ID de la orden asociada a esta venta
    private Double totalAmount;  // Monto total de la venta (con impuestos)
    private String status;  // Estado de la venta (e.g., 'paid', 'pending', etc.)
    private String paymentMethod;  // Método de pago (e.g., 'EFECTIVO', 'TARJETA')

    private LocalDateTime saleDate;

    private Integer clientId;

    // Este campo no se almacena en la base de datos, ya que es solo un DTO usado para enriquecer la venta con los detalles de la orden
    @Transient
    private OrderDto orderDto;
}
