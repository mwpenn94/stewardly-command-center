-- Safe migration: only new tables and columns (skipping already-existing tables)

-- New table: contact_custom_fields
CREATE TABLE IF NOT EXISTS `contact_custom_fields` (
  `id` int AUTO_INCREMENT NOT NULL,
  `contactId` int NOT NULL,
  `ghlFieldId` varchar(128) NOT NULL,
  `fieldName` varchar(256) NOT NULL,
  `fieldKey` varchar(256),
  `fieldType` varchar(32),
  `value` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `contact_custom_fields_id` PRIMARY KEY(`id`),
  CONSTRAINT `idx_ccf_contact_field` UNIQUE(`contactId`,`ghlFieldId`)
);

-- New table: custom_field_definitions
CREATE TABLE IF NOT EXISTS `custom_field_definitions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `ghlFieldId` varchar(128) NOT NULL,
  `fieldName` varchar(256) NOT NULL,
  `fieldKey` varchar(256),
  `fieldType` varchar(32) NOT NULL,
  `options` json,
  `category` varchar(64),
  `displayOrder` int DEFAULT 0,
  `isVisible` boolean DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `custom_field_definitions_id` PRIMARY KEY(`id`),
  CONSTRAINT `custom_field_definitions_ghlFieldId_unique` UNIQUE(`ghlFieldId`)
);

-- New table: ghl_import_jobs
CREATE TABLE IF NOT EXISTS `ghl_import_jobs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `status` enum('pending','running','paused','completed','failed') NOT NULL DEFAULT 'pending',
  `totalContacts` int DEFAULT 0,
  `importedCount` int DEFAULT 0,
  `updatedCount` int DEFAULT 0,
  `skippedCount` int DEFAULT 0,
  `failedCount` int DEFAULT 0,
  `lastGhlContactId` varchar(128),
  `errorLog` json,
  `startedAt` timestamp,
  `completedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `ghl_import_jobs_id` PRIMARY KEY(`id`)
);
