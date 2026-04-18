# Cuentas Tomás - Frontend

Interfaz web para Cuentas Tomás, aplicación de gestión de obligaciones y gastos compartidos para co-crianza.

## Instalacion

1. Navega a la carpeta del frontend:
   ```bash
   cd cuentas-tomas-frontend
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Copia `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```

## Ejecucion Local

**Desarrollo (con hot reload):**
```bash
npm run dev
```

Se abre en http://localhost:5173

**Build para produccion:**
```bash
npm run build
```

**Preview del build:**
```bash
npm run preview
```

## Docker

Ejecuta el frontend y backend juntos:
```bash
cd ../cuentas-tomas-backend
docker compose up -d --build
```

Frontend disponible en http://localhost:3001

## Paginas

- `/login` - Login con contrasena
- `/` - Home/Dashboard (ruta protegida)
  - Resumen del mes para Tomás
  - Vencimientos proximos
  - Saldo pendiente
  - Acciones rapidas (registrar pago, nuevo gasto)
- `/obligaciones` - Listado de obligaciones de alimony y vestuario
- `/gastos` - Registro y aprobacion de gastos compartidos
- `/pagos` - Historial de pagos realizados
- `/reportes` - Descarga de PDF con rango de fechas
- `/auditoria` - Registro immutable de cambios

## Variables de Entorno

```
VITE_API_URL=http://localhost:8001  # Backend API URL
```

Para produccion: `https://tomas.fortuenti.co`

## Fases Implementadas

### Fase 5: Dashboard y Notificaciones
- HomePage con resumen del mes y vencimientos proximos
- Campana de notificaciones con contador de no leidas
- Notificaciones en tiempo real (polling cada 30 segundos)
- Interfaz de usuario completamente en español

### Fase 6: Exportacion y Auditoria
- Descarga de PDF para cualquier rango de fechas
- Incluye obligaciones, pagos, gastos, aprobaciones
- PDF firmado con SHA256 para verificacion de autenticidad
- Registro de auditoria con filtros por fecha, usuario, accion

### Fase 7: Pulido
- ErrorBoundary para manejo de errores
- Diseño responsive (movil 375px, tablet 768px, desktop 1280px)
- PWA manifest para instalacion como aplicacion
- Contraste accesible y navegacion por teclado
- Etiquetas ARIA para lectores de pantalla

## Credenciales para Prueba

- **Ricardo**: contrasena en .env del backend
- **Catherine**: contrasena en .env del backend

## Troubleshooting

### Notificaciones no se actualizan
- Verifica que el backend corre en `http://localhost:8001`
- Revisa la consola del navegador para errores CORS
- Asegurate que `VITE_API_URL` apunta al backend correcto

### PDF no descarga
- El backend debe tener `reportlab` instalado
- El rango de fechas debe ser valido (inicio < fin)
- Revisa logs del servidor para errores

### Errores de autenticacion
- Limpia localStorage: `localStorage.clear()`
- Re-inicia sesion
- Verifica que el JWT es valido
