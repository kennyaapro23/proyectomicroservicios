import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { OrderService } from '../../../core/services/pedido.service';
import { AuthService } from '../../../core/services/auth.service';
import { SaleService } from '../../../core/services/sale.service';
import { Sale } from '../../../core/models/sale.model';
import { OrderResponse } from '../../../core/models/order.model';
import jsPDF from 'jspdf';
import {FormsModule} from "@angular/forms";

@Component({
  standalone: true,
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
  imports: [CommonModule, DatePipe, FormsModule]
})
export class ListComponent implements OnInit {

  pedidos: OrderResponse[] = [];
  errorMessage: string | null = null;

  comprobanteVenta: Sale | null = null;

  mostrarModal: boolean = false;              // Modal de Comprobante
  mostrarModalPago: boolean = false;          // Modal Método de Pago

  pedidoSeleccionado: number | null = null;
  metodoSeleccionado: string | null = null;
  metodosPago: string[] = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'];

  tarjeta = {
    numero: '',
    fecha: '',
    cvv: ''
  };

  constructor(
      private pedidoService: OrderService,
      private authService: AuthService,
      private saleService: SaleService
  ) {}

  ngOnInit(): void {
    this.cargarPedidos();
  }

  private cargarPedidos(): void {
    const callback = {
      next: (data: OrderResponse[]) => {
        console.log('✅ Respuesta pedidos:', data); // Verifica en consola si viene bien el clientDto

        // Ordenar pedidos de forma descendente (último pedido primero)
        const ordered = data.slice().sort((a, b) => {
          const aid = a.id ?? 0;
          const bid = b.id ?? 0;
          return bid - aid; // descendente
        });

        // Mantener clientDto tal como viene; si viene null lo dejaremos así y
        // rellenaremos en una segunda pasada consultando /Client/{id} cuando
        // exista clientId pero falte clientDto.
        this.pedidos = ordered.map(pedido => ({
          ...pedido,
          clientDto: pedido.clientDto ?? null
        }));

        // Para cada pedido sin clientDto pero con clientId, pedir el cliente
        this.pedidos.forEach((pedido, index) => {
          if ((!pedido.clientDto || !pedido.clientDto.name) && pedido.clientId) {
            this.pedidoService.getClientById(pedido.clientId).subscribe({
              next: (client) => {
                // Asegurarnos de que el pedido sigue existiendo en la lista
                if (this.pedidos[index]) {
                  this.pedidos[index].clientDto = {
                    id: client.id ?? pedido.clientId,
                    name: client.name ?? 'Cliente',
                    email: client.email ?? '',
                    document: client.document ?? ''
                  };
                }
              },
              error: (err: any) => {
                console.warn('No se pudo obtener clientDto para pedido', pedido.id, err);
              }
            });
          }
        });

        if (data.length === 0) {
          this.errorMessage = this.esAdmin
              ? '❌ No hay pedidos registrados.'
              : '❌ No hay pedidos disponibles.';
        }
      },

    };

    this.esAdmin
        ? this.pedidoService.getAllOrders().subscribe(callback)
        : this.pedidoService.getMyOrders().subscribe(callback);
  }



  abrirModalPago(pedidoId: number): void {
    const pedido = this.pedidos.find(p => p.id === pedidoId);
    if (pedido && pedido.status === 'PAGADO') {
      alert('Este pedido ya está pagado y no puede procesarse de nuevo.');
      return;
    }

    this.mostrarModalPago = true;
    this.pedidoSeleccionado = pedidoId;
    this.metodoSeleccionado = null;
    this.tarjeta = { numero: '', fecha: '', cvv: '' }; // Limpiar campos de tarjeta
  }

  cerrarModalPago(): void {
    this.mostrarModalPago = false;
    this.pedidoSeleccionado = null;
    this.metodoSeleccionado = null;
    this.tarjeta = { numero: '', fecha: '', cvv: '' };
  }

  datosTarjetaValidos(): boolean {
    return this.tarjeta.numero.length >= 12 && this.tarjeta.fecha.trim() !== '' && this.tarjeta.cvv.length >= 3;
  }

  confirmarMetodoPago(): void {
    if (!this.metodoSeleccionado || this.pedidoSeleccionado == null) {
      alert('⚠️ Debes seleccionar un método de pago.');
      return;
    }

    const tarjetaData = this.metodoSeleccionado === 'TARJETA' ? this.tarjeta : {};

    this.saleService.processSale(this.pedidoSeleccionado, this.metodoSeleccionado, tarjetaData).subscribe({
      next: (venta) => {
        this.comprobanteVenta = venta;
        this.mostrarModalPago = false;   // Cierra modal de pago
        this.mostrarModal = true;        // Abre modal de comprobante
        alert('✅ Venta procesada correctamente.');
      },
      error: (err: any) => {
        console.error('❌ Error al procesar venta:', err);
        alert('❌ No se pudo procesar la venta.');
      }
    });
  }


  cerrarModal(): void {
    this.mostrarModal = false;
    this.comprobanteVenta = null;
  }

  generarPDF(): void {
    if (!this.comprobanteVenta) return;

    const venta = this.comprobanteVenta;
    const doc = new jsPDF();

    // 🧾 Título Principal
    doc.setFontSize(20);
    doc.text('🧾 Comprobante de Venta', 20, 20);

    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);

    // 📄 Datos de la Venta
    const startY = 40;
    const lineSpacing = 10;

    doc.text(`ID Venta: ${venta.id}`, 20, startY);
    doc.text(`ID Pedido: ${venta.orderId}`, 20, startY + lineSpacing);
    doc.text(`Método de Pago: ${venta.paymentMethod}`, 20, startY + lineSpacing * 2);
    doc.text(`Total: $${venta.totalAmount.toFixed(2)}`, 20, startY + lineSpacing * 3);

    // 🕒 Fecha de Venta si existe
    if (venta.saleDate) {
      const fecha = new Date(venta.saleDate).toLocaleString();
      doc.text(`Fecha: ${fecha}`, 20, startY + lineSpacing * 4);
    }

    // ✔️ Guardar
    doc.save(`comprobante_${venta.id}.pdf`);
  }


  eliminarPedido(pedidoId: number): void {
    if (!confirm('⚠️ ¿Estás seguro de eliminar este pedido?')) return;

    this.pedidoService.deleteOrder(pedidoId).subscribe({
      next: () => {
        alert('✅ Pedido eliminado con éxito.');
        this.cargarPedidos();
      },
      error: (err: any) => {
        console.error('❌ Error al eliminar pedido:', err);
        alert('❌ No se pudo eliminar el pedido.');
      }
    });
  }

  get esAdmin(): boolean {
    return this.authService.isAdmin();
  }
}
