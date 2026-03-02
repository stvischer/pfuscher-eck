-- Lookup table for countries (ISO 3166-1)
-- Drop and recreate to ensure the schema is correct even when the table
-- already existed with a different column set.
DROP TABLE IF EXISTS `cnf_countries`;

CREATE TABLE `cnf_countries` (
  `id`         SMALLINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `iso2`       CHAR(2)             NOT NULL COMMENT 'ISO 3166-1 alpha-2 (e.g. DE)',
  `iso3`       CHAR(3)             NOT NULL COMMENT 'ISO 3166-1 alpha-3 (e.g. DEU)',
  `name`       VARCHAR(100)        NOT NULL COMMENT 'English display name',
  `phone_code` VARCHAR(10)         NOT NULL DEFAULT '' COMMENT 'Calling code without leading +',

  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uq_cnf_countries_iso2` (`iso2`),
  UNIQUE KEY `uq_cnf_countries_iso3` (`iso3`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
