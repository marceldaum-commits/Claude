// Monatsbudget pro Einladungscode. Speichert verbrauchte Dollar in einer JSON-Datei.
import fs from 'node:fs';
import path from 'node:path';

// US-Dollar pro 1 Mio. Tokens (Eingabe, Ausgabe). Cache-Lesen wird wie Eingabe gerechnet (vorsichtig).
const PRICES = {
  'claude-opus-5-5': [4, 20],
  'claude-sonnet-5-5': [2, 10],
  'claude-haiku-5-5': [0.1, 0.5],
  'claude-opus-4-8': [5, 25],
};

export function costUsd(usage, model) {
  const [pin, pout] = PRICES[model] || PRICES['claude-opus-5-5'];
  const input =
    (usage?.input_tokens || 0) + (usage?.cache_creation_input_tokens || 0) * 1.25 + (usage?.cache_read_input_tokens || 0);
  return (input * pin + (usage?.output_tokens || 0) * pout) / 1e6;
}

const month = () => new Date().toISOString().slice(0, 7);

export class Budget {
  constructor(file, defaultModel, limitUsd) {
    this.file = file;
    this.model = defaultModel;
    this.limit = limitUsd;
    try {
      this.data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      this.data = {};
    }
  }

  spent(code) {
    const e = this.data[code];
    return e && e.month === month() ? e.usd : 0;
  }

  left(code) {
    return Math.max(0, Math.round((this.limit - this.spent(code)) * 10000) / 10000);
  }

  record(code, usage, model) {
    const usd = costUsd(usage, model || this.model);
    this.data[code] = { month: month(), usd: this.spent(code) + usd };
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
    } catch (err) {
      console.error('Budget konnte nicht gespeichert werden:', err.message);
    }
    return this.left(code);
  }
}
