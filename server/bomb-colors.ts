import { randomInt } from 'node:crypto';

export const bombColors = ['red', 'blue', 'yellow', 'green', 'purple', 'orange', 'white', 'pink', 'cyan', 'magenta', 'black', 'brown'];
const colorPattern = /\b(red|blue|yellow|green|purple|orange|white|pink|cyan|magenta|black|brown)\b/gi;

export function recolor(text: string, colors: Record<string, string>) {
  return text.replace(colorPattern, word => {
    const color = colors[word.toLowerCase()] || word.toLowerCase();
    return word === word.toUpperCase() ? color.toUpperCase() : word[0] === word[0].toUpperCase() ? color[0].toUpperCase() + color.slice(1) : color;
  });
}

// Reserve distinct mappings for every participating team. A larger palette also
// supports 12 teams when a module has only three wires (just six permutations).
export function teamColors(items: string[], used: Set<string>): Record<string, string> {
  const source = [...new Set(items.flatMap(item => (item.match(colorPattern) || []).map(s => s.toLowerCase())))];
  if (!source.length) return {};
  let palette = [...source];
  for (;;) {
    const mapping = Object.fromEntries(source.map((color, i) => [color, palette[i]]));
    const signature = source.map(color => mapping[color]).join(',');
    if (!used.has(signature)) { used.add(signature); return mapping; }
    palette = [...bombColors];
    for (let i = palette.length - 1; i > 0; i--) {
      const j = randomInt(i + 1); [palette[i], palette[j]] = [palette[j], palette[i]];
    }
  }
}
