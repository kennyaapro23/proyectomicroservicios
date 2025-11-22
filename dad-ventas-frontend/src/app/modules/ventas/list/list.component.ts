import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Sale } from '../../../core/models/sale.model';
import { SaleService } from '../../../core/services/sale.service';
import { AuthService } from "../../../core/services/auth.service";

@Component({
  selector: 'app-mis-compras',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {

  ventas: Sale[] = [];  // Variable para almacenar las ventas del cliente o admin
  originalVentas: Sale[] = []; // copia sin filtrar
  isLoading = false;
  errorMessage: string | null = null;
  // filtros por fecha (ISO yyyy-MM-dd desde inputs)
  dateFrom: string | null = null;
  dateTo: string | null = null;

  constructor(
      private saleService: SaleService,
      public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.listarVentas();  // Método para listar las ventas (del cliente o del admin)
  }

  listarVentas(): void {
    this.isLoading = true;
    this.errorMessage = null;

    // Verifica si el usuario es admin
    if (this.authService.isAdmin()) {
      // Si es administrador, obtener todas las ventas
      this.saleService.getSales().subscribe({
        next: (data) => {
          this.originalVentas = data || [];
          this.applyFilterAndSort();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('❌ Error al listar todas las ventas:', err);
          this.errorMessage = 'Error al cargar las ventas.';
          this.isLoading = false;
        }
      });
    } else {
      // Si es cliente, obtener solo sus compras
      const clientId = this.authService.getClientId();

      if (clientId) {
            this.saleService.getMyPurchases().subscribe({
          next: (data) => {
            this.originalVentas = data || [];
            this.applyFilterAndSort();
            this.isLoading = false;
          },
          error: (err) => {
            console.error('❌ Error al listar compras del cliente:', err);
            this.errorMessage = 'Error al cargar tus compras.';
            this.isLoading = false;
          }
        });
      } else {
        this.errorMessage = 'No se pudo obtener el clientId del token.';
        this.isLoading = false;
      }
    }
  }

  applyFilterAndSort(): void {
    // Aplicar filtro por fecha y ordenar descendente por saleDate (o id si no hay fecha)
    const from = this.dateFrom ? new Date(this.dateFrom) : null;
    const to = this.dateTo ? new Date(this.dateTo) : null;

    this.ventas = (this.originalVentas || []).filter(v => {
      if (!v) return false;
      if (from || to) {
        const sd = v.saleDate ? new Date(v.saleDate) : null;
        if (!sd) return false;
        if (from && sd < from) return false;
        if (to) {
          // If the user provided only a date (yyyy-MM-dd) we include the whole day until 23:59:59.999.
          // If a datetime-local was provided (contains 'T'), respect the time the user selected.
          const toStr = this.dateTo || '';
          if (!toStr.includes('T')) {
            const toDayEnd = new Date(to);
            toDayEnd.setHours(23,59,59,999);
            if (sd > toDayEnd) return false;
          } else {
            if (sd > to) return false;
          }
        }
      }
      return true;
    }).sort((a,b) => {
      // Si una venta no tiene saleDate la colocamos al final.
      const ad = a.saleDate ? new Date(a.saleDate).getTime() : Number.NEGATIVE_INFINITY;
      const bd = b.saleDate ? new Date(b.saleDate).getTime() : Number.NEGATIVE_INFINITY;
      if (ad !== bd) return bd - ad; // descendente por fecha (más recientes primero)
      // Si las fechas son iguales o ambos faltan, ordenar por id descendente
      return (b.id ?? 0) - (a.id ?? 0);
    });
  }

  filterVentas(): void {
    this.applyFilterAndSort();
  }

  resetFilters(): void {
    this.dateFrom = null;
    this.dateTo = null;
    this.applyFilterAndSort();
  }

  applyPreset(preset: 'week' | '15' | '30' | 'all'): void {
    if (preset === 'all') {
      this.dateFrom = null;
      this.dateTo = null;
      this.applyFilterAndSort();
      return;
    }

    const now = new Date();
    let days = 7;
    if (preset === '15') days = 15;
    if (preset === '30') days = 30;

    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // format to yyyy-MM-ddTHH:mm for datetime-local
    this.dateFrom = this.formatDateTimeLocal(from);
    this.dateTo = this.formatDateTimeLocal(now);
    this.applyFilterAndSort();
  }

  private formatDateTimeLocal(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }
}
