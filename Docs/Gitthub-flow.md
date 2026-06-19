markdown# GitHub Flow — SiCoSe

Documento oficial del flujo de trabajo con Git para el equipo SiCoSe.
Todo el equipo debe leer y respetar este documento antes de hacer su primer commit.

---

## Tabla de Contenidos

1. [Mapa de Ramas](#mapa-de-ramas)
2. [Ciclo Completo de una Tarea](#ciclo-completo-de-una-tarea)
3. [Comandos Git Esenciales](#comandos-git-esenciales)
4. [Nomenclatura de Ramas](#nomenclatura-de-ramas)
5. [Responsables por Rama](#responsables-por-rama)
6. [Como Resolver Conflictos](#como-resolver-conflictos)
7. [Como Hacer un Hotfix](#como-hacer-un-hotfix)
8. [Errores Frecuentes y Como Resolverlos](#errores-frecuentes-y-como-resolverlos)
9. [Reglas de Oro](#reglas-de-oro)

---

## Mapa de Ramas
main         Produccion. Protegida. Solo Samuel mergea aqui.
|
develop      Integracion. Base de todo el trabajo del equipo.
|
|-- feature/landing-base          Maquetacion Landing (Cesar / David)
|-- feature/seccion-problema      Seccion problema (Cesar)
|-- feature/formulario-cta        Formulario de contacto (Cesar)
|-- chore/setup-deploy            Configuracion Vercel (Samuel)
|-- docs/github-flow              Este documento (Samuel)
|-- docs/projectcharter           Project Charter (Benkis)

### Cuando se mergea a main

Solo cuando `develop` tiene una version estable, completamente probada y
aprobada por el equipo. Unicamente Samuel abre ese PR. Ningun feature branch
hace merge directo a `main`.

---

## Ciclo Completo de una Tarea

### Paso 1 — Sincronizar el entorno local

Antes de crear cualquier rama o modificar cualquier archivo:

```bash
git checkout develop
git pull origin develop
```

No ejecutar este paso es la causa principal de conflictos en proyectos
colaborativos. Sin excepcion, siempre antes de empezar.

### Paso 2 — Crear la rama de trabajo

La rama debe partir siempre desde `develop` actualizado:

```bash
git checkout -b feature/nombre-de-la-tarea
```

Ejemplos reales del proyecto:

```bash
git checkout -b feature/seccion-problema
git checkout -b feature/formulario-cta
git checkout -b fix/validacion-email
git checkout -b docs/manual-usuario
git checkout -b chore/configurar-eslint
```

Nunca trabajar directamente sobre `develop` ni sobre `main`.

### Paso 3 — Desarrollar con commits atomicos

Un commit debe representar un solo cambio logico y funcional.
No acumular multiples cambios sin relacion en un mismo commit.

```bash
# Agregar todos los archivos modificados
git add .

# Agregar un archivo especifico
git add src/sections/HeroSection.jsx

# Confirmar el cambio con mensaje descriptivo
git commit -m "feat: agregar estructura base de la seccion hero"
```

Ejemplo de secuencia correcta de commits en una tarea real:
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
| Titulo | Seguir convencion de commits |
| Descripcion | Completar la plantilla del equipo |

4. Asignar minimo un reviewer segun la tabla de responsables
5. Click en "Create pull request"

### Paso 6 — Code Review

- El reviewer tiene 24 horas para revisar desde que fue asignado
- Si hay comentarios, el autor los resuelve y solicita nueva revision
- Se requiere minimo 1 aprobacion para hacer merge
- Ningun integrante puede aprobar su propio Pull Request

### Paso 7 — Merge y limpieza de rama

Una vez aprobado el PR:

```bash
# En GitHub: "Merge pull request" -> "Confirm merge" -> "Delete branch"

# Limpiar el entorno local
git checkout develop
git pull origin develop
git branch -d feature/nombre-de-la-tarea
```

---

## Comandos Git Esenciales

### Consultar estado del repositorio

```bash
# Ver rama actual y archivos modificados
git status

# Ver historial de commits en formato compacto con grafico de ramas
git log --oneline --graph --all

# Ver diferencias antes de hacer commit
git diff

# Ver diferencias de un archivo especifico
git diff src/sections/HeroSection.jsx
```

### Trabajar con ramas

```bash
# Listar todas las ramas locales y remotas
git branch -a

# Cambiar a una rama existente
git checkout nombre-de-rama

# Crear rama y cambiar a ella en un solo comando
git checkout -b feature/nueva-rama

# Eliminar rama local (solo si ya fue mergeada)
git branch -d feature/rama-terminada

# Forzar eliminacion de rama local sin importar estado
git branch -D feature/rama-terminada

# Eliminar rama remota
git push origin --delete feature/rama-terminada
```

### Sincronizacion con el repositorio remoto

```bash
# Traer cambios remotos sin hacer merge
git fetch origin

# Traer y mergear cambios de develop al local
git pull origin develop

# Subir cambios de la rama actual
git push origin feature/mi-rama

# Ver diferencia entre rama local y remota
git diff origin/develop
```

### Deshacer errores

```bash
# Deshacer el ultimo commit manteniendo los cambios en los archivos
git reset --soft HEAD~1

# Sacar un archivo del staging sin perder los cambios
git restore --staged archivo.jsx

# Descartar todos los cambios no commiteados en un archivo
git restore archivo.jsx

# Descartar todos los cambios no commiteados en el proyecto
# ADVERTENCIA: esta accion es irreversible
git checkout -- .
```

---

## Nomenclatura de Ramas

El nombre debe describir exactamente que hace la rama. Formato obligatorio:
tipo/descripcion-en-kebab-case

| Tipo | Cuando usarlo | Ejemplo |
|------|---------------|---------|
| `feature/` | Nueva funcionalidad | `feature/seccion-beneficios` |
| `fix/` | Correccion de un bug | `fix/error-envio-formulario` |
| `docs/` | Solo documentacion | `docs/manual-deploy` |
| `chore/` | Configuracion, dependencias o build | `chore/agregar-eslint` |
| `style/` | Cambios visuales sin logica de negocio | `style/responsive-mobile` |
| `refactor/` | Mejora de codigo sin cambio de comportamiento | `refactor/extraer-componente-card` |
| `hotfix/` | Correccion urgente sobre produccion | `hotfix/crash-formulario-produccion` |

### Reglas del nombre de rama

- Todo en minusculas
- Palabras separadas con guion medio
- Descripcion corta, maxima cuatro palabras
- Sin espacios, sin mayusculas, sin caracteres especiales, sin acentos

```bash
# Correcto
feature/registro-de-pagos
fix/validacion-campo-email
docs/guia-instalacion

# Incorrecto
Feature/RegistroDePagos
mi rama nueva
feature/arreglar_cosas_formulario_que_no_funcionaban_bien
```

---

## Responsables por Rama

| Rama | Propietario | Quien puede mergear |
|------|-------------|---------------------|
| `main` | Samuel | Solo Samuel |
| `develop` | Samuel | Samuel con minimo 1 aprobacion |
| `feature/*` | Cesar / David | Cualquier integrante con 1 aprobacion |
| `fix/*` | Quien detecta el bug | Cualquier integrante con 1 aprobacion |
| `docs/*` | Benkis / Samuel | Cualquier integrante con 1 aprobacion |
| `chore/*` | Samuel | Samuel con 1 aprobacion |
| `hotfix/*` | Samuel | Solo Samuel, proceso de emergencia |

---

## Como Resolver Conflictos

Los conflictos ocurren cuando dos ramas modificaron el mismo fragmento de
un archivo. Se resuelven siguiendo estos pasos:

### Paso 1 — Actualizar la rama con develop

```bash
git checkout develop
git pull origin develop
git checkout feature/tu-rama
git merge develop
```

### Paso 2 — Identificar los archivos en conflicto

```bash
git status
```

Dentro del archivo en conflicto apareceran marcadores como estos:
< < < < < < < HEAD
<h1>Bienvenido a SiCoSe</h1>
= = = = = = =
<h1>Sistema de Cobro y Seguimiento</h1>
> > > > > > > develop
````
Paso 3 — Editar el archivo manualmente
Elegir la version correcta o combinar ambas segun corresponda.
Eliminar los marcadores de conflicto por completo:
html<h1>SiCoSe — Sistema de Cobro y Seguimiento</h1>
Paso 4 — Marcar como resuelto y hacer commit
bashgit add archivo-con-conflicto.jsx
git commit -m "fix: resolver conflicto en HeroSection al integrar develop"
git push origin feature/tu-rama
Si el conflicto es complejo o afecta logica critica del sistema,
consultar con Samuel antes de resolver.

Como Hacer un Hotfix
Un hotfix es una correccion urgente sobre main cuando existe un error
critico en produccion que no puede esperar el ciclo normal de desarrollo.
Este proceso lo ejecuta unicamente Samuel.
bash# 1. Partir desde main actualizado
git checkout main
git pull origin main

# 2. Crear la rama de hotfix
git checkout -b hotfix/descripcion-del-problema

# 3. Corregir el error y hacer commit
git add .
git commit -m "hotfix: corregir crash en formulario de produccion"

# 4. Mergear a main
git checkout main
git merge hotfix/descripcion-del-problema
git push origin main

# 5. Mergear tambien a develop para no perder la correccion
git checkout develop
git merge hotfix/descripcion-del-problema
git push origin develop

# 6. Eliminar la rama de hotfix
git branch -d hotfix/descripcion-del-problema
git push origin --delete hotfix/descripcion-del-problema

Errores Frecuentes y Como Resolverlos
"You are not on a branch"
Estado detached HEAD. Volver a una rama:
bashgit checkout develop
"Your branch is behind origin/develop"
La rama local esta desactualizada respecto al remoto:
bashgit pull origin develop
"fatal: branch already exists"
Ya existe una rama con ese nombre:
bash# Cambiar a la rama existente
git checkout feature/nombre-existente

# O crear con un nombre diferente
git checkout -b feature/nombre-diferente
Hice commit en la rama equivocada
bash# Deshacer el ultimo commit sin perder los cambios
git reset --soft HEAD~1

# Cambiar a la rama correcta
git checkout feature/rama-correcta

# Hacer el commit en la rama correcta
git add .
git commit -m "feat: descripcion del cambio"
Subi un archivo que no debia (ejemplo: .env)
bash# Quitar el archivo del tracking de Git
git rm --cached .env
git commit -m "chore: remover .env del repositorio"
git push origin nombre-de-la-rama
Despues de ejecutar estos pasos, cambiar inmediatamente todas las
credenciales que hayan quedado expuestas en el historial del repositorio.
Hice merge sin aprobacion por error
Notificar de inmediato a Samuel para evaluar si es necesario revertir
el merge con git revert antes de que el codigo afecte otras ramas.

Reglas de Oro

Nunca hacer push directo a main ni a develop
Siempre hacer git pull origin develop antes de crear una rama
Una rama por tarea — no mezclar funcionalidades distintas
Commits pequenos y frecuentes — facilitan el review y el historial
Ningun integrante aprueba su propio Pull Request
Eliminar la rama despues del merge — mantiene el repositorio limpio
Ante un conflicto complejo, consultar con Samuel antes de resolverlo
Ante cualquier duda sobre este flujo, leer primero CONTRIBUTING.md