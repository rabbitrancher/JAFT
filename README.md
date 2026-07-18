# Just Another Finance Tracker - JAFT

I decided that using a google form to record and store all my expenses was boring. So why not put my
computer science degree to good use??

This is just a fun little project I'm working on in my free time, if you somehow came across this
and want to use it go right ahead.

## What Is This?

JAFT is a simple webapp that allows you to record expenses (and income!) quickly and intuitively.
The current stored fields are:

- **Amount**: $ (cuz I'm American)
- **Type**: expense or income
- **Category**: A predefined category for the entry, with possibilities determined by the values
  in [`src/lib/categories.ts`](src/lib/categories.ts), selectable via a dropdown. If you
  enable dynamic categories in settings, you can also add new ones on the fly.
- **Description**: Something a bit more detailed than 'Category', but could still come up again.
  Like specifying which brand of gas station you went to. There's a fuzzy search here to
  help keep things concise, don't worry. it's also optional by default, so make sure you enable "require description" in settings if you want to enforce it.
- **Notes**: Freeform for any extra information you want. Maybe you went to Kroger and bought $300
  of cheese and want your tracker to be aware.
- **Date**: When the transaction occurs! And it defaults to the current date because clicking is
  something to be avoided.

## What Can It Do?

### Table

Beyond just storing entries, the data table has a few tricks:

- **Sort** by any visible column - click the header, click again to flip direction. Standard header sorting stuff.
- **Search** across visible text columns (category, description, and notes) with fuzzy
  matching, so typos aren't the end of the world.
- **Edit** any entry inline - click the pencil, change what you want, click the
  checkmark to save.
- **Delete** entries with a two-click confirmation so you don't accidentally remove the charge for that engagement ring.
- **Customize columns** from the settings page - hide ones you don't care about.

### Graphs

Numbers in a table are fine, but sometimes you want the bigger picture. The Graphs page has:

- **Net Worth Over Time**: a zoomable, pannable line chart of your running net worth. Click any
  point to jump to that date in the table.
- **Expenses & Income by Category**: a donut and bar chart breakdown of where your money's actually
  going (or coming from), with a filter so you can hide categories you don't care about right now.
- **Trend Cards**: this month vs. last month, vs. your 3-month average, year-to-date total, and a
  projection of where this month's headed at your current pace. Turns out knowing you're on track to
  blow your budget on day 12 instead of day 30 is pretty useful.
- **Popular Descriptions**: your most frequent and highest-spend entries, ranked, so you can spot
  the recurring stuff (looking at you, Spotify) without digging through the table.

## How Do I Use It?

You actually want to? Awesome! There are a few ways to get this running depending on how much you like terminals.

### Standalone Executable (Easiest)

If you don't want to mess with Docker or command lines, you can just download the pre-built application.

1. Go to the [Releases page](../../releases) and download the `.zip` for your operating system (Windows, macOS, or Linux).
2. Extract the **entire** zip folder (it contains the executable, database migrations, and necessary production files).
3. Run the `jaft` executable inside the extracted folder.
4. Open your browser and go to the address it provides!

### Docker (Recommended for Servers)

JAFT is available as a multi-platform Docker image (`linux/amd64` and `linux/arm64`), natively built so it should run fast on pretty much anything.

Two image tags are available:

- `latest` - stable releases, what you probably want
- `dev` - built automatically on every merge to the dev branch, so it's cutting-edge but might have bugs and such

#### Prerequisites

- Docker and Docker Compose installed
- A directory to store the database

#### Setup

1. Create the database file:

   I think technically you could skip this step, but then you might end up with some wacky
   permissions so you might as well run it

```bash
    mkdir -p /path/to/storage
    touch /path/to/storage/finances.db
```

2. Add to your `docker-compose.yml`:

```bash
    services:
      jaft:
        container_name: jaft
        image: rabbitrancher/jaft:latest
        ports:
          - "8389:3000"
        environment:
          - ORIGIN=http://your-ip:8389
        volumes:
          - /path/to/storage/finances.db:/app/finances.db
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

If you'd rather run it from source on your machine, here's how.

#### Prerequisites

- [Bun](https://bun.sh/) (Node.js was getting boring)

#### Installation

```bash
    git clone [https://github.com/rabbitrancher/JAFT.git](https://github.com/rabbitrancher/JAFT.git)
    cd JAFT
    bun install
```

#### Database Setup

```bash
    bun run db:push
```

This generates migrations, applies them, and seeds the categories table. If you want to change up
the categories, edit the hardcoded category list in
[`src/lib/categories.ts`](src/lib/categories.ts). You can run this at any time, but it will wipe the
database, so be aware.

#### Development

```bash
    bun run dev
```

And then go to whatever address it tells you to in the terminal and try it out!

### Tech Stack

- [Bun](https://bun.sh/) - fast all-in-one JavaScript runtime
- [SvelteKit](https://kit.svelte.dev) - full-stack web framework
- [Drizzle ORM](https://orm.drizzle.team) - type-safe database queries
- [SQLite](https://sqlite.org) - local database via
  [bun:sqlite](https://bun.sh/docs/api/sqlite)
- [Fuse.js](https://fusejs.io) - fuzzy search for autocomplete
- [Lucide Svelte](https://lucide.dev) - icons
- [Chart.js](https://www.chartjs.org) - charts for the Graphs page

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
