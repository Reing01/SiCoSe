import { useState } from "react";

// ============================================================
// SiCoSe — Sistema de Cobros de Servicios
// Bloque 1: Landing Page (Mobile-First)
// Paleta: #0f3042 (azul oscuro) | #f97316 (naranja CTA)
// ============================================================

// ------ Sub-componentes ------

const NAV_LINKS = [
  { label: "El Problema", href: "#problema" },
  { label: "Módulos", href: "#modulos" },
  { label: "Vista Previa", href: "#preview" },
  { label: "Contacto", href: "#contacto" },
];

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f3042] shadow-lg">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-[#f97316] flex items-center justify-center">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">
            SiCoSe<span className="text-[#f97316]">.</span>
          </span>
          <span className="hidden sm:inline text-slate-400 text-xs font-medium border-l border-slate-600 pl-2 ml-1 leading-tight">
            Juntas Auxiliares
          </span>
        </a>

        {/* Links — desktop */}
        <ul className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-slate-300 hover:text-[#f97316] text-sm font-medium transition-colors"
              >
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <a
              href="#contacto"
              className="bg-[#f97316] hover:bg-orange-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Demo Gratis
            </a>
          </li>
        </ul>

        {/* Hamburguesa — mobile */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-white p-2 rounded-md hover:bg-white/10 transition-colors"
          aria-label="Abrir menú"
        >
          {isOpen ? (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Menú mobile desplegable */}
      {isOpen && (
        <div className="md:hidden bg-[#0a2535] border-t border-white/10 px-4 py-4 flex flex-col gap-3">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setIsOpen(false)}
              className="text-slate-300 hover:text-[#f97316] text-base font-medium py-1 transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#contacto"
            onClick={() => setIsOpen(false)}
            className="mt-2 bg-[#f97316] hover:bg-orange-500 text-white font-semibold py-3 rounded-lg text-center transition-colors"
          >
            Solicitar Demostración Gratis
          </a>
        </div>
      )}
    </nav>
  );
}

// ------ Hero ------
function Hero() {
  return (
    <section className="pt-28 pb-20 bg-gradient-to-br from-[#0f3042] via-[#0f3042] to-[#0a2535] text-white relative overflow-hidden">
      {/* Decoración de fondo */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-10 right-0 w-96 h-96 rounded-full bg-[#f97316] blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-blue-400 blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 text-center">
        {/* Badge */}
        <span className="inline-block bg-[#f97316]/20 border border-[#f97316]/40 text-[#f97316] text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-6">
          Junta Auxiliar • Comite
        </span>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-5 text-balance">
          Dile adiós a las{" "}
          <span className="text-[#f97316]">libretas de papel</span>
          <br className="hidden sm:block" /> en tu junta auxiliar
        </h1>

        <p className="text-slate-300 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          SiCoSe digitaliza la recaudación del servicio de agua, el padrón de
          usuarios y el historial de pagos y adeudos — todo en una sola
          plataforma accesible desde tu teléfono celular.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#contacto"
            className="bg-[#f97316] hover:bg-orange-500 active:bg-orange-600 text-white font-bold text-lg px-8 py-4 rounded-xl shadow-lg shadow-orange-700/30 transition-all hover:-translate-y-0.5"
          >
            Solicitar Demostración Gratis
          </a>
          <a
            href="#modulos"
            className="border border-white/30 hover:border-white/60 text-white font-semibold text-lg px-8 py-4 rounded-xl transition-all hover:bg-white/5"
          >
            Ver Módulos →
          </a>
        </div>

        {/* Stats rápidas */}
        <div className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto">
          {[
            { val: "100%", label: "Gratuito para la junta" },
            { val: "< 1 min", label: "Consultar un adeudo" },
            { val: "24/7", label: "Disponible en móvil" },
          ].map(({ val, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl sm:text-3xl font-extrabold text-[#f97316]">
                {val}
              </div>
              <div className="text-slate-400 text-xs mt-1 leading-tight">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ------ Sección del Problema ------
function ProblemaBanner() {
  const dolores = [
    {
      icon: "📒",
      titulo: "Libretas de papel perdidas",
      desc: "Registros de pago dispersos en cuadernos que se mojan, se pierden o simplemente nadie entiende la letra.",
    },
    {
      icon: "🏦",
      titulo: "Validación manual de SPEI",
      desc: "Horas revisando capturas de pantalla de transferencias bancarias que podrían ser falsas o estar duplicadas.",
    },
    {
      icon: "🚶",
      titulo: "Cobros puerta a puerta sin control",
      desc: "No hay forma de saber quién pagó, cuándo pagó o cuántos periodos tiene adeudados sin ir a buscar físicamente el registro.",
    },
    {
      icon: "❌",
      titulo: "Sin historial centralizado",
      desc: "Cuando cambia el comité, la información del periodo anterior desaparece o se entrega incompleta.",
    },
  ];

  return (
    <section id="problema" className="py-20 bg-slate-900 text-white">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-14">
          <span className="inline-block bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-4">
            El Problema Real
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Así se gestiona hoy la recaudación
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-base">
            Validado en entrevistas directas con comités de juntas auxiliares de
            Puebla. El caos no es culpa de las personas — es falta de
            herramientas.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {dolores.map(({ icon, titulo, desc }) => (
            <div
              key={titulo}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 flex gap-4 hover:bg-white/8 transition-colors"
            >
              <div className="text-3xl shrink-0 mt-0.5">{icon}</div>
              <div>
                <h3 className="font-bold text-white mb-1">{titulo}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 bg-gradient-to-r from-[#f97316]/20 to-transparent border-l-4 border-[#f97316] rounded-xl p-6">
          <p className="text-white text-base sm:text-lg font-medium leading-relaxed">
            <span className="text-[#f97316] font-bold">Resultado:</span> el
            comité pierde horas cada semana buscando adeudos, los ciudadanos no
            confían en los cobros y el municipio no tiene datos reales sobre la
            cobertura del servicio.
          </p>
        </div>
      </div>
    </section>
  );
}

// ------ Sección de Módulos (La Solución) ------
function Modulos() {
  const modulos = [
    {
      icon: (
        <svg
          className="w-7 h-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
      nombre: "Dashboard Principal",
      desc: "Visualiza en tiempo real la recaudación del período: efectivo vs. SPEI, total cobrado, adeudos pendientes y cobertura del padrón.",
      tag: "Métricas en tiempo real",
    },
    {
      icon: (
        <svg
          className="w-7 h-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      nombre: "Login Seguro",
      desc: "Acceso protegido por usuario y contraseña. Solo el comité autorizado puede consultar y editar el padrón — sin riesgo de filtraciones.",
      tag: "Acceso controlado",
    },
    {
      icon: (
        <svg
          className="w-7 h-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      nombre: "Padrón Digital",
      desc: "Base de datos de cada usuario con su ID, nombre completo, dirección exacta (Zona, Calle, CP) y foto de referencia opcional.",
      tag: "Dirección exacta",
    },
    {
      icon: (
        <svg
          className="w-7 h-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
      nombre: "Historial Logístico",
      desc: "Consulta de un vistazo cuántos periodos pagó cada usuario y cuántos adeuda. Exportable para rendición de cuentas ante el municipio.",
      tag: "Períodos pagados / adeudados",
    },
  ];

  return (
    <section id="modulos" className="py-20 bg-slate-50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-14">
          <span className="inline-block bg-[#0f3042]/10 border border-[#0f3042]/20 text-[#0f3042] text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-4">
            La Solución
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f3042] mb-4">
            4 módulos, un solo sistema
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto text-base">
            Diseñado específicamente para juntas auxiliares — sin funciones
            innecesarias, sin curvas de aprendizaje.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {modulos.map(({ icon, nombre, desc, tag }) => (
            <div
              key={nombre}
              className="bg-white border border-slate-200 rounded-2xl p-7 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#0f3042] text-white flex items-center justify-center mb-5 group-hover:bg-[#f97316] transition-colors">
                {icon}
              </div>
              <span className="text-[#f97316] text-xs font-bold uppercase tracking-widest mb-2 block">
                {tag}
              </span>
              <h3 className="text-[#0f3042] font-extrabold text-lg mb-2">
                {nombre}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ------ Simulación de Interfaz / Vista Previa ------
const PREVIEW_DATA = [
  {
    id: "SDC-001",
    nombre: "Ma. Guadalupe Reyes Torres",
    zona: "Centro",
    calle: "Av. Hidalgo 14",
    cp: "72810",
    pagados: 6,
    adeudados: 2,
  },
  {
    id: "SDC-002",
    nombre: "José Ramírez Hernández",
    zona: "Barrio Alto",
    calle: "Calle Morelos 7",
    cp: "72811",
    pagados: 8,
    adeudados: 0,
  },
  {
    id: "SDC-003",
    nombre: "Esperanza López Méndez",
    zona: "Lomas",
    calle: "Cda. Juárez 3",
    cp: "72812",
    pagados: 2,
    adeudados: 6,
  },
  {
    id: "SDC-004",
    nombre: "Roberto Cruz Salazar",
    zona: "Centro",
    calle: "Calle Allende 22",
    cp: "72810",
    pagados: 5,
    adeudados: 3,
  },
  {
    id: "SDC-005",
    nombre: "Ana Patricia Flores Díaz",
    zona: "Barrio Bajo",
    calle: "Av. Reforma 88",
    cp: "72813",
    pagados: 8,
    adeudados: 0,
  },
];

function InterfacePreview() {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = PREVIEW_DATA.filter(
    (u) =>
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.id.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.zona.toLowerCase().includes(busqueda.toLowerCase()),
  );

  return (
    <section id="preview" className="py-20 bg-[#0f3042]">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <span className="inline-block bg-[#f97316]/20 border border-[#f97316]/40 text-[#f97316] text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-4">
            Vista Previa Real
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Así se ve el Padrón Digital
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-base">
            Interactúa con esta simulación. Busca por nombre, ID o zona para ver
            cómo funciona el buscador en tiempo real.
          </p>
        </div>

        <div className="bg-slate-800 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="bg-slate-900 px-5 py-3 flex items-center gap-3 border-b border-white/10">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <span className="text-slate-500 text-xs font-mono">
              sicose.app / padron-digital
            </span>
          </div>

          <div className="px-4 sm:px-6 py-4 border-b border-white/10 flex items-center gap-3">
            <svg
              className="w-5 h-5 text-slate-400 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, ID o zona…"
              className="bg-transparent text-white placeholder-slate-500 text-sm flex-1 outline-none"
            />
            <span className="text-slate-500 text-xs hidden sm:block">
              {filtrados.length} resultado{filtrados.length !== 1 && "s"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider">
                  {[
                    "ID",
                    "Nombre",
                    "Zona",
                    "Calle / CP",
                    "Períodos Pagados",
                    "Períodos Adeudados",
                  ].map((h) => (
                    <th key={h} className="text-left px-5 py-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((u, i) => (
                  <tr
                    key={u.id}
                    className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                      i % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"
                    }`}
                  >
                    <td className="px-5 py-3.5 font-mono text-[#f97316] font-medium">
                      {u.id}
                    </td>
                    <td className="px-5 py-3.5 text-white font-medium">
                      {u.nombre}
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">{u.zona}</td>
                    <td className="px-5 py-3.5 text-slate-300">
                      {u.calle}
                      <span className="text-slate-500 text-xs ml-1">
                        C.P. {u.cp}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-green-500"
                            style={{ width: `${(u.pagados / 8) * 100}%` }}
                          />
                        </div>
                        <span className="text-green-400 font-bold">
                          {u.pagados}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {u.adeudados === 0 ? (
                        <span className="inline-flex items-center gap-1 text-green-400 text-xs font-semibold bg-green-500/10 px-2 py-1 rounded-full">
                          ✓ Al corriente
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-400 text-xs font-semibold bg-red-500/10 px-2 py-1 rounded-full">
                          ⚠ {u.adeudados} pendiente{u.adeudados > 1 && "s"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center text-slate-500 py-10"
                    >
                      No se encontraron resultados para "{busqueda}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 bg-slate-900 text-slate-500 text-xs flex justify-between items-center">
            <span>Padrón: {PREVIEW_DATA.length} usuarios registrados</span>
            <span>SiCoSe v1.0 — San Diego Chalma</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ------ Formulario de Captura ------
const INITIAL_FORM = { nombre: "", comite: "", contacto: "" };

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

function FormularioContacto() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.nombre || !formData.comite || !formData.contacto) return;

    setCargando(true);
    setError(false);

    try {
      const response = await fetch(`${API_BASE_URL}/api/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        throw new Error("Lead submission failed");
      }
      setEnviado(true);
      setFormData(INITIAL_FORM);
    } catch (_) {
      // Si hay un error de red real lo mostramos
      setError(true);
    } finally {
      setCargando(false);
    }
  }

  return (
    <section id="contacto" className="py-20 bg-slate-50">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-12">
          <span className="inline-block bg-[#0f3042]/10 border border-[#0f3042]/20 text-[#0f3042] text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-4">
            Empieza Hoy
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f3042] mb-4">
            Solicita tu Demostración Gratis
          </h2>
          <p className="text-slate-500 text-base max-w-md mx-auto">
            Déjanos tus datos y nos ponemos en contacto para mostrarte el
            sistema funcionando en vivo — sin costos, sin compromisos.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          {enviado ? (
            /* ── Estado de éxito ── */
            <div className="text-center py-8">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-[#0f3042] font-extrabold text-xl mb-2">
                ¡Datos recibidos!
              </h3>
              <p className="text-slate-500 text-sm">
                Nos pondremos en contacto contigo muy pronto para agendar la
                demostración.
              </p>
              <button
                onClick={() => {
                  setEnviado(false);
                  setError(false);
                }}
                className="mt-6 text-[#f97316] text-sm font-semibold hover:underline"
              >
                Enviar otra solicitud
              </button>
            </div>
          ) : (
            /* ── Formulario ── */
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Nombre */}
              <div>
                <label className="block text-[#0f3042] font-semibold text-sm mb-1.5">
                  Nombre completo <span className="text-[#f97316]">*</span>
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Ej. Juan Carlos Martínez"
                  required
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:border-transparent text-sm transition"
                />
              </div>

              {/* Comité */}
              <div>
                <label className="block text-[#0f3042] font-semibold text-sm mb-1.5">
                  Comité / Junta Auxiliar{" "}
                  <span className="text-[#f97316]">*</span>
                </label>
                <input
                  type="text"
                  name="comite"
                  value={formData.comite}
                  onChange={handleChange}
                  placeholder="Ej. Junta Auxiliar San Diego Chalma"
                  required
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:border-transparent text-sm transition"
                />
              </div>

              {/* Contacto */}
              <div>
                <label className="block text-[#0f3042] font-semibold text-sm mb-1.5">
                  Teléfono o Correo electrónico{" "}
                  <span className="text-[#f97316]">*</span>
                </label>
                <input
                  type="text"
                  name="contacto"
                  value={formData.contacto}
                  onChange={handleChange}
                  placeholder="Ej. 222 123 4567 o correo@ejemplo.com"
                  required
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:border-transparent text-sm transition"
                />
              </div>

              {/* Mensaje de error visible (opcional, por si quieres mostrarlo) */}
              {error && (
                <p className="text-red-500 text-xs text-center">
                  Ocurrió un problema al enviar. Intenta de nuevo.
                </p>
              )}

              <button
                type="submit"
                disabled={cargando}
                className="w-full bg-[#f97316] hover:bg-orange-500 active:bg-orange-600 disabled:opacity-60 text-white font-bold text-base py-4 rounded-xl shadow-md shadow-orange-200 transition-all hover:-translate-y-0.5 disabled:translate-y-0"
              >
                {cargando ? "Enviando…" : "Enviar Datos →"}
              </button>

              <p className="text-center text-slate-400 text-xs">
                Sin spam. Solo te contactamos para agendar la demo.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

// ------ Footer ------
function Footer() {
  return (
    <footer className="bg-[#0a2535] text-slate-500 py-10 text-center">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded bg-[#f97316] flex items-center justify-center">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span className="text-white font-bold text-sm">SiCoSe</span>
        </div>
        <p className="text-xs">
          Sistema de Cobro de Servicios •{" "}
          <span className="text-slate-400">
            Junta Auxiliar San Diego Chalma, Puebla
          </span>
        </p>
        <p className="text-xs mt-2 text-slate-600">
          © {new Date().getFullYear()} — Bloque 1: Landing Page. Versión de
          validación.
        </p>
      </div>
    </footer>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function LandingPage() {
  return (
    <div className="min-h-screen font-sans antialiased">
      <Navbar />
      <main>
        <Hero />
        <ProblemaBanner />
        <Modulos />
        <InterfacePreview />
        <FormularioContacto />
      </main>
      <Footer />
    </div>
  );
}