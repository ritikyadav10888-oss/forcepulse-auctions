import { DEFAULT_PLAYER_PHOTO, DEFAULT_TEAM_LOGO } from '../config/placeholders.js';
// CSV upload for teams and players. Excel / Google Sheets: File → Save as / Download → CSV.

// RFC 4180-style parser: quoted fields, escaped quotes (""), commas and newlines inside quotes
export const parseCSV = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^﻿/, '');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(cell => cell.trim() !== ''));
};

const normalize = (h) => h.toLowerCase().replace(/[^a-z]/g, '');

// Accepted header spellings for each field
const PLAYER_COLUMNS = {
  name: ['name', 'playername', 'player'],
  category: ['category', 'type', 'skill'],
  role: ['role', 'speciality', 'specialty', 'description'],
  basePrice: ['baseprice', 'base', 'price', 'basepricecr'],
  country: ['country', 'nationality'],
  isOverseas: ['overseas', 'isoverseas', 'foreign'],
  setNo: ['set', 'setno', 'setnumber'],
  image: ['image', 'photo', 'imageurl', 'photourl', 'picture'],
  matches: ['matches', 'm'],
  runs: ['runs', 'points', 'raidpoints'],
  wickets: ['wickets', 'tackles', 'tacklepoints'],
  age: ['age'],
  battingStyle: ['batting', 'battingstyle', 'bat'],
  bowlingStyle: ['bowling', 'bowlingstyle', 'bowl'],
  previousTeam: ['previousteam', 'prevteam', 'lastteam', 'previousclub']
};

const TEAM_COLUMNS = {
  name: ['name', 'teamname', 'team'],
  shortCode: ['shortcode', 'code', 'short', 'abbreviation'],
  logo: ['logo', 'logourl', 'image'],
  owner: ['owner', 'ownername'],
  coach: ['coach', 'captain'],
  initialPurse: ['purse', 'initialpurse', 'budget', 'pursecr']
};

const mapRows = (rows, columns) => {
  if (rows.length < 2) return { records: [], missing: [] };
  const header = rows[0].map(normalize);
  const index = Object.fromEntries(Object.entries(columns).map(([key, aliases]) => [key, header.findIndex(h => aliases.includes(h))]));
  const records = rows.slice(1).map(r => Object.fromEntries(
    Object.entries(index).map(([key, i]) => [key, i >= 0 ? (r[i] || '').trim() : ''])
  ));
  return { records, index };
};

const toNumber = (v, fallback) => {
  const n = Number(String(v).replace(/[^0-9.]/g, ''));
  return v !== '' && Number.isFinite(n) ? n : fallback;
};
const toBool = (v) => ['yes', 'y', 'true', '1', 'overseas'].includes(String(v).trim().toLowerCase());


// Returns { items, errors } — errors name the CSV line so the admin can fix the sheet
export const playersFromCSV = (text, { defaultCategory = 'Batsman', defaultCountry = 'India', categoryPrices = {} } = {}) => {
  const { records, index } = mapRows(parseCSV(text), PLAYER_COLUMNS);
  if (!index || index.name < 0) return { items: [], errors: ['The first row must be a header with at least a "Name" column.'] };
  const items = [];
  const errors = [];
  records.forEach((r, i) => {
    const line = i + 2;
    if (!r.name) { errors.push(`Line ${line}: missing player name, skipped.`); return; }
    // A blank price takes the category's base price
    const basePrice = toNumber(r.basePrice, Number(categoryPrices[r.category || defaultCategory]) || NaN);
    if (!(basePrice > 0)) { errors.push(`Line ${line} (${r.name}): base price "${r.basePrice}" is not a number above 0, and its category has no base price; skipped.`); return; }
    const country = r.country || defaultCountry;
    items.push({
      name: r.name,
      category: r.category || defaultCategory,
      role: r.role || r.category || defaultCategory,
      basePrice,
      country,
      isOverseas: r.isOverseas ? toBool(r.isOverseas) : country.toLowerCase() !== defaultCountry.toLowerCase(),
      setNo: toNumber(r.setNo, 1),
      image: r.image || DEFAULT_PLAYER_PHOTO,
      stats: { matches: toNumber(r.matches, 0), runs: toNumber(r.runs, 0), wickets: toNumber(r.wickets, 0) },
      age: toNumber(r.age, ''),
      battingStyle: r.battingStyle,
      bowlingStyle: r.bowlingStyle,
      previousTeam: r.previousTeam
    });
  });
  return { items, errors };
};

export const teamsFromCSV = (text, { defaultPurse = 100 } = {}) => {
  const { records, index } = mapRows(parseCSV(text), TEAM_COLUMNS);
  if (!index || index.name < 0) return { items: [], errors: ['The first row must be a header with at least a "Name" column.'] };
  const items = [];
  const errors = [];
  records.forEach((r, i) => {
    if (!r.name) { errors.push(`Line ${i + 2}: missing team name, skipped.`); return; }
    items.push({
      name: r.name,
      shortCode: (r.shortCode || r.name.split(/\s+/).map(w => w[0]).join('')).slice(0, 4).toUpperCase(),
      logo: r.logo || DEFAULT_TEAM_LOGO,
      owner: r.owner,
      coach: r.coach,
      initialPurse: toNumber(r.initialPurse, defaultPurse)
    });
  });
  return { items, errors };
};

export const PLAYER_TEMPLATE = [
  'Name,Category,Role,Base Price,Country,Overseas,Set,Image,Matches,Runs,Wickets,Age,Batting Style,Bowling Style,Previous Team',
  'Rohit Kumar,Batsman,Opening Batsman,2,India,No,1,,150,4500,0,29,Right-hand bat,Right-arm off-spin,Mumbai Titans',
  'Liam Smith,Bowler,Left-Arm Fast,1.5,England,Yes,1,,80,300,95,26,Left-hand bat,Left-arm fast,London Lions'
].join('\n');

export const TEAM_TEMPLATE = [
  'Name,Short Code,Purse,Owner,Coach,Logo',
  'Mumbai Titans,MT,100,Titan Sports Ltd,Mahela J.,',
  'Royal Chargers,RC,100,Royal Spirits,Andy Flower,'
].join('\n');

export const downloadText = (filename, text) => {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
