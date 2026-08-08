CREATE TABLE `activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`type` enum('sync','import','export','campaign','enrichment','integration','webhook','backup','auth','system') NOT NULL,
	`action` varchar(128) NOT NULL,
	`description` text,
	`metadata` json,
	`severity` enum('info','warning','error','success') NOT NULL DEFAULT 'info',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `backups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('contacts','campaigns','full') NOT NULL,
	`format` enum('csv','json') NOT NULL,
	`fileUrl` text,
	`fileKey` varchar(512),
	`recordCount` int DEFAULT 0,
	`fileSize` bigint DEFAULT 0,
	`status` enum('pending','generating','ready','expired') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bulk_imports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(512) NOT NULL,
	`fileUrl` text,
	`totalRows` int DEFAULT 0,
	`processedRows` int DEFAULT 0,
	`createdCount` int DEFAULT 0,
	`updatedCount` int DEFAULT 0,
	`failedCount` int DEFAULT 0,
	`skippedCount` int DEFAULT 0,
	`status` enum('pending','running','paused','completed','failed') NOT NULL DEFAULT 'pending',
	`resumeFromRow` int DEFAULT 0,
	`errorLog` json,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bulk_imports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`channel` enum('email','sms','linkedin') NOT NULL,
	`subject` varchar(512),
	`body` text,
	`variables` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`channel` enum('email','sms','linkedin','multi') NOT NULL,
	`status` enum('draft','scheduled','running','paused','completed','failed') NOT NULL DEFAULT 'draft',
	`templateId` int,
	`audienceFilter` json,
	`audienceCount` int DEFAULT 0,
	`scheduledAt` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`metrics` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ghlContactId` varchar(128),
	`firstName` varchar(128),
	`lastName` varchar(128),
	`email` varchar(320),
	`phone` varchar(32),
	`address` text,
	`city` varchar(128),
	`state` varchar(8),
	`postalCode` varchar(16),
	`companyName` varchar(256),
	`segment` enum('residential','commercial','agricultural','cpa_tax','estate_attorney','hr_benefits','insurance','nonprofit','other') DEFAULT 'other',
	`tier` enum('gold','silver','bronze','unscored') DEFAULT 'unscored',
	`propensityScore` decimal(5,2),
	`tags` json,
	`productOpportunities` text,
	`specialistRoute` varchar(128),
	`premiumFinancing` varchar(8),
	`campaign` varchar(256),
	`region` varchar(16),
	`enrichedAt` timestamp,
	`enrichmentConfidence` decimal(5,2),
	`enrichmentSource` varchar(64),
	`syncStatus` enum('synced','pending','error','local_only') DEFAULT 'local_only',
	`lastSyncedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` enum('ghl','dripify','linkedin','smsit') NOT NULL,
	`label` varchar(128),
	`credentials` text,
	`status` enum('connected','disconnected','error') NOT NULL DEFAULT 'disconnected',
	`lastCheckedAt` timestamp,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integrations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sync_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`direction` enum('push','pull') NOT NULL,
	`platform` enum('ghl','dripify','linkedin','smsit') NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int,
	`payload` json,
	`status` enum('pending','processing','completed','failed','dlq') NOT NULL DEFAULT 'pending',
	`attempts` int DEFAULT 0,
	`maxAttempts` int DEFAULT 3,
	`lastError` text,
	`nextRetryAt` timestamp,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sync_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `ghlCompanyId` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `ghlUserId` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `ghlLocationId` varchar(128);--> statement-breakpoint
CREATE INDEX `idx_activity_type` ON `activity_log` (`type`);--> statement-breakpoint
CREATE INDEX `idx_activity_userId` ON `activity_log` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_contacts_userId` ON `contacts` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_contacts_email` ON `contacts` (`email`);--> statement-breakpoint
CREATE INDEX `idx_contacts_segment` ON `contacts` (`segment`);--> statement-breakpoint
CREATE INDEX `idx_contacts_tier` ON `contacts` (`tier`);--> statement-breakpoint
CREATE INDEX `idx_sync_status` ON `sync_queue` (`status`);--> statement-breakpoint
CREATE INDEX `idx_sync_platform` ON `sync_queue` (`platform`);