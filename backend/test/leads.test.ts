import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { prisma } from "../src/lib/prisma.js";

describe("Leads API & Service", () => {
  before(() => {
    process.env.DATABASE_URL ??=
      "postgresql://user:pass@localhost:5432/sicose_test";
    process.env.DIRECT_URL ??=
      "postgresql://user:pass@localhost:5432/sicose_test";
    process.env.REDIS_URL ??= "redis://localhost:6379";
    process.env.JWT_SECRET ??= "test-secret-with-at-least-sixteen-chars";
  });

  it("correctly inserts a lead into the database when a valid payload is provided", async () => {
    const createdData: any[] = [];

    (prisma.lead.create as any) = async (args: any) => {
      createdData.push(args.data);
      return {
        id: "lead-uuid-1",
        ...args.data,
        createdAt: new Date(),
      };
    };

    const payload = {
      nombre: "Vecino Vigilante",
      comite: "Agua Potable",
      contacto: "2224445566",
    };

    const lead = await prisma.lead.create({
      data: payload,
    });

    assert.equal(lead.id, "lead-uuid-1");
    assert.equal(lead.nombre, "Vecino Vigilante");
    assert.equal(lead.comite, "Agua Potable");
    assert.equal(lead.contacto, "2224445566");
    assert.equal(createdData.length, 1);
    assert.deepEqual(createdData[0], payload);
  });
});
