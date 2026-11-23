/**
 * Crea una cuenta de demostración con seis meses de movimientos realistas (en soles).
 * Sirve para probar la app, tomar capturas o grabar una demo sin cargar datos a mano.
 *
 * Uso, con la app levantada (npm run prod:up):
 *   npm run demo:datos
 * Otra dirección:  BASE_URL=http://localhost:5173 npm run demo:datos
 *
 * Cuenta creada:  demo@simplify.app  /  Demo#Simplify2026
 */
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8080';
const API = `${BASE_URL}/api/v1`;
const EMAIL = 'demo@simplify.app';
const PASSWORD = 'Demo#Simplify2026';

// Las cookies de sesión son "Secure": Node no las reenvía solo por HTTP, así que se guardan a mano.
const jar = {};
let csrf = '';
async function call(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: Object.entries(jar)
        .map(([k, v]) => `${k}=${v}`)
        .join('; '),
      'X-CSRF-Token': csrf,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  for (const header of res.headers.getSetCookie()) {
    const [pair] = header.split(';');
    const i = pair.indexOf('=');
    jar[pair.slice(0, i)] = pair.slice(i + 1);
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok)
    throw Object.assign(new Error(`${method} ${path} → ${res.status}`), {
      status: res.status,
      data,
    });
  return data;
}

// Generador pseudoaleatorio con semilla: los mismos datos en cada ejecución.
let seed = 7;
const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const between = (min, max) => (min + random() * (max - min)).toFixed(2);
const pad = (n) => String(n).padStart(2, '0');

function buildMovements(today) {
  const movements = [];
  for (let back = 5; back >= 0; back--) {
    const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - back, 1));
    const year = first.getUTCFullYear();
    const month = first.getUTCMonth() + 1;
    const isCurrent = back === 0;
    const date = (day) => `${year}-${pad(month)}-${pad(Math.min(day, 28))}`;
    const add = (type, amount, description, category, day) => {
      if (isCurrent && day > today.getUTCDate()) return; // nada en el futuro
      movements.push({ type, amount, description, category, date: date(day) });
    };

    add('INCOME', '4200.00', 'Sueldo mensual', 'Salario', 1);
    if (month % 2 === 0)
      add('INCOME', between(650, 1400), 'Proyecto web para cliente', 'Freelance', 18);
    if (back === 2) add('INCOME', '320.00', 'Dividendos del fondo', 'Inversiones', 20);
    add('EXPENSE', '1350.00', 'Alquiler del departamento', 'Vivienda', 5);
    add('EXPENSE', between(160, 210), 'Luz, agua e internet', 'Vivienda', 10);
    for (const day of [3, 9, 16, 23])
      add('EXPENSE', between(140, 260), 'Compras del supermercado', 'Alimentación', day);
    for (const day of [7, 14, 21])
      add('EXPENSE', between(35, 90), 'Almuerzo fuera', 'Alimentación', day);
    add('EXPENSE', between(180, 240), 'Recarga de tarjeta de transporte', 'Transporte', 2);
    add('EXPENSE', between(25, 60), 'Taxi', 'Transporte', 12);
    add('EXPENSE', '39.90', 'Suscripción de streaming', 'Entretenimiento', 8);
    add('EXPENSE', between(60, 180), 'Cine y salida con amigos', 'Entretenimiento', 19);
    add('EXPENSE', '290.00', 'Curso de inglés', 'Educación', 4);
    if (back === 3 || back === 0)
      add('EXPENSE', between(120, 260), 'Consulta médica y farmacia', 'Salud', 15);
    if (back === 4) add('EXPENSE', '480.00', 'Regalo de cumpleaños', 'Otros gastos', 22);
  }
  return movements;
}

try {
  csrf = (await call('GET', '/auth/csrf')).csrfToken;
  await call('POST', '/auth/register', { name: 'Ricardo Palma', email: EMAIL, password: PASSWORD });
} catch (err) {
  if (err.status === 409) {
    console.log(`La cuenta ${EMAIL} ya existe: no se cargó nada nuevo.`);
    process.exit(0);
  }
  console.error(`No se pudo conectar con ${BASE_URL}. ¿Está levantada la app?`, err.message);
  process.exit(1);
}

await call('PATCH', '/me', { currency: 'PEN' });
const { categories } = await call('GET', '/categories');
const idOf = (name) => categories.find((c) => c.name === name).id;

// "Hoy" en Perú (UTC−5), para no crear movimientos con fecha futura.
const today = new Date(Date.now() - 5 * 3600 * 1000);
const movements = buildMovements(today);
for (const { category, ...movement } of movements) {
  await call('POST', '/movements', { ...movement, categoryId: idOf(category) });
}

console.log(`Cuenta de demostración lista con ${movements.length} movimientos.`);
console.log(`Entra en ${BASE_URL} con ${EMAIL} / ${PASSWORD}`);
