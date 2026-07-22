// ============================================================
// CENTRAL CONFIG — enum/label lists used to build admin forms and
// guest-facing labels (relationship statuses, proof types, unlock
// types, challenge categories). These are structural, not content.
//
// Actual event content (challenges, vendors, schedule, announcements,
// prizes, raffle config, point values, theme colors) now lives in
// Supabase and is edited live from the Admin dashboard — see
// src/lib/api.js. The placeholder arrays further down this file
// (VENDORS, CHALLENGES, THEME_COLORS, etc.) are leftover seed data
// from the original localStorage prototype and are no longer read by
// the app; the real seed values were loaded into the database directly
// via migration.
// ============================================================

export const EVENT_INFO = {
  name: 'The Loc Party',
  tagline: 'A night of color, culture & connection.',
  dateLabel: 'TBD — placeholder date',
  venueLabel: 'TBD — placeholder venue',
};

// ---- enums -------------------------------------------------

export const RELATIONSHIP_STATUSES = [
  { id: 'single', label: 'Single', theme: 'single' },
  { id: 'dating', label: "Dating / It's complicated", theme: 'dating' },
  { id: 'partnered', label: 'Partnered', theme: 'partnered' },
  { id: 'married', label: 'Married', theme: 'married' },
  { id: 'private', label: 'Private business', theme: 'private' },
];

export const PROOF_TYPES = [
  { id: 'qr_scan', label: 'QR-code scan' },
  { id: 'photo_upload', label: 'Photo upload' },
  { id: 'video_upload', label: 'Video upload' },
  { id: 'multiple_choice', label: 'Multiple-choice answer' },
  { id: 'short_answer', label: 'Short written answer' },
  { id: 'secret_code', label: 'Secret code' },
  { id: 'admin_approval', label: 'Admin approval' },
  { id: 'check_in', label: 'Simple check-in' },
];

export const UNLOCK_TYPES = [
  { id: 'immediate', label: 'Appears immediately' },
  { id: 'scheduled', label: 'Unlocks at a scheduled time' },
  { id: 'after_challenge', label: 'Unlocks after another challenge' },
  { id: 'point_threshold', label: 'Unlocks after reaching a point total' },
  { id: 'relationship_group', label: 'Unlocks for a relationship-status group' },
  { id: 'hidden', label: 'Remains hidden until manually triggered by admin' },
];

export const CHALLENGE_CATEGORIES = [
  'Workshop',
  'Photo',
  'Trivia',
  'Vendor',
  'Play',
  'Connection',
  'Wellness',
  'Bonus',
];

// ---- editable point + entry values --------------------------

export const POINT_VALUES = {
  createProfile: 25,
  profilePhoto: 15,
  uploadLook: 50,
  selectRelationshipStatus: 10,
};

export const RAFFLE_ENTRY_SOURCES = {
  registration: { label: 'Registration', entries: 1 },
  uploadLook: { label: 'Uploaded a Loc Party look', entries: 1 },
  vendorVisit: { label: 'Visited a featured vendor', entries: 1 },
  fullHuntComplete: { label: 'Completed the full scavenger hunt', entries: 3 },
  bonusActivity: { label: 'Special bonus activity', entries: 1 },
};

// ---- vendors (placeholders) ----------------------------------

export const VENDORS = [
  {
    id: 'vendor-1',
    name: 'Vendor Placeholder A',
    category: 'Loctician Station',
    description: 'Add a real vendor name, category, and description here.',
    location: 'Map pin TBD',
    isFeatured: true,
    active: true,
  },
  {
    id: 'vendor-2',
    name: 'Vendor Placeholder B',
    category: 'Product & Accessories',
    description: 'Add a real vendor name, category, and description here.',
    location: 'Map pin TBD',
    isFeatured: false,
    active: true,
  },
];

// ---- schedule (placeholders) -----------------------------------

export const SCHEDULE_ITEMS = [
  {
    id: 'sched-1',
    time: 'TBD',
    title: 'Doors open / registration',
    description: 'Placeholder schedule item — edit in Admin.',
    active: true,
  },
  {
    id: 'sched-2',
    time: 'TBD',
    title: 'Placeholder activity block',
    description: 'Placeholder schedule item — edit in Admin.',
    active: true,
  },
];

// ---- announcements (placeholders) -------------------------------

export const ANNOUNCEMENTS = [
  {
    id: 'ann-1',
    title: "Welcome to The Loc Party!",
    body: 'This is a placeholder announcement. Post real updates here during the event.',
    timestamp: null,
    active: true,
  },
];

// ---- prizes (placeholders) ---------------------------------------

export const PRIZES = [
  {
    id: 'prize-1',
    title: 'Prize Placeholder',
    description: 'Describe the real prize here.',
    active: true,
  },
];

// ---- scavenger hunt challenges (placeholder cards, not a full hunt) --

export const CHALLENGES = [
  {
    id: 'ch-1',
    title: 'Placeholder Challenge — Say Hi',
    description: 'Example clue text. Replace with a real challenge once locations/vendors are set.',
    category: 'Connection',
    location: 'TBD',
    vendorId: null,
    startTime: null,
    endTime: null,
    pointValue: 20,
    entryValue: 0,
    proofType: 'check_in',
    unlock: { type: 'immediate' },
    completionMessage: "Nice — you're on the board!",
    active: true,
  },
  {
    id: 'ch-2',
    title: 'Placeholder Challenge — Vendor Visit',
    description: 'Example: visit a featured vendor and scan their QR code.',
    category: 'Vendor',
    location: 'TBD',
    vendorId: 'vendor-1',
    startTime: null,
    endTime: null,
    pointValue: 15,
    entryValue: 1,
    proofType: 'qr_scan',
    unlock: { type: 'point_threshold', minPoints: 25 },
    completionMessage: 'Vendor visit logged!',
    active: true,
  },
  {
    id: 'ch-3',
    title: 'Placeholder Challenge — Show Your Look',
    description: 'Example: upload a photo of your Loc Party look for this challenge.',
    category: 'Photo',
    location: 'TBD',
    vendorId: null,
    startTime: null,
    endTime: null,
    pointValue: 30,
    entryValue: 1,
    proofType: 'photo_upload',
    unlock: { type: 'after_challenge', challengeId: 'ch-1' },
    completionMessage: 'Looking good! Submission received.',
    active: true,
  },
  {
    id: 'ch-4',
    title: 'Placeholder Challenge — Surprise Group Activity',
    description: 'Example: a relationship-status-gated activity. Replace once real content is mapped.',
    category: 'Connection',
    location: 'TBD',
    vendorId: null,
    startTime: null,
    endTime: null,
    pointValue: 25,
    entryValue: 1,
    proofType: 'admin_approval',
    unlock: { type: 'relationship_group', groups: ['single', 'dating'] },
    completionMessage: 'You found the surprise!',
    active: false,
  },
];

// ---- raffle config (placeholder) ---------------------------------

export const RAFFLE_CONFIG = {
  rules: 'Placeholder rules text — edit in Admin before the event.',
  prize: 'Placeholder prize description.',
  deadline: null,
  drawingTime: null,
  eligibility: 'One entry per qualifying action, no purchase necessary.',
  contactMethod: 'Display name in app',
  mustBePresent: false,
  status: 'open', // 'open' | 'closed' | 'drawn'
  winnerEntryId: null,
  announced: false,
};

// ---- theme colors (editable without touching code) -----------------
// Each relationship status maps to an accent color + a readable "ink"
// (text) color to use on top of that accent. Edit these from
// Admin → Settings; the app re-reads them on load.

export const THEME_COLORS = {
  single: { accent: '#ee3a2f', ink: '#ffffff' },
  dating: { accent: '#6a2c91', ink: '#ffffff' },
  partnered: { accent: '#3cb54a', ink: '#0f2b13' },
  married: { accent: '#ec1279', ink: '#ffffff' },
  private: { accent: '#2f5fde', ink: '#ffffff' },
};

// ---- admin (demo-only) --------------------------------------------

export const ADMIN_DEMO_PIN = '1234';
