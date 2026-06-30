import { PrismaClient } from "@prisma/client";
import { planLeadDedupeBackfill } from "../leads/lead-dedupe-backfill";

const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.findMany({
    select: {
      id: true,
      workspaceId: true,
      name: true,
      address: true,
      phone: true,
      website: true,
      instagramUrl: true,
      referenceUrl: true,
      dedupeKey: true,
      createdAt: true,
    },
    orderBy: [{ workspaceId: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });
  const plan = planLeadDedupeBackfill(leads);

  for (const update of plan.updates) {
    await prisma.lead.update({
      where: { id: update.id },
      data: { dedupeKey: update.dedupeKey },
    });
  }

  console.log(JSON.stringify({
    scanned: leads.length,
    alreadyFilled: plan.alreadyFilled,
    updated: plan.updates.length,
    skippedDuplicates: plan.skippedDuplicates.length,
    skippedNoKey: plan.skippedNoKey.length,
    duplicateSamples: plan.skippedDuplicates.slice(0, 10),
    noKeySamples: plan.skippedNoKey.slice(0, 10),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
