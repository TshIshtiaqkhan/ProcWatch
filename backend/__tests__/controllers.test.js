const controllers = require("../src/controllers");
const db = require("../src/db");

jest.mock("../src/db", () => {
  const original = jest.requireActual("../src/db");
  return {
    ...original,
    getPool: jest.fn(),
  };
});

describe("Controllers Error Sanitization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getToday sanitizes database query error response", async () => {
    const mockErr = new Error("Database query failed internally");
    mockErr.stack = "Error: Database query failed internally\n  at /path/to/internal/file.js:42:10";

    db.getPool.mockReturnValue({
      query: jest.fn().mockRejectedValue(mockErr),
    });

    const response = await controllers.getToday({}, {}, {});

    expect(response.success).toBe(false);
    expect(response.error.code).toBe("QUERY_ERROR");
    expect(response.error.message).toBe("Database query failed internally");
    expect(response.error.message).not.toContain("Error: Database query failed internally\n");
  });

  test("getRange sanitizes error response", async () => {
    const mockErr = new Error("Connection failed");
    mockErr.stack = "Error: Connection failed\n  at internal/db.js:12:34";

    db.getPool.mockReturnValue({
      query: jest.fn().mockRejectedValue(mockErr),
    });

    const response = await controllers.getRange(
      {},
      { startDate: "2025-01-01", endDate: "2025-01-02" },
      {}
    );

    expect(response.success).toBe(false);
    expect(response.error.code).toBe("QUERY_ERROR");
    expect(response.error.message).toBe("Connection failed");
    expect(response.error.message).not.toContain("at internal/db.js");
  });
});
