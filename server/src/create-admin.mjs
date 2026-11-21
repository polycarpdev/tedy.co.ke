// api/src/create-admin.mjs
import { pool } from './db.mjs';
import { hashPassword } from './auth.mjs';

const [email, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(' ');
if (!email || !name) {
  console.log('Usage: node src/create-admin.mjs <email> <name>');
  process.exit(1);
}

function askHidden(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (ch === '\u0003') process.exit(1);
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

const password = await askHidden('Password: ');
if (password.length < 10) {
  console.log('Use at least 10 characters.');
  process.exit(1);
}
const repeat = await askHidden('Repeat password: ');
if (repeat !== password) {
  console.log('Passwords do not match.');
  process.exit(1);
}

await pool.query(
  `INSERT INTO admins (email, name, password_hash) VALUES ($1, $2, $3)
   ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash`,
  [email.toLowerCase(), name, await hashPassword(password)]
);
console.log(`Admin ready: ${email}`);
await pool.end();
