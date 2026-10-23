// Team squads report: every team with the players it bought and what it paid.
// Excel is a real .xlsx built in the browser (no library: a stored zip of SpreadsheetML parts);
// PDF opens a print-ready page so the browser's "Save as PDF" makes the file.
import { formatMoney } from './money';

const CRORE = 10000000;
const toAmount = (cr) => Math.round(Number(cr || 0) * CRORE);

// Teams in their auction order, each with its sold players (dearest first)
export const buildSquads = (teams, players) => teams.map(team => {
  const squad = players
    .filter(p => p.status === 'SOLD' && p.soldToTeamId === team.id)
    .sort((a, b) => Number(b.soldPrice || 0) - Number(a.soldPrice || 0));
  const spent = squad.reduce((s, p) => s + Number(p.soldPrice || 0), 0);
  return { team, squad, spent, left: Number(team.initialPurse || 0) - spent };
});

const fileName = (auction, ext) => `${(auction.title || 'Auction').replace(/[\\/:*?"<>|]+/g, ' ').trim()} - Team squads.${ext}`;

const save = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ---------- Excel ----------
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const colName = (i) => (i >= 26 ? colName(Math.floor(i / 26) - 1) : '') + String.fromCharCode(65 + (i % 26));

// rows: arrays of strings / numbers; the first row is the bold header. widths: column widths in characters.
const sheetXml = (rows, widths) => {
  const cols = `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`;
  const body = rows.map((row, r) => `<row r="${r + 1}">${row.map((v, c) => {
    const ref = `${colName(c)}${r + 1}`;
    const style = r === 0 ? ' s="1"' : typeof v === 'number' && c === row.length - 1 ? ' s="2"' : '';
    return typeof v === 'number'
      ? `<c r="${ref}"${style}><v>${v}</v></c>`
      : `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  }).join('')}</row>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${body}</sheetData></worksheet>`;
};

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (bytes) => {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

// Minimal zip (stored, no compression): enough for an .xlsx
const zip = (files) => {
  const enc = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;
  for (const [name, text] of files) {
    const nameBytes = enc.encode(name);
    const data = enc.encode(text);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(12, 0x21, true); // 1980-01-01
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    parts.push(local, nameBytes, data);
    const dir = new DataView(new ArrayBuffer(46));
    dir.setUint32(0, 0x02014b50, true);
    dir.setUint16(4, 20, true);
    dir.setUint16(6, 20, true);
    dir.setUint16(14, 0x21, true);
    dir.setUint32(16, crc, true);
    dir.setUint32(20, data.length, true);
    dir.setUint32(24, data.length, true);
    dir.setUint16(28, nameBytes.length, true);
    dir.setUint32(42, offset, true);
    central.push(dir, nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const size = central.reduce((s, p) => s + p.byteLength, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, size, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

export const downloadSquadsExcel = (auction, teams, players) => {
  const squads = buildSquads(teams, players);
  const used = new Set();
  // Excel sheet names: max 31 characters, no []:*?/\ and unique
  const sheetName = (name) => {
    let base = String(name).replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 28) || 'Team';
    let n = base;
    for (let i = 2; used.has(n.toLowerCase()); i++) n = `${base} ${i}`;
    used.add(n.toLowerCase());
    return n;
  };

  const sheets = [];
  sheets.push([sheetName('Summary'), sheetXml([
    ['Team', 'Short code', 'Players bought', 'Purse', 'Spent', 'Purse left', 'Spent (amount)'],
    ...squads.map(s => [s.team.name, s.team.shortCode || '', s.squad.length, formatMoney(s.team.initialPurse), formatMoney(s.spent), formatMoney(s.left), toAmount(s.spent)])
  ], [28, 12, 15, 12, 12, 12, 16])]);
  for (const s of squads) {
    sheets.push([sheetName(s.team.name), sheetXml([
      ['#', 'Player', 'Role', 'Age', 'Jersey', 'Sold price', 'Price (amount)'],
      ...s.squad.map((p, i) => [i + 1, p.name, p.role || p.category || '', p.age ? Number(p.age) || String(p.age) : '', [p.jerseyName, p.jerseyNumber && `#${p.jerseyNumber}`].filter(Boolean).join(' '), formatMoney(p.soldPrice), toAmount(p.soldPrice)]),
      [],
      ['', 'Total', `${s.squad.length} players`, '', '', formatMoney(s.spent), toAmount(s.spent)]
    ], [5, 28, 16, 6, 18, 12, 16])]);
  }

  const files = [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map(([name], i) => `<sheet name="${esc(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##,##0"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFB000"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/><xf numFmtId="164" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'],
    ...sheets.map(([, xml], i) => [`xl/worksheets/sheet${i + 1}.xml`, xml])
  ];
  save(zip(files), fileName(auction, 'xlsx'));
};

// ---------- PDF (print page) ----------
export const printSquadsPdf = (auction, teams, players) => {
  const squads = buildSquads(teams, players);
  const sold = squads.reduce((n, s) => n + s.squad.length, 0);
  const date = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const teamBlock = (s) => `
    <section>
      <header><div><h2>${esc(s.team.name)}${s.team.shortCode ? ` <small>${esc(s.team.shortCode)}</small>` : ''}</h2>
      <p>${s.squad.length} players · Spent ${esc(formatMoney(s.spent))} · Purse left ${esc(formatMoney(s.left))}</p></div></header>
      ${s.squad.length ? `<table><thead><tr><th>#</th><th>Player</th><th>Role</th><th>Age</th><th>Jersey</th><th class="r">Sold price</th></tr></thead><tbody>
        ${s.squad.map((p, i) => `<tr><td>${i + 1}</td><td><b>${esc(p.name)}</b></td><td>${esc(p.role || p.category || '')}</td><td>${esc(p.age || '')}</td><td>${esc([p.jerseyName, p.jerseyNumber && `#${p.jerseyNumber}`].filter(Boolean).join(' '))}</td><td class="r">${esc(formatMoney(p.soldPrice))}</td></tr>`).join('')}
        <tr class="total"><td></td><td>Total</td><td></td><td></td><td></td><td class="r">${esc(formatMoney(s.spent))}</td></tr>
      </tbody></table>` : '<p class="empty">No players bought yet.</p>'}
    </section>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(fileName(auction, 'pdf').replace(/\.pdf$/, ''))}</title><style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0A0D19; margin: 0; }
    .top { border-bottom: 4px solid #FFB000; padding-bottom: 10px; margin-bottom: 14px; }
    h1 { margin: 0; font-size: 22px; text-transform: uppercase; }
    .meta { color: #555; font-size: 12px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #0A0D19; color: #fff; text-align: left; padding: 6px 8px; }
    td { padding: 5px 8px; border-bottom: 1px solid #e3e5ec; }
    .r { text-align: right; }
    .total td { font-weight: bold; border-top: 2px solid #0A0D19; border-bottom: none; }
    .summary { margin-bottom: 18px; }
    section { break-inside: avoid; margin-bottom: 18px; }
    section header { background: #FFB000; padding: 6px 10px; }
    h2 { margin: 0; font-size: 16px; }
    h2 small { font-size: 11px; color: #333; }
    section header p { margin: 2px 0 0; font-size: 11px; }
    .empty { color: #777; font-size: 12px; padding: 6px 10px; margin: 0; }
  </style></head><body>
    <div class="top"><h1>${esc(auction.title)} — Team squads</h1>
    <div class="meta">${sold} players sold · ${squads.length} teams · Generated ${esc(date)} · Force Pulse</div></div>
    <table class="summary"><thead><tr><th>Team</th><th class="r">Players</th><th class="r">Spent</th><th class="r">Purse left</th></tr></thead><tbody>
      ${squads.map(s => `<tr><td><b>${esc(s.team.name)}</b></td><td class="r">${s.squad.length}</td><td class="r">${esc(formatMoney(s.spent))}</td><td class="r">${esc(formatMoney(s.left))}</td></tr>`).join('')}
    </tbody></table>
    ${squads.map(teamBlock).join('')}
    <script>window.onload = () => { window.print(); };</script>
  </body></html>`;
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
};
