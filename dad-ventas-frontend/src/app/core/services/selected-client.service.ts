import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SelectedClientService {
  private selectedClientId: number | null = null;

  setSelectedClientId(id: number | null): void {
    this.selectedClientId = id;
  }

  getSelectedClientId(): number | null {
    return this.selectedClientId;
  }
}
