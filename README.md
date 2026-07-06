# Just Another Budget App - JABA

I decided that using a google form to record and store all my expenses was boring. So why not put my
computer science degree to good use??

This is just a fun little project I'm working on in my free time, if you somehow came across this
and want to use it go right ahead.

## What Is This?

Not to be confused with any Hutts, JABA is a simple webapp that allows you to record expenses (and
income!) quickly and intuitively. The current stored fields are:

- **Amount**: $ (cuz I'm American)
- **Type**: expense or income
- **Category**: A predefined category for the entry, with possibilities determined by the values in
  [`src/lib/categories.ts`](src/lib/categories.ts). A fuzzy search (thanks fuse!) helps you see what
  the possible categories are when you get to make an entry. If you enable dynamic categories in
  settings, you can also add new ones on the fly.
- **Description**: Something a bit more detailed than 'Category', but could still come up again.
  Like specifying which brand of gas station you went to. And there's a fuzzy search here too don't
  worry.
- **Notes**: Freeform for any extra information you want. Maybe you went to Kroger and bought $300
  of cheese and want your tracker to be aware.
- **Date**: When the transaction occurs! And it defaults to the current date because clicking is
  something to be avoided.

## How Do I Use It?

You actually want to? Awesome!

### Docker (Recommended)

JABA is available as a multi-platform Docker image (`linux/amd64` and `linux/arm64`), so it should
run on pretty much anything. [QEMU](https://www.qemu.org/) helped make that possible, so kudos to
them.

Two image tags are available:

- `latest` — stable releases, what you probably want
- `dev` — built automatically on every merge to the dev branch, so it's newer but potentially
  rougher around the edges

#### Prerequisites

- Docker and Docker Compose installed
- A directory to store the database

#### Setup

1. Create the database file:

   I think technically you could skip this step, but then you might end up with some wacky
   permissions so you might as well run it

```bash
   mkdir -p /path/to/storage
   touch /path/to/storage/budget.db
```

2. Add to your `docker-compose.yml`:

```yaml
services:
  jaba:
    container_name: jaba
    image: rabbitrancher/jaba:latest
    ports:
      - "8389:3000"
    environment:
      - ORIGIN=http://your-ip:8389
    volumes:
      - /path/to/storage/budget.db:/app/budget.db
    restart: unless-stopped
```

3. Pull and start:

```bash
   docker compose up -d
```

The app will be available at `http://your-ip:8389`. On first start, migrations and category
seeding will run automatically, so there should be no manual setup needed.

#### Updating

```bash
docker compose pull
docker compose up -d
```

### Running Locally

If you'd rather just run it on your machine without Docker, here's how.

#### Prerequisites

- Node.js 20+

#### Installation

```bash
git clone https://github.com/rabbitrancher/JABA.git
cd JABA
npm install
```

#### Database Setup

```bash
npm run db:push
```

This generates migrations, applies them, and seeds the categories table. If you want to change up
the categories, edit the hardcoded category list in
[`src/lib/categories.ts`](src/lib/categories.ts). You can run this at any time, but it will wipe the
database, so be aware.

#### Development

```bash
npm run dev
```

And then go to whatever address it tells you to in the terminal and try it out!

### Tech Stack

- [SvelteKit](https://kit.svelte.dev) - full-stack web framework
- [Drizzle ORM](https://orm.drizzle.team) - type-safe database queries
- [SQLite](https://sqlite.org) - local database via
  [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [Fuse.js](https://fusejs.io) - fuzzy search for autocomplete
- [Lucide Svelte](https://lucide.dev) - icons

### Project Structure

So you don't get lost finding the important stuff I hid around:

- [`src/routes/`](src/routes/) - page routes
- [`src/lib/server/db/`](src/lib/server/db/) - database schema and connection
- [`src/lib/categories.ts`](src/lib/categories.ts) - hardcoded category list
- [`drizzle/`](drizzle/) - generated migration files

## License

MIT

## Other Relevant Information

I hope you have a great day :sunglasses:
