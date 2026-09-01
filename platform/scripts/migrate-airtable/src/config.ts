import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const config = {
  airtableApiKey: required("AIRTABLE_API_KEY"),
  airtableBaseId: required("AIRTABLE_BASE_ID"),
  databaseUrl: required("DATABASE_URL"),
  firebaseServiceAccountJson: required("FIREBASE_SERVICE_ACCOUNT_JSON"),
  awsRegion: process.env.AWS_REGION,
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  s3BucketName: process.env.S3_BUCKET_NAME,
  dryRun: process.argv.includes("--dry-run"),
};

// Real table IDs from the live base (appxBPjMal2Se5ZvI), gathered via the Airtable API
// directly rather than guessed — see the plan doc for how these were confirmed.
export const TABLES = {
  employees: "tbltLRWZrfxOQrvwb",
  attendance: "tblRmoYPMxxNoZodP",
  leaveRequests: "tblsP21keD5XsGbuh",
  announcements: "tblS6lWfLZbSaFOG8",
  announcementComments: "tbl2sCATjchdkho3C",
  announcementReads: "tbl4pSk19h2uw3XN7",
  payroll: "tblQ0rQvMPvXuqulM",
  medicalClaims: "tblcrFxADnxLQSHfW",
  emergencyContacts: "tblKpfrrK7dIgJfsl",
} as const;
