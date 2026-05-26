CREATE TABLE IF NOT EXISTS `ops_knowledge_prompt_versions` (
  `id` varchar(36) NOT NULL,
  `subject` varchar(32) NOT NULL,
  `grade_segment` varchar(32) NOT NULL,
  `mode` varchar(16) NOT NULL,
  `version` int NOT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'draft',
  `name` varchar(120) NOT NULL,
  `system_prompt` text NOT NULL,
  `teaching_style` text NOT NULL,
  `output_format` text NOT NULL,
  `safety_constraints` text NOT NULL,
  `anti_divergence_rules` text NOT NULL,
  `variables_json` text NULL,
  `rollback_from_version_id` varchar(36) NULL,
  `created_by` varchar(64) NOT NULL,
  `published_by` varchar(64) NULL,
  `published_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ops_kp_dim_version_unique` (`subject`,`grade_segment`,`mode`,`version`),
  KEY `ops_kp_dim_status_idx` (`subject`,`grade_segment`,`mode`,`status`),
  KEY `ops_kp_created_at_idx` (`created_at`)
);

CREATE TABLE IF NOT EXISTS `ops_message_templates` (
  `id` varchar(36) NOT NULL,
  `name` varchar(80) NOT NULL,
  `category` varchar(24) NOT NULL DEFAULT 'system',
  `title_template` varchar(120) NOT NULL,
  `content_template` text NOT NULL,
  `action_url` varchar(500) NULL,
  `variables_json` text NULL,
  `is_enabled` boolean NOT NULL DEFAULT TRUE,
  `created_by` varchar(64) NOT NULL,
  `updated_by` varchar(64) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ops_msg_tpl_name_unique` (`name`),
  KEY `ops_msg_tpl_enabled_idx` (`is_enabled`)
);

CREATE TABLE IF NOT EXISTS `ops_preset_contents` (
  `id` varchar(36) NOT NULL,
  `content_type` varchar(24) NOT NULL,
  `title` varchar(120) NOT NULL,
  `summary` text NULL,
  `payload_json` text NOT NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  `is_visible` boolean NOT NULL DEFAULT TRUE,
  `created_by` varchar(64) NOT NULL,
  `updated_by` varchar(64) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ops_preset_type_visible_sort_idx` (`content_type`,`is_visible`,`sort_order`)
);
