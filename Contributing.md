# Contributing — SiCoSe

Documento oficial de contribucion para el equipo SiCoSe.
Todo integrante debe leer este archivo completo antes de hacer su primer commit.
El incumplimiento de estas reglas puede generar conflictos, perdida de trabajo
y retrasos en las entregas del proyecto.

---

## Tabla de Contenidos

1. [Roles y Responsabilidades](#roles-y-responsabilidades)
2. [Modelo de Ramas](#modelo-de-ramas)
3. [Flujo de Trabajo Paso a Paso](#flujo-de-trabajo-paso-a-paso)
4. [Convencion de Commits](#convencion-de-commits)
5. [Como Abrir un Pull Request](#como-abrir-un-pull-request)
6. [Como Hacer Code Review](#como-hacer-code-review)
7. [Reglas de Codigo](#reglas-de-codigo)
8. [Reglas de Seguridad](#reglas-de-seguridad)
9. [Prohibiciones](#prohibiciones)
10. [Contacto interno](#contacto-interno)

---

## Roles y Responsabilidades

| Nombre | Rol | Permisos en Git |
|--------|-----|-----------------|
| David Aguilar Rodriguez | Product Owner / Business Lead | Aprueba PRs de contenido, landing y propuesta de valor |
| Samuel Jonathan Trujillo Bolanos | Tech Lead / Software Architect | Unico autorizado para mergear a `main`. Aprueba PRs tecnicos |
| Cesar Gaspar Pacheco | Product Engineer / Full Stack Builder | Desarrolla features. Abre PRs hacia `develop` |
| Benkis Carbajal Hernandez | QA / Delivery / Operations Engineer | Revisa y aprueba PRs. Valida funcionalidad antes del merge |

---

## Modelo de Ramas

Se utiliza GitHub Flow modificado con `develop` como rama de integracion central.
main         Produccion. Protegida. Nadie hace push directo aqui.
|
develop      Integracion. Base de todas las ramas activas.
|
|-- feature/nombre-funcionalidad    Nueva funcionalidad
|-- fix/descripcion-del-bug         Correccion de error
|-- docs/descripcion-documento      Documentacion
|-- chore/tarea-de-configuracion    Configuracion o dependencias
|-- hotfix/descripcion-urgente      Solo emergencias en produccion

### Politica de ramas protegidas

| Rama | Push directo | Como entra el codigo |
|------|--------------|----------------------|
| `main` | Prohibido para todos | PR aprobado desde `develop`, ejecutado por Samuel |
| `develop` | Prohibido para todos | PR con minimo 1 aprobacion |

---

## Flujo de Trabajo Paso a Paso

### Paso 1 — Sincronizar el entorno antes de comenzar

Antes de crear cualquier rama o modificar cualquier archivo, actualiza `develop`:

```bash
git checkout develop
git pull origin develop
```

Omitir este paso es la causa principal de conflictos en el equipo.

### Paso 2 — Crear la rama de trabajo

La rama debe crearse siempre desde `develop` actualizado:

```bash
git checkout -b feature/nombre-de-la-tarea
```

Ejemplos validos para este proyecto:

```bash
git checkout -b feature/seccion-problema
git checkout -b feature/formulario-contacto
git checkout -b fix/validacion-campo-email
git checkout -b docs/manual-usuario
git checkout -b chore/configurar-eslint
```

No trabajar directamente en `develop` ni en `main` bajo ninguna circunstancia.

### Paso 3 — Desarrollar con commits atomicos

Un commit debe representar un solo cambio logico y funcional.
No acumular multiples cambios sin relacionar en un mismo commit.

```bash
# Agregar todos los archivos modificados
git add .

# Agregar un archivo especifico
git add src/sections/HeroSection.jsx

# Confirmar el cambio
git commit -m "feat: agregar estructura base de la seccion hero"
```

Ejemplo de secuencia correcta de commits en una tarea:
feat: agregar estructura base del formulario CTA
feat: conectar useState con los campos del formulario
style: aplicar estilos responsivos al formulario
fix: corregir validacion del campo email cuando esta vacio
docs: agregar comentarios explicativos al componente FormCTA

### Paso 4 — Subir la rama al repositorio remoto

```bash
git push origin feature/nombre-de-la-tarea
```

Si es el primer push de esa rama:

```bash
git push --set-upstream origin feature/nombre-de-la-tarea
```

### Paso 5 — Abrir el Pull Request

1. Ir al repositorio en GitHub
2. Click en el banner amarillo "Compare & pull request"
3. Configurar el PR con los siguientes valores:

| Campo | Valor requerido |
|-------|-----------------|
| base | `develop` — siempre hacia esta rama |
| compare | La rama de trabajo actual |
| Titulo | Seguir la convencion de commits |
| Descripcion | Completar la plantilla del equipo |

4. Asignar minimo un reviewer segun la tabla de roles
5. Click en "Create pull request"

### Paso 6 — Revision y aprobacion

- El reviewer tiene 24 horas para revisar desde que fue asignado
- Si hay comentarios, el autor los resuelve y solicita nueva revision
- Se requiere minimo 1 aprobacion para hacer merge
- Ningun integrante puede aprobar su propio Pull Request

### Paso 7 — Merge y limpieza

Una vez aprobado el PR:

```bash
# En GitHub: "Merge pull request" -> "Confirm merge" -> "Delete branch"

# Limpiar el entorno local
git checkout develop
git pull origin develop
git branch -d feature/nombre-de-la-tarea
```

---

## Convencion de Commits

Se utiliza el estandar Conventional Commits. El formato es el siguiente:
tipo(alcance opcional): descripcion corta en minusculas

### Tipos validos

| Tipo | Cuando usarlo | Ejemplo |
|------|---------------|---------|
| `feat` | Nueva funcionalidad | `feat: agregar formulario de contacto` |
| `fix` | Correccion de bug | `fix: corregir validacion de email vacio` |
| `docs` | Solo documentacion | `docs: actualizar README con instrucciones de instalacion` |
| `style` | Formato visual sin logica | `style: aplicar espaciado en la seccion hero` |
| `refactor` | Mejora de codigo sin cambio de comportamiento | `refactor: extraer componente Button reutilizable` |
| `chore` | Configuracion, dependencias o build | `chore: instalar react-hook-form` |
| `test` | Agregar o corregir pruebas | `test: validar envio del formulario CTA` |
| `hotfix` | Correccion urgente en produccion | `hotfix: corregir crash del formulario en mobile` |

### Ejemplos correctos e incorrectos

```bash
# Correcto
git commit -m "feat: agregar seccion de beneficios con tres tarjetas"
git commit -m "fix: corregir color del boton CTA en resolucion mobile"
git commit -m "docs: agregar guia de instalacion al README"

# Incorrecto
git commit -m "cambios"
git commit -m "arregle cosas"
git commit -m "WIP"
git commit -m "subiendo avances"
git commit -m "no se"
```

---

## Como Abrir un Pull Request

Utilizar la siguiente plantilla al redactar la descripcion del PR:

```markdown
## Que hace este PR
Descripcion breve y clara de los cambios realizados.

## Por que se hizo
Contexto del issue o tarea que este PR resuelve.

## Capturas de pantalla
Adjuntar imagenes si existen cambios visuales en la interfaz.

## Checklist
- [ ] El proyecto compila sin errores con npm run dev
- [ ] No hay console.log olvidados en el codigo
- [ ] Los estilos son responsivos en mobile y desktop
- [ ] El formulario valida correctamente todos sus campos
- [ ] No se subieron archivos .env ni credenciales
- [ ] Se elimino codigo comentado innecesario
```

---

## Como Hacer Code Review

Al ser asignado como reviewer, verificar los siguientes puntos:

**Funcionalidad**
- El codigo compila sin errores haciendo checkout a la rama y ejecutando `npm run dev`
- Los criterios de aceptacion del issue estan cumplidos
- El formulario (si aplica) valida todos sus campos correctamente

**Calidad del codigo**
- Los nombres de variables y funciones son descriptivos y en ingles o espanol consistente
- No hay logica duplicada que pueda extraerse en un componente o funcion
- No hay console.log, codigo comentado o archivos innecesarios

**Seguridad**
- No se exponen credenciales, tokens ni claves de API en ningun archivo
- El archivo .env no esta incluido en el commit

**Diseno**
- La interfaz es responsiva en mobile (menos de 768px) y desktop
- Los estilos son coherentes con el resto del proyecto

### Como redactar comentarios en el review
Incorrecto — no aporta solucion
"Esto esta mal"
Correcto — describe el problema y propone solucion
"Este useState podria simplificarse con useReducer porque
manejas mas de tres campos relacionados. Referencia:
https://react.dev/reference/react/useReducer"

---

## Reglas de Codigo

| Elemento | Convencion | Ejemplo |
|----------|------------|---------|
| Componentes React | PascalCase | `HeroSection.jsx`, `FormCTA.jsx` |
| Variables y funciones | camelCase | `formData`, `handleSubmit` |
| Clases CSS | kebab-case | `hero-section`, `cta-button` |
| Constantes globales | UPPER_SNAKE_CASE | `API_URL`, `MAX_RETRIES` |
| Archivos de estilos | Mismo nombre que el componente | `HeroSection.module.css` |

Reglas adicionales:

- Un componente por archivo, sin excepcion
- No dejar codigo comentado en el repositorio. Git conserva el historial
- No eliminar ni modificar el archivo `.gitignore`
- No instalar dependencias nuevas sin aprobacion del Tech Lead (Samuel)
- Cada componente debe tener comentario de cabecera que explique su proposito

---

## Reglas de Seguridad

- Las credenciales, API keys y tokens nunca se escriben directamente en el codigo
- Toda variable sensible va en el archivo `.env`, el cual esta en `.gitignore`
- Existe un archivo `.env.example` con las claves vacias como referencia para el equipo
- Los datos reales de ciudadanos o del cliente no se incluyen como datos de prueba en el codigo

### Si accidentalmente se sube un archivo .env

```bash
# Remover el archivo del tracking de Git
git rm --cached .env
git commit -m "chore: remover .env del repositorio"
git push origin nombre-de-la-rama
```

Despues de ejecutar estos comandos, cambiar inmediatamente todas las
credenciales que hayan sido expuestas.

---

## Prohibiciones

Las siguientes acciones estan prohibidas para todos los integrantes del equipo:

| Accion prohibida | Consecuencia |
|-----------------|--------------|
| Push directo a `main` | Rompe produccion sin revision previa |
| Push directo a `develop` | Omite el proceso de code review |
| Aprobar el propio Pull Request | Elimina la revision de calidad |
| Commit con mensaje generico ("cambios", "WIP") | Imposibilita rastrear el historial |
| Subir la carpeta `node_modules` | Aumenta el peso del repositorio innecesariamente |
| Subir archivos `.env` | Expone credenciales de forma publica |
| Trabajar semanas en una rama sin abrir PR | Genera conflictos graves al integrar |
| Eliminar ramas de otros integrantes sin avisar | Genera perdida de trabajo |
| Mergear sin aprobacion | Introduce codigo sin revisar al proyecto |

---

## Contacto Interno

Ante cualquier duda sobre este documento o sobre el flujo de trabajo:

| Tipo de duda | A quien dirigirse |
|-------------|-------------------|
| Arquitectura, Git, configuracion tecnica | Samuel — Tech Lead |
| Producto, prioridades, alcance | David — Product Owner |
| Validacion, calidad, entregas | Benkis — QA Engineer |
| Desarrollo, componentes, bugs | Cesar — Full Stack Builder |