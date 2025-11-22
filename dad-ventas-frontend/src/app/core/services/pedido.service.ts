import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OrderRequest, OrderResponse } from '../models/order.model';
import { resources } from '../resources/resources';

@Injectable({
    providedIn: 'root'
})
export class OrderService {

    constructor(private http: HttpClient) { }

    // 🔹 POST /Order
    createOrder(order: OrderRequest): Observable<any> {
        return this.http.post<any>(resources.pedidos.crear, order);
    }

    getAllOrders(): Observable<OrderResponse[]> {
        return this.http.get<OrderResponse[]>(resources.pedidos.listar);
    }

    getMyOrders(): Observable<OrderResponse[]> {
        return this.http.get<OrderResponse[]>(resources.pedidos.misPedidos);
    }

    // Obtener cliente por ID (GET /Client/{id})
    getClientById(id: number): Observable<any> {
        return this.http.get<any>(resources.clientes.detalle(id));
    }
  
    getOrderById(id: number): Observable<OrderRequest> {
        return this.http.get<OrderRequest>(resources.pedidos.detalle(id));
    }

    updateOrder(id: number, order: OrderRequest): Observable<any> {
        return this.http.put<any>(resources.pedidos.actualizar(id), order);
    }

    // 🔹 DELETE /Order/{id}
    deleteOrder(id: number): Observable<any> {
        return this.http.delete<any>(resources.pedidos.eliminar(id));
    }

    // 🔹 GET /Client (solo admins)
    getClientes(): Observable<any[]> {
        return this.http.get<any[]>(resources.clientes.listar);
    }
}

