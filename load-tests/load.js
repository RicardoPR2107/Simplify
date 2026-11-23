/**
 * Pruebas de carga de Simplify con k6.
 *
 * Simula personas usando la app al mismo tiempo: abren el dashboard, revisan el historial y,
 * de vez en cuando, registran un movimiento. Todo pasa por Nginx, así que también mide el balanceo.
 *
 * Perfiles (variable PERFIL):
 *   humo    → 1 usuario durante 30 s: comprueba que el script y la app funcionan.
 *   carga   → (por defecto) sube a 30 usuarios simultáneos y se mantiene 1 minuto.
 *   estres  → sube hasta 100 usuarios para ver dónde empieza a degradarse.
 *
 * Ejemplo:  docker compose -f docker-compose.prod.yml --profile load run --rm -e PERFIL=humo k6
 */
import { check, group, sleep } from 'k6';
import http from 'k6/http';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const API = `${BASE_URL}/api/v1`;
const PERFIL = __ENV.PERFIL || 'carga';
const CUENTAS = Number(__ENV.CUENTAS || 20);
const PASSWORD = 'Clave#Segura123';

const perfiles = {
  humo: { vus: 1, duration: '30s' },
  carga: {
    stages: [
      { duration: '30s', target: 30 },
      { duration: '1m', target: 30 },
      { duration: '15s', target: 0 },
    ],
  },
  estres: {
    stages: [
      { duration: '30s', target: 30 },
      { duration: '30s', target: 60 },
      { duration: '30s', target: 100 },
      { duration: '30s', target: 100 },
      { duration: '15s', target: 0 },
    ],
  },
};

export const options = {
  ...perfiles[PERFIL],
  // Criterios de aceptación: si no se cumplen, k6 termina con error (útil en CI).
  thresholds: {
    http_req_failed: ['rate<0.01'], // menos del 1 % de peticiones con error
    http_req_duration: ['p(95)<500'], // el 95 % responde en menos de 500 ms
    'http_req_duration{tipo:lectura}': ['p(95)<400'],
    'http_req_duration{tipo:escritura}': ['p(95)<600'],
    checks: ['rate>0.99'],
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'max'],
};

/**
 * Las cookies de sesión son "Secure" (solo viajan por HTTPS). En local se usa HTTP: los
 * navegadores lo permiten en localhost, pero k6 no. Por eso el script guarda y envía las cookies
 * a mano, sin relajar la seguridad de la API.
 */
function cookiesFrom(res, previous = {}) {
  const cookies = { ...previous };
  for (const [name, values] of Object.entries(res.cookies)) {
    if (values.length > 0) cookies[name] = values[0].value;
  }
  return cookies;
}

function params(session, name, tipo, extra = {}) {
  return {
    cookies: session.cookies,
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': session.csrf, ...extra },
    tags: { name, tipo },
    jar: new http.CookieJar(), // jar vacío: solo viajan las cookies que el script envía
  };
}

function today() {
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10); // America/Lima
}

/** Se ejecuta una vez antes de la prueba: crea las cuentas y les da algunos movimientos. */
export function setup() {
  const csrfRes = http.get(`${API}/auth/csrf`, { tags: { name: 'GET /auth/csrf' } });
  check(csrfRes, { 'token CSRF obtenido': (r) => r.status === 200 });
  const csrf = csrfRes.json('csrfToken');
  const baseCookies = cookiesFrom(csrfRes);
  const runId = `${Date.now()}`;

  const sessions = [];
  for (let i = 0; i < CUENTAS; i++) {
    const res = http.post(
      `${API}/auth/register`,
      JSON.stringify({
        name: `Carga ${i + 1}`,
        email: `k6.${runId}.${i}@example.com`,
        password: PASSWORD,
      }),
      params({ cookies: baseCookies, csrf }, 'POST /auth/register', 'cuenta'),
    );
    if (!check(res, { 'cuenta creada': (r) => r.status === 201 })) {
      throw new Error(`No se pudo crear la cuenta ${i + 1}: ${res.status} ${res.body}`);
    }
    const session = { cookies: cookiesFrom(res, baseCookies), csrf };

    const categories = http
      .get(`${API}/categories`, params(session, 'GET /categories', 'lectura'))
      .json('categories');
    session.expenseCategories = categories.filter((c) => c.type === 'EXPENSE').map((c) => c.id);
    const income = categories.find((c) => c.type === 'INCOME').id;

    const incomeRes = http.post(
      `${API}/movements`,
      JSON.stringify({
        type: 'INCOME',
        amount: '3500.00',
        description: 'Sueldo de prueba de carga',
        categoryId: income,
        date: today(),
      }),
      params(session, 'POST /movements', 'escritura'),
    );
    check(incomeRes, { 'movimiento registrado': (r) => r.status === 201 });
    for (let j = 0; j < 8; j++) createExpense(session);

    sessions.push(session);
    sleep(0.3); // respeta el límite de Nginx para las rutas de cuenta (5 por segundo)
  }
  return { sessions };
}

function createExpense(session) {
  const categoryId =
    session.expenseCategories[Math.floor(Math.random() * session.expenseCategories.length)];
  const amount = (Math.random() * 200 + 5).toFixed(2);
  const res = http.post(
    `${API}/movements`,
    JSON.stringify({
      type: 'EXPENSE',
      amount,
      description: 'Gasto de prueba de carga',
      categoryId,
      date: today(),
    }),
    params(session, 'POST /movements', 'escritura'),
  );
  check(res, { 'movimiento registrado': (r) => r.status === 201 });
}

/** Lo que hace cada usuario virtual, una y otra vez. */
export default function ({ sessions }) {
  const session = sessions[(__VU - 1) % sessions.length];
  const now = new Date(Date.now() - 5 * 3600 * 1000);
  const period = `year=${now.getUTCFullYear()}&month=${now.getUTCMonth() + 1}`;

  group('Dashboard', () => {
    // El navegador pide estas cuatro cosas a la vez al abrir el dashboard.
    const responses = http.batch([
      [
        'GET',
        `${API}/summary/month?${period}`,
        null,
        params(session, 'GET /summary/month', 'lectura'),
      ],
      [
        'GET',
        `${API}/summary/categories?${period}&type=EXPENSE`,
        null,
        params(session, 'GET /summary/categories', 'lectura'),
      ],
      [
        'GET',
        `${API}/summary/evolution?${period}`,
        null,
        params(session, 'GET /summary/evolution', 'lectura'),
      ],
      [
        'GET',
        `${API}/movements?page=1&pageSize=5`,
        null,
        params(session, 'GET /movements', 'lectura'),
      ],
    ]);
    for (const res of responses) check(res, { 'dashboard responde 200': (r) => r.status === 200 });
  });
  sleep(1 + Math.random());

  group('Historial', () => {
    const res = http.get(
      `${API}/movements?page=1&pageSize=10&type=EXPENSE`,
      params(session, 'GET /movements', 'lectura'),
    );
    check(res, {
      'historial responde 200': (r) => r.status === 200,
      'historial trae movimientos': (r) => r.json('items').length > 0,
    });
  });
  sleep(1 + Math.random());

  // Una de cada cinco visitas registra un gasto.
  if (Math.random() < 0.2) {
    group('Registrar gasto', () => createExpense(session));
    sleep(1);
  }
}
