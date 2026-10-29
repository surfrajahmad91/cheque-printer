// Single source of truth for the administrator account (server-side only).
// Set ADMIN_EMAIL in Vercel to change it without editing code.
export const ADMIN_EMAIL=(process.env.ADMIN_EMAIL||"surfrajahmad@gmail.com").trim().toLowerCase();
export const isAdminEmail=(email:unknown)=>typeof email==="string"&&email.trim().toLowerCase()===ADMIN_EMAIL;
