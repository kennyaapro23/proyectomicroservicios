import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Product } from '../../../core/models/producto.model';
import { ProductService } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {

  @Input() clienteMode: boolean = false;
  @Output() onAddToCart = new EventEmitter<{ id: number; name: string; price: number }>();

  products: Product[] = [];
  paginatedProducts: Product[] = [];
  filteredProducts: Product[] = [];
  searchTerm: string = '';

  currentPage: number = 1;
  itemsPerPage: number = 6;
  totalPages: number = 0;

  isLoading = false;
  errorMessage: string | null = null;

  constructor(
      private productService: ProductService,
      private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.productService.getProducts().subscribe({
      next: (data) => {
        // Orden descendente por id
        this.products = (data || []).slice().sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
        this.onSearchChange();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Error al cargar productos:', err);
        this.errorMessage = 'Error al cargar productos';
        this.isLoading = false;
      }
    });
  }

  updatePaginatedProducts(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;

    this.filteredProducts = this.products.filter(product => {
      const nameMatch = product.name.toLowerCase().includes(this.searchTerm.toLowerCase());
      const categoryMatch = product.category?.name?.toLowerCase().includes(this.searchTerm.toLowerCase());
      return nameMatch || categoryMatch;
    });

    this.totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);
    this.paginatedProducts = this.filteredProducts.slice(start, end);
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.updatePaginatedProducts();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePaginatedProducts();
  }

  addProductToCart(product: Product): void {
    this.cartService.addItem({
      id: product.id!,
      name: product.name,
      price: product.price
    });
    alert('✅ Producto agregado al carrito');
  }

  deleteProduct(id: number): void {
    if (confirm('⚠️ ¿Estás seguro de eliminar este producto?')) {
      this.productService.deleteProduct(id).subscribe({
        next: () => {
          alert('✅ Producto eliminado correctamente');
          this.loadProducts();
        },
        error: (err) => {
          console.error('❌ Error al eliminar producto:', err);
          this.errorMessage = 'Error al eliminar el producto';
        }
      });
    }
  }

  getImagenCompleta(ruta: string | undefined): string {
    return ruta || 'https://via.placeholder.com/300x200?text=Sin+Imagen';
  }
}
