import fs from 'fs';
import path from 'path';
import { query } from '../config/database';

async function runMigrations() {
  try {
    console.log('🚀 Starting database migration...');

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'createTables.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Split the SQL content into individual statements
    // Handle multi-line statements, functions, and comments properly
    const statements = [];
    let currentStatement = '';
    let inFunction = false;
    let inDollarQuote = false;
    let dollarQuoteTag = '';

    const lines = sqlContent.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip comments
      if (trimmedLine.startsWith('--') || trimmedLine.startsWith('/*')) {
        continue;
      }

      // Handle dollar quoting for functions
      if (trimmedLine.includes('$$')) {
        if (!inDollarQuote) {
          inDollarQuote = true;
          dollarQuoteTag = trimmedLine.split('$$')[0] + '$$';
        } else if (trimmedLine.includes('$$') && trimmedLine.includes(dollarQuoteTag.replace('$$', ''))) {
          inDollarQuote = false;
          dollarQuoteTag = '';
        }
      }

      // Check if we're entering a function
      if (trimmedLine.includes('CREATE OR REPLACE FUNCTION')) {
        inFunction = true;
      }

      currentStatement += line + '\n';

      // Check for statement end
      if (!inFunction && !inDollarQuote && trimmedLine.endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      } else if (inFunction && trimmedLine.includes('LANGUAGE plpgsql;')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
        inFunction = false;
      }
    }

    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    console.log(`📄 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        try {
          await query(statement);
        } catch (error: any) {
          // Ignore "already exists" errors for idempotent operations
          if (!error.message.includes('already exists') &&
              !error.message.includes('does not exist') &&
              !error.message.includes('duplicate key')) {
            console.error(`❌ Error executing statement ${i + 1}:`, error.message);
            console.error(`Statement: ${statement.substring(0, 100)}...`);
            throw error;
          } else {
            console.log(`⚠️  Statement ${i + 1} skipped (${error.message.includes('already exists') ? 'already exists' : 'duplicate key'})`);
          }
        }
      }
    }

    console.log('✅ Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations();
}

export { runMigrations };