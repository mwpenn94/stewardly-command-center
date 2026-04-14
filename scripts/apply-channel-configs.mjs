import mysql from "mysql2/promise";
import fs from "fs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

// Check if table exists
const [rows] = await conn.execute("SHOW TABLES LIKE 'channel_configs'");
if (rows.length > 0) {
  console.log("channel_configs table already exists");
  await conn.end();
  process.exit(0);
}

// Create the table
console.log("Creating channel_configs table...");
await conn.execute(`CREATE TABLE IF NOT EXISTS channel_configs (
  id int AUTO_INCREMENT NOT NULL,
  userId int NOT NULL,
  channel enum('email','sms','linkedin','social_facebook','social_instagram','social_twitter','social_tiktok','call_inbound','call_outbound','direct_mail','webform','chat','event') NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  provider varchar(128),
  config json,
  dailyLimit int,
  monthlyBudget decimal(10,2),
  status enum('active','inactive','error') NOT NULL DEFAULT 'inactive',
  lastActivityAt timestamp,
  createdAt timestamp NOT NULL DEFAULT (now()),
  updatedAt timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT channel_configs_id PRIMARY KEY(id)
)`);

// Create unique index
console.log("Creating unique index...");
await conn.execute("CREATE UNIQUE INDEX idx_channel_user_channel ON channel_configs (userId, channel)");

console.log("Migration applied successfully");
await conn.end();
