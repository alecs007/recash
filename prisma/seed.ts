import { PrismaClient, UserRole, PostStatus } from "@prisma/client";
import { fakerRO } from "@faker-js/faker";

const prisma = new PrismaClient();

const uniqueLocations = [
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
    name: "Nord",
    address: "Bulevardul Republicii, Ploiești",
    lat: 44.9511,
    lng: 26.0122,
  },
  {
    name: "Ostreni",
    address: "Calea lui Traian, Râmnicu Vâlcea",
    lat: 45.1011,
    lng: 24.3611,
  },
  {
    name: "Trivale",
    address: "Bulevardul Libertății, Pitești",
    lat: 44.8611,
    lng: 24.8511,
  },
  {
    name: "Grădiște",
    address: "Strada Independenței, Slatina",
    lat: 44.4311,
    lng: 24.3611,
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
    name: "Cetate",
    address: "Calea Moților, Alba Iulia",
    lat: 46.0711,
    lng: 23.5611,
  },
  {
    name: "Săsar",
    address: "Bulevardul Independenței, Baia Mare",
    lat: 47.6581,
    lng: 23.5672,
  },
  {
    name: "7 Noiembrie",
    address: "Strada 22 Decembrie, Târgu Mureș",
    lat: 46.5552,
    lng: 24.5721,
  },
  {
    name: "Gara Veche",
    address: "Strada Gării, Piatra Neamț",
    lat: 46.9281,
    lng: 26.3712,
  },
  {
    name: "Central",
    address: "Strada Isaccei, Tulcea",
    lat: 45.1782,
    lng: 28.8021,
  },
  {
    name: "Obcini",
    address: "Bulevardul 1 Mai, Suceava",
    lat: 47.6421,
    lng: 26.2412,
  },
  {
    name: "Hipodrom",
    address: "Calea Călărașilor, Brăila",
    lat: 45.2612,
    lng: 27.9511,
  },
  {
    name: "George Enescu",
    address: "Strada Victoriei, Botoșani",
    lat: 47.7421,
    lng: 26.6612,
  },
  {
    name: "Lumina",
    address: "Bulevardul Unirii, Buzău",
    lat: 45.1512,
    lng: 26.8211,
  },
  {
    name: "Steagu",
    address: "Calea București, Brașov",
    lat: 45.6412,
    lng: 25.6311,
  },
  {
    name: "Micro 3",
    address: "Bulevardul Decebal, Deva",
    lat: 45.8721,
    lng: 22.9012,
  },
  {
    name: "Păcurari",
    address: "Șoseaua Păcurari, Iași",
    lat: 47.1744,
    lng: 27.5511,
  },
  {
    name: "Titan",
    address: "Bulevardul Nicolae Grigorescu, București",
    lat: 44.4177,
    lng: 26.1601,
  },
  {
    name: "Emanuil Gojdu",
    address: "Piața Emanuil Gojdu, Oradea",
    lat: 47.0561,
    lng: 21.9355,
  },
  {
    name: "Iosefin",
    address: "Bulevardul Regele Carol I, Timișoara",
    lat: 45.7444,
    lng: 21.2133,
  },
  {
    name: "Zimbru",
    address: "Bulevardul Dacia, Iași",
    lat: 47.1611,
    lng: 27.5611,
  },
  {
    name: "Lăpuș",
    address: "Calea București, Craiova",
    lat: 44.3188,
    lng: 23.8155,
  },
  {
    name: "Micro 6",
    address: "Bulevardul Unirii, Târgoviște",
    lat: 44.9211,
    lng: 25.4522,
  },
  {
    name: "Bariera Ploiești",
    address: "Strada Transilvaniei, Buzău",
    lat: 45.1611,
    lng: 26.8111,
  },
  {
    name: "Nord",
    address: "Calea Basarabiei, Huși",
    lat: 46.6711,
    lng: 28.0511,
  },
  {
    name: "Centru",
    address: "Piața Unirii, Satu Mare",
    lat: 47.7911,
    lng: 22.8811,
  },
];

async function main() {
  console.log("🧹 Reseting database...");
  await prisma.transaction.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.post.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const createdUsers = [];
  const usedEmails = new Set<string>();

  console.log("👤 Creating 121 unique users...");
  for (let i = 0; i < 121; i++) {
    let email = fakerRO.internet.email().toLowerCase();
    while (usedEmails.has(email)) {
      email = fakerRO.internet.email().toLowerCase();
    }
    usedEmails.add(email);

    const user = await prisma.user.create({
      data: {
        name: fakerRO.person.fullName(),
        email: email,
        emailVerified: new Date(),
        image: `https://i.pravatar.cc/150?u=${email}`,
        role: UserRole.BOTH,
        reputationScore: parseFloat(
          (Math.random() * (5.0 - 2.2) + 2.2).toFixed(1),
        ),
        accounts: {
          create: {
            type: "oidc",
            provider: "google",
            providerAccountId: fakerRO.string.numeric(21),
            access_token: "ya29." + fakerRO.string.alphanumeric(40),
            token_type: "bearer",
            scope: "openid https://www.googleapis.com/auth/userinfo.profile",
          },
        },
      },
    });
    createdUsers.push(user);
  }

  console.log("📦 Generating 121 posts...");
  for (let i = 0; i < 121; i++) {
    const author = createdUsers[i];
    const location = fakerRO.helpers.arrayElement(uniqueLocations);
    const bottleCount = fakerRO.helpers.arrayElement([
      12, 24, 33, 45, 60, 85, 121,
    ]);

    await prisma.post.create({
      data: {
        authorId: author.id,
        status: fakerRO.helpers.weightedArrayElement([
          { weight: 8, value: PostStatus.OPEN },
          { weight: 1, value: PostStatus.CANCELLED },
          { weight: 1, value: PostStatus.COMPLETED },
        ]),
        description: fakerRO.helpers.arrayElement([
          "Ambalaje SGR strânse cu grijă.",
          "Doze și PET-uri amestecate.",
          "Sac mare, gata de ridicare.",
          "Sticle de sticlă returnabile.",
          "121 de motive pentru a recicla!",
          "Colectate din birou.",
          "Curate, fără lichid, coduri SGR vizibile.",
          "Aproximativ 2-3 saci.",
          "",
        ]),
        bottleCount: bottleCount,
        estimatedValue: bottleCount * 0.5,
        collectorSharePercent: fakerRO.helpers.arrayElement([30, 50, 75, 100]),
        images: [],

        latitude: location.lat + (Math.random() - 0.5) * 0.02,
        longitude: location.lng + (Math.random() - 0.5) * 0.02,
        locationName: location.name,
        address: location.address,

        createdAt: fakerRO.date.recent({ days: 10 }),
        expiresAt: fakerRO.date.soon({ days: 6 }),
      },
    });
  }

  console.log(
    `✅ Finalizat! 121 utilizatori și 121 postări create în 40 de locații.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
