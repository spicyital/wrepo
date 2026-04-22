-- Initial WRepo schema.
-- Hand-written to match the Prisma schema and seed the tsvector trigger
-- so `prisma migrate deploy` works on a fresh database.

-- ========== Enums ==========
CREATE TYPE "Role" AS ENUM ('super_admin', 'editor', 'submitter');
CREATE TYPE "PaperStatus" AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'published', 'archived');
CREATE TYPE "DegreeLevel" AS ENUM ('undergraduate', 'honours', 'masters', 'doctoral', 'other');
CREATE TYPE "DocumentType" AS ENUM ('thesis', 'research_paper', 'article', 'report', 'working_paper', 'other');

-- ========== User ==========
CREATE TABLE "User" (
    "id"           TEXT PRIMARY KEY,
    "email"        TEXT NOT NULL,
    "name"         TEXT,
    "passwordHash" TEXT NOT NULL,
    "role"         "Role" NOT NULL DEFAULT 'submitter',
    "orcid"        TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- ========== Department ==========
CREATE TABLE "Department" (
    "id"        TEXT PRIMARY KEY,
    "name"      TEXT NOT NULL,
    "slug"      TEXT NOT NULL,
    "shortCode" TEXT,
    "about"     TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Department_name_key"      ON "Department"("name");
CREATE UNIQUE INDEX "Department_slug_key"      ON "Department"("slug");
CREATE UNIQUE INDEX "Department_shortCode_key" ON "Department"("shortCode");

-- ========== Advisor ==========
CREATE TABLE "Advisor" (
    "id"        TEXT PRIMARY KEY,
    "name"      TEXT NOT NULL,
    "email"     TEXT,
    "title"     TEXT,
    "slug"      TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Advisor_slug_key"       ON "Advisor"("slug");
CREATE UNIQUE INDEX "Advisor_name_email_key" ON "Advisor"("name", "email");

-- ========== Author ==========
CREATE TABLE "Author" (
    "id"        TEXT PRIMARY KEY,
    "name"      TEXT NOT NULL,
    "email"     TEXT,
    "orcid"     TEXT,
    "slug"      TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Author_slug_key" ON "Author"("slug");

-- ========== Keyword ==========
CREATE TABLE "Keyword" (
    "id"   TEXT PRIMARY KEY,
    "term" TEXT NOT NULL,
    "slug" TEXT NOT NULL
);
CREATE UNIQUE INDEX "Keyword_term_key" ON "Keyword"("term");
CREATE UNIQUE INDEX "Keyword_slug_key" ON "Keyword"("slug");

-- ========== Paper ==========
CREATE TABLE "Paper" (
    "id"              TEXT PRIMARY KEY,
    "slug"            TEXT NOT NULL,
    "title"           TEXT NOT NULL,
    "subtitle"        TEXT,
    "abstract"        TEXT NOT NULL,
    "year"            INTEGER NOT NULL,
    "publicationDate" TIMESTAMP(3),
    "language"        TEXT NOT NULL DEFAULT 'en',
    "degreeLevel"     "DegreeLevel" NOT NULL DEFAULT 'undergraduate',
    "documentType"    "DocumentType" NOT NULL DEFAULT 'thesis',
    "status"          "PaperStatus" NOT NULL DEFAULT 'draft',
    "license"         TEXT,
    "doi"             TEXT,
    "embargoUntil"    TIMESTAMP(3),
    "pdfPath"         TEXT,
    "pdfSize"         INTEGER,
    "coverPath"       TEXT,
    "searchVector"    tsvector,
    "departmentId"    TEXT,
    "submittedById"   TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    "publishedAt"     TIMESTAMP(3),
    "deletedAt"       TIMESTAMP(3),
    CONSTRAINT "Paper_departmentId_fkey"  FOREIGN KEY ("departmentId")  REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Paper_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id")       ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Paper_slug_key"          ON "Paper"("slug");
CREATE UNIQUE INDEX "Paper_doi_key"           ON "Paper"("doi");
CREATE        INDEX "Paper_status_idx"        ON "Paper"("status");
CREATE        INDEX "Paper_year_idx"          ON "Paper"("year");
CREATE        INDEX "Paper_departmentId_idx"  ON "Paper"("departmentId");
CREATE        INDEX "Paper_publishedAt_idx"   ON "Paper"("publishedAt");
CREATE        INDEX "Paper_search_idx"        ON "Paper" USING GIN ("searchVector");
-- Useful for admin listing filters and common sorts.
CREATE        INDEX "Paper_status_updatedAt_idx" ON "Paper"("status", "updatedAt" DESC);
CREATE        INDEX "Paper_deletedAt_idx"     ON "Paper"("deletedAt");

-- ========== PaperAuthor ==========
CREATE TABLE "PaperAuthor" (
    "paperId"  TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "userId"   TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY ("paperId", "authorId"),
    CONSTRAINT "PaperAuthor_paperId_fkey"  FOREIGN KEY ("paperId")  REFERENCES "Paper"("id")  ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaperAuthor_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaperAuthor_userId_fkey"   FOREIGN KEY ("userId")   REFERENCES "User"("id")   ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "PaperAuthor_authorId_idx" ON "PaperAuthor"("authorId");

-- ========== PaperAdvisor ==========
CREATE TABLE "PaperAdvisor" (
    "paperId"   TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "role"      TEXT,
    PRIMARY KEY ("paperId", "advisorId"),
    CONSTRAINT "PaperAdvisor_paperId_fkey"   FOREIGN KEY ("paperId")   REFERENCES "Paper"("id")   ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaperAdvisor_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "Advisor"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PaperAdvisor_advisorId_idx" ON "PaperAdvisor"("advisorId");

-- ========== PaperKeyword ==========
CREATE TABLE "PaperKeyword" (
    "paperId"   TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    PRIMARY KEY ("paperId", "keywordId"),
    CONSTRAINT "PaperKeyword_paperId_fkey"   FOREIGN KEY ("paperId")   REFERENCES "Paper"("id")   ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaperKeyword_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PaperKeyword_keywordId_idx" ON "PaperKeyword"("keywordId");

-- ========== File ==========
CREATE TABLE "File" (
    "id"        TEXT PRIMARY KEY,
    "paperId"   TEXT NOT NULL,
    "kind"      TEXT NOT NULL,
    "path"      TEXT NOT NULL,
    "mimeType"  TEXT NOT NULL,
    "size"      INTEGER NOT NULL,
    "checksum"  TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "File_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "File_paperId_idx" ON "File"("paperId");

-- ========== ActivityLog ==========
CREATE TABLE "ActivityLog" (
    "id"        TEXT PRIMARY KEY,
    "userId"    TEXT,
    "paperId"   TEXT,
    "action"    TEXT NOT NULL,
    "detail"    JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_userId_fkey"  FOREIGN KEY ("userId")  REFERENCES "User"("id")  ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ActivityLog_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "ActivityLog_paperId_idx"   ON "ActivityLog"("paperId");
CREATE INDEX "ActivityLog_userId_idx"    ON "ActivityLog"("userId");
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- ========== Full-text search trigger ==========
CREATE OR REPLACE FUNCTION paper_search_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW."subtitle", '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW."abstract", '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS paper_search_update ON "Paper";
CREATE TRIGGER paper_search_update
  BEFORE INSERT OR UPDATE OF title, subtitle, abstract
  ON "Paper"
  FOR EACH ROW EXECUTE FUNCTION paper_search_update();
