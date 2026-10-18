FROM alpine:3.24
ARG PB_VERSION
# Set by BuildKit to amd64 or arm64, so the same file builds for either CPU.
ARG TARGETARCH
RUN apk add --no-cache unzip ca-certificates
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/ && rm /tmp/pb.zip
# Migrations ship inside the image. Local development bind-mounts the directory
# over this copy (see compose.yaml), so the dashboard can still write new ones.
COPY pb_migrations /pb_migrations
EXPOSE 8090
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb_data", "--migrationsDir=/pb_migrations"]
