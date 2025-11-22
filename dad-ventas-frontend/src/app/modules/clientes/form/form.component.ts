import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ClienteService } from '../../../core/services/cliente.service';
import { Cliente } from '../../../core/models/cliente.model';

@Component({
  standalone: true,
  selector: 'app-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss'],
  imports: [CommonModule, RouterModule, ReactiveFormsModule]
})
export class FormComponent implements OnInit {
  clienteForm!: FormGroup;
  isEdit = false;
  errorMessage: string | null = null;
  clienteId: number | null = null;

  constructor(
      private fb: FormBuilder,
      private clienteService: ClienteService,
      private route: ActivatedRoute,
      private router: Router
  ) {}

  ngOnInit(): void {
    this.initForm();

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEdit = true;
        this.clienteId = +id;
        this.loadCliente(this.clienteId);
      }
    });
  }

  initForm(): void {
    this.clienteForm = this.fb.group({
      name: ['', Validators.required],
      document: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['']
    });
  }

  loadCliente(id: number): void {
    this.clienteService.getClienteById(id).subscribe({
      next: (cliente) => this.clienteForm.patchValue(cliente),
      error: (err) => {
        console.error('❌ Error al cargar cliente:', err);
        this.errorMessage = '⚠️ No se pudo cargar el cliente';
      }
    });
  }

  onSubmit(): void {
    if (this.clienteForm.invalid) return;

    const cliente: Cliente = this.clienteForm.value;

    if (this.isEdit && this.clienteId !== null) {
      cliente.id = this.clienteId;
      this.clienteService.updateCliente(cliente).subscribe({
        next: () => {
          alert('✅ Cliente actualizado');
          this.router.navigate(['/clientes']);
        },
        error: (err) => {
          console.error('❌', err);
          this.errorMessage = '⚠️ Error al actualizar cliente';
        }
      });
    } else {
      this.clienteService.createCliente(cliente).subscribe({
        next: () => {
          alert('✅ Cliente creado');
          this.router.navigate(['/clientes']);
        },
        error: (err) => {
          console.error('❌', err);
          this.errorMessage = '⚠️ Error al crear cliente';
        }
      });
    }
  }
}
