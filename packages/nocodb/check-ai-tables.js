const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path to the NocoDB database
const dbPath = path.join(__dirname, 'noco.db');

console.log('Checking AI tables in database:', dbPath);

const db = new sqlite3.Database(dbPath);

// Check if AI tables exist
db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%ai%'", (err, rows) => {
  if (err) {
    console.error('Error checking tables:', err);
  } else {
    console.log('AI-related tables found:');
    rows.forEach(row => {
      console.log('-', row.name);
    });
    
    if (rows.length === 0) {
      console.log('No AI tables found!');
    }
  }
  
  // Check specific AI tables
  const aiTables = ['nc_ai_conversations', 'nc_ai_messages'];
  
  aiTables.forEach(tableName => {
    db.get(`SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='${tableName}'`, (err, row) => {
      if (err) {
        console.error(`Error checking ${tableName}:`, err);
      } else {
        console.log(`${tableName}: ${row.count > 0 ? 'EXISTS' : 'NOT FOUND'}`);
      }
    });
  });
  
  // Close database after a short delay to allow queries to complete
  setTimeout(() => {
    db.close();
    console.log('Database check completed.');
  }, 1000);
});



