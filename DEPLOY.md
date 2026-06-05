# Deploying to Vercel + Neon (Postgres)

This site runs as static files (`public/`) plus serverless functions (`api/`),
with posts stored in a free Neon Postgres database. Locally it falls back to a
JSON file, so `npm start` keeps working with no database.

## 1. Create a free database (Neon)
1. Go to <https://neon.tech> and sign up (you can use your GitHub account).
2. Create a new project (any name, e.g. `jingzhong-ville`).
3. On the project dashboard, copy the **connection string**. It looks like:
   `postgresql://user:password@ep-xxx.aws.neon.tech/dbname?sslmode=require`

> The `reports` table is created automatically on first use — no SQL needed.

## 2. Put the code on GitHub
Already a git repo. Once logged in (`gh auth login`), push it:
```
gh repo create jingzhong-ville --public --source=. --push
```
(Or create a repo on github.com and `git push` to it.)

## 3. Deploy on Vercel
1. Go to <https://vercel.com> and **Add New → Project**.
2. Import the `jingzhong-ville` GitHub repo.
3. Before clicking Deploy, open **Environment Variables** and add:
   | Name            | Value                                   |
   |-----------------|-----------------------------------------|
   | `DATABASE_URL`  | *(the Neon connection string from step 1)* |
   | `CHIEF_PASSWORD`| *(optional — defaults to `16881688`)*   |
4. Click **Deploy**. You'll get a permanent link like
   `https://jingzhong-ville.vercel.app`.

That link works on phones and can be shared with residents. Every post is saved
in Neon, so nothing resets when the server sleeps.

## Local development
- `npm start` → http://localhost:3000 using a local JSON file (no DB needed).
- To test against Neon locally, set `DATABASE_URL` in your shell first.
