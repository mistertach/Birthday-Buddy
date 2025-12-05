#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

loadEnv({ path: resolve(process.cwd(), '.env') });
loadEnv({ path: resolve(process.cwd(), '.env.local') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. Please configure your .env file.');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['error'],
});

const REMINDER_OPTIONS = new Set(['Morning of', '1 day before', '7 days before', 'None']);

const args = process.argv.slice(2);
let filePath;
let userEmail;
let shouldReplace = false;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  switch (arg) {
    case '--file':
    case '-f':
      filePath = args[i + 1];
      i += 1;
      break;
    case '--email':
    case '-e':
      userEmail = args[i + 1];
      i += 1;
      break;
    case '--replace':
      shouldReplace = true;
      break;
    case '--help':
    case '-h':
      printUsage();
      process.exit(0);
      break;
    default:
      console.warn(`Unknown argument: ${arg}`);
      printUsage();
      process.exit(1);
  }
}

if (!filePath || !userEmail) {
  printUsage();
  process.exit(1);
}

async function main() {
  const absolutePath = resolve(process.cwd(), filePath);
  const csvRaw = await readFile(absolutePath, 'utf8');
  const lines = csvRaw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    throw new Error('CSV appears to be empty or missing data rows.');
  }

  const header = splitCsvLine(lines[0]);
  const requiredColumns = ['name', 'bDay', 'bMonth'];
  for (const column of requiredColumns) {
    if (!header.includes(column)) {
      throw new Error(`Missing required column "${column}" in CSV header.`);
    }
  }

  const columnIndex = Object.fromEntries(header.map((col, index) => [col, index]));

  const getValue = (rowParts, key) => {
    const idx = columnIndex[key];
    if (idx === undefined) return undefined;
    return rowParts[idx];
  };

  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) {
    throw new Error(`No user found with email ${userEmail}`);
  }

  if (shouldReplace) {
    await prisma.contact.deleteMany({ where: { userId: user.id } });
  }

  const contactsToCreate = [];

  for (let i = 1; i < lines.length; i += 1) {
    const parts = splitCsvLine(lines[i]);
    if (parts.length === 0) continue;

    const name = getValue(parts, 'name')?.trim();
    const dayValue = parseInt(getValue(parts, 'bDay') ?? '', 10);
    const monthValue = parseInt(getValue(parts, 'bMonth') ?? '', 10);

    if (!name || Number.isNaN(dayValue) || Number.isNaN(monthValue)) {
      console.warn(`Skipping row ${i + 1}: invalid name/day/month`);
      continue;
    }

    const yearRaw = getValue(parts, 'bYear') ?? '';
    const yearNum = parseInt(yearRaw, 10);
    const year = !Number.isNaN(yearNum) && yearNum > 1900 ? yearNum : undefined;

    const phone = normalizeString(getValue(parts, 'phone'));
    const rawRelationship = normalizeString(getValue(parts, 'relationship')) ?? 'Friend';
    const normalizedReminder = normalizeReminder(getValue(parts, 'reminderType'));

    let notes = normalizeString(getValue(parts, 'notes'));
    if (notes && rawRelationship && notes.toLowerCase() === rawRelationship.toLowerCase()) {
      notes = undefined;
    }

    const lastWishedRaw = normalizeString(getValue(parts, 'lastWishedYear'));
    const lastWishedYear = lastWishedRaw ? parseInt(lastWishedRaw, 10) : undefined;

    const parentIdRaw = normalizeString(getValue(parts, 'parentid'));

    const data = {
      userId: user.id,
      name,
      day: dayValue,
      month: monthValue,
      reminderType: normalizedReminder,
      relationship: rawRelationship,
      ...(year !== undefined ? { year } : {}),
      ...(phone ? { phone } : {}),
      ...(notes ? { notes } : {}),
      ...(lastWishedYear && !Number.isNaN(lastWishedYear) ? { lastWishedYear } : {}),
      ...(parentIdRaw ? { parentId: parentIdRaw } : {}),
    };

    contactsToCreate.push(data);
  }

  if (contactsToCreate.length === 0) {
    console.warn('No contacts to import.');
    return;
  }

  await prisma.contact.createMany({ data: contactsToCreate });
  console.log(`Imported ${contactsToCreate.length} contacts for user ${userEmail}.`);
}

function splitCsvLine(line) {
  const tokens = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      tokens.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  tokens.push(current);
  return tokens.map((value) => value.trim());
}

function normalizeString(value) {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function normalizeReminder(value) {
  const trimmed = normalizeString(value);
  if (!trimmed) return 'Morning of';
  if (REMINDER_OPTIONS.has(trimmed)) return trimmed;

  const lowered = trimmed.toLowerCase();
  if (lowered.includes('day') && lowered.includes('before')) return '1 day before';
  if (lowered.includes('week')) return '7 days before';
  if (lowered.includes('none')) return 'None';
  if (lowered.includes('morning')) return 'Morning of';
  return 'Morning of';
}

function printUsage() {
  console.log(`Usage:\n  node scripts/import-contacts.mjs --file <path/to/csv> --email <user@example.com> [--replace]\n\nOptions:\n  --file, -f     Path to the CSV export (required)\n  --email, -e    Email address of the Birthday Buddy user to attach contacts to (required)\n  --replace      Delete the user's existing contacts before importing\n  --help, -h     Show this help message`);
}

main()
  .catch((error) => {
    console.error('Import failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
