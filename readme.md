# Registro de Vacaciones y Permisos 2026 (Prototipo)

App estática (HTML/CSS/JS) lista para Netlify.  
No usa base de datos: persiste datos en `localStorage` del navegador.

## Funcionalidades
- Calendario mensual 2026 con días resaltados.
- Crear registros: Nombre, Fecha inicio, Fecha fin, Motivo, Nota.
- Resumen del mes: personas únicas, registros, días aproximados y desglose por motivo.
- Lista de registros del mes con eliminar.
- Exportar / Importar JSON (para respaldar o compartir).

## Correr local
Abre `index.html` en tu navegador, o usa un servidor simple:
- VS Code: Live Server
- Node: `npx serve`

## Deploy en Netlify
- Conecta el repo en Netlify
- Build command: (vacío)
- Publish directory: `/` (raíz)

> Nota: localStorage es por navegador/PC. Para multiusuario real, luego se puede conectar a Google Sheets, Airtable o un backend.
