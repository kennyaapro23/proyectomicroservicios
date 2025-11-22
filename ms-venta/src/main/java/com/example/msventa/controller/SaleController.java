package com.example.msventa.controller;

import com.example.msventa.dto.CardDto;
import com.example.msventa.dto.ErrorResponseDto;
import com.example.msventa.dto.OrderDto;
import com.example.msventa.dto.SaleDto;
import com.example.msventa.entity.Sale;
import com.example.msventa.feign.OrderFeign;
import com.example.msventa.service.SaleService;
import feign.FeignException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/Sale")

public class SaleController {

    @Autowired
    private SaleService saleService;

    @Autowired
    private OrderFeign orderFeign;

    // Endpoint para listar todas las ventas del Admin
    @GetMapping
    public ResponseEntity<List<Sale>> listarVentasAdmin() {
        List<Sale> ventas = saleService.listar();
        if (ventas.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NO_CONTENT).build();  // Retorna sin cuerpo cuando no hay ventas
        }
        return ResponseEntity.ok(ventas);
    }

    // Endpoint para listar las compras de un cliente
    @GetMapping("/my")
    public ResponseEntity<?> listarMisCompras(@RequestHeader(value = "x-client-id") Integer clientId) {
            if (clientId == null || clientId <= 0) {
                return ResponseEntity.badRequest()
                    .body(new ErrorResponseDto("El clientId es inválido o nulo."));
        }

        // Obtener las ventas para el cliente
        List<SaleDto> ventas = saleService.listarVentasPorCliente(clientId);

        if (ventas.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NO_CONTENT)
                    .body(new ErrorResponseDto("No hay ventas asociadas a este cliente."));  // Mensaje claro si no hay ventas
        }

        return ResponseEntity.ok(ventas);  // Devolver ventas encontradas
    }

    // Endpoint para obtener el detalle de una venta
    @GetMapping("/{id}")
    public ResponseEntity<?> getSaleById(@PathVariable Integer id) {
        if (id == null || id <= 0) {
            return ResponseEntity.badRequest()
                    .body(new ErrorResponseDto("El ID de la venta es inválido."));  // Validación clara del ID
        }

        Sale sale = saleService.getSaleById(id);
        if (sale == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponseDto("Venta no encontrada."));  // Si no se encuentra la venta
        }
        return ResponseEntity.ok(sale);  // Venta encontrada
    }


    @PostMapping("/process/{orderId}")
    public ResponseEntity<?> processSale(
            @PathVariable Integer orderId,
            @RequestParam String paymentMethod,
            @RequestHeader(value = "x-client-id") Integer clientId,
            @RequestBody(required = false) CardDto cardData) {

        try {
            // Verificación de existencia del pedido
            OrderDto orderDto = orderFeign.getById(orderId);

            if (orderDto == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ErrorResponseDto("Pedido no encontrado."));
            }

            // Validación de datos de tarjeta si el método de pago es TARJETA
            if ("TARJETA".equalsIgnoreCase(paymentMethod)) {
                if (cardData == null || cardData.getNumero() == null || cardData.getCvv() == null || cardData.getFecha() == null) {
                    return ResponseEntity.badRequest()
                            .body(new ErrorResponseDto("Los datos de la tarjeta son obligatorios para pago con tarjeta."));
                }
            }

            // Envías también el clientId aquí
            Sale sale = saleService.processSale(orderId, paymentMethod, clientId);

            orderFeign.updateStatus(orderId, "PAGADO");

            return ResponseEntity.ok(sale);

        } catch (FeignException.NotFound ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new ErrorResponseDto("El pedido no fue encontrado en el microservicio de pedidos."));
        } catch (FeignException ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponseDto("Error al comunicarse con ms-pedido: " + ex.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(new ErrorResponseDto("Error interno al procesar la venta: " + e.getMessage()));
        }
    }



}
