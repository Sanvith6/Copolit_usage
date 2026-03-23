# DevOps Job Aggregator

A **Job Aggregator System** that scrapes DevOps / Cloud / SRE intern roles from LinkedIn and Indeed (via [Apify](https://apify.com)), filters and ranks them by relevance, stores them in a PostgreSQL database, and sends daily Telegram alerts.

---

## Architecture

```
[LinkedIn / Indeed] → [Apify Actors] → [Scrapers] → [Filter + Rank] → [PostgreSQL] → [Telegram Alert]
                                                           ↓
                                                    [FastAPI REST API]
```

---

## Folder Structure

```
job-aggregator/
│
├── scrapers/
│   ├── linkedin.py       # LinkedIn scraper via Apify
│   ├── indeed.py         # Indeed scraper via Apify
│
├── core/
│   ├── filter.py         # Relevance filtering + deduplication
│   ├── rank.py           # AI-style keyword scoring
│
├── db/
│   ├── models.py         # SQLAlchemy models + upsert helpers
│
├── notifier/
│   ├── telegram.py       # Telegram Bot notification
│
├── api/
│   ├── main.py           # FastAPI REST API
│
├── main.py               # Pipeline orchestrator (run this daily)
├── requirements.txt
└── .env.example
```

---

## Quick Start

### 1. Clone and install

```bash
cd job-aggregator
pip install -r requirements.txt
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `APIFY_API_TOKEN` | Apify API token from [apify.com](https://apify.com) |
| `DATABASE_URL` | PostgreSQL connection string (or `sqlite:///./jobs.db` for local dev) |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from [@BotFather](https://t.me/botfather) |
| `TELEGRAM_CHAT_ID` | Telegram chat/channel ID to receive alerts |

### 3. Run the pipeline manually

```bash
cd job-aggregator
python main.py
```

### 4. Start the FastAPI server

```bash
cd job-aggregator
uvicorn api.main:app --reload
```

API docs available at: `http://localhost:8000/docs`

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/jobs` | List jobs (supports `?limit`, `?offset`, `?source`, `?min_score`) |
| `GET` | `/jobs/{id}` | Get a single job by ID |
| `POST` | `/run` | Manually trigger a full pipeline run |

---

## Automated Daily Runs (GitHub Actions)

The workflow at `.github/workflows/job-aggregator.yml` runs the pipeline every day at **08:00 UTC**.

Add the following repository secrets in **Settings → Secrets and variables → Actions**:

- `APIFY_API_TOKEN`
- `DATABASE_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

You can also trigger a run manually via the **Actions** tab → **Daily Job Aggregator** → **Run workflow**.

---

## Filtering Logic

A job is kept only when **all** of the following are true:

- Title contains a relevant keyword (`devops`, `cloud`, `sre`, `platform engineer`, etc.)
- Job appears to be an internship / entry-level role (`intern`, `internship`, `co-op`, etc.)
- Title does **not** signal a senior position (`senior`, `staff`, `lead`, `director`, etc.)
- Description does **not** require 3+ years of experience

## Ranking / Scoring

Each job is scored 0–100 based on:

- Presence of high-value keywords (`kubernetes`, `docker`, `aws`, `terraform`, `ci/cd`, etc.)
- Entry-level language (`0-1 years`, `no experience`, `recent graduate`, etc.)
- `"intern"` appearing in the job title

---

## Deployment (AWS + Docker)

### Build and run with Docker

```bash
docker build -t job-aggregator .
docker run --env-file .env job-aggregator python main.py
```

### Run the API server with Docker

```bash
docker run --env-file .env -p 8000:8000 job-aggregator uvicorn api.main:app --host 0.0.0.0 --port 8000
```

### Deploy to AWS EC2

1. Launch an EC2 instance (Ubuntu 22.04 LTS, t3.micro or larger)
2. Install Docker on the instance
3. Copy your `.env` file and the `job-aggregator/` folder to the instance
4. Build and run the Docker image
5. Set up a cron job or use GitHub Actions with a self-hosted runner for daily scheduling
