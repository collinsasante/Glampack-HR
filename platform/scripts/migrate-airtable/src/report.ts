interface TableStats {
  read: number;
  migrated: number;
  skipped: number;
}

// Nothing gets silently dropped — every unresolved/ambiguous row is recorded here for
// manual review before cutover, per the migration plan's explicit requirement.
//
// "Skipped" and "warning" are deliberately distinct: a skip means the row was NOT
// migrated at all (e.g. no resolvable Employee link). A warning means the row WAS
// migrated successfully but with a caveat worth a human's attention (e.g. no matching
// Firebase user yet, or a duplicate Employee ID that got a freshly generated one).
// Conflating these would make e.g. "Employees: skipped=48" look like 48 real failures
// when the real number is 0 — every employee migrated, some just carry a footnote.
export class MigrationReport {
  private stats = new Map<string, TableStats>();
  private warnings: string[] = [];
  private skipMessages: string[] = [];

  private statsFor(table: string): TableStats {
    let s = this.stats.get(table);
    if (!s) {
      s = { read: 0, migrated: 0, skipped: 0 };
      this.stats.set(table, s);
    }
    return s;
  }

  recordRead(table: string, count = 1) {
    this.statsFor(table).read += count;
  }

  recordMigrated(table: string, count = 1) {
    this.statsFor(table).migrated += count;
  }

  /** Row was NOT migrated. */
  recordSkipped(table: string, recordId: string, reason: string) {
    this.statsFor(table).skipped += 1;
    this.skipMessages.push(`[${table}] ${recordId}: ${reason}`);
  }

  /** Row WAS migrated, but with something worth a human reviewing. */
  recordWarning(table: string, recordId: string, reason: string) {
    this.warnings.push(`[${table}] ${recordId}: ${reason}`);
  }

  print() {
    console.log("\n=== Migration Report ===\n");
    for (const [table, s] of this.stats) {
      console.log(`${table}: read=${s.read} migrated=${s.migrated} skipped=${s.skipped}`);
    }

    if (this.skipMessages.length > 0) {
      console.log(`\n--- ${this.skipMessages.length} row(s) skipped entirely — review before cutover ---`);
      for (const m of this.skipMessages) console.log(`  ${m}`);
    }

    if (this.warnings.length > 0) {
      console.log(`\n--- ${this.warnings.length} row(s) migrated with a caveat — worth reviewing, not blocking ---`);
      for (const w of this.warnings) console.log(`  ${w}`);
    }

    if (this.skipMessages.length === 0 && this.warnings.length === 0) {
      console.log("\nNo warnings.");
    }
  }

  get hasWarnings() {
    return this.skipMessages.length > 0 || this.warnings.length > 0;
  }
}
