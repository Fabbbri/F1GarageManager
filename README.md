# F1GarageManager 🏎️

F1GarageManager es una aplicación web para la **gestión de equipos de Fórmula 1**, que permite administrar escuderías, presupuestos, patrocinadores, inventario, carros y conductores.  
El proyecto está dividido en **frontend (React)** y **backend (Node.js)**, comunicándose mediante una **API REST**.

---

## Participantes:
1. Fabricio González Cerdas
2. Jian Zheng Wu
3. Jose Pablo Guerrero Duarte
4. Yerik Chaves Serrano

---

## 🛠️ Requisitos previos

Antes de ejecutar el proyecto, asegurarse de tener instalado:

- **Node.js** (v24.12.0)
- **npm**

---

## 📚 Dependencias

1. En carpeta backend
- npm init -y
- npm i express cors dotenv jsonwebtoken bcryptjs
- npm i -D nodemon

---

2. En carpeta frontend
- npm install
- npm i @mui/material @emotion/react @emotion/styled
- npm i @mui/icons-material

## ▶️ Correrlo
1. En carpeta backend: npm run dev

2. En carpeta frontend: npm start

---

## ✅ Simulación rápida (para probar que todo sirve)

Objetivo: verificar que el flujo sigue igual con la BD normalizada (`PART` + `STORE`) y que funcionan compras → inventario → instalación.

### A) Levantar backend + frontend
1. Backend (carpeta `backend`):
	- `npm install`
	- `npm run dev` (ojo: es `dev`, no `deve`)
2. Verificar BD desde el backend:
	- Abrí `http://localhost:4000/health/db` y confirmá que responde `ok: true`.
3. Frontend (carpeta `frontend`):
	- `npm install`
	- `npm start`

### B) Probar en la página (flujo completo)
1. Signup/Login.
2. Crear un Team (Teams → Create / Add):
	- Confirmá que se ve el presupuesto y que el team abre su detalle.
3. Ir a Store:
	- Deben aparecer partes con `Price` y `Stock`.
4. Comprar una parte (por ejemplo Qty=1):
	- Debe bajar el stock en Store.
	- Debe aumentar el inventario del Team (misma parte, Qty sube).
	- Debe aumentar “BudgetSpent” (o bajar el presupuesto disponible).
5. Instalar la parte en un Car:
	- La parte debe aparecer en “Installed parts”.
	- El inventario debe reflejar el cambio (según la lógica de la app).

### C) Verificación directa en SQL (opcional, en SSMS)
Corré estas consultas para confirmar que los datos quedaron consistentes:
```sql
SELECT TOP (20) Id, Name, Category, P, A, M, BasePrice, CreatedAt, UpdatedAt
FROM dbo.PART
ORDER BY CreatedAt DESC;

SELECT TOP (20) Id, PartId, Price, Stock, CreatedAt, UpdatedAt
FROM dbo.STORE
ORDER BY CreatedAt DESC;

SELECT TOP (20) Id, TeamId, PartId, Qty, UnitCost, CreatedAt, AcquiredAt
FROM dbo.TEAM_INVENTORY_ITEM
ORDER BY CreatedAt DESC;

SELECT TOP (20) Id, TeamId, StoreId, PartId, Qty, UnitCost, TotalCost, PurchasedAt
FROM dbo.TEAM_STORE_PURCHASE
ORDER BY PurchasedAt DESC;
```

Si algo falla en la UI, lo más útil es pegar el error del backend (consola donde corre `npm run dev`) y el endpoint que estabas usando.

---

## 🗄️ SQL Server (guardar usuarios en BD)

> Esto es **solo** para persistir usuarios (email + passwordHash) desde el login/signup.

### 1) Pasos en SSMS
1. Abrí **SQL Server Management Studio** y conectate a tu instancia (ej: `localhost\SQLEXPRESS`).
2. (Si no existe) Crear base de datos:
	- Click derecho en **Databases** → **New Database...** → nombre: `F1GarageManager` → OK.

Opcional (script):
```sql
IF DB_ID(N'F1GarageManager') IS NULL
  CREATE DATABASE F1GarageManager;
GO
```

3. (Recomendado) Crear el login/usuario de la app (`f1app`) y permisos mínimos:
```sql
USE master;
GO
CREATE LOGIN f1app WITH PASSWORD = 'UnaPasswordFuerte_123!';
GO

USE F1GarageManager;
GO
CREATE USER f1app FOR LOGIN f1app;
GO

EXEC sp_addrolemember 'db_datareader', 'f1app';
EXEC sp_addrolemember 'db_datawriter', 'f1app';
GO

-- Permite ejecutar todos los SPs dentro del esquema dbo
GRANT EXECUTE ON SCHEMA::dbo TO f1app;
GO
```

4. Ejecutar el script de usuarios:
	- Abrí el archivo `database/schema/001_users.sql` en SSMS.
	- Seleccioná la BD `F1GarageManager` en el desplegable (arriba) o ejecutá: `USE F1GarageManager;`.
	- Ejecutá (F5). Esto crea la tabla `dbo.[USER]` y stored procedures.

5. Ejecutar el script de sponsors:
	- Abrí el archivo `database/schema/002_sponsors_catalog.sql`.
	- Seleccioná la BD `F1GarageManager`.
	- Ejecutá (F5). Esto crea `dbo.SPONSOR` y SPs `dbo.Sponsor_*`.

6. Ejecutar el script de equipos (relacional, sin JSON):
	- Abrí el archivo `database/schema/003_teams_relational_nogo.sql` en SSMS.
	- Seleccioná la BD `F1GarageManager`.
	- Ejecutá (F5). Esto crea/ajusta tablas `dbo.TEAM` + tablas hijas y stored procedures `dbo.Team_*`.

7. Ejecutar el script de catálogo de tienda (Parts):
	- Abrí el archivo `database/schema/004_parts_catalog.sql`.
	- Seleccioná la BD `F1GarageManager`.
	- Ejecutá (F5). Esto crea/ajusta `dbo.PART` (catálogo) + `dbo.STORE` (listing) y los stored procedures `dbo.Part_*`.

8. Ejecutar el script de compra transaccional (auditoría + atomicidad):
	- Abrí el archivo `database/schema/005_store_purchase_transaction.sql`.
	- Seleccioná la BD `F1GarageManager`.
	- Ejecutá (F5). Esto crea/ajusta `dbo.TEAM_STORE_PURCHASE` y el SP `dbo.Store_PurchasePart`.

9. (Opcional) Si vas a usar autenticación por **sesiones con cookies** (store persistente):
	- Abrí el archivo `database/schema/010_session_store.sql`.
	- Seleccioná la BD `F1GarageManager`.
	- Ejecutá (F5). Esto crea la tabla `dbo.[SESSION]` para persistir sesiones.

> Nota: usamos la versión **nogo** porque evita `GO` y `THROW`, que en algunos entornos/ejecutores causan errores de sintaxis.

> Importante: los scripts de `database/schema/*.sql` deben correrse con un usuario **admin/db_owner**.
> El usuario `f1app` es para que la app ejecute stored procedures (EXECUTE), no para crear/alterar tablas, índices, FKs o SPs.

### 2) Habilitar conexión TCP (para que Node conecte)
> SSMS a veces conecta por **Shared Memory**, pero el backend necesita **TCP/IP**.

1. Abrí **SQL Server Configuration Manager**.
2. **SQL Server Network Configuration** → **Protocols for SQLEXPRESS**.
3. Habilitá **TCP/IP** (Enable).
4. (Recomendado) Fijá el puerto:
	- TCP/IP → **Properties** → pestaña **IP Addresses** → sección **IPAll**
	- `TCP Dynamic Ports`: (vacío)
	- `TCP Port`: `1433`
5. Reiniciá el servicio: **SQL Server Services** → **SQL Server (SQLEXPRESS)** → Restart.

### 3) Configurar el backend para usar SQL Server
1. En `backend`, instalá el driver:
	- `npm install`
	- `npm install mssql`

2. Creá/actualizá el archivo `backend/.env` con estos valores (ajustá usuario/clave):
	- `USER_REPOSITORY=sqlserver`
	- `TEAM_REPOSITORY=sqlserver` (para persistir equipos en BD)
	- `PART_REPOSITORY=sqlserver` (catálogo de tienda en BD; si no se define, toma el valor de `TEAM_REPOSITORY`)
	- `DB_SERVER=localhost`
	- `DB_PORT=1433`
	- `DB_DATABASE=F1GarageManager`
	- `DB_USER=f1app`
	- `DB_PASSWORD=TU_PASSWORD`
	- `DB_ENCRYPT=false`
	- `DB_TRUST_SERVER_CERTIFICATE=true`

3. Corré el backend:
	- `npm run dev`

### 4) Verificar conexión a la BD
Abrí en el navegador:
- `http://localhost:4000/health/db`

Debe responder algo como:
```json
{ "ok": true, "db": { "enabled": true, "serverName": "...", "databaseName": "F1GarageManager" } }
```

### 5) Probar registro y ver datos en la tabla
1. Registrate desde el frontend (pantalla **Signup**) o por API: `POST /api/auth/signup`.
2. En SSMS:
	- Object Explorer → `F1GarageManager` → **Tables** → `dbo.[USER]`
	- Click derecho → **Select Top 1000 Rows**

> Tip: si SSMS muestra errores de IntelliSense pero el `SELECT` funciona, usá: **Edit → IntelliSense → Refresh Local Cache**.

> Nota: Este backend usa **SQL Login** (usuario/contraseña). Si estás usando solo Windows Authentication, hay que habilitar **Mixed Mode**.

---

## 👥 Guía para compañeros (clonar y configurar su propia BD)

Cada persona debe configurar **su propia** instancia de SQL Server y su propio `backend/.env`.
La contraseña del login **no es global**: depende del SQL Server local de cada quien.

### A) Crear BD y objetos
1. En SSMS, conectarse a su instancia (ej: `localhost\SQLEXPRESS`).
	 - Recomendado: conectarse con un usuario con permisos de **admin / sysadmin / db_owner**.
	 - El usuario `f1app` es para que la app ejecute stored procedures, no para crear/alterar tablas o SPs.
2. Crear la base (si no existe):
```sql
IF DB_ID(N'F1GarageManager') IS NULL
  CREATE DATABASE F1GarageManager;
GO
```
3. Ejecutar los scripts:
	- Abrir `database/schema/001_users.sql` y ejecutar (F5)
	- Abrir `database/schema/002_sponsors_catalog.sql` y ejecutar (F5)
	- Abrir `database/schema/003_teams_relational_nogo.sql` y ejecutar (F5)
	- Abrir `database/schema/004_parts_catalog.sql` y ejecutar (F5)
	- Abrir `database/schema/005_store_purchase_transaction.sql` y ejecutar (F5)
	- (Opcional, si usás autenticación por sesiones con cookies y `SESSION_STORE=sqlserver`) abrir `database/schema/010_session_store.sql` y ejecutar (F5)

> Si corrés los scripts con `f1app` y te salen errores de `CREATE/ALTER` o de columnas que “no existen”, conectate con tu usuario admin y volvélos a ejecutar.

> Si venís de una versión anterior (catálogo in-memory) y tenés inventario duplicado, corré una sola vez:
> `database/schema/006_fix_inventory_stacking.sql` (script de limpieza que apila por `TeamId+PartId`).

### B) Habilitar TCP/IP (para Node)
1. SQL Server Configuration Manager → **Protocols for SQLEXPRESS** → Enable **TCP/IP**.
2. En TCP/IP → Properties → IP Addresses → **IPAll**:
	- `TCP Dynamic Ports`: (vacío)
	- `TCP Port`: `1433`
3. Reiniciar: **SQL Server (SQLEXPRESS)**.

### C) Crear el login de la app (recomendado: no usar `sa`)
En SSMS ejecutar (cambiar la contraseña si quieren):
```sql
USE master;
GO
CREATE LOGIN f1app WITH PASSWORD = 'UnaPasswordFuerte_123!';
GO

USE F1GarageManager;
GO
CREATE USER f1app FOR LOGIN f1app;
GO

EXEC sp_addrolemember 'db_datareader', 'f1app';
EXEC sp_addrolemember 'db_datawriter', 'f1app';
GO

-- Recomendado: dar permisos por ESQUEMA una sola vez.
-- Así, aunque actualices/reescribas stored procedures, no tenés que volver a GRANT por cada SP.
-- (Esto otorga EXECUTE sobre todos los SPs/funciones dentro de dbo.)
GRANT EXECUTE ON SCHEMA::dbo TO f1app;

-- (Opcional) Para que SSMS muestre objetos en el explorador con ese usuario:
-- GRANT VIEW DEFINITION ON SCHEMA::dbo TO f1app;

-- Alternativa (más prolija si querés): usar un rol.
-- CREATE ROLE app_exec;
-- GRANT EXECUTE ON SCHEMA::dbo TO app_exec;
-- ALTER ROLE app_exec ADD MEMBER f1app;

-- Si preferís permisos por SP (más verboso), podés listar GRANTs individuales como antes.
GO
```

### D) Crear su `backend/.env`
Cada compañero crea su archivo `backend/.env` (no se comparte) con:
```dotenv
USER_REPOSITORY=sqlserver
TEAM_REPOSITORY=sqlserver
DB_SERVER=localhost
DB_PORT=1433
DB_DATABASE=F1GarageManager
DB_USER=f1app
DB_PASSWORD=UnaPasswordFuerte_123!
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
```

### E) Verificar
1. En `backend`: `npm install` y `npm run dev`.
2. Abrir: `http://localhost:4000/health/db` (debe salir `enabled: true`).

---

## ✅ Si ya tenés la base de datos creada

Si la BD `F1GarageManager` **ya existe** y solo querés actualizarla a la versión actual del esquema (STORE + PART normalizado), corré los scripts en este orden (en SSMS, apuntando a `F1GarageManager`):

1. `database/schema/001_users.sql` (solo si querés login/signup en BD; si ya lo tenés, lo podés omitir)
2. `database/schema/002_sponsors_catalog.sql` (catálogo `dbo.SPONSOR` + SPs `dbo.Sponsor_*`)
3. `database/schema/003_teams_relational_nogo.sql` (teams + inventario + SPs `dbo.Team_*`)
4. `database/schema/004_parts_catalog.sql` (crea/ajusta `dbo.PART` + `dbo.STORE` y SPs `dbo.Part_*`)
5. `database/schema/005_store_purchase_transaction.sql` (crea/ajusta `dbo.TEAM_STORE_PURCHASE` y `dbo.Store_PurchasePart`)
6. (Opcional, si usás autenticación por sesiones con cookies y `SESSION_STORE=sqlserver`) `database/schema/010_session_store.sql`

### ✅ Si tu base es versión vieja (te “sirvió” este orden) No es seguro pero creo que asi es
Si venís de una base vieja (tablas con nombres anteriores y/o estructura distinta), este orden suele funcionar bien:

1. `database/schema/007_rename_tables.sql`
2. `database/schema/009_Drivers_patch.sql`
3. `database/schema/008_Sponsors_patch.sql`
4. `database/schema/001_users.sql`
5. `database/schema/002_sponsors_catalog.sql`
6. `database/schema/003_teams_relational_nogo.sql`
7. `database/schema/004_parts_catalog.sql`
8. `database/schema/005_store_purchase_transaction.sql`
9. (Opcional, si usás autenticación por sesiones con cookies y `SESSION_STORE=sqlserver`) `database/schema/010_session_store.sql`

> Importante: el `009_Drivers_patch.sql` borra `dbo.TEAM_DRIVER`, así que el `003_teams_relational_nogo.sql` debe correrse después para recrearla.

> Nota: el `008_Sponsors_patch.sql` requiere que ya existan `dbo.TEAM_EARNINGS` (lo crea el `003`) y `dbo.SPONSOR` (lo crea el `002`). Por eso va **después** de `002` + `003`.

Opcional (solo si venís de una versión vieja y tenés inventario repetido/duplicado):
- `database/schema/006_fix_inventory_stacking.sql` (corrélo **una sola vez**)