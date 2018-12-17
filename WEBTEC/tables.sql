--
-- Table structure for table `webchat_users`
--

CREATE TABLE `webchat_users` (
	`id` int unsigned NOT NULL auto_increment,
	`name` varchar(16) NOT NULL,
	`email` varchar(256) NOT NULL,
	`pw` varchar(256) NOT NULL,
	`fingerprint` varchar(256),
	`admin` boolean not null default 0,
	`active` boolean not null default 0,
	`last_activity` timestamp NOT NULL default CURRENT_TIMESTAMP,
	PRIMARY KEY  (`id`),
	UNIQUE KEY `name` (`name`),
	KEY `last_activity` (`last_activity`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8;

--
-- Table structure for table `webchat_lines`
--

CREATE TABLE `webchat_lines` (
	`id` int unsigned NOT NULL auto_increment,
	`author_id` int not null,
	`text` varchar(255) NOT NULL,
	`ts` timestamp NOT NULL default CURRENT_TIMESTAMP,
	PRIMARY KEY  (`id`),
	FOREIGN KEY (author_id) REFERENCES webchat_users.id,
	KEY `ts` (`ts`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8;