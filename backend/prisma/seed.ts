import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash("SiCoSe2026!", 12);

async function main() {
  await prisma.comprobante.deleteMany();
  await prisma.pago.deleteMany();
  await prisma.adeudo.deleteMany();
  await prisma.reporte.deleteMany();
  await prisma.auditoria.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.ciudadano.deleteMany();
  await prisma.servicio.deleteMany();

  const usuarios = await prisma.usuario.createMany({
    data: [
      {
        email: "cristian@junta.gob.mx",
        passwordHash,
        nombre: "Cristian",
        rol: "admin",
        activo: true,
      },
      {
        email: "gertrudis@junta.gob.mx",
        passwordHash,
        nombre: "Gertrudis",
        rol: "tesorero",
        activo: true,
      },
      {
        email: "maria.nerida@junta.gob.mx",
        passwordHash,
        nombre: "Maria Nerida",
        rol: "secretaria",
        activo: true,
      },
    ],
  });

  const servicios = await prisma.servicio.createMany({
    data: [
      { nombre: "Agua potable", descripcion: "Suministro de agua potable", tarifa: 45.5 },
      { nombre: "Alcantarillado", descripcion: "Manejo de aguas residuales", tarifa: 32.0 },
      { nombre: "Recoleccion de basura", descripcion: "Servicio de recoleccion semanal", tarifa: 25.0 },
    ],
  });

  const ciudadanos = await prisma.ciudadano.createMany({
    data: [
      {
        nombre: "Maria",
        apellido: "Gonzalez",
        email: "maria.gonzalez@test.com",
        telefono: "5512345678",
        direccion: "Calle 1 #100",
        zona: "Centro",
        clave_catastral: "CAT-0001",
        activo: true,
      },
      {
        nombre: "Jose",
        apellido: "Ramirez",
        email: "jose.ramirez@test.com",
        telefono: "5512345679",
        direccion: "Calle 2 #200",
        zona: "Norte",
        clave_catastral: "CAT-0002",
        activo: true,
      },
      {
        nombre: "Ana",
        apellido: "Lopez",
        email: "ana.lopez@test.com",
        telefono: "5512345680",
        direccion: "Calle 3 #300",
        zona: "Sur",
        clave_catastral: "CAT-0003",
        activo: true,
      },
      {
        nombre: "Luis",
        apellido: "Martinez",
        email: "luis.martinez@test.com",
        telefono: "5512345681",
        direccion: "Calle 4 #400",
        zona: "Centro",
        clave_catastral: "CAT-0004",
        activo: true,
      },
      {
        nombre: "Cecilia",
        apellido: "Sanchez",
        email: "cecilia.sanchez@test.com",
        telefono: "5512345682",
        direccion: "Calle 5 #500",
        zona: "Poniente",
        clave_catastral: "CAT-0005",
        activo: true,
      },
    ],
  });

  const [aguaPotable, alcantarillado, recoleccionBasura] = await prisma.servicio.findMany({
    orderBy: { nombre: "asc" },
  });
  const [ana, cecilia, jose] = await prisma.ciudadano.findMany({
    orderBy: { email: "asc" },
  });

  const adeudos = await prisma.adeudo.createMany({
    data: [
      {
        ciudadanoId: ana.id,
        servicioId: aguaPotable.id,
        monto: 45.5,
        periodo: "2026-06",
        vencimiento: new Date("2026-06-30T00:00:00.000Z"),
        estado: "pendiente",
        pagado: false,
      },
      {
        ciudadanoId: cecilia.id,
        servicioId: alcantarillado.id,
        monto: 32,
        periodo: "2026-06",
        vencimiento: new Date("2026-06-30T00:00:00.000Z"),
        estado: "pendiente",
        pagado: false,
      },
      {
        ciudadanoId: jose.id,
        servicioId: recoleccionBasura.id,
        monto: 25,
        periodo: "2026-06",
        vencimiento: new Date("2026-06-30T00:00:00.000Z"),
        estado: "pendiente",
        pagado: false,
      },
      {
        ciudadanoId: ana.id,
        servicioId: alcantarillado.id,
        monto: 88,
        periodo: "2026-05",
        vencimiento: new Date("2026-05-31T00:00:00.000Z"),
        estado: "vencido",
        pagado: false,
      },
      {
        ciudadanoId: jose.id,
        servicioId: aguaPotable.id,
        monto: 63.5,
        periodo: "2026-05",
        vencimiento: new Date("2026-05-31T00:00:00.000Z"),
        estado: "vencido",
        pagado: false,
      },
    ],
  });

  console.log(
    `Seed completado: ${usuarios.count} usuarios, ${servicios.count} servicios, ${ciudadanos.count} ciudadanos, ${adeudos.count} adeudos creados.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
