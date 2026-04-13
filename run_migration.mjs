import mysql from 'mysql2/promise';
import fs from 'fs';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('No DATABASE_URL');
  process.exit(1);
}

const conn = await mysql.createConnection(url);

// 1. Create new tables
const statements = [
  // contact_custom_fields
  `CREATE TABLE IF NOT EXISTS contact_custom_fields (
    id int AUTO_INCREMENT NOT NULL,
    contactId int NOT NULL,
    ghlFieldId varchar(128) NOT NULL,
    fieldName varchar(256) NOT NULL,
    fieldKey varchar(256),
    fieldType varchar(32),
    value text,
    createdAt timestamp NOT NULL DEFAULT (now()),
    updatedAt timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT contact_custom_fields_id PRIMARY KEY(id),
    CONSTRAINT idx_ccf_contact_field UNIQUE(contactId, ghlFieldId)
  )`,
  
  // custom_field_definitions
  `CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id int AUTO_INCREMENT NOT NULL,
    ghlFieldId varchar(128) NOT NULL,
    fieldName varchar(256) NOT NULL,
    fieldKey varchar(256),
    fieldType varchar(32) NOT NULL,
    options json,
    category varchar(64),
    displayOrder int DEFAULT 0,
    isVisible boolean DEFAULT true,
    createdAt timestamp NOT NULL DEFAULT (now()),
    updatedAt timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT custom_field_definitions_id PRIMARY KEY(id),
    CONSTRAINT custom_field_definitions_ghlFieldId_unique UNIQUE(ghlFieldId)
  )`,
  
  // ghl_import_jobs
  `CREATE TABLE IF NOT EXISTS ghl_import_jobs (
    id int AUTO_INCREMENT NOT NULL,
    userId int NOT NULL,
    status enum('pending','running','paused','completed','failed') NOT NULL DEFAULT 'pending',
    totalContacts int DEFAULT 0,
    importedCount int DEFAULT 0,
    updatedCount int DEFAULT 0,
    skippedCount int DEFAULT 0,
    failedCount int DEFAULT 0,
    lastGhlContactId varchar(128),
    errorLog json,
    startedAt timestamp,
    completedAt timestamp,
    createdAt timestamp NOT NULL DEFAULT (now()),
    updatedAt timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT ghl_import_jobs_id PRIMARY KEY(id)
  )`,
];

// 2. ALTER contacts - add new columns (use try/catch for each to handle "column already exists")
const alterStatements = [
  `ALTER TABLE contacts MODIFY COLUMN state varchar(64)`,
  `ALTER TABLE contacts MODIFY COLUMN tier enum('gold','silver','bronze','archive','unscored') DEFAULT 'unscored'`,
  `ALTER TABLE contacts ADD firstNameRaw varchar(128)`,
  `ALTER TABLE contacts ADD lastNameRaw varchar(128)`,
  `ALTER TABLE contacts ADD contactName varchar(256)`,
  `ALTER TABLE contacts ADD additionalEmails json`,
  `ALTER TABLE contacts ADD country varchar(8)`,
  `ALTER TABLE contacts ADD website varchar(512)`,
  `ALTER TABLE contacts ADD source varchar(128)`,
  `ALTER TABLE contacts ADD contactType varchar(64)`,
  `ALTER TABLE contacts ADD dateOfBirth varchar(32)`,
  `ALTER TABLE contacts ADD timezone varchar(64)`,
  `ALTER TABLE contacts ADD dnd boolean DEFAULT false`,
  `ALTER TABLE contacts ADD dndSettings json`,
  `ALTER TABLE contacts ADD assignedTo varchar(128)`,
  `ALTER TABLE contacts ADD profilePhoto text`,
  `ALTER TABLE contacts ADD facebookLeadId varchar(128)`,
  `ALTER TABLE contacts ADD linkedInLeadId varchar(128)`,
  `ALTER TABLE contacts ADD originalScore decimal(5,2)`,
  `ALTER TABLE contacts ADD ghlDateAdded timestamp`,
  `ALTER TABLE contacts ADD ghlDateUpdated timestamp`,
];

// 3. Indexes
const indexStatements = [
  `CREATE INDEX idx_ccf_contactId ON contact_custom_fields (contactId)`,
  `CREATE INDEX idx_ccf_ghlFieldId ON contact_custom_fields (ghlFieldId)`,
  `CREATE INDEX idx_contacts_phone ON contacts (phone)`,
  `CREATE INDEX idx_contacts_ghlContactId ON contacts (ghlContactId)`,
  `CREATE INDEX idx_contacts_syncStatus ON contacts (syncStatus)`,
];

console.log('=== Creating new tables ===');
for (const sql of statements) {
  try {
    await conn.execute(sql);
    console.log('OK: Created table');
  } catch (e) {
    console.log(`SKIP: ${e.message.substring(0, 80)}`);
  }
}

console.log('\n=== Altering contacts table ===');
for (const sql of alterStatements) {
  try {
    await conn.execute(sql);
    console.log(`OK: ${sql.substring(0, 60)}`);
  } catch (e) {
    console.log(`SKIP: ${e.message.substring(0, 80)}`);
  }
}

console.log('\n=== Creating indexes ===');
for (const sql of indexStatements) {
  try {
    await conn.execute(sql);
    console.log(`OK: ${sql.substring(0, 60)}`);
  } catch (e) {
    console.log(`SKIP: ${e.message.substring(0, 80)}`);
  }
}

// Verify
const [tables] = await conn.execute("SHOW TABLES");
console.log('\n=== All tables ===');
for (const row of tables) {
  console.log(' ', Object.values(row)[0]);
}

const [cols] = await conn.execute("SHOW COLUMNS FROM contacts");
console.log(`\n=== contacts table: ${cols.length} columns ===`);

await conn.end();
console.log('\nMigration complete!');
