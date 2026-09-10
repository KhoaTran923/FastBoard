# FastBoard

Ứng dụng web quản lý công việc (task/project management) kiểu Kanban, tăng tốc
bằng WebAssembly (search · analytics · compression).

## Chạy ở môi trường dev

```bash
pnpm db:up                          # PostgreSQL + Redis trong Docker
pnpm migrate                        # áp dụng migration
pnpm seed                           # (tuỳ chọn) tạo user mẫu
pnpm --filter @repo/server dev      # API   http://localhost:3001
pnpm --filter @repo/client dev      # web   http://localhost:5173
```

## Chạy toàn bộ stack bằng Docker

```bash
cp .env.docker.example .env.docker   # sửa lại các secret trước khi chạy
pnpm docker:up                       # client :8080 · api :3001 · postgres · redis
pnpm docker:logs
pnpm docker:down
```

Migration tự chạy trong service `migrate` trước khi API khởi động.

## Kiểm thử

```bash
pnpm lint && pnpm typecheck
pnpm test              # 45 unit + component test (không cần database)
pnpm test:integration  # 13 API test, cần pnpm db:up + pnpm migrate
```

## Tài liệu

- [Week 7 — Realtime](docs/Week7_Realtime.md)
- [Week 9 — Team & Permissions](docs/Week9_Team_Permissions.md)
- [Week 10 — Compression & PWA](docs/Week10_Compression_PWA.md)
- [Week 11 — Performance](docs/Week11_Performance.md)
- [Week 12 — Security & Testing](docs/Week12_Security_Testing.md)
- [Week 13 — Deployment](docs/Week13_Deployment.md)
- Benchmark: [search](docs/WASM_Benchmark.md) · [analytics](docs/WASM_Analytics_Benchmark.md) · [compression](docs/WASM_Compression_Benchmark.md)
- API: [Postman collection](docs/FastBoard.postman_collection.json)
