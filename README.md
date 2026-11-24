# ProGineer Office Supply Management System

An internal tool for managing office supplies such as tea, coffee, sugar, water, paper and pens. Employees can see what is available, update quantities, and find the items that need restocking.

Built with TypeScript (strict mode), HTML, CSS and Bootstrap 5, with no frontend framework. JSON Server provides the CRUD API.

## Features

- Supplies list with name, category, quantity, unit, minimum quantity and stock status
- Add, edit and delete items
- Increase or decrease quantity directly from the list
- Search by item name, filter by category, and show only items that need restocking
- Low stock and out of stock indicators, with how many units are missing
- Summary cards for total items, items to restock, out of stock items and categories
- Form validation, loading and error states, and a retry button when the API is down

## Run the project

```bash
npm install
npm run build
npm run api
npm run web
```

Run `npm run api` and `npm run web` in two separate terminals, then open http://localhost:5500.

Use `npm run watch` while editing so TypeScript recompiles on every save.

## API

| Method | Endpoint | Used for |
| --- | --- | --- |
| GET | /supplies | Load all items |
| POST | /supplies | Add an item |
| PUT | /supplies/:id | Edit an item |
| PATCH | /supplies/:id | Change the quantity |
| DELETE | /supplies/:id | Delete an item |

## Project structure

```
src/
  types.ts     Interfaces, type aliases and literal types
  supplies.ts  Filtering, stock status, validation and summary logic
  api.ts       Typed requests to JSON Server
  ui.ts        Rendering and form handling
  main.ts      Application state and event handling
css/styles.css
index.html
db.json
tsconfig.json
```

## TypeScript concepts used

| Concept | Where |
| --- | --- |
| Interfaces | `Supply`, `Stock`, `Supplier`, `SupplyFilters`, `Summary` |
| Type aliases | `SupplyInput`, `CategoryFilter`, `FieldErrors`, `ParseResult` |
| Optional properties | `supplier?` and `notes?` in `Supply` |
| Readonly properties | `readonly id` in `Supply`, `readonly Supply[]` parameters |
| Nested objects | `stock` and `supplier` inside `Supply` |
| Literal types | `Category` and `Unit` from `as const` arrays, `StockStatus` |
| Typed functions | every function has typed parameters and a return type |
| Type guards | `isCategory` and `isUnit` |
| Discriminated union | `ParseResult` returned by `parseDraft` |
| Generics | `request<T>` in `api.ts`, `byId<T>` in `ui.ts` |
| Modules | each file exports its own part and imports what it needs |
