#  Sistema Web de Gestión Administrativa y Control de Arrendamientos — Mercado Pan de Vida

Plataforma web transaccional desarrollada bajo principios de **Interacción Humano-Computador (IHC)**, **Diseño Centrado en el Usuario (DCU)** y pautas de accesibilidad **WCAG 2.1 Nivel AA** para digitalizar y automatizar la gestión operativa, contractual y financiera de los **100 puestos comerciales** del **Mercado Pan de Vida** (Puente Piedra, Lima – Perú).

---

##  Tabla de Contenidos
- [Descripción del Proyecto](#-descripción-del-proyecto)
- [Características Principales](#-características-principales)
- [Arquitectura y Tecnologías](#-arquitectura-y-tecnologías)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Instalación y Ejecución Local](#-instalación-y-ejecución-local)
- [Roles y Accesos](#-roles-y-accesos)
- [Equipo de Desarrollo](#-equipo-de-desarrollo)
- [Licencia](#-licencia)

---

##  Descripción del Proyecto

Previamente, el control de arrendamientos, cuotas de servicios básicos (luz, agua, mantenimiento y vigilancia), saldos a favor y morosidad en el Mercado Pan de Vida se gestionaba manualmente en cuadernos físicos, generando sobrecarga cognitiva en la administración y asimetría de información con los comerciantes.

Este sistema centraliza toda la operación sobre una base de datos relacional en **MySQL** y una API REST en **Node.js / Express**, ofreciendo un **Dashboard gerencial interactivo** para el administrador y un **Portal de Autogestión responsivo** accesible mediante DNI para los inquilinos.

---

##  Características Principales

###  Ecosistema Administrativo
- **Autenticación Dual (`index.html`):** Acceso diferenciado con credenciales para el Administrador y acceso libre de fricción mediante **DNI de 8 dígitos** para los Inquilinos.
- **Dashboard Espacial Interactivo 11×10 (`principal_admin.html`):**
  - 4 tarjetas **KPI** en tiempo real (*Puestos Ocupados*, *Ingreso del Mes*, *Puestos al Día* y *Pagos Pendientes*).
  - Cuadrícula interactiva de los **100 puestos** (`L1–L5`, `P1–P62`, `A1–A17`, `B1–B16`) con **doble codificación visual** (color + etiqueta textual: *Libre*, *Al Día*, *Pendiente*, *Vencido*, *Bloqueado*).
  - Tabla cronológica con los últimos 10 pagos registrados.
- **Gestión Integral de Inquilinos (`inquilinos_admin.html`, `registrar_inquilino.html`, `perfil_inquilino.html`):**
  - Buscador en tiempo real por nombre o DNI y ordenamiento dinámico por columnas.
  - Registro de nuevos comerciantes con asignación opcional de puesto libre.
  - Gestión de **Saldo a Favor** y cobro inteligente (pago total, amortización parcial o alerta de fondos insuficientes).
  - Control documental digitalizado (DNI y recibos de servicios) y exportación individual a Excel.
- **Control de Infraestructura y Puestos (`puestos_admin.html`, `perfil_puesto.html`):**
  - Edición de tarifas base por puesto (alquiler, luz, agua, mantenimiento y vigilancia) con confirmación por contraseña.
  - **Inhabilitación lógica (`Bloqueado`):** Pausa la generación mensual de servicios compartidos en locales cerrados.
  - **Baja controlada:** Restricción preventiva que exige bloquear el puesto antes de desvincular al inquilino, clasificándolo automáticamente como `Deudor` (si mantiene deuda) o `Inactivo`.
  - Arrendamiento directo de puestos `Libre` a inquilinos disponibles.
- **Libro Contable de Ingresos y Egresos (`ingresos_egresos_admin.html`):**
  - Registro de ingresos por cobros y egresos institucionales (Sedapal, SUNAT, mantenimiento, etc.).
  - Filtrado por mes y tipo de movimiento, cálculo automático de balance neto por rango de fechas y exportación directa a **Microsoft Excel (`.xls`)**.

###  Portal de Autogestión del Inquilino (`principal_cliente.html`)
- Diseño **Mobile-First** adaptado a teléfonos inteligentes y tabletas.
- Visualización transparente de **Deuda Total**, desglose unitario por concepto y **Saldo a Favor** disponible.
- Amortización directa de recibos utilizando el saldo disponible e historial cronológico inmutable de pagos realizados.

###  Accesibilidad Universal (WCAG 2.1 Nivel AA)
- **Modo Oscuro de Alto Contraste** persistente (`localStorage`) en todas las vistas.
- Doble codificación visual (texto + color) apta para daltonismo.
- Navegación por teclado en la cuadrícula de puestos y prevención de errores financieros mediante confirmaciones y validación de contraseña administrativa.

---

##  Arquitectura y Tecnologías

| Capa | Tecnologías |
| :--- | :--- |
| **Frontend** | HTML5 (`lang="es-PE"`), CSS3 (Variables CSS + Tema Claro/Oscuro), Bootstrap 5, JavaScript (ES6+), Font Awesome 6 |
| **Backend** | Node.js, Express.js, CORS, Dotenv |
| **Base de Datos** | MySQL 8.0+ (`mysql2`) con integridad referencial (llaves foráneas) |

---

##  Estructura del Proyecto

```text
Mercado Pan de Vida/
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── admin_ingresos_egresos.js
│   │   ├── admin_inquilinos.js
│   │   ├── admin_perfil_inquilino.js
│   │   ├── admin_perfil_puesto.js
│   │   ├── admin_principal.js
│   │   ├── admin_puestos.js
│   │   ├── admin_registrar_inquilino.js
│   │   ├── cliente_principal.js
│   │   └── login.js
│   ├── index.html
│   ├── ingresos_egresos_admin.html
│   ├── inquilinos_admin.html
│   ├── perfil_inquilino.html
│   ├── perfil_puesto.html
│   ├── principal_admin.html
│   ├── principal_cliente.html
│   ├── puestos_admin.html
│   └── registrar_inquilino.html
├── .env.example
├── .gitignore
├── db.js
├── package.json
├── README.md
└── server.js