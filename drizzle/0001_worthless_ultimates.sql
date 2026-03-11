CREATE TABLE `zendesk_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain` text NOT NULL,
	`userEmail` text NOT NULL,
	`apiToken` text NOT NULL,
	`label` varchar(255),
	`isActive` int NOT NULL DEFAULT 1,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `zendesk_config_id` PRIMARY KEY(`id`)
);
