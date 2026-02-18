/**
 * Seed the Firestore emulator with fake purchases for local development.
 * Uses existing seeded gifts so purchases reference real gift documents (id, nome, descricao, preco).
 * Run after the Nest server has started (so gifts have been seeded).
 * Usage: cd server && node scripts/seed-local-purchases.js
 */

const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.warn('FIRESTORE_EMULATOR_HOST not set. Setting to localhost:8081 for local seed.');
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8081';
}

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'demo-project' });
}

const db = admin.firestore();

/** Wait ms milliseconds */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetch all gifts from Firestore (seeded by Nest server). Retries a few times if empty. */
async function fetchGifts(maxRetries = 5) {
  const col = db.collection('gifts');
  for (let i = 0; i < maxRetries; i++) {
    const snapshot = await col.get();
    if (!snapshot.empty) {
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        nome: doc.data().nome || '',
        descricao: doc.data().descricao || '',
        preco: Number(doc.data().preco) || 0,
        estoque: Number(doc.data().estoque) ?? 0,
      }));
    }
    if (i < maxRetries - 1) {
      console.warn('No gifts found yet (server may still be seeding). Retrying in 2s...');
      await sleep(2000);
    }
  }
  return [];
}

/**
 * Build fake purchases using the given gifts.
 * Each purchase item includes id, nome, descricao, preco, quantidade to match real purchase shape.
 */
function buildFakePurchases(gifts) {
  if (gifts.length === 0) {
    return [];
  }
  const byIndex = (i) => ({
    id: gifts[i].id,
    nome: gifts[i].nome,
    descricao: gifts[i].descricao,
    preco: gifts[i].preco,
    quantidade: 1,
  });
  const byIndexQty = (i, qty) => ({ ...byIndex(i), quantidade: qty });
  const sum = (items) => items.reduce((acc, it) => acc + it.preco * it.quantidade, 0);

  return [
    {
      fromName: 'Maria Silva',
      email: 'maria.silva@example.com',
      message: 'Parabéns! Que sejam muito felizes.',
      gifts: [byIndexQty(0, 1)],
      totalPrice: sum([byIndexQty(0, 1)]),
      paymentId: 'mp-seed-001',
      status: 'approved',
    },
    {
      fromName: 'João Santos',
      email: 'joao.santos@example.com',
      message: 'Feliz casamento!',
      gifts: [byIndexQty(1, 2)],
      totalPrice: sum([byIndexQty(1, 2)]),
      paymentId: 'mp-seed-002',
      status: 'approved',
    },
    {
      fromName: 'Ana Costa',
      email: 'ana.costa@example.com',
      message: 'Com carinho.',
      gifts: [byIndexQty(2, 1)],
      totalPrice: sum([byIndexQty(2, 1)]),
      paymentId: null,
      status: 'rejected',
    },
    {
      fromName: 'Pedro Oliveira',
      email: 'pedro.oliveira@example.com',
      message: 'Abraços!',
      gifts: [byIndexQty(3, 1)],
      totalPrice: sum([byIndexQty(3, 1)]),
      paymentId: null,
      status: 'rejected',
    },
    {
      fromName: 'Carla Lima',
      email: 'carla.lima@example.com',
      message: 'Aguardando aprovação do pagamento.',
      gifts: [byIndexQty(4, 1)],
      totalPrice: sum([byIndexQty(4, 1)]),
      paymentId: 'mp-seed-005',
      status: 'pending',
    },
    {
      fromName: 'Lucas Ferreira',
      email: 'lucas.ferreira@example.com',
      message: 'Em análise.',
      gifts: [byIndexQty(5, 1), byIndexQty(6, 1)],
      totalPrice: sum([byIndexQty(5, 1), byIndexQty(6, 1)]),
      paymentId: 'mp-seed-006',
      status: 'pending',
    },
  ];
}

async function seed() {
  const gifts = await fetchGifts();
  if (gifts.length === 0) {
    console.warn('No gifts in Firestore. Start the Nest server first so it can seed gifts, then run this script.');
    process.exit(0);
  }

  const fakePurchases = buildFakePurchases(gifts);

  const col = db.collection('purchases');
  const existing = await col.get();
  const batch = db.batch();
  existing.docs.forEach((doc) => batch.delete(doc.ref));
  if (!existing.empty) {
    await batch.commit();
  }

  for (const p of fakePurchases) {
    await col.add({
      ...p,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  console.log(`Seeded ${fakePurchases.length} fake purchases linked to ${gifts.length} seeded gifts.`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
