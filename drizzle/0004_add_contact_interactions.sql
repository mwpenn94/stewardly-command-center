-- Add missing contact_interactions table (was in schema but skipped in safe migration)
CREATE TABLE IF NOT EXISTS `contact_interactions` (
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
CREATE INDEX `idx_interactions_contactId` ON `contact_interactions` (`contactId`);
--> statement-breakpoint
CREATE INDEX `idx_interactions_channel` ON `contact_interactions` (`channel`);
--> statement-breakpoint
CREATE INDEX `idx_interactions_userId` ON `contact_interactions` (`userId`);
--> statement-breakpoint
CREATE INDEX `idx_interactions_campaignId` ON `contact_interactions` (`campaignId`);
