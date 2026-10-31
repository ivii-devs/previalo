# Política de Seguridad de Previalo

## Versiones Soportadas

| Versión | Soportada          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Arquitectura y Modelo de Amenazas

Previalo es una aplicación web progresiva (PWA) de arquitectura **100% frontend-only, offline-first y sin backend**:
- **Cero datos en servidor:** La aplicación no transmite nombres, partidas, contraseñas ni datos personales a ningún servidor externo.
- **Almacenamiento local aislado:** Toda la persistencia reside en el `localStorage` e `IndexedDB` del navegador del usuario.
- **Sin dependencias remotas en tiempo de ejecución:** Todo el audio se sintetiza procedimentalmente con la Web Audio API y los catálogos se sirven estáticamente precacheados.

## Reporte de Vulnerabilidades

Si detectas cualquier fallo de seguridad, configuración indebida de Content Security Policy (CSP), desbordamiento de memoria o vulnerabilidad en las dependencias:

1. Por favor, **no abras una incidencia pública (issue)** con detalles explotables.
2. Comunica el reporte de forma confidencial a través de la sección de seguridad de GitHub o mediante un aviso privado a los mantenedores del repositorio.
3. Incluye una descripción clara del problema, pasos de reproducción y el impacto potencial.

Nos comprometemos a acusar recibo en un plazo inferior a 48 horas y publicar la corrección en la siguiente versión menor.
