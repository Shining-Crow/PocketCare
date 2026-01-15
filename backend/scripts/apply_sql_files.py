import argparse
import os
import sys
from pathlib import Path

import mysql.connector
from dotenv import load_dotenv


def _split_sql_statements(sql: str) -> list[str]:
    """Split SQL text into individual statements.

    Handles semicolons inside single/double-quoted strings and skips comments.
    This is intentionally simple (no stored procedures / DELIMITER support).
    """

    statements: list[str] = []
    buff: list[str] = []

    in_single = False
    in_double = False
    in_backtick = False

    i = 0
    n = len(sql)

    def flush():
        stmt = "".join(buff).strip()
        buff.clear()
        if stmt:
            statements.append(stmt)

    while i < n:
        ch = sql[i]
        nxt = sql[i + 1] if i + 1 < n else ""

        # Line comment: -- ...\n
        if not in_single and not in_double and not in_backtick and ch == "-" and nxt == "-":
            # MySQL treats "-- " (double-dash followed by space) as comment.
            nxt2 = sql[i + 2] if i + 2 < n else ""
            if nxt2.isspace() or nxt2 == "":
                i += 2
                while i < n and sql[i] not in "\r\n":
                    i += 1
                continue

        # Line comment: # ...\n
        if not in_single and not in_double and not in_backtick and ch == "#":
            i += 1
            while i < n and sql[i] not in "\r\n":
                i += 1
            continue

        # Block comment: /* ... */
        if not in_single and not in_double and not in_backtick and ch == "/" and nxt == "*":
            i += 2
            while i + 1 < n and not (sql[i] == "*" and sql[i + 1] == "/"):
                i += 1
            i += 2  # skip */
            continue

        if ch == "\\" and (in_single or in_double):
            # Escape sequence inside quotes
            buff.append(ch)
            if i + 1 < n:
                buff.append(sql[i + 1])
                i += 2
                continue

        if ch == "'" and not in_double and not in_backtick:
            in_single = not in_single
            buff.append(ch)
            i += 1
            continue

        if ch == '"' and not in_single and not in_backtick:
            in_double = not in_double
            buff.append(ch)
            i += 1
            continue

        if ch == "`" and not in_single and not in_double:
            in_backtick = not in_backtick
            buff.append(ch)
            i += 1
            continue

        if ch == ";" and not in_single and not in_double and not in_backtick:
            flush()
            i += 1
            continue

        buff.append(ch)
        i += 1

    flush()
    return statements


def _drain_results(cursor) -> None:
    """Consume any pending result sets to avoid 'Unread result found' on commit/close."""

    while True:
        try:
            # Always attempt to consume rows. Some statements (e.g. EXECUTE of a
            # prepared SELECT) may produce rows even if the original SQL text
            # isn't a plain SELECT.
            cursor.fetchall()
        except Exception:
            pass

        try:
            has_more = cursor.nextset()
        except Exception:
            has_more = None

        if not has_more:
            break


def _exec_sql_file(cursor, file_path: Path) -> None:
    raw = file_path.read_text(encoding="utf-8", errors="ignore")
    raw = raw.lstrip("\ufeff")  # strip BOM if present

    statements = _split_sql_statements(raw)
    for idx, stmt in enumerate(statements, start=1):
        stmt = stmt.strip()
        if not stmt:
            continue

        try:
            cursor.execute(stmt)
            _drain_results(cursor)
        except Exception as exc:
            preview = (stmt[:200] + "...") if len(stmt) > 200 else stmt
            raise RuntimeError(
                f"Failed executing {file_path} statement #{idx}: {preview}"
            ) from exc


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply PocketCare SQL files to MySQL")
    parser.add_argument(
        "--schema",
        default=str(Path(__file__).resolve().parents[2] / "database" / "schema.sql"),
        help="Path to schema.sql",
    )
    parser.add_argument(
        "--seed",
        default=str(Path(__file__).resolve().parents[2] / "database" / "seed_data.sql"),
        help="Path to seed_data.sql",
    )
    parser.add_argument("--no-seed", action="store_true", help="Skip seed file")
    args = parser.parse_args()

    # Load backend env (contains DB_* settings)
    backend_env = Path(__file__).resolve().parents[1] / ".env"
    if backend_env.exists():
        load_dotenv(backend_env)
    else:
        load_dotenv()

    host = os.getenv("DB_HOST", "localhost")
    port = int(os.getenv("DB_PORT", "3306"))
    user = os.getenv("DB_USER", "root")
    password = os.getenv("DB_PASSWORD", "")

    schema_path = Path(args.schema)
    seed_path = Path(args.seed)

    if not schema_path.exists():
        print(f"Schema file not found: {schema_path}")
        return 2

    if not args.no_seed and not seed_path.exists():
        print(f"Seed file not found: {seed_path}")
        return 2

    try:
        conn = mysql.connector.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            charset="utf8mb4",
            autocommit=False,
            use_pure=True
        )

        cursor = conn.cursor(buffered=True)
        try:
            print(f"Applying schema: {schema_path}")
            _exec_sql_file(cursor, schema_path)
            conn.commit()
            print("Schema applied.")

            if not args.no_seed:
                print(f"Applying seed data: {seed_path}")
                _exec_sql_file(cursor, seed_path)
                conn.commit()
                print("Seed data applied.")

            print("Database update complete.")
            return 0
        finally:
            try:
                cursor.close()
            except Exception:
                pass
            try:
                conn.close()
            except Exception:
                pass

    except Exception as exc:
        print(f"Database update failed: {exc}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
