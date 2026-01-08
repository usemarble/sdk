# Marble SDK

A monorepo containing a collection of SDKs and tools for [Marble CMS](https://marblecms.com).

---

## � Repository Structure

```
sdk/
├─ packages/
│  ├─ core/          # Main SDK (@usemarble/core)
│  ├─ tsconfig/      # Shared TypeScript configuration
├─ package.json      # workspace root
└─ ...
```

---

## 🚀 Packages

- **[@usemarble/core](./packages/core)**: The official TypeScript SDK for interacting with the Marble API.
- **[@usemarble/tsconfig](./packages/tsconfig)**: Shared TypeScript configurations used across the monorepo.

---

## �️ Development

### Setup

```bash
pnpm install
```

### Building

To build all packages:

```bash
pnpm build
```

### Testing

Run tests across all packages:

```bash
pnpm test
```

### Building Documentation

Generate API reference for the entire monorepo:

```bash
pnpm typedoc
```

---

## � License

MIT
