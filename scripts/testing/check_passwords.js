const bcrypt = require('bcryptjs');
const { execSync } = require('child_process');

function getDbUsers() {
  const cmd = `sqlcmd -S .\\SYNOS -d SynOSDb-1 -E -Q "SELECT Username, PasswordHash FROM Users WHERE Username IS NOT NULL AND Username <> ''" -h -1 -W`;
  const out = execSync(cmd, { encoding: 'utf8' });
  const lines = out.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('('));
  return lines.map(line => {
    const parts = line.split(/\s+/);
    return { username: parts[0], hash: parts[1] };
  });
}

const candidatePasswords = [
  'Admin',
  'admin123',
  'password',
  'password123',
  'Admin@123',
  'SynOS@123',
  '123456',
  'secret',
  'welcome',
  'Welcome1',
  'P@ssword1',
  'admin',
  'drvasu',
  'phlebo'
];

const users = getDbUsers();
console.log(`Checking ${users.length} users against candidate passwords...`);

for (const user of users) {
  let matched = null;
  for (const p of candidatePasswords) {
    try {
      if (bcrypt.compareSync(p, user.hash)) {
        matched = p;
        break;
      }
    } catch (e) {}
  }
  console.log(`${user.username.padEnd(20)}: ${matched || 'UNKNOWN (Hash: ' + user.hash.substring(0, 15) + '...)'}`);
}
