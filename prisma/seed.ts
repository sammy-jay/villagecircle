import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const TOPICS = [
  ["career-conversations", "Career conversations"], ["college-guidance", "College guidance"], ["internship-advice", "Internship advice"], ["resume-review", "Résumé review"],
  ["interview-preparation", "Interview preparation"], ["entrepreneurship", "Entrepreneurship"], ["leadership-development", "Leadership development"], ["industry-exposure", "Industry exposure"], ["professional-networks", "Professional networks"],
];
const LATER = [["job-shadowing", "Job shadowing"], ["professional-introductions", "Professional introductions"]];

(async () => {
  let i = 0;
  for (const [slug, name] of TOPICS) await db.topic.upsert({ where: { slug }, update: { name }, create: { slug, name, sortOrder: i++, guidedPrompts: [] } });
  for (const [slug, name] of LATER) await db.topic.upsert({ where: { slug }, update: { name, later: true, active: false }, create: { slug, name, later: true, active: false, sortOrder: i++, guidedPrompts: [] } });
  const email = (process.env.SEED_ADMIN_EMAIL || "").toLowerCase(); const pw = process.env.SEED_ADMIN_PASSWORD;
  if (email && pw) {
    await db.user.upsert({ where: { email }, update: { roles: ["ADMIN", "SAFEGUARDING_LEAD"] }, create: { email, name: process.env.SEED_ADMIN_NAME || "Admin", passwordHash: await bcrypt.hash(pw, 12), roles: ["ADMIN", "SAFEGUARDING_LEAD"], emailVerified: new Date(), dateOfBirth: new Date("1990-01-01") } });
    console.log(`Admin ready: ${email} (you'll set up two-step sign-in on first login)`);
  } else console.log("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create the first admin.");
  console.log(`Topics seeded: ${TOPICS.length + LATER.length}`);
  await db.$disconnect();
})();
