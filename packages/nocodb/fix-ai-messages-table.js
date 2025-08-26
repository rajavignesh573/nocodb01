const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path to the NocoDB database
const dbPath = path.join(__dirname, 'noco.db');

console.log('=== Fixing AI Messages Table ===');
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath);

// Add missing updated_at column to AI messages table
const queries = [
  "ALTER TABLE nc_ai_messages ADD COLUMN updated_at TEXT",
  "UPDATE nc_ai_messages SET updated_at = created_at WHERE updated_at IS NULL"
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
      
      // Verify the table has the correct structure
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
    }
  });
});
