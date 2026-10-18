// Force Pulse business settings: plans and how organisers reach the Force Pulse team.

// Team-count plans. An auction with more teams than its plan allows is locked
// (no bidding, controller or screens) until Force Pulse upgrades it.
export const PLANS = [
  { id: 'FREE', name: 'Starter League', price: 0, teamLimit: 2 },
  { id: 'STANDARD', name: 'Standard League', price: 3000, teamLimit: 4 },
  { id: 'PREMIER', name: 'Premier League', price: 5000, teamLimit: 10 },
  { id: 'MEGA', name: 'Mega Championship', price: 8000, teamLimit: 32 }
];

export const FREE_PLAN = PLANS[0];

export const getPlan = (planId) => PLANS.find(p => p.id === planId) || FREE_PLAN;

// Smallest plan that fits a given number of teams
export const planForTeams = (teamCount) => PLANS.find(p => p.teamLimit >= teamCount) || PLANS[PLANS.length - 1];

// TODO: fill in Force Pulse's real contact details. Empty values are hidden in the app.
export const FORCE_PULSE_CONTACT = {
  email: '',
  phone: '',
  whatsapp: '' // digits with country code, e.g. 919876543210
};
