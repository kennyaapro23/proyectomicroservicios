import {Component, OnInit} from '@angular/core';

import {RouterLink, RouterModule} from "@angular/router";
import {Category} from "../../../core/models/category.model";
import {CategoryService} from "../../../core/services/category.service";
import {CommonModule} from "@angular/common";

@Component({
  standalone: true,
  selector: 'app-list',
  imports: [
    RouterLink, CommonModule, RouterModule
  ],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {

  categories: Category[] = [];
  isLoading = false;
  errorMessage: string | null = null;

  constructor(private categoryService: CategoryService) {}

  ngOnInit(): void {
    this.loadCategories(); //
  }

  loadCategories(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        this.categories = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading categories:', err);
        this.errorMessage = 'Error cargando categorías';
        this.isLoading = false;
      }
    });
  }

  deleteCategory(id: number): void {
    if (confirm('¿Seguro que deseas eliminar esta categoría?')) {
      this.categoryService.deleteCategory(id).subscribe({
        next: () => {
          alert('Categoría eliminada correctamente');
          this.loadCategories();
        },
        error: (err) => {
          console.error('Error deleting category:', err);
          this.errorMessage = 'Error eliminando categoría';
        }
      });
    }
  }
}
