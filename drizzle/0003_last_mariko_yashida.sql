CREATE TABLE `channel_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`channel` enum('email','sms','linkedin','social_facebook','social_instagram','social_twitter','social_tiktok','call_inbound','call_outbound','direct_mail','webform','chat','event') NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`provider` varchar(128),
	`config` json,
	`dailyLimit` int,
	`monthlyBudget` decimal(10,2),
	`status` enum('active','inactive','error') NOT NULL DEFAULT 'inactive',
	`lastActivityAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `channel_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_channel_user_channel` UNIQUE(`userId`,`channel`)
);
--> statement-breakpoint
CREATE TABLE `contact_custom_fields` (
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
--> statement-breakpoint
CREATE TABLE `contact_interactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`contactId` int NOT NULL,
	`channel` enum('email','sms','linkedin','social_facebook','social_instagram','social_twitter','social_tiktok','call_inbound','call_outbound','direct_mail','webform','chat','event') NOT NULL,
	`direction` enum('inbound','outbound') NOT NULL,
	`type` enum('message_sent','message_received','message_opened','message_clicked','call_made','call_received','call_missed','voicemail_left','form_submitted','page_visited','chat_started','chat_message','event_registered','event_attended','event_missed','connection_sent','connection_accepted','profile_viewed','mail_sent','mail_delivered','mail_returned','post_published','post_engaged','dm_sent','dm_received') NOT NULL,
	`subject` varchar(512),
	`body` text,
	`metadata` json,
	`campaignId` int,
	`platform` varchar(64),
	`externalId` varchar(256),
	`sentiment` enum('positive','neutral','negative'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contact_interactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `custom_field_definitions` (
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
--> statement-breakpoint
CREATE TABLE `ghl_import_jobs` (
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
--> statement-breakpoint
ALTER TABLE `campaign_templates` MODIFY COLUMN `channel` enum('email','sms','linkedin','social_facebook','social_instagram','social_twitter','social_tiktok','call_inbound','call_outbound','direct_mail','webform','chat','event') NOT NULL;--> statement-breakpoint
ALTER TABLE `campaigns` MODIFY COLUMN `channel` enum('email','sms','linkedin','multi','social_facebook','social_instagram','social_twitter','social_tiktok','call_inbound','call_outbound','direct_mail','webform','chat','event') NOT NULL;--> statement-breakpoint
ALTER TABLE `contacts` MODIFY COLUMN `state` varchar(64);--> statement-breakpoint
ALTER TABLE `contacts` MODIFY COLUMN `tier` enum('gold','silver','bronze','archive','unscored') DEFAULT 'unscored';--> statement-breakpoint
ALTER TABLE `contacts` ADD `firstNameRaw` varchar(128);--> statement-breakpoint
ALTER TABLE `contacts` ADD `lastNameRaw` varchar(128);--> statement-breakpoint
ALTER TABLE `contacts` ADD `contactName` varchar(256);--> statement-breakpoint
ALTER TABLE `contacts` ADD `additionalEmails` json;--> statement-breakpoint
ALTER TABLE `contacts` ADD `country` varchar(8);--> statement-breakpoint
ALTER TABLE `contacts` ADD `website` varchar(512);--> statement-breakpoint
ALTER TABLE `contacts` ADD `source` varchar(128);--> statement-breakpoint
ALTER TABLE `contacts` ADD `contactType` varchar(64);--> statement-breakpoint
ALTER TABLE `contacts` ADD `dateOfBirth` varchar(32);--> statement-breakpoint
ALTER TABLE `contacts` ADD `timezone` varchar(64);--> statement-breakpoint
ALTER TABLE `contacts` ADD `dnd` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `contacts` ADD `dndSettings` json;--> statement-breakpoint
ALTER TABLE `contacts` ADD `assignedTo` varchar(128);--> statement-breakpoint
ALTER TABLE `contacts` ADD `profilePhoto` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `facebookLeadId` varchar(128);--> statement-breakpoint
ALTER TABLE `contacts` ADD `linkedInLeadId` varchar(128);--> statement-breakpoint
ALTER TABLE `contacts` ADD `originalScore` decimal(5,2);--> statement-breakpoint
ALTER TABLE `contacts` ADD `ghlDateAdded` timestamp;--> statement-breakpoint
ALTER TABLE `contacts` ADD `ghlDateUpdated` timestamp;--> statement-breakpoint
CREATE INDEX `idx_ccf_contactId` ON `contact_custom_fields` (`contactId`);--> statement-breakpoint
CREATE INDEX `idx_ccf_ghlFieldId` ON `contact_custom_fields` (`ghlFieldId`);--> statement-breakpoint
CREATE INDEX `idx_interactions_contactId` ON `contact_interactions` (`contactId`);--> statement-breakpoint
CREATE INDEX `idx_interactions_channel` ON `contact_interactions` (`channel`);--> statement-breakpoint
CREATE INDEX `idx_interactions_userId` ON `contact_interactions` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_interactions_campaignId` ON `contact_interactions` (`campaignId`);--> statement-breakpoint
CREATE INDEX `idx_contacts_phone` ON `contacts` (`phone`);--> statement-breakpoint
CREATE INDEX `idx_contacts_ghlContactId` ON `contacts` (`ghlContactId`);--> statement-breakpoint
CREATE INDEX `idx_contacts_syncStatus` ON `contacts` (`syncStatus`);