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

## 🗄️ SQL Server (guardar usuarios en BD)

> Esto es **solo** para persistir usuarios (email + passwordHash) desde el login/signup.

### 1) Pasos en SSMS
1. Abrí **SQL Server Management Studio** y conectate a tu instancia (ej: `localhost\SQLEXPRESS`).
2. (Si no existe) Crear base de datos:
	- Click derecho en **Databases** → **New Database...** → nombre: `F1GarageManager` → OK.
3. Ejecutar el script de usuarios:
	- Abrí el archivo `backend/sql/001_users.sql` en SSMS.
	- Seleccioná la BD `F1GarageManager` en el desplegable (arriba) o ejecutá: `USE F1GarageManager;`.
	- Ejecutá (F5). Esto crea la tabla `dbo.Users` y stored procedures.

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
	- Object Explorer → `F1GarageManager` → **Tables** → `dbo.Users`
	- Click derecho → **Select Top 1000 Rows**

> Tip: si SSMS muestra errores de IntelliSense pero el `SELECT` funciona, usá: **Edit → IntelliSense → Refresh Local Cache**.

> Nota: Este backend usa **SQL Login** (usuario/contraseña). Si estás usando solo Windows Authentication, hay que habilitar **Mixed Mode**.

---

## 👥 Guía para compañeros (clonar y configurar su propia BD)

Cada persona debe configurar **su propia** instancia de SQL Server y su propio `backend/.env`.
La contraseña del login **no es global**: depende del SQL Server local de cada quien.

### A) Crear BD y objetos
1. En SSMS, conectarse a su instancia (ej: `localhost\SQLEXPRESS`).
2. Crear la base (si no existe):
```sql
IF DB_ID(N'F1GarageManager') IS NULL
  CREATE DATABASE F1GarageManager;
GO
```
3. Ejecutar el script:
	- Abrir `backend/sql/001_users.sql`
	- Ejecutar (F5) apuntando a la BD `F1GarageManager`

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

GRANT EXECUTE ON dbo.User_Create TO f1app;
GRANT EXECUTE ON dbo.User_GetByEmail TO f1app;
GRANT EXECUTE ON dbo.User_GetById TO f1app;
GO
```

### D) Crear su `backend/.env`
Cada compañero crea su archivo `backend/.env` (no se comparte) con:
```dotenv
USER_REPOSITORY=sqlserver
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