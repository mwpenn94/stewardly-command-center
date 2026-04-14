-- Apply channel_configs table if it doesn't exist
CREATE TABLE IF NOT EXISTS `channel_configs` (
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
	CONSTRAINT `channel_configs_id` PRIMARY KEY(`id`)
);

CREATE UNIQUE INDEX `idx_channel_user_channel` ON `channel_configs` (`userId`,`channel`);
