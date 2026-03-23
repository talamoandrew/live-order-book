FROM ubuntu:22.04 AS builder

RUN apt-get update && apt-get install -y cmake build-essential git curl zip unzip tar pkg-config libssl-dev
RUN rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN git clone https://github.com/microsoft/vcpkg.git
RUN ./vcpkg/bootstrap-vcpkg.sh

COPY . .

RUN cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE=/app/vcpkg/scripts/buildsystems/vcpkg.cmake
RUN cmake --build build

FROM ubuntu:22.04

RUN apt-get update && apt-get install -y libssl3 ca-certificates
RUN rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/build/live-order-book .

EXPOSE 3000

CMD ["./live-order-book"]
