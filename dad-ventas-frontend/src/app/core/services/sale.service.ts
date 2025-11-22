import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { switchMap, map } from 'rxjs/operators';
import { OrderService } from './pedido.service';
import { Sale } from "../models/sale.model";
import { resources } from "../resources/resources";
import {AuthService} from "./auth.service";
import { SelectedClientService } from './selected-client.service';


@Injectable({
    providedIn: 'root',
})
export class SaleService {

    constructor(private http: HttpClient, private authService: AuthService, private selectedClientService: SelectedClientService,
                private pedidoService: OrderService) {

    }

    // Ventas del Admin
    getSales(): Observable<Sale[]> {
        return this.http.get<Sale[]>(resources.ventas.listar);
    }

    // Compras del Cliente (requiere header x-client-id)
    getMyPurchases(): Observable<Sale[]> {
        const token = this.authService.getToken();
        const clientId = this.authService.getClientId();

        let headers = token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : undefined;
        if (clientId != null && clientId > 0) {
            headers = headers ? headers.set('x-client-id', String(clientId)) : new HttpHeaders({ 'x-client-id': String(clientId) });
        }

        return this.http.get<Sale[]>(resources.ventas.misCompras, { headers });
    }




    // 🔥 Procesar Venta
    processSale(orderId: number, metodo: string, tarjetaData?: any): Observable<any> {
        const url = resources.ventas.procesar(orderId, metodo);

        // Incluir token en headers por si el interceptor no lo añade
        const token = this.authService.getToken();
        let headers: HttpHeaders | undefined = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

        // Obtener clientId (token o selección admin)
        const clientIdFromToken = this.authService.getClientId();
        const clientIdFromSelection = this.selectedClientService.getSelectedClientId();
        const clientId = clientIdFromToken ?? clientIdFromSelection;

        if (clientId != null) {
            headers = headers ? headers.set('x-client-id', String(clientId)) : new HttpHeaders({ 'x-client-id': String(clientId) });
        }

        // Helper to post and normalize response (handle empty body)
        const postAndNormalize = (body: any, resolvedClientId: number | null) => {
            const finalHeaders = headers ? headers.set('x-client-id', String(resolvedClientId)) : new HttpHeaders({ 'x-client-id': String(resolvedClientId) });
            if (body) {
                const h = finalHeaders.set('Content-Type', 'application/json');
                // send and normalize
                return this.http.post(url, body, { headers: h, observe: 'response' }).pipe(
                    map((resp: any) => resp.body && Object.keys(resp.body).length ? resp.body : { id: -1, orderId, paymentMethod: metodo, totalAmount: 0 })
                );
            }
            return this.http.post(url, null, { headers: finalHeaders, observe: 'response' }).pipe(
                map((resp: any) => resp.body && Object.keys(resp.body).length ? resp.body : { id: -1, orderId, paymentMethod: metodo, totalAmount: 0 })
            );
        };

        // Si ya tenemos clientId (token o selección) procesamos directamente.
        if (clientId != null && clientId > 0) {
            // Para TARJETA enviamos CardDto; para otros métodos no enviamos body.
            if (metodo === 'TARJETA') {
                if (!tarjetaData || !tarjetaData.numero || !tarjetaData.cvv || !tarjetaData.fecha) {
                    return throwError(() => new Error('Datos de tarjeta incompletos para método TARJETA'));
                }
                const cardDto = { numero: tarjetaData.numero, cvv: tarjetaData.cvv, fecha: tarjetaData.fecha };
                console.log('SaleService.processSale -> sending POST TARJETA', { url, headers: headers?.keys ? headers.keys().reduce((acc, k) => ({ ...acc, [k]: headers?.get(k) }), {}) : {}, body: cardDto });
                return postAndNormalize(cardDto, clientId);
            } else {
                console.log('SaleService.processSale -> sending POST (no body)', { url, headers: headers?.keys ? headers.keys().reduce((acc, k) => ({ ...acc, [k]: headers?.get(k) }), {}) : {}, body: null });
                return postAndNormalize(null, clientId);
            }
        }

        // Si no teníamos clientId, intentar obtenerlo del pedido y luego procesar
        return this.pedidoService.getOrderById(orderId).pipe(
            switchMap((orderAny: any) => {
                const orderClientId = orderAny?.clientId;
                if (!orderClientId || orderClientId <= 0) {
                    return throwError(() => new Error('No se encontró clientId en token, selección ni en el pedido'));
                }

                headers = headers ? headers.set('x-client-id', String(orderClientId)) : new HttpHeaders({ 'x-client-id': String(orderClientId) });

                if (metodo === 'TARJETA') {
                    if (!tarjetaData || !tarjetaData.numero || !tarjetaData.cvv || !tarjetaData.fecha) {
                        return throwError(() => new Error('Datos de tarjeta incompletos para método TARJETA'));
                    }
                    const cardDto = { numero: tarjetaData.numero, cvv: tarjetaData.cvv, fecha: tarjetaData.fecha };
                    headers = headers.set('Content-Type', 'application/json');
                    console.log('SaleService.processSale -> sending POST (from order) TARJETA', { url, headers: headers.keys().reduce((acc, k) => ({ ...acc, [k]: headers?.get(k) }), {}), body: cardDto });
                    return this.http.post(url, cardDto, { headers });
                } else {
                    console.log('SaleService.processSale -> sending POST (from order) no body', { url, headers: headers.keys().reduce((acc, k) => ({ ...acc, [k]: headers?.get(k) }), {}), body: null });
                    return this.http.post(url, null, { headers });
                }
            })
        );
    }
}
