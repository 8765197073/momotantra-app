// ============================================================
//  MOMO TANTRA — LOGGER
//  Beautiful, colorful, file-backed logging system
// ============================================================
const fs = require('fs');
const path = require('path');

const isServerless = !!process.env.VERCEL;

const LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, `server-${new Date().toISOString().slice(0, 10)}.log`);
const COMBINED_FILE = path.join(LOG_DIR, 'combined.log');

// Ensure logs directory exists (skip if running in serverless environment)
if (!isServerless && !fs.existsSync(LOG_DIR)) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch (e) {
    console.warn(`[LOGGER] Could not create logs directory: ${e.message}`);
  }
}

// ANSI color codes for terminal
const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  bgRed:   '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgBlue:  '\x1b[44m',
  bgYellow:'\x1b[43m',
};

// Level configurations
const LEVELS = {
  INFO:    { color: C.cyan,    icon: 'ℹ️ ', label: 'INFO   ' },
  SUCCESS: { color: C.green,   icon: '✅ ', label: 'SUCCESS' },
  WARN:    { color: C.yellow,  icon: '⚠️ ', label: 'WARN   ' },
  ERROR:   { color: C.red,     icon: '❌ ', label: 'ERROR  ' },
  HTTP:    { color: C.magenta, icon: '🌐 ', label: 'HTTP   ' },
  ORDER:   { color: C.yellow,  icon: '🥟 ', label: 'ORDER  ' },
  DB:      { color: C.blue,    icon: '💾 ', label: 'DB     ' },
  SERVER:  { color: C.green,   icon: '🚀 ', label: 'SERVER ' },
};

function timestamp() {
  return new Date().toLocaleString('en-IN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
}

function writeToFile(plain) {
  if (isServerless) return;
  try {
    const line = plain + '\n';
    fs.appendFileSync(LOG_FILE, line, 'utf8');
    fs.appendFileSync(COMBINED_FILE, line, 'utf8');
  } catch (e) {
    // Fail silently in read-only environment
  }
}

function log(level, message, meta = null) {
  const cfg = LEVELS[level] || LEVELS.INFO;
  const ts = timestamp();
  const metaStr = meta ? `  ${JSON.stringify(meta)}` : '';

  // Colored terminal output
  const colorLine = [
    `${C.dim}${ts}${C.reset}`,
    `${cfg.color}${C.bold}[${cfg.label}]${C.reset}`,
    cfg.icon,
    `${cfg.color}${message}${C.reset}`,
    meta ? `${C.dim}${JSON.stringify(meta)}${C.reset}` : ''
  ].filter(Boolean).join('  ');

  // Plain text for file
  const plainLine = `[${ts}] [${cfg.label}]  ${message}${metaStr}`;

  console.log(colorLine);
  writeToFile(plainLine);
}

// Public API
const logger = {
  info:    (msg, meta) => log('INFO',    msg, meta),
  success: (msg, meta) => log('SUCCESS', msg, meta),
  warn:    (msg, meta) => log('WARN',    msg, meta),
  error:   (msg, meta) => log('ERROR',   msg, meta),
  http:    (msg, meta) => log('HTTP',    msg, meta),
  order:   (msg, meta) => log('ORDER',   msg, meta),
  db:      (msg, meta) => log('DB',      msg, meta),
  server:  (msg, meta) => log('SERVER',  msg, meta),

  // Banner for startup
  banner(port) {
    const line = '═'.repeat(52);
    console.log(`\n${C.yellow}${C.bold}╔${line}╗${C.reset}`);
    console.log(`${C.yellow}${C.bold}║${C.reset}  🥟  ${C.red}${C.bold}MOMO TANTRA${C.reset} ${C.yellow}— Love at First Bite${C.reset}          ${C.yellow}${C.bold}║${C.reset}`);
    console.log(`${C.yellow}${C.bold}║${C.reset}  ${C.dim}মম তন্ত্র — Full Stack Food Ordering Server${C.reset}  ${C.yellow}${C.bold}║${C.reset}`);
    console.log(`${C.yellow}${C.bold}╠${line}╣${C.reset}`);
    console.log(`${C.yellow}${C.bold}║${C.reset}  ${C.green}${C.bold}▶  Running at:${C.reset}  ${C.cyan}http://localhost:${port}${C.reset}             ${C.yellow}${C.bold}║${C.reset}`);
    console.log(`${C.yellow}${C.bold}║${C.reset}  ${C.blue}${C.bold}⚙  Admin Panel:${C.reset} ${C.cyan}http://localhost:${port}/admin${C.reset}         ${C.yellow}${C.bold}║${C.reset}`);
    console.log(`${C.yellow}${C.bold}║${C.reset}  ${C.magenta}${C.bold}📋 Track Order:${C.reset} ${C.cyan}http://localhost:${port}/track${C.reset}         ${C.yellow}${C.bold}║${C.reset}`);
    console.log(`${C.yellow}${C.bold}║${C.reset}  ${C.dim}📁 Logs:${C.reset}         ${C.dim}./logs/${C.reset}                            ${C.yellow}${C.bold}║${C.reset}`);
    console.log(`${C.yellow}${C.bold}║${C.reset}  ${C.dim}Press Ctrl+C to stop${C.reset}                             ${C.yellow}${C.bold}║${C.reset}`);
    console.log(`${C.yellow}${C.bold}╚${line}╝${C.reset}\n`);
  },

  // Morgan stream integration
  morganStream: {
    write(message) {
      log('HTTP', message.trim());
    }
  },

  // Show recent logs
  showLogs(lines = 50) {
    if (!fs.existsSync(COMBINED_FILE)) { console.log('No logs yet.'); return; }
    const content = fs.readFileSync(COMBINED_FILE, 'utf8').trim().split('\n');
    const recent = content.slice(-lines);
    console.log(`\n--- Last ${recent.length} log entries ---\n`);
    recent.forEach(l => console.log(l));
    console.log('\n--- End of logs ---\n');
  },

  logFile: LOG_FILE,
  combinedFile: COMBINED_FILE,
};

module.exports = logger;
