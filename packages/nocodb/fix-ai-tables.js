const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path to the NocoDB database
const dbPath = path.join(__dirname, 'noco.db');

console.log('=== Fixing AI Tables ===');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath);

// Add missing columns to AI tables
const queries = [
  // Add base_id and workspace_id to nc_ai_conversations
  "ALTER TABLE nc_ai_conversations ADD COLUMN base_id TEXT NOT NULL DEFAULT 'default'",
  "ALTER TABLE nc_ai_conversations ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'default'",
  
  // Add base_id and workspace_id to nc_ai_messages
  "ALTER TABLE nc_ai_messages ADD COLUMN base_id TEXT NOT NULL DEFAULT 'default'",
  "ALTER TABLE nc_ai_messages ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'default'",
  
  // Create indexes for better performance
  "CREATE INDEX IF NOT EXISTS idx_ai_conversations_base_workspace ON nc_ai_conversations(base_id, workspace_id)",
  "CREATE INDEX IF NOT EXISTS idx_ai_messages_base_workspace ON nc_ai_messages(base_id, workspace_id)"
];

let completed = 0;
const total = queries.length;

queries.forEach((query, index) => {
  db.run(query, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log(`✅ Column already exists (${index + 1}/${total}): ${query.substring(0, 50)}...`);
      } else {
        console.log(`❌ Error (${index + 1}/${total}): ${err.message}`);
      }
    } else {
      console.log(`✅ Success (${index + 1}/${total}): ${query.substring(0, 50)}...`);
    }
    
    completed++;
    if (completed === total) {
      console.log('');
      console.log('=== Verification ===');
      
      // Verify the tables have the correct structure
      db.all("PRAGMA table_info(nc_ai_conversations)", (err, rows) => {
        if (err) {
          console.log('❌ Error checking table structure:', err.message);
        } else {
          console.log('nc_ai_conversations columns:');
          rows.forEach(row => {
            console.log(`  - ${row.name} (${row.type})`);
          });
        }
        
        db.all("PRAGMA table_info(nc_ai_messages)", (err, rows) => {
          if (err) {
            console.log('❌ Error checking table structure:', err.message);
          } else {
            console.log('nc_ai_messages columns:');
            rows.forEach(row => {
              console.log(`  - ${row.name} (${row.type})`);
            });
          }
          
          console.log('');
          console.log('=== Fix Complete ===');
          db.close();
        });
      });
    }
  });
});
