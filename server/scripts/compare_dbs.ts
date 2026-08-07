import mysql from 'mysql2/promise';

async function compareDatabases() {
  console.log('🔍 Comparing Local WAMP MySQL with Aiven Cloud MySQL...\n');

  const localConn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'timesheet_db',
  });

  const aivenConn = await mysql.createConnection({
    host: process.env.AIVEN_DB_HOST || 'mysql-630be1a-eglobeits-eb81.a.aivencloud.com',
    port: Number(process.env.AIVEN_DB_PORT) || 20335,
    user: process.env.AIVEN_DB_USER || 'avnadmin',
    password: process.env.AIVEN_DB_PASSWORD || '',
    database: process.env.AIVEN_DB_NAME || 'defaultdb',
    ssl: { rejectUnauthorized: false },
  });

  // 1. Fetch tables
  const [localTablesRaw] = await localConn.query<any[]>('SHOW TABLES');
  const [aivenTablesRaw] = await aivenConn.query<any[]>('SHOW TABLES');

  const localTables = localTablesRaw.map((r: any) => Object.values(r)[0] as string).sort();
  const aivenTables = aivenTablesRaw.map((r: any) => Object.values(r)[0] as string).sort();

  console.log('📋 Local Tables:', localTables.join(', '));
  console.log('📋 Aiven Tables:', aivenTables.join(', '));

  const missingInAiven = localTables.filter((t) => !aivenTables.includes(t));
  const missingInLocal = aivenTables.filter((t) => !localTables.includes(t));

  if (missingInAiven.length > 0) {
    console.log('\n❌ Tables missing in Aiven Cloud:', missingInAiven);
  }
  if (missingInLocal.length > 0) {
    console.log('\n❌ Tables missing in Local:', missingInLocal);
  }

  // 2. Compare Columns for all common tables
  const commonTables = localTables.filter((t) => aivenTables.includes(t));
  let totalMismatches = 0;

  console.log('\n🔎 Inspecting column schema differences per table:\n');

  for (const table of commonTables) {
    const [localCols] = await localConn.query<any[]>(`SHOW FULL COLUMNS FROM \`${table}\``);
    const [aivenCols] = await aivenConn.query<any[]>(`SHOW FULL COLUMNS FROM \`${table}\``);

    const localMap = new Map<string, any>();
    localCols.forEach((c: any) => localMap.set(c.Field, c));

    const aivenMap = new Map<string, any>();
    aivenCols.forEach((c: any) => aivenMap.set(c.Field, c));

    const allFieldNames = Array.from(new Set([...localMap.keys(), ...aivenMap.keys()])).sort();

    const tableIssues: string[] = [];

    for (const field of allFieldNames) {
      const lCol = localMap.get(field);
      const aCol = aivenMap.get(field);

      if (!lCol) {
        tableIssues.push(`  - Column '${field}' MISSING in Local DB`);
        totalMismatches++;
        continue;
      }
      if (!aCol) {
        tableIssues.push(`  - Column '${field}' MISSING in Aiven Cloud DB`);
        totalMismatches++;
        continue;
      }

      // Check types
      if (lCol.Type !== aCol.Type) {
        tableIssues.push(`  - Column '${field}' Type mismatch: Local (${lCol.Type}) vs Aiven (${aCol.Type})`);
        totalMismatches++;
      }
      // Check Nullable
      if (lCol.Null !== aCol.Null) {
        tableIssues.push(`  - Column '${field}' Nullable mismatch: Local (${lCol.Null}) vs Aiven (${aCol.Null})`);
        totalMismatches++;
      }
    }

    if (tableIssues.length === 0) {
      console.log(`  ✅ Table '${table}': Perfect match (${localCols.length} columns)`);
    } else {
      console.log(`  ❌ Table '${table}' has ${tableIssues.length} mismatch(es):`);
      tableIssues.forEach((issue) => console.log(issue));
    }
  }

  console.log('\n============================================================');
  if (totalMismatches === 0 && missingInAiven.length === 0 && missingInLocal.length === 0) {
    console.log('🎉 SUCCESS: Local DB and Aiven Cloud DB schemas match 100%!');
  } else {
    console.log(`⚠️  TOTAL MISMATCHES FOUND: ${totalMismatches + missingInAiven.length + missingInLocal.length}`);
  }
  console.log('============================================================\n');

  await localConn.end();
  await aivenConn.end();
}

compareDatabases().catch(console.error);
