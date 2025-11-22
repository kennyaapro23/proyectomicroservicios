import { Component, OnInit } from '@angular/core';
import { Cliente } from '../../../core/models/cliente.model';
import { ClienteService } from '../../../core/services/cliente.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-list',
  imports: [CommonModule, RouterModule],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {
  clients: Cliente[] = [];
  paginatedClients: Cliente[] = [];

  currentPage: number = 1;
  itemsPerPage: number = 6;
  totalPages: number = 0;

  isLoading = false;
  errorMessage: string | null = null;

  constructor(private clienteService: ClienteService) {}

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.clienteService.getClientes().subscribe({
      next: (data) => {
        this.clients = data;
        this.totalPages = Math.ceil(this.clients.length / this.itemsPerPage);
        this.updatePaginatedClients();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar clientes:', err);
        this.errorMessage = '⚠️ Error al cargar clientes';
        this.isLoading = false;
      }
    });
  }

  updatePaginatedClients(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedClients = this.clients.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.updatePaginatedClients();
  }

  deleteCliente(id: number): void {
    if (confirm('¿Seguro que deseas eliminar este cliente?')) {
      this.errorMessage = null;

      this.clienteService.deleteCliente(id).subscribe({
        next: () => {
          alert('✅ Cliente eliminado correctamente');
          this.loadClients(); // Recarga lista
        },
        error: (err) => {
          console.error('Error al eliminar cliente:', err);
          this.errorMessage = '⚠️ Error al eliminar cliente';
        }
      });
    }
  }
}
