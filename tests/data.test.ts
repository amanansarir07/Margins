import { describe, expect, it } from "vitest";
import { gameData } from "../src/engine/loadData";

const collections = Object.entries(gameData);

describe("data records", () => {
  it("has the required identity and source fields on every record", () => {
    for (const [collectionName, records] of collections) {
      for (const record of records) {
        expect(record.id, `${collectionName} id`).toEqual(expect.any(String));
        expect(record.name, `${collectionName} name`).toEqual(expect.any(String));
        expect(["NASA-based", "Game model"]).toContain(record.source);
        expect(record.sourceNote, `${collectionName} sourceNote`).toEqual(
          expect.any(String),
        );
      }
    }
  });
});
