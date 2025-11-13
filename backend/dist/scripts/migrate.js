"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = require("../config/database");
async function runMigrations() {
    try {
        console.log('🚀 Starting database migration...');
        // Read the SQL file
        const sqlFilePath = path_1.default.join(__dirname, 'createTables.sql');
        const sqlContent = fs_1.default.readFileSync(sqlFilePath, 'utf8');
        // Split the SQL content into individual statements
        // Handle multi-line statements and comments properly
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => {
            const trimmed = stmt.trim();
            return trimmed.length > 0 &&
                !trimmed.startsWith('--') &&
                !trimmed.startsWith('/*') &&
                trimmed !== '';
        })
            .map(stmt => stmt.replace(/--.*$/gm, '').trim()) // Remove inline comments
            .filter(stmt => stmt.length > 0);
        console.log(`📄 Found ${statements.length} SQL statements to execute`);
        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
                try {
                    await (0, database_1.query)(statement);
                }
                catch (error) {
                    // Ignore "already exists" errors for idempotent operations
                    if (!error.message.includes('already exists') &&
                        !error.message.includes('does not exist') &&
                        !error.message.includes('duplicate key')) {
                        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
                        console.error(`Statement: ${statement.substring(0, 100)}...`);
                        throw error;
                    }
                    else {
                        console.log(`⚠️  Statement ${i + 1} skipped (${error.message.includes('already exists') ? 'already exists' : 'duplicate key'})`);
                    }
                }
            }
        }
        console.log('✅ Database migration completed successfully!');
    }
    catch (error) {
        console.error('❌ Database migration failed:', error);
        process.exit(1);
    }
}
// Run migrations if this script is executed directly
if (require.main === module) {
    runMigrations();
}
//# sourceMappingURL=migrate.js.map