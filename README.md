# Registro de Vacaciones y Permisos 2026 (Netlify Blobs)

Aplicación estática (HTML/CSS/JS) + Netlify Functions que guarda los datos en **Netlify Blobs**.
- ✅ No hay base de datos propia.
- ✅ Los datos son **compartidos** por todos los usuarios del sitio.
- ✅ Deploy directo en Netlify desde GitHub.

## Estructura
- `index.html`, `styles.css`, `app.js`: frontend
- `netlify/functions/*`: API serverless (list/save/clear)
- `package.json`: incluye `@netlify/blobs`

## Deploy en Netlify (GitHub)
1. Sube este proyecto a un repo en GitHub.
2. En Netlify: **Add new site → Import an existing project**
3. Selecciona el repo.
4. No necesitas build command.
5. Deploy.

Netlify detectará `netlify.toml` y configurará:
- Publish directory: `.`
- Functions: `netlify/functions`

## Desarrollo local (opcional)
Recomendado con Netlify CLI:
```bash
npm i
npm i -g netlify-cli
netlify dev
```
Luego abre la URL que te muestre (normalmente `http://localhost:8888`).

## Notas
- La app hace guardados “full overwrite” (manda la lista completa de registros).
- Incluye control de conflicto básico por `revision` (si dos guardan a la vez, uno recibe 409 y se recarga).
- Puedes exportar/importar JSON desde el UI.
