FROM mcr.microsoft.com/playwright:v1.48.2-jammy AS runtime

ARG GOSOM_VERSION=1.16.1

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.14.4 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/types/package.json packages/types/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN mkdir -p tools/bin \
  && GOSOM_ASSET="google_maps_scraper-${GOSOM_VERSION}-linux-amd64" \
  && curl -fsSL "https://github.com/gosom/google-maps-scraper/releases/download/v${GOSOM_VERSION}/${GOSOM_ASSET}" -o tools/bin/gosom-google-maps-scraper \
  && chmod +x tools/bin/gosom-google-maps-scraper \
  && tools/bin/gosom-google-maps-scraper --help >/tmp/gosom-help.txt

RUN pnpm --filter @leadsync/database db:generate \
  && pnpm --filter @leadsync/api build

ENV NODE_ENV="production"

EXPOSE 3001

CMD ["pnpm", "--filter", "@leadsync/api", "start"]
