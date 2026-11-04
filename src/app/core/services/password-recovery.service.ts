import { Injectable } from '@angular/core';

/**
 * Solicitud de recuperación de contraseña (HU-03).
 *
 * Implementación DEMO: no envía datos a ningún servidor; solo simula la
 * latencia de red. TT-17 la reemplazará por la llamada HTTPS al endpoint de
 * Spring Boot manteniendo esta misma firma, por lo que la pantalla no cambia.
 */
@Injectable({ providedIn: 'root' })
export class PasswordRecoveryService {
  private static readonly DEMO_DELAY_MS = 600;

  requestReset(email: string): Promise<void> {
    void email;
    return new Promise((resolve) => setTimeout(resolve, PasswordRecoveryService.DEMO_DELAY_MS));
  }
}
