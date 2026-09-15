# Parser fixtures

Hand-written QB64PE programs, each targeting one syntax area, used by
`src/test/core/fixtures.test.ts`. Every construct here is taken from patterns that
appear in the real QB64PE compiler sources/tests (`../qb64pe`), so a fixture that
parses wrong reflects a real-world gap.

| File | Covers |
|---|---|
| `basics.bas` | SUB/FUNCTION (with/without params, STATIC), TYPE with fields, CONST, DIM/REDIM/COMMON/STATIC (+SHARED), arrays, doc comments + `@param` |
| `sigils.bas` | type-suffix identifiers (`$ % & ! # && ~%`) on functions, params and DIMs; no space before `(` |
| `dim_lists.bas` | `DIM a AS T, b AS U`, `DIM AS T a, b`, mixed case, `STRING * n`, multi-word `_UNSIGNED` types, `REDIM _PRESERVE`, ranges |
| `edge_cases.bas` | `:` multi-statement lines, `_` continuation, single-line IF, labels, `DECLARE LIBRARY`, keyword-like text in comments/strings |
| `include/` | `'$INCLUDE:'` chain two levels deep, resolved relative to the *including* file |
