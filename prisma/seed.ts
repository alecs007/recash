import { PrismaClient, UserRole, PostStatus, BadgeType } from "@prisma/client";
import { fakerRO as faker } from "@faker-js/faker";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

// ── Name pools ────────────────────────────────────────────────────────────────

const femaleFirstNames = [
  "Maria",
  "Elena",
  "Ana",
  "Ioana",
  "Andreea",
  "Alexandra",
  "Cristina",
  "Gabriela",
  "Mihaela",
  "Roxana",
  "Alina",
  "Raluca",
  "Simona",
  "Laura",
  "Ileana",
  "Luminița",
  "Florina",
  "Daniela",
  "Nicoleta",
  "Georgiana",
  "Teodora",
  "Bianca",
  "Larisa",
  "Denisa",
  "Valentina",
  "Corina",
  "Lavinia",
  "Oana",
  "Diana",
  "Adelina",
];

const maleFirstNames = [
  "Andrei",
  "Alexandru",
  "Mihai",
  "Cristian",
  "Ion",
  "George",
  "Bogdan",
  "Florin",
  "Marian",
  "Daniel",
  "Radu",
  "Vlad",
  "Sorin",
  "Lucian",
  "Ionuț",
  "Cătălin",
  "Adrian",
  "Constantin",
  "Dragoș",
  "Nicolae",
  "Tudor",
  "Cosmin",
  "Claudiu",
  "Laurențiu",
  "Vasile",
  "Gabriel",
  "Valentin",
  "Silviu",
  "Octavian",
  "Traian",
];

const lastNames = [
  "Popescu",
  "Ionescu",
  "Popa",
  "Constantin",
  "Gheorghe",
  "Stoica",
  "Dumitrescu",
  "Stan",
  "Matei",
  "Mihai",
  "Florescu",
  "Moldovan",
  "Ștefan",
  "Rusu",
  "Petrescu",
  "Neagu",
  "Bogdan",
  "Dima",
  "Marin",
  "Dobre",
  "Sandu",
  "Tudor",
  "Nistor",
  "Ilie",
  "Radu",
  "Dragomir",
  "Vasilescu",
  "Toma",
  "Lazar",
  "Cojocaru",
];

type Gender = "female" | "male";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePerson(index: number): { name: string; gender: Gender } {
  const gender: Gender = index % 2 === 0 ? "female" : "male";
  const firstName =
    gender === "female" ? pick(femaleFirstNames) : pick(maleFirstNames);
  return { name: `${firstName} ${pick(lastNames)}`, gender };
}

function avatarUrl(gender: Gender, index: number): string {
  const seed = (index % 99) + 1;
  return `https://randomuser.me/api/portraits/${gender === "female" ? "women" : "men"}/${seed}.jpg`;
}

// ── Locations ──────────────────────────────────────────────────────────────────

const locations = [
  {
    name: "Drumul Taberei",
    address: "Strada Brașov 25, București",
    lat: 44.4211,
    lng: 26.0234,
  },
  {
    name: "Mărăști",
    address: "Bulevardul 21 Decembrie 1989, Cluj-Napoca",
    lat: 46.7772,
    lng: 23.6105,
  },
  {
    name: "Zona Soarelui",
    address: "Strada Aștrilor, Timișoara",
    lat: 45.7351,
    lng: 21.2411,
  },
  {
    name: "Centru Civic",
    address: "Bulevardul Anastasie Panu, Iași",
    lat: 47.1569,
    lng: 27.5875,
  },
  {
    name: "Faleză Nord",
    address: "Strada Pescarilor, Constanța",
    lat: 44.1982,
    lng: 28.6511,
  },
  {
    name: "Răcădău",
    address: "Bulevardul Muncii, Brașov",
    lat: 45.6285,
    lng: 25.6022,
  },
  {
    name: "Micro 19",
    address: "Strada Oțelarilor, Galați",
    lat: 45.4111,
    lng: 28.0122,
  },
  {
    name: "Craiovița Nouă",
    address: "Bulevardul Oltenia, Craiova",
    lat: 44.3312,
    lng: 23.7711,
  },
  {
    name: "Vlaicu",
    address: "Calea Aurel Vlaicu, Arad",
    lat: 46.1921,
    lng: 21.2911,
  },
  {
    name: "Rogerius",
    address: "Strada Corneliu Coposu, Oradea",
    lat: 47.0722,
    lng: 21.9111,
  },
  {
    name: "Burdujeni",
    address: "Calea Unirii, Suceava",
    lat: 47.6611,
    lng: 26.2711,
  },
  {
    name: "Nord Ploiești",
    address: "Bulevardul Republicii, Ploiești",
    lat: 44.9511,
    lng: 26.0122,
  },
  {
    name: "Trivale",
    address: "Bulevardul Libertății, Pitești",
    lat: 44.8611,
    lng: 24.8511,
  },
  {
    name: "Hula",
    address: "Strada Mihai Viteazul, Sibiu",
    lat: 45.7911,
    lng: 24.1511,
  },
  {
    name: "Zorilor",
    address: "Strada Observatorului, Cluj-Napoca",
    lat: 46.7511,
    lng: 23.5811,
  },
  {
    name: "Berceni",
    address: "Șoseaua Berceni, București Sector 4",
    lat: 44.3811,
    lng: 26.1211,
  },
  {
    name: "Copou",
    address: "Bulevardul Carol I, Iași",
    lat: 47.1811,
    lng: 27.5611,
  },
  {
    name: "Titan",
    address: "Bulevardul Nicolae Grigorescu, București",
    lat: 44.4177,
    lng: 26.1601,
  },
  {
    name: "Iosefin",
    address: "Bulevardul Regele Carol I, Timișoara",
    lat: 45.7444,
    lng: 21.2133,
  },
  {
    name: "Hipodrom",
    address: "Calea Călărașilor, Brăila",
    lat: 45.2612,
    lng: 27.9511,
  },
  {
    name: "Păcurari",
    address: "Șoseaua Păcurari, Iași",
    lat: 47.1744,
    lng: 27.5511,
  },
  {
    name: "Steagu",
    address: "Calea București, Brașov",
    lat: 45.6412,
    lng: 25.6311,
  },
  {
    name: "Emanuil Gojdu",
    address: "Piața Emanuil Gojdu, Oradea",
    lat: 47.0561,
    lng: 21.9355,
  },
  {
    name: "Zimbru",
    address: "Bulevardul Dacia, Iași",
    lat: 47.1611,
    lng: 27.5611,
  },
  {
    name: "Centru Satu Mare",
    address: "Piața Unirii, Satu Mare",
    lat: 47.7911,
    lng: 22.8811,
  },
  {
    name: "Cornișa",
    address: "Strada Mioriței, Bacău",
    lat: 46.5622,
    lng: 26.9133,
  },
  {
    name: "Micro 14",
    address: "Bulevardul Unirii, Buzău",
    lat: 45.1489,
    lng: 26.8233,
  },
  {
    name: "Tudor Vladimirescu",
    address: "Bulevardul Mihai Eminescu, Botoșani",
    lat: 47.7411,
    lng: 26.6722,
  },
  {
    name: "Tudor",
    address: "Bulevardul 1 Decembrie 1918, Târgu Mureș",
    lat: 46.5333,
    lng: 24.5766,
  },
  {
    name: "Săsar",
    address: "Bulevardul Independenței, Baia Mare",
    lat: 47.6622,
    lng: 23.5744,
  },
  {
    name: "Ostroveni",
    address: "Bulevardul Tineretului, Râmnicu Vâlcea",
    lat: 45.0911,
    lng: 24.3722,
  },
  {
    name: "Dărmănești",
    address: "Bulevardul Decebal, Piatra Neamț",
    lat: 46.9411,
    lng: 26.3622,
  },
  {
    name: "Crihala",
    address: "Bulevardul Mihai Viteazul, Drobeta-Turnu Severin",
    lat: 44.6311,
    lng: 22.6566,
  },
  {
    name: "Sud Focșani",
    address: "Bulevardul București, Focșani",
    lat: 45.6911,
    lng: 27.1866,
  },
  {
    name: "Micro 6",
    address: "Bulevardul Unirii, Târgoviște",
    lat: 44.9244,
    lng: 25.4566,
  },
  {
    name: "Cetate",
    address: "Bulevardul Transilvaniei, Alba Iulia",
    lat: 46.0733,
    lng: 23.5766,
  },
  {
    name: "Dorobanți",
    address: "Bulevardul Decebal, Deva",
    lat: 45.8766,
    lng: 22.9133,
  },
  {
    name: "Crișan",
    address: "Strada Crișan, Slatina",
    lat: 44.4311,
    lng: 24.3622,
  },
  {
    name: "Dumbrava",
    address: "Bulevardul Mihai Viteazul, Zalău",
    lat: 47.1866,
    lng: 23.0566,
  },
  {
    name: "Govândari",
    address: "Bulevardul Republicii, Reșița",
    lat: 45.2966,
    lng: 21.8988,
  },
  {
    name: "Unirea",
    address: "Bulevardul Independenței, Bistrița",
    lat: 47.1366,
    lng: 24.4922,
  },
  {
    name: "E3",
    address: "Strada Babadag, Tulcea",
    lat: 45.1766,
    lng: 28.7911,
  },
  {
    name: "Dallas",
    address: "Bulevardul Republicii, Alexandria",
    lat: 43.9744,
    lng: 25.3311,
  },
  {
    name: "Valea Trandafirilor",
    address: "Strada Călugăreni, Giurgiu",
    lat: 43.9033,
    lng: 25.9699,
  },
  {
    name: "Big",
    address: "Bulevardul Traian, Hunedoara",
    lat: 45.7566,
    lng: 22.9033,
  },
];

const descriptions = [
  "Ambalaje SGR strânse cu grijă, curate.",
  "Doze și PET-uri amestecate, coduri vizibile.",
  "Sac mare gata de ridicare, la intrarea blocului.",
  "Sticle de sticlă returnabile, fără resturi.",
  "Aproximativ 2-3 sacoșe, la parter scara A.",
  "Colectate din birou pe ultima lună.",
  "Curate, fără lichid, coduri SGR vizibile.",
  "La poartă, sună înainte să vii.",
  "PET-uri și doze, lângă tomberon.",
  "Sticle mixte, disponibil toată ziua.",
  "Colectate din eveniment privat, impecabile.",
  "",
];

// ── Badge helpers ─────────────────────────────────────────────────────────────

function badgesForUser(
  postCount: number,
  collectionCount: number,
  totalBottles: number,
  txCount: number,
  reputationScore: number,
  ratingCount: number,
  memberDays: number,
): BadgeType[] {
  const badges: BadgeType[] = [];

  if (postCount >= 1) badges.push("FIRST_POST");
  if (postCount >= 10) badges.push("POST_VETERAN_10");
  if (postCount >= 50) badges.push("POST_VETERAN_50");
  if (postCount >= 100) badges.push("POST_VETERAN_100");

  if (collectionCount >= 1) badges.push("FIRST_COLLECTION");
  if (collectionCount >= 10) badges.push("COLLECTOR_STARTER_10");
  if (collectionCount >= 50) badges.push("COLLECTOR_PRO_50");
  if (collectionCount >= 100) badges.push("COLLECTOR_ELITE_100");

  if (totalBottles >= 50) badges.push("ECO_STARTER");
  if (totalBottles >= 250) badges.push("ECO_WARRIOR");
  if (totalBottles >= 1000) badges.push("ECO_CHAMPION");
  if (totalBottles >= 5000) badges.push("ECO_LEGEND");

  if (txCount >= 100) badges.push("CENTURION");
  if (memberDays <= 7 && txCount >= 1) badges.push("FIRST_WEEK");
  if (ratingCount >= 10 && reputationScore >= 4.9)
    badges.push("PERFECT_RATING");

  return [...new Set(badges)];
}

// ── Review text pool ──────────────────────────────────────────────────────────

const positiveReviews = [
  "Super rapid și de treabă, recomand!",
  "A venit exact la timp, totul ok.",
  "Comunicare excelentă, fără probleme.",
  "Profesionist, punctual, mulțumesc!",
  "A fost un schimb plăcut, revenim.",
  "Foarte drăguț și serios.",
  null,
  null,
  null,
];

const negativeReviews = [
  "A întârziat puțin dar s-a descurcat.",
  "Ok, dar comunicarea putea fi mai bună.",
  null,
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("ℹ️  Additive seed — existing data is kept.");

  // ── 1. Create users ────────────────────────────────────────────────────────
  const USER_COUNT = 80;
  console.log(`👤 Creating ${USER_COUNT} users...`);

  // Avoid unique-email collisions with users already in the database
  const existingUsers = await prisma.user.findMany({
    select: { email: true },
  });
  const usedEmails = new Set<string>(
    existingUsers.map((u) => u.email?.toLowerCase()).filter(Boolean) as string[],
  );
  const userIds: string[] = [];

  for (let i = 0; i < USER_COUNT; i++) {
    const { name, gender } = generatePerson(i);

    let email = faker.internet.email().toLowerCase();
    while (usedEmails.has(email)) {
      email = faker.internet.email().toLowerCase();
    }
    usedEmails.add(email);

    // Spread join dates: some veterans, some newer
    const daysAgo =
      i < 10 ? rand(300, 730) : i < 40 ? rand(30, 299) : rand(1, 29);
    const createdAt = new Date(Date.now() - daysAgo * 86400_000);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        emailVerified: createdAt,
        image: avatarUrl(gender, i),
        role: UserRole.BOTH,
        createdAt,
        updatedAt: createdAt,
        accounts: {
          create: {
            type: "oidc",
            provider: "google",
            providerAccountId: faker.string.numeric(21),
            access_token: "ya29." + faker.string.alphanumeric(40),
            token_type: "bearer",
            scope: "openid https://www.googleapis.com/auth/userinfo.profile",
          },
        },
      },
    });

    userIds.push(user.id);
  }

  console.log(`✅ ${USER_COUNT} users created.`);

  // ── 2. Create completed posts + transactions ───────────────────────────────
  // Each user will have 0-8 completed posts where they were the poster,
  // and each completed post gets a matching transaction + mutual reviews.

  console.log("📦 Generating completed posts & transactions...");

  // Track per-user counters so we can update User fields correctly at the end
  type UserStats = {
    bottlesGiven: number;
    bottlesCollected: number;
    totalTransactions: number;
    totalEarned: number;
    totalSaved: number;
    posterTxIds: string[]; // transaction ids where this user is poster
    collectorTxIds: string[];
    postCount: number;
    collectionCount: number;
  };

  const stats: Record<string, UserStats> = {};
  for (const uid of userIds) {
    stats[uid] = {
      bottlesGiven: 0,
      bottlesCollected: 0,
      totalTransactions: 0,
      totalEarned: 0,
      totalSaved: 0,
      posterTxIds: [],
      collectorTxIds: [],
      postCount: 0,
      collectionCount: 0,
    };
  }

  // We'll collect (transactionId, posterId, collectorId) for rating pass
  type TxRecord = {
    txId: string;
    postId: string;
    posterId: string;
    collectorId: string;
    bottleCount: number;
    completedAt: Date;
  };
  const txRecords: TxRecord[] = [];

  for (const posterId of userIds) {
    // Power users get more completed posts
    const posterStats = stats[posterId];
    const isVeteran = userIds.indexOf(posterId) < 15;
    const completedCount = isVeteran ? rand(4, 8) : rand(0, 3);

    for (let p = 0; p < completedCount; p++) {
      // Pick a random collector that is not the poster
      const otherUsers = userIds.filter((id) => id !== posterId);
      const collectorId = pick(otherUsers);

      const bottleCount = pick([
        5, 10, 15, 20, 25, 33, 40, 50, 60, 80, 100, 120,
      ]);
      const collectorSharePercent = pick([25, 30, 40, 50, 60, 75, 100]);
      const estimatedValue = bottleCount * 0.5;
      const actualValue = estimatedValue;
      const collectorEarning = parseFloat(
        ((actualValue * collectorSharePercent) / 100).toFixed(2),
      );
      const posterEarning = parseFloat(
        (actualValue - collectorEarning).toFixed(2),
      );
      const location = pick(locations);

      // completedAt: between 1 and 180 days ago
      const daysAgo = rand(1, 180);
      const completedAt = new Date(Date.now() - daysAgo * 86400_000);
      const createdAt = new Date(
        completedAt.getTime() - rand(1, 48) * 3600_000,
      );
      const claimedAt = new Date(completedAt.getTime() - rand(10, 55) * 60_000);

      const post = await prisma.post.create({
        data: {
          authorId: posterId,
          collectorId,
          status: PostStatus.COMPLETED,
          description: pick(descriptions),
          bottleCount,
          estimatedValue,
          collectorSharePercent,
          images: [],
          latitude: location.lat + (Math.random() - 0.5) * 0.02,
          longitude: location.lng + (Math.random() - 0.5) * 0.02,
          locationName: location.name,
          address: location.address,
          createdAt,
          updatedAt: completedAt,
          claimedAt,
          completedAt,
          expiresAt: new Date(completedAt.getTime() + rand(20, 55) * 60_000),
        },
      });

      const tx = await prisma.transaction.create({
        data: {
          postId: post.id,
          posterId,
          collectorId,
          bottleCount,
          actualValue,
          collectorEarning,
          posterEarning,
          completedAt,
          createdAt: completedAt,
        },
      });

      // Update in-memory counters
      posterStats.bottlesGiven += bottleCount;
      posterStats.totalTransactions += 1;
      posterStats.totalSaved += posterEarning;
      posterStats.posterTxIds.push(tx.id);
      posterStats.postCount += 1;

      const cs = stats[collectorId];
      cs.bottlesCollected += bottleCount;
      cs.totalTransactions += 1;
      cs.totalEarned += collectorEarning;
      cs.collectorTxIds.push(tx.id);
      cs.collectionCount += 1;

      txRecords.push({
        txId: tx.id,
        postId: post.id,
        posterId,
        collectorId,
        bottleCount,
        completedAt,
      });
    }
  }

  console.log(`✅ ${txRecords.length} completed transactions created.`);

  // ── 3. Add ratings & reviews to transactions ───────────────────────────────
  console.log("⭐ Adding ratings and reviews...");

  // Collect ratings per user so we can compute reputation correctly
  type RatingEntry = { score: number };
  const ratingsReceived: Record<string, RatingEntry[]> = {};
  for (const uid of userIds) ratingsReceived[uid] = [];

  for (const tx of txRecords) {
    // ~85% of transactions get a poster rating
    const posterRates = Math.random() < 0.85;
    // ~75% of transactions get a collector rating
    const collectorRates = Math.random() < 0.75;

    const posterRating = posterRates
      ? Math.random() < 0.8
        ? rand(4, 5)
        : rand(2, 3)
      : null;
    const collectorRating = collectorRates
      ? Math.random() < 0.8
        ? rand(4, 5)
        : rand(2, 3)
      : null;

    const posterReview =
      posterRates && posterRating !== null
        ? posterRating >= 4
          ? pick(positiveReviews)
          : pick(negativeReviews)
        : null;

    const collectorReview =
      collectorRates && collectorRating !== null
        ? collectorRating >= 4
          ? pick(positiveReviews)
          : pick(negativeReviews)
        : null;

    const posterRatedAt = posterRates
      ? new Date(tx.completedAt.getTime() + rand(5, 120) * 60_000)
      : null;
    const collectorRatedAt = collectorRates
      ? new Date(tx.completedAt.getTime() + rand(5, 120) * 60_000)
      : null;

    await prisma.transaction.update({
      where: { id: tx.txId },
      data: {
        posterRating,
        posterReview,
        posterRatedAt,
        collectorRating,
        collectorReview,
        collectorRatedAt,
      },
    });

    // collectorRating is given BY the collector TO the poster
    if (collectorRating !== null) {
      ratingsReceived[tx.posterId].push({ score: collectorRating });
    }
    // posterRating is given BY the poster TO the collector
    if (posterRating !== null) {
      ratingsReceived[tx.collectorId].push({ score: posterRating });
    }
  }

  console.log("✅ Ratings applied.");

  // ── 4. Update user aggregate fields ───────────────────────────────────────
  console.log("📊 Updating user aggregate stats...");

  for (const uid of userIds) {
    const s = stats[uid];
    const received = ratingsReceived[uid];
    const ratingCount = received.length;
    const reputationScore =
      ratingCount > 0
        ? parseFloat(
            (
              received.reduce((sum, r) => sum + r.score, 0) / ratingCount
            ).toFixed(2),
          )
        : 0;

    await prisma.user.update({
      where: { id: uid },
      data: {
        totalBottlesGiven: s.bottlesGiven,
        totalBottlesCollected: s.bottlesCollected,
        totalTransactions: s.totalTransactions,
        totalEarned: parseFloat(s.totalEarned.toFixed(2)),
        totalSaved: parseFloat(s.totalSaved.toFixed(2)),
        reputationScore,
        ratingCount,
      },
    });
  }

  console.log("✅ User stats updated.");

  // ── 5. Award badges ────────────────────────────────────────────────────────
  console.log("🏆 Awarding badges...");

  for (const uid of userIds) {
    const s = stats[uid];
    const received = ratingsReceived[uid];
    const ratingCount = received.length;
    const reputationScore =
      ratingCount > 0
        ? received.reduce((sum, r) => sum + r.score, 0) / ratingCount
        : 0;
    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: { createdAt: true },
    });
    const memberDays = user
      ? Math.floor((Date.now() - user.createdAt.getTime()) / 86400_000)
      : 999;

    const totalBottles = s.bottlesGiven + s.bottlesCollected;
    const earnedTypes = badgesForUser(
      s.postCount,
      s.collectionCount,
      totalBottles,
      s.totalTransactions,
      reputationScore,
      ratingCount,
      memberDays,
    );

    for (const type of earnedTypes) {
      const earnedAt = new Date(Date.now() - rand(0, 30) * 86400_000);
      await prisma.badge.create({
        data: { userId: uid, type, earnedAt, seen: Math.random() > 0.2 },
      });
    }
  }

  console.log("✅ Badges awarded.");

  // ── 6. Create active (OPEN) posts — main map feed ─────────────────────────
  const OPEN_POST_COUNT = 121;
  console.log(`🗺️  Creating ${OPEN_POST_COUNT} active OPEN posts...`);

  // Exactly 121 open posts, spread across all cities and users,
  // with no expiry (expiresAt: null = unlimited time).
  for (let i = 0; i < OPEN_POST_COUNT; i++) {
    const posterId = userIds[i % userIds.length];

    const bottleCount = pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100]);
    const collectorSharePercent = pick([25, 30, 40, 50, 60, 75, 100]);
    const estimatedValue = bottleCount * 0.5;
    // Cycle through locations so every city gets posts, then randomize extras
    const location =
      i < locations.length ? locations[i] : pick(locations);
    const createdAt = new Date(Date.now() - rand(0, 48) * 3600_000);

    await prisma.post.create({
      data: {
        authorId: posterId,
        status: PostStatus.OPEN,
        description: pick(descriptions),
        bottleCount,
        estimatedValue,
        collectorSharePercent,
        images: [],
        latitude: location.lat + (Math.random() - 0.5) * 0.04,
        longitude: location.lng + (Math.random() - 0.5) * 0.04,
        locationName: location.name,
        address: location.address,
        createdAt,
        updatedAt: createdAt,
        expiresAt: null, // no expiry — unlimited time
      },
    });
  }

  console.log(`✅ ${OPEN_POST_COUNT} OPEN posts created.`);

  // ── 7. Create a few CLAIMED posts (waiting for approval) ──────────────────
  console.log("⏳ Creating CLAIMED posts...");

  // Pick users that don't already have an active post as author/collector
  const usersWithOpenPost = new Set(
    (
      await prisma.post.findMany({
        where: { status: PostStatus.OPEN },
        select: { authorId: true },
      })
    ).map((p) => p.authorId),
  );

  let claimedCount = 0;
  const shuffled = [...userIds].sort(() => Math.random() - 0.5);

  for (let i = 0; i < shuffled.length && claimedCount < 8; i++) {
    const posterId = shuffled[i];
    if (usersWithOpenPost.has(posterId)) continue;

    // Candidate requesters — several collectors can request the same post.
    const otherUsers = userIds.filter((id) => id !== posterId);
    if (otherUsers.length === 0) continue;
    const requesterCount = Math.min(otherUsers.length, rand(1, 3));
    const requesters = [...otherUsers]
      .sort(() => Math.random() - 0.5)
      .slice(0, requesterCount);

    const bottleCount = pick([10, 20, 30, 50]);
    const collectorSharePercent = pick([30, 50, 75]);
    const estimatedValue = bottleCount * 0.5;
    const location = pick(locations);
    const createdAt = new Date(Date.now() - rand(1, 6) * 3600_000);
    const claimedAt = new Date(Date.now() - rand(5, 55) * 60_000);
    const expiresAt = new Date(createdAt.getTime() + 72 * 3600_000);

    // A CLAIMED post keeps collectorId null; the pending requests live in
    // ClaimRequest until the author approves one.
    const post = await prisma.post.create({
      data: {
        authorId: posterId,
        status: PostStatus.CLAIMED,
        description: pick(descriptions),
        bottleCount,
        estimatedValue,
        collectorSharePercent,
        images: [],
        latitude: location.lat + (Math.random() - 0.5) * 0.04,
        longitude: location.lng + (Math.random() - 0.5) * 0.04,
        locationName: location.name,
        address: location.address,
        createdAt,
        updatedAt: claimedAt,
        claimedAt,
        expiresAt,
      },
    });

    await prisma.claimRequest.createMany({
      data: requesters.map((collectorId, idx) => ({
        postId: post.id,
        collectorId,
        status: "PENDING" as const,
        createdAt: new Date(claimedAt.getTime() + idx * 60_000),
      })),
    });

    usersWithOpenPost.add(posterId);
    claimedCount++;
  }

  console.log(`✅ ${claimedCount} CLAIMED posts created.`);

  // ── 8. Create a few IN_PROGRESS posts ─────────────────────────────────────
  console.log("🚴 Creating IN_PROGRESS posts...");

  let inProgressCount = 0;
  const shuffled2 = [...userIds].sort(() => Math.random() - 0.5);

  for (let i = 0; i < shuffled2.length && inProgressCount < 5; i++) {
    const posterId = shuffled2[i];
    if (usersWithOpenPost.has(posterId)) continue;

    const otherFree = userIds.filter(
      (id) => id !== posterId && !usersWithOpenPost.has(id),
    );
    if (otherFree.length === 0) continue;
    const collectorId = pick(otherFree);

    const bottleCount = pick([10, 20, 25, 40, 50]);
    const collectorSharePercent = pick([30, 50, 75]);
    const estimatedValue = bottleCount * 0.5;
    const location = pick(locations);
    const createdAt = new Date(Date.now() - rand(2, 8) * 3600_000);
    const claimedAt = new Date(Date.now() - rand(20, 55) * 60_000);
    // 30-minute collection window from approval, still live
    const expiresAt = new Date(Date.now() + rand(5, 25) * 60_000);

    await prisma.post.create({
      data: {
        authorId: posterId,
        collectorId,
        status: PostStatus.IN_PROGRESS,
        description: pick(descriptions),
        bottleCount,
        estimatedValue,
        collectorSharePercent,
        images: [],
        latitude: location.lat + (Math.random() - 0.5) * 0.04,
        longitude: location.lng + (Math.random() - 0.5) * 0.04,
        locationName: location.name,
        address: location.address,
        createdAt,
        updatedAt: claimedAt,
        claimedAt,
        expiresAt,
      },
    });

    usersWithOpenPost.add(posterId);
    usersWithOpenPost.add(collectorId);
    inProgressCount++;
  }

  console.log(`✅ ${inProgressCount} IN_PROGRESS posts created.`);

  // ── 9. Create some CANCELLED and EXPIRED posts ────────────────────────────
  console.log("❌ Creating CANCELLED/EXPIRED posts...");

  let otherStatusCount = 0;
  for (const posterId of userIds) {
    if (Math.random() > 0.3) continue; // only ~30% of users

    const status =
      Math.random() < 0.5 ? PostStatus.CANCELLED : PostStatus.EXPIRED;
    const bottleCount = pick([5, 10, 20, 30, 50]);
    const collectorSharePercent = pick([30, 50, 75]);
    const estimatedValue = bottleCount * 0.5;
    const location = pick(locations);
    const daysAgo = rand(2, 60);
    const createdAt = new Date(Date.now() - daysAgo * 86400_000);
    const expiresAt =
      status === PostStatus.EXPIRED
        ? new Date(createdAt.getTime() + 24 * 3600_000) // already past
        : new Date(createdAt.getTime() + 72 * 3600_000);

    await prisma.post.create({
      data: {
        authorId: posterId,
        status,
        description: pick(descriptions),
        bottleCount,
        estimatedValue,
        collectorSharePercent,
        images: [],
        latitude: location.lat + (Math.random() - 0.5) * 0.04,
        longitude: location.lng + (Math.random() - 0.5) * 0.04,
        locationName: location.name,
        address: location.address,
        createdAt,
        updatedAt: createdAt,
        expiresAt,
      },
    });

    otherStatusCount++;
  }

  console.log(`✅ ${otherStatusCount} CANCELLED/EXPIRED posts created.`);

  // ── 10. Summary ───────────────────────────────────────────────────────────
  const [totalUsers, totalPosts, totalTx, totalBadges] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.transaction.count(),
    prisma.badge.count(),
  ]);

  console.log("\n🎉 Seed complete!");
  console.log(`   👤 Users:        ${totalUsers}`);
  console.log(`   📦 Posts:        ${totalPosts}`);
  console.log(`   💳 Transactions: ${totalTx}`);
  console.log(`   🏆 Badges:       ${totalBadges}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
