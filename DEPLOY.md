# Guía rápida de actualización (backend y frontend)

## Backend (api-gestion-orca)
- Ruta en servidor: `/home/orcagest/api-gestion-orca`
- Servicio systemd: `api-gestion-orca.service`

Pasos de actualización:
1. `cd /home/orcagest/api-gestion-orca`
2. `git pull origin main`
3. `pip install -r requirements.txt`
4. `systemctl restart api-gestion-orca.service`
5. Verificar: `systemctl status api-gestion-orca.service` y `curl -i http://127.0.0.1:5000/api/status/`
6. Logs si hay problemas: `journalctl -u api-gestion-orca.service -n 100 --no-pager` o `tail -n 100 flask.log`

## Frontend (orcagestion-frontend)
- Ruta en servidor: `/var/www/html/orcagestion-frontend`
- Servido por Apache en el puerto 3000 (`DocumentRoot /var/www/html/orcagestion-frontend/build`)
- Proxy Apache hacia el backend (ajustado en `miapp.conf`): `/api` -> `http://127.0.0.1:5000/api/`

Pasos de actualización:
1. `cd /var/www/html/orcagestion-frontend`
2. `git pull origin main`
3. `npm install`
4. `npm run build`
5. `systemctl reload apache2`
6. Verificar API desde Apache: `curl -i http://localhost:3000/api/status/`
7. Verificar app: `http://<IP-publica-o-interna>:24306/?t=$(date +%s)` (parámetro para evitar caché)

Notas:
- El frontend debe usar `BASE_URL` relativa (`/api`); Apache se encarga del proxy al backend.
- Si cambian env vars, colócalas antes de construir (`.env` con `REACT_APP_*` en el root del frontend).
- Para Docker local: `docker compose up --build -d` (mapea 3000:80). En producción actual se sirve con Apache, no contenedor.
