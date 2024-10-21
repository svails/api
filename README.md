# api

API starterkit that includes:

- Authentication
- Database with SQLite and Turso
- Swagger for documentation
- Dockerfile for deployment

```sh
git clone https://github.com/svelterust/api
cd api/
bun i
bun dev
```

## Deploy to production

```sh
fly app create # modify fly.toml and change name
turso db create # run the commands to get secrets and set below
fly secrets set TURSO_DATABASE_URL=
fly secrets set TURSO_AUTH_TOKEN=
fly deploy
```
