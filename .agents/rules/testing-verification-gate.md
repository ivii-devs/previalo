---
description: Protocolo de verificación estricto, gates de CI/CD y suites de pruebas automatizadas
globs: ["src/**/*.test.{ts,tsx}", "tests/**/*", "package.json", "vitest.config.ts"]
scope: "testing | verification | gates"
---

# Puerta de Verificación y Testing

## 1. Principio Fundamental
- La verificación es un GATE de calidad ineludible, NUNCA una promesa.
- PROHIBIDO afirmar que una prueba o chequeo pasó sin haber ejecutado la orden correspondiente en el entorno.
- Si algún comando no puede ser ejecutado, declarar explícitamente qué comprobación fue omitida y el motivo técnico.

## 2. Puerta de Aceptación Obligatoria (Gate Completo)
Antes de dar por finalizada cualquier modificación del código base, DEBEN ejecutarse y aprobarse en orden:
1. `npm run typecheck` -> Verificación TypeScript en modo estricto (`tsc -b --noEmit`); 0 errores.
2. `npm test` -> Ejecución de la suite completa de Vitest (tests unitarios, de integración, E2E y adversariales); 100% pasando.
3. `npm run build` -> Compilación para producción (`tsc -b && vite build`) y validación de generación del Service Worker.

## 3. Comandos de Verificación Segmentada
Para iteración rápida durante el desarrollo de una funcionalidad:
- Motores de Dominio: `npx vitest run src/domain/engines/__tests__`
- Stores de Estado: `npx vitest run src/application/__tests__`
- Servicios e Infraestructura: `npx vitest run src/infrastructure/__tests__`
- Componentes y Vistas UI: `npx vitest run src/presentation/__tests__`
- Pruebas E2E (Tiers 1 a 4): `npm run test:e2e`
- Pruebas Adversariales (Tier 5): `npx vitest run tests/adversarial`

## 4. Invariantes de Autoría de Pruebas
- Toda regla de negocio o cálculo nuevo añadido a un motor DEBE incluir sus pruebas unitarias en `src/domain/engines/__tests__/`.
- Los tests de `src/domain/` DEBEN ser puramente matemáticos y algorítmicos (sin dependencias de DOM, JSDOM o mocks de navegador).
- Toda corrección de bug exige la creación previa o simultánea del test de regresión que evidencie el fallo.
